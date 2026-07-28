'use server'

import { hash } from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { memberSchema } from '@/schemas/admin'
import { requireAdmin } from './admin-guard'
import type { ActionResponse } from '@/types'

export async function createMember(formData: unknown): Promise<ActionResponse> {
  try {
    await requireAdmin()

    const parsed = memberSchema.safeParse(formData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { name, email, password, courseIds } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return { success: false, error: 'Já existe um usuário com esse email' }
    }

    const hashedPassword = await hash(password, 12)

    await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'MEMBER',
        status: 'ACTIVE',
        enrollments: {
          create: courseIds.map((courseId) => ({ courseId })),
        },
      },
    })

    revalidatePath('/admin/membros')
    return { success: true, message: 'Aluno cadastrado com sucesso' }
  } catch (error) {
    console.error('createMember:', error)
    return { success: false, error: 'Erro ao cadastrar aluno' }
  }
}

export async function toggleMemberStatus(userId: string): Promise<ActionResponse> {
  try {
    const session = await requireAdmin()
    if (userId === session.user.id) {
      return { success: false, error: 'Você não pode desativar a si mesmo' }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return { success: false, error: 'Usuário não encontrado' }

    await prisma.user.update({
      where: { id: userId },
      data: { status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
    })

    revalidatePath('/admin/membros')
    return { success: true }
  } catch (error) {
    console.error('toggleMemberStatus:', error)
    return { success: false, error: 'Erro ao alterar status' }
  }
}

export async function setMemberEnrollments(
  userId: string,
  courseIds: string[]
): Promise<ActionResponse> {
  try {
    await requireAdmin()

    await prisma.$transaction([
      prisma.enrollment.deleteMany({
        where: { userId, courseId: { notIn: courseIds } },
      }),
      ...courseIds.map((courseId) =>
        prisma.enrollment.upsert({
          where: { userId_courseId: { userId, courseId } },
          update: {},
          create: { userId, courseId },
        })
      ),
    ])

    revalidatePath('/admin/membros')
    return { success: true, message: 'Matrículas atualizadas' }
  } catch (error) {
    console.error('setMemberEnrollments:', error)
    return { success: false, error: 'Erro ao atualizar matrículas' }
  }
}

export async function resetMemberPassword(
  userId: string,
  newPassword: string
): Promise<ActionResponse> {
  try {
    await requireAdmin()

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Senha deve ter no mínimo 6 caracteres' }
    }

    const hashedPassword = await hash(newPassword, 12)
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    return { success: true, message: 'Senha redefinida' }
  } catch (error) {
    console.error('resetMemberPassword:', error)
    return { success: false, error: 'Erro ao redefinir senha' }
  }
}

export async function deleteMember(userId: string): Promise<ActionResponse> {
  try {
    const session = await requireAdmin()
    if (userId === session.user.id) {
      return { success: false, error: 'Você não pode excluir a si mesmo' }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return { success: false, error: 'Usuário não encontrado' }
    if (user.role === 'ADMIN') {
      return { success: false, error: 'Não é possível excluir um administrador' }
    }

    await prisma.user.delete({ where: { id: userId } })

    revalidatePath('/admin/membros')
    return { success: true, message: 'Aluno excluído' }
  } catch (error) {
    console.error('deleteMember:', error)
    return { success: false, error: 'Erro ao excluir aluno' }
  }
}
