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

// Dia do evento (transmissão)
export const liveSchema = z.object({
  courseId: z.string().min(1, 'Selecione o curso'),
  title: z.string().min(2, 'Título deve ter no mínimo 2 caracteres').max(150),
  description: z.string().max(2000).optional(),
  scheduledAt: z.coerce.date({ message: 'Data e hora inválidas' }),
  endsAt: z.coerce.date({ message: 'Horário de término inválido' }).optional(),
  embedUrl: z
    .string()
    .url('Link inválido — use a URL completa (https://...)')
    .optional()
    .or(z.literal('')),
  restrictPlayer: z.boolean().optional(),
}).refine((d) => !d.endsAt || d.endsAt > d.scheduledAt, {
  message: 'O término deve ser depois do início',
  path: ['endsAt'],
})

export type LiveInput = z.infer<typeof liveSchema>

// Palestra da programação de um dia
export const talkSchema = z.object({
  liveId: z.string().min(1, 'Dia inválido'),
  title: z.string().min(3, 'Tema deve ter no mínimo 3 caracteres').max(150),
  speakerName: z.string().max(120).optional(),
  // foto: data URL (upload redimensionado no navegador) ou link https
  speakerPhoto: z.string().max(900_000).optional().or(z.literal('')),
  startsAt: z.coerce.date({ message: 'Horário de início inválido' }),
  endsAt: z.coerce.date({ message: 'Horário de término inválido' }).optional(),
  description: z.string().max(2000).optional(),
}).refine((d) => !d.endsAt || d.endsAt > d.startsAt, {
  message: 'O término deve ser depois do início',
  path: ['endsAt'],
})

export type TalkInput = z.infer<typeof talkSchema>
