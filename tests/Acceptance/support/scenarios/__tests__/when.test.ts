import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { CreditResponse } from '@/Modules/Credit/Application/DTOs/CreditDTO'
import { TestApp } from '../../TestApp'
import { scenario } from '../index'

describe('when.* helpers', () => {
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

  it('userTopsUpCredit 把 result 存入 lastResult', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '0' })
      .when.userTopsUpCredit({
        orgId: 'org-1',
        amount: '500',
        callerUserId: 'admin-1',
      })
      .run()

    const result = app.lastResult.expect<CreditResponse>()
    expect(result.success).toBe(true)
    expect(result.data?.balance).toBe('500')
  })

  it('userDeductsCredit', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '500' })
      .when.userDeductsCredit({ orgId: 'org-1', amount: '100' })
      .run()

    const result = app.lastResult.expect<{ success: boolean; newBalance?: string }>()
    expect(result.success).toBe(true)
    expect(result.newBalance).toBe('400')
  })

  it('userRefundsCredit', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '0' })
      .when.userRefundsCredit({
        orgId: 'org-1',
        amount: '50',
        callerUserId: 'admin-1',
      })
      .run()

    const result = app.lastResult.expect<CreditResponse>()
    expect(result.success).toBe(true)
    expect(result.data?.balance).toBe('50')
  })

  it('applyUsageCharges 走 service', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '1000' })
      .given.activeApiKey({ orgId: 'org-1', keyId: 'key-1', createdByUserId: 'admin-1' })
      .given.usageRecords({
        orgId: 'org-1',
        apiKeyId: 'key-1',
        records: [
          { creditCost: 10, occurredAt: '2026-04-01T00:00:00.000Z' },
          { creditCost: 20, occurredAt: '2026-04-02T00:00:00.000Z' },
        ],
      })
      .when.applyUsageCharges({ orgIds: ['org-1'] })
      .run()

    const result = app.lastResult.expect<{ chargedCount: number; processedOrgs: number }>()
    expect(result.processedOrgs).toBe(1)
    expect(result.chargedCount).toBe(2)
  })
})
