// src/Modules/Organization/Presentation/Requests/UpdateOrganizationRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class UpdateOrganizationRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(1, 'Name is required').max(100).optional(),
    description: z.string().max(255).optional(),
  })
}

export type UpdateOrganizationParams = z.infer<UpdateOrganizationRequest['schema']>
