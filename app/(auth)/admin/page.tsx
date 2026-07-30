import Link from 'next/link'
import { prisma } from '@/lib/db'
import Icon from '@/components/Icon'
import LiveNowStat from '@/components/admin/LiveNowStat'

export const metadata = { title: 'Admin — Valeriote Cursos' }
export const dynamic = 'force-dynamic'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

export default async function AdminDashboardPage() {
  const [totalMembers, activeMembers, totalCourses, upcomingLives, liveNow] =
    await Promise.all([
      prisma.user.count({ where: { role: 'MEMBER' } }),
      prisma.user.count({ where: { role: 'MEMBER', status: 'ACTIVE' } }),
      prisma.course.count({ where: { status: 'ACTIVE' } }),
      prisma.live.findMany({
        where: { status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
        include: { course: true },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
      prisma.live.findMany({
        where: { status: 'LIVE' },
        include: { course: true },
      }),
    ])

  const stats = [
    { label: 'Alunos cadastrados', value: totalMembers, href: '/admin/membros' },
    { label: 'Alunos ativos', value: activeMembers, href: '/admin/membros' },
    { label: 'Cursos ativos', value: totalCourses, href: '/admin/cursos' },
    { label: 'Próximas transmissões', value: upcomingLives.length, href: '/admin/lives' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-950 mb-8">Dashboard</h1>

      {liveNow.map((l) => (
        <div
          key={l.id}
          className="mb-8 rounded-2xl bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 text-white p-6 sm:p-7 relative overflow-hidden"
        >
          <div className="absolute -top-14 -right-14 h-48 w-48 rounded-full border border-white/10" />
          <div className="absolute -bottom-20 right-28 h-40 w-40 rounded-full border border-white/5" />

          <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold tracking-wide mb-3">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                AO VIVO
              </span>
              <h2 className="text-xl sm:text-2xl font-bold leading-snug">{l.title}</h2>
              <p className="text-white/70 text-sm mt-0.5">{l.course.title}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <LiveNowStat liveId={l.id} />
              <div className="flex gap-3">
                <Link
                  href={`/aulas/live/${l.id}`}
                  className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 transition"
                >
                  <Icon name="play" className="h-4 w-4" /> Assistir
                </Link>
                <Link
                  href="/admin/lives"
                  className="flex items-center gap-2 rounded-xl border border-white/30 text-white font-bold px-5 py-2.5 hover:bg-white/10 transition"
                >
                  Gerenciar
                </Link>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl bg-white border border-gray-200 p-6 hover:border-navy-600/40 hover:shadow-sm transition"
          >
            <p className="text-3xl font-bold text-navy-950">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-navy-950">Próximas transmissões</h2>
          <Link href="/admin/lives" className="text-sm text-navy-700 hover:underline">
            Gerenciar →
          </Link>
        </div>
        {upcomingLives.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhuma transmissão agendada.{' '}
            <Link href="/admin/lives" className="text-navy-700 hover:underline">
              Agendar agora
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcomingLives.map((l) => (
              <li key={l.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-navy-950 truncate">{l.title}</p>
                  <p className="text-sm text-gray-500">{l.course.title}</p>
                </div>
                <span className="text-sm text-gray-600 shrink-0">
                  {dateFormatter.format(l.scheduledAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
