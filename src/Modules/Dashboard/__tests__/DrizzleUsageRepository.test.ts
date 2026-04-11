import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import type { IDatabaseAccess, IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'
import { usageRecords } from '@/Shared/Infrastructure/Database/Adapters/Drizzle/schema'

let client: any
let testDb: any

vi.mock('@/Shared/Infrastructure/Database/Adapters/Drizzle/config', () => ({
  getDrizzleInstance: () => testDb,
}))

import { DrizzleUsageRepository } from '../Infrastructure/Repositories/DrizzleUsageRepository'
import type { UsageRecordInsert } from '../Application/Ports/IUsageRepository'

function createUsageRecordDbAccess(): IDatabaseAccess {
  const queryBuilder: IQueryBuilder = {
    where: () => queryBuilder,
    first: async () => null,
    select: async () => [],
    insert: async (data: Record<string, unknown>) => {
      await testDb.insert(usageRecords).values(data as never)
    },
    update: async () => {},
    delete: async () => {},
    limit: () => queryBuilder,
    offset: () => queryBuilder,
    orderBy: () => queryBuilder,
    whereBetween: () => queryBuilder,
    count: async () => 0,
  }

  return {
    table: () => queryBuilder,
    transaction: async <T>(fn: (tx: IDatabaseAccess) => Promise<T>) => fn(createUsageRecordDbAccess()),
  }
}

describe('DrizzleUsageRepository', () => {
  let repository: DrizzleUsageRepository
  let dbAccess: IDatabaseAccess

  beforeAll(async () => {
    client = createClient({ url: 'file::memory:?cache=shared' })
    testDb = drizzle(client)
    dbAccess = createUsageRecordDbAccess()

    await client.execute(`CREATE TABLE IF NOT EXISTS usage_records (
      id TEXT PRIMARY KEY,
      bifrost_log_id TEXT UNIQUE NOT NULL,
      api_key_id TEXT NOT NULL,
      org_id TEXT NOT NULL,
      model TEXT NOT NULL,
      provider TEXT,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      credit_cost TEXT NOT NULL DEFAULT '0',
      latency_ms INTEGER,
      status TEXT,
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`)
  })

  beforeEach(async () => {
    repository = new DrizzleUsageRepository(dbAccess)
    await client.execute('DELETE FROM usage_records')
  })

  async function seedRecord(overrides: Partial<UsageRecordInsert> = {}): Promise<void> {
    await repository.upsert({
      id: 'row-1',
      bifrostLogId: 'log-1',
      apiKeyId: 'key-1',
      orgId: 'org-1',
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 100,
      outputTokens: 25,
      creditCost: '1.25',
      latencyMs: 150,
      status: 'success',
      occurredAt: '2026-04-11T10:00:00Z',
      createdAt: '2026-04-11T10:00:01Z',
      ...overrides,
    })
  }

  it('upsert writes a row and duplicate bifrostLogId does not throw', async () => {
    await expect(seedRecord()).resolves.toBeUndefined()
    await expect(
      repository.upsert({
        id: 'row-2',
        bifrostLogId: 'log-1',
        apiKeyId: 'key-1',
        orgId: 'org-1',
        model: 'gpt-4o',
        provider: 'openai',
        inputTokens: 100,
        outputTokens: 25,
        creditCost: '1.25',
        latencyMs: 150,
        status: 'success',
        occurredAt: '2026-04-11T10:00:00Z',
        createdAt: '2026-04-11T10:00:02Z',
      }),
    ).resolves.toBeUndefined()

    const rows = await testDb.select().from(usageRecords)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.bifrost_log_id).toBe('log-1')
  })

  it('returns an empty array when no usage rows exist', async () => {
    const result = await repository.queryDailyCostByOrg('org-1', {
      startDate: '2026-04-11T00:00:00Z',
      endDate: '2026-04-12T00:00:00Z',
    })

    expect(result).toEqual([])
  })

  it('aggregates same-day records into one daily bucket', async () => {
    await seedRecord()
    await repository.upsert({
      id: 'row-2',
      bifrostLogId: 'log-2',
      apiKeyId: 'key-1',
      orgId: 'org-1',
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 50,
      outputTokens: 10,
      creditCost: '2.75',
      latencyMs: 200,
      status: 'success',
      occurredAt: '2026-04-11T12:30:00Z',
      createdAt: '2026-04-11T12:30:01Z',
    })

    const result = await repository.queryDailyCostByOrg('org-1', {
      startDate: '2026-04-11T00:00:00Z',
      endDate: '2026-04-12T00:00:00Z',
    })

    expect(result).toEqual([
      {
        date: '2026-04-11',
        totalCost: 4,
        totalRequests: 2,
        totalInputTokens: 150,
        totalOutputTokens: 35,
      },
    ])
  })

  it('aggregates daily cost only for the selected API keys', async () => {
    await seedRecord({
      apiKeyId: 'key-1',
      creditCost: '1.50',
      inputTokens: 10,
      outputTokens: 20,
    })
    await repository.upsert({
      id: 'row-2',
      bifrostLogId: 'log-2',
      apiKeyId: 'key-2',
      orgId: 'org-1',
      model: 'claude-sonnet',
      provider: 'anthropic',
      inputTokens: 50,
      outputTokens: 10,
      creditCost: '2.75',
      latencyMs: 200,
      status: 'success',
      occurredAt: '2026-04-11T12:30:00Z',
      createdAt: '2026-04-11T12:30:01Z',
    })

    const result = await repository.queryDailyCostByKeys(['key-1'], {
      startDate: '2026-04-11T00:00:00Z',
      endDate: '2026-04-12T00:00:00Z',
    })

    expect(result).toEqual([
      {
        date: '2026-04-11',
        totalCost: 1.5,
        totalRequests: 1,
        totalInputTokens: 10,
        totalOutputTokens: 20,
      },
    ])
  })

  it('excludes rows outside the requested date range', async () => {
    await seedRecord({ occurredAt: '2026-04-10T23:59:59Z' })
    await repository.upsert({
      id: 'row-2',
      bifrostLogId: 'log-2',
      apiKeyId: 'key-1',
      orgId: 'org-1',
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 50,
      outputTokens: 10,
      creditCost: '2.75',
      latencyMs: 200,
      status: 'success',
      occurredAt: '2026-04-12T00:00:01Z',
      createdAt: '2026-04-12T00:00:02Z',
    })

    const result = await repository.queryDailyCostByOrg('org-1', {
      startDate: '2026-04-11T00:00:00Z',
      endDate: '2026-04-11T23:59:59Z',
    })

    expect(result).toEqual([])
  })

  it('groups model breakdown by model and sorts by cost descending', async () => {
    await repository.upsert({
      id: 'row-1',
      bifrostLogId: 'log-1',
      apiKeyId: 'key-1',
      orgId: 'org-1',
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 10,
      outputTokens: 20,
      creditCost: '1.00',
      latencyMs: 100,
      status: 'success',
      occurredAt: '2026-04-11T10:00:00Z',
      createdAt: '2026-04-11T10:00:01Z',
    })
    await repository.upsert({
      id: 'row-2',
      bifrostLogId: 'log-2',
      apiKeyId: 'key-1',
      orgId: 'org-1',
      model: 'claude-sonnet',
      provider: 'anthropic',
      inputTokens: 50,
      outputTokens: 25,
      creditCost: '3.25',
      latencyMs: 250,
      status: 'success',
      occurredAt: '2026-04-11T12:00:00Z',
      createdAt: '2026-04-11T12:00:01Z',
    })

    const result = await repository.queryModelBreakdown('org-1', {
      startDate: '2026-04-11T00:00:00Z',
      endDate: '2026-04-12T00:00:00Z',
    })

    expect(result).toEqual([
      {
        model: 'claude-sonnet',
        provider: 'anthropic',
        totalCost: 3.25,
        totalRequests: 1,
        avgLatencyMs: 250,
      },
      {
        model: 'gpt-4o',
        provider: 'openai',
        totalCost: 1,
        totalRequests: 1,
        avgLatencyMs: 100,
      },
    ])
  })

  it('limits model breakdown to the top 10 rows by cost', async () => {
    for (let index = 1; index <= 11; index += 1) {
      await repository.upsert({
        id: `row-${index}`,
        bifrostLogId: `log-${index}`,
        apiKeyId: `key-${index}`,
        orgId: 'org-1',
        model: `model-${index}`,
        provider: index % 2 === 0 ? 'openai' : 'anthropic',
        inputTokens: index * 10,
        outputTokens: index * 5,
        creditCost: String(index),
        latencyMs: 100 + index,
        status: 'success',
        occurredAt: '2026-04-11T10:00:00Z',
        createdAt: '2026-04-11T10:00:01Z',
      })
    }

    const result = await repository.queryModelBreakdownByKeys(
      Array.from({ length: 11 }, (_, index) => `key-${index + 1}`),
      {
        startDate: '2026-04-11T00:00:00Z',
        endDate: '2026-04-12T00:00:00Z',
      },
    )

    expect(result).toHaveLength(10)
    expect(result[0]).toMatchObject({ model: 'model-11', totalCost: 11 })
    expect(result[9]).toMatchObject({ model: 'model-2', totalCost: 2 })
  })

  it('returns aggregate stats for the org', async () => {
    await seedRecord()
    await repository.upsert({
      id: 'row-2',
      bifrostLogId: 'log-2',
      apiKeyId: 'key-1',
      orgId: 'org-1',
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 50,
      outputTokens: 10,
      creditCost: '2.75',
      latencyMs: 200,
      status: 'success',
      occurredAt: '2026-04-11T12:30:00Z',
      createdAt: '2026-04-11T12:30:01Z',
    })

    const result = await repository.queryStatsByOrg('org-1', {
      startDate: '2026-04-11T00:00:00Z',
      endDate: '2026-04-12T00:00:00Z',
    })

    expect(result).toEqual({
      totalRequests: 2,
      totalCost: 4,
      totalTokens: 185,
      avgLatency: 175,
    })
  })

  it('returns aggregate stats scoped to a single API key', async () => {
    await seedRecord({ apiKeyId: 'key-1', inputTokens: 10, outputTokens: 20, creditCost: '1.00', latencyMs: 100 })
    await repository.upsert({
      id: 'row-2',
      bifrostLogId: 'log-2',
      apiKeyId: 'key-2',
      orgId: 'org-1',
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 50,
      outputTokens: 10,
      creditCost: '2.75',
      latencyMs: 200,
      status: 'success',
      occurredAt: '2026-04-11T12:30:00Z',
      createdAt: '2026-04-11T12:30:01Z',
    })

    const result = await repository.queryStatsByKey('key-1', {
      startDate: '2026-04-11T00:00:00Z',
      endDate: '2026-04-12T00:00:00Z',
    })

    expect(result).toEqual({
      totalRequests: 1,
      totalCost: 1,
      totalTokens: 30,
      avgLatency: 100,
    })
  })
})
