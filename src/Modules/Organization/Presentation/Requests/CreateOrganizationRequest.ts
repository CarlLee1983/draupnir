// src/Modules/Organization/Presentation/Requests/CreateOrganizationRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class CreateOrganizationRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(255).optional(),
    slug: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
  })
}

export type CreateOrganizationParams = z.infer<CreateOrganizationRequest['schema']>
