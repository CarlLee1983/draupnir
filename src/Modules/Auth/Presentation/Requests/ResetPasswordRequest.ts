// src/Modules/Auth/Presentation/Requests/ResetPasswordRequest.ts
import { FormRequest, z } from '@gravito/impulse'

/**
 * Validates and parses the request body for password reset submissions.
 */
export class ResetPasswordRequest extends FormRequest {
  /**
   * Zod validation schema for the reset-password request.
   */
  schema = z.object({
    /** New password (minimum 8 characters). */
    password: z.string().min(8, 'Password must be at least 8 characters'),
    /** Optional password confirmation field. */
    passwordConfirmation: z.string().optional(),
  })
}

/** Type definition for the validated reset-password parameters. */
export type ResetPasswordParams = z.infer<ResetPasswordRequest['schema']>
