// src/Modules/Organization/Presentation/Requests/AcceptInvitationRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class AcceptInvitationRequest extends FormRequest {
  schema = z.object({
    token: z.string().min(1, 'Token 不能為空'),
  })
}

export type AcceptInvitationParams = z.infer<AcceptInvitationRequest['schema']>
