// src/Modules/Contract/Presentation/Requests/RenewContractRequest.ts
import { FormRequest, z } from '@gravito/impulse'

/** Validates JSON body for renewal (new terms for the replacement contract). */
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
        startDate: z.string().min(1),
        endDate: z.string().min(1),
      }),
    }),
  })
}

/** Inferred validated payload for {@link RenewContractRequest}. */
export type RenewContractParams = z.infer<RenewContractRequest['schema']>
