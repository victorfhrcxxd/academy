import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { listConfirmedPayments } from '@/lib/asaas'
import { sendEmail } from '@/lib/email'

// Reconciliação diária Asaas ↔ banco: pega cobranças confirmadas/recebidas
// nos últimos 3 dias no Asaas e confere se a inscrição local está CONFIRMED.
// Divergência = webhook não chegou (ex.: fila interrompida no painel Asaas
// após 15 falhas) → alerta por e-mail ao admin. Cron diário na VPS OVH.
// Protegido por CRON_SECRET (?secret=...).
export const maxDuration = 60

const ALERT_TO = 'valecursoseconsultoria@gmail.com'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  let payments
  try {
    payments = await listConfirmedPayments(since)
  } catch (error) {
    console.error('cron/health: Asaas indisponível —', error)
    return NextResponse.json({ ok: false, error: 'Asaas indisponível' }, { status: 200 })
  }

  const divergences: string[] = []
  for (const payment of payments) {
    // Só cobranças criadas por este sistema (prefixo "academy:") entram na
    // reconciliação — a conta Asaas é compartilhada com outros sistemas
    if (!payment.externalReference?.startsWith('academy:')) continue

    const registration =
      (await prisma.registration.findUnique({
        where: { id: payment.externalReference.slice('academy:'.length) },
      })) ??
      (await prisma.registration.findUnique({ where: { asaasPaymentId: payment.id } }))

    if (!registration) {
      divergences.push(`Cobrança ${payment.id} (R$ ${payment.value}) sem inscrição no banco`)
    } else if (registration.status === 'PENDING') {
      divergences.push(
        `Cobrança ${payment.id} paga no Asaas, mas inscrição ${registration.id} (${registration.email}) ainda PENDING`
      )
    }
  }

  // Eventos travados (pendentes há mais de 1h mesmo com o cron de varredura)
  const stuck = await prisma.webhookEvent.count({
    where: { processedAt: null, createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
  })
  if (stuck > 0) divergences.push(`${stuck} evento(s) de webhook pendentes há mais de 1h`)

  if (divergences.length > 0) {
    await sendEmail({
      to: ALERT_TO,
      subject: `[academy] Alerta: ${divergences.length} divergência(s) Asaas x banco`,
      html: `<p>Reconciliação diária encontrou divergências:</p><ul>${divergences
        .map((d) => `<li>${d}</li>`)
        .join('')}</ul><p>Verifique a fila de webhooks no painel do Asaas e a aba Inscrições do admin.</p>`,
    })
  }

  return NextResponse.json({
    ok: true,
    paymentsChecked: payments.length,
    divergences: divergences.length,
  })
}
