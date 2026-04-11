// src/Modules/Credit/Application/Services/HandleCreditToppedUpService.ts
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'

export class HandleCreditToppedUpService {
  constructor(
    private readonly apiKeyRepo: IApiKeyRepository,
    private readonly gatewayClient: ILLMGatewayClient,
  ) {}

  async execute(orgId: string): Promise<{ processed: number; failed: number }> {
    const suspendedKeys = await this.apiKeyRepo.findSuspendedByOrgId(orgId, 'CREDIT_DEPLETED')
    let processed = 0
    let failed = 0

    for (const key of suspendedKeys) {
      try {
        const preFreeze = key.preFreezeRateLimit

        if (preFreeze && (preFreeze.rpm != null || preFreeze.tpm != null)) {
          await this.gatewayClient.updateKey(key.gatewayKeyId, {
            rateLimit: {
              tokenMaxLimit: preFreeze.tpm ?? 100000,
              tokenResetDuration: '1h',
              ...(preFreeze.rpm != null && {
                requestMaxLimit: preFreeze.rpm,
                requestResetDuration: '1m',
              }),
            },
          })
        }

        const restored = key.unsuspend()
        await this.apiKeyRepo.update(restored)
        processed++
      } catch (error: unknown) {
        console.error(`Key ${key.id} restore failed, will be retried by the scheduler:`, error)
        failed++
      }
    }

    return { processed, failed }
  }
}
