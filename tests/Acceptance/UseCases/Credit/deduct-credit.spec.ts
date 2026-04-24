import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { scenario } from '../../support/scenarios'
import { TestApp } from '../../support/TestApp'

describe('Use Case: 扣款 Credit', () => {
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

  it('#4 餘額 500 扣 100 → 餘額 400 且記錄 deduction', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '500' })
      .when.userDeductsCredit({ orgId: 'org-1', amount: '100' })
      .then.creditBalanceIs('org-1', '400')
      .then.creditTransactionExists({ orgId: 'org-1', type: 'deduction', amount: '100' })
      .run()

    expect(app.events.filter((event) => event.eventType === 'credit.balance_low')).toHaveLength(0)
    expect(app.events.filter((event) => event.eventType === 'credit.balance_depleted')).toHaveLength(0)
  })

  it('#5 扣款超過餘額 → 允許進入負餘額並派發 depletion 事件', async () => {
    await app.seed.organization({ id: 'org-2', name: 'Org2' })
    await app.seed.creditAccount({ orgId: 'org-2', balance: '50' })

    await scenario(app).when.userDeductsCredit({ orgId: 'org-2', amount: '100' }).run()

    const result = app.lastResult.expect<{ success: boolean; newBalance?: string }>()
    expect(result.success).toBe(true)
    expect(result.newBalance).toBe('-50')

    const row = await app.db.table('credit_accounts').where('org_id', '=', 'org-2').first()
    expect((row as { balance: string }).balance).toBe('-50')
    expect(app.events.filter((event) => event.eventType === 'credit.balance_depleted')).toHaveLength(1)
  })
})
