import { afterAll, beforeAll, describe, expect, it, spyOn } from 'bun:test'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as config from '@/Shared/Infrastructure/Database/Adapters/Drizzle/config'
import { createDrizzleDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Drizzle/DrizzleDatabaseAdapter'
import * as schema from '@/Shared/Infrastructure/Database/schema'
import { AtlasUsageRepository } from '@/Modules/Dashboard/Infrastructure/Repositories/AtlasUsageRepository'

describe('AtlasUsageRepository - ByKeys variants (IN operator)', () => {
  let repo: AtlasUsageRepository
  let drizzleDb: any
  let configSpy: any

  beforeAll(async () => {
    const client = createClient({ url: 'file::memory:' })
    drizzleDb = drizzle(client, { schema })
    configSpy = spyOn(config, 'getDrizzleInstance').mockReturnValue(drizzleDb)

    await client.execute(`
      CREATE TABLE usage_records (
        id TEXT PRIMARY KEY,
        bifrost_log_id TEXT NOT NULL UNIQUE,
        api_key_id TEXT NOT NULL,
        org_id TEXT NOT NULL,
        model TEXT NOT NULL,
        provider TEXT,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        credit_cost REAL NOT NULL DEFAULT 0,
        latency_ms INTEGER,
        status TEXT,
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `)

    const db = createDrizzleDatabaseAccess()
    repo = new AtlasUsageRepository(db)

    await repo.upsert({ id: 'r1', bifrostLogId: 'l1', apiKeyId: 'key-a', orgId: 'org-1', model: 'gpt-4o', provider: 'openai', inputTokens: 10, outputTokens: 20, creditCost: 1.5, latencyMs: 100, status: 'success', occurredAt: '2026-04-11T10:00:00Z', createdAt: '2026-04-11T10:00:01Z' })
    await repo.upsert({ id: 'r2', bifrostLogId: 'l2', apiKeyId: 'key-b', orgId: 'org-1', model: 'claude-3', provider: 'anthropic', inputTokens: 30, outputTokens: 40, creditCost: 2.5, latencyMs: 200, status: 'success', occurredAt: '2026-04-11T11:00:00Z', createdAt: '2026-04-11T11:00:01Z' })
  })

  afterAll(() => {
    configSpy.mockRestore()
    config.resetDrizzleForTest()
  })

  const range = { startDate: '2026-04-11T00:00:00Z', endDate: '2026-04-12T00:00:00Z' }

  it('queryDailyCostByKeys - IN operator with BETWEEN', async () => {
    const result = await repo.queryDailyCostByKeys(['key-a', 'key-b'], range)
    expect(result).toHaveLength(1)
    expect(result[0].totalCost).toBe(4.0)
  })

  it('queryModelBreakdownByKeys - IN operator with BETWEEN', async () => {
    const result = await repo.queryModelBreakdownByKeys(['key-a', 'key-b'], range)
    expect(result.length).toBeGreaterThan(0)
  })

  it('queryPerKeyCostByKeys - IN operator with BETWEEN', async () => {
    const result = await repo.queryPerKeyCostByKeys(['key-a', 'key-b'], range)
    expect(result).toHaveLength(2)
    expect(result[0].totalCost).toBe(2.5) // key-b costs more
    expect(result[1].totalCost).toBe(1.5)
  })
})
