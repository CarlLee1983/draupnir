// src/Modules/Credit/__tests__/GetBalanceService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { GetBalanceService } from '../Application/Services/GetBalanceService'
import { CreditAccountRepository } from '../Infrastructure/Repositories/CreditAccountRepository'
import { CreditAccount } from '../Domain/Aggregates/CreditAccount'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'

describe('GetBalanceService', () => {
  let db: MemoryDatabaseAccess
  let accountRepo: CreditAccountRepository
  let orgAuth: OrgAuthorizationHelper
  let service: GetBalanceService

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    accountRepo = new CreditAccountRepository(db)
    orgAuth = {
      requireOrgMembership: vi.fn().mockResolvedValue({ authorized: true }),
    } as unknown as OrgAuthorizationHelper
    service = new GetBalanceService(accountRepo, orgAuth)

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

  it('應正確回傳餘額', async () => {
    const result = await service.execute('org-1', 'user-1', 'user')
    expect(result.success).toBe(true)
    expect(result.data?.balance).toBe('500')
  })

  it('非組織成員應被拒絕', async () => {
    ;(orgAuth.requireOrgMembership as any).mockResolvedValueOnce({ authorized: false })
    const result = await service.execute('org-1', 'stranger-1', 'user')
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })

  it('帳戶不存在應回傳 0 餘額', async () => {
    const result = await service.execute('org-new', 'user-1', 'user')
    expect(result.success).toBe(true)
    expect(result.data?.balance).toBe('0')
  })
})
