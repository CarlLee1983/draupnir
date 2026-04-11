// src/Modules/Organization/Presentation/Requests/InviteMemberRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class InviteMemberRequest extends FormRequest {
  schema = z.object({
    email: z.string().email('Invalid email address'),
    role: z.string().optional(),
  })
}

export type InviteMemberParams = z.infer<InviteMemberRequest['schema']>
