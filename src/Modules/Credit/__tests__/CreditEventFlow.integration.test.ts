// src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { CreditDeductionService } from '../Domain/Services/CreditDeductionService'
import { TopUpCreditService } from '../Application/Services/TopUpCreditService'
import { HandleBalanceDepletedService } from '../Application/Services/HandleBalanceDepletedService'
import { HandleCreditToppedUpService } from '../Application/Services/HandleCreditToppedUpService'
import { CreditAccountRepository } from '../Infrastructure/Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Infrastructure/Repositories/CreditTransactionRepository'
import { CreditAccount } from '../Domain/Aggregates/CreditAccount'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import { KeyScope } from '@/Modules/ApiKey/Domain/ValueObjects/KeyScope'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

describe('Credit Event Flow 整合測試', () => {
  let db: MemoryDatabaseAccess
  let accountRepo: CreditAccountRepository
  let txRepo: CreditTransactionRepository
  let apiKeyRepo: IApiKeyRepository
  let bifrostClient: BifrostClient
  let deductionService: CreditDeductionService
  let topUpService: TopUpCreditService

  beforeEach(async () => {
    DomainEventDispatcher.resetForTesting()
    db = new MemoryDatabaseAccess()
    accountRepo = new CreditAccountRepository(db)
    txRepo = new CreditTransactionRepository(db)
    deductionService = new CreditDeductionService()
    topUpService = new TopUpCreditService(accountRepo, txRepo, db)

    // Mock ApiKey repo
    apiKeyRepo = {
      findActiveByOrgId: vi.fn(),
      findSuspendedByOrgId: vi.fn(),
      update: vi.fn(),
    } as unknown as IApiKeyRepository

    bifrostClient = {
      updateVirtualKey: vi.fn().mockResolvedValue({}),
    } as unknown as BifrostClient

    // 註冊 event handlers（模擬 CreditServiceProvider.boot()）
    const dispatcher = DomainEventDispatcher.getInstance()
    const depletedHandler = new HandleBalanceDepletedService(apiKeyRepo, bifrostClient)
    const toppedUpHandler = new HandleCreditToppedUpService(apiKeyRepo, bifrostClient)

    dispatcher.on('credit.balance_depleted', async (event) => {
      await depletedHandler.execute(event.data.orgId as string)
    })
    dispatcher.on('credit.topped_up', async (event) => {
      await toppedUpHandler.execute(event.data.orgId as string)
    })

    // 建立帳戶
    const account = CreditAccount.fromDatabase({
      id: 'acc-1', org_id: 'org-1', balance: '100',
      low_balance_threshold: '50', status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    await accountRepo.save(account)
  })

  afterEach(() => {
    DomainEventDispatcher.resetForTesting()
  })

  it('扣光餘額 → 自動封鎖 Key → 充值 → 自動恢復 Key', async () => {
    // 準備 active key
    const mockKey = await ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Test Key',
      bifrostVirtualKeyId: 'vkey-1',
      rawKey: 'drp_sk_test_12345678901234567890123456789012',
      scope: KeyScope.fromJSON({ rate_limit_rpm: 60, rate_limit_tpm: 100000, allowed_models: ['*'] }),
    })
    const activeKey = mockKey.activate()
    ;(apiKeyRepo.findActiveByOrgId as any).mockResolvedValue([activeKey])

    // Step 1: 扣光餘額 → 應觸發 BalanceDepleted → 自動封鎖 Key
    const deductResult = await deductionService.deduct({
      db,
      accountRepo,
      transactionRepo: txRepo,
      orgId: 'org-1',
      amount: '100',
    })

    expect(deductResult.success).toBe(true)
    expect(deductResult.newBalance).toBe('0')
    // HandleBalanceDepletedService 應被自動呼叫
    expect(apiKeyRepo.update).toHaveBeenCalled()
    expect(bifrostClient.updateVirtualKey).toHaveBeenCalledWith('vkey-1', expect.objectContaining({
      rate_limit: expect.objectContaining({ token_max_limit: 0 }),
    }))

    // Reset mocks for topup phase
    vi.clearAllMocks()

    // 準備 suspended key（模擬封鎖後的狀態）
    const suspendedKey = activeKey.suspend('CREDIT_DEPLETED', { rpm: 60, tpm: 100000 })
    ;(apiKeyRepo.findSuspendedByOrgId as any).mockResolvedValue([suspendedKey])

    // Step 2: 充值 → 應觸發 CreditToppedUp → 自動恢復 Key
    const topUpResult = await topUpService.execute({
      orgId: 'org-1',
      amount: '500',
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })

    expect(topUpResult.success).toBe(true)
    expect(topUpResult.data?.balance).toBe('500')
    // HandleCreditToppedUpService 應被自動呼叫
    expect(bifrostClient.updateVirtualKey).toHaveBeenCalledWith('vkey-1', expect.objectContaining({
      rate_limit: expect.objectContaining({ token_max_limit: 100000 }),
    }))
    expect(apiKeyRepo.update).toHaveBeenCalled()
  })

  it('餘額低於閾值但未耗盡時不應封鎖 Key', async () => {
    ;(apiKeyRepo.findActiveByOrgId as any).mockResolvedValue([])

    const result = await deductionService.deduct({
      db,
      accountRepo,
      transactionRepo: txRepo,
      orgId: 'org-1',
      amount: '80',
    })

    expect(result.success).toBe(true)
    expect(result.newBalance).toBe('20')
    // BalanceLow 事件觸發但沒有 handler，不應呼叫 Bifrost
    expect(bifrostClient.updateVirtualKey).not.toHaveBeenCalled()
  })
})
