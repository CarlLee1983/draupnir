// src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway'

/**
 * 餘額耗盡阻擋服務 — 補償式狀態轉換
 *
 * 策略：先持久化本地意圖（PENDING_SUSPEND），再操作遠端（Gateway），
 * 最後確認本地狀態（SUSPENDED_NO_CREDIT）。
 * 若遠端失敗，本地保持 PENDING_SUSPEND，由排程重試。
 * 若本地確認失敗，遠端已阻擋但本地可由重試修復。
 */
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
        // Step 1: 本地先標記為 PENDING_SUSPEND + 快照 rate limit
        const currentRateLimit = {
          rpm: key.scope.getRateLimitRpm(),
          tpm: key.scope.getRateLimitTpm(),
        }
        const pendingSuspend = key.suspend('CREDIT_DEPLETED', currentRateLimit)
        await this.apiKeyRepo.update(pendingSuspend)

        // Step 2: 遠端 Gateway 阻擋
        await this.gatewayClient.updateKey(key.bifrostVirtualKeyId, {
          rateLimit: {
            tokenMaxLimit: 0,
            tokenResetDuration: '1h',
            requestMaxLimit: 0,
            requestResetDuration: '1h',
          },
        })

        // Step 3: 本地確認完成（狀態已在 step 1 設好，此處可加 confirmed_at）
        processed++
      } catch (error: unknown) {
        if (error instanceof GatewayError && error.retryable) {
          console.log(`Key ${key.id} 暫時性錯誤，將由排程重試:`, error.message)
        } else if (error instanceof GatewayError && !error.retryable) {
          console.error(`Key ${key.id} 永久性錯誤 (${error.code})，不應重試:`, error.message)
        } else {
          console.error(`Key ${key.id} 未知錯誤:`, error)
        }
        failed++
      }
    }

    return { processed, failed }
  }

  /**
   * 重試失敗的阻擋（由排程呼叫）
   * 查找 SUSPENDED_NO_CREDIT 但可能未同步到 Gateway 的 key
   */
  async retryPending(orgId: string): Promise<void> {
    const suspendedKeys = await this.apiKeyRepo.findSuspendedByOrgId(orgId, 'CREDIT_DEPLETED')
    for (const key of suspendedKeys) {
      try {
        await this.gatewayClient.updateKey(key.bifrostVirtualKeyId, {
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
          console.error(`Key ${key.id} 永久性錯誤，不再重試 (${error.code}):`, error.message)
        } else {
          console.error(`Key ${key.id} 未知錯誤，停止此 key 重試:`, error)
        }
      }
    }
  }
}
