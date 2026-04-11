// src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway'

export class HandleBalanceDepletedService {
  constructor(
    private readonly apiKeyRepo: IApiKeyRepository,
    private readonly gatewayClient: ILLMGatewayClient,
  ) {}

  async execute(orgId: string): Promise<{ processed: number; failed: number }> {
    const activeKeys = await this.apiKeyRepo.findActiveByOrgId(orgId)
    let processed = 0
    let failed = 0

    for (const key of activeKeys) {
      try {
        const currentRateLimit = {
          rpm: key.scope.getRateLimitRpm(),
          tpm: key.scope.getRateLimitTpm(),
        }
        const pendingSuspend = key.suspend('CREDIT_DEPLETED', currentRateLimit)
        await this.apiKeyRepo.update(pendingSuspend)

        await this.gatewayClient.updateKey(key.gatewayKeyId, {
          rateLimit: {
            tokenMaxLimit: 0,
            tokenResetDuration: '1h',
            requestMaxLimit: 0,
            requestResetDuration: '1h',
          },
        })

        processed++
      } catch (error: unknown) {
        if (error instanceof GatewayError && error.retryable) {
          console.log(
            `Key ${key.id} temporary error, will be retried by the scheduler:`,
            error.message,
          )
        } else if (error instanceof GatewayError && !error.retryable) {
          console.error(
            `Key ${key.id} permanent error (${error.code}), should not retry:`,
            error.message,
          )
        } else {
          console.error(`Key ${key.id} unknown error:`, error)
        }
        failed++
      }
    }

    return { processed, failed }
  }

  async retryPending(orgId: string): Promise<void> {
    const suspendedKeys = await this.apiKeyRepo.findSuspendedByOrgId(orgId, 'CREDIT_DEPLETED')
    for (const key of suspendedKeys) {
      try {
        await this.gatewayClient.updateKey(key.gatewayKeyId, {
          rateLimit: {
            tokenMaxLimit: 0,
            tokenResetDuration: '1h',
            requestMaxLimit: 0,
            requestResetDuration: '1h',
          },
        })
      } catch (error: unknown) {
        if (error instanceof GatewayError && error.retryable) {
          continue
        } else if (error instanceof GatewayError && !error.retryable) {
          console.error(
            `Key ${key.id} permanent error, no more retries (${error.code}):`,
            error.message,
          )
        } else {
          console.error(`Key ${key.id} unknown error, stopping retries for this key:`, error)
        }
      }
    }
  }
}
