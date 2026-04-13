import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { AppAuthContext } from '../Application/DTOs/SdkApiDTO'
import type { ProxyModelCall } from '../Application/UseCases/ProxyModelCall'
import type { QueryBalance } from '../Application/UseCases/QueryBalance'
import type { QueryUsage } from '../Application/UseCases/QueryUsage'
import { SdkApiController } from '../Presentation/Controllers/SdkApiController'

const validAuth: AppAuthContext = {
  appKeyId: 'appkey-1',
  orgId: 'org-1',
  gatewayKeyId: 'bfr-vk-1',
  scope: 'write',
  boundModuleIds: [],
}

function createMockCtx(auth?: AppAuthContext, body?: unknown): IHttpContext {
  const store = new Map<string, unknown>()
  if (auth) store.set('appAuth', auth)
  return {
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => {
      store.set(key, value)
    },
    json: vi.fn((data, statusCode) => {
      return new Response(JSON.stringify(data), { status: statusCode ?? 200 })
    }),
    getJsonBody: vi.fn().mockResolvedValue(body ?? {}),
    getBody: vi.fn().mockResolvedValue(body ?? {}),
    getQuery: vi.fn((_name: string) => undefined),
    getHeader: vi.fn(),
    getParam: vi.fn(),
    getPathname: vi.fn(),
    getBodyText: vi.fn(),
    params: {},
    query: {},
    headers: {},
    text: vi.fn(),
    redirect: vi.fn(),
    getCookie: vi.fn(),
    setCookie: vi.fn(),
  } as unknown as IHttpContext
}

describe('SdkApiController', () => {
  let controller: SdkApiController
  let mockProxy: ProxyModelCall
  let mockUsage: QueryUsage
  let mockBalance: QueryBalance

  beforeEach(() => {
    mockProxy = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'chatcmpl-1', model: 'gpt-4', choices: [] },
      }),
    } as unknown as ProxyModelCall

    mockUsage = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        message: 'Query successful',
        data: { totalRequests: 100, totalCost: 5, totalTokens: 50000, avgLatency: 300 },
      }),
    } as unknown as QueryUsage

    mockBalance = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        message: 'Query successful',
        data: { balance: '5000', lowBalanceThreshold: '100', status: 'active' },
      }),
    } as unknown as QueryBalance

    controller = new SdkApiController(mockProxy, mockUsage, mockBalance)
  })

  it('chatCompletions 應成功代理呼叫', async () => {
    const ctx = createMockCtx(validAuth, {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'hi' }],
    })

    const response = await controller.chatCompletions(ctx)

    expect(response.status).toBe(200)
    expect(mockProxy.execute).toHaveBeenCalledWith(
      validAuth,
      expect.objectContaining({ model: 'gpt-4' }),
    )
  })

  it('chatCompletions 未認證應回傳 401', async () => {
    const ctx = createMockCtx(undefined, {})

    const response = await controller.chatCompletions(ctx)

    expect(response.status).toBe(401)
  })

  it('getUsage 應成功查詢用量', async () => {
    const ctx = createMockCtx(validAuth)

    const response = await controller.getUsage(ctx)

    expect(response.status).toBe(200)
    expect(mockUsage.execute).toHaveBeenCalledWith(validAuth, expect.any(Object))
  })

  it('getBalance 應成功查詢餘額', async () => {
    const ctx = createMockCtx(validAuth)

    const response = await controller.getBalance(ctx)

    expect(response.status).toBe(200)
    expect(mockBalance.execute).toHaveBeenCalledWith(validAuth)
  })

  it('getUsage 未認證應回傳 401', async () => {
    const ctx = createMockCtx(undefined)

    const response = await controller.getUsage(ctx)

    expect(response.status).toBe(401)
  })
})
