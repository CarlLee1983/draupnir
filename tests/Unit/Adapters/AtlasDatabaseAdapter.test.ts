/**
 * Atlas QueryBuilder 單元測試
 *
 * 驗證 AtlasQueryBuilder 正確實現 IQueryBuilder 介面
 */

import { describe, expect, it } from 'bun:test'
import { AtlasQueryBuilder } from '@/Shared/Infrastructure/Database/Adapters/Atlas/AtlasQueryBuilder'

type MockQueryCall =
  | { type: 'where'; column: string; operator: string; value: unknown }
  | { type: 'whereIn'; column: string; values: unknown[] }
  | { type: 'whereBetween'; column: string; range: [Date, Date] }
  | { type: 'orderBy'; column: string; direction: string }
  | { type: 'offset'; value: number }
  | { type: 'limit'; value: number }
  | { type: 'forUpdate' }
  | { type: 'insert'; data: Record<string, unknown> }
  | { type: 'update'; data: Record<string, unknown> }
  | { type: 'delete' }
  | { type: 'first' }
  | { type: 'get' }
  | { type: 'count' }

class MockTableQuery {
  readonly calls: MockQueryCall[] = []

  where(column: string, operator: string, value: unknown): this {
    this.calls.push({ type: 'where', column, operator, value })
    return this
  }

  whereIn(column: string, values: unknown[]): this {
    this.calls.push({ type: 'whereIn', column, values })
    return this
  }

  whereBetween(column: string, range: [Date, Date]): this {
    this.calls.push({ type: 'whereBetween', column, range })
    return this
  }

  orderBy(column: string, direction: string): this {
    this.calls.push({ type: 'orderBy', column, direction })
    return this
  }

  offset(value: number): this {
    this.calls.push({ type: 'offset', value })
    return this
  }

  limit(value: number): this {
    this.calls.push({ type: 'limit', value })
    return this
  }

  forUpdate(): this {
    this.calls.push({ type: 'forUpdate' })
    return this
  }

  async first(): Promise<Record<string, unknown> | null> {
    this.calls.push({ type: 'first' })
    return { id: 1 }
  }

  async get(): Promise<Record<string, unknown>[]> {
    this.calls.push({ type: 'get' })
    return [{ id: 1 }, { id: 2 }]
  }

  async insert(data: Record<string, unknown>): Promise<void> {
    this.calls.push({ type: 'insert', data })
  }

  async update(data: Record<string, unknown>): Promise<void> {
    this.calls.push({ type: 'update', data })
  }

  async delete(): Promise<void> {
    this.calls.push({ type: 'delete' })
  }

  async count(): Promise<number> {
    this.calls.push({ type: 'count' })
    return 42
  }
}

function makeMockConnection(query: MockTableQuery) {
  return {
    table: () => query,
  }
}

describe('AtlasQueryBuilder', () => {
  describe('IQueryBuilder 介面實現', () => {
    it('應該實現所有 IQueryBuilder 方法', () => {
      const qb = new AtlasQueryBuilder('users')

      expect(typeof qb.where).toBe('function')
      expect(typeof qb.first).toBe('function')
      expect(typeof qb.select).toBe('function')
      expect(typeof qb.insert).toBe('function')
      expect(typeof qb.update).toBe('function')
      expect(typeof qb.delete).toBe('function')
      expect(typeof qb.limit).toBe('function')
      expect(typeof qb.offset).toBe('function')
      expect(typeof qb.orderBy).toBe('function')
      expect(typeof qb.whereBetween).toBe('function')
      expect(typeof qb.count).toBe('function')
    })

    it('應該支援鏈式調用', () => {
      const result = new AtlasQueryBuilder('users')
        .where('status', '=', 'active')
        .limit(10)
        .offset(5)
        .orderBy('created_at', 'DESC')

      expect(result).toBeInstanceOf(AtlasQueryBuilder)
    })

    it('應該支援多個 WHERE 條件', () => {
      const qb = new AtlasQueryBuilder('users')
        .where('status', '=', 'active')
        .where('age', '>=', 18)
        .where('email', 'like', '%@example.com')

      expect(qb).toBeDefined()
    })

    it('應該支援所有比較運算子', () => {
      const operators = ['=', '!=', '<>', '>', '<', '>=', '<=', 'like', 'in', 'between']

      for (const op of operators) {
        const qb = new AtlasQueryBuilder('users')

        if (op === 'between') {
          const result = qb.whereBetween('created_at', [new Date(), new Date()])
          expect(result).toBeInstanceOf(AtlasQueryBuilder)
        } else {
          const result = qb.where('id', op, '123')
          expect(result).toBeInstanceOf(AtlasQueryBuilder)
        }
      }
    })

    it('應該支援 orderBy ASC 和 DESC', () => {
      const asc = new AtlasQueryBuilder('users').orderBy('name', 'ASC')
      const desc = new AtlasQueryBuilder('users').orderBy('name', 'DESC')

      expect(asc).toBeInstanceOf(AtlasQueryBuilder)
      expect(desc).toBeInstanceOf(AtlasQueryBuilder)
    })

    it('應該支援 limit 和 offset', () => {
      const qb = new AtlasQueryBuilder('users').limit(10).offset(5)
      expect(qb).toBeInstanceOf(AtlasQueryBuilder)
    })
  })

  describe('構造函數', () => {
    it('應該接受表名稱', () => {
      const qb = new AtlasQueryBuilder('posts')
      expect(qb).toBeDefined()
    })

    it('不同表名稱應該創建不同的 QueryBuilder', () => {
      const usersQb = new AtlasQueryBuilder('users')
      const postsQb = new AtlasQueryBuilder('posts')

      expect(usersQb).not.toBe(postsQb)
    })
  })

  describe('where() 鏈式 API', () => {
    it('應該返回 this 以支援鏈式調用', () => {
      const qb = new AtlasQueryBuilder('users')
      const result = qb.where('id', '=', '123')

      expect(result).toBe(qb)
    })

    it('應該支援連續的 where 調用', () => {
      const qb = new AtlasQueryBuilder('users')
        .where('status', '=', 'active')
        .where('role', '=', 'admin')
        .where('age', '>', 18)

      expect(qb).toBeInstanceOf(AtlasQueryBuilder)
    })
  })

  describe('query execution', () => {
    it('applies conditions and executes first()', async () => {
      const query = new MockTableQuery()
      const qb = new AtlasQueryBuilder('users', makeMockConnection(query))
        .where('id', '=', 1)
        .where('status', '!=', 'disabled')
        .where('email', 'like', '%@example.com')
        .orderBy('created_at', 'DESC')
        .forUpdate()

      const row = await qb.first()

      expect(row).toEqual({ id: 1 })
      expect(query.calls.some((c) => c.type === 'forUpdate')).toBe(true)
      expect(query.calls.some((c) => c.type === 'first')).toBe(true)
    })

    it('applies offset/limit and executes select()', async () => {
      const query = new MockTableQuery()
      const qb = new AtlasQueryBuilder('users', makeMockConnection(query))
        .where('id', 'in', [1, 2, 3])
        .whereBetween('created_at', [new Date('2026-01-01'), new Date('2026-12-31')])
        .offset(5)
        .limit(10)

      const rows = await qb.select()

      expect(rows).toHaveLength(2)
      expect(query.calls.some((c) => c.type === 'offset')).toBe(true)
      expect(query.calls.some((c) => c.type === 'limit')).toBe(true)
      expect(query.calls.some((c) => c.type === 'get')).toBe(true)
    })

    it('executes insert/update/delete/count through the adapter', async () => {
      const query = new MockTableQuery()
      const qb = new AtlasQueryBuilder('users', makeMockConnection(query)).where('id', '=', 1)

      await qb.insert({ id: 1, name: 'a' })
      await qb.update({ name: 'b' })
      await qb.delete()
      const count = await qb.count()

      expect(count).toBe(42)
      expect(query.calls.some((c) => c.type === 'insert')).toBe(true)
      expect(query.calls.some((c) => c.type === 'update')).toBe(true)
      expect(query.calls.some((c) => c.type === 'delete')).toBe(true)
      expect(query.calls.some((c) => c.type === 'count')).toBe(true)
    })

    it('returns an empty array when an unsupported operator is used', async () => {
      const query = new MockTableQuery()
      const qb = new AtlasQueryBuilder('users', makeMockConnection(query)).where('id', '??', 1)

      const rows = await qb.select()

      expect(rows).toEqual([])
    })

    it('builds INSERT OR IGNORE SQL for insertOrIgnore()', async () => {
      const rawCalls: Array<{ sql: string; values: unknown[] }> = []
      const connection = {
        table: () => new MockTableQuery(),
        raw: async (sql: string, values: unknown[]) => {
          rawCalls.push({ sql, values })
          return []
        },
      }
      const qb = new AtlasQueryBuilder('users', connection)

      await qb.insertOrIgnore({ id: 1, email: 'a@example.com' }, { conflictTarget: 'id' })

      expect(rawCalls).toHaveLength(1)
      expect(rawCalls[0]?.sql).toContain('INSERT OR IGNORE INTO "users"')
      expect(rawCalls[0]?.values).toEqual([1, 'a@example.com'])
    })

    it('rethrows errors for update/delete so callers can handle failures', async () => {
      const connection = {
        table: () => ({
          where: () => ({
            update: async () => {
              throw new Error('update failed')
            },
            delete: async () => {
              throw new Error('delete failed')
            },
          }),
        }),
      }

      const qb = new AtlasQueryBuilder('users', connection).where('id', '=', 1)

      await expect(qb.update({ name: 'x' })).rejects.toThrow('update failed')
      await expect(qb.delete()).rejects.toThrow('delete failed')
    })
  })
})
