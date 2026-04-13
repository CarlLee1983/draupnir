import { beforeAll, describe, expect, it, spyOn } from 'bun:test'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import type { IDatabaseAccess, IQueryBuilder } from '@/Shared/Infrastructure/IDatabaseAccess'
import { createDrizzleDatabaseAccess } from '../Adapters/Drizzle/DrizzleDatabaseAdapter'
import { MemoryDatabaseAccess } from '../Adapters/Memory/MemoryDatabaseAccess'
import * as schema from '../Adapters/Drizzle/schema'
import {
  add,
  avg,
  coalesce,
  count,
  dateTrunc,
  sum,
  type AggregateSpec,
} from '../AggregateSpec'

import * as config from '../Adapters/Drizzle/config'

const seedRows = [
  {
    id: '1',
    bifrost_log_id: 'l1',
    api_key_id: 'k1',
    org_id: 'org-1',
    model: 'gpt-4',
    provider: 'openai',
    input_tokens: 10,
    output_tokens: 5,
    credit_cost: 1.00,
    latency_ms: 100,
    status: 'success',
    occurred_at: '2026-04-10T10:00:00Z',
    created_at: '2026-04-10T10:00:01Z',
  },
  {
    id: '2',
    bifrost_log_id: 'l2',
    api_key_id: 'k1',
    org_id: 'org-1',
    model: 'gpt-4',
    provider: 'openai',
    input_tokens: 20,
    output_tokens: 10,
    credit_cost: 2.50,
    latency_ms: null,
    status: 'success',
    occurred_at: '2026-04-10T15:00:00Z',
    created_at: '2026-04-10T15:00:01Z',
  },
  {
    id: '3',
    bifrost_log_id: 'l3',
    api_key_id: 'k2',
    org_id: 'org-1',
    model: 'claude-3',
    provider: 'anthropic',
    input_tokens: 30,
    output_tokens: 15,
    credit_cost: 3.00,
    latency_ms: 200,
    status: 'success',
    occurred_at: '2026-04-11T09:00:00Z',
    created_at: '2026-04-11T09:00:01Z',
  },
  {
    id: '4',
    bifrost_log_id: 'l4',
    api_key_id: 'k2',
    org_id: 'org-1',
    model: 'claude-3',
    provider: 'anthropic',
    input_tokens: 40,
    output_tokens: 20,
    credit_cost: 0.50,
    latency_ms: null,
    status: 'success',
    occurred_at: '2026-04-11T21:00:00Z',
    created_at: '2026-04-11T21:00:01Z',
  }
]

describe('Aggregate parity across Drizzle and Memory adapters', () => {
  let drizzleAccess: IDatabaseAccess
  let memoryAccess: IDatabaseAccess
  let drizzleDb: any

  beforeAll(async () => {
    // Setup Drizzle
    const client = createClient({ url: 'file::memory:' })
    drizzleDb = drizzle(client, { schema })
    spyOn(config, 'getDrizzleInstance').mockReturnValue(drizzleDb)

    await client.execute(`
      CREATE TABLE usage_records (
        id TEXT PRIMARY KEY,
        bifrost_log_id TEXT NOT NULL,
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

    drizzleAccess = createDrizzleDatabaseAccess()
    memoryAccess = new MemoryDatabaseAccess()

    // Seed both
    await drizzleDb.insert(schema.usageRecords).values(seedRows)
    for (const row of seedRows) {
      await memoryAccess.table('usageRecords').insert(row)
    }
  })

  async function runOnBoth<T>(
    spec: AggregateSpec, 
    chain: (qb: IQueryBuilder) => IQueryBuilder = qb => qb
  ): Promise<[readonly T[], readonly T[]]> {
    const dRows = await chain(drizzleAccess.table('usageRecords')).aggregate<T>(spec)
    const mRows = await chain(memoryAccess.table('usageRecords')).aggregate<T>(spec)
    return [dRows, mRows]
  }

  it('queryDailyCost spec produces identical rows', async () => {
    const spec: AggregateSpec = {
      select: {
        date: dateTrunc('day', 'occurred_at'),
        totalCost: sum('credit_cost'),
        totalRequests: count('*'),
        totalInputTokens: sum('input_tokens'),
        totalOutputTokens: sum('output_tokens'),
      },
      groupBy: ['date'],
      orderBy: [{ column: 'date', direction: 'ASC' }],
    }
    const [drizzle, memory] = await runOnBoth(spec, qb =>
      qb.where('org_id', '=', 'org-1').whereBetween('occurred_at', [new Date('2026-04-10T00:00:00Z'), new Date('2026-04-11T23:59:59Z')])
    )
    expect(memory).toEqual(drizzle)
    expect(memory).toHaveLength(2)
    expect(memory[0]).toEqual({
      date: '2026-04-10',
      totalCost: 3.5,
      totalRequests: 2,
      totalInputTokens: 30,
      totalOutputTokens: 15
    })
  })

  it('queryModelBreakdown spec — avg(coalesce) parity', async () => {
    const spec: AggregateSpec = {
      select: {
        model: coalesce('model', 'unknown'),
        avgLatency: avg(coalesce('latency_ms', 0)),
        totalCost: sum('credit_cost'),
      },
      groupBy: ['model'],
      orderBy: [{ column: 'totalCost', direction: 'DESC' }]
    }
    const [drizzle, memory] = await runOnBoth(spec)
    expect(memory).toEqual(drizzle)
    // gpt-4: (100 + 0) / 2 = 50
    // claude-3: (200 + 0) / 2 = 100
    // Since both have totalCost 3.5, order might be either.
    const gpt4 = memory.find((r: any) => r.model === 'gpt-4')
    const claude3 = memory.find((r: any) => r.model === 'claude-3')
    expect(gpt4).toMatchObject({ avgLatency: 50, totalCost: 3.5 })
    expect(claude3).toMatchObject({ avgLatency: 100, totalCost: 3.5 })
  })

  it('queryPerKeyCost spec — sum(add) nested parity', async () => {
    const spec: AggregateSpec = {
      select: {
        apiKeyId: coalesce('api_key_id', 'unknown'),
        totalTokens: sum(add('input_tokens', 'output_tokens')),
        totalCost: sum('credit_cost'),
      },
      groupBy: ['apiKeyId'],
      orderBy: [{ column: 'totalTokens', direction: 'DESC' }]
    }
    const [drizzle, memory] = await runOnBoth(spec)
    expect(memory).toEqual(drizzle)
    // key k1 (gpt-4): (10+5) + (20+10) = 45
    // key k2 (claude-3): (30+15) + (40+20) = 105
    expect(memory[0]).toMatchObject({ apiKeyId: 'k2', totalTokens: 105 })
    expect(memory[1]).toMatchObject({ apiKeyId: 'k1', totalTokens: 45 })
  })

  it('queryStats spec — no groupBy, all aggregators in one row', async () => {
    const spec: AggregateSpec = {
      select: {
        totalRequests: count('*'),
        totalCost: sum('credit_cost'),
        totalTokens: sum(add('input_tokens', 'output_tokens')),
        avgLatency: avg(coalesce('latency_ms', 0)),
      }
    }
    const [drizzle, memory] = await runOnBoth(spec)
    expect(memory).toEqual(drizzle)
    expect(memory).toHaveLength(1)
    expect(memory[0]).toEqual({
      totalRequests: 4,
      totalCost: 7.0,
      totalTokens: 150,
      avgLatency: 75
    })
  })

  it('empty table produces same output', async () => {
    // Clear both
    await drizzleDb.delete(schema.usageRecords)
    const memAccess = new MemoryDatabaseAccess() // New instance is empty
    
    const spec: AggregateSpec = {
      select: { total: sum('credit_cost'), cnt: count('*') }
    }
    
    const dRows = await drizzleAccess.table('usageRecords').aggregate(spec)
    const mRows = await memAccess.table('usageRecords').aggregate(spec)
    
    expect(mRows).toEqual(dRows)
    // SQL returns one row with 0/null for empty table without groupBy
    // Drizzle: [{ total: 0, cnt: 0 }] (due to Number coercion we added)
  })
})
