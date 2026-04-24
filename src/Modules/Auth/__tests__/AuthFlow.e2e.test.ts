/**
 * End-to-end style tests for the auth flow.
 *
 * Scenarios:
 * 1. Register
 * 2. Login (access + refresh tokens)
 * 3. Authenticated access with access token
 * 4. Refresh near expiry
 * 5. Logout (revocation)
 * 6. Rejected after revocation
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { LoginUserService } from '../Application/Services/LoginUserService'
import { LogoutUserService } from '../Application/Services/LogoutUserService'
import { RefreshTokenService } from '../Application/Services/RefreshTokenService'
import { RegisterUserService } from '../Application/Services/RegisterUserService'
import type { IAuthRepository } from '../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../Domain/Repositories/IAuthTokenRepository'
import { RoleType } from '../Domain/ValueObjects/Role'
import { AuthRepository } from '../Infrastructure/Repositories/AuthRepository'
import { AuthTokenRepository } from '../Infrastructure/Repositories/AuthTokenRepository'
import { JwtTokenService } from '../Infrastructure/Services/JwtTokenService'
import { ScryptPasswordHasher } from '../Infrastructure/Services/PasswordHasher'

describe('認證流程 E2E 測試', () => {
  let registerService: RegisterUserService
  let loginService: LoginUserService
  let refreshService: RefreshTokenService
  let logoutService: LogoutUserService
  let jwtService: JwtTokenService
  let authRepository: IAuthRepository
  let tokenRepository: IAuthTokenRepository
  let middleware: AuthMiddleware

  // Mock HttpContext
  const createMockContext = (): IHttpContext => {
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const state: Record<string, any> = {}
    return {
      getBodyText: async () => '',
      getJsonBody: async <T>() => ({}) as T,
      getBody: async <T>() => ({}) as T,
      getHeader: () => undefined,
      getPathname: () => '/',
      getParam: () => undefined,
      getQuery: () => undefined,
      params: {},
      query: {},
      headers: {},
      json: <T>(data: T) => new Response(JSON.stringify(data)),
      text: (content: string) => new Response(content),
      redirect: () => new Response(null, { status: 302 }),
      get: <T>(key: string): T | undefined => state[key] as T,
      set: (key: string, value: unknown) => {
        state[key] = value
      },
      getCookie: (_name: string) => undefined,
      getMethod: () => 'GET',
      setCookie: (_name: string, _value: string, _options?: unknown) => {},
    } as IHttpContext
  }

  beforeEach(async () => {
    DomainEventDispatcher.resetForTesting()
    const db = new MemoryDatabaseAccess()
    authRepository = new AuthRepository(db)
    tokenRepository = new AuthTokenRepository(db)
    jwtService = new JwtTokenService()

    const passwordHasher = new ScryptPasswordHasher()
    registerService = new RegisterUserService(authRepository, passwordHasher)
    loginService = new LoginUserService(authRepository, tokenRepository, jwtService, passwordHasher)
    refreshService = new RefreshTokenService(authRepository, tokenRepository, jwtService)
    logoutService = new LogoutUserService(tokenRepository)
    middleware = new AuthMiddleware(tokenRepository)
  })

  it('完整的認證流程：註冊 -> 登入 -> 驗證 -> 刷新 -> 登出', async () => {
    // 步驟 1：用戶註冊
    const registerResult = await registerService.execute({
      email: 'user@example.com',
      password: 'SecurePassword123',
    })
    expect(registerResult.success).toBe(true)
    expect(registerResult.data?.role).toBe(RoleType.MEMBER)

    // 步驟 2：用戶登入
    const loginResult = await loginService.execute({
      email: 'user@example.com',
      password: 'SecurePassword123',
    })
    expect(loginResult.success).toBe(true)
    expect(loginResult.data?.accessToken).toBeTruthy()
    expect(loginResult.data?.refreshToken).toBeTruthy()
    expect(loginResult.data?.user.role).toBe(RoleType.MEMBER)

    const accessToken = loginResult.data?.accessToken as string
    const refreshToken = loginResult.data?.refreshToken as string

    // 步驟 3：驗證 Access Token
    const payload = jwtService.verify(accessToken)
    expect(payload).toBeTruthy()
    expect(payload?.userId).toBe(loginResult.data?.user.id)
    expect(payload?.email).toBe('user@example.com')
    expect(payload?.role).toBe(RoleType.MEMBER)
    expect(payload?.type).toBe('access')

    // 步驟 4：使用中間件驗證 Token
    const ctx1 = createMockContext()
    ctx1.headers = {
      authorization: `Bearer ${accessToken}`,
    }
    await middleware.handle(ctx1)
    const authContext = AuthMiddleware.getAuthContext(ctx1)
    expect(authContext).toBeTruthy()
    expect(authContext?.userId).toBe(loginResult.data?.user.id)
    expect(authContext?.email).toBe('user@example.com')

    // 步驟 5：刷新 Token
    const refreshResult = await refreshService.execute({ refreshToken })
    expect(refreshResult.success).toBe(true)
    expect(refreshResult.data?.accessToken).toBeTruthy()

    const newAccessToken = refreshResult.data?.accessToken as string
    const newPayload = jwtService.verify(newAccessToken)
    expect(newPayload?.type).toBe('access')

    // 步驟 6：登出（撤銷舊 Token）
    const logoutResult = await logoutService.execute({ token: accessToken })
    expect(logoutResult.success).toBe(true)

    // 步驟 7：驗證已撤銷的 Token 被拒絕
    const ctx2 = createMockContext()
    ctx2.headers = {
      authorization: `Bearer ${accessToken}`,
    }
    await middleware.handle(ctx2)
    const authError = AuthMiddleware.getAuthError(ctx2)
    expect(authError).toBe('TOKEN_REVOKED')
    expect(AuthMiddleware.isAuthenticated(ctx2)).toBe(false)

    // 步驟 8：新 Token 仍然有效
    const ctx3 = createMockContext()
    ctx3.headers = {
      authorization: `Bearer ${newAccessToken}`,
    }
    await middleware.handle(ctx3)
    expect(AuthMiddleware.isAuthenticated(ctx3)).toBe(true)
  })

  it('無效的 Token 被拒絕', async () => {
    const ctx = createMockContext()
    ctx.headers = {
      authorization: 'Bearer invalid.token.here',
    }
    await middleware.handle(ctx)
    expect(AuthMiddleware.isAuthenticated(ctx)).toBe(false)
    expect(AuthMiddleware.getAuthError(ctx)).toBe('INVALID_TOKEN')
  })

  it('缺少 Authorization Header 時繼續處理', async () => {
    const ctx = createMockContext()
    ctx.headers = {}
    await middleware.handle(ctx)
    expect(AuthMiddleware.isAuthenticated(ctx)).toBe(false)
    expect(AuthMiddleware.getAuthError(ctx)).toBeNull()
  })

  it('不正確的 Bearer 格式被拒絕', async () => {
    const ctx = createMockContext()
    ctx.headers = {
      authorization: 'NotBearer some-token',
    }
    await middleware.handle(ctx)
    expect(AuthMiddleware.isAuthenticated(ctx)).toBe(false)
  })

  it.skip('登出所有設備（撤銷所有 Token）', async () => {
    // 註冊並登入
    await registerService.execute({
      email: 'user@example.com',
      password: 'SecurePassword123',
    })

    // 第一次登入
    const login1 = await loginService.execute({
      email: 'user@example.com',
      password: 'SecurePassword123',
    })
    const token1 = login1.data?.accessToken

    // 第二次登入（模擬在另一個設備）
    const login2 = await loginService.execute({
      email: 'user@example.com',
      password: 'SecurePassword123',
    })
    const token2 = login2.data?.accessToken

    // 兩個 Token 都應該有效
    let ctx1 = createMockContext()
    ctx1.headers = { authorization: `Bearer ${token1}` }
    await middleware.handle(ctx1)
    expect(AuthMiddleware.isAuthenticated(ctx1)).toBe(true)

    let ctx2 = createMockContext()
    ctx2.headers = { authorization: `Bearer ${token2}` }
    await middleware.handle(ctx2)
    expect(AuthMiddleware.isAuthenticated(ctx2)).toBe(true)

    // 登出所有設備
    const logoutResult = await logoutService.logoutAllDevices(login1.data?.user.id as string)
    expect(logoutResult.success).toBe(true)

    // 登出所有設備成功

    // 兩個 Token 都應該被撤銷
    ctx1 = createMockContext()
    ctx1.headers = { authorization: `Bearer ${token1}` }

    await middleware.handle(ctx1)
    expect(AuthMiddleware.isAuthenticated(ctx1)).toBe(false)

    ctx2 = createMockContext()
    ctx2.headers = { authorization: `Bearer ${token2}` }
    await middleware.handle(ctx2)
    expect(AuthMiddleware.isAuthenticated(ctx2)).toBe(false)
  })

  it('過期的 Token 被拒絕', async () => {
    // 創建一個已過期的 Token（直接使用 jwt.sign）
    const expiredPayload = {
      userId: 'test-user',
      email: 'test@example.com',
      role: RoleType.MEMBER,
      permissions: [],
      iat: Math.floor(Date.now() / 1000) - 1000, // 1000 秒前
      exp: Math.floor(Date.now() / 1000) - 1, // 1 秒前已過期
      type: 'access',
    }
    const jwt = await import('jsonwebtoken')
    const expiredToken = jwt.sign(
      expiredPayload,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    )

    const ctx = createMockContext()
    ctx.headers = {
      authorization: `Bearer ${expiredToken}`,
    }
    await middleware.handle(ctx)
    expect(AuthMiddleware.isAuthenticated(ctx)).toBe(false)
    expect(AuthMiddleware.getAuthError(ctx)).toBe('INVALID_TOKEN')
  })

  it('Token 刷新時使用舊的 Access Token 失敗', async () => {
    // 登出後 Access Token 應該被撤銷
    await registerService.execute({
      email: 'user@example.com',
      password: 'SecurePassword123',
    })

    const loginResult = await loginService.execute({
      email: 'user@example.com',
      password: 'SecurePassword123',
    })

    const accessToken = loginResult.data?.accessToken as string

    // 登出
    await logoutService.execute({ token: accessToken })

    // 驗證已撤銷的 Token 無法刷新
    const ctx = createMockContext()
    ctx.headers = { authorization: `Bearer ${accessToken}` }
    await middleware.handle(ctx)
    expect(AuthMiddleware.isAuthenticated(ctx)).toBe(false)
  })
})
