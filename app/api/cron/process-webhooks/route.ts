import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { processWebhookEvent, sendConfirmationEmail } from '@/lib/provisioning'

// Varredura de segurança: reprocessa eventos de webhook pendentes
// (after() falhou, deploy no meio, timeout) e reenvia e-mails de
// confirmação que não saíram. Chamado a cada 5 min pelo cron da VPS OVH.
// Protegido por CRON_SECRET (?secret=...).
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // Eventos pendentes com mais de 2 min (dá tempo do after() da entrega original)
  const cutoff = new Date(Date.now() - 2 * 60 * 1000)
  const pendingEvents = await prisma.webhookEvent.findMany({
    where: { processedAt: null, createdAt: { lt: cutoff } },
    orderBy: { createdAt: 'asc' },
    take: 50,
    select: { id: true },
  })
  for (const event of pendingEvents) {
    await processWebhookEvent(event.id)
  }

  // Inscrições confirmadas cujo e-mail de confirmação ainda não saiu
  const pendingEmails = await prisma.registration.findMany({
    where: { status: 'CONFIRMED', welcomeEmailAt: null, confirmedAt: { lt: cutoff } },
    take: 30,
    select: { id: true },
  })
  let emailsSent = 0
  for (const reg of pendingEmails) {
    if (await sendConfirmationEmail(reg.id)) emailsSent++
  }

  return NextResponse.json({
    ok: true,
    eventsProcessed: pendingEvents.length,
    emailsSent,
    emailsPending: pendingEmails.length - emailsSent,
  })
}
