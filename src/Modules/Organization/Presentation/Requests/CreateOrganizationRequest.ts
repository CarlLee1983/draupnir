// src/Modules/Organization/Presentation/Requests/CreateOrganizationRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class CreateOrganizationRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(1, '名稱不能為空').max(100),
    description: z.string().max(255).optional(),
    slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/).optional(),
    managerUserId: z.string().uuid('無效的用戶 ID'),
  })
}

export type CreateOrganizationParams = z.infer<CreateOrganizationRequest['schema']>
