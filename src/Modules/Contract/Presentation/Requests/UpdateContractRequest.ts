// src/Modules/Contract/Presentation/Requests/UpdateContractRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class UpdateContractRequest extends FormRequest {
  schema = z.object({
    terms: z.object({
      creditQuota: z.number().min(0),
      allowedModules: z.array(z.string()),
      rateLimit: z.object({
        rpm: z.number().int().min(0),
        tpm: z.number().int().min(0),
      }),
      validityPeriod: z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      }),
    }),
  })
}

export type UpdateContractParams = z.infer<UpdateContractRequest['schema']>
