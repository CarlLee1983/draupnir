// src/Modules/Organization/Presentation/Requests/AcceptInvitationRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class AcceptInvitationRequest extends FormRequest {
  schema = z.object({
    token: z.string().min(1, 'Token is required'),
  })
}

export type AcceptInvitationParams = z.infer<AcceptInvitationRequest['schema']>
