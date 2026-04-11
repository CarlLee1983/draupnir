import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/ILLMGatewayClient'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { IUsageRepository } from '../../Application/Ports/IUsageRepository'
import type { ISyncCursorRepository } from '../../Application/Ports/ISyncCursorRepository'

export interface SyncResult {
  readonly synced: number
  readonly quarantined: number
}

export class BifrostSyncService {
  constructor(
    private readonly gatewayClient: ILLMGatewayClient,
    private readonly usageRepo: IUsageRepository,
    private readonly cursorRepo: ISyncCursorRepository,
    private readonly apiKeyRepo: IApiKeyRepository,
    private readonly db: IDatabaseAccess,
  ) {}

  async sync(): Promise<SyncResult> {
    try {
      const cursor = await this.cursorRepo.get('bifrost_logs')
      const since = cursor?.lastSyncedAt ?? new Date(0).toISOString()
      const logs = await this.gatewayClient.getUsageLogs([], { startTime: since, limit: 500 })

      let synced = 0
      let quarantined = 0
      let lastProcessedLogId: string | undefined

      for (const log of logs) {
        const bifrostLogId = log.logId ?? `${log.timestamp}:${log.keyId}`
        lastProcessedLogId = bifrostLogId

        const apiKey = await this.apiKeyRepo.findByBifrostVirtualKeyId(log.keyId)
        if (!apiKey) {
          await this.quarantineLog(log, 'virtual_key_not_found')
          quarantined++
          continue
        }

        await this.usageRepo.upsert({
          id: crypto.randomUUID(),
          bifrostLogId,
          apiKeyId: apiKey.id,
          orgId: apiKey.orgId,
          model: log.model,
          provider: log.provider,
          inputTokens: log.inputTokens,
          outputTokens: log.outputTokens,
          creditCost: String(log.cost),
          latencyMs: log.latencyMs,
          status: log.status,
          occurredAt: log.timestamp,
          createdAt: new Date().toISOString(),
        })
        synced++
      }

      await this.cursorRepo.advance('bifrost_logs', {
        lastSyncedAt: new Date().toISOString(),
        lastBifrostLogId: lastProcessedLogId ?? cursor?.lastBifrostLogId ?? undefined,
      })

      return { synced, quarantined }
    } catch (error: unknown) {
      console.error('[BifrostSyncService] Sync failed:', error)
      return { synced: 0, quarantined: 0 }
    }
  }

  private async quarantineLog(
    log: {
      readonly logId?: string
      readonly timestamp: string
      readonly keyId: string
      readonly model: string
      readonly provider: string
      readonly inputTokens: number
      readonly outputTokens: number
      readonly totalTokens: number
      readonly latencyMs: number
      readonly cost: number
      readonly status: 'success' | 'error'
    },
    reason: string,
  ): Promise<void> {
    try {
      await this.db.table('quarantined_logs').insert({
        id: crypto.randomUUID(),
        bifrost_log_id: log.logId ?? `${log.timestamp}:${log.keyId}`,
        reason,
        raw_data: JSON.stringify(log),
        created_at: new Date().toISOString(),
      })
    } catch {
      // Quarantine failure must never crash the sync.
    }
  }
}
