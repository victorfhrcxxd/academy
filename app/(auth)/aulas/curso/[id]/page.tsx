import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import LiveStatusBadge from '@/components/LiveStatusBadge'

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
        {course.lives.map((day, i) => (
          <div
            key={day.id}
            className={`bg-white border rounded-2xl overflow-hidden ${
              day.status === 'LIVE' ? 'border-red-300' : 'border-gray-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-12 w-12 rounded-xl bg-navy-950 text-gold-500 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] uppercase font-bold leading-none">Dia</span>
                  <span className="text-lg font-black leading-tight">{i + 1}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="font-bold text-navy-950">{day.title}</h2>
                    <LiveStatusBadge status={day.status} />
                  </div>
                  <p className="text-sm text-gray-500">
                    {dayFormatter.format(day.scheduledAt)} · das{' '}
                    {timeFormatter.format(day.scheduledAt)}
                    {day.endsAt && <> às {timeFormatter.format(day.endsAt)}</>}
                  </p>
                </div>
              </div>

              <Link
                href={`/aulas/live/${day.id}`}
                className={`rounded-lg px-5 py-2.5 text-sm font-bold transition ${
                  day.status === 'LIVE'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-navy-950 hover:bg-navy-900 text-white'
                }`}
              >
                {day.status === 'LIVE' ? '● Assistir ao vivo' : 'Entrar na transmissão'}
              </Link>
            </div>

            {day.talks.length > 0 && (
              <div className="border-t border-gray-100 px-6 py-4">
                <p className="text-xs font-bold uppercase text-gray-400 mb-3">
                  Programação do dia
                </p>
                <div className="space-y-3">
                  {day.talks.map((talk) => (
                    <div key={talk.id} className="flex items-center gap-3">
                      {talk.speakerPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={talk.speakerPhoto}
                          alt={talk.speakerName || 'Palestrante'}
                          className="h-10 w-10 rounded-full object-cover border border-gray-200 shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-navy-900/10 flex items-center justify-center text-navy-900 shrink-0">
                          🎤
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy-950 truncate">
                          {talk.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {talk.speakerName && <span>{talk.speakerName} · </span>}
                          {timeFormatter.format(talk.startsAt)}
                          {talk.endsAt && <> – {timeFormatter.format(talk.endsAt)}</>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
