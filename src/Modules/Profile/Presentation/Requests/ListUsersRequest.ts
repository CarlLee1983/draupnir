// src/Modules/Profile/Presentation/Requests/ListUsersRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class ListUsersRequest extends FormRequest {
  source = 'query' as const

  schema = z.object({
    role: z.string().optional(),
    status: z.enum(['active', 'suspended']).optional(),
    keyword: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
}

export type ListUsersQueryParams = z.infer<ListUsersRequest['schema']>
