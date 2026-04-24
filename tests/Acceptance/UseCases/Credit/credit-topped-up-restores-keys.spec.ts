import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { scenario } from '../../support/scenarios'
import { TestApp } from '../../support/TestApp'

describe('Use Case: 充值後 → 自動恢復所有 suspended Keys', () => {
  let app: TestApp
  let key1Gateway: string

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
    await app.seed.creditAccount({ orgId: 'org-1', balance: '0' })
    const k1 = await app.seed.apiKey({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'admin-1',
      label: 'k1',
      status: 'suspended_no_credit',
      suspensionReason: 'CREDIT_DEPLETED',
      preFreezeRateLimit: { rpm: 60, tpm: 100000 },
      scope: { rateLimitRpm: 60, rateLimitTpm: 100000 },
    })
    key1Gateway = k1.gatewayKeyId
  })

  it('#7 admin 充值 500 → suspended key 恢復為 active 且 Gateway rate limit 還原為 pre-freeze 值', async () => {
    await scenario(app)
      .when.userTopsUpCredit({ orgId: 'org-1', amount: '500', callerUserId: 'admin-1' })
      .then.creditBalanceIs('org-1', '500')
      .then.apiKeyIsActive('key-1')
      .then.gatewayKeyRateLimit(key1Gateway, {
        tokenMaxLimit: 100000,
        requestMaxLimit: 60,
      })
      .then.domainEventsInclude([{ eventType: 'credit.topped_up', data: { orgId: 'org-1' } }])
      .run()

    const row = (await app.db.table('api_keys').where('id', '=', 'key-1').first()) as {
      pre_freeze_rate_limit: string | null
      suspension_reason: string | null
      suspended_at: string | null
    }
    expect(row.pre_freeze_rate_limit).toBeNull()
    expect(row.suspension_reason).toBeNull()
    expect(row.suspended_at).toBeNull()
  })
})
