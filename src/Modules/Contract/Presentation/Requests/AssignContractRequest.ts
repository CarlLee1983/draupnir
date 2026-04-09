// src/Modules/Contract/Presentation/Requests/AssignContractRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class AssignContractRequest extends FormRequest {
  schema = z.object({
    targetType: z.enum(['organization', 'user']),
    targetId: z.string().min(1, '目標 ID 為必填'),
  })
}

export type AssignContractParams = z.infer<AssignContractRequest['schema']>
