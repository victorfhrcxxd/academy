import Link from 'next/link'
import { prisma } from '@/lib/db'
import Icon from '@/components/Icon'

export const metadata = { title: 'Inscrições — Admin Valeriote' }
export const dynamic = 'force-dynamic'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Aguardando pagamento', cls: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: 'Confirmada', cls: 'bg-green-100 text-green-700' },
  REFUNDED: { label: 'Estornada', cls: 'bg-red-100 text-red-700' },
  CHARGEBACK: { label: 'Chargeback', cls: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelada', cls: 'bg-gray-200 text-gray-600' },
}

const FILTERS = [
  { key: '', label: 'Todas' },
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'CONFIRMED', label: 'Confirmadas' },
  { key: 'REFUNDED', label: 'Estornos' },
]

export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; modality?: string }>
}) {
  const { status, modality } = await searchParams

  const registrations = await prisma.registration.findMany({
    where: {
      ...(status ? (status === 'REFUNDED' ? { status: { in: ['REFUNDED', 'CHARGEBACK'] } } : { status }) : {}),
      ...(modality ? { modality } : {}),
    },
    include: { course: { select: { title: true } } },
    orderBy: { createdAt: 'desc' },
    take: 300,
  })

  const counts = await prisma.registration.groupBy({
    by: ['status'],
    _count: true,
  })
  const countBy = (s: string) => counts.find((c) => c.status === s)?._count ?? 0

  // Duplicados: mesmo e-mail + curso com mais de uma inscrição confirmada (estorno manual)
  const confirmed = await prisma.registration.findMany({
    where: { status: 'CONFIRMED' },
    select: { email: true, courseId: true },
  })
  const seen = new Map<string, number>()
  for (const r of confirmed) {
    const k = `${r.email}|${r.courseId}`
    seen.set(k, (seen.get(k) ?? 0) + 1)
  }
  const duplicates = [...seen.entries()].filter(([, n]) => n > 1)

  // Auditoria: eventos de webhook com erro ou pendentes
  const problemEvents = await prisma.webhookEvent.findMany({
    where: { OR: [{ error: { not: null } }, { processedAt: null }] },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const query = (s: string) =>
    `/admin/inscricoes${s ? `?status=${s}` : ''}${modality ? `${s ? '&' : '?'}modality=${modality}` : ''}`

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-950 mb-1">Inscrições</h1>
      <p className="text-sm text-gray-500 mb-6">
        Inscrições vindas da página de vendas, pagas via Asaas. O acesso online é liberado
        automaticamente quando o pagamento é confirmado.
      </p>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Aguardando', value: countBy('PENDING'), cls: 'text-amber-600' },
          { label: 'Confirmadas', value: countBy('CONFIRMED'), cls: 'text-green-600' },
          {
            label: 'Estornos/chargeback',
            value: countBy('REFUNDED') + countBy('CHARGEBACK'),
            cls: 'text-red-600',
          },
          { label: 'Total', value: counts.reduce((s, c) => s + c._count, 0), cls: 'text-navy-950' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl bg-white border border-gray-200 p-4">
            <p className={`text-2xl font-bold ${card.cls}`}>{card.value}</p>
            <p className="text-xs text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {duplicates.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-bold mb-1">Pagamento duplicado detectado</p>
          {duplicates.map(([k, n]) => (
            <p key={k}>
              {k.split('|')[0]} — {n} inscrições confirmadas no mesmo evento (avaliar estorno
              manual no painel do Asaas)
            </p>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={query(f.key)}
            className={`rounded-full px-4 py-1.5 font-medium border transition ${
              (status ?? '') === f.key
                ? 'bg-navy-950 text-white border-navy-950'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </Link>
        ))}
        <span className="mx-2 border-l border-gray-300" />
        {[
          { key: '', label: 'Presencial + Online' },
          { key: 'ONLINE', label: 'Online' },
          { key: 'PRESENCIAL', label: 'Presencial' },
        ].map((f) => (
          <Link
            key={f.key}
            href={`/admin/inscricoes?${[
              status ? `status=${status}` : '',
              f.key ? `modality=${f.key}` : '',
            ]
              .filter(Boolean)
              .join('&')}`}
            className={`rounded-full px-4 py-1.5 font-medium border transition ${
              (modality ?? '') === f.key
                ? 'bg-navy-950 text-white border-navy-950'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Lista */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-x-auto mb-8">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
              <th className="px-4 py-3">Inscrito</th>
              <th className="px-4 py-3">Evento</th>
              <th className="px-4 py-3">Modalidade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Criada</th>
              <th className="px-4 py-3">Confirmada</th>
              <th className="px-4 py-3">Cobrança</th>
            </tr>
          </thead>
          <tbody>
            {registrations.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Nenhuma inscrição encontrada.
                </td>
              </tr>
            )}
            {registrations.map((r) => {
              const st = STATUS_LABEL[r.status] ?? {
                label: r.status,
                cls: 'bg-gray-200 text-gray-600',
              }
              return (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy-950">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.course.title}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.modality === 'ONLINE' ? 'Online' : 'Presencial'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>
                      {st.label}
                    </span>
                    {r.status === 'CONFIRMED' && !r.welcomeEmailAt && (
                      <p className="text-[11px] text-amber-600 mt-1">e-mail pendente</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {dateFormatter.format(r.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {r.confirmedAt ? dateFormatter.format(r.confirmedAt) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.paymentUrl ? (
                      <a
                        href={r.paymentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-navy-900 hover:underline"
                      >
                        <Icon name="credit-card" className="h-3.5 w-3.5" /> Ver no Asaas
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Auditoria de webhooks */}
      {problemEvents.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 p-6">
          <h2 className="font-bold text-navy-950 mb-3">
            Webhooks com pendência ({problemEvents.length})
          </h2>
          <div className="space-y-2">
            {problemEvents.map((e) => (
              <div
                key={e.id}
                className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5 text-xs"
              >
                <p className="font-mono text-gray-600">
                  {e.id} · {e.type} · {dateFormatter.format(e.createdAt)}
                </p>
                <p className={e.processedAt ? 'text-gray-500' : 'text-amber-600 font-medium'}>
                  {e.processedAt ? 'processado' : 'pendente'}
                  {e.error ? ` — ${e.error}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
