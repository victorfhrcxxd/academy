'use server'

import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { getTemplate, renderTemplate } from '@/lib/templates'
import { requireAdmin } from './admin-guard'
import type { ActionResponse } from '@/types'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

// Envio manual de lembrete pra todos os alunos matriculados no curso do dia
export async function sendReminderNow(liveId: string): Promise<ActionResponse> {
  try {
    await requireAdmin()

    const live = await prisma.live.findUnique({
      where: { id: liveId },
      include: { course: true },
    })
    if (!live) return { success: false, error: 'Dia não encontrado' }

    const students = await prisma.enrollment.findMany({
      where: { courseId: live.courseId, user: { status: 'ACTIVE', role: 'MEMBER' } },
      include: { user: { select: { name: true, email: true } } },
    })
    if (students.length === 0) {
      return { success: false, error: 'Nenhum aluno ativo matriculado neste curso' }
    }

    const template = await getTemplate('lembrete')
    const baseUrl = process.env.NEXTAUTH_URL || 'https://academy.valecursoseconsultoria.com.br'

    let sent = 0
    let failed = 0
    for (const { user } of students) {
      const vars = {
        nome: user.name.split(' ')[0],
        dia: live.title,
        curso: live.course.title,
        data: dateFormatter.format(live.scheduledAt),
        link: `${baseUrl}/aulas/live/${live.id}`,
      }
      const res = await sendEmail({
        to: user.email,
        subject: renderTemplate(template.subject, vars),
        html: renderTemplate(template.body, vars),
      })
      if (res.ok) sent++
      else failed++
    }

    return {
      success: true,
      message: `Lembrete enviado para ${sent} aluno${sent === 1 ? '' : 's'}${
        failed ? ` (${failed} falharam)` : ''
      }`,
    }
  } catch (error) {
    console.error('sendReminderNow:', error)
    return { success: false, error: 'Erro ao enviar lembretes' }
  }
}
