import { beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { DrizzleQueryBuilder } from '../DrizzleQueryBuilder'

// 定義一個專用於測試的簡單 Schema
const testItems = sqliteTable('test_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  value: integer('value').default(0),
})

describe('DrizzleQueryBuilder CRUD (Isolated)', () => {
  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  let client: any
  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  let drizzleDb: any
  let qb: DrizzleQueryBuilder

  beforeAll(async () => {
    client = createClient({ url: 'file::memory:' })
    drizzleDb = drizzle(client)

    // 手動建立表結構
    await client.execute(`
      CREATE TABLE test_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        value INTEGER DEFAULT 0
      )
    `)
  })

  beforeEach(async () => {
    // 每個測試前清空表
    await client.execute('DELETE FROM test_items')
    qb = new DrizzleQueryBuilder(drizzleDb, 'test_items', testItems)
  })

  it('should insert and retrieve a record using first()', async () => {
    await qb.insert({ id: '1', name: 'Item 1', value: 100 })

    const result = await qb.where('id', '=', '1').first()
    expect(result).toEqual({ id: '1', name: 'Item 1', value: 100 })
  })

  it('should update records', async () => {
    await qb.insert({ id: '2', name: 'Original', value: 10 })
    await qb.where('id', '=', '2').update({ name: 'Updated', value: 20 })

    const result = await qb.where('id', '=', '2').first()
    expect(result?.name).toBe('Updated')
    expect(result?.value).toBe(20)
  })

  it('should delete records', async () => {
    await qb.insert({ id: '3', name: 'To Delete' })
    await qb.where('id', '=', '3').delete()

    const result = await qb.where('id', '=', '3').first()
    expect(result).toBeNull()
  })

  it('should count records', async () => {
    await qb.insert({ id: 'a', name: 'A' })
    await qb.insert({ id: 'b', name: 'B' })

    const total = await qb.count()
    expect(total).toBe(2)

    const filtered = await qb.where('name', '=', 'A').count()
    expect(filtered).toBe(1)
  })

  it('should support limit and orderBy', async () => {
    await qb.insert({ id: 'x', name: 'X', value: 10 })
    await qb.insert({ id: 'y', name: 'Y', value: 5 })
    await qb.insert({ id: 'z', name: 'Z', value: 15 })

    // Order by value DESC: Z, X, Y
    // Limit 2: Z, X
    const results = await qb.orderBy('value', 'DESC').limit(2).select()
    expect(results).toHaveLength(2)
    expect(results[0].id).toBe('z')
    expect(results[1].id).toBe('x')
  })

  it('should insertOrIgnore idempotent insert', async () => {
    const data = { id: 'dup', name: 'Duplicate' }
    await qb.insert(data)

    // Should not throw and should not insert new row
    await qb.insertOrIgnore(data, { conflictTarget: 'id' })

    const total = await qb.count()
    expect(total).toBe(1)
  })
})
