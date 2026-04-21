import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import type { UsageRecordInsert } from '../Application/Ports/IUsageRepository'
import { DrizzleUsageRepository } from '../Infrastructure/Repositories/DrizzleUsageRepository'

describe('DrizzleUsageRepository (Memory Adapter Parity)', () => {
  let db: MemoryDatabaseAccess
  let repository: DrizzleUsageRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    repository = new DrizzleUsageRepository(db)
  })

  async function seedRecord(overrides: Partial<UsageRecordInsert> = {}) {
    const record: UsageRecordInsert = {
      id: `id-${Math.random()}`,
      bifrostLogId: `log-${Math.random()}`,
      apiKeyId: 'key-1',
      orgId: 'org-1',
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 100,
      outputTokens: 25,
      creditCost: 1.25,
      latencyMs: 150,
      status: 'success',
      occurredAt: '2026-04-11T10:00:00Z',
      createdAt: '2026-04-11T10:00:02Z',
      ...overrides,
    }
    await repository.upsert(record)
    return record
  }

  it('can upsert a usage record', async () => {
    const record = await seedRecord()

    const rows = await db.table('usageRecords').select()
    expect(rows).toHaveLength(1)
    expect(rows[0].bifrost_log_id).toBe(record.bifrostLogId)
  })

  it('ignores duplicate bifrostLogId (idempotence)', async () => {
    const record = {
      id: 'row-1',
      bifrostLogId: 'same-log',
      apiKeyId: 'key-1',
      orgId: 'org-1',
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 100,
      outputTokens: 25,
      creditCost: 1.25,
      latencyMs: 150,
      status: 'success' as const,
      occurredAt: '2026-04-11T10:00:00Z',
      createdAt: '2026-04-11T10:00:02Z',
    }

    await repository.upsert(record)
    await repository.upsert({ ...record, id: 'row-2' })

    const rows = await db.table('usageRecords').select()
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('row-1')
  })

  it('aggregates daily cost platform-wide (all orgs)', async () => {
    await seedRecord({ orgId: 'org-1', occurredAt: '2026-04-11T10:00:00Z', creditCost: 1.0 })
    await seedRecord({
      orgId: 'org-2',
      bifrostLogId: 'log-org2',
      occurredAt: '2026-04-11T15:00:00Z',
      creditCost: 2.0,
    })
    await seedRecord({ occurredAt: '2026-04-12T09:00:00Z', creditCost: 3.0 })

    const result = await repository.queryDailyCostPlatform({
      startDate: '2026-04-11T00:00:00Z',
      endDate: '2026-04-12T23:59:59Z',
    })

    expect(result).toHaveLength(2)
    expect(result[0].totalRequests).toBe(2)
    expect(result[0].totalCost).toBe(3.0)
    expect(result[1].totalCost).toBe(3.0)
  })

  it('aggregates daily cost by organization', async () => {
    await seedRecord({ occurredAt: '2026-04-11T10:00:00Z', creditCost: 1.0 })
    await seedRecord({ occurredAt: '2026-04-11T15:00:00Z', creditCost: 2.5 })
    await seedRecord({ occurredAt: '2026-04-12T09:00:00Z', creditCost: 3.0 })

    const result = await repository.queryDailyCostByOrg('org-1', {
      startDate: '2026-04-11T00:00:00Z',
      endDate: '2026-04-12T23:59:59Z',
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      date: '2026-04-11',
      totalCost: 3.5,
      totalRequests: 2,
      totalInputTokens: 200,
      totalOutputTokens: 50,
    })
    expect(result[1].totalCost).toBe(3.0)
  })

  it('returns model usage breakdown', async () => {
    await seedRecord({ model: 'gpt-4o', provider: 'openai', creditCost: 1.0 })
    await seedRecord({ model: 'gpt-4o', provider: 'openai', creditCost: 2.5 })
    await seedRecord({ model: 'claude-3', provider: 'anthropic', creditCost: 3.0 })

    const result = await repository.queryModelBreakdown('org-1', {
      startDate: '2026-04-11T00:00:00Z',
      endDate: '2026-04-12T00:00:00Z',
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ model: 'gpt-4o', totalCost: 3.5 })
    expect(result[1]).toMatchObject({ model: 'claude-3', totalCost: 3.0 })
  })

  it('aggregates per-key cost correctly', async () => {
    await seedRecord({ apiKeyId: 'key-1', creditCost: 1.0, inputTokens: 10, outputTokens: 20 })
    await seedRecord({ apiKeyId: 'key-1', creditCost: 2.0, inputTokens: 30, outputTokens: 40 })
    await seedRecord({ apiKeyId: 'key-2', creditCost: 5.0, inputTokens: 50, outputTokens: 60 })

    const result = await repository.queryPerKeyCost('org-1', {
      startDate: '2026-04-11T00:00:00Z',
      endDate: '2026-04-12T00:00:00Z',
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      apiKeyId: 'key-2',
      totalCost: 5.0,
      totalRequests: 1,
      totalTokens: 110,
    })
    expect(result[1]).toEqual({
      apiKeyId: 'key-1',
      totalCost: 3.0,
      totalRequests: 2,
      totalTokens: 100,
    })
  })

  it('returns overall stats for an organization', async () => {
    await seedRecord({ creditCost: 1.0, inputTokens: 10, outputTokens: 20, latencyMs: 100 })
    await seedRecord({ creditCost: 2.5, inputTokens: 30, outputTokens: 40, latencyMs: 250 })

    const result = await repository.queryStatsByOrg('org-1', {
      startDate: '2026-04-11T00:00:00Z',
      endDate: '2026-04-12T00:00:00Z',
    })

    expect(result).toEqual({
      totalRequests: 2,
      totalCost: 3.5,
      totalTokens: 100,
      avgLatency: 175,
    })
  })

  it('returns aggregate stats scoped to a single API key', async () => {
    await seedRecord({
      apiKeyId: 'key-1',
      inputTokens: 10,
      outputTokens: 20,
      creditCost: 1.0,
      latencyMs: 100,
    })
    await repository.upsert({
      id: 'row-2',
      bifrostLogId: 'log-2',
      apiKeyId: 'key-2',
      orgId: 'org-1',
      model: 'gpt-4o',
      provider: 'openai',
      inputTokens: 30,
      outputTokens: 40,
      creditCost: 5.0,
      latencyMs: 500,
      status: 'success',
      occurredAt: '2026-04-11T11:00:00Z',
      createdAt: '2026-04-11T11:00:01Z',
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
