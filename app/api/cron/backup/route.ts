import { createCipheriv, createHash, randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { put, list, del } from '@vercel/blob'
import { prisma } from '@/lib/db'

// Backup externo diário: exporta o banco inteiro em JSON (formato do
// prisma/restore.js), CRIPTOGRAFA (AES-256-GCM, chave derivada do CRON_SECRET)
// e grava no Vercel Blob — cópia fora da VPS do banco. O arquivo público é
// ilegível sem o segredo; descriptografar com prisma/decrypt-backup.js.
// Retenção: últimos 14 arquivos. Cron diário na VPS (?secret=CRON_SECRET).
export const maxDuration = 60

function encrypt(plain: string, secret: string): Buffer {
  const key = createHash('sha256').update(secret).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  // formato: [12 bytes iv][16 bytes authTag][ciphertext]
  return Buffer.concat([iv, cipher.getAuthTag(), enc])
}

// mesma ordem de dependências do prisma/restore.js — manter em sincronia
const MODELS = [
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
  'emailTemplate',
  'emailSettings',
  'registration',
  'webhookEvent',
] as const

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const data: Record<string, unknown[]> = {}
  let total = 0
  for (const model of MODELS) {
    data[model] = await (prisma as any)[model].findMany()
    total += data[model].length
  }

  const stamp = new Date().toISOString().slice(0, 10)
  const payload = encrypt(JSON.stringify(data), process.env.CRON_SECRET!)
  const blob = await put(`db-backups/academy-${stamp}.json.enc`, payload, {
    access: 'public',
    contentType: 'application/octet-stream',
  })

  // retenção: mantém os 14 mais recentes
  let removed = 0
  try {
    const { blobs } = await list({ prefix: 'db-backups/academy-' })
    const old = blobs
      .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))
      .slice(14)
    for (const b of old) {
      await del(b.url)
      removed++
    }
  } catch (error) {
    console.error('cron/backup retenção:', error)
  }

  return NextResponse.json({ ok: true, rows: total, pathname: blob.pathname, removed })
}
