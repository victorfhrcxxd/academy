'use server'

import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { ActionResponse } from '@/types'

export async function submitSurvey(input: {
  courseId: string
  rating: number
  comment?: string
}): Promise<ActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, error: 'Não autorizado' }

    const rating = Math.round(Number(input.rating))
    if (!rating || rating < 1 || rating > 5) {
      return { success: false, error: 'Escolha de 1 a 5 estrelas' }
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId: session.user.id, courseId: input.courseId },
      },
    })
    if (!enrollment) return { success: false, error: 'Você não está matriculado neste curso' }

    await prisma.surveyResponse.upsert({
      where: {
        courseId_userId: { courseId: input.courseId, userId: session.user.id },
      },
      update: { rating, comment: input.comment?.trim().slice(0, 1000) || null },
      create: {
        courseId: input.courseId,
        userId: session.user.id,
        rating,
        comment: input.comment?.trim().slice(0, 1000) || null,
      },
    })

    revalidatePath(`/aulas/curso/${input.courseId}`)
    return { success: true, message: 'Obrigado pela sua avaliação! 💛' }
  } catch (error) {
    console.error('submitSurvey:', error)
    return { success: false, error: 'Erro ao enviar avaliação' }
  }
}
