'use server'

import { hash, compare } from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { ActionResponse } from '@/types'

export async function changeOwnPassword(
  currentPassword: unknown,
  newPassword: unknown
): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Não autorizado' }

    const current = typeof currentPassword === 'string' ? currentPassword : ''
    const next = typeof newPassword === 'string' ? newPassword : ''

    if (next.length < 6) {
      return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres' }
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return { success: false, error: 'Usuário não encontrado' }

    const valid = await compare(current, user.password)
    if (!valid) return { success: false, error: 'Senha atual incorreta' }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hash(next, 12) },
    })

    return { success: true, message: 'Senha alterada com sucesso!' }
  } catch (error) {
    console.error('changeOwnPassword:', error)
    return { success: false, error: 'Erro ao alterar a senha' }
  }
}
