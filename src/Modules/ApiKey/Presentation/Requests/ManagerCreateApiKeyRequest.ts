import { FormRequest, z } from '@gravito/impulse'

/**
 * Validates POST body for Manager 「建立 API Key」（Inertia）。
 * 必須掛在路由上，否則 `ctx.get('validated')` 不會填入，建立流程會收到空的 label。
 */
export class ManagerCreateApiKeyRequest extends FormRequest {
  schema = z.object({
    label: z.string().min(1, 'Key label is required'),
    quotaAllocated: z.coerce.number().positive().optional(),
    budgetResetPeriod: z.enum(['7d', '30d']).optional(),
    assigneeUserId: z.union([z.string().min(1), z.null()]).optional(),
  })
}

export type ManagerCreateApiKeyParams = z.infer<ManagerCreateApiKeyRequest['schema']>
