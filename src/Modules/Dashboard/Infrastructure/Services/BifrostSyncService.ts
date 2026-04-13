import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/ILLMGatewayClient'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ISyncCursorRepository } from '../../Application/Ports/ISyncCursorRepository'
import type { IUsageRepository } from '../../Application/Ports/IUsageRepository'
import { BifrostSyncCompletedEvent } from '../../Domain/Events/BifrostSyncCompletedEvent'

export interface SyncResult {
  readonly synced: number
  readonly quarantined: number
  readonly affectedOrgIds: readonly string[]
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
    const TIMEOUT_MS = 30_000
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('[BifrostSyncService] sync timed out after 30s'))
      }, TIMEOUT_MS)
    })

    try {
      return await Promise.race([this.syncInternal(), timeoutPromise])
    } catch (error: unknown) {
      console.error('[BifrostSyncService] Sync failed:', error)
      return { synced: 0, quarantined: 0, affectedOrgIds: [] }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }

  private async syncInternal(): Promise<SyncResult> {
    const cursor = await this.cursorRepo.get('bifrost_logs')
    const since = cursor?.lastSyncedAt ?? new Date(0).toISOString()
    const logs = await this.gatewayClient.getUsageLogs([], { startTime: since, limit: 500 })

    let synced = 0
    let quarantined = 0
    let lastProcessedLogId: string | undefined
    const affectedOrgIds = new Set<string>()

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
        creditCost: log.cost,
        latencyMs: log.latencyMs,
        status: log.status,
        occurredAt: log.timestamp,
        createdAt: new Date().toISOString(),
      })
      affectedOrgIds.add(apiKey.orgId)
      synced++
    }

    await this.cursorRepo.advance('bifrost_logs', {
      lastSyncedAt: new Date().toISOString(),
      lastBifrostLogId: lastProcessedLogId ?? cursor?.lastBifrostLogId ?? undefined,
    })

    if (synced > 0) {
      await DomainEventDispatcher.getInstance().dispatch(
        new BifrostSyncCompletedEvent([...affectedOrgIds]),
      )
    }

    return { synced, quarantined, affectedOrgIds: [...affectedOrgIds] }
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
