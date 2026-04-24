import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from './support/TestApp'

describe('Acceptance harness — DB migrate + truncate', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await TestApp.boot()
  })

  afterAll(async () => {
    await app.shutdown()
  })

  beforeEach(async () => {
    await app.reset()
  })

  it('credit_accounts 表已由 migrate 建立', async () => {
    const rows = await app.db.table('credit_accounts').select()
    expect(Array.isArray(rows)).toBe(true)
    expect(rows).toHaveLength(0)
  })

  it('insert 後能讀到；reset 後為空', async () => {
    await app.db.table('credit_accounts').insert({
      id: 'acc-smoke-1',
      org_id: 'org-smoke-1',
      balance: '0',
      low_balance_threshold: '0',
      status: 'active',
      created_at: app.clock.nowIso(),
      updated_at: app.clock.nowIso(),
    })

    const before = await app.db.table('credit_accounts').where('id', '=', 'acc-smoke-1').select()
    expect(before).toHaveLength(1)

    await app.reset()

    const after = await app.db.table('credit_accounts').select()
    expect(after).toHaveLength(0)
  })

  it('連續多次 reset 不報錯', async () => {
    for (let i = 0; i < 3; i++) {
      await app.reset()
    }
    const rows = await app.db.table('credit_accounts').select()
    expect(rows).toHaveLength(0)
  })
})
