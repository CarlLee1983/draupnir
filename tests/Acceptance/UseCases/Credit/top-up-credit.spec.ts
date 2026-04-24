import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { TopUpCreditService } from '@/Modules/Credit/Application/Services/TopUpCreditService'
import { scenario } from '../../support/scenarios'
import { TestApp } from '../../support/TestApp'

describe('Use Case: 充值 Credit', () => {
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

  it('#1 admin 充值 500 → 餘額更新且記錄一筆 topup 交易,並派發 credit.topped_up', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '0' })
      .when.userTopsUpCredit({ orgId: 'org-1', amount: '500', callerUserId: 'admin-1' })
      .then.creditBalanceIs('org-1', '500')
      .then.creditTransactionExists({ orgId: 'org-1', type: 'topup', amount: '500' })
      .then.domainEventsInclude([
        { eventType: 'credit.topped_up', data: { orgId: 'org-1', amount: '500' } },
      ])
      .run()
  })

  it('#2 充值金額為 0 → 拒絕、餘額不變、無交易、無事件', async () => {
    await app.seed.organization({ id: 'org-2', name: 'Org2' })
    await app.seed.creditAccount({ orgId: 'org-2', balance: '100' })

    const service = app.container.make('topUpCreditService') as TopUpCreditService
    const result = await service.execute({
      orgId: 'org-2',
      amount: '0',
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_AMOUNT')

    const acc = await app.db.table('credit_accounts').where('org_id', '=', 'org-2').first()
    expect((acc as { balance: string }).balance).toBe('100')

    const txs = await app.db
      .table('credit_transactions')
      .where('credit_account_id', '=', (acc as { id: string }).id)
      .select()
    expect(txs).toHaveLength(0)

    expect(app.events.filter((event) => event.eventType === 'credit.topped_up')).toHaveLength(0)
  })

  it('#3 充值到不存在帳戶 → 自動建立並寫入餘額', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-3')
      .when.userTopsUpCredit({ orgId: 'org-3', amount: '300', callerUserId: 'admin-1' })
      .then.creditBalanceIs('org-3', '300')
      .then.creditTransactionExists({ orgId: 'org-3', type: 'topup', amount: '300' })
      .run()
  })
})
