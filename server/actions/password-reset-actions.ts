'use server'

import { randomBytes } from 'crypto'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { getTemplate, renderTemplate } from '@/lib/templates'
import type { ActionResponse } from '@/types'

// Solicita o link de redefinição. Sempre responde sucesso para não revelar
// se o email existe ou não (segurança contra enumeração).
export async function requestPasswordReset(emailInput: unknown): Promise<ActionResponse> {
  try {
    const email = typeof emailInput === 'string' ? emailInput.toLowerCase().trim() : ''
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Informe um email válido' }
    }

    const genericOk = {
      success: true,
      message:
        'Se este email estiver cadastrado, você receberá um link de redefinição em instantes. Confira também a caixa de spam.',
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.status !== 'ACTIVE') return genericOk

    // invalida tokens anteriores e cria um novo com validade de 1 hora
    const token = randomBytes(32).toString('hex')
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      }),
    ])

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const link = `${baseUrl}/redefinir-senha/${token}`

    const template = await getTemplate('recuperar-senha')
    const vars = { nome: user.name.split(' ')[0], link }
    const sent = await sendEmail({
      to: user.email,
      subject: renderTemplate(template.subject, vars),
      html: renderTemplate(template.body, vars),
    })

    if (!sent.ok) {
      console.error('requestPasswordReset: email não enviado —', sent.error)
      return {
        success: false,
        error:
          'Não foi possível enviar o email agora. Tente novamente mais tarde ou fale com um administrador.',
      }
    }

    return genericOk
  } catch (error) {
    console.error('requestPasswordReset:', error)
    return { success: false, error: 'Erro ao solicitar redefinição' }
  }
}

// Valida o token (usado pela página de redefinição para exibir o formulário)
export async function validateResetToken(token: string): Promise<ActionResponse> {
  try {
    const record = await prisma.passwordResetToken.findUnique({ where: { token } })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return { success: false, error: 'Link inválido ou expirado' }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Erro ao validar o link' }
  }
}

export async function resetPassword(
  token: string,
  newPassword: unknown
): Promise<ActionResponse> {
  try {
    const password = typeof newPassword === 'string' ? newPassword : ''
    if (password.length < 6) {
      return { success: false, error: 'A senha deve ter no mínimo 6 caracteres' }
    }

    const record = await prisma.passwordResetToken.findUnique({ where: { token } })
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return { success: false, error: 'Link inválido ou expirado — peça um novo' }
    }

    const hashed = await hash(password, 12)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])

    return { success: true, message: 'Senha redefinida! Faça login com a nova senha.' }
  } catch (error) {
    console.error('resetPassword:', error)
    return { success: false, error: 'Erro ao redefinir a senha' }
  }
}
