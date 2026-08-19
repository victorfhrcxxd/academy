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

    const { name, email, password, courseIds, role } = parsed.data
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
        role,
        status: 'ACTIVE',
        // admin enxerga tudo — matrícula só faz sentido pra aluno
        enrollments:
          role === 'ADMIN'
            ? undefined
            : { create: courseIds.map((courseId) => ({ courseId })) },
      },
    })

    revalidatePath('/admin/membros')
    return {
      success: true,
      message:
        role === 'ADMIN' ? 'Administrador cadastrado com sucesso' : 'Aluno cadastrado com sucesso',
    }
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

    if (user.role === 'ADMIN' && user.status === 'ACTIVE') {
      const activeAdmins = await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE' },
      })
      if (activeAdmins <= 1) {
        return { success: false, error: 'É preciso manter pelo menos um administrador ativo' }
      }
    }

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

// Promove aluno a administrador ou rebaixa admin a aluno
export async function setMemberRole(userId: string, role: string): Promise<ActionResponse> {
  try {
    const session = await requireAdmin()

    if (role !== 'ADMIN' && role !== 'MEMBER') {
      return { success: false, error: 'Tipo de usuário inválido' }
    }
    if (userId === session.user.id) {
      return { success: false, error: 'Você não pode alterar o próprio tipo de usuário' }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return { success: false, error: 'Usuário não encontrado' }
    if (user.role === role) return { success: true }

    if (user.role === 'ADMIN' && role === 'MEMBER') {
      const activeAdmins = await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE' },
      })
      if (activeAdmins <= 1 && user.status === 'ACTIVE') {
        return { success: false, error: 'É preciso manter pelo menos um administrador ativo' }
      }
    }

    await prisma.user.update({ where: { id: userId }, data: { role } })

    revalidatePath('/admin/membros')
    return {
      success: true,
      message:
        role === 'ADMIN'
          ? `${user.name} agora é administrador`
          : `${user.name} agora é aluno`,
    }
  } catch (error) {
    console.error('setMemberRole:', error)
    return { success: false, error: 'Erro ao alterar o tipo de usuário' }
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
      const admins = await prisma.user.count({ where: { role: 'ADMIN' } })
      if (admins <= 1) {
        return { success: false, error: 'Não é possível excluir o último administrador' }
      }
    }

    await prisma.user.delete({ where: { id: userId } })

    revalidatePath('/admin/membros')
    return { success: true, message: 'Usuário excluído' }
  } catch (error) {
    console.error('deleteMember:', error)
    return { success: false, error: 'Erro ao excluir aluno' }
  }
}
