// Remove os dados do teste E2E da integração Asaas
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const course = await prisma.course.findFirst({ where: { title: 'TESTE Asaas (sandbox)' } })
if (course) {
  const regs = await prisma.registration.findMany({ where: { courseId: course.id } })
  const paymentIds = regs.map((r) => r.asaasPaymentId).filter(Boolean)
  await prisma.webhookEvent.deleteMany({
    where: { OR: [{ paymentId: { in: paymentIds } }, { id: { startsWith: 'evt_teste_' } }] },
  })
  await prisma.registration.deleteMany({ where: { courseId: course.id } })
  await prisma.course.delete({ where: { id: course.id } })
  console.log('curso de teste e', regs.length, 'inscrições removidos')
}
const user = await prisma.user.findUnique({ where: { email: 'ambcamaras+asaas@gmail.com' } })
if (user) {
  await prisma.user.delete({ where: { id: user.id } })
  console.log('usuário de teste removido')
}
const left = await prisma.webhookEvent.count()
console.log('eventos de webhook restantes no banco:', left)
await prisma.$disconnect()
