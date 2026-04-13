import { FormRequest, z } from '@gravito/impulse'

/**
 * Validation schema and request handler for updating a user profile.
 * Uses @gravito/impulse for validation.
 */
export class UpdateProfileRequest extends FormRequest {
  /**
   * The validation schema for the profile update request.
   */
  schema = z.object({
    displayName: z.string().min(1).max(50).optional(),
    avatarUrl: z.string().url().nullable().optional(),
    phone: z
      .string()
      .regex(/^\+?[0-9\s-]{7,15}$/)
      .nullable()
      .optional(),
    bio: z.string().max(255).nullable().optional(),
    timezone: z.string().optional(),
    locale: z.string().optional(),
    notificationPreferences: z.record(z.string(), z.any()).optional(),
  })
}

/**
 * Type inferred from the UpdateProfileRequest schema.
 */
export type UpdateProfileParams = z.infer<UpdateProfileRequest['schema']>
