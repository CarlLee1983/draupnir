import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../TestApp'
import { scenario } from '../index'

describe('then.* helpers', () => {
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

  it('creditBalanceIs 通過 + 失敗時錯誤訊息有 expected/actual', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '500' })
      .then.creditBalanceIs('org-1', '500')
      .run()

    await app.reset()
    await app.seed.organization({ id: 'org-2', name: 'B' })
    await app.seed.creditAccount({ orgId: 'org-2', balance: '300' })
    await expect(
      scenario(app).then.creditBalanceIs('org-2', '999').run(),
    ).rejects.toThrow(/expected.*999.*actual.*300/i)
  })

  it('apiKeyIsSuspended / apiKeyIsActive', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-1')
      .given.activeApiKey({ orgId: 'org-1', keyId: 'k-1', createdByUserId: 'admin-1' })
      .then.apiKeyIsActive('k-1')
      .run()

    await app.reset()
    await app.seed.user({ id: 'admin-1', email: 'a@e.com', role: 'admin' })
    await app.seed.organization({ id: 'org-1', name: 'A' })
    await app.seed.apiKey({
      id: 'k-2',
      orgId: 'org-1',
      createdByUserId: 'admin-1',
      label: 'k-2',
      status: 'suspended_no_credit',
      suspensionReason: 'CREDIT_DEPLETED',
      preFreezeRateLimit: { rpm: 60, tpm: 100000 },
    })
    await scenario(app).then.apiKeyIsSuspended('k-2', { reason: 'CREDIT_DEPLETED' }).run()
  })

  it('gatewayKeyRateLimit 找最後一次 updateKey', async () => {
    await app.gateway.createKey({ name: 'k', isActive: true })
    await app.gateway.updateKey('mock_vk_000001', {
      rateLimit: {
        tokenMaxLimit: 0,
        tokenResetDuration: '1h',
        requestMaxLimit: 0,
        requestResetDuration: '1h',
      },
    })

    await scenario(app)
      .then.gatewayKeyRateLimit('mock_vk_000001', { tokenMaxLimit: 0, requestMaxLimit: 0 })
      .run()

    await expect(
      scenario(app)
        .then.gatewayKeyRateLimit('mock_vk_000001', { tokenMaxLimit: 999 })
        .run(),
    ).rejects.toThrow(/tokenMaxLimit/)
  })

  it('domainEventsInclude — 順序與 partial data', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '0' })
      .when.userTopsUpCredit({ orgId: 'org-1', amount: '100', callerUserId: 'admin-1' })
      .then.domainEventsInclude([
        { eventType: 'credit.topped_up', data: { orgId: 'org-1', amount: '100' } },
      ])
      .run()

    await app.reset()
    await expect(
      scenario(app).then.domainEventsInclude([{ eventType: 'never.happens' }]).run(),
    ).rejects.toThrow(/never\.happens/)
  })

  it('creditTransactionExists', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '0' })
      .when.userTopsUpCredit({ orgId: 'org-1', amount: '100', callerUserId: 'admin-1' })
      .then.creditTransactionExists({ orgId: 'org-1', type: 'topup', amount: '100' })
      .run()
  })
})
