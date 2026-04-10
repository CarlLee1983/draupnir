// src/Modules/Credit/__tests__/RefundCreditService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { RefundCreditService } from '../Application/Services/RefundCreditService'
import { CreditAccountRepository } from '../Infrastructure/Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Infrastructure/Repositories/CreditTransactionRepository'
import { CreditAccount } from '../Domain/Aggregates/CreditAccount'

describe('RefundCreditService', () => {
  let db: MemoryDatabaseAccess
  let service: RefundCreditService
  let txRepo: CreditTransactionRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    const accountRepo = new CreditAccountRepository(db)
    txRepo = new CreditTransactionRepository(db)
    service = new RefundCreditService(accountRepo, txRepo, db)

    const account = CreditAccount.fromDatabase({
      id: 'acc-1',
      org_id: 'org-1',
      balance: '500',
      low_balance_threshold: '100',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    await accountRepo.save(account)
  })

  it('應成功退款並增加餘額', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      amount: '200',
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })
    expect(result.success).toBe(true)
    expect(result.data?.balance).toBe('700')
  })

  it('退款金額為 0 或負數應拒絕', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      amount: '0',
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_AMOUNT')
  })

  it('帳戶不存在應回傳失敗', async () => {
    const result = await service.execute({
      orgId: 'org-nonexistent',
      amount: '100',
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('ACCOUNT_NOT_FOUND')
  })

  it('退款交易紀錄類型應為 refund', async () => {
    await service.execute({
      orgId: 'org-1',
      amount: '100',
      referenceType: 'order',
      referenceId: 'order-123',
      description: '訂單退款',
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })

    const transactions = await txRepo.findByAccountId('acc-1', 10, 0)
    expect(transactions).toHaveLength(1)
    expect(transactions[0].type).toBe('refund')
    expect(transactions[0].referenceType).toBe('order')
    expect(transactions[0].referenceId).toBe('order-123')
  })
})
