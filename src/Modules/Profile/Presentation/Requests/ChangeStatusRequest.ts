// src/Modules/Profile/Presentation/Requests/ChangeStatusRequest.ts
import { FormRequest, z } from '@gravito/impulse'

/**
 * Validation schema and request handler for changing a user's status.
 */
export class ChangeStatusRequest extends FormRequest {
  /** Validation schema. */
  schema = z.object({
    status: z.enum(['active', 'suspended'], {
      errorMap: () => ({ message: 'Invalid status value' }),
    }),
  })
}

/**
 * Type inferred from the ChangeStatusRequest schema.
 */
export type ChangeStatusParams = z.infer<ChangeStatusRequest['schema']>
