import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { scenario } from '../../support/scenarios'
import { TestApp } from '../../support/TestApp'

describe('Use Case: 扣款至餘額耗盡 → 自動封鎖該 Org 所有 active Keys', () => {
  let app: TestApp
  let key1Gateway: string
  let key2Gateway: string

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
    const k1 = await app.seed.apiKey({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'admin-1',
      label: 'k1',
      status: 'active',
      scope: { rateLimitRpm: 60, rateLimitTpm: 100000 },
    })
    const k2 = await app.seed.apiKey({
      id: 'key-2',
      orgId: 'org-1',
      createdByUserId: 'admin-1',
      label: 'k2',
      status: 'active',
      scope: { rateLimitRpm: 30, rateLimitTpm: 50000 },
    })
    key1Gateway = k1.gatewayKeyId
    key2Gateway = k2.gatewayKeyId
  })

  it('#6 餘額 100 扣 100 → 兩支 active key 均 suspend,Gateway rate limit 歸零,派發 credit.balance_depleted', async () => {
    await scenario(app)
      .when.userDeductsCredit({ orgId: 'org-1', amount: '100' })
      .then.creditBalanceIs('org-1', '0')
      .then.apiKeyIsSuspended('key-1', { reason: 'CREDIT_DEPLETED' })
      .then.apiKeyIsSuspended('key-2', { reason: 'CREDIT_DEPLETED' })
      .then.gatewayKeyRateLimit(key1Gateway, {
        tokenMaxLimit: 0,
        requestMaxLimit: 0,
        tokenResetDuration: '1h',
        requestResetDuration: '1h',
      })
      .then.gatewayKeyRateLimit(key2Gateway, { tokenMaxLimit: 0, requestMaxLimit: 0 })
      .then.domainEventsInclude([
        { eventType: 'credit.balance_depleted', data: { orgId: 'org-1' } },
      ])
      .run()

    const k1 = (await app.db.table('api_keys').where('id', '=', 'key-1').first()) as {
      pre_freeze_rate_limit: string
    }
    expect(JSON.parse(k1.pre_freeze_rate_limit)).toEqual({ rpm: 60, tpm: 100000 })
  })
})
