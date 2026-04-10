import { z } from '@gravito/impulse'

/**
 * Schema for validating user ID parameters.
 */
export const UserIdSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
})

/**
 * Type inferred from the UserIdSchema.
 */
export type UserIdParams = z.infer<typeof UserIdSchema>

