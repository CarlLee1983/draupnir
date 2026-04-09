// src/Modules/Credit/__tests__/GetTransactionHistoryService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { GetTransactionHistoryService } from '../Application/Services/GetTransactionHistoryService'
import { CreditAccountRepository } from '../Infrastructure/Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Infrastructure/Repositories/CreditTransactionRepository'
import { CreditAccount } from '../Domain/Aggregates/CreditAccount'
import { CreditTransaction } from '../Domain/Entities/CreditTransaction'
import { TransactionType } from '../Domain/ValueObjects/TransactionType'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'

describe('GetTransactionHistoryService', () => {
  let db: MemoryDatabaseAccess
  let accountRepo: CreditAccountRepository
  let txRepo: CreditTransactionRepository
  let orgAuth: OrgAuthorizationHelper
  let service: GetTransactionHistoryService

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    accountRepo = new CreditAccountRepository(db)
    txRepo = new CreditTransactionRepository(db)

    orgAuth = {
      requireOrgMembership: vi.fn().mockResolvedValue({ authorized: true }),
    } as unknown as OrgAuthorizationHelper

    service = new GetTransactionHistoryService(accountRepo, txRepo, orgAuth)

    const account = CreditAccount.fromDatabase({
      id: 'acc-1', org_id: 'org-1', balance: '1000',
      low_balance_threshold: '100', status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    await accountRepo.save(account)

    // 建立幾筆交易紀錄
    for (let i = 0; i < 3; i++) {
      const tx = CreditTransaction.create({
        id: `tx-${i}`,
        creditAccountId: 'acc-1',
        type: TransactionType.topup(),
        amount: '100',
        balanceAfter: `${(i + 1) * 100}`,
        description: `充值 #${i}`,
      })
      await txRepo.save(tx)
    }
  })

  it('應回傳交易紀錄與分頁資訊', async () => {
    const result = await service.execute('org-1', 'user-1', 'member')

    expect(result.success).toBe(true)
    expect(result.data?.transactions).toHaveLength(3)
    expect(result.data?.total).toBe(3)
    expect(result.data?.page).toBe(1)
    expect(result.data?.limit).toBe(20)
  })

  it('帳戶不存在應回傳空列表', async () => {
    const result = await service.execute('org-nonexistent', 'user-1', 'admin')

    expect(result.success).toBe(true)
    expect(result.data?.transactions).toHaveLength(0)
    expect(result.data?.total).toBe(0)
  })

  it('非組織成員應拒絕存取', async () => {
    ;(orgAuth.requireOrgMembership as any).mockResolvedValue({ authorized: false })

    const result = await service.execute('org-1', 'outsider', 'member')

    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })

  it('應支援分頁', async () => {
    const result = await service.execute('org-1', 'user-1', 'member', 1, 2)

    expect(result.success).toBe(true)
    expect(result.data?.transactions).toHaveLength(2)
    expect(result.data?.total).toBe(3)
    expect(result.data?.limit).toBe(2)
  })
})
