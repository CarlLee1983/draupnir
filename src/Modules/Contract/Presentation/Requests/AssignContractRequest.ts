// src/Modules/Contract/Presentation/Requests/AssignContractRequest.ts
import { FormRequest, z } from '@gravito/impulse'

/** Validates JSON body for assigning a contract to another target. */
export class AssignContractRequest extends FormRequest {
  schema = z.object({
    targetType: z.enum(['organization', 'user']),
    targetId: z.string().min(1, '目標 ID 為必填'),
  })
}

/** Inferred validated payload for {@link AssignContractRequest}. */
export type AssignContractParams = z.infer<AssignContractRequest['schema']>
