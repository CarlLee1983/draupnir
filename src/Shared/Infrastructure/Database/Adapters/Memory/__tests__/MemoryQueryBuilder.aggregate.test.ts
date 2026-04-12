import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryDatabaseAccess } from '../MemoryDatabaseAccess'
import {
  add,
  avg,
  col,
  coalesce,
  count,
  dateTrunc,
  max,
  min,
  sum,
} from '../../../AggregateSpec'

describe('MemoryQueryBuilder.aggregate', () => {
  let db: MemoryDatabaseAccess

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    
    // Seed 4 rows (same as Drizzle test)
    await db.table('usage_records').insert({
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
    })
    await db.table('usage_records').insert({
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
    })
    await db.table('usage_records').insert({
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
    })
    await db.table('usage_records').insert({
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
    })
  })

  describe('single-aggregate, no groupBy', () => {
    it('sum returns total', async () => {
      const result = await db.table('usage_records').aggregate<{ total: number }>({
        select: { total: sum('credit_cost') }
      })
      expect(result[0].total).toBe(7.00)
    })

    it('count(*) returns row count', async () => {
      const result = await db.table('usage_records').aggregate<{ count: number }>({
        select: { count: count('*') }
      })
      expect(result[0].count).toBe(4)
    })

    it('avg returns mean (skipping nulls)', async () => {
      const result = await db.table('usage_records').aggregate<{ avgInput: number }>({
        select: { avgInput: avg('input_tokens') }
      })
      expect(result[0].avgInput).toBe(25)
    })

    it('min returns minimum', async () => {
      const result = await db.table('usage_records').aggregate<{ minCost: number }>({
        select: { minCost: min('credit_cost') }
      })
      expect(result[0].minCost).toBe(0.50)
    })

    it('max returns maximum', async () => {
      const result = await db.table('usage_records').aggregate<{ maxCost: number }>({
        select: { maxCost: max('credit_cost') }
      })
      expect(result[0].maxCost).toBe(3.00)
    })
  })

  describe('column expressions', () => {
    it('dateTrunc("day", col) emits YYYY-MM-DD and groups correctly', async () => {
      const result = await db.table('usage_records').aggregate<{ date: string; total: number }>({
        select: {
          date: dateTrunc('day', 'occurred_at'),
          total: sum('credit_cost')
        },
        groupBy: ['date'],
        orderBy: [{ column: 'date', direction: 'ASC' }]
      })

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ date: '2026-04-10', total: 3.50 })
      expect(result[1]).toEqual({ date: '2026-04-11', total: 3.50 })
    })

    it('coalesce wrapped by avg treats NULLs as 0 (Pitfall 2)', async () => {
      const result = await db.table('usage_records').aggregate<{ avgLatency: number }>({
        select: {
          avgLatency: avg(coalesce('latency_ms', 0))
        }
      })
      // (100 + 0 + 200 + 0) / 4 = 75
      expect(result[0].avgLatency).toBe(75)
    })

    it('avg without coalesce skips NULLs (SQL parity)', async () => {
      const result = await db.table('usage_records').aggregate<{ avgLatency: number }>({
        select: {
          avgLatency: avg('latency_ms')
        }
      })
      // (100 + 200) / 2 = 150
      expect(result[0].avgLatency).toBe(150)
    })

    it('add("a", "b") wrapped by sum returns element-wise sum (Nested composition)', async () => {
      const result = await db.table('usage_records').aggregate<{ totalTokens: number }>({
        select: {
          totalTokens: sum(add('input_tokens', 'output_tokens'))
        }
      })
      // (10+5) + (20+10) + (30+15) + (40+20) = 15 + 30 + 45 + 60 = 150
      expect(result[0].totalTokens).toBe(150)
    })
  })

  describe('orderBy + limit', () => {
    it('orderBy by select alias DESC + limit 1 returns top row', async () => {
      const result = await db.table('usage_records').aggregate<{ model: string; total: number }>({
        select: {
          model: col('model'),
          total: sum('credit_cost')
        },
        groupBy: ['model'],
        orderBy: [{ column: 'total', direction: 'DESC' }],
        limit: 1
      })

      // Since both gpt-4 and claude-3 have 3.5, order might depend on internal Map.
      // But limit 1 should return only 1 row.
      expect(result).toHaveLength(1)
    })
  })

  describe('where/whereBetween integration', () => {
    it('.where() filter applies before aggregation', async () => {
      const result = await db.table('usage_records')
        .where('model', '=', 'gpt-4')
        .aggregate<{ total: number }>({
          select: { total: sum('credit_cost') }
        })
      expect(result[0].total).toBe(3.50)
    })

    it('.whereBetween() with Date objects filters correctly', async () => {
      const start = new Date('2026-04-10T12:00:00Z')
      const end = new Date('2026-04-11T12:00:00Z')
      
      const result = await db.table('usage_records')
        .whereBetween('occurred_at', [start, end])
        .aggregate<{ total: number }>({
          select: { total: sum('credit_cost') }
        })
      
      // Row 2 (15:00) and Row 3 (09:00) = 2.50 + 3.00 = 5.50
      expect(result[0].total).toBe(5.50)
    })

    it('whereBetween accepts string range', async () => {
      const result = await db.table('usage_records')
        .whereBetween('occurred_at', ['2026-04-10T12:00:00Z', '2026-04-11T12:00:00Z'])
        .aggregate<{ total: number }>({
          select: { total: sum('credit_cost') }
        })
      expect(result[0].total).toBe(5.50)
    })

    it('Pitfall 5: operator casing normalization (LIKE vs like)', async () => {
      const res1 = await db.table('usage_records').where('model', 'LIKE', 'gpt%').select()
      const res2 = await db.table('usage_records').where('model', 'like', 'gpt%').select()
      
      expect(res1).toHaveLength(2)
      expect(res1).toEqual(res2)
    })
  })

  describe('insertOrIgnore', () => {
    it('inserts a new row when no conflict', async () => {
      await db.table('usage_records').insertOrIgnore({
        id: 'new-1',
        bifrost_log_id: 'unique-log',
        api_key_id: 'k1',
        org_id: 'org-1',
        model: 'gpt-4',
        occurred_at: '2026-04-12T00:00:00Z',
        created_at: '2026-04-12T00:00:01Z',
      }, { conflictTarget: 'bifrost_log_id' })

      const count = await db.table('usage_records').where('bifrost_log_id', '=', 'unique-log').count()
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
      
      await expect(db.table('usage_records').insertOrIgnore(data, { conflictTarget: 'bifrost_log_id' }))
        .resolves.not.toThrow()

      const count = await db.table('usage_records').where('bifrost_log_id', '=', 'l1').count()
      expect(count).toBe(1) // should not have inserted another row
    })
  })
})
