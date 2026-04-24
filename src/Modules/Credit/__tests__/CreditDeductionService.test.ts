// src/Modules/Credit/__tests__/DeductCreditService.test.ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { DeductCreditService } from '../Application/Services/DeductCreditService'
import { CreditAccount } from '../Domain/Aggregates/CreditAccount'
import type { CreditTransaction } from '../Domain/Entities/CreditTransaction'
import type { ICreditAccountRepository } from '../Domain/Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../Domain/Repositories/ICreditTransactionRepository'
import { CreditAccountRepository } from '../Infrastructure/Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Infrastructure/Repositories/CreditTransactionRepository'

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

  it('duplicate usage deduction unique conflict should be treated as noop success', async () => {
    const account = CreditAccount.fromDatabase({
      id: 'acc-dup',
      org_id: 'org-dup',
      balance: '1000',
      low_balance_threshold: '100',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    class FakeAccountRepo implements ICreditAccountRepository {
      constructor(private readonly current: CreditAccount) {}

      async findById(): Promise<CreditAccount | null> {
        return this.current
      }

      async findByOrgId(): Promise<CreditAccount | null> {
        return this.current
      }

      async save(): Promise<void> {}

      async update(): Promise<void> {}

      withTransaction(_tx: IDatabaseAccess): ICreditAccountRepository {
        return this
      }
    }

    class DuplicateTxRepo implements ICreditTransactionRepository {
      async save(): Promise<void> {
        throw new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: uniq_credit_usage_deduction')
      }

      async findByAccountId(): Promise<CreditTransaction[]> {
        return []
      }

      async countByAccountId(): Promise<number> {
        return 0
      }

      async findByAccountIdAndTypes(): Promise<CreditTransaction[]> {
        return []
      }

      async findReferenceIdsByAccountAndReferenceType(): Promise<readonly string[]> {
        return []
      }

      withTransaction(_tx: IDatabaseAccess): ICreditTransactionRepository {
        return this
      }
    }

    const noopService = new DeductCreditService(
      new FakeAccountRepo(account),
      new DuplicateTxRepo(),
      {
        table() {
          throw new Error('not implemented')
        },
        async transaction<T>(fn: (tx: IDatabaseAccess) => Promise<T>): Promise<T> {
          return fn(this)
        },
      },
    )

    const result = await noopService.execute({
      orgId: 'org-dup',
      amount: '100',
      referenceType: 'usage_record',
      referenceId: 'usage-dup',
    })

    expect(result).toEqual({ success: true, newBalance: '1000' })
  })
})
