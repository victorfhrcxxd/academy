'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { talkSchema } from '@/schemas/admin'
import { requireAdmin } from './admin-guard'
import type { ActionResponse } from '@/types'

function revalidateTalks() {
  revalidatePath('/admin/lives')
  revalidatePath('/aulas')
}

export async function createTalk(formData: unknown): Promise<ActionResponse> {
  try {
    await requireAdmin()

    const parsed = talkSchema.safeParse(formData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { liveId, title, speakerName, speakerPhoto, startsAt, endsAt, description } =
      parsed.data

    await prisma.talk.create({
      data: {
        liveId,
        title,
        speakerName: speakerName || null,
        speakerPhoto: speakerPhoto || null,
        startsAt,
        endsAt: endsAt || null,
        description: description || null,
      },
    })

    revalidateTalks()
    return { success: true, message: 'Palestra adicionada à programação' }
  } catch (error) {
    console.error('createTalk:', error)
    return { success: false, error: 'Erro ao adicionar palestra' }
  }
}

export async function updateTalk(
  talkId: string,
  formData: unknown
): Promise<ActionResponse> {
  try {
    await requireAdmin()

    const parsed = talkSchema.safeParse(formData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { liveId, title, speakerName, speakerPhoto, startsAt, endsAt, description } =
      parsed.data

    await prisma.talk.update({
      where: { id: talkId },
      data: {
        liveId,
        title,
        speakerName: speakerName || null,
        speakerPhoto: speakerPhoto || null,
        startsAt,
        endsAt: endsAt || null,
        description: description || null,
      },
    })

    revalidateTalks()
    return { success: true, message: 'Palestra atualizada' }
  } catch (error) {
    console.error('updateTalk:', error)
    return { success: false, error: 'Erro ao atualizar palestra' }
  }
}

export async function deleteTalk(talkId: string): Promise<ActionResponse> {
  try {
    await requireAdmin()

    await prisma.talk.delete({ where: { id: talkId } })

    revalidateTalks()
    return { success: true, message: 'Palestra removida' }
  } catch (error) {
    console.error('deleteTalk:', error)
    return { success: false, error: 'Erro ao remover palestra' }
  }
}
