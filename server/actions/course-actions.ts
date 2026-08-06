'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { courseSchema } from '@/schemas/admin'
import { requireAdmin } from './admin-guard'
import type { ActionResponse } from '@/types'

export async function createCourse(formData: unknown): Promise<ActionResponse> {
  try {
    await requireAdmin()

    const parsed = courseSchema.safeParse(formData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    await prisma.course.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        priceCents: parsed.data.priceCents ?? null,
        registrationOpen: parsed.data.registrationOpen ?? false,
      },
    })

    revalidatePath('/admin/cursos')
    return { success: true, message: 'Curso criado' }
  } catch (error) {
    console.error('createCourse:', error)
    return { success: false, error: 'Erro ao criar curso' }
  }
}

export async function updateCourse(
  courseId: string,
  formData: unknown
): Promise<ActionResponse> {
  try {
    await requireAdmin()

    const parsed = courseSchema.safeParse(formData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    await prisma.course.update({
      where: { id: courseId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        priceCents: parsed.data.priceCents ?? null,
        registrationOpen: parsed.data.registrationOpen ?? false,
      },
    })

    revalidatePath('/admin/cursos')
    return { success: true, message: 'Curso atualizado' }
  } catch (error) {
    console.error('updateCourse:', error)
    return { success: false, error: 'Erro ao atualizar curso' }
  }
}

export async function toggleCourseStatus(courseId: string): Promise<ActionResponse> {
  try {
    await requireAdmin()

    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course) return { success: false, error: 'Curso não encontrado' }

    await prisma.course.update({
      where: { id: courseId },
      data: { status: course.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' },
    })

    revalidatePath('/admin/cursos')
    return { success: true }
  } catch (error) {
    console.error('toggleCourseStatus:', error)
    return { success: false, error: 'Erro ao alterar status do curso' }
  }
}

export async function deleteCourse(courseId: string): Promise<ActionResponse> {
  try {
    await requireAdmin()

    await prisma.course.delete({ where: { id: courseId } })

    revalidatePath('/admin/cursos')
    return { success: true, message: 'Curso excluído' }
  } catch (error) {
    console.error('deleteCourse:', error)
    return { success: false, error: 'Erro ao excluir curso' }
  }
}
