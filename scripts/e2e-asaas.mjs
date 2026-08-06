// Teste ponta a ponta da integração Asaas (sandbox) contra produção.
// Roda de dentro do projeto pra usar o Prisma Client + .env.
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

const envLocal = readFileSync('.env.local', 'utf8')
const get = (k) => {
  const m = envLocal.match(new RegExp(`^${k}=(.*)$`, 'm'))
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : undefined
}

const BASE = 'https://academy.valecursoseconsultoria.com.br'
const INTERNAL = get('INTERNAL_API_TOKEN')
const WEBHOOK_TOKEN = get('ASAAS_WEBHOOK_TOKEN')
const ASAAS_BASE = get('ASAAS_BASE_URL')
const ASAAS_KEY = get('ASAAS_API_KEY')
const TEST_EMAIL = 'ambcamaras+asaas@gmail.com'

const prisma = new PrismaClient()
const log = (...a) => console.log(...a)

// 1. Curso de teste
let course = await prisma.course.findFirst({ where: { title: 'TESTE Asaas (sandbox)' } })
if (!course) {
  course = await prisma.course.create({
    data: {
      title: 'TESTE Asaas (sandbox)',
      description: 'Curso temporário para teste da integração',
      priceCents: 500,
      registrationOpen: true,
      status: 'ARCHIVED',
    },
  })
} else {
  await prisma.course.update({
    where: { id: course.id },
    data: { priceCents: 500, registrationOpen: true },
  })
}
log('curso de teste:', course.id)

// limpa restos de execuções anteriores
await prisma.registration.deleteMany({ where: { courseId: course.id } })
const oldUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } })
if (oldUser) {
  await prisma.user.delete({ where: { id: oldUser.id } })
  log('usuário de teste anterior removido')
}

// 2. 401 sem token
let r = await fetch(`${BASE}/api/inscricoes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
})
log('POST sem token →', r.status, r.status === 401 ? 'OK' : 'FALHOU')

// 3. 422 payload inválido
r = await fetch(`${BASE}/api/inscricoes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-internal-token': INTERNAL },
  body: JSON.stringify({ courseId: course.id, modality: 'ONLINE', name: 'X' }),
})
log('POST payload inválido →', r.status, r.status === 422 ? 'OK' : 'FALHOU')

// 4. 201 inscrição real (cria cobrança no sandbox)
const inscricao = {
  courseId: course.id,
  modality: 'ONLINE',
  name: 'Teste Integracao Asaas',
  email: TEST_EMAIL,
  cpf: '24971563792', // CPF válido de teste
  phone: '22999999999',
  origin: { utm_source: 'teste-e2e' },
}
r = await fetch(`${BASE}/api/inscricoes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-internal-token': INTERNAL },
  body: JSON.stringify(inscricao),
})
const created = await r.json()
log('POST inscrição →', r.status, JSON.stringify(created))
if (r.status !== 201) process.exit(1)

// 5. 409 duplicada devolve a mesma cobrança
r = await fetch(`${BASE}/api/inscricoes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-internal-token': INTERNAL },
  body: JSON.stringify(inscricao),
})
const dup = await r.json()
log(
  'POST duplicada →',
  r.status,
  r.status === 409 && dup.paymentUrl === created.paymentUrl ? 'OK (mesma cobrança)' : 'FALHOU'
)

// 6. GET status público
r = await fetch(`${BASE}/api/inscricoes/${created.registrationId}`)
log('GET status →', r.status, JSON.stringify(await r.json()))

// 7. Paga a cobrança no sandbox (receiveInCash) → Asaas dispara o webhook real
const reg = await prisma.registration.findUnique({ where: { id: created.registrationId } })
log('cobrança:', reg.asaasPaymentId, '| paymentUrl:', reg.paymentUrl)
r = await fetch(`${ASAAS_BASE}/payments/${reg.asaasPaymentId}/receiveInCash`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', access_token: ASAAS_KEY },
  body: JSON.stringify({
    paymentDate: new Date().toISOString().slice(0, 10),
    value: 5,
    notifyCustomer: false,
  }),
})
log('receiveInCash →', r.status, r.status === 200 ? 'pago no sandbox' : await r.text())

// 8. Espera o webhook real chegar (até 2 min)
let confirmed = false
for (let i = 0; i < 12; i++) {
  await new Promise((res) => setTimeout(res, 10000))
  const cur = await prisma.registration.findUnique({ where: { id: created.registrationId } })
  process.stdout.write(`  ${(i + 1) * 10}s status=${cur.status} email=${cur.welcomeEmailAt ? 'enviado' : 'pendente'}\n`)
  if (cur.status === 'CONFIRMED') {
    confirmed = true
    if (cur.welcomeEmailAt) break
  }
}
log('webhook real →', confirmed ? 'CONFIRMADO via webhook do Asaas' : 'NÃO chegou (verificar painel)')

// 9. Verifica provisionamento
const user = await prisma.user.findUnique({
  where: { email: TEST_EMAIL },
  include: { enrollments: true, resetTokens: true },
})
if (user) {
  log(
    'user provisionado:',
    user.id,
    '| role', user.role,
    '| enrollment source:', user.enrollments[0]?.source,
    '| token de senha:', user.resetTokens.filter((t) => !t.usedAt).length > 0 ? 'criado' : 'NÃO criado'
  )
} else {
  log('user NÃO provisionado')
}

// 10. Eventos de webhook gravados
const events = await prisma.webhookEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
for (const e of events) log('evento:', e.id, e.type, e.processedAt ? 'processado' : 'pendente', e.error || '')

// 11. Idempotência: reenvia o mesmo evento manualmente
if (events[0]) {
  const payload = events[0].payload
  r = await fetch(`${BASE}/api/webhooks/asaas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'asaas-access-token': WEBHOOK_TOKEN },
    body: JSON.stringify(payload),
  })
  log('reentrega do mesmo evento →', r.status, (await r.json()).received ? 'OK 200' : 'FALHOU')
  const count = await prisma.webhookEvent.count({ where: { id: events[0].id } })
  log('idempotência: evento continua único →', count === 1 ? 'OK' : 'FALHOU')
}

// 12. Webhook com token errado → 401
r = await fetch(`${BASE}/api/webhooks/asaas`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'asaas-access-token': 'errado' },
  body: '{}',
})
log('webhook token errado →', r.status, r.status === 401 ? 'OK' : 'FALHOU')

// 13. Estorno simulado → revoga acesso
r = await fetch(`${BASE}/api/webhooks/asaas`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'asaas-access-token': WEBHOOK_TOKEN },
  body: JSON.stringify({
    id: `evt_teste_refund_${Date.now()}`,
    event: 'PAYMENT_REFUNDED',
    payment: { id: reg.asaasPaymentId, externalReference: `academy:${created.registrationId}` },
  }),
})
log('webhook PAYMENT_REFUNDED →', r.status)
await new Promise((res) => setTimeout(res, 8000))
const afterRefund = await prisma.registration.findUnique({ where: { id: created.registrationId } })
const enrollAfter = user
  ? await prisma.enrollment.findFirst({ where: { userId: user.id, courseId: course.id } })
  : null
log(
  'pós-estorno: status =', afterRefund.status,
  '| enrollment removido:', enrollAfter === null ? 'OK' : 'FALHOU'
)

await prisma.$disconnect()
log('FIM')
