// src/Modules/Credit/Presentation/Validators/credit.validator.ts
import { z } from 'zod'

export const TopUpSchema = z.object({
  amount: z.string().refine(
    (val) => { const n = parseFloat(val); return !isNaN(n) && n > 0 },
    { message: '金額必須為正數' },
  ),
  description: z.string().optional(),
})

export const AdjustmentSchema = z.object({
  amount: z.string().refine(
    (val) => { const n = parseFloat(val); return !isNaN(n) && n !== 0 },
    { message: '調整金額不能為零' },
  ),
  description: z.string().min(1, '調整原因為必填'),
})

export type TopUpParams = z.infer<typeof TopUpSchema>
export type AdjustmentParams = z.infer<typeof AdjustmentSchema>
