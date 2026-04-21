import { describe, expect, it } from 'bun:test'
import {
  add,
  avg,
  coalesce,
  col,
  count,
  dateTrunc,
  max,
  min,
  sum,
} from '@/Shared/Infrastructure/Database/AggregateSpec'
import { AtlasQueryBuilder } from '@/Shared/Infrastructure/Database/Adapters/Atlas/AtlasQueryBuilder'

describe('AtlasQueryBuilder aggregate()', () => {
  it('compiles an AggregateSpec to SQL and executes via raw()', async () => {
    const rawCalls: Array<{ sql: string; bindings: unknown[] }> = []
    const connection = {
      raw: async (sql: string, bindings: unknown[]) => {
        rawCalls.push({ sql, bindings })
        return { rows: [{ day: '2026-01-01', total: 10 }] }
      },
    }

    const qb = new AtlasQueryBuilder('usage_logs', connection)
      .where('org_id', '=', 'org-1')
      .whereBetween('created_at', [new Date('2026-01-01'), new Date('2026-01-31')])
      .where('vk_id', 'in', [])

    const rows = await qb.aggregate({
      select: {
        day: dateTrunc('day', 'created_at'),
        total: sum('cost'),
        requests: count('*'),
        avg_cost: avg(coalesce('cost', 0)),
        min_cost: min('cost'),
        max_cost: max('cost'),
        plus: add('a', 'b'),
        status: col('status'),
      },
      groupBy: ['day', 'status'],
      orderBy: [{ column: 'day', direction: 'ASC' }],
      limit: 10,
    })

    expect(rows).toEqual([{ day: '2026-01-01', total: 10 }])
    expect(rawCalls).toHaveLength(1)
    expect(rawCalls[0]?.sql).toContain('SELECT')
    expect(rawCalls[0]?.sql).toContain('FROM "usage_logs"')
    expect(rawCalls[0]?.sql).toContain('GROUP BY')
    expect(rawCalls[0]?.sql).toContain('ORDER BY')
    expect(rawCalls[0]?.sql).toContain('LIMIT 10')
    expect(rawCalls[0]?.sql).toContain('1 = 0')
    expect(rawCalls[0]?.bindings).toHaveLength(3)
  })

  it('returns arrays from raw() directly', async () => {
    const connection = {
      raw: async () => [{ k: 'v' }],
    }

    const qb = new AtlasQueryBuilder('usage_logs', connection).where('vk_id', 'in', ['vk-1'])

    const rows = await qb.aggregate({
      select: {
        requests: count('*'),
      },
    })

    expect(rows).toEqual([{ k: 'v' }])
  })
})

