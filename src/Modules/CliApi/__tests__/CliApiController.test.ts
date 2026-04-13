// src/Modules/CliApi/__tests__/CliApiController.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import { JwtTokenService } from '@/Modules/Auth/Infrastructure/Services/JwtTokenService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthorizeDeviceService } from '../Application/Services/AuthorizeDeviceService'
import { ExchangeDeviceCodeService } from '../Application/Services/ExchangeDeviceCodeService'
import { InitiateDeviceFlowService } from '../Application/Services/InitiateDeviceFlowService'
import type { ICliProxyClient } from '../Application/Services/ProxyCliRequestService'
import { ProxyCliRequestService } from '../Application/Services/ProxyCliRequestService'
import { RevokeCliSessionService } from '../Application/Services/RevokeCliSessionService'
import { MemoryDeviceCodeStore } from '../Infrastructure/Services/MemoryDeviceCodeStore'
import { CliApiController } from '../Presentation/Controllers/CliApiController'

function createMockAuthTokenRepo(): IAuthTokenRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findByUserId: vi.fn().mockResolvedValue([]),
    isRevoked: vi.fn().mockResolvedValue(false),
    revokeAllByUserId: vi.fn().mockResolvedValue(undefined),
    revoke: vi.fn().mockResolvedValue(undefined),
    deleteExpired: vi.fn().mockResolvedValue(0),
  } as unknown as IAuthTokenRepository
}

function createMockProxyClient(): ICliProxyClient {
  return {
    proxyRequest: vi.fn().mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'ok' } }],
    }),
  } as unknown as ICliProxyClient
}

function minimalCtx(partial: Partial<IHttpContext> & Record<string, unknown>): IHttpContext {
  return {
    getCookie: (_name: string) => undefined,
    setCookie: (_name: string, _value: string, _options?: unknown) => {},
    ...partial,
  } as IHttpContext
}

describe('CliApiController', () => {
  let store: MemoryDeviceCodeStore
  let controller: CliApiController
  let jwtService: JwtTokenService
  let authTokenRepo: IAuthTokenRepository
  let proxyClient: ICliProxyClient

  beforeEach(() => {
    vi.restoreAllMocks()
    store = new MemoryDeviceCodeStore()
    jwtService = new JwtTokenService()
    authTokenRepo = createMockAuthTokenRepo()
    proxyClient = createMockProxyClient()

    controller = new CliApiController(
      new InitiateDeviceFlowService(store, 'https://app.test/cli/verify'),
      new AuthorizeDeviceService(store),
      new ExchangeDeviceCodeService(store, jwtService, authTokenRepo),
      new ProxyCliRequestService(proxyClient),
      new RevokeCliSessionService(authTokenRepo),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initiateDeviceFlow returns 200 with codes', async () => {
    const res = await controller.initiateDeviceFlow(
      minimalCtx({
        json: (data: unknown, status?: number) =>
          new Response(JSON.stringify(data), { status: status ?? 200 }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { success: boolean; data?: { deviceCode: string } }
    expect(body.success).toBe(true)
    expect(body.data?.deviceCode).toBeTruthy()
  })

  it('authorizeDevice returns 401 without auth', async () => {
    vi.spyOn(AuthMiddleware, 'getAuthContext').mockReturnValue(null)
    const res = await controller.authorizeDevice(
      minimalCtx({
        getJsonBody: async <T>() => ({ userCode: 'ABC' }) as T,
        json: (data: unknown, status?: number) =>
          new Response(JSON.stringify(data), { status: status ?? 200 }),
      }),
    )
    expect(res.status).toBe(401)
  })

  it('exchangeToken returns 428 when still pending', async () => {
    const initiate = await controller.initiateDeviceFlow(
      minimalCtx({
        json: (data: unknown, status?: number) =>
          new Response(JSON.stringify(data), { status: status ?? 200 }),
      }),
    )
    const initJson = (await initiate.json()) as { data?: { deviceCode: string } }
    const deviceCode = initJson.data!.deviceCode

    const res = await controller.exchangeToken(
      minimalCtx({
        getJsonBody: async <T>() => ({ deviceCode }) as T,
        json: (data: unknown, status?: number) =>
          new Response(JSON.stringify(data), { status: status ?? 200 }),
      }),
    )
    expect(res.status).toBe(428)
  })

  it('completes initiate -> authorize -> exchange', async () => {
    const initiate = await controller.initiateDeviceFlow(
      minimalCtx({
        json: (data: unknown, status?: number) =>
          new Response(JSON.stringify(data), { status: status ?? 200 }),
      }),
    )
    const initJson = (await initiate.json()) as {
      data?: { deviceCode: string; userCode: string }
    }
    const { deviceCode, userCode } = initJson.data!

    vi.spyOn(AuthMiddleware, 'getAuthContext').mockReturnValue({
      userId: 'user-1',
      email: 'u@test.com',
      role: 'user',
      permissions: [],
      tokenType: 'access',
    })

    const authRes = await controller.authorizeDevice(
      minimalCtx({
        getJsonBody: async <T>() => ({ userCode }) as T,
        json: (data: unknown, status?: number) =>
          new Response(JSON.stringify(data), { status: status ?? 200 }),
      }),
    )
    expect(authRes.status).toBe(200)

    const exchangeRes = await controller.exchangeToken(
      minimalCtx({
        getJsonBody: async <T>() => ({ deviceCode }) as T,
        json: (data: unknown, status?: number) =>
          new Response(JSON.stringify(data), { status: status ?? 200 }),
      }),
    )
    expect(exchangeRes.status).toBe(200)
    const exJson = (await exchangeRes.json()) as {
      data?: { accessToken: string; refreshToken: string }
    }
    expect(exJson.data?.accessToken).toBeTruthy()
    expect(exJson.data?.refreshToken).toBeTruthy()
  })

  it('proxyRequest returns 200 when authenticated', async () => {
    vi.spyOn(AuthMiddleware, 'getAuthContext').mockReturnValue({
      userId: 'user-1',
      email: 'u@test.com',
      role: 'user',
      permissions: [],
      tokenType: 'access',
    })

    const res = await controller.proxyRequest(
      minimalCtx({
        getJsonBody: async <T>() =>
          ({
            model: 'gpt-4',
            messages: [{ role: 'user', content: 'hi' }],
          }) as T,
        json: (data: unknown, status?: number) =>
          new Response(JSON.stringify(data), { status: status ?? 200 }),
      }),
    )
    expect(res.status).toBe(200)
  })

  it('logout calls auth token repository revoke with token hash', async () => {
    vi.spyOn(AuthMiddleware, 'getAuthContext').mockReturnValue({
      userId: 'user-1',
      email: 'u@test.com',
      role: 'user',
      permissions: [],
      tokenType: 'access',
    })

    const res = await controller.logout(
      minimalCtx({
        getHeader: () => 'Bearer raw-token-value',
        headers: { authorization: 'Bearer raw-token-value' },
        json: (data: unknown, status?: number) =>
          new Response(JSON.stringify(data), { status: status ?? 200 }),
      }),
    )
    expect(res.status).toBe(200)
    expect(authTokenRepo.revoke).toHaveBeenCalled()
  })

  it('logoutAll revokes all tokens for user', async () => {
    vi.spyOn(AuthMiddleware, 'getAuthContext').mockReturnValue({
      userId: 'user-1',
      email: 'u@test.com',
      role: 'user',
      permissions: [],
      tokenType: 'access',
    })

    const res = await controller.logoutAll(
      minimalCtx({
        json: (data: unknown, status?: number) =>
          new Response(JSON.stringify(data), { status: status ?? 200 }),
      }),
    )
    expect(res.status).toBe(200)
    expect(authTokenRepo.revokeAllByUserId).toHaveBeenCalledWith('user-1')
  })
})
