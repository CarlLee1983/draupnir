// src/Modules/Credit/__tests__/HandleBalanceDepletedService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HandleBalanceDepletedService } from '../Application/Services/HandleBalanceDepletedService'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import { KeyScope } from '@/Modules/ApiKey/Domain/ValueObjects/KeyScope'

describe('HandleBalanceDepletedService', () => {
  let apiKeyRepo: IApiKeyRepository
  let bifrostClient: BifrostClient
  let service: HandleBalanceDepletedService

  beforeEach(() => {
    apiKeyRepo = {
      findActiveByOrgId: vi.fn(),
      update: vi.fn(),
      findSuspendedByOrgId: vi.fn(),
    } as unknown as IApiKeyRepository

    bifrostClient = {
      updateVirtualKey: vi.fn().mockResolvedValue({}),
    } as unknown as BifrostClient

    service = new HandleBalanceDepletedService(apiKeyRepo, bifrostClient)
  })

  it('應成功阻擋所有 active keys', async () => {
    const mockKey = await ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Test Key',
      bifrostVirtualKeyId: 'vkey-1',
      rawKey: 'drp_sk_test_12345678901234567890123456789012',
      scope: KeyScope.fromJSON({ rate_limit_rpm: 60, rate_limit_tpm: 100000, allowed_models: ['*'] })
    })
    const activeKey = mockKey.activate()

    ;(apiKeyRepo.findActiveByOrgId as any).mockResolvedValue([activeKey])

    const result = await service.execute('org-1')

    expect(result.processed).toBe(1)
    expect(result.failed).toBe(0)
    expect(apiKeyRepo.update).toHaveBeenCalled()
    expect(bifrostClient.updateVirtualKey).toHaveBeenCalledWith('vkey-1', expect.objectContaining({
      rate_limit: expect.objectContaining({
        token_max_limit: 0
      })
    }))
  })

  it('Bifrost 失敗時應記錄失敗但本地已更新狀態', async () => {
    const mockKey = await ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Test Key',
      bifrostVirtualKeyId: 'vkey-1',
      rawKey: 'drp_sk_test_12345678901234567890123456789012'
    })
    const activeKey = mockKey.activate()

    ;(apiKeyRepo.findActiveByOrgId as any).mockResolvedValue([activeKey])
    ;(bifrostClient.updateVirtualKey as any).mockRejectedValue(new Error('Bifrost error'))

    const result = await service.execute('org-1')

    expect(result.processed).toBe(0)
    expect(result.failed).toBe(1)
    // 本地狀態應該已經被 suspend (PENDING_SUSPEND 概念)
    expect(apiKeyRepo.update).toHaveBeenCalled()
  })
})
