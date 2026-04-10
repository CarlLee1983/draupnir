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
      email: z.string().email('電子郵件格式無效'),
      /** User's chosen password (min 8 chars, mixed case, and digits). */
      password: z
        .string()
        .min(8, '密碼至少需要 8 個字符')
        .regex(/[A-Z]/, '密碼必須包含至少一個大寫字母')
        .regex(/[a-z]/, '密碼必須包含至少一個小寫字母')
        .regex(/[0-9]/, '密碼必須包含至少一個數字'),
      /** Optional password confirmation for initial validation. */
      confirmPassword: z.string().optional(),
    })
    .refine(
      (data) => {
        if (data.confirmPassword && data.password !== data.confirmPassword) return false
        return true
      },
      { message: '密碼不匹配', path: ['confirmPassword'] },
    )
}

/** Type definition for the validated registration parameters. */
export type RegisterParams = z.infer<RegisterRequest['schema']>
