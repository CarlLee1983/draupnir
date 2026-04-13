import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import type { AppAuthContext } from '../Application/DTOs/SdkApiDTO'
import { QueryUsage } from '../Application/UseCases/QueryUsage'

describe('QueryUsage', () => {
  let useCase: QueryUsage
  let mock: MockGatewayClient

  const authContext: AppAuthContext = {
    appKeyId: 'appkey-1',
    orgId: 'org-1',
    gatewayKeyId: 'bfr-vk-1',
    scope: 'read',
    boundModuleIds: [],
  }

  beforeEach(() => {
    mock = new MockGatewayClient()
    mock.seedUsageStats({
      totalRequests: 100,
      totalCost: 5.25,
      totalTokens: 50000,
      avgLatency: 320,
    })
    useCase = new QueryUsage(mock)
  })

  afterEach(() => {
    mock.reset()
  })

  it('應成功查詢用量統計', async () => {
    const result = await useCase.execute(authContext)

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      totalRequests: 100,
      totalCost: 5.25,
      totalTokens: 50000,
      avgLatency: 320,
    })
    expect(mock.calls.getUsageStats[0].keyIds).toContain('bfr-vk-1')
    expect(mock.calls.getUsageStats[0].query).toBeUndefined()
  })

  it('應支援日期範圍過濾', async () => {
    const result = await useCase.execute(authContext, {
      startDate: '2026-04-01',
      endDate: '2026-04-10',
    })

    expect(result.success).toBe(true)
    expect(mock.calls.getUsageStats[0].keyIds).toContain('bfr-vk-1')
    expect(mock.calls.getUsageStats[0].query?.startTime).toBe('2026-04-01')
    expect(mock.calls.getUsageStats[0].query?.endTime).toBe('2026-04-10')
  })

  it('Gateway 錯誤應回傳失敗', async () => {
    mock.failNext(new GatewayError('connection failed', 'NETWORK', 503, true))
    const result = await useCase.execute(authContext)

    expect(result.success).toBe(false)
    expect(result.error).toBe('USAGE_QUERY_ERROR')
  })
})
