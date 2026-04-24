import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { scenario } from '../../support/scenarios'
import { TestApp } from '../../support/TestApp'

describe('Use Case: 退款 Credit', () => {
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

  it('#8 admin 退款 50 → 餘額回填且記錄一筆 refund 交易', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '100' })
      .when.userRefundsCredit({
        orgId: 'org-1',
        amount: '50',
        callerUserId: 'admin-1',
        referenceType: 'usage_record',
        referenceId: 'usage-x',
        description: 'Test refund',
      })
      .then.creditBalanceIs('org-1', '150')
      .then.creditTransactionExists({
        orgId: 'org-1',
        type: 'refund',
        amount: '50',
        referenceType: 'usage_record',
        referenceId: 'usage-x',
      })
      .run()
  })

  it('退款金額 ≤ 0 → 拒絕、餘額不變', async () => {
    await app.seed.organization({ id: 'org-2', name: 'Org2' })
    await app.seed.creditAccount({ orgId: 'org-2', balance: '100' })

    await scenario(app)
      .when.userRefundsCredit({ orgId: 'org-2', amount: '0', callerUserId: 'admin-1' })
      .then.creditBalanceIs('org-2', '100')
      .run()

    const result = app.lastResult.expect<{ success: boolean; error?: string }>()
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_AMOUNT')
  })

  it('退款不存在帳戶 → ACCOUNT_NOT_FOUND', async () => {
    await app.seed.organization({ id: 'org-3', name: 'Org3' })

    await scenario(app)
      .when.userRefundsCredit({ orgId: 'org-3', amount: '50', callerUserId: 'admin-1' })
      .run()

    const result = app.lastResult.expect<{ success: boolean; error?: string }>()
    expect(result.success).toBe(false)
    expect(result.error).toBe('ACCOUNT_NOT_FOUND')
  })
})
