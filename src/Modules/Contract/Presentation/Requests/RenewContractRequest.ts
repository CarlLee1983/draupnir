// src/Modules/Contract/Presentation/Requests/RenewContractRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class RenewContractRequest extends FormRequest {
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

export type RenewContractParams = z.infer<RenewContractRequest['schema']>
