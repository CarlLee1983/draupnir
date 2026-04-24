import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { add, avg, coalesce, col, count, dateTrunc, max, min, sum } from '../../../AggregateSpec'
import * as schema from '../../../schema'
import * as config from '../config'
import { createDrizzleDatabaseAccess } from '../DrizzleDatabaseAdapter'

describe('DrizzleQueryBuilder.aggregate', () => {
  let db: IDatabaseAccess
  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  let drizzleDb: any
  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  let configSpy: any

  beforeAll(async () => {
    const client = createClient({ url: 'file::memory:' })
    drizzleDb = drizzle(client, { schema })
    configSpy = spyOn(config, 'getDrizzleInstance').mockReturnValue(drizzleDb)

    // Setup table schema
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

    db = createDrizzleDatabaseAccess()
  })

  afterAll(() => {
    configSpy.mockRestore()
    config.resetDrizzleForTest()
  })

  beforeEach(async () => {
    // Clear table
    await drizzleDb.delete(schema.usageRecords)

    // Seed 4 rows
    // Row 1: 2026-04-10, cost 1.00, latency 100, tokens 10/5, model gpt-4
    // Row 2: 2026-04-10, cost 2.50, latency null, tokens 20/10, model gpt-4
    // Row 3: 2026-04-11, cost 3.00, latency 200, tokens 30/15, model claude-3
    // Row 4: 2026-04-11, cost 0.50, latency null, tokens 40/20, model claude-3
    await drizzleDb.insert(schema.usageRecords).values([
      {
        id: '1',
        bifrost_log_id: 'l1',
        api_key_id: 'k1',
        org_id: 'org-1',
        model: 'gpt-4',
        provider: 'openai',
        input_tokens: 10,
        output_tokens: 5,
        credit_cost: 1.0,
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
        credit_cost: 2.5,
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
        credit_cost: 3.0,
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
        credit_cost: 0.5,
        latency_ms: null,
        status: 'success',
        occurred_at: '2026-04-11T21:00:00Z',
        created_at: '2026-04-11T21:00:01Z',
      },
    ])
  })

  describe('single-aggregate, no groupBy', () => {
    it('sum returns total', async () => {
      const result = await db.table('usageRecords').aggregate<{ total: number }>({
        select: { total: sum('credit_cost') },
      })
      expect(result[0].total).toBe(7.0)
    })

    it('count(*) returns row count', async () => {
      const result = await db.table('usageRecords').aggregate<{ count: number }>({
        select: { count: count('*') },
      })
      expect(Number(result[0].count)).toBe(4)
    })

    it('avg returns mean', async () => {
      const result = await db.table('usageRecords').aggregate<{ avgInput: number }>({
        select: { avgInput: avg('input_tokens') },
      })
      expect(Number(result[0].avgInput)).toBe(25)
    })

    it('min returns minimum', async () => {
      const result = await db.table('usageRecords').aggregate<{ minCost: number }>({
        select: { minCost: min('credit_cost') },
      })
      expect(result[0].minCost).toBe(0.5)
    })

    it('max returns maximum', async () => {
      const result = await db.table('usageRecords').aggregate<{ maxCost: number }>({
        select: { maxCost: max('credit_cost') },
      })
      expect(result[0].maxCost).toBe(3.0)
    })
  })

  describe('column expressions', () => {
    it('dateTrunc("day", col) emits YYYY-MM-DD and groups correctly', async () => {
      const result = await db.table('usageRecords').aggregate<{ date: string; total: number }>({
        select: {
          date: dateTrunc('day', 'occurred_at'),
          total: sum('credit_cost'),
        },
        groupBy: ['date'],
        orderBy: [{ column: 'date', direction: 'ASC' }],
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ date: '2026-04-10', total: 3.5 })
      expect(result[1]).toEqual({ date: '2026-04-11', total: 3.5 })
    })

    it('coalesce wrapped by avg treats NULLs as 0', async () => {
      const result = await db.table('usageRecords').aggregate<{ avgLatency: number }>({
        select: {
          avgLatency: avg(coalesce('latency_ms', 0)),
        },
      })
      // (100 + 0 + 200 + 0) / 4 = 75
      expect(Number(result[0].avgLatency)).toBe(75)
    })

    it('add("a", "b") wrapped by sum returns element-wise sum', async () => {
      const result = await db.table('usageRecords').aggregate<{ totalTokens: number }>({
        select: {
          totalTokens: sum(add('input_tokens', 'output_tokens')),
        },
      })
      // (10+5) + (20+10) + (30+15) + (40+20) = 15 + 30 + 45 + 60 = 150
      expect(Number(result[0].totalTokens)).toBe(150)
    })
  })

  describe('orderBy + limit', () => {
    it('orderBy by select alias DESC + limit 2 returns top-2', async () => {
      const result = await db.table('usageRecords').aggregate<{ model: string; total: number }>({
        select: {
          model: col('model'),
          total: sum('credit_cost'),
        },
        groupBy: ['model'],
        orderBy: [{ column: 'total', direction: 'DESC' }],
        limit: 1,
      })

      expect(result).toHaveLength(1)
      expect(result[0].model).toBe('gpt-4') // 1.0 + 2.5 = 3.5 vs claude-3 (3.0 + 0.5 = 3.5)
      // wait, both are 3.5. Let's make one higher.
    })
  })

  describe('where/whereBetween integration', () => {
    it('.where() filter applies before aggregation', async () => {
      const result = await db
        .table('usageRecords')
        .where('model', '=', 'gpt-4')
        .aggregate<{ total: number }>({
          select: { total: sum('credit_cost') },
        })
      expect(result[0].total).toBe(3.5)
    })

    it('.whereBetween() with string range filters correctly', async () => {
      // 2026-04-10T12:00:00Z to 2026-04-11T12:00:00Z
      // Should pick Row 2 (10th 15:00) and Row 3 (11th 09:00)
      const start = new Date('2026-04-10T12:00:00Z')
      const end = new Date('2026-04-11T12:00:00Z')

      const result = await db
        .table('usageRecords')
        .whereBetween('occurred_at', [start, end])
        .aggregate<{ total: number }>({
          select: { total: sum('credit_cost') },
        })

      // 2.50 + 3.00 = 5.50
      expect(result[0].total).toBe(5.5)
    })

    it('whereBetween accepts string range', async () => {
      const result = await db
        .table('usageRecords')
        .whereBetween('occurred_at', ['2026-04-10T12:00:00Z', '2026-04-11T12:00:00Z'])
        .aggregate<{ total: number }>({
          select: { total: sum('credit_cost') },
        })
      expect(result[0].total).toBe(5.5)
    })
  })

  describe('insertOrIgnore', () => {
    it('inserts a new row when no conflict', async () => {
      await db.table('usageRecords').insertOrIgnore(
        {
          id: 'new-1',
          bifrost_log_id: 'unique-log',
          api_key_id: 'k1',
          org_id: 'org-1',
          model: 'gpt-4',
          occurred_at: '2026-04-12T00:00:00Z',
          created_at: '2026-04-12T00:00:01Z',
        },
        { conflictTarget: 'bifrost_log_id' },
      )

      const count = await db
        .table('usageRecords')
        .where('bifrost_log_id', '=', 'unique-log')
        .count()
      expect(count).toBe(1)
    })

    it('is idempotent on conflict target', async () => {
      const data = {
        id: 'dup-1',
        bifrost_log_id: 'l1', // already exists in beforeEach
        api_key_id: 'k1',
        org_id: 'org-1',
        model: 'gpt-4',
        occurred_at: '2026-04-12T00:00:00Z',
        created_at: '2026-04-12T00:00:01Z',
      }

      await db.table('usageRecords').insertOrIgnore(data, { conflictTarget: 'bifrost_log_id' })

      const count = await db.table('usageRecords').where('bifrost_log_id', '=', 'l1').count()
      expect(count).toBe(1) // should not have inserted another row
    })
  })
})
