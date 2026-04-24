import { beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import type { LogEntry } from '@/Foundation/Infrastructure/Services/LLMGateway/types'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import { ApiKeyRepository } from '@/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import type { ISyncCursorRepository } from '../Application/Ports/ISyncCursorRepository'
import type { IUsageRepository } from '../Application/Ports/IUsageRepository'
import { BifrostSyncService } from '../Infrastructure/Services/BifrostSyncService'

const hashingService = new KeyHashingService()
type SetTimeoutCallback = Parameters<typeof setTimeout>[0]

function makeUsageRepo(db: MemoryDatabaseAccess): IUsageRepository {
  return {
    upsert: async (record) => {
      await db.table('usage_records').insert({
        id: record.id,
        bifrost_log_id: record.bifrostLogId,
        api_key_id: record.apiKeyId,
        org_id: record.orgId,
        model: record.model,
        provider: record.provider,
        input_tokens: record.inputTokens,
        output_tokens: record.outputTokens,
        credit_cost: record.creditCost,
        latency_ms: record.latencyMs,
        status: record.status,
        occurred_at: record.occurredAt,
        created_at: record.createdAt,
      })
    },
    queryDailyCostPlatform: async () => [],
    queryDailyCostByOrg: async () => [],
    queryDailyCostByKeys: async () => [],
    queryModelBreakdown: async () => [],
    queryModelBreakdownByKeys: async () => [],
    queryStatsByOrg: async () => ({
      totalRequests: 0,
      totalCost: 0,
      totalTokens: 0,
      avgLatency: 0,
    }),
    queryStatsByKey: async () => ({
      totalRequests: 0,
      totalCost: 0,
      totalTokens: 0,
      avgLatency: 0,
    }),
    queryPerKeyCost: async () => [],
    queryPerKeyCostByKeys: async () => [],
  }
}

function makeCursorRepo(): {
  repo: ISyncCursorRepository
  getState: () => { lastSyncedAt: string; lastBifrostLogId?: string } | null
} {
  let stored: { lastSyncedAt: string; lastBifrostLogId?: string } | null = null
  return {
    getState: () => stored,
    repo: {
      get: async (cursorType: string) =>
        stored
          ? {
              cursorType,
              lastSyncedAt: stored.lastSyncedAt,
              lastBifrostLogId: stored.lastBifrostLogId ?? null,
            }
          : null,
      advance: async (
        _: string,
        update: { readonly lastSyncedAt: string; readonly lastBifrostLogId?: string },
      ) => {
        stored = update
      },
    },
  }
}

describe('BifrostSyncService', () => {
  let db: MemoryDatabaseAccess
  let apiKeyRepo: ApiKeyRepository
  let cursorRepo: ISyncCursorRepository
  let getCursorState: () => { lastSyncedAt: string; lastBifrostLogId?: string } | null
  let gateway: MockGatewayClient
  let usageRepo: IUsageRepository
  let service: BifrostSyncService

  beforeEach(() => {
    db = new MemoryDatabaseAccess()
    apiKeyRepo = new ApiKeyRepository(db)
    const cursorStub = makeCursorRepo()
    cursorRepo = cursorStub.repo
    getCursorState = cursorStub.getState
    gateway = new MockGatewayClient()
    usageRepo = makeUsageRepo(db)
    service = new BifrostSyncService(gateway, usageRepo, cursorRepo, apiKeyRepo, db)
  })

  async function seedApiKey(id: string, gatewayKeyId: string, orgId = 'org-1'): Promise<void> {
    const keyHash = await hashingService.hash(`raw-${id}`)
    const key = ApiKey.create({
      id,
      orgId,
      createdByUserId: 'user-1',
      label: id,
      gatewayKeyId,
      keyHash,
    })
    await apiKeyRepo.save(key.activate())
  }

  function makeLog(index: number, keyId = 'bfr-vk-1'): LogEntry {
    return {
      logId: `log-${index}`,
      timestamp: new Date(Date.UTC(2026, 3, 9, 0, 0, index)).toISOString(),
      keyId,
      model: 'gpt-4',
      provider: 'openai',
      inputTokens: 10 + index,
      outputTokens: 5 + index,
      totalTokens: 15 + index * 2,
      latencyMs: 200 + index,
      cost: 0.01 + index * 0.0001,
      status: 'success',
    }
  }

  it('syncs matching logs and writes usage rows', async () => {
    await seedApiKey('key-1', 'bfr-vk-1')
    await seedApiKey('key-2', 'bfr-vk-2')
    const logs: readonly LogEntry[] = [
      {
        logId: 'log-1',
        timestamp: '2026-04-10T10:00:00Z',
        keyId: 'bfr-vk-1',
        model: 'gpt-4',
        provider: 'openai',
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        latencyMs: 200,
        cost: 0.03,
        status: 'success',
      },
      {
        logId: 'log-2',
        timestamp: '2026-04-10T11:00:00Z',
        keyId: 'bfr-vk-2',
        model: 'gpt-4o',
        provider: 'anthropic',
        inputTokens: 20,
        outputTokens: 10,
        totalTokens: 30,
        latencyMs: 250,
        cost: 0.07,
        status: 'success',
      },
    ]
    gateway.seedUsageLogs(logs)

    const result = await service.sync()
    expect(result).toEqual({ synced: 2, quarantined: 0, affectedOrgIds: ['org-1'] })
    expect(await db.table('usage_records').count()).toBe(2)
    expect(gateway.calls.getUsageLogs[0]?.keyIds).toEqual([])
  })

  it('quarantines logs whose virtual key cannot be resolved', async () => {
    gateway.seedUsageLogs([
      {
        logId: 'log-missing',
        timestamp: '2026-04-10T10:00:00Z',
        keyId: 'unknown-vk',
        model: 'gpt-4',
        provider: 'openai',
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        latencyMs: 200,
        cost: 0.03,
        status: 'success',
      },
    ])

    const result = await service.sync()
    expect(result).toEqual({ synced: 0, quarantined: 1, affectedOrgIds: [] })
    expect(await db.table('usage_records').count()).toBe(0)
    expect(await db.table('quarantined_logs').count()).toBe(1)
  })

  it('uses the epoch cursor on cold start', async () => {
    gateway.seedUsageLogs([])
    await service.sync()
    expect(gateway.calls.getUsageLogs[0]?.query?.startTime).toBe(new Date(0).toISOString())
  })

  it('advances the cursor and uses it for the next sync', async () => {
    await seedApiKey('key-1', 'bfr-vk-1')
    gateway.seedUsageLogs([
      {
        logId: 'log-1',
        timestamp: '2026-04-10T10:00:00Z',
        keyId: 'bfr-vk-1',
        model: 'gpt-4',
        provider: 'openai',
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        latencyMs: 200,
        cost: 0.03,
        status: 'success',
      },
    ])

    await service.sync()
    const firstCursorAdvance = getCursorState()?.lastSyncedAt
    gateway.seedUsageLogs([])
    await service.sync()
    expect(gateway.calls.getUsageLogs[0]?.query?.startTime).toBe(new Date(0).toISOString())
    expect(gateway.calls.getUsageLogs[0]?.query?.endTime).toBe(firstCursorAdvance)
    expect(gateway.calls.getUsageLogs[1]?.query?.startTime).toBe(firstCursorAdvance)
  })

  it('uses logId as bifrost_log_id when present', async () => {
    await seedApiKey('key-1', 'bfr-vk-1')
    gateway.seedUsageLogs([
      {
        logId: 'log-abc',
        timestamp: '2026-04-10T10:00:00Z',
        keyId: 'bfr-vk-1',
        model: 'gpt-4',
        provider: 'openai',
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        latencyMs: 200,
        cost: 0.03,
        status: 'success',
      },
    ])

    await service.sync()
    const row = await db.table('usage_records').first()
    expect(row?.bifrost_log_id).toBe('log-abc')
  })

  it('falls back to timestamp+keyId when logId is absent', async () => {
    await seedApiKey('key-1', 'bfr-vk-1')
    gateway.seedUsageLogs([
      {
        timestamp: '2026-04-10T10:00:00Z',
        keyId: 'bfr-vk-1',
        model: 'gpt-4',
        provider: 'openai',
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        latencyMs: 200,
        cost: 0.03,
        status: 'success',
      },
    ])

    await service.sync()
    const row = await db.table('usage_records').first()
    expect(row?.bifrost_log_id).toBe('2026-04-10T10:00:00Z:bfr-vk-1')
  })

  it('does not throw when the gateway fails', async () => {
    class ThrowingGateway extends MockGatewayClient {
      override async getUsageLogs(): Promise<readonly LogEntry[]> {
        throw new Error('boom')
      }
    }

    const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
    try {
      service = new BifrostSyncService(new ThrowingGateway(), usageRepo, cursorRepo, apiKeyRepo, db)
      const result = await service.sync()
      expect(result).toEqual({ synced: 0, quarantined: 0, affectedOrgIds: [] })
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it('advances cursor after successful sync batch', async () => {
    await seedApiKey('key-1', 'bfr-vk-1')
    gateway.seedUsageLogs([
      {
        logId: 'log-1',
        timestamp: '2026-04-10T10:00:00Z',
        keyId: 'bfr-vk-1',
        model: 'gpt-4',
        provider: 'openai',
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        latencyMs: 200,
        cost: 0.03,
        status: 'success',
      },
    ])

    await service.sync()
    const cursorAfterFirst = getCursorState()?.lastSyncedAt

    gateway.seedUsageLogs([])
    await service.sync()

    // The second call should use the cursor advanced by the first call
    expect(gateway.calls.getUsageLogs[1]?.query?.startTime).toBe(cursorAfterFirst)
  })

  it('supports backfill with explicit time range without advancing the incremental cursor', async () => {
    await seedApiKey('key-1', 'bfr-vk-1')
    gateway.seedUsageLogs([
      {
        logId: 'log-backfill-1',
        timestamp: '2026-04-09T10:00:00Z',
        keyId: 'bfr-vk-1',
        model: 'gpt-4',
        provider: 'openai',
        inputTokens: 12,
        outputTokens: 6,
        totalTokens: 18,
        latencyMs: 210,
        cost: 0.05,
        status: 'success',
      },
    ])

    const result = await service.backfill({
      startTime: '2026-04-09T00:00:00Z',
      endTime: '2026-04-09T23:59:59Z',
    })

    expect(result).toEqual({ synced: 1, quarantined: 0, affectedOrgIds: ['org-1'] })
    expect(gateway.calls.getUsageLogs[0]?.query).toEqual({
      startTime: '2026-04-09T00:00:00Z',
      endTime: '2026-04-09T23:59:59Z',
      limit: 500,
    })
    expect(getCursorState()).toBeNull()
  })

  it('paginates backfill when a single time window exceeds 500 logs', async () => {
    await seedApiKey('key-1', 'bfr-vk-1')
    gateway.seedUsageLogs(Array.from({ length: 501 }, (_, index) => makeLog(index + 1)))

    const result = await service.backfill({
      startTime: '2026-04-09T00:00:00Z',
      endTime: '2026-04-09T23:59:59Z',
    })

    expect(result).toEqual({ synced: 501, quarantined: 0, affectedOrgIds: ['org-1'] })
    expect(await db.table('usage_records').count()).toBe(501)
    expect(gateway.calls.getUsageLogs).toHaveLength(2)
    expect(gateway.calls.getUsageLogs[0]?.query).toEqual({
      startTime: '2026-04-09T00:00:00Z',
      endTime: '2026-04-09T23:59:59Z',
      limit: 500,
    })
    expect(gateway.calls.getUsageLogs[1]?.query).toEqual({
      startTime: '2026-04-09T00:00:00Z',
      endTime: '2026-04-09T23:59:59Z',
      limit: 500,
      offset: 500,
    })
    expect(getCursorState()).toBeNull()
  })

  it('paginates sync() and advances cursor to windowEndTime with last processed logId', async () => {
    await seedApiKey('key-1', 'bfr-vk-1')
    gateway.seedUsageLogs(Array.from({ length: 501 }, (_, index) => makeLog(index + 1)))

    const result = await service.sync()

    expect(result.synced).toBe(501)
    expect(result.quarantined).toBe(0)
    expect(await db.table('usage_records').count()).toBe(501)
    // Two pages: [0, 500) then [500, 501)
    expect(gateway.calls.getUsageLogs).toHaveLength(2)
    expect(gateway.calls.getUsageLogs[0]?.query?.offset).toBeUndefined()
    expect(gateway.calls.getUsageLogs[1]?.query?.offset).toBe(500)
    // Both pages must share the same windowEndTime snapshot
    const firstEnd = gateway.calls.getUsageLogs[0]?.query?.endTime
    expect(firstEnd).toBeTruthy()
    expect(gateway.calls.getUsageLogs[1]?.query?.endTime).toBe(firstEnd)
    // Cursor advances to windowEndTime and holds the last log's id across pages
    const cursor = getCursorState()
    expect(cursor?.lastSyncedAt).toBe(firstEnd)
    expect(cursor?.lastBifrostLogId).toBe('log-501')
  })

  it('issues exactly two gateway calls when a window holds exactly 500 logs', async () => {
    await seedApiKey('key-1', 'bfr-vk-1')
    gateway.seedUsageLogs(Array.from({ length: 500 }, (_, index) => makeLog(index + 1)))

    const result = await service.backfill({
      startTime: '2026-04-09T00:00:00Z',
      endTime: '2026-04-09T23:59:59Z',
    })

    expect(result).toEqual({ synced: 500, quarantined: 0, affectedOrgIds: ['org-1'] })
    expect(await db.table('usage_records').count()).toBe(500)
    // First page returns 500 (== LOG_PAGE_SIZE), so loop probes the next page;
    // second page returns 0 and the loop exits.
    expect(gateway.calls.getUsageLogs).toHaveLength(2)
    expect(gateway.calls.getUsageLogs[0]?.query?.offset).toBeUndefined()
    expect(gateway.calls.getUsageLogs[1]?.query?.offset).toBe(500)
  })

  it('accumulates synced and quarantined counts correctly across paginated pages', async () => {
    await seedApiKey('key-1', 'bfr-vk-1')
    // 501 logs: every 100th (indices 100, 200, 300, 400, 500) uses an unknown vk → 5 quarantined
    const logs: LogEntry[] = Array.from({ length: 501 }, (_, i) => {
      const idx = i + 1
      return idx % 100 === 0 ? makeLog(idx, 'unknown-vk') : makeLog(idx)
    })
    gateway.seedUsageLogs(logs)

    const result = await service.backfill({
      startTime: '2026-04-09T00:00:00Z',
      endTime: '2026-04-09T23:59:59Z',
    })

    expect(result.synced).toBe(496)
    expect(result.quarantined).toBe(5)
    expect(result.affectedOrgIds).toEqual(['org-1'])
    expect(await db.table('usage_records').count()).toBe(496)
    expect(await db.table('quarantined_logs').count()).toBe(5)
    // Must have paged — quarantined logs in page 1 should not prevent page 2 from being fetched
    expect(gateway.calls.getUsageLogs).toHaveLength(2)
  })

  it('returns { synced: 0, quarantined: 0 } when sync body exceeds 30 seconds', async () => {
    let timeoutCb: (() => void) | undefined
    const originalSetTimeout = globalThis.setTimeout
    const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
    const setTimeoutSpy = spyOn(globalThis, 'setTimeout').mockImplementation(((
      cb: SetTimeoutCallback,
      ms?: number,
    ) => {
      if (ms === 30000) {
        timeoutCb = typeof cb === 'function' ? cb : undefined
        return 123 as unknown as ReturnType<typeof setTimeout>
      }
      return originalSetTimeout(cb, ms)
    }) as typeof setTimeout)

    try {
      class HangingGateway extends MockGatewayClient {
        override async getUsageLogs(): Promise<readonly LogEntry[]> {
          return new Promise(() => {}) // Never resolves
        }
      }
      service = new BifrostSyncService(new HangingGateway(), usageRepo, cursorRepo, apiKeyRepo, db)
      const syncPromise = service.sync()

      // Give syncInternal a tiny bit to start
      await new Promise((r) => originalSetTimeout(r, 0))

      if (timeoutCb) timeoutCb()

      const result = await syncPromise
      expect(result).toEqual({ synced: 0, quarantined: 0, affectedOrgIds: [] })
    } finally {
      consoleSpy.mockRestore()
      setTimeoutSpy.mockRestore()
    }
  })

  it('does not advance cursor when sync times out', async () => {
    let timeoutCb: (() => void) | undefined
    const originalSetTimeout = globalThis.setTimeout
    const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})
    const setTimeoutSpy = spyOn(globalThis, 'setTimeout').mockImplementation(((
      cb: SetTimeoutCallback,
      ms?: number,
    ) => {
      if (ms === 30000) {
        timeoutCb = typeof cb === 'function' ? cb : undefined
        return 123 as unknown as ReturnType<typeof setTimeout>
      }
      return originalSetTimeout(cb, ms)
    }) as typeof setTimeout)

    try {
      class HangingGateway extends MockGatewayClient {
        override async getUsageLogs(): Promise<readonly LogEntry[]> {
          return new Promise(() => {}) // Never resolves
        }
      }
      service = new BifrostSyncService(new HangingGateway(), usageRepo, cursorRepo, apiKeyRepo, db)
      const syncPromise = service.sync()

      await new Promise((r) => originalSetTimeout(r, 0))
      if (timeoutCb) timeoutCb()

      await syncPromise
      expect(getCursorState()).toBeNull()
    } finally {
      consoleSpy.mockRestore()
      setTimeoutSpy.mockRestore()
    }
  })
})
