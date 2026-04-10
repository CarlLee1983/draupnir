// src/Modules/Credit/__tests__/HandleCreditToppedUpService.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { HandleCreditToppedUpService } from '../Application/Services/HandleCreditToppedUpService'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import { KeyScope } from '@/Modules/ApiKey/Domain/ValueObjects/KeyScope'

describe('HandleCreditToppedUpService', () => {
  let apiKeyRepo: IApiKeyRepository
  let mock: MockGatewayClient
  let service: HandleCreditToppedUpService

  beforeEach(async () => {
    apiKeyRepo = {
      findSuspendedByOrgId: vi.fn(),
      update: vi.fn(),
    } as unknown as IApiKeyRepository

    mock = new MockGatewayClient()
    // Seed mock store so updateKey doesn't throw NOT_FOUND
    await mock.createKey({ name: 'key-1', isActive: true })
    // created.id === 'mock_vk_000001'

    service = new HandleCreditToppedUpService(apiKeyRepo, mock)
  })

  afterEach(() => {
    mock.reset()
  })

  it('應恢復所有因餘額不足而凍結的 keys', async () => {
    const mockKey = await ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Test Key',
      bifrostVirtualKeyId: 'mock_vk_000001',
      rawKey: 'drp_sk_test_12345678901234567890123456789012',
      scope: KeyScope.fromJSON({
        rate_limit_rpm: 60,
        rate_limit_tpm: 100000,
        allowed_models: ['*'],
      }),
    })
    const suspended = mockKey.activate().suspend('CREDIT_DEPLETED', { rpm: 60, tpm: 100000 })

    ;(apiKeyRepo.findSuspendedByOrgId as any).mockResolvedValue([suspended])

    const result = await service.execute('org-1')

    expect(result.processed).toBe(1)
    expect(result.failed).toBe(0)
    expect(mock.calls.updateKey[0].request.rateLimit?.tokenMaxLimit).toBe(100000)
    expect(apiKeyRepo.update).toHaveBeenCalled()
  })

  it('無凍結 keys 時應直接回傳零', async () => {
    ;(apiKeyRepo.findSuspendedByOrgId as any).mockResolvedValue([])

    const result = await service.execute('org-1')

    expect(result.processed).toBe(0)
    expect(result.failed).toBe(0)
    expect(mock.calls.updateKey).toHaveLength(0)
  })

  it('Gateway 恢復失敗時應記錄失敗但不清除本地凍結狀態', async () => {
    const mockKey = await ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Test Key',
      bifrostVirtualKeyId: 'mock_vk_000001',
      rawKey: 'drp_sk_test_12345678901234567890123456789012',
      scope: KeyScope.fromJSON({
        rate_limit_rpm: 60,
        rate_limit_tpm: 100000,
        allowed_models: ['*'],
      }),
    })
    const suspended = mockKey.activate().suspend('CREDIT_DEPLETED', { rpm: 60, tpm: 100000 })

    ;(apiKeyRepo.findSuspendedByOrgId as any).mockResolvedValue([suspended])
    mock.failNext(new (await import('@/Foundation/Infrastructure/Services/LLMGateway')).GatewayError(
      'Gateway error',
      'NETWORK',
      503,
      true,
    ))

    const result = await service.execute('org-1')

    expect(result.processed).toBe(0)
    expect(result.failed).toBe(1)
    // 本地狀態不應被 update（unsuspend 不應被呼叫）
    expect(apiKeyRepo.update).not.toHaveBeenCalled()
  })
})
