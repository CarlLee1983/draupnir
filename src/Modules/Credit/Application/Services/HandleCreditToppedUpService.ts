// src/Modules/Credit/Application/Services/HandleCreditToppedUpService.ts
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

/**
 * 充值恢復服務 — 補償式狀態轉換
 *
 * 策略：先操作遠端恢復（Bifrost），成功後再清除本地凍結狀態。
 * 若遠端失敗，本地保持 SUSPENDED_NO_CREDIT 不變，由重試修復。
 * 若本地清除失敗，遠端已恢復但本地可由重試修復。
 */
export class HandleCreditToppedUpService {
  constructor(
    private readonly apiKeyRepo: IApiKeyRepository,
    private readonly bifrostClient: BifrostClient,
  ) {}

  async execute(orgId: string): Promise<{ processed: number; failed: number }> {
    const suspendedKeys = await this.apiKeyRepo.findSuspendedByOrgId(orgId, 'CREDIT_DEPLETED')
    let processed = 0
    let failed = 0

    for (const key of suspendedKeys) {
      try {
        const preFreeze = key.preFreezeRateLimit

        // Step 1: 先恢復遠端 Bifrost rate limit
        if (preFreeze && (preFreeze.rpm != null || preFreeze.tpm != null)) {
          await this.bifrostClient.updateVirtualKey(key.bifrostVirtualKeyId, {
            rate_limit: {
              token_max_limit: preFreeze.tpm ?? 100000,
              token_reset_duration: '1h',
              request_max_limit: preFreeze.rpm ?? null,
              request_reset_duration: preFreeze.rpm ? '1m' : null,
            },
          })
        }

        // Step 2: 遠端成功後，清除本地凍結狀態
        const restored = key.unsuspend()
        await this.apiKeyRepo.update(restored)
        processed++
      } catch (error: unknown) {
        // 遠端失敗：本地保持 SUSPENDED_NO_CREDIT，不恢復
        // 排程重試會再次嘗試
        console.error(`Key ${key.id} 恢復失敗，將由排程重試:`, error)
        failed++
      }
    }

    return { processed, failed }
  }
}
