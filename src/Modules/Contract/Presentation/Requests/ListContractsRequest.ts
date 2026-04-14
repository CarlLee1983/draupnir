// src/Modules/Contract/Presentation/Requests/ListContractsRequest.ts
import { FormRequest, z } from '@gravito/impulse'

/** Validates query string for listing contracts by organization/target id. */
export class ListContractsRequest extends FormRequest {
  override source = 'query' as const
  override schema = z.object({
    targetId: z.string().min(1, 'Target ID is required'),
  })
}

/** Inferred validated query for {@link ListContractsRequest}. */
export type ListContractsQueryParams = z.infer<ListContractsRequest['schema']>
