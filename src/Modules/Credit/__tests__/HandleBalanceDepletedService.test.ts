// src/Modules/Credit/__tests__/HandleBalanceDepletedService.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { HandleBalanceDepletedService } from '../Application/Services/HandleBalanceDepletedService'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import { KeyScope } from '@/Modules/ApiKey/Domain/ValueObjects/KeyScope'

describe('HandleBalanceDepletedService', () => {
  let apiKeyRepo: IApiKeyRepository
  let mock: MockGatewayClient
  let service: HandleBalanceDepletedService

  beforeEach(async () => {
    apiKeyRepo = {
      findActiveByOrgId: vi.fn(),
      update: vi.fn(),
      findSuspendedByOrgId: vi.fn(),
    } as unknown as IApiKeyRepository

    mock = new MockGatewayClient()
    // Seed mock store so updateKey doesn't throw NOT_FOUND
    await mock.createKey({ name: 'key-1', isActive: true })
    // created.id === 'mock_vk_000001'

    service = new HandleBalanceDepletedService(apiKeyRepo, mock)
  })

  afterEach(() => {
    mock.reset()
  })

  it('應成功阻擋所有 active keys', async () => {
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
    const activeKey = mockKey.activate()

    ;(apiKeyRepo.findActiveByOrgId as any).mockResolvedValue([activeKey])

    const result = await service.execute('org-1')

    expect(result.processed).toBe(1)
    expect(result.failed).toBe(0)
    expect(apiKeyRepo.update).toHaveBeenCalled()
    expect(mock.calls.updateKey[0].request.rateLimit?.tokenMaxLimit).toBe(0)
    expect(mock.calls.updateKey[0].request.rateLimit?.tokenResetDuration).toBe('1h')
  })

  it('暫時性錯誤（retryable=true）應記錄 log 並計入 failed', async () => {
    const mockKey = await ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Test Key',
      bifrostVirtualKeyId: 'mock_vk_000001',
      rawKey: 'drp_sk_test_12345678901234567890123456789012',
    })
    const activeKey = mockKey.activate()

    ;(apiKeyRepo.findActiveByOrgId as any).mockResolvedValue([activeKey])
    mock.failNext(new GatewayError('rate limited', 'RATE_LIMITED', 429, true))

    const result = await service.execute('org-1')

    expect(result.processed).toBe(0)
    expect(result.failed).toBe(1)
  })

  it('永久性錯誤（retryable=false）應記錄 error 並計入 failed', async () => {
    const mockKey = await ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Test Key',
      bifrostVirtualKeyId: 'mock_vk_000001',
      rawKey: 'drp_sk_test_12345678901234567890123456789012',
    })
    const activeKey = mockKey.activate()

    ;(apiKeyRepo.findActiveByOrgId as any).mockResolvedValue([activeKey])
    mock.failNext(new GatewayError('not found', 'NOT_FOUND', 404, false))

    const result = await service.execute('org-1')

    expect(result.processed).toBe(0)
    expect(result.failed).toBe(1)
    // 本地狀態應該已經被 suspend (PENDING_SUSPEND 概念)
    expect(apiKeyRepo.update).toHaveBeenCalled()
  })
})
