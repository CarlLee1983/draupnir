import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { ApplyUsageChargesService } from '../Application/Services/ApplyUsageChargesService'
import { DeductCreditService } from '../Application/Services/DeductCreditService'
import { CreditAccount } from '../Domain/Aggregates/CreditAccount'
import { CreditAccountRepository } from '../Infrastructure/Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Infrastructure/Repositories/CreditTransactionRepository'

describe('ApplyUsageChargesService', () => {
  let db: MemoryDatabaseAccess
  let accountRepo: CreditAccountRepository
  let txRepo: CreditTransactionRepository
  let deductCreditService: DeductCreditService
  let service: ApplyUsageChargesService

  beforeEach(async () => {
    DomainEventDispatcher.resetForTesting()
    db = new MemoryDatabaseAccess()
    accountRepo = new CreditAccountRepository(db)
    txRepo = new CreditTransactionRepository(db)
    deductCreditService = new DeductCreditService(accountRepo, txRepo, db)
    service = new ApplyUsageChargesService(accountRepo, txRepo, deductCreditService, db)

    await accountRepo.save(
      CreditAccount.fromDatabase({
        id: 'acc-1',
        org_id: 'org-1',
        balance: '1000',
        low_balance_threshold: '100',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    )

    await db.table('usage_records').insert({
      id: 'usage-1',
      bifrost_log_id: 'log-1',
      api_key_id: 'key-1',
      org_id: 'org-1',
      model: 'gpt-4',
      provider: 'openai',
      input_tokens: 10,
      output_tokens: 5,
      credit_cost: 100,
      latency_ms: 200,
      status: 'success',
      occurred_at: '2026-04-10T10:00:00Z',
      created_at: '2026-04-10T10:00:10Z',
    })
    await db.table('usage_records').insert({
      id: 'usage-2',
      bifrost_log_id: 'log-2',
      api_key_id: 'key-1',
      org_id: 'org-1',
      model: 'gpt-4',
      provider: 'openai',
      input_tokens: 20,
      output_tokens: 10,
      credit_cost: 50,
      latency_ms: 220,
      status: 'success',
      occurred_at: '2026-04-10T11:00:00Z',
      created_at: '2026-04-10T11:00:10Z',
    })

    await deductCreditService.execute({
      orgId: 'org-1',
      amount: '100',
      referenceType: 'usage_record',
      referenceId: 'usage-1',
      description: 'seed existing charge',
    })
  })

  afterEach(() => {
    DomainEventDispatcher.resetForTesting()
  })

  it('charges only usage rows that have not already been deducted', async () => {
    const result = await service.execute({
      orgIds: ['org-1'],
      startTime: '2026-04-10T00:00:00Z',
      endTime: '2026-04-10T23:59:59Z',
    })

    expect(result).toEqual({
      processedOrgs: 1,
      chargedCount: 1,
      skippedCount: 1,
      missingAccountOrgIds: [],
    })

    const account = await accountRepo.findByOrgId('org-1')
    expect(account?.balance).toBe('850')

    const usageTransactions = (await txRepo.findByAccountId('acc-1'))
      .filter((tx) => tx.referenceType === 'usage_record')
      .map((tx) => tx.referenceId)
      .sort()

    expect(usageTransactions).toEqual(['usage-1', 'usage-2'])
  })

  it('is idempotent when the same range is applied twice', async () => {
    await service.execute({
      orgIds: ['org-1'],
      startTime: '2026-04-10T00:00:00Z',
      endTime: '2026-04-10T23:59:59Z',
    })

    const rerun = await service.execute({
      orgIds: ['org-1'],
      startTime: '2026-04-10T00:00:00Z',
      endTime: '2026-04-10T23:59:59Z',
    })

    expect(rerun).toEqual({
      processedOrgs: 1,
      chargedCount: 0,
      skippedCount: 2,
      missingAccountOrgIds: [],
    })

    const account = await accountRepo.findByOrgId('org-1')
    expect(account?.balance).toBe('850')
  })
})
