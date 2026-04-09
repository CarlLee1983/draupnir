// src/Modules/Credit/__tests__/HandleCreditToppedUpService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HandleCreditToppedUpService } from '../Application/Services/HandleCreditToppedUpService'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import { KeyScope } from '@/Modules/ApiKey/Domain/ValueObjects/KeyScope'

describe('HandleCreditToppedUpService', () => {
  let apiKeyRepo: IApiKeyRepository
  let bifrostClient: BifrostClient
  let service: HandleCreditToppedUpService

  beforeEach(() => {
    apiKeyRepo = {
      findSuspendedByOrgId: vi.fn(),
      update: vi.fn(),
    } as unknown as IApiKeyRepository

    bifrostClient = {
      updateVirtualKey: vi.fn().mockResolvedValue({}),
    } as unknown as BifrostClient

    service = new HandleCreditToppedUpService(apiKeyRepo, bifrostClient)
  })

  it('應恢復所有因餘額不足而凍結的 keys', async () => {
    const mockKey = await ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Test Key',
      bifrostVirtualKeyId: 'vkey-1',
      rawKey: 'drp_sk_test_12345678901234567890123456789012',
      scope: KeyScope.fromJSON({ rate_limit_rpm: 60, rate_limit_tpm: 100000, allowed_models: ['*'] }),
    })
    const suspended = mockKey.activate().suspend('CREDIT_DEPLETED', { rpm: 60, tpm: 100000 })

    ;(apiKeyRepo.findSuspendedByOrgId as any).mockResolvedValue([suspended])

    const result = await service.execute('org-1')

    expect(result.processed).toBe(1)
    expect(result.failed).toBe(0)
    expect(bifrostClient.updateVirtualKey).toHaveBeenCalledWith('vkey-1', expect.objectContaining({
      rate_limit: expect.objectContaining({
        token_max_limit: 100000,
      }),
    }))
    expect(apiKeyRepo.update).toHaveBeenCalled()
  })

  it('無凍結 keys 時應直接回傳零', async () => {
    ;(apiKeyRepo.findSuspendedByOrgId as any).mockResolvedValue([])

    const result = await service.execute('org-1')

    expect(result.processed).toBe(0)
    expect(result.failed).toBe(0)
    expect(bifrostClient.updateVirtualKey).not.toHaveBeenCalled()
  })

  it('Bifrost 恢復失敗時應記錄失敗但不清除本地凍結狀態', async () => {
    const mockKey = await ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Test Key',
      bifrostVirtualKeyId: 'vkey-1',
      rawKey: 'drp_sk_test_12345678901234567890123456789012',
      scope: KeyScope.fromJSON({ rate_limit_rpm: 60, rate_limit_tpm: 100000, allowed_models: ['*'] }),
    })
    const suspended = mockKey.activate().suspend('CREDIT_DEPLETED', { rpm: 60, tpm: 100000 })

    ;(apiKeyRepo.findSuspendedByOrgId as any).mockResolvedValue([suspended])
    ;(bifrostClient.updateVirtualKey as any).mockRejectedValue(new Error('Bifrost error'))

    const result = await service.execute('org-1')

    expect(result.processed).toBe(0)
    expect(result.failed).toBe(1)
    // 本地狀態不應被 update（unsuspend 不應被呼叫）
    expect(apiKeyRepo.update).not.toHaveBeenCalled()
  })
})
