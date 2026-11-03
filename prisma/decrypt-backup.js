// Descriptografa um backup .json.enc do Vercel Blob (gerado por /api/cron/backup)
// Uso: CRON_SECRET=<segredo> node prisma/decrypt-backup.js arquivo.json.enc [saida.json]
// (ou deixe o CRON_SECRET no .env.local, que ele acha sozinho)
const { createDecipheriv, createHash } = require('crypto')
const fs = require('fs')
const path = require('path')

let secret = process.env.CRON_SECRET
if (!secret) {
  try {
    const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
    secret = (env.match(/^CRON_SECRET=(\S+)/m) || [])[1]
  } catch {}
}
if (!secret) {
  console.error('CRON_SECRET não encontrado (env ou .env.local)')
  process.exit(1)
}

const file = process.argv[2]
if (!file || !fs.existsSync(file)) {
  console.error('Uso: node prisma/decrypt-backup.js arquivo.json.enc [saida.json]')
  process.exit(1)
}

const buf = fs.readFileSync(file)
const key = createHash('sha256').update(secret).digest()
const decipher = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12))
decipher.setAuthTag(buf.subarray(12, 28))
const plain = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8')

const out = process.argv[3] || file.replace(/\.enc$/, '')
fs.writeFileSync(out, plain)
const data = JSON.parse(plain)
for (const k of Object.keys(data)) console.log(k + ':', data[k].length, 'registros')
console.log('\nBackup descriptografado em', out, '— restaure com: node prisma/restore.js', out)
