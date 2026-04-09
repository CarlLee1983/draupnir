// src/Modules/Profile/Presentation/Requests/ChangeStatusRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class ChangeStatusRequest extends FormRequest {
  schema = z.object({
    status: z.enum(['active', 'suspended'], { errorMap: () => ({ message: '無效的狀態值' }) }),
  })
}

export type ChangeStatusParams = z.infer<ChangeStatusRequest['schema']>
