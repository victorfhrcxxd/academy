import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { getTemplate, renderTemplate } from '@/lib/templates'

// Lembretes automáticos: chamado a cada ~15min por um cron externo
// (crontab da VPS OVH). Envia email 24h antes e 1h antes de cada dia.
// Protegido por CRON_SECRET (?secret=...).
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const now = Date.now()
  const windows: { kind: string; min: number; max: number; label: string }[] = [
    { kind: 'H24', min: 22 * 60, max: 25 * 60, label: 'amanhã' },
    { kind: 'H1', min: 30, max: 90, label: 'daqui a pouco' },
  ]

  const upcoming = await prisma.live.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { gt: new Date(now), lt: new Date(now + 26 * 60 * 60 * 1000) },
    },
    include: { course: { select: { id: true, title: true } } },
  })

  let sent = 0
  let failed = 0
  const template = await getTemplate('lembrete')

  for (const live of upcoming) {
    const minutesToStart = (live.scheduledAt.getTime() - now) / 60000
    const window = windows.find((w) => minutesToStart >= w.min && minutesToStart <= w.max)
    if (!window) continue

    const students = await prisma.enrollment.findMany({
      where: { courseId: live.courseId, user: { status: 'ACTIVE', role: 'MEMBER' } },
      include: { user: { select: { id: true, name: true, email: true } } },
    })

    const timeStr = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(live.scheduledAt)

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    for (const { user } of students) {
      // já enviado? pula
      const already = await prisma.reminderLog.findUnique({
        where: {
          liveId_userId_kind: { liveId: live.id, userId: user.id, kind: window.kind },
        },
      })
      if (already) continue

      const vars = {
        nome: user.name.split(' ')[0],
        dia: live.title,
        curso: live.course.title,
        data: timeStr,
        link: `${baseUrl}/aulas/live/${live.id}`,
      }
      const res = await sendEmail({
        to: user.email,
        subject:
          (window.kind === 'H1' ? '🔴 Começa em breve! ' : '') +
          renderTemplate(template.subject, vars),
        html: renderTemplate(template.body, vars),
      })

      if (res.ok) {
        await prisma.reminderLog.create({
          data: { liveId: live.id, userId: user.id, kind: window.kind },
        })
        sent++
      } else {
        failed++
      }
    }
  }

  return NextResponse.json({ ok: true, sent, failed, checked: upcoming.length })
}
