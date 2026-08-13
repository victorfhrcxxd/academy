'use server'

import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { del, put } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { TEMPLATE_DEFAULTS, emailShell, getEmailSettings, renderTemplate } from '@/lib/templates'
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

// Cabeçalho global dos emails (cor de fundo + logo), como no painel do pagevale
export async function updateEmailSettings(
  headerBg: string,
  headerLogo: string
): Promise<ActionResponse> {
  try {
    await requireAdmin()
    const bg = headerBg.trim()
    const logo = headerLogo.trim()
    if (bg && !/^#[0-9a-fA-F]{3,8}$/.test(bg)) {
      return { success: false, error: 'Cor inválida: use o formato #0b2233' }
    }
    if (logo && !/^(https?:\/\/|\/)/.test(logo)) {
      return { success: false, error: 'Logo inválida: use URL completa (https://...) ou caminho do site (/brand/...)' }
    }

    await prisma.emailSettings.upsert({
      where: { id: 1 },
      update: { headerBg: bg || null, headerLogo: logo || null },
      create: { id: 1, headerBg: bg || null, headerLogo: logo || null },
    })

    revalidatePath('/admin/emails')
    return { success: true, message: 'Cabeçalho salvo' }
  } catch (error) {
    console.error('updateEmailSettings:', error)
    return { success: false, error: 'Erro ao salvar cabeçalho' }
  }
}

// Upload da logo do cabeçalho (Vercel Blob), como o banner de email do pagevale
export async function uploadEmailHeaderLogo(
  formData: FormData
): Promise<ActionResponse & { url?: string }> {
  try {
    await requireAdmin()
    const file = formData.get('logo')
    if (!(file instanceof File) || file.size === 0) {
      return { success: false, error: 'Selecione uma imagem' }
    }
    const TIPOS: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
    }
    const ext = TIPOS[file.type]
    if (!ext) return { success: false, error: 'Formato inválido: use JPG, PNG ou WebP' }
    if (file.size > 3 * 1024 * 1024) {
      return { success: false, error: 'Imagem grande demais (máximo 3 MB)' }
    }

    const blob = await put(`email-header/logo-${Date.now()}.${ext}`, file, {
      access: 'public',
      contentType: file.type,
    })

    // Logo anterior enviada por upload: limpa do storage para não acumular
    const atual = await prisma.emailSettings.findUnique({ where: { id: 1 } })
    const anterior = atual?.headerLogo
    await prisma.emailSettings.upsert({
      where: { id: 1 },
      update: { headerLogo: blob.url },
      create: { id: 1, headerLogo: blob.url },
    })
    if (anterior && anterior !== blob.url && anterior.includes('.blob.vercel-storage.com')) {
      try {
        await del(anterior)
      } catch {
        /* arquivo já removido */
      }
    }

    revalidatePath('/admin/emails')
    return { success: true, message: 'Logo enviada', url: blob.url }
  } catch (error) {
    console.error('uploadEmailHeaderLogo:', error)
    return { success: false, error: 'Erro ao enviar a logo' }
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

    const cfg = await getEmailSettings()
    const res = await sendEmail({
      to: session.user.email,
      subject: renderTemplate(subject, SAMPLE_VARS),
      html: emailShell(renderTemplate(body, SAMPLE_VARS), cfg),
    })

    return res.ok
      ? { success: true, message: `Teste enviado para ${session.user.email}` }
      : { success: false, error: res.error || 'Falha no envio' }
  } catch (error) {
    console.error('sendTemplateTest:', error)
    return { success: false, error: 'Erro ao enviar teste' }
  }
}
