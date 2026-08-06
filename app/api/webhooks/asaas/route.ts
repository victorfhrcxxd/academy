import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { prisma } from '@/lib/db'
import { secureCompare } from '@/lib/secure-compare'
import { processWebhookEvent } from '@/lib/provisioning'

// Webhook do Asaas.
// Regras (exigências do Asaas — não mudar sem ler a doc deles):
// - responder HTTP 200 exato, SEMPRE (até pra payload inesperado); 201/204 contam
//   como falha e 15 falhas consecutivas interrompem a fila de entrega
// - entrega é at-least-once → idempotência pelo id do evento (tabela WebhookEvent)
// - responder rápido: processamento roda depois do response via after();
//   o cron /api/cron/process-webhooks varre pendentes como retry
// - parse tolerante: o Asaas adiciona campos sem aviso — nada de schema estrito
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const token = req.headers.get('asaas-access-token')
  if (!secureCompare(token, process.env.ASAAS_WEBHOOK_TOKEN)) {
    console.error('webhook asaas: token inválido —', req.headers.get('x-forwarded-for'))
    return new NextResponse(null, { status: 401 })
  }

  const ok = NextResponse.json({ received: true }, { status: 200 })

  let payload: any
  try {
    payload = await req.json()
  } catch {
    console.error('webhook asaas: corpo não é JSON')
    return ok // nunca derrubar a fila por payload inesperado
  }

  const eventId: string | undefined = typeof payload?.id === 'string' ? payload.id : undefined
  const eventType: string = typeof payload?.event === 'string' ? payload.event : 'UNKNOWN'
  const paymentId: string | null =
    typeof payload?.payment?.id === 'string' ? payload.payment.id : null

  if (!eventId) {
    // Sem id não há como garantir idempotência — grava pra auditoria e segue
    console.error('webhook asaas: evento sem id', JSON.stringify(payload).slice(0, 300))
    await prisma.webhookEvent
      .create({
        data: {
          id: `noid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: eventType,
          paymentId,
          payload,
          processedAt: new Date(),
          error: 'evento sem id',
        },
      })
      .catch(() => {})
    return ok
  }

  try {
    const existing = await prisma.webhookEvent.findUnique({ where: { id: eventId } })
    if (existing?.processedAt) return ok // duplicado já processado

    if (!existing) {
      await prisma.webhookEvent.create({
        data: { id: eventId, type: eventType, paymentId, payload },
      })
    }
  } catch (error) {
    // Corrida entre duas entregas simultâneas do mesmo evento: o unique segura
    console.error('webhook asaas: falha ao gravar evento', eventId, error)
    return ok
  }

  after(() => processWebhookEvent(eventId))
  return ok
}
