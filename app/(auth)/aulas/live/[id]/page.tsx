import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import LiveSidePanel from '@/components/LiveSidePanel'
import LiveRoom from '@/components/LiveRoom'
import ProtectedPlayer from '@/components/ProtectedPlayer'
import AttendanceTracker from '@/components/AttendanceTracker'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

export default async function LiveDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const live = await prisma.live.findUnique({
    where: { id },
    include: {
      course: true,
      talks: { orderBy: { startsAt: 'asc' } },
      materials: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!live) notFound()

  // Aluno só entra se estiver matriculado no curso (admin sempre pode)
  if (session.user.role !== 'ADMIN') {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: session.user.id, courseId: live.courseId },
      },
    })
    if (!enrollment) redirect('/aulas')
  }

  const isAdmin = session.user.role === 'ADMIN'
  // Encerrou e tem gravação → mostra o replay no lugar da live
  const showReplay = live.status === 'ENDED' && !!live.replayUrl
  const playerUrl = showReplay ? live.replayUrl : live.embedUrl

  return (
    <div className="mx-auto max-w-[1800px]">
      {/* registra presença do aluno enquanto assiste */}
      {!isAdmin && <AttendanceTracker liveId={live.id} />}
      <Link
        href={isAdmin ? '/admin/lives' : `/aulas/curso/${live.courseId}`}
        className="text-sm text-navy-700 hover:underline"
      >
        ← {isAdmin ? 'Voltar para o painel' : 'Voltar para o curso'}
      </Link>

      <div className="mt-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-navy-950">{live.title}</h1>
          <LiveStatusBadge status={live.status} />
          {showReplay && (
            <span className="rounded-full bg-navy-900/10 text-navy-900 px-3 py-1 text-xs font-bold">
              🎬 Gravação
            </span>
          )}
        </div>
        <p className="text-gray-500 mt-1">
          {live.course.title} · {dateFormatter.format(live.scheduledAt)}
          {live.endsAt && <> às {timeFormatter.format(live.endsAt)}</>}
        </p>
      </div>

      <LiveRoom
        side={<LiveSidePanel liveId={live.id} canModerate={isAdmin} />}
        main={
        <div>
          {playerUrl ? (
            <ProtectedPlayer
              embedUrl={playerUrl}
              restricted={live.restrictPlayer}
              title={live.title}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-16 text-center flex flex-col items-center justify-center">
              <p className="text-4xl mb-4">🎥</p>
              <p className="text-lg font-semibold text-navy-950 mb-2">
                Transmissão ainda não liberada
              </p>
              <p className="text-gray-500 max-w-md mx-auto">
                O link da transmissão será disponibilizado aqui{' '}
                {live.status === 'SCHEDULED' ? 'antes do início' : 'em breve'}. Atualize a
                página perto do horário marcado.
              </p>
            </div>
          )}

          {live.talks.length > 0 && (
            <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-navy-950 mb-4">🗓 Programação do dia</h2>
              <div className="space-y-4">
                {live.talks.map((talk) => (
                  <div key={talk.id} className="flex items-start gap-4">
                    {talk.speakerPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={talk.speakerPhoto}
                        alt={talk.speakerName || 'Palestrante'}
                        className="h-12 w-12 rounded-full object-cover border-2 border-gold-500 shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-navy-900/10 flex items-center justify-center text-navy-900 shrink-0">
                        🎤
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-950">{talk.title}</p>
                      <p className="text-sm text-gray-500">
                        {talk.speakerName && (
                          <span className="font-medium text-navy-900">
                            {talk.speakerName} ·{' '}
                          </span>
                        )}
                        {timeFormatter.format(talk.startsAt)}
                        {talk.endsAt && <> – {timeFormatter.format(talk.endsAt)}</>}
                      </p>
                      {talk.description && (
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                          {talk.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {live.materials.length > 0 && (
            <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-bold text-navy-950 mb-4">📎 Materiais do dia</h2>
              <div className="space-y-2">
                {live.materials.map((m) => (
                  <a
                    key={m.id}
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 hover:border-navy-600/40 hover:bg-navy-900/5 transition"
                  >
                    <span className="text-sm font-medium text-navy-950 truncate">
                      📄 {m.title}
                    </span>
                    <span className="text-xs font-bold text-navy-700 shrink-0">
                      Baixar ↓
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {live.description && (
            <div className="mt-6 bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="font-semibold text-navy-950 mb-2">Sobre este dia</h2>
              <p className="text-gray-600 whitespace-pre-line">{live.description}</p>
            </div>
          )}
        </div>
        }
      />
    </div>
  )
}
