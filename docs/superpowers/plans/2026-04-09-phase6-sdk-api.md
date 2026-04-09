# Phase 6.2: SDK Backend API 實作計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作 SDK Backend API，讓使用 App API Key（`drp_app_xxxx`）的 SDK 呼叫者可以透過 Bearer token 認證、代理 AI model 呼叫（轉發至 Bifrost）、查詢用量、查詢餘額。

**Architecture:** 新增 `SdkApi` 模組於 `src/Modules/SdkApi/`。此模組不擁有 Domain 層（依賴 Phase 6.1 的 AppApiKey 模組），僅包含 Application（Use Cases）、Infrastructure（AppAuthMiddleware）、Presentation（Controller + Routes）。SDK API 路由前綴為 `/sdk/v1/`，使用獨立的 `AppAuthMiddleware` 驗證 `drp_app_xxxx` Bearer token，與現有 JWT AuthMiddleware 完全獨立。

**Tech Stack:** Bun + TypeScript, Vitest, Gravito DDD Framework, MemoryDatabaseAccess (tests), IDatabaseAccess (ORM-agnostic)

**Dependencies:**
- `2026-04-09-phase6-app-api-key.md` — 本計劃依賴 AppApiKey 模組（Aggregate、Repository、ValueObjects）

---

## File Structure

```
src/Modules/SdkApi/
├── Application/
│   ├── UseCases/
│   │   ├── AuthenticateApp.ts             # App Key 認證邏輯
│   │   ├── ProxyModelCall.ts              # 代理 AI model 呼叫至 Bifrost
│   │   ├── QueryUsage.ts                  # 查詢 App Key 用量統計
│   │   └── QueryBalance.ts               # 查詢 Org Credit 餘額
│   └── DTOs/
│       └── SdkApiDTO.ts                   # Request/Response DTOs
├── Infrastructure/
│   └── Middleware/
│       └── AppAuthMiddleware.ts           # drp_app_xxxx Bearer token 認證中介層
├── Presentation/
│   ├── Controllers/
│   │   └── SdkApiController.ts            # HTTP handlers
│   └── Routes/
│       └── sdkApi.routes.ts               # /sdk/v1/ 路由定義
├── __tests__/
│   ├── AppAuthMiddleware.test.ts          # 中介層測試
│   ├── AuthenticateApp.test.ts           # Use Case 測試
│   ├── ProxyModelCall.test.ts            # Use Case 測試
│   ├── QueryUsage.test.ts               # Use Case 測試
│   ├── QueryBalance.test.ts             # Use Case 測試
│   └── SdkApiController.test.ts         # Controller 整合測試
└── index.ts                              # Barrel exports

src/Modules/SdkApi/Infrastructure/Providers/
└── SdkApiServiceProvider.ts              # DI 註冊

src/wiring/index.ts                        # 新增 registerSdkApi
src/bootstrap.ts                           # 新增 SdkApiServiceProvider
src/routes.ts                              # 新增 registerSdkApi 呼叫
```

---

### Task 1: DTOs

**Files:**
- Create: `src/Modules/SdkApi/Application/DTOs/SdkApiDTO.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// src/Modules/SdkApi/Application/DTOs/SdkApiDTO.ts

/** AppAuthMiddleware 認證後注入到 ctx 的上下文 */
export interface AppAuthContext {
  readonly appKeyId: string
  readonly orgId: string
  readonly bifrostVirtualKeyId: string
  readonly scope: string       // 'read' | 'write' | 'admin'
  readonly boundModuleIds: readonly string[]
}

/** ProxyModelCall 請求 */
export interface ProxyCallRequest {
  readonly model: string
  readonly messages: readonly { role: string; content: string }[]
  readonly temperature?: number
  readonly max_tokens?: number
  readonly stream?: boolean
  readonly [key: string]: unknown
}

/** ProxyModelCall 回應（透傳 Bifrost 回應） */
export interface ProxyCallResponse {
  success: boolean
  message?: string
  data?: unknown
  error?: string
}

/** QueryUsage 回應 */
export interface UsageResponse {
  success: boolean
  message: string
  data?: {
    totalRequests: number
    totalCost: number
    totalTokens: number
    avgLatency: number
  }
  error?: string
}

/** QueryBalance 回應 */
export interface BalanceQueryResponse {
  success: boolean
  message: string
  data?: {
    balance: string
    lowBalanceThreshold: string
    status: string
  }
  error?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Modules/SdkApi/Application/DTOs/SdkApiDTO.ts
git commit -m "feat: [SdkApi] 新增 SDK API DTOs（AppAuthContext、ProxyCall、Usage、Balance）"
```

---

### Task 2: AuthenticateApp Use Case

**Files:**
- Create: `src/Modules/SdkApi/Application/UseCases/AuthenticateApp.ts`
- Test: `src/Modules/SdkApi/__tests__/AuthenticateApp.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/SdkApi/__tests__/AuthenticateApp.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { AuthenticateApp } from '../Application/UseCases/AuthenticateApp'
import { AppApiKeyRepository } from '@/Modules/AppApiKey/Infrastructure/Repositories/AppApiKeyRepository'
import { AppApiKey } from '@/Modules/AppApiKey/Domain/Aggregates/AppApiKey'
import { AppKeyScope } from '@/Modules/AppApiKey/Domain/ValueObjects/AppKeyScope'
import { BoundModules } from '@/Modules/AppApiKey/Domain/ValueObjects/BoundModules'

describe('AuthenticateApp', () => {
  let useCase: AuthenticateApp
  let db: MemoryDatabaseAccess
  let repo: AppApiKeyRepository
  const rawKey = 'drp_app_testauthkey123'

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    repo = new AppApiKeyRepository(db)
    useCase = new AuthenticateApp(repo)

    const key = await AppApiKey.create({
      id: 'appkey-auth-1',
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      label: 'Test SDK Key',
      bifrostVirtualKeyId: 'bfr-vk-app-1',
      rawKey,
      scope: AppKeyScope.write(),
      boundModules: BoundModules.from(['mod-1', 'mod-2']),
    })
    const activated = key.activate()
    await repo.save(activated)
  })

  it('應以有效的 App Key 認證成功', async () => {
    const result = await useCase.execute(rawKey)
    expect(result.success).toBe(true)
    expect(result.context).toBeDefined()
    expect(result.context!.appKeyId).toBe('appkey-auth-1')
    expect(result.context!.orgId).toBe('org-1')
    expect(result.context!.bifrostVirtualKeyId).toBe('bfr-vk-app-1')
    expect(result.context!.scope).toBe('write')
    expect(result.context!.boundModuleIds).toEqual(['mod-1', 'mod-2'])
  })

  it('無效的 Key 應認證失敗', async () => {
    const result = await useCase.execute('drp_app_invalidkey')
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_APP_KEY')
  })

  it('非 drp_app_ 前綴的 Key 應認證失敗', async () => {
    const result = await useCase.execute('drp_sk_wrongprefix')
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_KEY_FORMAT')
  })

  it('已撤銷的 Key 應認證失敗', async () => {
    const key = await repo.findById('appkey-auth-1')
    const revoked = key!.revoke()
    await repo.update(revoked)

    const result = await useCase.execute(rawKey)
    expect(result.success).toBe(false)
    expect(result.error).toBe('KEY_REVOKED')
  })

  it('已過期的 Key 應認證失敗', async () => {
    const expiredKey = await AppApiKey.create({
      id: 'appkey-expired',
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      label: 'Expired Key',
      bifrostVirtualKeyId: 'bfr-vk-exp',
      rawKey: 'drp_app_expiredkey',
      expiresAt: new Date(Date.now() - 86400000), // 昨天過期
    })
    const activated = expiredKey.activate()
    await repo.save(activated)

    const result = await useCase.execute('drp_app_expiredkey')
    expect(result.success).toBe(false)
    expect(result.error).toBe('KEY_EXPIRED')
  })

  it('grace period 內的舊 Key 應認證成功', async () => {
    const key = await repo.findById('appkey-auth-1')
    const rotated = await key!.rotate('drp_app_newkeyrotated', 'bfr-vk-new')
    await repo.update(rotated)

    // 用舊 key 認證，在 grace period 內應該可以
    const result = await useCase.execute(rawKey)
    expect(result.success).toBe(true)
    expect(result.context!.appKeyId).toBe('appkey-auth-1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/SdkApi/__tests__/AuthenticateApp.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/SdkApi/Application/UseCases/AuthenticateApp.ts
import type { IAppApiKeyRepository } from '@/Modules/AppApiKey/Domain/Repositories/IAppApiKeyRepository'
import type { AppAuthContext } from '../DTOs/SdkApiDTO'
import { createHash } from 'crypto'

interface AuthenticateResult {
  success: boolean
  context?: AppAuthContext
  error?: string
  message?: string
}

export class AuthenticateApp {
  constructor(private readonly appApiKeyRepo: IAppApiKeyRepository) {}

  async execute(rawKey: string): Promise<AuthenticateResult> {
    try {
      if (!rawKey.startsWith('drp_app_')) {
        return { success: false, error: 'INVALID_KEY_FORMAT', message: '無效的 App Key 格式' }
      }

      const keyHash = createHash('sha256').update(rawKey).digest('hex')

      // 先查主 hash
      let appKey = await this.appApiKeyRepo.findByKeyHash(keyHash)

      // 若未找到，嘗試查 previousKeyHash（grace period 支援）
      if (!appKey) {
        appKey = await this.appApiKeyRepo.findByPreviousKeyHash(keyHash)
        if (appKey) {
          // 檢查 grace period 是否已過期
          const gracePeriodEndsAt = appKey.gracePeriodEndsAt
          if (!gracePeriodEndsAt || gracePeriodEndsAt < new Date()) {
            return { success: false, error: 'INVALID_APP_KEY', message: 'App Key 無效或已過期' }
          }
        }
      }

      if (!appKey) {
        return { success: false, error: 'INVALID_APP_KEY', message: 'App Key 無效' }
      }

      // 檢查狀態
      if (appKey.status === 'revoked') {
        return { success: false, error: 'KEY_REVOKED', message: '此 App Key 已撤銷' }
      }

      if (appKey.status !== 'active') {
        return { success: false, error: 'KEY_INACTIVE', message: '此 App Key 未啟用' }
      }

      // 檢查過期
      if (appKey.expiresAt && appKey.expiresAt < new Date()) {
        return { success: false, error: 'KEY_EXPIRED', message: '此 App Key 已過期' }
      }

      const context: AppAuthContext = {
        appKeyId: appKey.id,
        orgId: appKey.orgId,
        bifrostVirtualKeyId: appKey.bifrostVirtualKeyId,
        scope: appKey.appKeyScope.getValue(),
        boundModuleIds: [...appKey.boundModules.getModuleIds()],
      }

      return { success: true, context }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '認證失敗'
      return { success: false, error: 'AUTH_ERROR', message }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/SdkApi/__tests__/AuthenticateApp.test.ts`
Expected: PASS — all 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/SdkApi/Application/UseCases/AuthenticateApp.ts src/Modules/SdkApi/__tests__/AuthenticateApp.test.ts
git commit -m "feat: [SdkApi] 新增 AuthenticateApp Use Case（App Key 認證 + grace period 支援）"
```

---

### Task 3: AppAuthMiddleware

**Files:**
- Create: `src/Modules/SdkApi/Infrastructure/Middleware/AppAuthMiddleware.ts`
- Test: `src/Modules/SdkApi/__tests__/AppAuthMiddleware.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/SdkApi/__tests__/AppAuthMiddleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppAuthMiddleware } from '../Infrastructure/Middleware/AppAuthMiddleware'
import { AuthenticateApp } from '../Application/UseCases/AuthenticateApp'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { AppAuthContext } from '../Application/DTOs/SdkApiDTO'

function createMockCtx(authHeader?: string): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getHeader: (name: string) => {
      if (name.toLowerCase() === 'authorization') return authHeader
      return undefined
    },
    headers: { authorization: authHeader },
    json: vi.fn((data, statusCode) => new Response(JSON.stringify(data), { status: statusCode ?? 200 })),
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => { store.set(key, value) },
    getBodyText: vi.fn(),
    getJsonBody: vi.fn(),
    getBody: vi.fn(),
    getParam: vi.fn(),
    getPathname: vi.fn(() => '/sdk/v1/chat/completions'),
    getQuery: vi.fn(),
    params: {},
    query: {},
    text: vi.fn(),
    redirect: vi.fn(),
  } as unknown as IHttpContext
}

describe('AppAuthMiddleware', () => {
  let middleware: AppAuthMiddleware
  let mockAuthenticateApp: AuthenticateApp

  const validContext: AppAuthContext = {
    appKeyId: 'appkey-1',
    orgId: 'org-1',
    bifrostVirtualKeyId: 'bfr-vk-1',
    scope: 'write',
    boundModuleIds: ['mod-1'],
  }

  beforeEach(() => {
    mockAuthenticateApp = {
      execute: vi.fn().mockResolvedValue({ success: true, context: validContext }),
    } as unknown as AuthenticateApp
    middleware = new AppAuthMiddleware(mockAuthenticateApp)
  })

  it('應以有效的 Bearer token 認證成功並注入 appAuth', async () => {
    const ctx = createMockCtx('Bearer drp_app_validkey123')
    const next = vi.fn().mockResolvedValue(new Response('OK'))

    const result = await middleware.handle(ctx, next)

    expect(next).toHaveBeenCalled()
    expect(ctx.get<AppAuthContext>('appAuth')).toEqual(validContext)
  })

  it('缺少 Authorization header 應回傳 401', async () => {
    const ctx = createMockCtx()
    const next = vi.fn()

    const result = await middleware.handle(ctx, next)

    expect(next).not.toHaveBeenCalled()
    expect(result.status).toBe(401)
  })

  it('非 Bearer scheme 應回傳 401', async () => {
    const ctx = createMockCtx('Basic abc123')
    const next = vi.fn()

    const result = await middleware.handle(ctx, next)

    expect(next).not.toHaveBeenCalled()
    expect(result.status).toBe(401)
  })

  it('認證失敗應回傳 401', async () => {
    (mockAuthenticateApp.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: 'INVALID_APP_KEY',
      message: 'App Key 無效',
    })
    const ctx = createMockCtx('Bearer drp_app_invalidkey')
    const next = vi.fn()

    const result = await middleware.handle(ctx, next)

    expect(next).not.toHaveBeenCalled()
    expect(result.status).toBe(401)
  })

  it('getAppAuthContext 應正確取得已注入的認證上下文', async () => {
    const ctx = createMockCtx('Bearer drp_app_validkey123')
    const next = vi.fn().mockResolvedValue(new Response('OK'))

    await middleware.handle(ctx, next)

    const auth = AppAuthMiddleware.getAppAuthContext(ctx)
    expect(auth).toEqual(validContext)
  })

  it('未認證時 getAppAuthContext 應回傳 null', () => {
    const ctx = createMockCtx()
    const auth = AppAuthMiddleware.getAppAuthContext(ctx)
    expect(auth).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/SdkApi/__tests__/AppAuthMiddleware.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/SdkApi/Infrastructure/Middleware/AppAuthMiddleware.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { AuthenticateApp } from '../../Application/UseCases/AuthenticateApp'
import type { AppAuthContext } from '../../Application/DTOs/SdkApiDTO'

export class AppAuthMiddleware {
  constructor(private readonly authenticateApp: AuthenticateApp) {}

  async handle(ctx: IHttpContext, next: () => Promise<Response>): Promise<Response> {
    const header =
      ctx.getHeader('authorization') ??
      ctx.getHeader('Authorization') ??
      ctx.headers?.authorization ??
      ctx.headers?.Authorization

    if (!header) {
      return ctx.json(
        { success: false, message: '缺少 Authorization header', error: 'MISSING_AUTH' },
        401,
      )
    }

    const parts = header.split(' ')
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return ctx.json(
        { success: false, message: '無效的 Authorization 格式，需要 Bearer token', error: 'INVALID_AUTH_FORMAT' },
        401,
      )
    }

    const rawKey = parts[1]
    const result = await this.authenticateApp.execute(rawKey)

    if (!result.success || !result.context) {
      return ctx.json(
        { success: false, message: result.message ?? '認證失敗', error: result.error ?? 'AUTH_FAILED' },
        401,
      )
    }

    ctx.set('appAuth', result.context)
    return next()
  }

  static getAppAuthContext(ctx: IHttpContext): AppAuthContext | null {
    return ctx.get<AppAuthContext>('appAuth') ?? null
  }

  static isAuthenticated(ctx: IHttpContext): boolean {
    return !!ctx.get<AppAuthContext>('appAuth')
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/SdkApi/__tests__/AppAuthMiddleware.test.ts`
Expected: PASS — all 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/SdkApi/Infrastructure/Middleware/AppAuthMiddleware.ts src/Modules/SdkApi/__tests__/AppAuthMiddleware.test.ts
git commit -m "feat: [SdkApi] 新增 AppAuthMiddleware（drp_app_xxxx Bearer token 認證中介層）"
```

---

### Task 4: ProxyModelCall Use Case

**Files:**
- Create: `src/Modules/SdkApi/Application/UseCases/ProxyModelCall.ts`
- Test: `src/Modules/SdkApi/__tests__/ProxyModelCall.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/SdkApi/__tests__/ProxyModelCall.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProxyModelCall } from '../Application/UseCases/ProxyModelCall'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { AppAuthContext } from '../Application/DTOs/SdkApiDTO'

function createMockBifrostClient(shouldFail = false): BifrostClient {
  const mockResponse = {
    id: 'chatcmpl-123',
    object: 'chat.completion',
    model: 'gpt-4',
    choices: [{ message: { role: 'assistant', content: 'Hello!' }, index: 0, finish_reason: 'stop' }],
    usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
  }

  return {
    createVirtualKey: vi.fn(),
    listVirtualKeys: vi.fn(),
    getVirtualKey: vi.fn(),
    updateVirtualKey: vi.fn(),
    deleteVirtualKey: vi.fn(),
    getLogs: vi.fn(),
    getLogsStats: vi.fn(),
    listModels: vi.fn(),
    // 我們需要一個底層方法來代理呼叫；此處 mock ProxyModelCall 內部使用的 fetch
  } as unknown as BifrostClient
}

describe('ProxyModelCall', () => {
  let useCase: ProxyModelCall
  const bifrostBaseUrl = 'http://localhost:8787'
  const authContext: AppAuthContext = {
    appKeyId: 'appkey-1',
    orgId: 'org-1',
    bifrostVirtualKeyId: 'bfr-vk-1',
    scope: 'write',
    boundModuleIds: [],
  }

  beforeEach(() => {
    useCase = new ProxyModelCall(bifrostBaseUrl)
  })

  it('scope 為 read 時應拒絕代理呼叫', async () => {
    const readOnlyAuth: AppAuthContext = { ...authContext, scope: 'read' }
    const result = await useCase.execute(readOnlyAuth, {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'hi' }],
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('INSUFFICIENT_SCOPE')
  })

  it('缺少 model 應回傳錯誤', async () => {
    const result = await useCase.execute(authContext, {
      model: '',
      messages: [{ role: 'user', content: 'hi' }],
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('MISSING_MODEL')
  })

  it('缺少 messages 應回傳錯誤', async () => {
    const result = await useCase.execute(authContext, {
      model: 'gpt-4',
      messages: [],
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('MISSING_MESSAGES')
  })

  it('boundModules 不為空且包含 ai_chat 時應允許呼叫', async () => {
    const boundAuth: AppAuthContext = { ...authContext, boundModuleIds: ['ai_chat'] }
    // 會嘗試 fetch，但 fetch 不可用時會 catch
    const result = await useCase.execute(boundAuth, {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'hi' }],
    })
    // 即使 fetch 失敗，也不應是 scope 錯誤
    expect(result.error).not.toBe('INSUFFICIENT_SCOPE')
    expect(result.error).not.toBe('MODULE_NOT_ALLOWED')
  })

  it('boundModules 非空且不包含 ai_chat 時應拒絕', async () => {
    const boundAuth: AppAuthContext = { ...authContext, boundModuleIds: ['billing_only'] }
    const result = await useCase.execute(boundAuth, {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'hi' }],
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('MODULE_NOT_ALLOWED')
  })

  it('成功代理呼叫應透傳 Bifrost 回應', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        model: 'gpt-4',
        choices: [{ message: { role: 'assistant', content: 'Hello!' }, index: 0, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }), { status: 200 }),
    )
    const proxyWithMock = new ProxyModelCall(bifrostBaseUrl, mockFetch)

    const result = await proxyWithMock.execute(authContext, {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'hi' }],
    })

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect((result.data as Record<string, unknown>).model).toBe('gpt-4')
    expect(mockFetch).toHaveBeenCalledWith(
      `${bifrostBaseUrl}/v1/chat/completions`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer bfr-vk-1',
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('Bifrost 回傳非 200 應轉換為錯誤', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Model not found' } }), { status: 404 }),
    )
    const proxyWithMock = new ProxyModelCall(bifrostBaseUrl, mockFetch)

    const result = await proxyWithMock.execute(authContext, {
      model: 'nonexistent-model',
      messages: [{ role: 'user', content: 'hi' }],
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('BIFROST_ERROR')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/SdkApi/__tests__/ProxyModelCall.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/SdkApi/Application/UseCases/ProxyModelCall.ts
import type { AppAuthContext, ProxyCallRequest, ProxyCallResponse } from '../DTOs/SdkApiDTO'

type FetchFn = typeof globalThis.fetch

const SDK_MODULE_ID = 'ai_chat'

export class ProxyModelCall {
  constructor(
    private readonly bifrostBaseUrl: string,
    private readonly fetchFn: FetchFn = globalThis.fetch,
  ) {}

  async execute(auth: AppAuthContext, request: ProxyCallRequest): Promise<ProxyCallResponse> {
    try {
      // 檢查 scope：read 不允許代理呼叫
      if (auth.scope === 'read') {
        return { success: false, error: 'INSUFFICIENT_SCOPE', message: 'read scope 不允許呼叫模型' }
      }

      // 檢查 boundModules
      if (auth.boundModuleIds.length > 0 && !auth.boundModuleIds.includes(SDK_MODULE_ID)) {
        return { success: false, error: 'MODULE_NOT_ALLOWED', message: '此 App Key 未綁定 ai_chat 模組' }
      }

      // 驗證必要欄位
      if (!request.model) {
        return { success: false, error: 'MISSING_MODEL', message: '缺少 model 參數' }
      }

      if (!request.messages || request.messages.length === 0) {
        return { success: false, error: 'MISSING_MESSAGES', message: '缺少 messages 參數' }
      }

      // 組裝 Bifrost 請求
      const { model, messages, temperature, max_tokens, stream, ...rest } = request
      const bifrostPayload = {
        model,
        messages,
        ...(temperature != null && { temperature }),
        ...(max_tokens != null && { max_tokens }),
        ...(stream != null && { stream }),
        ...rest,
      }

      const url = `${this.bifrostBaseUrl}/v1/chat/completions`
      const response = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${auth.bifrostVirtualKeyId}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bifrostPayload),
      })

      if (!response.ok) {
        let errorBody: unknown
        try {
          errorBody = await response.json()
        } catch {
          errorBody = await response.text().catch(() => null)
        }
        return {
          success: false,
          error: 'BIFROST_ERROR',
          message: `Bifrost 回傳 ${response.status}`,
          data: errorBody,
        }
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '代理呼叫失敗'
      return { success: false, error: 'PROXY_ERROR', message }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/SdkApi/__tests__/ProxyModelCall.test.ts`
Expected: PASS — all 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/SdkApi/Application/UseCases/ProxyModelCall.ts src/Modules/SdkApi/__tests__/ProxyModelCall.test.ts
git commit -m "feat: [SdkApi] 新增 ProxyModelCall Use Case（代理 AI model 呼叫至 Bifrost）"
```

---

### Task 5: QueryUsage Use Case

**Files:**
- Create: `src/Modules/SdkApi/Application/UseCases/QueryUsage.ts`
- Test: `src/Modules/SdkApi/__tests__/QueryUsage.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/SdkApi/__tests__/QueryUsage.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryUsage } from '../Application/UseCases/QueryUsage'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { AppAuthContext } from '../Application/DTOs/SdkApiDTO'

function createMockBifrostClient(stats = {
  total_requests: 100,
  total_cost: 5.25,
  total_tokens: 50000,
  avg_latency: 320,
}): BifrostClient {
  return {
    getLogsStats: vi.fn().mockResolvedValue(stats),
    getLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
    createVirtualKey: vi.fn(),
    listVirtualKeys: vi.fn(),
    getVirtualKey: vi.fn(),
    updateVirtualKey: vi.fn(),
    deleteVirtualKey: vi.fn(),
    listModels: vi.fn(),
  } as unknown as BifrostClient
}

describe('QueryUsage', () => {
  let useCase: QueryUsage
  let mockClient: BifrostClient
  const authContext: AppAuthContext = {
    appKeyId: 'appkey-1',
    orgId: 'org-1',
    bifrostVirtualKeyId: 'bfr-vk-1',
    scope: 'read',
    boundModuleIds: [],
  }

  beforeEach(() => {
    mockClient = createMockBifrostClient()
    useCase = new QueryUsage(mockClient)
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
    expect(mockClient.getLogsStats).toHaveBeenCalledWith(
      expect.objectContaining({ virtual_key_ids: 'bfr-vk-1' }),
    )
  })

  it('應支援日期範圍過濾', async () => {
    const result = await useCase.execute(authContext, {
      startDate: '2026-04-01',
      endDate: '2026-04-09',
    })

    expect(result.success).toBe(true)
    expect(mockClient.getLogsStats).toHaveBeenCalledWith(
      expect.objectContaining({
        virtual_key_ids: 'bfr-vk-1',
        start_time: '2026-04-01',
        end_time: '2026-04-09',
      }),
    )
  })

  it('Bifrost 錯誤應回傳失敗', async () => {
    const failClient = {
      ...createMockBifrostClient(),
      getLogsStats: vi.fn().mockRejectedValue(new Error('Bifrost 連線失敗')),
    } as unknown as BifrostClient
    const failUseCase = new QueryUsage(failClient)

    const result = await failUseCase.execute(authContext)

    expect(result.success).toBe(false)
    expect(result.error).toBe('USAGE_QUERY_ERROR')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/SdkApi/__tests__/QueryUsage.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/SdkApi/Application/UseCases/QueryUsage.ts
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { AppAuthContext, UsageResponse } from '../DTOs/SdkApiDTO'

interface QueryUsageOptions {
  startDate?: string
  endDate?: string
}

export class QueryUsage {
  constructor(private readonly bifrostClient: BifrostClient) {}

  async execute(auth: AppAuthContext, options?: QueryUsageOptions): Promise<UsageResponse> {
    try {
      const stats = await this.bifrostClient.getLogsStats({
        virtual_key_ids: auth.bifrostVirtualKeyId,
        ...(options?.startDate && { start_time: options.startDate }),
        ...(options?.endDate && { end_time: options.endDate }),
      })

      return {
        success: true,
        message: '查詢成功',
        data: {
          totalRequests: stats.total_requests,
          totalCost: stats.total_cost,
          totalTokens: stats.total_tokens,
          avgLatency: stats.avg_latency,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢用量失敗'
      return { success: false, message, error: 'USAGE_QUERY_ERROR' }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/SdkApi/__tests__/QueryUsage.test.ts`
Expected: PASS — all 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/SdkApi/Application/UseCases/QueryUsage.ts src/Modules/SdkApi/__tests__/QueryUsage.test.ts
git commit -m "feat: [SdkApi] 新增 QueryUsage Use Case（透過 Bifrost 查詢 App Key 用量統計）"
```

---

### Task 6: QueryBalance Use Case

**Files:**
- Create: `src/Modules/SdkApi/Application/UseCases/QueryBalance.ts`
- Test: `src/Modules/SdkApi/__tests__/QueryBalance.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/SdkApi/__tests__/QueryBalance.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { QueryBalance } from '../Application/UseCases/QueryBalance'
import type { ICreditAccountRepository } from '@/Modules/Credit/Domain/Repositories/ICreditAccountRepository'
import type { AppAuthContext } from '../Application/DTOs/SdkApiDTO'

// 簡易 mock CreditAccountRepository
class MockCreditAccountRepo implements ICreditAccountRepository {
  private accounts = new Map<string, { balance: string; lowBalanceThreshold: string; status: string }>()

  async findByOrgId(orgId: string) {
    const account = this.accounts.get(orgId)
    if (!account) return null
    return account as any
  }

  setAccount(orgId: string, balance: string, status = 'active') {
    this.accounts.set(orgId, {
      balance,
      lowBalanceThreshold: '100',
      status,
    })
  }

  // 滿足介面的其他方法
  async findById() { return null }
  async save() {}
  async update() {}
  async delete() {}
  withTransaction() { return this }
}

describe('QueryBalance', () => {
  let useCase: QueryBalance
  let mockRepo: MockCreditAccountRepo
  const authContext: AppAuthContext = {
    appKeyId: 'appkey-1',
    orgId: 'org-1',
    bifrostVirtualKeyId: 'bfr-vk-1',
    scope: 'read',
    boundModuleIds: [],
  }

  beforeEach(() => {
    mockRepo = new MockCreditAccountRepo()
    useCase = new QueryBalance(mockRepo)
  })

  it('應成功查詢組織餘額', async () => {
    mockRepo.setAccount('org-1', '5000.50')

    const result = await useCase.execute(authContext)

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      balance: '5000.50',
      lowBalanceThreshold: '100',
      status: 'active',
    })
  })

  it('無帳戶時應回傳零餘額', async () => {
    const result = await useCase.execute(authContext)

    expect(result.success).toBe(true)
    expect(result.data!.balance).toBe('0')
  })

  it('scope 為 read 應允許查詢餘額', async () => {
    mockRepo.setAccount('org-1', '100')
    const readAuth: AppAuthContext = { ...authContext, scope: 'read' }

    const result = await useCase.execute(readAuth)

    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/SdkApi/__tests__/QueryBalance.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/SdkApi/Application/UseCases/QueryBalance.ts
import type { ICreditAccountRepository } from '@/Modules/Credit/Domain/Repositories/ICreditAccountRepository'
import type { AppAuthContext, BalanceQueryResponse } from '../DTOs/SdkApiDTO'

export class QueryBalance {
  constructor(private readonly creditAccountRepo: ICreditAccountRepository) {}

  async execute(auth: AppAuthContext): Promise<BalanceQueryResponse> {
    try {
      const account = await this.creditAccountRepo.findByOrgId(auth.orgId)

      if (!account) {
        return {
          success: true,
          message: '查詢成功',
          data: { balance: '0', lowBalanceThreshold: '100', status: 'active' },
        }
      }

      return {
        success: true,
        message: '查詢成功',
        data: {
          balance: account.balance,
          lowBalanceThreshold: account.lowBalanceThreshold,
          status: account.status,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢餘額失敗'
      return { success: false, message, error: 'BALANCE_QUERY_ERROR' }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/SdkApi/__tests__/QueryBalance.test.ts`
Expected: PASS — all 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/SdkApi/Application/UseCases/QueryBalance.ts src/Modules/SdkApi/__tests__/QueryBalance.test.ts
git commit -m "feat: [SdkApi] 新增 QueryBalance Use Case（查詢 Org Credit 餘額）"
```

---

### Task 7: SdkApiController

**Files:**
- Create: `src/Modules/SdkApi/Presentation/Controllers/SdkApiController.ts`
- Test: `src/Modules/SdkApi/__tests__/SdkApiController.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/SdkApi/__tests__/SdkApiController.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SdkApiController } from '../Presentation/Controllers/SdkApiController'
import { AppAuthMiddleware } from '../Infrastructure/Middleware/AppAuthMiddleware'
import type { ProxyModelCall } from '../Application/UseCases/ProxyModelCall'
import type { QueryUsage } from '../Application/UseCases/QueryUsage'
import type { QueryBalance } from '../Application/UseCases/QueryBalance'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { AppAuthContext } from '../Application/DTOs/SdkApiDTO'

const validAuth: AppAuthContext = {
  appKeyId: 'appkey-1',
  orgId: 'org-1',
  bifrostVirtualKeyId: 'bfr-vk-1',
  scope: 'write',
  boundModuleIds: [],
}

function createMockCtx(auth?: AppAuthContext, body?: unknown): IHttpContext {
  const store = new Map<string, unknown>()
  if (auth) store.set('appAuth', auth)
  return {
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => { store.set(key, value) },
    json: vi.fn((data, statusCode) => {
      return new Response(JSON.stringify(data), { status: statusCode ?? 200 })
    }),
    getJsonBody: vi.fn().mockResolvedValue(body ?? {}),
    getBody: vi.fn().mockResolvedValue(body ?? {}),
    getQuery: vi.fn((name: string) => undefined),
    getHeader: vi.fn(),
    getParam: vi.fn(),
    getPathname: vi.fn(),
    getBodyText: vi.fn(),
    params: {},
    query: {},
    headers: {},
    text: vi.fn(),
    redirect: vi.fn(),
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
        message: '查詢成功',
        data: { totalRequests: 100, totalCost: 5, totalTokens: 50000, avgLatency: 300 },
      }),
    } as unknown as QueryUsage

    mockBalance = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        message: '查詢成功',
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
    expect(mockProxy.execute).toHaveBeenCalledWith(validAuth, expect.objectContaining({ model: 'gpt-4' }))
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/SdkApi/__tests__/SdkApiController.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/SdkApi/Presentation/Controllers/SdkApiController.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AppAuthMiddleware } from '../../Infrastructure/Middleware/AppAuthMiddleware'
import type { ProxyModelCall } from '../../Application/UseCases/ProxyModelCall'
import type { QueryUsage } from '../../Application/UseCases/QueryUsage'
import type { QueryBalance } from '../../Application/UseCases/QueryBalance'
import type { ProxyCallRequest } from '../../Application/DTOs/SdkApiDTO'

export class SdkApiController {
  constructor(
    private readonly proxyModelCall: ProxyModelCall,
    private readonly queryUsage: QueryUsage,
    private readonly queryBalance: QueryBalance,
  ) {}

  async chatCompletions(ctx: IHttpContext): Promise<Response> {
    const auth = AppAuthMiddleware.getAppAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    }

    const body = await ctx.getJsonBody<ProxyCallRequest>()
    const result = await this.proxyModelCall.execute(auth, body)

    if (!result.success) {
      const status = result.error === 'INSUFFICIENT_SCOPE' ? 403
        : result.error === 'MODULE_NOT_ALLOWED' ? 403
        : result.error === 'MISSING_MODEL' || result.error === 'MISSING_MESSAGES' ? 400
        : result.error === 'BIFROST_ERROR' ? 502
        : 500
      return ctx.json(result, status)
    }

    return ctx.json(result.data, 200)
  }

  async getUsage(ctx: IHttpContext): Promise<Response> {
    const auth = AppAuthMiddleware.getAppAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    }

    const options = {
      startDate: ctx.getQuery('start_date'),
      endDate: ctx.getQuery('end_date'),
    }

    const result = await this.queryUsage.execute(auth, options)
    const status = result.success ? 200 : 500
    return ctx.json(result, status)
  }

  async getBalance(ctx: IHttpContext): Promise<Response> {
    const auth = AppAuthMiddleware.getAppAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    }

    const result = await this.queryBalance.execute(auth)
    const status = result.success ? 200 : 500
    return ctx.json(result, status)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/SdkApi/__tests__/SdkApiController.test.ts`
Expected: PASS — all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/SdkApi/Presentation/Controllers/SdkApiController.ts src/Modules/SdkApi/__tests__/SdkApiController.test.ts
git commit -m "feat: [SdkApi] 新增 SdkApiController（chatCompletions、getUsage、getBalance）"
```

---

### Task 8: Routes

**Files:**
- Create: `src/Modules/SdkApi/Presentation/Routes/sdkApi.routes.ts`

- [ ] **Step 1: Create routes**

```typescript
// src/Modules/SdkApi/Presentation/Routes/sdkApi.routes.ts
import type { IModuleRouter, Middleware } from '@/Shared/Presentation/IModuleRouter'
import type { SdkApiController } from '../Controllers/SdkApiController'
import type { AppAuthMiddleware } from '../../Infrastructure/Middleware/AppAuthMiddleware'

export function createAppAuthMiddlewareHandler(appAuthMiddleware: AppAuthMiddleware): Middleware {
  return (ctx, next) => appAuthMiddleware.handle(ctx, next)
}

export function registerSdkApiRoutes(
  router: IModuleRouter,
  controller: SdkApiController,
  appAuthMiddleware: AppAuthMiddleware,
): void {
  const auth = [createAppAuthMiddlewareHandler(appAuthMiddleware)]

  // AI Model 代理
  router.post('/sdk/v1/chat/completions', auth, (ctx) => controller.chatCompletions(ctx))

  // 用量查詢
  router.get('/sdk/v1/usage', auth, (ctx) => controller.getUsage(ctx))

  // 餘額查詢
  router.get('/sdk/v1/balance', auth, (ctx) => controller.getBalance(ctx))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Modules/SdkApi/Presentation/Routes/sdkApi.routes.ts
git commit -m "feat: [SdkApi] 新增 SDK API 路由定義（/sdk/v1/ 前綴）"
```

---

### Task 9: ServiceProvider

**Files:**
- Create: `src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts`

- [ ] **Step 1: Create ServiceProvider**

```typescript
// src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IAppApiKeyRepository } from '@/Modules/AppApiKey/Domain/Repositories/IAppApiKeyRepository'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { ICreditAccountRepository } from '@/Modules/Credit/Domain/Repositories/ICreditAccountRepository'
import { AuthenticateApp } from '../../Application/UseCases/AuthenticateApp'
import { ProxyModelCall } from '../../Application/UseCases/ProxyModelCall'
import { QueryUsage } from '../../Application/UseCases/QueryUsage'
import { QueryBalance } from '../../Application/UseCases/QueryBalance'
import { AppAuthMiddleware } from '../Middleware/AppAuthMiddleware'

export class SdkApiServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('authenticateApp', (c: IContainer) => {
      return new AuthenticateApp(
        c.make('appApiKeyRepository') as IAppApiKeyRepository,
      )
    })

    container.singleton('appAuthMiddleware', (c: IContainer) => {
      return new AppAuthMiddleware(
        c.make('authenticateApp') as AuthenticateApp,
      )
    })

    container.bind('proxyModelCall', () => {
      const bifrostBaseUrl = (process.env.BIFROST_API_URL ?? 'http://localhost:8787').replace(/\/+$/, '')
      return new ProxyModelCall(bifrostBaseUrl)
    })

    container.bind('queryUsage', (c: IContainer) => {
      return new QueryUsage(
        c.make('bifrostClient') as BifrostClient,
      )
    })

    container.bind('queryBalance', (c: IContainer) => {
      return new QueryBalance(
        c.make('creditAccountRepository') as ICreditAccountRepository,
      )
    })
  }

  override boot(_context: unknown): void {
    console.log('🔌 [SdkApi] Module loaded')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts
git commit -m "feat: [SdkApi] 新增 SdkApiServiceProvider（DI 註冊）"
```

---

### Task 10: Barrel Export

**Files:**
- Create: `src/Modules/SdkApi/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
// src/Modules/SdkApi/index.ts
export { SdkApiController } from './Presentation/Controllers/SdkApiController'
export { registerSdkApiRoutes } from './Presentation/Routes/sdkApi.routes'
export { SdkApiServiceProvider } from './Infrastructure/Providers/SdkApiServiceProvider'
export { AppAuthMiddleware } from './Infrastructure/Middleware/AppAuthMiddleware'
export { AuthenticateApp } from './Application/UseCases/AuthenticateApp'
export { ProxyModelCall } from './Application/UseCases/ProxyModelCall'
export { QueryUsage } from './Application/UseCases/QueryUsage'
export { QueryBalance } from './Application/UseCases/QueryBalance'
```

- [ ] **Step 2: Commit**

```bash
git add src/Modules/SdkApi/index.ts
git commit -m "feat: [SdkApi] 新增 barrel export"
```

---

### Task 11: Wiring + Bootstrap + Routes 整合

**Files:**
- Modify: `src/wiring/index.ts`
- Modify: `src/bootstrap.ts`
- Modify: `src/routes.ts`

- [ ] **Step 1: 修改 `src/wiring/index.ts`**

在檔案末尾新增：

```typescript
import { SdkApiController, registerSdkApiRoutes, AppAuthMiddleware } from '@/Modules/SdkApi'

/**
 * 註冊 SdkApi 模組
 */
export const registerSdkApi = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const controller = new SdkApiController(
    core.container.make('proxyModelCall') as any,
    core.container.make('queryUsage') as any,
    core.container.make('queryBalance') as any,
  )
  const appAuthMiddleware = core.container.make('appAuthMiddleware') as AppAuthMiddleware
  registerSdkApiRoutes(router, controller, appAuthMiddleware)
}
```

- [ ] **Step 2: 修改 `src/bootstrap.ts`**

新增 import 與註冊：

```typescript
import { SdkApiServiceProvider } from './Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider'
```

在 `core.register(...)` 區塊最後新增：

```typescript
core.register(createGravitoServiceProvider(new SdkApiServiceProvider()))
```

- [ ] **Step 3: 修改 `src/routes.ts`**

在 import 區塊新增：

```typescript
import { registerSdkApi } from './wiring'
```

（若 `registerSdkApi` 已由 `./wiring` 統一匯出則無需額外 import）

在 `registerRoutes` 函式內，`await registerDocs(core)` 前新增：

```typescript
registerSdkApi(core)
```

- [ ] **Step 4: 驗證應用啟動**

Run: `bun run dev`
Expected: 看到 `🔌 [SdkApi] Module loaded` 和 `✅ Routes registered`

- [ ] **Step 5: Commit**

```bash
git add src/wiring/index.ts src/bootstrap.ts src/routes.ts
git commit -m "feat: [SdkApi] 整合 Wiring、Bootstrap、Routes 完成 SDK API 模組註冊"
```

---

### Task 12: 端對端整合測試

**Files:**
- Create: `src/Modules/SdkApi/__tests__/SdkApiIntegration.test.ts`

- [ ] **Step 1: Write integration test**

```typescript
// src/Modules/SdkApi/__tests__/SdkApiIntegration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { AppApiKeyRepository } from '@/Modules/AppApiKey/Infrastructure/Repositories/AppApiKeyRepository'
import { AppApiKey } from '@/Modules/AppApiKey/Domain/Aggregates/AppApiKey'
import { AppKeyScope } from '@/Modules/AppApiKey/Domain/ValueObjects/AppKeyScope'
import { BoundModules } from '@/Modules/AppApiKey/Domain/ValueObjects/BoundModules'
import { AuthenticateApp } from '../Application/UseCases/AuthenticateApp'
import { AppAuthMiddleware } from '../Infrastructure/Middleware/AppAuthMiddleware'
import { ProxyModelCall } from '../Application/UseCases/ProxyModelCall'
import { QueryUsage } from '../Application/UseCases/QueryUsage'
import { QueryBalance } from '../Application/UseCases/QueryBalance'
import { SdkApiController } from '../Presentation/Controllers/SdkApiController'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

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
    json: vi.fn((data, statusCode) => new Response(JSON.stringify(data), { status: statusCode ?? 200 })),
    getJsonBody: vi.fn().mockResolvedValue(options.body ?? {}),
    getBody: vi.fn().mockResolvedValue(options.body ?? {}),
    getQuery: vi.fn((name: string) => options.queryParams?.[name]),
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => { store.set(key, value) },
    getParam: vi.fn(),
    getPathname: vi.fn(() => '/sdk/v1/chat/completions'),
    getBodyText: vi.fn(),
    params: {},
    query: options.queryParams ?? {},
    text: vi.fn(),
    redirect: vi.fn(),
  } as unknown as IHttpContext
}

describe('SdkApi Integration', () => {
  let db: MemoryDatabaseAccess
  let repo: AppApiKeyRepository
  let middleware: AppAuthMiddleware
  let controller: SdkApiController
  const rawKey = 'drp_app_integrationtest123'

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    repo = new AppApiKeyRepository(db)

    const authenticateApp = new AuthenticateApp(repo)
    middleware = new AppAuthMiddleware(authenticateApp)

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        id: 'chatcmpl-int',
        model: 'gpt-4',
        choices: [{ message: { role: 'assistant', content: 'Integration test!' } }],
      }), { status: 200 }),
    )
    const proxyModelCall = new ProxyModelCall('http://localhost:8787', mockFetch)

    const mockBifrostClient = {
      getLogsStats: vi.fn().mockResolvedValue({
        total_requests: 50,
        total_cost: 2.5,
        total_tokens: 25000,
        avg_latency: 200,
      }),
    } as unknown as BifrostClient
    const queryUsage = new QueryUsage(mockBifrostClient)

    const mockCreditRepo = {
      findByOrgId: vi.fn().mockResolvedValue({
        balance: '3000',
        lowBalanceThreshold: '100',
        status: 'active',
      }),
    } as any
    const queryBalance = new QueryBalance(mockCreditRepo)

    controller = new SdkApiController(proxyModelCall, queryUsage, queryBalance)

    // 建立測試 App Key
    const key = await AppApiKey.create({
      id: 'appkey-int-1',
      orgId: 'org-int-1',
      issuedByUserId: 'user-1',
      label: 'Integration Test Key',
      bifrostVirtualKeyId: 'bfr-vk-int-1',
      rawKey,
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

    // 先執行中介層
    const next = vi.fn().mockImplementation(async () => {
      return controller.chatCompletions(ctx)
    })
    const response = await middleware.handle(ctx, next)

    expect(response.status).toBe(200)
    const body = await response.json()
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
    const body = await response.json()
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
    const body = await response.json()
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
```

- [ ] **Step 2: Run all SDK API tests**

Run: `bun test src/Modules/SdkApi/`
Expected: PASS — all tests across all files pass

- [ ] **Step 3: Commit**

```bash
git add src/Modules/SdkApi/__tests__/SdkApiIntegration.test.ts
git commit -m "test: [SdkApi] 新增端對端整合測試（認證 → 代理/用量/餘額完整流程）"
```

---

## API 端點摘要

| Method | Path | 說明 | 認證 |
|--------|------|------|------|
| POST | `/sdk/v1/chat/completions` | 代理 AI model 呼叫 | `Bearer drp_app_xxxx` |
| GET | `/sdk/v1/usage` | 查詢用量統計 | `Bearer drp_app_xxxx` |
| GET | `/sdk/v1/balance` | 查詢 Org Credit 餘額 | `Bearer drp_app_xxxx` |

## 依賴清單

| 模組 | 依賴項目 | 說明 |
|------|----------|------|
| AppApiKey | `IAppApiKeyRepository` | 查詢 App Key by hash |
| AppApiKey | `AppApiKey` Aggregate | 狀態、scope、boundModules 檢查 |
| Credit | `ICreditAccountRepository` | 查詢 Org 餘額 |
| Foundation | `BifrostClient` | 查詢用量統計 |
| Foundation | `BifrostClientConfig` | 取得 Bifrost baseUrl 用於代理 |

## 設計決策備註

1. **ProxyModelCall 不使用 BifrostClient 類別**：因為 BifrostClient 是管理 API（Virtual Keys、Logs），而代理呼叫走的是 Bifrost 的 OpenAI-compatible `/v1/chat/completions` 端點，使用 Virtual Key ID 作為 Bearer token 直接 fetch。
2. **AppAuthMiddleware 是 Middleware 模式，不是 static method**：因為它需要注入 AuthenticateApp use case，而非像 JWT AuthMiddleware 那樣可以全域建立。
3. **scope 檢查分層**：AppAuthMiddleware 只負責認證（是否為有效的 active key），scope 權限檢查（read/write/admin）由各 Use Case 自行判斷。
4. **boundModules 檢查**：ProxyModelCall 檢查 `ai_chat` 模組是否在 boundModules 內（空 boundModules = 不限制）。
5. **grace period 支援**：AuthenticateApp 在主 hash 找不到時，會嘗試 previousKeyHash 查詢，支援 Key 輪換寬限期。
