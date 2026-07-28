'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { liveSchema } from '@/schemas/admin'
import { requireAdmin } from './admin-guard'
import type { ActionResponse } from '@/types'

function revalidateLives() {
  revalidatePath('/admin/lives')
  revalidatePath('/aulas')
}

export async function createLive(formData: unknown): Promise<ActionResponse> {
  try {
    await requireAdmin()

    const parsed = liveSchema.safeParse(formData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { courseId, title, description, scheduledAt, endsAt, embedUrl } = parsed.data

    await prisma.live.create({
      data: {
        courseId,
        title,
        description: description || null,
        scheduledAt,
        endsAt: endsAt || null,
        embedUrl: embedUrl || null,
      },
    })

    revalidateLives()
    return { success: true, message: 'Dia do evento agendado' }
  } catch (error) {
    console.error('createLive:', error)
    return { success: false, error: 'Erro ao agendar o dia' }
  }
}

export async function updateLive(
  liveId: string,
  formData: unknown
): Promise<ActionResponse> {
  try {
    await requireAdmin()

    const parsed = liveSchema.safeParse(formData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { courseId, title, description, scheduledAt, endsAt, embedUrl } = parsed.data

    await prisma.live.update({
      where: { id: liveId },
      data: {
        courseId,
        title,
        description: description || null,
        scheduledAt,
        endsAt: endsAt || null,
        embedUrl: embedUrl || null,
      },
    })

    revalidateLives()
    return { success: true, message: 'Dia atualizado' }
  } catch (error) {
    console.error('updateLive:', error)
    return { success: false, error: 'Erro ao atualizar o dia' }
  }
}

export async function setLiveStatus(
  liveId: string,
  status: 'SCHEDULED' | 'LIVE' | 'ENDED'
): Promise<ActionResponse> {
  try {
    await requireAdmin()

    await prisma.live.update({ where: { id: liveId }, data: { status } })

    revalidateLives()
    return { success: true }
  } catch (error) {
    console.error('setLiveStatus:', error)
    return { success: false, error: 'Erro ao alterar status da palestra' }
  }
}

export async function deleteLive(liveId: string): Promise<ActionResponse> {
  try {
    await requireAdmin()

    await prisma.live.delete({ where: { id: liveId } })

    revalidateLives()
    return { success: true, message: 'Palestra excluída' }
  } catch (error) {
    console.error('deleteLive:', error)
    return { success: false, error: 'Erro ao excluir palestra' }
  }
}
