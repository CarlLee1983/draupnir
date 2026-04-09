// src/Modules/Credit/__tests__/TopUpCreditService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { TopUpCreditService } from '../Application/Services/TopUpCreditService'
import { CreditAccountRepository } from '../Infrastructure/Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Infrastructure/Repositories/CreditTransactionRepository'
import { CreditAccount } from '../Domain/Aggregates/CreditAccount'

describe('TopUpCreditService', () => {
  let db: MemoryDatabaseAccess
  let service: TopUpCreditService

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    const accountRepo = new CreditAccountRepository(db)
    const txRepo = new CreditTransactionRepository(db)
    service = new TopUpCreditService(accountRepo, txRepo, db)

    const account = CreditAccount.create('acc-1', 'org-1')
    await accountRepo.save(account)
  })

  it('應成功充值', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      amount: '500',
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })
    expect(result.success).toBe(true)
    expect(result.data?.balance).toBe('500')
  })

  it('充值金額為 0 或負數應拒絕', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      amount: '0',
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })
    expect(result.success).toBe(false)
  })

  it('帳戶不存在應自動建立', async () => {
    const result = await service.execute({
      orgId: 'org-new',
      amount: '100',
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })
    expect(result.success).toBe(true)
    expect(result.data?.balance).toBe('100')
  })
})
