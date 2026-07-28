import { prisma } from '@/lib/db'

export const metadata = { title: 'Avaliações — Admin Valeriote' }
export const dynamic = 'force-dynamic'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

export default async function AdminSurveysPage() {
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true },
  })

  const responses = await prisma.surveyResponse.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(responses.map((r) => r.userId))] } },
    select: { id: true, name: true, email: true },
  })
  const userById = new Map(users.map((u) => [u.id, u]))

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-950 mb-1">Avaliações</h1>
      <p className="text-sm text-gray-500 mb-8">
        Pesquisa de satisfação respondida pelos alunos.
      </p>

      {courses.map((course) => {
        const list = responses.filter((r) => r.courseId === course.id)
        const avg =
          list.length > 0
            ? (list.reduce((s, r) => s + r.rating, 0) / list.length).toFixed(1)
            : null

        return (
          <div key={course.id} className="mb-8 rounded-2xl bg-white border border-gray-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="font-bold text-navy-950">{course.title}</h2>
              {avg ? (
                <p className="text-sm">
                  <span className="text-xl font-bold text-navy-950">⭐ {avg}</span>
                  <span className="text-gray-500"> · {list.length} avaliação{list.length === 1 ? '' : 'ões'}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-400">Sem avaliações ainda</p>
              )}
            </div>

            {list.length > 0 && (
              <div className="space-y-3">
                {list.map((r) => {
                  const u = userById.get(r.userId)
                  return (
                    <div key={r.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-navy-950">
                          {'⭐'.repeat(r.rating)}
                          <span className="text-gray-400 font-normal"> · {u?.name || '—'}</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          {dateFormatter.format(r.createdAt)}
                        </p>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-gray-600 whitespace-pre-line">{r.comment}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
