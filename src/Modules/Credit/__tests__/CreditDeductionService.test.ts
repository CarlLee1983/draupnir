// src/Modules/Credit/__tests__/CreditDeductionService.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { CreditDeductionService } from '../Domain/Services/CreditDeductionService'
import { CreditAccountRepository } from '../Infrastructure/Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Infrastructure/Repositories/CreditTransactionRepository'
import { CreditAccount } from '../Domain/Aggregates/CreditAccount'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'

describe('CreditDeductionService', () => {
  let db: MemoryDatabaseAccess
  let accountRepo: CreditAccountRepository
  let txRepo: CreditTransactionRepository
  let service: CreditDeductionService

  beforeEach(async () => {
    DomainEventDispatcher.resetForTesting()
    db = new MemoryDatabaseAccess()
    accountRepo = new CreditAccountRepository(db)
    txRepo = new CreditTransactionRepository(db)
    service = new CreditDeductionService()

    const account = CreditAccount.fromDatabase({
      id: 'acc-1', org_id: 'org-1', balance: '1000',
      low_balance_threshold: '100', status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    await accountRepo.save(account)
  })

  afterEach(() => {
    DomainEventDispatcher.resetForTesting()
  })

  it('應正確扣款並建立交易紀錄', async () => {
    const result = await service.deduct({
      db,
      accountRepo,
      transactionRepo: txRepo,
      orgId: 'org-1',
      amount: '50',
      referenceType: 'usage_record',
      referenceId: 'ur-1',
    })

    expect(result.success).toBe(true)
    expect(result.newBalance).toBe('950')
    expect(result.events).toHaveLength(0)
  })

  it('餘額低於閾值應產生 BalanceLow 事件', async () => {
    const result = await service.deduct({
      db,
      accountRepo,
      transactionRepo: txRepo,
      orgId: 'org-1',
      amount: '950',
      referenceType: 'usage_record',
      referenceId: 'ur-2',
    })

    expect(result.success).toBe(true)
    expect(result.newBalance).toBe('50')
    const lowEvent = result.events.find((e) => e.eventType === 'credit.balance_low')
    expect(lowEvent).toBeDefined()
  })

  it('餘額耗盡應產生 BalanceDepleted 事件', async () => {
    const result = await service.deduct({
      db,
      accountRepo,
      transactionRepo: txRepo,
      orgId: 'org-1',
      amount: '1000',
      referenceType: 'usage_record',
      referenceId: 'ur-3',
    })

    expect(result.success).toBe(true)
    expect(result.newBalance).toBe('0')
    const depletedEvent = result.events.find((e) => e.eventType === 'credit.balance_depleted')
    expect(depletedEvent).toBeDefined()
  })

  it('帳戶不存在應回傳失敗', async () => {
    const result = await service.deduct({
      db,
      accountRepo,
      transactionRepo: txRepo,
      orgId: 'nonexistent',
      amount: '10',
    })

    expect(result.success).toBe(false)
  })
})
