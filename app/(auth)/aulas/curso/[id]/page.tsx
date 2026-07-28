import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import MiniCountdown from '@/components/MiniCountdown'
import SurveyCard from '@/components/SurveyCard'

const dayFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  timeZone: 'America/Sao_Paulo',
})

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      lives: {
        orderBy: { scheduledAt: 'asc' },
        include: { talks: { orderBy: { startsAt: 'asc' } } },
      },
    },
  })
  if (!course || course.status !== 'ACTIVE') notFound()

  if (session.user.role !== 'ADMIN') {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: session.user.id, courseId: course.id } },
    })
    if (!enrollment) redirect('/aulas')
  }

  // pesquisa de satisfação: aparece pro aluno quando algum dia já encerrou
  const hasEndedDay = course.lives.some((l) => l.status === 'ENDED')
  const mySurvey =
    session.user.role !== 'ADMIN' && hasEndedDay
      ? await prisma.surveyResponse.findUnique({
          where: {
            courseId_userId: { courseId: course.id, userId: session.user.id },
          },
        })
      : null

  const now = Date.now()

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/aulas" className="text-sm text-navy-700 hover:underline">
        ← Voltar para meus cursos
      </Link>

      <h1 className="text-2xl font-bold text-navy-950 mt-4 mb-1">{course.title}</h1>
      {course.description && (
        <p className="text-gray-500 mb-8 whitespace-pre-line">{course.description}</p>
      )}

      {course.lives.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-500">
          As transmissões dos dias do evento serão agendadas em breve.
        </div>
      )}

      <div className="space-y-6">
        {course.lives.map((day, i) => {
          // palestrantes únicos do dia (para a fileira de fotos)
          const speakers: { name: string; photo: string | null }[] = []
          for (const t of day.talks) {
            if (t.speakerName && !speakers.some((s) => s.name === t.speakerName)) {
              speakers.push({ name: t.speakerName, photo: t.speakerPhoto })
            }
          }
          const isFuture =
            day.status === 'SCHEDULED' && day.scheduledAt.getTime() > now

          return (
            <div
              key={day.id}
              className={`bg-white border rounded-2xl overflow-hidden ${
                day.status === 'LIVE' ? 'border-red-300 shadow-md' : 'border-gray-200'
              }`}
            >
              {/* Cabeçalho do dia */}
              <div className="px-6 pt-5 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-14 w-14 rounded-xl bg-navy-950 text-gold-500 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] uppercase font-bold leading-none">Dia</span>
                      <span className="text-xl font-black leading-tight">{i + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="font-bold text-navy-950">{day.title}</h2>
                        <LiveStatusBadge status={day.status} />
                      </div>
                      <p className="text-sm text-gray-500 capitalize">
                        {dayFormatter.format(day.scheduledAt)} ·{' '}
                        <span className="lowercase">
                          das {timeFormatter.format(day.scheduledAt)}
                          {day.endsAt && <> às {timeFormatter.format(day.endsAt)}</>}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    {isFuture && <MiniCountdown targetIso={day.scheduledAt.toISOString()} />}
                    <Link
                      href={`/aulas/live/${day.id}`}
                      className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                        day.status === 'LIVE'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-navy-950 hover:bg-navy-900 text-white'
                      }`}
                    >
                      {day.status === 'LIVE'
                        ? '● Assistir ao vivo'
                        : day.status === 'ENDED' && day.replayUrl
                          ? '🎬 Assistir gravação'
                          : 'Entrar na transmissão'}
                    </Link>
                  </div>
                </div>

                {/* Fileira de professores do dia */}
                {speakers.length > 0 && (
                  <div className="flex items-center gap-3 mt-4">
                    <div className="flex -space-x-3">
                      {speakers.slice(0, 6).map((s) =>
                        s.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={s.name}
                            src={s.photo}
                            alt={s.name}
                            title={s.name}
                            className="h-10 w-10 rounded-full object-cover border-2 border-white shadow"
                          />
                        ) : (
                          <div
                            key={s.name}
                            title={s.name}
                            className="h-10 w-10 rounded-full bg-navy-900 text-gold-400 border-2 border-white shadow flex items-center justify-center text-xs font-bold"
                          >
                            {s.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                          </div>
                        )
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {speakers.length > 6 && `+${speakers.length - 6} · `}
                      {speakers.length} palestrante{speakers.length === 1 ? '' : 's'} ·{' '}
                      {day.talks.length} palestra{day.talks.length === 1 ? '' : 's'}
                    </p>
                  </div>
                )}
              </div>

              {/* Programação do dia */}
              {day.talks.length > 0 && (
                <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/60">
                  <p className="text-xs font-bold uppercase text-gray-400 mb-3">
                    Programação do dia
                  </p>
                  <div className="space-y-2.5">
                    {day.talks.map((talk) => (
                      <div
                        key={talk.id}
                        className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-3 py-2.5"
                      >
                        <span className="rounded-lg bg-navy-950 text-gold-400 text-xs font-bold px-2.5 py-2 tabular-nums shrink-0">
                          {timeFormatter.format(talk.startsAt)}
                          {talk.endsAt && (
                            <span className="text-white/60">
                              {' '}
                              – {timeFormatter.format(talk.endsAt)}
                            </span>
                          )}
                        </span>
                        {talk.speakerPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={talk.speakerPhoto}
                            alt={talk.speakerName || 'Palestrante'}
                            className="h-11 w-11 rounded-full object-cover border-2 border-gold-500 shrink-0"
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-full bg-navy-900/10 flex items-center justify-center text-navy-900 shrink-0">
                            🎤
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-navy-950">{talk.title}</p>
                          {talk.speakerName && (
                            <p className="text-xs text-gray-500">{talk.speakerName}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {session.user.role !== 'ADMIN' && hasEndedDay && (
        <div className="mt-8">
          <SurveyCard courseId={course.id} existingRating={mySurvey?.rating ?? null} />
        </div>
      )}
    </div>
  )
}
