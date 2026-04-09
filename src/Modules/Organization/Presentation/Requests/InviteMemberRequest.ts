// src/Modules/Organization/Presentation/Requests/InviteMemberRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class InviteMemberRequest extends FormRequest {
  schema = z.object({
    email: z.string().email('電子郵件格式無效'),
    role: z.string().optional(),
  })
}

export type InviteMemberParams = z.infer<InviteMemberRequest['schema']>
