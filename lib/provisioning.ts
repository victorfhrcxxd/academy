// Processamento dos eventos de webhook do Asaas (idempotente).
// Chamado pelo after() do webhook e pela varredura do cron (retry).

import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'
import { prisma } from './db'
import { sendEmail } from './email'
import { montarEmail } from './templates'

// Eventos que liberam acesso — os dois, de forma idempotente (no boleto o
// RECEIVED pode chegar dias depois do CONFIRMED; o primeiro que chegar libera)
const CONFIRM_EVENTS = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED']
// Eventos que revogam acesso
const REVOKE_EVENTS: Record<string, string> = {
  PAYMENT_REFUNDED: 'REFUNDED',
  PAYMENT_CHARGEBACK_REQUESTED: 'CHARGEBACK',
  PAYMENT_CHARGEBACK_DISPUTE: 'CHARGEBACK',
}

function appUrl(): string {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

// Processa UM evento gravado em WebhookEvent. Seguro de chamar mais de uma vez.
export async function processWebhookEvent(eventId: string): Promise<void> {
  const event = await prisma.webhookEvent.findUnique({ where: { id: eventId } })
  if (!event || event.processedAt) return

  try {
    const payload = event.payload as any
    const payment = payload?.payment
    const rawRef: string | undefined = payment?.externalReference || undefined
    const paymentId: string | undefined = payment?.id || event.paymentId || undefined

    const isConfirm = CONFIRM_EVENTS.includes(event.type)
    const revokeStatus = REVOKE_EVENTS[event.type]

    if (!isConfirm && !revokeStatus) {
      // PAYMENT_CREATED, PAYMENT_UPDATED etc. — sem ação
      await markProcessed(eventId)
      return
    }

    // A conta Asaas é compartilhada com outros sistemas (ex.: eDash) e o webhook
    // é da conta inteira: cobrança com externalReference de outro sistema não é nossa
    if (rawRef && !rawRef.startsWith('academy:')) {
      await markProcessed(eventId)
      return
    }
    const externalReference = rawRef?.slice('academy:'.length)

    // Localiza a inscrição: externalReference (= Registration.id), senão pelo paymentId
    const registration =
      (externalReference
        ? await prisma.registration.findUnique({ where: { id: externalReference } })
        : null) ??
      (paymentId
        ? await prisma.registration.findUnique({ where: { asaasPaymentId: paymentId } })
        : null)

    if (!registration) {
      // Caso de auditoria humana — não é reprocessável por retry
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: { processedAt: new Date(), error: 'inscrição não encontrada' },
      })
      return
    }

    if (isConfirm) await confirmRegistration(registration.id)
    else await revokeRegistration(registration.id, revokeStatus)

    await markProcessed(eventId)
  } catch (error) {
    console.error(`processWebhookEvent ${eventId}:`, error)
    // processedAt fica nulo → o cron de varredura tenta de novo
    await prisma.webhookEvent
      .update({
        where: { id: eventId },
        data: { error: String(error).slice(0, 500) },
      })
      .catch(() => {})
  }
}

async function markProcessed(eventId: string) {
  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: { processedAt: new Date(), error: null },
  })
}

// Confirma a inscrição e, se ONLINE, provisiona usuário + matrícula. Idempotente.
export async function confirmRegistration(registrationId: string): Promise<void> {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { course: { select: { title: true, hasFreePlan: true } } },
  })
  if (!reg) return
  // Estorno/chargeback já registrado nunca volta a liberar acesso
  if (reg.status === 'REFUNDED' || reg.status === 'CHARGEBACK') return

  if (reg.status !== 'CONFIRMED') {
    await prisma.registration.update({
      where: { id: reg.id },
      data: { status: 'CONFIRMED', confirmedAt: reg.confirmedAt ?? new Date() },
    })
  }

  if (reg.modality === 'PRESENCIAL') {
    // Presencial: vaga garantida, sem usuário/matrícula
    if (!reg.welcomeEmailAt) await sendConfirmationEmail(reg.id)
    return
  }

  // ONLINE: provisiona (upserts — pagar duas vezes não duplica acesso)
  const email = reg.email.toLowerCase().trim()
  const existing = await prisma.user.findUnique({ where: { email } })
  let userId: string

  if (existing) {
    userId = existing.id
    if (existing.status !== 'ACTIVE') {
      await prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } })
    }
  } else {
    // Senha aleatória inutilizável até o lead definir a dele pelo link.
    // O token de criar senha nasce JUNTO com o usuário: é a marca durável de
    // "nunca definiu senha". Assim, reprocessamento do webhook (o evento
    // gêmeo do PIX acha o usuário recém-criado e pensaria "já existia") e
    // reenvio pelo cron continuam escolhendo o template certo (boas-vindas).
    const unusable = await hash(randomBytes(32).toString('hex'), 12)
    const created = await prisma.user.create({
      data: { name: reg.name, email, password: unusable, role: 'MEMBER', status: 'ACTIVE' },
    })
    userId = created.id
    await prisma.passwordResetToken.create({
      data: {
        userId,
        token: randomBytes(32).toString('hex'),
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    })
  }

  // Curso único com dois níveis: inscrição gratuita (sem cobrança Asaas) entra
  // como FREE; pagamento confirmado entra/PROMOVE para PREMIUM. Nunca rebaixa.
  const paid = !!reg.asaasPaymentId
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId, courseId: reg.courseId } },
    create: { userId, courseId: reg.courseId, source: 'ASAAS', plan: paid ? 'PREMIUM' : 'FREE' },
    update: paid ? { plan: 'PREMIUM' } : {}, // matrícula existente só muda pra cima
  })

  if (reg.userId !== userId) {
    await prisma.registration.update({ where: { id: reg.id }, data: { userId } })
  }

  if (!reg.welcomeEmailAt) await sendConfirmationEmail(reg.id)
}

// Envia o e-mail de confirmação da inscrição (também usado pelo cron pra reenviar).
// Trava atômica em welcomeEmailAt: no PIX, PAYMENT_CONFIRMED e PAYMENT_RECEIVED
// chegam quase juntos e só um dos dois pode enviar; se o envio falhar, a trava
// volta pra null e o cron de varredura reenvia.
export async function sendConfirmationEmail(registrationId: string): Promise<boolean> {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { course: { select: { title: true, hasFreePlan: true } } },
  })
  if (!reg || reg.status !== 'CONFIRMED') return false

  const claimed = await prisma.registration.updateMany({
    where: { id: reg.id, welcomeEmailAt: null },
    data: { welcomeEmailAt: new Date() },
  })
  if (claimed.count === 0) return true // outro processo já enviou (ou está enviando)

  try {
    const firstName = reg.name.split(' ')[0]
    let templateKey: string
    const vars: Record<string, string> = { nome: firstName, curso: reg.course.title }

    if (reg.modality === 'PRESENCIAL') {
      templateKey = 'inscricao-presencial-confirmada'
    } else {
      // ONLINE: token de senha em aberto = usuário que nunca definiu a própria
      // senha (o token nasce com o usuário no provisionamento) → boas-vindas
      // com link novo. Sem token em aberto → conta já em uso, acesso-liberado.
      const needsPassword = reg.userId
        ? (await prisma.passwordResetToken.count({
            where: { userId: reg.userId, usedAt: null },
          })) > 0
        : false

      // O texto certo pra cada situação: inscrição gratuita não fala em
      // pagamento; upgrade Premium (pagamento em curso com plano gratuito)
      // anuncia os benefícios; curso 100% pago mantém os templates clássicos.
      const paid = !!reg.asaasPaymentId
      const isPremiumUpgrade = paid && reg.course.hasFreePlan

      if (needsPassword && reg.userId) {
        const token = randomBytes(32).toString('hex')
        await prisma.$transaction([
          prisma.passwordResetToken.deleteMany({ where: { userId: reg.userId, usedAt: null } }),
          prisma.passwordResetToken.create({
            data: {
              userId: reg.userId,
              token,
              expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72h
            },
          }),
        ])
        templateKey = isPremiumUpgrade
          ? 'boas-vindas-premium'
          : paid
            ? 'boas-vindas'
            : 'boas-vindas-gratuita'
        vars.link = `${appUrl()}/redefinir-senha/${token}`
      } else {
        templateKey = isPremiumUpgrade
          ? 'premium-liberado'
          : paid
            ? 'acesso-liberado'
            : 'acesso-liberado-gratuito'
        vars.link = `${appUrl()}/login`
      }
    }

    const email = await montarEmail(templateKey, vars)
    const sent = await sendEmail({
      to: reg.email,
      subject: email.subject,
      html: email.html,
    })
    if (sent.ok) return true
    console.error(`sendConfirmationEmail ${reg.id}: envio falhou —`, sent.error)
  } catch (error) {
    console.error(`sendConfirmationEmail ${reg.id}:`, error)
  }

  // O envio não aconteceu: devolve a trava pro cron reenviar depois
  await prisma.registration
    .update({ where: { id: reg.id }, data: { welcomeEmailAt: null } })
    .catch(() => {})
  return false
}

// Estorno/chargeback: marca o status e revoga o que o pagamento tinha liberado.
// Em curso com plano gratuito, o estorno REBAIXA a matrícula pra FREE (a pessoa
// perde os benefícios Premium mas segue com acesso às lives). Em curso 100%
// pago, remove a matrícula criada via Asaas, como sempre.
async function revokeRegistration(registrationId: string, newStatus: string): Promise<void> {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { course: { select: { title: true, hasFreePlan: true } } },
  })
  if (!reg) return

  if (reg.status !== newStatus) {
    await prisma.registration.update({ where: { id: reg.id }, data: { status: newStatus } })
  }

  if (reg.modality !== 'ONLINE' || !reg.userId) return

  // Outro pagamento confirmado do mesmo aluno neste curso mantém o acesso
  const outroPagamento = await prisma.registration.count({
    where: {
      courseId: reg.courseId,
      userId: reg.userId,
      status: 'CONFIRMED',
      asaasPaymentId: { not: null },
      id: { not: reg.id },
    },
  })
  if (outroPagamento > 0) return

  const nome = reg.name.split(' ')[0]

  if (reg.course.hasFreePlan) {
    // Matrículas MANUAL (dadas pelo admin) nunca são tocadas
    const downgraded = await prisma.enrollment.updateMany({
      where: { userId: reg.userId, courseId: reg.courseId, source: 'ASAAS', plan: 'PREMIUM' },
      data: { plan: 'FREE' },
    })
    if (downgraded.count > 0) {
      const email = await montarEmail('premium-revogado', { nome, curso: reg.course.title })
      await sendEmail({ to: reg.email, subject: email.subject, html: email.html }).catch(() => {})
    }
    return
  }

  const removed = await prisma.enrollment.deleteMany({
    where: { userId: reg.userId, courseId: reg.courseId, source: 'ASAAS' },
  })
  if (removed.count > 0) {
    const email = await montarEmail('acesso-revogado', { nome, curso: reg.course.title })
    await sendEmail({ to: reg.email, subject: email.subject, html: email.html }).catch(() => {})
  }
}
