import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../TestApp'
import { scenario } from '../index'

describe('given.* helpers', () => {
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

  it('organization 寫入 row', async () => {
    await scenario(app).given.organization('org-1').run()
    const row = await app.db.table('organizations').where('id', '=', 'org-1').first()
    expect(row).toBeTruthy()
  })

  it('admin + creditAccount + activeApiKey chain', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '100' })
      .given.activeApiKey({
        orgId: 'org-1',
        keyId: 'key-1',
        createdByUserId: 'admin-1',
      })
      .run()

    const u = await app.db.table('users').where('id', '=', 'admin-1').first()
    expect((u as { role: string }).role).toBe('admin')

    const acc = await app.db.table('credit_accounts').where('org_id', '=', 'org-1').first()
    expect((acc as { balance: string }).balance).toBe('100')

    const key = await app.db.table('api_keys').where('id', '=', 'key-1').first()
    expect((key as { status: string }).status).toBe('active')
    expect(app.gateway.calls.createKey).toHaveLength(1)
  })

  it('member 把使用者加入組織', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.member({ userId: 'u-1', orgId: 'org-1' })
      .run()
    const m = await app.db
      .table('organization_members')
      .where('user_id', '=', 'u-1')
      .first()
    expect((m as { role: string }).role).toBe('member')
  })

  it('suspendedApiKey 寫 status=suspended_no_credit', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-1')
      .given.suspendedApiKey({
        orgId: 'org-1',
        keyId: 'key-1',
        createdByUserId: 'admin-1',
        preFreezeRateLimit: { rpm: 60, tpm: 100000 },
      })
      .run()
    const key = await app.db.table('api_keys').where('id', '=', 'key-1').first()
    expect((key as { status: string }).status).toBe('suspended_no_credit')
    expect((key as { suspension_reason: string }).suspension_reason).toBe('CREDIT_DEPLETED')
  })

  it('coreAppModulesProvisioned 種 4 modules + 4 subscriptions', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.coreAppModulesProvisioned('org-1')
      .run()
    const mods = await app.db.table('app_modules').select()
    expect(mods).toHaveLength(4)
    const subs = await app.db
      .table('module_subscriptions')
      .where('org_id', '=', 'org-1')
      .select()
    expect(subs).toHaveLength(4)
  })

  it('usageRecords 寫多筆', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-1')
      .given.activeApiKey({ orgId: 'org-1', keyId: 'key-1', createdByUserId: 'admin-1' })
      .given.usageRecords({
        orgId: 'org-1',
        apiKeyId: 'key-1',
        records: [
          { creditCost: 10, occurredAt: '2026-04-01T00:00:00.000Z' },
          { creditCost: 20, occurredAt: '2026-04-02T00:00:00.000Z' },
        ],
      })
      .run()
    const rows = await app.db.table('usage_records').where('org_id', '=', 'org-1').select()
    expect(rows).toHaveLength(2)
  })
})
