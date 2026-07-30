// Restaura um backup JSON criado pelo backup.js
// Uso: node prisma/restore.js <arquivo-backup.json>
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const prisma = new PrismaClient()

async function main() {
  const file = process.argv[2]
  if (!file || !fs.existsSync(file)) {
    console.error('Informe o arquivo de backup. Uso: node prisma/restore.js backups/arquivo.json')
    process.exit(1)
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))

  // ordem respeita as dependências entre tabelas
  const order = [
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
    'reminderLog',
  ]

  for (const model of order) {
    const rows = data[model] || []
    if (rows.length === 0) {
      console.log(`${model}: 0 (pulado)`)
      continue
    }
    const res = await prisma[model].createMany({ data: rows, skipDuplicates: true })
    console.log(`${model}: ${res.count} restaurados`)
  }

  console.log('\nRestauração concluída!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
