// src/Modules/Auth/Presentation/Requests/ForgotPasswordRequest.ts
import { FormRequest, z } from '@gravito/impulse'

/**
 * Validates and parses the request body for forgot-password submissions.
 */
export class ForgotPasswordRequest extends FormRequest {
  /**
   * Zod validation schema for the forgot-password request.
   */
  schema = z.object({
    /** User's registered email address. */
    email: z.string().email('Invalid email address'),
  })
}

/** Type definition for the validated forgot-password parameters. */
export type ForgotPasswordParams = z.infer<ForgotPasswordRequest['schema']>
