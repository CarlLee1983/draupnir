// src/Modules/Profile/Presentation/Requests/ListUsersRequest.ts
import { FormRequest, z } from '@gravito/impulse'

/**
 * Validation schema and request handler for listing users.
 */
export class ListUsersRequest extends FormRequest {
  /** Source of the data is the query string. */
  source = 'query' as const

  /** Validation schema. */
  schema = z.object({
    role: z.string().optional(),
    status: z.enum(['active', 'suspended']).optional(),
    keyword: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
}

/**
 * Type inferred from the ListUsersRequest schema.
 */
export type ListUsersQueryParams = z.infer<ListUsersRequest['schema']>

