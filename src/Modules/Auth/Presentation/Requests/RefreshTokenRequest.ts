// src/Modules/Auth/Presentation/Requests/RefreshTokenRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class RefreshTokenRequest extends FormRequest {
  schema = z.object({
    refreshToken: z.string().min(1, 'Refresh Token 不能為空'),
  })
}

export type RefreshTokenParams = z.infer<RefreshTokenRequest['schema']>
