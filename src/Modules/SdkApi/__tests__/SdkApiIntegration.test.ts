import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { AppApiKey } from '@/Modules/AppApiKey/Domain/Aggregates/AppApiKey'
import { AppKeyScope } from '@/Modules/AppApiKey/Domain/ValueObjects/AppKeyScope'
import { BoundModules } from '@/Modules/AppApiKey/Domain/ValueObjects/BoundModules'
import { AppApiKeyRepository } from '@/Modules/AppApiKey/Infrastructure/Repositories/AppApiKeyRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthenticateApp } from '../Application/UseCases/AuthenticateApp'
import { ProxyModelCall } from '../Application/UseCases/ProxyModelCall'
import { QueryBalance } from '../Application/UseCases/QueryBalance'
import { QueryUsage } from '../Application/UseCases/QueryUsage'
import { AppAuthMiddleware } from '../Infrastructure/Middleware/AppAuthMiddleware'
import { SdkApiController } from '../Presentation/Controllers/SdkApiController'

function createMockCtx(options: {
  authHeader?: string
  body?: unknown
  queryParams?: Record<string, string>
}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getHeader: (name: string) => {
      if (name.toLowerCase() === 'authorization') return options.authHeader
      return undefined
    },
    headers: { authorization: options.authHeader },
    json: vi.fn(
      (data, statusCode) => new Response(JSON.stringify(data), { status: statusCode ?? 200 }),
    ),
    getJsonBody: vi.fn().mockResolvedValue(options.body ?? {}),
    getBody: vi.fn().mockResolvedValue(options.body ?? {}),
    getQuery: vi.fn((name: string) => options.queryParams?.[name]),
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => {
      store.set(key, value)
    },
    getParam: vi.fn(),
    getPathname: vi.fn(() => '/sdk/v1/chat/completions'),
    getBodyText: vi.fn(),
    params: {},
    query: options.queryParams ?? {},
    text: vi.fn(),
    redirect: vi.fn(),
  } as unknown as IHttpContext
}

const hashingService = new KeyHashingService()

describe('SdkApi Integration', () => {
  let db: MemoryDatabaseAccess
  let repo: AppApiKeyRepository
  let middleware: AppAuthMiddleware
  let controller: SdkApiController
  const rawKey = 'drp_app_integrationtest123'

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    repo = new AppApiKeyRepository(db)

    const authenticateApp = new AuthenticateApp(repo, hashingService)
    middleware = new AppAuthMiddleware(authenticateApp)

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'chatcmpl-int',
          model: 'gpt-4',
          choices: [{ message: { role: 'assistant', content: 'Integration test!' } }],
        }),
        { status: 200 },
      ),
    )
    const proxyModelCall = new ProxyModelCall('http://localhost:8787', mockFetch)

    const mockGatewayClient = new MockGatewayClient()
    mockGatewayClient.seedUsageStats({
      totalRequests: 50,
      totalCost: 2.5,
      totalTokens: 25000,
      avgLatency: 200,
    })
    const queryUsage = new QueryUsage(mockGatewayClient)

    const mockCreditRepo = {
      findByOrgId: vi.fn().mockResolvedValue({
        balance: '3000',
        lowBalanceThreshold: '100',
        status: 'active',
      }),
    }
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const queryBalance = new QueryBalance(mockCreditRepo as any)

    controller = new SdkApiController(proxyModelCall, queryUsage, queryBalance)

    const keyHash = await hashingService.hash(rawKey)
    const key = AppApiKey.create({
      id: 'appkey-int-1',
      orgId: 'org-int-1',
      issuedByUserId: 'user-1',
      label: 'Integration Test Key',
      gatewayKeyId: 'bfr-vk-int-1',
      keyHash,
      scope: AppKeyScope.write(),
      boundModules: BoundModules.empty(),
    })
    const activated = key.activate()
    await repo.save(activated)
  })

  it('完整流程：認證 → 代理呼叫', async () => {
    const ctx = createMockCtx({
      authHeader: `Bearer ${rawKey}`,
      body: { model: 'gpt-4', messages: [{ role: 'user', content: 'hello' }] },
    })

    const next = vi.fn().mockImplementation(async () => {
      return controller.chatCompletions(ctx)
    })
    const response = await middleware.handle(ctx, next)

    expect(response.status).toBe(200)
    const body = (await response.json()) as { model: string }
    expect(body.model).toBe('gpt-4')
  })

  it('完整流程：認證 → 查詢用量', async () => {
    const ctx = createMockCtx({
      authHeader: `Bearer ${rawKey}`,
      queryParams: { start_date: '2026-04-01' },
    })

    const next = vi.fn().mockImplementation(async () => {
      return controller.getUsage(ctx)
    })
    const response = await middleware.handle(ctx, next)

    expect(response.status).toBe(200)
    const body = (await response.json()) as { success: boolean; data: { totalRequests: number } }
    expect(body.success).toBe(true)
    expect(body.data.totalRequests).toBe(50)
  })

  it('完整流程：認證 → 查詢餘額', async () => {
    const ctx = createMockCtx({
      authHeader: `Bearer ${rawKey}`,
    })

    const next = vi.fn().mockImplementation(async () => {
      return controller.getBalance(ctx)
    })
    const response = await middleware.handle(ctx, next)

    expect(response.status).toBe(200)
    const body = (await response.json()) as { success: boolean; data: { balance: string } }
    expect(body.success).toBe(true)
    expect(body.data.balance).toBe('3000')
  })

  it('無效 Key 應在中介層被攔截', async () => {
    const ctx = createMockCtx({
      authHeader: 'Bearer drp_app_invalidkey',
    })

    const next = vi.fn()
    const response = await middleware.handle(ctx, next)

    expect(response.status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })
})
