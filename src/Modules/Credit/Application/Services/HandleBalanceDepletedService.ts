// src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

/**
 * 餘額耗盡阻擋服務 — 補償式狀態轉換
 *
 * 策略：先持久化本地意圖（PENDING_SUSPEND），再操作遠端（Bifrost），
 * 最後確認本地狀態（SUSPENDED_NO_CREDIT）。
 * 若遠端失敗，本地保持 PENDING_SUSPEND，由排程重試。
 * 若本地確認失敗，遠端已阻擋但本地可由重試修復。
 */
export class HandleBalanceDepletedService {
  constructor(
    private readonly apiKeyRepo: IApiKeyRepository,
    private readonly bifrostClient: BifrostClient,
  ) {}

  async execute(orgId: string): Promise<{ processed: number; failed: number }> {
    const activeKeys = await this.apiKeyRepo.findActiveByOrgId(orgId)
    let processed = 0
    let failed = 0

    for (const key of activeKeys) {
      try {
        // Step 1: 本地先標記為 PENDING_SUSPEND + 快照 rate limit
        const currentRateLimit = { rpm: key.scope.getRateLimitRpm(), tpm: key.scope.getRateLimitTpm() }
        const pendingSuspend = key.suspend('CREDIT_DEPLETED', currentRateLimit)
        await this.apiKeyRepo.update(pendingSuspend)

        // Step 2: 遠端 Bifrost 阻擋
        await this.bifrostClient.updateVirtualKey(key.bifrostVirtualKeyId, {
          rate_limit: {
            token_max_limit: 0,
            token_reset_duration: '1h',
            request_max_limit: 0,
            request_reset_duration: '1h',
          },
        })

        // Step 3: 本地確認完成（狀態已在 step 1 設好，此處可加 confirmed_at）
        processed++
      } catch (error: unknown) {
        // 遠端失敗：本地已標記 PENDING_SUSPEND，排程重試時會重新嘗試
        // 不 rollback 本地狀態 — 寧可本地多阻擋也不漏阻擋
        console.error(`Key ${key.id} 阻擋失敗，將由排程重試:`, error)
        failed++
      }
    }

    return { processed, failed }
  }

  /**
   * 重試失敗的阻擋（由排程呼叫）
   * 查找 SUSPENDED_NO_CREDIT 但可能未同步到 Bifrost 的 key
   */
  async retryPending(orgId: string): Promise<void> {
    const suspendedKeys = await this.apiKeyRepo.findSuspendedByOrgId(orgId, 'CREDIT_DEPLETED')
    for (const key of suspendedKeys) {
      try {
        await this.bifrostClient.updateVirtualKey(key.bifrostVirtualKeyId, {
          rate_limit: {
            token_max_limit: 0,
            token_reset_duration: '1h',
            request_max_limit: 0,
            request_reset_duration: '1h',
          },
        })
      } catch {
        // 下次重試
      }
    }
  }
}
