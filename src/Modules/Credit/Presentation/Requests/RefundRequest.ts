// src/Modules/Credit/Presentation/Requests/RefundRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class RefundRequest extends FormRequest {
  schema = z.object({
    amount: z.string().refine(
      (val) => {
        const n = parseFloat(val)
        return !Number.isNaN(n) && n > 0
      },
      { message: 'Refund amount must be a positive number' },
    ),
    referenceType: z.string().min(1, 'Reference type is required'),
    referenceId: z.string().min(1, 'Reference ID is required'),
    description: z.string().optional(),
  })
}

export type RefundParams = z.infer<RefundRequest['schema']>
