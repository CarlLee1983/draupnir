// src/Modules/Organization/Presentation/Requests/ChangeOrgStatusRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class ChangeOrgStatusRequest extends FormRequest {
  schema = z.object({
    status: z.enum(['active', 'suspended'], { errorMap: () => ({ message: 'Invalid status value' }) }),
  })
}

export type ChangeOrgStatusParams = z.infer<ChangeOrgStatusRequest['schema']>
