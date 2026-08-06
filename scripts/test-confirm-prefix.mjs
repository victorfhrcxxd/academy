// Valida o caminho PAYMENT_CONFIRMED com externalReference prefixado (academy:)
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const env = readFileSync('.env.local', 'utf8')
const get = (k) => {
  const m = env.match(new RegExp(`^${k}=(.*)$`, 'm'))
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : undefined
}
const BASE = 'https://academy.valecursoseconsultoria.com.br'
const TEST_EMAIL = 'ambcamaras+asaas@gmail.com'

let course = await prisma.course.findFirst({ where: { title: 'TESTE Asaas (sandbox)' } })
if (!course) {
  course = await prisma.course.create({
    data: { title: 'TESTE Asaas (sandbox)', priceCents: 500, registrationOpen: true, status: 'ARCHIVED' },
  })
}
let r = await fetch(`${BASE}/api/inscricoes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-internal-token': get('INTERNAL_API_TOKEN') },
  body: JSON.stringify({
    courseId: course.id,
    modality: 'ONLINE',
    name: 'Teste Prefixo',
    email: TEST_EMAIL,
    cpf: '24971563792',
  }),
})
const created = await r.json()
console.log('inscrição:', r.status, created.registrationId)

r = await fetch(`${BASE}/api/webhooks/asaas`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'asaas-access-token': get('ASAAS_WEBHOOK_TOKEN') },
  body: JSON.stringify({
    id: `evt_teste_confirm_${Date.now()}`,
    event: 'PAYMENT_CONFIRMED',
    payment: { id: `pay_fake_${Date.now()}`, externalReference: `academy:${created.registrationId}` },
  }),
})
console.log('webhook CONFIRMED →', r.status)
await new Promise((res) => setTimeout(res, 8000))

const reg = await prisma.registration.findUnique({ where: { id: created.registrationId } })
const user = await prisma.user.findUnique({
  where: { email: TEST_EMAIL },
  include: { enrollments: true, resetTokens: { where: { usedAt: null } } },
})
console.log(
  'status:', reg.status,
  '| user:', user ? 'criado' : 'NÃO criado',
  '| enrollment:', user?.enrollments[0]?.source,
  '| token senha:', user?.resetTokens.length ? 'criado' : 'não',
  '| email:', reg.welcomeEmailAt ? 'enviado' : 'pendente'
)
await prisma.$disconnect()
