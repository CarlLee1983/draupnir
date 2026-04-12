import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ApiKeyRepository } from '@/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import type { LogEntry } from '@/Foundation/Infrastructure/Services/LLMGateway/types'
import type { IUsageRepository } from '../Application/Ports/IUsageRepository'
import type { ISyncCursorRepository } from '../Application/Ports/ISyncCursorRepository'
import { BifrostSyncService } from '../Infrastructure/Services/BifrostSyncService'

const hashingService = new KeyHashingService()

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
    queryDailyCostByOrg: async () => [],
    queryDailyCostByKeys: async () => [],
    queryModelBreakdown: async () => [],
    queryModelBreakdownByKeys: async () => [],
    queryStatsByOrg: async () => ({ totalRequests: 0, totalCost: 0, totalTokens: 0, avgLatency: 0 }),
    queryStatsByKey: async () => ({ totalRequests: 0, totalCost: 0, totalTokens: 0, avgLatency: 0 }),
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
      advance: async (_: string, update: { readonly lastSyncedAt: string; readonly lastBifrostLogId?: string }) => {
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
    const firstCursor = getCursorState()?.lastSyncedAt
    gateway.seedUsageLogs([])
    await service.sync()
    expect(gateway.calls.getUsageLogs[0]?.query?.startTime).toBe(new Date(0).toISOString())
    expect(gateway.calls.getUsageLogs[1]?.query?.startTime).toBe(firstCursor)
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

    service = new BifrostSyncService(new ThrowingGateway(), usageRepo, cursorRepo, apiKeyRepo, db)
    await expect(service.sync()).resolves.toEqual({ synced: 0, quarantined: 0, affectedOrgIds: [] })
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
    gateway.seedUsageLogs([])
    await service.sync()
    expect(gateway.calls.getUsageLogs[1]?.query?.startTime).toBe(getCursorState()?.lastSyncedAt)
  })

  it('returns { synced: 0, quarantined: 0 } when sync body exceeds 30 seconds', async () => {
    vi.useFakeTimers()

    try {
      class SlowGateway extends MockGatewayClient {
        override async getUsageLogs(): Promise<readonly LogEntry[]> {
          await new Promise<void>((resolve) => setTimeout(resolve, 60_000))
          return []
        }
      }

      service = new BifrostSyncService(new SlowGateway(), usageRepo, cursorRepo, apiKeyRepo, db)
      const syncPromise = service.sync()
      vi.advanceTimersByTime(30_001)

      await expect(syncPromise).resolves.toEqual({ synced: 0, quarantined: 0, affectedOrgIds: [] })
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not advance cursor when sync times out', async () => {
    vi.useFakeTimers()

    try {
      class SlowGateway extends MockGatewayClient {
        override async getUsageLogs(): Promise<readonly LogEntry[]> {
          await new Promise<void>((resolve) => setTimeout(resolve, 60_000))
          return []
        }
      }

      service = new BifrostSyncService(new SlowGateway(), usageRepo, cursorRepo, apiKeyRepo, db)
      const syncPromise = service.sync()
      vi.advanceTimersByTime(30_001)

      await expect(syncPromise).resolves.toEqual({ synced: 0, quarantined: 0, affectedOrgIds: [] })
      expect(getCursorState()).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })
})
