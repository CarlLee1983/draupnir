// src/Modules/Credit/__tests__/DeductCreditService.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { DeductCreditService } from '../Application/Services/DeductCreditService'
import { CreditAccountRepository } from '../Infrastructure/Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Infrastructure/Repositories/CreditTransactionRepository'
import { CreditAccount } from '../Domain/Aggregates/CreditAccount'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'

describe('DeductCreditService', () => {
  let db: MemoryDatabaseAccess
  let accountRepo: CreditAccountRepository
  let txRepo: CreditTransactionRepository
  let service: DeductCreditService

  beforeEach(async () => {
    DomainEventDispatcher.resetForTesting()
    db = new MemoryDatabaseAccess()
    accountRepo = new CreditAccountRepository(db)
    txRepo = new CreditTransactionRepository(db)
    service = new DeductCreditService(accountRepo, txRepo, db)

    const account = CreditAccount.fromDatabase({
      id: 'acc-1',
      org_id: 'org-1',
      balance: '1000',
      low_balance_threshold: '100',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    await accountRepo.save(account)
  })

  afterEach(() => {
    DomainEventDispatcher.resetForTesting()
  })

  it('應正確扣款並建立交易紀錄', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      amount: '50',
      referenceType: 'usage_record',
      referenceId: 'ur-1',
    })

    expect(result.success).toBe(true)
    expect(result.newBalance).toBe('950')
  })

  it('餘額低於閾值應派送 BalanceLow 事件', async () => {
    const dispatched: string[] = []
    DomainEventDispatcher.getInstance().on('credit.balance_low', async (event) => {
      dispatched.push(event.eventType)
    })

    const result = await service.execute({
      orgId: 'org-1',
      amount: '950',
      referenceType: 'usage_record',
      referenceId: 'ur-2',
    })

    expect(result.success).toBe(true)
    expect(result.newBalance).toBe('50')
    expect(dispatched).toContain('credit.balance_low')
  })

  it('餘額耗盡應派送 BalanceDepleted 事件', async () => {
    const dispatched: string[] = []
    DomainEventDispatcher.getInstance().on('credit.balance_depleted', async (event) => {
      dispatched.push(event.eventType)
    })

    const result = await service.execute({
      orgId: 'org-1',
      amount: '1000',
      referenceType: 'usage_record',
      referenceId: 'ur-3',
    })

    expect(result.success).toBe(true)
    expect(result.newBalance).toBe('0')
    expect(dispatched).toContain('credit.balance_depleted')
  })

  it('帳戶不存在應回傳失敗', async () => {
    const result = await service.execute({
      orgId: 'nonexistent',
      amount: '10',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('ACCOUNT_NOT_FOUND')
  })
})
