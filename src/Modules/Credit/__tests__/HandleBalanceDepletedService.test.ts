// src/Modules/Credit/__tests__/HandleBalanceDepletedService.test.ts
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import { KeyScope } from '@/Modules/ApiKey/Domain/ValueObjects/KeyScope'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { HandleBalanceDepletedService } from '../Application/Services/HandleBalanceDepletedService'

const hashingService = new KeyHashingService()
const TEST_RAW_KEY = 'drp_sk_test_12345678901234567890123456789012'
let testKeyHash: string

beforeAll(async () => {
  testKeyHash = await hashingService.hash(TEST_RAW_KEY)
})

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
    const mockKey = ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Test Key',
      gatewayKeyId: 'mock_vk_000001',
      keyHash: testKeyHash,
      scope: KeyScope.fromJSON({
        rate_limit_rpm: 60,
        rate_limit_tpm: 100000,
        allowed_models: ['*'],
      }),
    })
    const activeKey = mockKey.activate()

    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(apiKeyRepo.findActiveByOrgId as any).mockResolvedValue([activeKey])

    const result = await service.execute('org-1')

    expect(result.processed).toBe(1)
    expect(result.failed).toBe(0)
    expect(apiKeyRepo.update).toHaveBeenCalled()
    expect(mock.calls.updateKey[0].request.rateLimit?.tokenMaxLimit).toBe(0)
    expect(mock.calls.updateKey[0].request.rateLimit?.tokenResetDuration).toBe('1h')
  })

  it('暫時性錯誤（retryable=true）應記錄 log 並計入 failed', async () => {
    const mockKey = ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Test Key',
      gatewayKeyId: 'mock_vk_000001',
      keyHash: testKeyHash,
    })
    const activeKey = mockKey.activate()

    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(apiKeyRepo.findActiveByOrgId as any).mockResolvedValue([activeKey])
    mock.failNext(new GatewayError('rate limited', 'RATE_LIMITED', 429, true))

    const result = await service.execute('org-1')

    expect(result.processed).toBe(0)
    expect(result.failed).toBe(1)
  })

  it('永久性錯誤（retryable=false）應記錄 error 並計入 failed', async () => {
    const mockKey = ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Test Key',
      gatewayKeyId: 'mock_vk_000001',
      keyHash: testKeyHash,
    })
    const activeKey = mockKey.activate()

    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(apiKeyRepo.findActiveByOrgId as any).mockResolvedValue([activeKey])
    mock.failNext(new GatewayError('not found', 'NOT_FOUND', 404, false))

    const result = await service.execute('org-1')

    expect(result.processed).toBe(0)
    expect(result.failed).toBe(1)
    // 本地狀態應該已經被 suspend (PENDING_SUSPEND 概念)
    expect(apiKeyRepo.update).toHaveBeenCalled()
  })
})
