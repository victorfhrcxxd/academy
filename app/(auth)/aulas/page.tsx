import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import LiveStatusBadge from '@/components/LiveStatusBadge'

export const metadata = { title: 'Palestras — Valeriote Cursos' }

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

const endTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

export default async function MemberDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role === 'ADMIN') redirect('/admin')

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id, course: { status: 'ACTIVE' } },
    include: {
      course: {
        include: {
          lives: { orderBy: { scheduledAt: 'asc' } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold text-navy-950 mb-1">
        Olá, {session.user.name?.split(' ')[0]} 👋
      </h1>
      <p className="text-gray-500 mb-8">
        Acompanhe ao vivo as palestras do evento — transmissão direta do presencial.
      </p>

      {enrollments.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
          <p className="text-lg font-semibold text-navy-950 mb-2">
            Nenhum curso liberado ainda
          </p>
          <p className="text-gray-500">
            Sua inscrição ainda não foi vinculada a um curso. Fale com um
            administrador da Valeriote.
          </p>
        </div>
      )}

      <div className="space-y-8">
        {enrollments.map(({ course }) => {
          const now = Date.now()
          const emAndamento = course.lives.filter((l) => l.status === 'LIVE')
          const proximas = course.lives.filter(
            (l) => l.status === 'SCHEDULED' && l.scheduledAt.getTime() >= now - 6 * 60 * 60 * 1000
          )
          const encerradas = course.lives.filter(
            (l) => l.status === 'ENDED' || (l.status === 'SCHEDULED' && l.scheduledAt.getTime() < now - 6 * 60 * 60 * 1000)
          )

          const renderLive = (live: (typeof course.lives)[number]) => (
            <Link
              key={live.id}
              href={`/aulas/live/${live.id}`}
              className={`flex items-center justify-between gap-4 rounded-xl border px-5 py-4 transition ${
                live.status === 'LIVE'
                  ? 'border-red-300 bg-red-50 hover:bg-red-100'
                  : 'border-gray-200 bg-white hover:border-navy-600/40 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {live.speakerPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={live.speakerPhoto}
                    alt={live.speakerName || 'Palestrante'}
                    className="h-11 w-11 rounded-full object-cover border border-gray-200 shrink-0"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-navy-900/10 flex items-center justify-center text-navy-900 shrink-0">
                    🎤
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold text-navy-950 truncate">{live.title}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {live.speakerName && (
                      <span className="font-medium">{live.speakerName} · </span>
                    )}
                    {dateFormatter.format(live.scheduledAt)}
                    {live.endsAt && <> às {endTimeFormatter.format(live.endsAt)}</>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <LiveStatusBadge status={live.status} />
                <span className="text-sm font-medium text-navy-700">
                  {live.status === 'LIVE' ? 'Assistir agora →' : 'Abrir →'}
                </span>
              </div>
            </Link>
          )

          return (
            <section key={course.id}>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-navy-950">{course.title}</h2>
                {course.description && (
                  <p className="text-sm text-gray-500">{course.description}</p>
                )}
              </div>

              {course.lives.length === 0 && (
                <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center text-sm text-gray-500">
                  Nenhuma palestra agendada ainda — fique de olho, a programação aparece aqui.
                </div>
              )}

              <div className="space-y-3">
                {emAndamento.map(renderLive)}
                {proximas.map(renderLive)}
              </div>

              {encerradas.length > 0 && (
                <details className="mt-4">
                  <summary className="text-sm text-gray-500 cursor-pointer select-none">
                    Palestras anteriores ({encerradas.length})
                  </summary>
                  <div className="space-y-3 mt-3">{encerradas.map(renderLive)}</div>
                </details>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
