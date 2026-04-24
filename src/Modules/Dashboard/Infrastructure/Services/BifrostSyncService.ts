import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway/errors'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/ILLMGatewayClient'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ISyncCursorRepository } from '../../Application/Ports/ISyncCursorRepository'
import type { IUsageRepository } from '../../Application/Ports/IUsageRepository'
import { BifrostSyncCompletedEvent } from '../../Domain/Events/BifrostSyncCompletedEvent'

/**
 * Represents the results of a synchronization run.
 */
export interface SyncResult {
  /** Number of logs successfully synchronized and persisted. */
  readonly synced: number
  /** Number of logs that could not be matched to a local API key and were quarantined. */
  readonly quarantined: number
  /** List of organization IDs that had usage logs synced in this run. */
  readonly affectedOrgIds: readonly string[]
}

/**
 * Request payload for backfilling usage logs for a specific time range.
 */
export interface BackfillSyncRequest {
  /** ISO timestamp for the start of the backfill window. */
  readonly startTime: string
  /** ISO timestamp for the end of the backfill window. */
  readonly endTime: string
}

/**
 * Internal request for a specific synchronization run.
 */
interface SyncRunRequest {
  /** ISO timestamp to start fetching logs from. */
  readonly startTime: string
  /** Optional ISO timestamp to stop fetching logs at. */
  readonly endTime?: string
  /** Whether to update the persistent sync cursor after completion. */
  readonly advanceCursor: boolean
  /** The log ID from the previous cursor, used for deduplication if necessary. */
  readonly previousCursorLogId?: string
}

const LOG_PAGE_SIZE = 500
const MAX_SYNC_PAGES = 50

/**
 * Infrastructure service responsible for synchronizing usage logs from the Bifrost gateway.
 *
 * Responsibilities:
 * - Fetch usage logs from the LLM gateway (Bifrost) in paginated batches.
 * - Map gateway keys to local ApiKey aggregates.
 * - Persist normalized usage records in the local usage repository.
 * - Manage a persistent 'cursor' to track synchronization progress and avoid duplicates.
 * - Quarantine logs that cannot be mapped to a known organization.
 * - Dispatch domain events when synchronization completes for downstream processing (e.g., credit deduction).
 * - Enforce timeouts and handle network resilience.
 */
export class BifrostSyncService {
  /**
   * Initializes the service with required gateway clients and repositories.
   *
   * @param gatewayClient Client for interacting with the LLM gateway API.
   * @param usageRepo Repository for persisting normalized usage logs.
   * @param cursorRepo Repository for tracking the sync progress (last timestamp/ID).
   * @param apiKeyRepo Repository for resolving gateway key IDs to local aggregates.
   * @param db Database access for inserting quarantined logs.
   */
  constructor(
    private readonly gatewayClient: ILLMGatewayClient,
    private readonly usageRepo: IUsageRepository,
    private readonly cursorRepo: ISyncCursorRepository,
    private readonly apiKeyRepo: IApiKeyRepository,
    private readonly db: IDatabaseAccess,
  ) {}

  /**
   * Performs an incremental synchronization using the persisted cursor.
   *
   * @returns A promise resolving to the results of the sync run.
   */
  async sync(): Promise<SyncResult> {
    const cursor = await this.cursorRepo.get('bifrost_logs')
    return this.runWithTimeout(() =>
      this.syncInternal({
        startTime: cursor?.lastSyncedAt ?? new Date(0).toISOString(),
        advanceCursor: true,
        previousCursorLogId: cursor?.lastBifrostLogId ?? undefined,
      }),
    )
  }

  /**
   * Performs a one-off synchronization for a specific historical time range.
   * Does not advance the main synchronization cursor.
   *
   * @param request The time range to backfill.
   * @returns A promise resolving to the results of the backfill run.
   */
  async backfill(request: BackfillSyncRequest): Promise<SyncResult> {
    return this.runWithTimeout(() =>
      this.syncInternal({
        startTime: request.startTime,
        endTime: request.endTime,
        advanceCursor: false,
      }),
    )
  }

  /**
   * Wraps a sync task with a 30-second timeout and basic error logging.
   *
   * @param task The async sync function to execute.
   * @returns A promise resolving to the sync results or an empty result on failure.
   */
  private async runWithTimeout(task: () => Promise<SyncResult>): Promise<SyncResult> {
    const TIMEOUT_MS = 30_000
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('[BifrostSyncService] sync timed out after 30s'))
      }, TIMEOUT_MS)
    })

    try {
      return await Promise.race([task(), timeoutPromise])
    } catch (error: unknown) {
      if (!(error instanceof GatewayError && error.code === 'NETWORK')) {
        console.error('[BifrostSyncService] Sync failed:', error)
      }
      return { synced: 0, quarantined: 0, affectedOrgIds: [] }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }

  /**
   * Core logic for fetching, mapping, and persisting logs.
   *
   * @param request Parameters for the sync run (window, cursor behavior).
   * @returns A promise resolving to the sync results.
   */
  private async syncInternal(request: SyncRunRequest): Promise<SyncResult> {
    let synced = 0
    let quarantined = 0
    let lastProcessedLogId: string | undefined
    const affectedOrgIds = new Set<string>()
    const windowEndTime = request.endTime ?? new Date().toISOString()

    let offset = 0
    let pageCount = 0
    while (true) {
      if (pageCount >= MAX_SYNC_PAGES) {
        console.warn(
          `[BifrostSyncService] Reached MAX_SYNC_PAGES (${MAX_SYNC_PAGES}) for window ${request.startTime}..${windowEndTime}; aborting pagination to avoid runaway loop`,
        )
        break
      }

      const logs = await this.gatewayClient.getUsageLogs([], {
        startTime: request.startTime,
        endTime: windowEndTime,
        limit: LOG_PAGE_SIZE,
        ...(offset > 0 ? { offset } : {}),
      })

      if (logs.length === 0) {
        break
      }

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

      if (logs.length < LOG_PAGE_SIZE) {
        break
      }

      offset += logs.length
      pageCount++
    }

    if (request.advanceCursor) {
      await this.cursorRepo.advance('bifrost_logs', {
        lastSyncedAt: windowEndTime,
        lastBifrostLogId: lastProcessedLogId ?? request.previousCursorLogId,
      })
    }

    if (synced > 0) {
      await DomainEventDispatcher.getInstance().dispatch(
        new BifrostSyncCompletedEvent([...affectedOrgIds], {
          startTime: request.startTime,
          endTime: windowEndTime,
        }),
      )
    }

    return { synced, quarantined, affectedOrgIds: [...affectedOrgIds] }
  }

  /**
   * Persists a log that could not be processed into a separate table for manual inspection.
   *
   * @param log The raw log data from the gateway.
   * @param reason The reason why the log was quarantined.
   */
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
