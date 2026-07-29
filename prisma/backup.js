// Backup completo do banco em JSON (restaurável com restore.js)
// Uso: node prisma/backup.js [arquivo-saida]
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const prisma = new PrismaClient()

async function main() {
  const out = process.argv[2] || `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  const data = {}
  const models = [
    'user',
    'course',
    'live',
    'talk',
    'enrollment',
    'chatMessage',
    'attendance',
    'question',
    'questionVote',
    'material',
    'surveyResponse',
    'passwordResetToken',
    'reminderLog',
  ]
  for (const m of models) {
    data[m] = await prisma[m].findMany()
    console.log(`${m}: ${data[m].length} registros`)
  }
  fs.writeFileSync(out, JSON.stringify(data, null, 1))
  console.log(`\nBackup salvo em ${out}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
