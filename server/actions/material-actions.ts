'use server'

import { del } from '@vercel/blob'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAdmin } from './admin-guard'
import type { ActionResponse } from '@/types'

export async function createMaterial(input: {
  liveId: string
  title: string
  url: string
  size?: number
}): Promise<ActionResponse> {
  try {
    await requireAdmin()

    const title = (input.title || '').trim()
    if (!title) return { success: false, error: 'Dê um título ao material' }
    if (!input.url?.startsWith('https://')) {
      return { success: false, error: 'Upload inválido' }
    }

    await prisma.material.create({
      data: {
        liveId: input.liveId,
        title: title.slice(0, 150),
        url: input.url,
        size: input.size || null,
      },
    })

    revalidatePath('/admin/lives')
    revalidatePath('/aulas')
    return { success: true, message: 'Material publicado' }
  } catch (error) {
    console.error('createMaterial:', error)
    return { success: false, error: 'Erro ao publicar material' }
  }
}

export async function deleteMaterial(materialId: string): Promise<ActionResponse> {
  try {
    await requireAdmin()

    const material = await prisma.material.findUnique({ where: { id: materialId } })
    if (!material) return { success: true }

    // apaga o arquivo do Blob também (ignora falha — o registro some de qualquer forma)
    await del(material.url).catch(() => null)
    await prisma.material.delete({ where: { id: materialId } })

    revalidatePath('/admin/lives')
    revalidatePath('/aulas')
    return { success: true, message: 'Material removido' }
  } catch (error) {
    console.error('deleteMaterial:', error)
    return { success: false, error: 'Erro ao remover material' }
  }
}
