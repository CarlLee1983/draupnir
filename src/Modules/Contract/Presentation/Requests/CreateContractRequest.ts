// src/Modules/Contract/Presentation/Requests/CreateContractRequest.ts
import { FormRequest, z } from '@gravito/impulse'

/** Validates JSON body for creating a contract (target + full terms). */
export class CreateContractRequest extends FormRequest {
  schema = z.object({
    targetType: z.enum(['organization', 'user']),
    targetId: z.string().min(1, '目標 ID 為必填'),
    terms: z.object({
      creditQuota: z.number().min(0),
      allowedModules: z.array(z.string()),
      rateLimit: z.object({
        rpm: z.number().int().min(0),
        tpm: z.number().int().min(0),
      }),
      validityPeriod: z.object({
        startDate: z.string().min(1),
        endDate: z.string().min(1),
      }),
    }),
  })
}

/** Inferred validated payload for {@link CreateContractRequest}. */
export type CreateContractParams = z.infer<CreateContractRequest['schema']>
