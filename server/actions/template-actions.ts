'use server'

import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { TEMPLATE_DEFAULTS, renderTemplate } from '@/lib/templates'
import { requireAdmin } from './admin-guard'
import type { ActionResponse } from '@/types'

const SAMPLE_VARS: Record<string, string> = {
  nome: 'Maria',
  dia: 'Dia 1',
  curso: 'Congresso Brasileiro de Contratos Administrativos',
  data: 'terça-feira, 17 de novembro às 09:00',
  link: 'https://academy.valecursoseconsultoria.com.br/aulas',
}

export async function updateTemplate(
  key: string,
  subject: string,
  body: string
): Promise<ActionResponse> {
  try {
    await requireAdmin()
    if (!TEMPLATE_DEFAULTS[key]) return { success: false, error: 'Template inválido' }
    if (!subject.trim() || !body.trim()) {
      return { success: false, error: 'Assunto e corpo são obrigatórios' }
    }

    await prisma.emailTemplate.upsert({
      where: { key },
      update: { subject: subject.trim(), body },
      create: { key, subject: subject.trim(), body },
    })

    revalidatePath('/admin/emails')
    return { success: true, message: 'Template salvo' }
  } catch (error) {
    console.error('updateTemplate:', error)
    return { success: false, error: 'Erro ao salvar template' }
  }
}

export async function restoreTemplateDefault(key: string): Promise<ActionResponse> {
  try {
    await requireAdmin()
    if (!TEMPLATE_DEFAULTS[key]) return { success: false, error: 'Template inválido' }

    await prisma.emailTemplate.deleteMany({ where: { key } })

    revalidatePath('/admin/emails')
    return { success: true, message: 'Template restaurado ao padrão' }
  } catch (error) {
    console.error('restoreTemplateDefault:', error)
    return { success: false, error: 'Erro ao restaurar' }
  }
}

// Envia o template (com dados de exemplo) pro email do próprio admin
export async function sendTemplateTest(
  key: string,
  subject: string,
  body: string
): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Não autorizado' }
    }

    const res = await sendEmail({
      to: session.user.email,
      subject: renderTemplate(subject, SAMPLE_VARS),
      html: renderTemplate(body, SAMPLE_VARS),
    })

    return res.ok
      ? { success: true, message: `Teste enviado para ${session.user.email}` }
      : { success: false, error: res.error || 'Falha no envio' }
  } catch (error) {
    console.error('sendTemplateTest:', error)
    return { success: false, error: 'Erro ao enviar teste' }
  }
}
