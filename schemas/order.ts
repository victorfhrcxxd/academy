import { z } from 'zod'

export const validateCouponSchema = z.object({
  code: z
    .string()
    .min(3, 'Código do cupom deve ter no mínimo 3 caracteres')
    .max(50, 'Código do cupom deve ter no máximo 50 caracteres')
    .toUpperCase(),
})

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, 'Código deve ter no mínimo 3 caracteres')
    .max(50, 'Código deve ter no máximo 50 caracteres')
    .toUpperCase(),
  description: z
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional()
    .nullable(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z
    .number()
    .positive('Valor do desconto deve ser maior que zero'),
  maxUses: z
    .number()
    .int()
    .positive()
    .optional()
    .nullable(),
  startsAt: z.string().datetime('Data inválida'),
  expiresAt: z.string().datetime('Data inválida'),
})

export type CreateCouponInput = z.infer<typeof createCouponSchema>
