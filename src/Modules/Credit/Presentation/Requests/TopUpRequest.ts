// src/Modules/Credit/Presentation/Requests/TopUpRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class TopUpRequest extends FormRequest {
  schema = z.object({
    amount: z.string().refine(
      (val) => {
        const n = parseFloat(val)
        return !isNaN(n) && n > 0
      },
      { message: '金額必須為正數' },
    ),
    description: z.string().optional(),
  })
}

export type TopUpParams = z.infer<TopUpRequest['schema']>
