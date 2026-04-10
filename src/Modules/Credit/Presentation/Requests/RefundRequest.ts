// src/Modules/Credit/Presentation/Requests/RefundRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class RefundRequest extends FormRequest {
  schema = z.object({
    amount: z.string().refine(
      (val) => {
        const n = parseFloat(val)
        return !isNaN(n) && n > 0
      },
      { message: '退款金額必須為正數' },
    ),
    referenceType: z.string().min(1, '參考類型為必填'),
    referenceId: z.string().min(1, '參考 ID 為必填'),
    description: z.string().optional(),
  })
}

export type RefundParams = z.infer<RefundRequest['schema']>
