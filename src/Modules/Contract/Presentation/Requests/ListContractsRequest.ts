// src/Modules/Contract/Presentation/Requests/ListContractsRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class ListContractsRequest extends FormRequest {
  source = 'query' as const
  schema = z.object({
    targetId: z.string().min(1, '目標 ID 為必填'),
  })
}

export type ListContractsQueryParams = z.infer<ListContractsRequest['schema']>
