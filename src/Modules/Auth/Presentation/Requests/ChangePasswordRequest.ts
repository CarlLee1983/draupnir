import { FormRequest, z } from '@gravito/impulse'

const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')

/**
 * Validates POST body for authenticated password change (manager portal).
 */
export class ChangePasswordRequest extends FormRequest {
  schema = z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      password: passwordField,
      passwordConfirmation: z.string().min(1, 'Password confirmation is required'),
    })
    .refine((data) => data.password === data.passwordConfirmation, {
      message: 'Passwords do not match',
      path: ['passwordConfirmation'],
    })
}

export type ChangePasswordParams = z.infer<ChangePasswordRequest['schema']>
