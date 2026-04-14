# HTTP Middleware Kernel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立集中式 `HttpKernel` 管理所有 middleware，讓開發者有單一、清楚的擴充入口，並將 Gravito 框架型別隔離在唯一的 adapter 檔案。

**Architecture:** `HttpKernel.ts` 集中定義三層 middleware（global、page groups、named），全部使用專案自定義的 `Middleware = (ctx, next) => Promise<Response>` 型別。`GravitoKernelAdapter.ts` 是唯一知道 `GravitoMiddleware` 的檔案，負責在 bootstrap 邊界做型別轉換。`withInertiaPage.ts` 改用 `composePageHandler` + kernel groups，消除三份重複代碼。

**Tech Stack:** TypeScript strict, Vitest, Bun test runner，`@/` 對應 `./src/`

---

## 檔案結構

| 操作 | 路徑 | 職責 |
|------|------|------|
| Modify | `src/Shared/Infrastructure/Middleware/SecurityHeadersGlobalMiddleware.ts` | 改回傳 `Middleware` 型別，移除 `GravitoMiddleware` 依賴 |
| Modify | `src/Shared/Infrastructure/Middleware/CorsGlobalMiddleware.ts` | 同上，改用 `IHttpContext` API |
| Create | `src/Website/Http/HttpKernel.ts` | 集中定義 global / groups / named middleware |
| Create | `src/Website/Http/GravitoKernelAdapter.ts` | 唯一的 `Middleware → GravitoMiddleware` 轉換點 |
| Create | `src/Website/Http/middleware/index.ts` | named middleware 統一 re-export 入口 |
| Modify | `src/Website/Http/Inertia/withInertiaPage.ts` | 改用 `composePageHandler` + kernel groups |
| Modify | `src/bootstrap.ts` | 改用 `registerGlobalMiddlewares` 一行呼叫 |
| Create | `src/Shared/Infrastructure/Middleware/__tests__/SecurityHeadersGlobalMiddleware.test.ts` | SecurityHeaders 測試 |
| Create | `src/Shared/Infrastructure/Middleware/__tests__/CorsGlobalMiddleware.test.ts` | CORS 測試 |
| Create | `src/Website/Http/__tests__/HttpKernel.test.ts` | HttpKernel 結構測試 |
| Create | `src/Website/Http/__tests__/GravitoKernelAdapter.test.ts` | adapter 橋接測試 |
| Create | `src/Website/Http/__tests__/withInertiaPage.test.ts` | composePageHandler 測試 |

---

## Task 1：改寫 SecurityHeadersGlobalMiddleware

**Files:**
- Modify: `src/Shared/Infrastructure/Middleware/SecurityHeadersGlobalMiddleware.ts`
- Create: `src/Shared/Infrastructure/Middleware/__tests__/SecurityHeadersGlobalMiddleware.test.ts`

- [ ] **Step 1：寫失敗測試**

建立 `src/Shared/Infrastructure/Middleware/__tests__/SecurityHeadersGlobalMiddleware.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { createSecurityHeadersMiddleware } from '../SecurityHeadersGlobalMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

const createMockContext = (): IHttpContext => {
  const state: Record<string, unknown> = {}
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getPathname: () => '/',
    getMethod: () => 'GET',
    getParam: () => undefined,
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: <T>(data: T, status = 200) => new Response(JSON.stringify(data), { status }),
    text: (content: string, status = 200) => new Response(content, { status }),
    redirect: (url: string, status = 302) => new Response(null, { status, headers: { Location: url } }),
    get: <T>(key: string): T | undefined => state[key] as T,
    set: (key: string, value: unknown) => { state[key] = value },
    getCookie: () => undefined,
    setCookie: () => {},
  } as IHttpContext
}

describe('SecurityHeadersGlobalMiddleware', () => {
  it('response 加上所有安全 headers', async () => {
    const mw = createSecurityHeadersMiddleware()
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(response.headers.get('X-XSS-Protection')).toBe('0')
  })

  it('保留原始 response 的 status 和 body', async () => {
    const mw = createSecurityHeadersMiddleware()
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('hello', { status: 201 }))
    expect(response.status).toBe(201)
    expect(await response.text()).toBe('hello')
  })

  it('保留原始 response 既有的 headers', async () => {
    const mw = createSecurityHeadersMiddleware()
    const ctx = createMockContext()
    const response = await mw(ctx, async () =>
      new Response('ok', { headers: { 'Content-Type': 'application/json' } }),
    )
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/SecurityHeadersGlobalMiddleware.test.ts
```

預期：FAIL（`createSecurityHeadersMiddleware` 回傳 `GravitoMiddleware`，型別不符）

- [ ] **Step 3：改寫 SecurityHeadersGlobalMiddleware.ts**

將 `src/Shared/Infrastructure/Middleware/SecurityHeadersGlobalMiddleware.ts` 全部換成：

```ts
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

/**
 * Global security response headers middleware.
 *
 * Appends defensive HTTP headers to every response that leaves the server.
 * Register via HttpKernel.global() → GravitoKernelAdapter.registerGlobalMiddlewares().
 *
 * Headers applied:
 * - `X-Content-Type-Options: nosniff`
 * - `X-Frame-Options: SAMEORIGIN`
 * - `Referrer-Policy: strict-origin-when-cross-origin`
 * - `X-XSS-Protection: 0`
 */
export function createSecurityHeadersMiddleware(): Middleware {
  return async (_ctx, next) => {
    const response = await next()
    const headers = new Headers(response.headers)
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('X-Frame-Options', 'SAMEORIGIN')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    headers.set('X-XSS-Protection', '0')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}
```

- [ ] **Step 4：執行測試，確認通過**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/SecurityHeadersGlobalMiddleware.test.ts
```

預期：3 tests PASS

- [ ] **Step 5：Commit**

```bash
git add src/Shared/Infrastructure/Middleware/SecurityHeadersGlobalMiddleware.ts \
        src/Shared/Infrastructure/Middleware/__tests__/SecurityHeadersGlobalMiddleware.test.ts
git commit -m "refactor: [http] SecurityHeadersMiddleware 改用 Middleware 型別，移除 GravitoMiddleware 依賴"
```

---

## Task 2：改寫 CorsGlobalMiddleware

**Files:**
- Modify: `src/Shared/Infrastructure/Middleware/CorsGlobalMiddleware.ts`
- Create: `src/Shared/Infrastructure/Middleware/__tests__/CorsGlobalMiddleware.test.ts`

- [ ] **Step 1：寫失敗測試**

建立 `src/Shared/Infrastructure/Middleware/__tests__/CorsGlobalMiddleware.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { createCorsMiddleware } from '../CorsGlobalMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

const createMockContext = (opts: { method?: string; origin?: string } = {}): IHttpContext => {
  const state: Record<string, unknown> = {}
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: (name: string) => {
      if (name === 'origin') return opts.origin
      return undefined
    },
    getPathname: () => '/',
    getMethod: () => (opts.method ?? 'GET').toUpperCase(),
    getParam: () => undefined,
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: <T>(data: T, status = 200) => new Response(JSON.stringify(data), { status }),
    text: (content: string, status = 200) => new Response(content, { status }),
    redirect: (url: string, status = 302) => new Response(null, { status, headers: { Location: url } }),
    get: <T>(key: string): T | undefined => state[key] as T,
    set: (key: string, value: unknown) => { state[key] = value },
    getCookie: () => undefined,
    setCookie: () => {},
  } as IHttpContext
}

describe('CorsGlobalMiddleware', () => {
  const allowedOrigin = 'https://app.example.com'
  const mw = createCorsMiddleware({
    allowedOrigins: [allowedOrigin],
    allowCredentials: true,
  })

  it('OPTIONS preflight from allowed origin → 204 with CORS headers', async () => {
    const ctx = createMockContext({ method: 'OPTIONS', origin: allowedOrigin })
    const response = await mw(ctx, async () => new Response('should not be called'))
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin)
    expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy()
    expect(response.headers.get('Access-Control-Allow-Headers')).toBeTruthy()
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  it('OPTIONS preflight from disallowed origin → 204 without CORS headers', async () => {
    const ctx = createMockContext({ method: 'OPTIONS', origin: 'https://evil.com' })
    const response = await mw(ctx, async () => new Response('nope'))
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('GET from allowed origin → CORS headers added to response', async () => {
    const ctx = createMockContext({ method: 'GET', origin: allowedOrigin })
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin)
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  it('GET from disallowed origin → no CORS headers', async () => {
    const ctx = createMockContext({ method: 'GET', origin: 'https://evil.com' })
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('request with no origin → passes through unchanged', async () => {
    const ctx = createMockContext({ method: 'GET' })
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('parseCorsAllowedOrigins: 空字串環境變數回傳 []', async () => {
    const { parseCorsAllowedOrigins } = await import('../CorsGlobalMiddleware')
    const original = process.env.CORS_ALLOWED_ORIGINS
    delete process.env.CORS_ALLOWED_ORIGINS
    expect(parseCorsAllowedOrigins()).toEqual([])
    process.env.CORS_ALLOWED_ORIGINS = original
  })

  it('parseCorsAllowedOrigins: 逗號分隔字串解析正確', async () => {
    const { parseCorsAllowedOrigins } = await import('../CorsGlobalMiddleware')
    process.env.CORS_ALLOWED_ORIGINS = ' https://a.com , https://b.com '
    expect(parseCorsAllowedOrigins()).toEqual(['https://a.com', 'https://b.com'])
    delete process.env.CORS_ALLOWED_ORIGINS
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/CorsGlobalMiddleware.test.ts
```

預期：FAIL（`createCorsMiddleware` 目前回傳 `GravitoMiddleware`，`ctx.getMethod()` 不存在於 GravitoContext）

- [ ] **Step 3：改寫 CorsGlobalMiddleware.ts**

將 `src/Shared/Infrastructure/Middleware/CorsGlobalMiddleware.ts` 全部換成：

```ts
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

export interface CorsOptions {
  /** Allowed origins. Use `'*'` to allow any origin (not recommended with credentials). */
  allowedOrigins: string[] | '*'
  allowedMethods?: string[]
  allowedHeaders?: string[]
  exposeHeaders?: string[]
  allowCredentials?: boolean
  maxAge?: number
}

const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
const DEFAULT_HEADERS = ['Content-Type', 'Authorization', 'X-XSRF-TOKEN', 'X-CSRF-Token']

/**
 * Global CORS middleware.
 *
 * Register via HttpKernel.global() → GravitoKernelAdapter.registerGlobalMiddlewares().
 *
 * - OPTIONS preflight: returns 204 with CORS headers (does not call next).
 * - All other requests: calls next(), then appends CORS headers to the response.
 */
export function createCorsMiddleware(options: CorsOptions): Middleware {
  const allowedMethods = (options.allowedMethods ?? DEFAULT_METHODS).join(', ')
  const allowedHeaders = (options.allowedHeaders ?? DEFAULT_HEADERS).join(', ')
  const maxAge = String(options.maxAge ?? 86_400)

  function isOriginAllowed(origin: string): boolean {
    if (!origin) return false
    if (options.allowedOrigins === '*') return true
    return options.allowedOrigins.includes(origin)
  }

  return async (ctx, next) => {
    const origin = ctx.getHeader('origin') ?? ''
    const allowed = isOriginAllowed(origin)

    if (ctx.getMethod() === 'OPTIONS') {
      const headers = new Headers()
      if (allowed) {
        headers.set('Access-Control-Allow-Origin', origin)
        headers.set('Access-Control-Allow-Methods', allowedMethods)
        headers.set('Access-Control-Allow-Headers', allowedHeaders)
        headers.set('Access-Control-Max-Age', maxAge)
        headers.set('Vary', 'Origin')
        if (options.allowCredentials) {
          headers.set('Access-Control-Allow-Credentials', 'true')
        }
      }
      return new Response(null, { status: 204, headers })
    }

    const response = await next()
    if (!allowed) return response

    const headers = new Headers(response.headers)
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Vary', 'Origin')
    if (options.allowCredentials) {
      headers.set('Access-Control-Allow-Credentials', 'true')
    }
    if (options.exposeHeaders?.length) {
      headers.set('Access-Control-Expose-Headers', options.exposeHeaders.join(', '))
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}

/**
 * Parse `CORS_ALLOWED_ORIGINS` environment variable into an origin list.
 * Returns empty array (CORS disabled) when the variable is unset or blank.
 */
export function parseCorsAllowedOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
}
```

- [ ] **Step 4：執行測試，確認通過**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/CorsGlobalMiddleware.test.ts
```

預期：7 tests PASS

- [ ] **Step 5：Commit**

```bash
git add src/Shared/Infrastructure/Middleware/CorsGlobalMiddleware.ts \
        src/Shared/Infrastructure/Middleware/__tests__/CorsGlobalMiddleware.test.ts
git commit -m "refactor: [http] CorsMiddleware 改用 Middleware 型別，改用 IHttpContext API"
```

---

## Task 3：建立 HttpKernel.ts

**Files:**
- Create: `src/Website/Http/HttpKernel.ts`
- Create: `src/Website/Http/__tests__/HttpKernel.test.ts`

- [ ] **Step 1：寫失敗測試**

建立 `src/Website/Http/__tests__/HttpKernel.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { HttpKernel } from '../HttpKernel'

describe('HttpKernel', () => {
  describe('global()', () => {
    it('至少包含 SecurityHeaders middleware', () => {
      const global = HttpKernel.global()
      expect(global.length).toBeGreaterThanOrEqual(1)
      expect(typeof global[0]).toBe('function')
    })

    it('每次呼叫回傳新陣列（不可變）', () => {
      expect(HttpKernel.global()).not.toBe(HttpKernel.global())
    })
  })

  describe('groups', () => {
    it('web group 包含 4 個 middleware（jwt + csrf + sharedData + pendingCookies）', () => {
      expect(HttpKernel.groups.web()).toHaveLength(4)
    })

    it('admin group 包含 5 個 middleware（web 基底 + requireAdmin + pendingCookies）', () => {
      expect(HttpKernel.groups.admin()).toHaveLength(5)
    })

    it('member group 包含 5 個 middleware（web 基底 + requireMember + pendingCookies）', () => {
      expect(HttpKernel.groups.member()).toHaveLength(5)
    })

    it('所有 group middleware 都是函式', () => {
      for (const group of ['web', 'admin', 'member'] as const) {
        for (const mw of HttpKernel.groups[group]()) {
          expect(typeof mw).toBe('function')
        }
      }
    })

    it('每次呼叫回傳新陣列', () => {
      expect(HttpKernel.groups.web()).not.toBe(HttpKernel.groups.web())
    })
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

```bash
bun test src/Website/Http/__tests__/HttpKernel.test.ts
```

預期：FAIL（`HttpKernel` 不存在）

- [ ] **Step 3：建立 HttpKernel.ts**

建立 `src/Website/Http/HttpKernel.ts`：

```ts
import type { PendingCookie } from '@/Shared/Presentation/IHttpContext'
import { applyPendingCookies } from '@/Shared/Presentation/cookieUtils'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import {
  createCorsMiddleware,
  parseCorsAllowedOrigins,
} from '@/Shared/Infrastructure/Middleware/CorsGlobalMiddleware'
import { createSecurityHeadersMiddleware } from '@/Shared/Infrastructure/Middleware/SecurityHeadersGlobalMiddleware'
import { attachJwt } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { requireAdmin } from '@/Website/Admin/middleware/requireAdmin'
import { requireMember } from '@/Website/Member/middleware/requireMember'
import { attachWebCsrf } from './Security/CsrfMiddleware'
import { injectSharedData } from './Inertia/SharedPropsBuilder'

// ─── 內部 middleware 包裝 ──────────────────────────────────────────────────────

function injectSharedDataMiddleware(): Middleware {
  return async (ctx, next) => {
    injectSharedData(ctx)
    return next()
  }
}

function requireAdminMiddleware(): Middleware {
  return async (ctx, next) => {
    const r = requireAdmin(ctx)
    return r.ok ? next() : r.response!
  }
}

function requireMemberMiddleware(): Middleware {
  return async (ctx, next) => {
    const r = requireMember(ctx)
    return r.ok ? next() : r.response!
  }
}

function pendingCookiesMiddleware(): Middleware {
  return async (ctx, next) => {
    const response = await next()
    const pending = ctx.get<PendingCookie[]>('__pending_cookies__') ?? []
    return applyPendingCookies(response, pending)
  }
}

// ─── HttpKernel ────────────────────────────────────────────────────────────────

const corsOrigins = parseCorsAllowedOrigins()

/** 所有 page group 共用的基底 middleware 鏈 */
const webBase = (): Middleware[] => [
  attachJwt(),
  attachWebCsrf(),
  injectSharedDataMiddleware(),
]

/**
 * 集中式 middleware 定義。
 *
 * 全檔案只使用 `Middleware = (ctx, next) => Promise<Response>` 型別。
 * Gravito 型別轉換在 GravitoKernelAdapter.ts 處理。
 *
 * ## 擴充指南
 * - 新 global middleware（如 Session）→ `global()` 陣列加一行
 * - 所有 page 都要跑的 middleware → `webBase()` 陣列加一行
 * - 特定 page group 的 middleware → 對應 `groups.*()` 加一行
 * - 全新 page group → `groups` 加新 key
 */
export const HttpKernel = {
  /**
   * 層一：Global middleware — 每個請求都經過。
   * 掛載順序：SecurityHeaders → CORS（有設定時）
   */
  global: (): Middleware[] => [
    createSecurityHeadersMiddleware(),
    ...(corsOrigins.length > 0
      ? [createCorsMiddleware({ allowedOrigins: corsOrigins, allowCredentials: true })]
      : []),
  ],

  /**
   * 層二：Page middleware groups — 依 Inertia 存取區域套用。
   */
  groups: {
    /** 公開頁面（login、register 等），無 role check */
    web: (): Middleware[] => [...webBase(), pendingCookiesMiddleware()],
    /** Admin 區域：web 基底 + admin role 驗證 */
    admin: (): Middleware[] => [...webBase(), requireAdminMiddleware(), pendingCookiesMiddleware()],
    /** Member 區域：web 基底 + 登入驗證 */
    member: (): Middleware[] => [
      ...webBase(),
      requireMemberMiddleware(),
      pendingCookiesMiddleware(),
    ],
  },
} as const
```

- [ ] **Step 4：執行測試，確認通過**

```bash
bun test src/Website/Http/__tests__/HttpKernel.test.ts
```

預期：7 tests PASS

- [ ] **Step 5：Commit**

```bash
git add src/Website/Http/HttpKernel.ts src/Website/Http/__tests__/HttpKernel.test.ts
git commit -m "feat: [http] 建立 HttpKernel 集中式 middleware 定義"
```

---

## Task 4：建立 GravitoKernelAdapter.ts

**Files:**
- Create: `src/Website/Http/GravitoKernelAdapter.ts`
- Create: `src/Website/Http/__tests__/GravitoKernelAdapter.test.ts`

- [ ] **Step 1：寫失敗測試**

建立 `src/Website/Http/__tests__/GravitoKernelAdapter.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { toGravitoMiddleware } from '../GravitoKernelAdapter'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

/** 最小化的 GravitoContext mock，符合 fromGravitoContext 所需的介面 */
function createMockGravitoContext(opts: { method?: string } = {}): any {
  const state: Record<string, unknown> = {}
  return {
    req: {
      url: 'http://localhost/',
      method: opts.method ?? 'GET',
      header: (_name: string) => undefined,
      param: (_name: string) => undefined,
      params: () => ({}),
      text: async () => '',
    },
    res: undefined as Response | undefined,
    get: (key: string) => state[key],
    set: (key: string, value: unknown) => { state[key] = value },
    json: (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status }),
    text: (content: string, status = 200) => new Response(content, { status }),
    redirect: (url: string, status = 302) =>
      new Response(null, { status, headers: { Location: url } }),
  }
}

describe('GravitoKernelAdapter', () => {
  describe('toGravitoMiddleware', () => {
    it('middleware 的回傳 Response 寫入 gravitoCtx.res', async () => {
      const mw: Middleware = async (_ctx, next) => next()
      const wrapped = toGravitoMiddleware(mw)
      const gravitoCtx = createMockGravitoContext()

      // next() 模擬 Gravito 的 inner handler，會設定 ctx.res
      await wrapped(gravitoCtx, async () => {
        gravitoCtx.res = new Response('from-handler', { status: 200 })
      })

      expect(gravitoCtx.res).toBeInstanceOf(Response)
      expect(gravitoCtx.res?.status).toBe(200)
    })

    it('middleware 可短路回傳，不呼叫 next', async () => {
      const mw: Middleware = async (_ctx, _next) =>
        new Response('short-circuit', { status: 403 })
      const wrapped = toGravitoMiddleware(mw)
      const gravitoCtx = createMockGravitoContext()

      let nextCalled = false
      await wrapped(gravitoCtx, async () => {
        nextCalled = true
        gravitoCtx.res = new Response('should not reach', { status: 200 })
      })

      expect(nextCalled).toBe(false)
      expect(gravitoCtx.res?.status).toBe(403)
      expect(await gravitoCtx.res?.text()).toBe('short-circuit')
    })

    it('middleware 可修改 Response（如加 headers）', async () => {
      const mw: Middleware = async (_ctx, next) => {
        const res = await next()
        const headers = new Headers(res.headers)
        headers.set('X-Test', 'injected')
        return new Response(res.body, { status: res.status, headers })
      }
      const wrapped = toGravitoMiddleware(mw)
      const gravitoCtx = createMockGravitoContext()

      await wrapped(gravitoCtx, async () => {
        gravitoCtx.res = new Response('ok', { status: 200 })
      })

      expect(gravitoCtx.res?.headers.get('X-Test')).toBe('injected')
    })
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

```bash
bun test src/Website/Http/__tests__/GravitoKernelAdapter.test.ts
```

預期：FAIL（`GravitoKernelAdapter` 不存在）

- [ ] **Step 3：建立 GravitoKernelAdapter.ts**

建立 `src/Website/Http/GravitoKernelAdapter.ts`：

```ts
import type { GravitoMiddleware, PlanetCore } from '@gravito/core'
import { fromGravitoContext } from '@/Shared/Presentation/IHttpContext'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

/**
 * 將專案 Middleware 轉換為 GravitoMiddleware。
 *
 * 這是整個 codebase 唯一知道 GravitoMiddleware 型別的地方。
 * 所有型別轉換都集中在此，未來換框架只改這個檔案。
 */
export function toGravitoMiddleware(mw: Middleware): GravitoMiddleware {
  return async (gravitoCtx, next) => {
    const ctx = fromGravitoContext(gravitoCtx)
    gravitoCtx.res = await mw(ctx, async () => {
      await next()
      return gravitoCtx.res ?? new Response(null, { status: 200 })
    })
  }
}

/**
 * 將 HttpKernel.global() 的 middleware 清單掛載到 Gravito adapter。
 *
 * @example
 * ```ts
 * // bootstrap.ts
 * registerGlobalMiddlewares(core, HttpKernel.global())
 * ```
 */
export function registerGlobalMiddlewares(
  core: PlanetCore,
  middlewares: Middleware[],
): void {
  for (const mw of middlewares) {
    core.adapter.useGlobal(toGravitoMiddleware(mw))
  }
}
```

- [ ] **Step 4：執行測試，確認通過**

```bash
bun test src/Website/Http/__tests__/GravitoKernelAdapter.test.ts
```

預期：3 tests PASS

- [ ] **Step 5：Commit**

```bash
git add src/Website/Http/GravitoKernelAdapter.ts \
        src/Website/Http/__tests__/GravitoKernelAdapter.test.ts
git commit -m "feat: [http] 建立 GravitoKernelAdapter，唯一的 Middleware→GravitoMiddleware 轉換點"
```

---

## Task 5：建立 middleware/index.ts

**Files:**
- Create: `src/Website/Http/middleware/index.ts`

注意：這是純 re-export，不需要獨立測試（原始 middleware 已有或將在各自 task 中測試）。

- [ ] **Step 1：建立 middleware/index.ts**

建立 `src/Website/Http/middleware/index.ts`：

```ts
/**
 * Named middleware — 路由層的統一 import 入口。
 *
 * 在 registerXxxRoutes 裡從這裡 import，不直接引用各 Security/ 路徑。
 *
 * ## 擴充方式
 * 新增 route-level middleware 時，在這裡加一行 export。
 */

// Auth rate limiting（用於 /login、/register、/forgot-password 路由）
export {
  createAuthRateLimit,
  forgotPasswordRateLimit,
  loginRateLimit,
} from '../Security/AuthRateLimitMiddleware'

// Organization access control（用於需要 org manager 權限的路由）
export {
  requireOrganizationContext,
  requireOrganizationManager,
} from '@/Modules/Organization/Presentation/Middleware/OrganizationMiddleware'
```

- [ ] **Step 2：確認 TypeScript 無錯誤**

```bash
bunx tsc --noEmit 2>&1 | grep -E "middleware/index|AuthRateLimit" | head -10
```

預期：無輸出（無錯誤）

- [ ] **Step 3：Commit**

```bash
git add src/Website/Http/middleware/index.ts
git commit -m "feat: [http] 建立 middleware/index.ts，named middleware 統一入口"
```

---

## Task 6：簡化 withInertiaPage.ts

**Files:**
- Modify: `src/Website/Http/Inertia/withInertiaPage.ts`
- Create: `src/Website/Http/__tests__/withInertiaPage.test.ts`

- [ ] **Step 1：寫失敗測試**

建立 `src/Website/Http/__tests__/withInertiaPage.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { composePageHandler } from '../Inertia/withInertiaPage'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

const createMockContext = (): IHttpContext => {
  const state: Record<string, unknown> = {}
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getPathname: () => '/',
    getMethod: () => 'GET',
    getParam: () => undefined,
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: <T>(data: T, status = 200) => new Response(JSON.stringify(data), { status }),
    text: (content: string, status = 200) => new Response(content, { status }),
    redirect: (url: string, status = 302) => new Response(null, { status, headers: { Location: url } }),
    get: <T>(key: string): T | undefined => state[key] as T,
    set: (key: string, value: unknown) => { state[key] = value },
    getCookie: () => undefined,
    setCookie: () => {},
  } as IHttpContext
}

describe('composePageHandler', () => {
  it('middleware 依 onion 順序執行', async () => {
    const order: string[] = []
    const mw1: Middleware = async (_ctx, next) => {
      order.push('mw1-before')
      const r = await next()
      order.push('mw1-after')
      return r
    }
    const mw2: Middleware = async (_ctx, next) => {
      order.push('mw2-before')
      const r = await next()
      order.push('mw2-after')
      return r
    }
    const handler = async (_ctx: IHttpContext) => {
      order.push('handler')
      return new Response('ok')
    }

    const composed = composePageHandler([mw1, mw2], handler)
    await composed(createMockContext())

    expect(order).toEqual(['mw1-before', 'mw2-before', 'handler', 'mw2-after', 'mw1-after'])
  })

  it('middleware 可短路，後面的 middleware 和 handler 不執行', async () => {
    const order: string[] = []
    const shortCircuit: Middleware = async (_ctx, _next) => {
      order.push('short-circuit')
      return new Response('blocked', { status: 403 })
    }
    const shouldNotRun: Middleware = async (_ctx, next) => {
      order.push('should-not-run')
      return next()
    }

    const composed = composePageHandler([shortCircuit, shouldNotRun], async () => {
      order.push('handler')
      return new Response('ok')
    })
    const response = await composed(createMockContext())

    expect(order).toEqual(['short-circuit'])
    expect(response.status).toBe(403)
  })

  it('空 middleware 陣列 → 直接執行 handler', async () => {
    const handler = async (_ctx: IHttpContext) => new Response('direct', { status: 200 })
    const composed = composePageHandler([], handler)
    const response = await composed(createMockContext())
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('direct')
  })

  it('middleware 可修改 handler 回傳的 Response', async () => {
    const addHeader: Middleware = async (_ctx, next) => {
      const res = await next()
      const headers = new Headers(res.headers)
      headers.set('X-Added', 'yes')
      return new Response(res.body, { status: res.status, headers })
    }
    const composed = composePageHandler([addHeader], async () => new Response('ok'))
    const response = await composed(createMockContext())
    expect(response.headers.get('X-Added')).toBe('yes')
  })
})
```

- [ ] **Step 2：執行測試，確認失敗**

```bash
bun test src/Website/Http/__tests__/withInertiaPage.test.ts
```

預期：FAIL（`composePageHandler` 未 export）

- [ ] **Step 3：改寫 withInertiaPage.ts**

將 `src/Website/Http/Inertia/withInertiaPage.ts` 全部換成：

```ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { Middleware, RouteHandler } from '@/Shared/Presentation/IModuleRouter'
import { HttpKernel } from '../HttpKernel'

/**
 * 將 middleware 陣列 + handler 組合成 RouteHandler（onion model）。
 *
 * 執行順序：middlewares[0] → middlewares[1] → ... → handler
 * 每個 middleware 可在 next() 前後執行代碼（before/after hook）。
 *
 * Exported for testing.
 */
export function composePageHandler(
  middlewares: Middleware[],
  handler: (ctx: IHttpContext) => Promise<Response>,
): RouteHandler {
  return (ctx) => {
    const run = (i: number): Promise<Response> =>
      i >= middlewares.length ? handler(ctx) : middlewares[i]!(ctx, () => run(i + 1))
    return run(0)
  }
}

/**
 * 公開頁面 wrapper（login、register 等）。
 * Chain：attachJwt → attachWebCsrf → injectSharedData → applyPendingCookies → handler
 */
export function withInertiaPageHandler(
  handler: (ctx: IHttpContext) => Promise<Response>,
): RouteHandler {
  return composePageHandler(HttpKernel.groups.web(), handler)
}

/**
 * Admin 區域 wrapper。
 * Chain：attachJwt → attachWebCsrf → injectSharedData → requireAdmin → applyPendingCookies → handler
 */
export function withAdminInertiaPageHandler(
  handler: (ctx: IHttpContext) => Promise<Response>,
): RouteHandler {
  return composePageHandler(HttpKernel.groups.admin(), handler)
}

/**
 * Member 區域 wrapper。
 * Chain：attachJwt → attachWebCsrf → injectSharedData → requireMember → applyPendingCookies → handler
 */
export function withMemberInertiaPageHandler(
  handler: (ctx: IHttpContext) => Promise<Response>,
): RouteHandler {
  return composePageHandler(HttpKernel.groups.member(), handler)
}
```

- [ ] **Step 4：執行測試，確認通過**

```bash
bun test src/Website/Http/__tests__/withInertiaPage.test.ts
```

預期：4 tests PASS

- [ ] **Step 5：確認現有 tsc 無錯誤**

```bash
bunx tsc --noEmit 2>&1 | grep -E "withInertiaPage" | head -10
```

預期：無輸出

- [ ] **Step 6：Commit**

```bash
git add src/Website/Http/Inertia/withInertiaPage.ts \
        src/Website/Http/__tests__/withInertiaPage.test.ts
git commit -m "refactor: [http] withInertiaPage 改用 composePageHandler + HttpKernel groups，消除重複代碼"
```

---

## Task 7：更新 bootstrap.ts

**Files:**
- Modify: `src/bootstrap.ts`

- [ ] **Step 1：更新 bootstrap.ts 的 global middleware 區段**

開啟 `src/bootstrap.ts`，找到以下區塊（約第 89–103 行）：

```ts
// ─── Global middleware ────────────────────────────────────────────────────
// Registered after bootstrap() (adapter is locked after that) but before
// route registration.  Order matters: security headers → CORS.
core.adapter.useGlobal(createSecurityHeadersMiddleware())

const corsAllowedOrigins = parseCorsAllowedOrigins()
if (corsAllowedOrigins.length > 0) {
  core.adapter.useGlobal(
    createCorsMiddleware({
      allowedOrigins: corsAllowedOrigins,
      allowCredentials: true,
    }),
  )
}
// ─────────────────────────────────────────────────────────────────────────
```

換成：

```ts
// ─── Global middleware ────────────────────────────────────────────────────
// 順序由 HttpKernel.global() 定義，在此一行掛載全部。
// 擴充 global middleware 請至 src/Website/Http/HttpKernel.ts。
registerGlobalMiddlewares(core, HttpKernel.global())
// ─────────────────────────────────────────────────────────────────────────
```

- [ ] **Step 2：更新 import（移除舊的，加入新的）**

在 `src/bootstrap.ts` 頂部，移除以下 imports：

```ts
import {
  createCorsMiddleware,
  parseCorsAllowedOrigins,
} from '@/Shared/Infrastructure/Middleware/CorsGlobalMiddleware'
import { createSecurityHeadersMiddleware } from '@/Shared/Infrastructure/Middleware/SecurityHeadersGlobalMiddleware'
```

加入：

```ts
import { HttpKernel } from './Website/Http/HttpKernel'
import { registerGlobalMiddlewares } from './Website/Http/GravitoKernelAdapter'
```

- [ ] **Step 3：確認 TypeScript 無錯誤**

```bash
bunx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

預期：無錯誤輸出

- [ ] **Step 4：執行全套測試確認無迴歸**

```bash
bun test src tests/Unit
```

預期：所有既有測試 PASS，加上 Task 1–6 新增的測試

- [ ] **Step 5：Commit**

```bash
git add src/bootstrap.ts
git commit -m "refactor: [http] bootstrap 改用 registerGlobalMiddlewares，移除手動 useGlobal 呼叫"
```

---

## 驗收標準

- [ ] `bun test src tests/Unit` 全部 PASS
- [ ] `bunx tsc --noEmit` 無錯誤
- [ ] `src/Shared/Infrastructure/Middleware/SecurityHeadersGlobalMiddleware.ts` 不再 import `@gravito/core`
- [ ] `src/Shared/Infrastructure/Middleware/CorsGlobalMiddleware.ts` 不再 import `@gravito/core`
- [ ] `src/bootstrap.ts` 不再直接 import `createSecurityHeadersMiddleware` 或 `createCorsMiddleware`
- [ ] `src/Website/Http/GravitoKernelAdapter.ts` 是全專案唯一 import `GravitoMiddleware` 的非框架檔案
