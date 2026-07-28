import Link from 'next/link'
import { prisma } from '@/lib/db'

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
    { label: 'Próximas aulas', value: upcomingLives.length, href: '/admin/lives' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-950 mb-8">Dashboard</h1>

      {liveNow.length > 0 && (
        <div className="mb-8 rounded-2xl border border-red-300 bg-red-50 p-5">
          <p className="font-bold text-red-700 mb-2">● Transmissão em andamento</p>
          {liveNow.map((l) => (
            <Link
              key={l.id}
              href="/admin/lives"
              className="block text-sm text-red-800 hover:underline"
            >
              {l.course.title} — {l.title}
            </Link>
          ))}
        </div>
      )}

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
          <h2 className="font-bold text-navy-950">Próximas aulas ao vivo</h2>
          <Link href="/admin/lives" className="text-sm text-navy-700 hover:underline">
            Gerenciar →
          </Link>
        </div>
        {upcomingLives.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhuma aula agendada.{' '}
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
