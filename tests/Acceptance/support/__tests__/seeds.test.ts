import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../TestApp'

describe('seeds — round-trip', () => {
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

  it('user', async () => {
    const u = await app.seed.user({ id: 'u-1', email: 'u1@e.com', role: 'user' })
    expect(u.id).toBe('u-1')
    const row = await app.db.table('users').where('id', '=', 'u-1').first()
    expect(row).toBeTruthy()
    expect((row as { email: string }).email).toBe('u1@e.com')
  })

  it('organization (slug 自動唯一化)', async () => {
    const org = await app.seed.organization({ id: 'org-1', name: 'Acme' })
    expect(org.id).toBe('org-1')
    expect(typeof org.slug).toBe('string')
    const row = await app.db.table('organizations').where('id', '=', 'org-1').first()
    expect(row).toBeTruthy()
  })

  it('orgMember', async () => {
    await app.seed.user({ id: 'u-1', email: 'u1@e.com' })
    await app.seed.organization({ id: 'org-1', name: 'Acme' })
    const m = await app.seed.orgMember({ orgId: 'org-1', userId: 'u-1', role: 'member' })
    expect(m.id).toMatch(/.+/)
    const row = await app.db.table('organization_members').where('id', '=', m.id).first()
    expect((row as { role: string }).role).toBe('member')
  })

  it('creditAccount', async () => {
    await app.seed.organization({ id: 'org-1', name: 'Acme' })
    const acc = await app.seed.creditAccount({ orgId: 'org-1', balance: '500' })
    expect(acc.balance).toBe('500')
    const row = await app.db.table('credit_accounts').where('org_id', '=', 'org-1').first()
    expect((row as { balance: string }).balance).toBe('500')
  })

  it('apiKey active — 同步 seed gateway', async () => {
    await app.seed.organization({ id: 'org-1', name: 'Acme' })
    await app.seed.user({ id: 'creator', email: 'c@e.com' })
    const key = await app.seed.apiKey({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'creator',
      label: 'Test Key',
      status: 'active',
      scope: { rateLimitRpm: 60, rateLimitTpm: 100000 },
    })
    expect(key.id).toBe('key-1')
    expect(key.gatewayKeyId).toMatch(/^mock_vk_/)
    expect(app.gateway.calls.createKey).toHaveLength(1)

    const row = await app.db.table('api_keys').where('id', '=', 'key-1').first()
    expect((row as { status: string }).status).toBe('active')
  })

  it('apiKey suspended — pre_freeze_rate_limit JSON 寫入', async () => {
    await app.seed.organization({ id: 'org-1', name: 'Acme' })
    await app.seed.user({ id: 'creator', email: 'c@e.com' })
    await app.seed.apiKey({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'creator',
      label: 'Test Key',
      status: 'suspended_no_credit',
      suspensionReason: 'CREDIT_DEPLETED',
      preFreezeRateLimit: { rpm: 60, tpm: 100000 },
      scope: { rateLimitRpm: 60, rateLimitTpm: 100000 },
    })
    const row = await app.db.table('api_keys').where('id', '=', 'key-1').first()
    expect((row as { suspension_reason: string }).suspension_reason).toBe('CREDIT_DEPLETED')
    expect(JSON.parse((row as { pre_freeze_rate_limit: string }).pre_freeze_rate_limit)).toEqual({
      rpm: 60,
      tpm: 100000,
    })
  })

  it('appModule + moduleSubscription', async () => {
    await app.seed.organization({ id: 'org-1', name: 'Acme' })
    const mod = await app.seed.appModule({ id: 'mod-1', name: 'credit' })
    const sub = await app.seed.moduleSubscription({ orgId: 'org-1', moduleId: mod.id })
    expect(sub.id).toMatch(/.+/)
    const row = await app.db
      .table('module_subscriptions')
      .where('org_id', '=', 'org-1')
      .first()
    expect((row as { status: string }).status).toBe('active')
  })

  it('usageRecord', async () => {
    await app.seed.organization({ id: 'org-1', name: 'Acme' })
    await app.seed.user({ id: 'creator', email: 'c@e.com' })
    const key = await app.seed.apiKey({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'creator',
      label: 'k',
      status: 'active',
    })
    const usage = await app.seed.usageRecord({
      id: 'u-1',
      bifrostLogId: 'b-1',
      orgId: 'org-1',
      apiKeyId: key.id,
      model: 'gpt-4',
      inputTokens: 100,
      outputTokens: 50,
      creditCost: 0.5,
      occurredAt: '2026-04-01T00:00:00.000Z',
    })
    expect(usage.id).toBe('u-1')
    const row = await app.db.table('usage_records').where('id', '=', 'u-1').first()
    expect((row as { credit_cost: number }).credit_cost).toBe(0.5)
  })
})
