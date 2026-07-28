import { z } from 'zod'

export const memberSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  courseIds: z.array(z.string()).default([]),
})

export type MemberInput = z.infer<typeof memberSchema>

export const courseSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(150),
  description: z.string().max(2000).optional(),
})

export type CourseInput = z.infer<typeof courseSchema>

export const liveSchema = z.object({
  courseId: z.string().min(1, 'Selecione o curso'),
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(150),
  description: z.string().max(2000).optional(),
  scheduledAt: z.coerce.date({ message: 'Data e hora inválidas' }),
  embedUrl: z
    .string()
    .url('Link inválido — use a URL completa (https://...)')
    .optional()
    .or(z.literal('')),
})

export type LiveInput = z.infer<typeof liveSchema>
