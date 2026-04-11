// src/Modules/Auth/Presentation/Requests/RegisterRequest.ts
import { FormRequest, z } from '@gravito/impulse'

/**
 * Validates and parses the request body for user registration.
 */
export class RegisterRequest extends FormRequest {
  /**
   * Zod validation schema for the registration request.
   * Includes password strength rules and matching confirmation check.
   */
  schema = z
    .object({
      /** User's email address (must be valid format). */
      email: z.string().email('Invalid email address'),
      /** User's chosen password (min 8 chars, mixed case, and digits). */
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain an uppercase letter')
        .regex(/[a-z]/, 'Password must contain a lowercase letter')
        .regex(/[0-9]/, 'Password must contain a number'),
      /** Optional password confirmation for initial validation. */
      confirmPassword: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.confirmPassword && data.password !== data.confirmPassword) return false
        return true
      },
      { message: 'Passwords do not match', path: ['confirmPassword'] },
    )
}

/** Type definition for the validated registration parameters. */
export type RegisterParams = z.infer<RegisterRequest['schema']>
