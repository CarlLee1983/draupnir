// src/Modules/Auth/Presentation/Requests/LoginRequest.ts
import { FormRequest, z } from '@gravito/impulse'

/**
 * Validates and parses the request body for user login.
 */
export class LoginRequest extends FormRequest {
  /**
   * Zod validation schema for the login request.
   */
  schema = z.object({
    /** User's registered email address. */
    email: z.string().email('Invalid email address'),
    /** User's plain-text password. */
    password: z.string().min(1, 'Password is required'),
  })
}

/** Type definition for the validated login parameters. */
export type LoginParams = z.infer<LoginRequest['schema']>
