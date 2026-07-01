import { z } from 'zod'

export const createCourseSchema = z.object({
  title: z
    .string()
    .min(5, 'Título deve ter no mínimo 5 caracteres')
    .max(200, 'Título deve ter no máximo 200 caracteres'),
  slug: z
    .string()
    .min(3, 'Slug deve ter no mínimo 3 caracteres')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido'),
  shortDescription: z
    .string()
    .min(10, 'Descrição curta deve ter no mínimo 10 caracteres')
    .max(200, 'Descrição curta deve ter no máximo 200 caracteres'),
  description: z
    .string()
    .min(20, 'Descrição deve ter no mínimo 20 caracteres'),
  price: z
    .number()
    .positive('Preço deve ser maior que zero'),
  promotionalPrice: z
    .number()
    .positive()
    .optional()
    .nullable(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  workload: z
    .number()
    .int()
    .min(0, 'Carga horária deve ser maior ou igual a zero'),
  categoryId: z
    .string()
    .cuid('ID de categoria inválido'),
  coverImageUrl: z
    .string()
    .url('URL da imagem inválida'),
  trailerVideoUrl: z
    .string()
    .url('URL do vídeo inválida')
    .optional()
    .nullable(),
})

export type CreateCourseInput = z.infer<typeof createCourseSchema>

export const createModuleSchema = z.object({
  title: z
    .string()
    .min(3, 'Título deve ter no mínimo 3 caracteres')
    .max(150, 'Título deve ter no máximo 150 caracteres'),
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional()
    .nullable(),
  order: z
    .number()
    .int()
    .min(1, 'Ordem deve ser no mínimo 1'),
})

export type CreateModuleInput = z.infer<typeof createModuleSchema>

export const createLessonSchema = z.object({
  title: z
    .string()
    .min(3, 'Título deve ter no mínimo 3 caracteres')
    .max(150, 'Título deve ter no máximo 150 caracteres'),
  description: z
    .string()
    .min(10, 'Descrição deve ter no mínimo 10 caracteres'),
  content: z
    .string()
    .optional()
    .nullable(),
  videoUrl: z
    .string()
    .url('URL do vídeo inválida')
    .optional()
    .nullable(),
  duration: z
    .number()
    .int()
    .min(0)
    .optional()
    .nullable(),
  type: z.enum(['VIDEO', 'TEXT', 'MATERIAL', 'MIXED']),
  isFree: z.boolean().default(false),
  order: z
    .number()
    .int()
    .min(1, 'Ordem deve ser no mínimo 1'),
})

export type CreateLessonInput = z.infer<typeof createLessonSchema>

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido'),
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional()
    .nullable(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
