import { z } from 'zod'

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Nome deve ter no mínimo 3 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres'),
    email: z.string().email('Email inválido'),
    password: z
      .string()
      .min(6, 'Senha deve ter no mínimo 6 caracteres')
      .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
      .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não correspondem',
    path: ['confirmPassword'],
  })

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const requestPasswordResetSchema = z.object({
  email: z.string().email('Email inválido'),
})

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, 'Senha deve ter no mínimo 6 caracteres')
      .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
      .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não correspondem',
    path: ['confirmPassword'],
  })

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string().email('Email inválido'),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
