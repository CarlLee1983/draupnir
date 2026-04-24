import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { scenario } from '../../support/scenarios'
import { TestApp } from '../../support/TestApp'

describe('Use Case: ApplyUsageCharges 批次扣費', () => {
  let app: TestApp
  let keyGateway: string

  beforeAll(async () => {
    app = await TestApp.boot()
  })

  afterAll(async () => {
    await app.shutdown()
  })

  beforeEach(async () => {
    await app.reset()
    await app.seed.user({ id: 'admin-1', email: 'a@e.com', role: 'admin' })
    await app.seed.organization({ id: 'org-1', name: 'Org1' })
    await app.seed.creditAccount({ orgId: 'org-1', balance: '100' })
    const key = await app.seed.apiKey({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'admin-1',
      label: 'k1',
      status: 'active',
      scope: { rateLimitRpm: 60, rateLimitTpm: 100000 },
    })
    keyGateway = key.gatewayKeyId
  })

  it('#9 三筆 usage 共 100 → 全部扣完、key 被自動 suspend、gateway rate limit 歸零', async () => {
    await scenario(app)
      .given.usageRecords({
        orgId: 'org-1',
        apiKeyId: 'key-1',
        records: [
          { creditCost: 30, occurredAt: '2026-04-01T00:00:00.000Z' },
          { creditCost: 30, occurredAt: '2026-04-02T00:00:00.000Z' },
          { creditCost: 40, occurredAt: '2026-04-03T00:00:00.000Z' },
        ],
      })
      .when.applyUsageCharges({ orgIds: ['org-1'] })
      .then.creditBalanceIs('org-1', '0')
      .then.apiKeyIsSuspended('key-1', { reason: 'CREDIT_DEPLETED' })
      .then.gatewayKeyRateLimit(keyGateway, { tokenMaxLimit: 0, requestMaxLimit: 0 })
      .then.domainEventsInclude([
        { eventType: 'credit.balance_depleted', data: { orgId: 'org-1' } },
      ])
      .run()

    const result = app.lastResult.expect<{
      processedOrgs: number
      chargedCount: number
      skippedCount: number
    }>()
    expect(result.processedOrgs).toBe(1)
    expect(result.chargedCount).toBe(3)
    expect(result.skippedCount).toBe(0)
  })

  it('idempotency — 第二次跑相同 usage 不重複扣', async () => {
    await app.seed.usageRecord({
      id: 'u-1',
      bifrostLogId: 'b-1',
      orgId: 'org-1',
      apiKeyId: 'key-1',
      model: 'gpt-4',
      creditCost: 20,
      occurredAt: '2026-04-01T00:00:00.000Z',
    })

    await scenario(app)
      .when.applyUsageCharges({ orgIds: ['org-1'] })
      .then.creditBalanceIs('org-1', '80')
      .run()

    await scenario(app)
      .when.applyUsageCharges({ orgIds: ['org-1'] })
      .then.creditBalanceIs('org-1', '80')
      .run()

    const result = app.lastResult.expect<{ chargedCount: number; skippedCount: number }>()
    expect(result.chargedCount).toBe(0)
    expect(result.skippedCount).toBe(1)
  })

  it('未存在帳戶的 org → 進入 missingAccountOrgIds', async () => {
    await scenario(app).when.applyUsageCharges({ orgIds: ['org-not-exists'] }).run()
    const result = app.lastResult.expect<{
      missingAccountOrgIds: readonly string[]
      chargedCount: number
    }>()
    expect(result.missingAccountOrgIds).toEqual(['org-not-exists'])
    expect(result.chargedCount).toBe(0)
  })
})
