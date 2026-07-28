// Cria/atualiza o usuário administrador inicial.
// Uso: node prisma/seed.js [email] [senha]
const { PrismaClient } = require('@prisma/client')
const { hash } = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = (process.argv[2] || 'victorximenesfhrc@gmail.com').toLowerCase()
  const password = process.argv[3] || 'Valeriote2026'

  const hashed = await hash(password, 12)

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', status: 'ACTIVE' },
    create: {
      name: 'Administrador Valeriote',
      email,
      password: hashed,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  })

  console.log(`Admin pronto: ${admin.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
