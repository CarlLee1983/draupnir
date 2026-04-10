// src/Modules/Auth/Presentation/Requests/RefreshTokenRequest.ts
import { FormRequest, z } from '@gravito/impulse'

/**
 * Validates and parses the request body for token refresh operations.
 */
export class RefreshTokenRequest extends FormRequest {
  /**
   * Zod validation schema for the refresh token request.
   */
  schema = z.object({
    /** The current refresh token (required). */
    refreshToken: z.string().min(1, 'Refresh Token 不能為空'),
  })
}

/** Type definition for the validated refresh token parameters. */
export type RefreshTokenParams = z.infer<RefreshTokenRequest['schema']>
