# Redis Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Redis 持久化版 Rate Limit Middleware，保留 in-memory 版並統一 API，讓路由層可依部署情境選用。

**Architecture:** 新增 `incr` 至 `IRedisService`，建立 `InMemoryRateLimitMiddleware`（取代 `AuthRateLimitMiddleware`）與 `RedisRateLimitMiddleware`，兩者共用 `RateLimitConfig` 型別。最後更新消費端（`registerAuthRoutes.ts`、`middleware/index.ts`）並刪除舊檔案。

**Tech Stack:** Bun / Vitest / TypeScript strict / `IRedisService` (port) / `GravitoRedisAdapter` (`@gravito/plasma`) / `IHttpContext` (`Middleware` 型別)

---

## 檔案清單

| 動作 | 路徑 | 說明 |
|------|------|------|
| 修改 | `src/Shared/Infrastructure/IRedisService.ts` | 新增 `incr` 方法 |
| 修改 | `src/Shared/Infrastructure/Framework/GravitoRedisAdapter.ts` | 實作 `incr` |
| 新增 | `src/Shared/Infrastructure/Framework/__tests__/GravitoRedisAdapter.test.ts` | 測試 `incr` |
| 新增 | `src/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware.ts` | in-memory 版工廠 |
| 新增 | `src/Shared/Infrastructure/Middleware/__tests__/InMemoryRateLimitMiddleware.test.ts` | in-memory 測試 |
| 新增 | `src/Shared/Infrastructure/Middleware/RedisRateLimitMiddleware.ts` | Redis 版工廠 |
| 新增 | `src/Shared/Infrastructure/Middleware/__tests__/RedisRateLimitMiddleware.test.ts` | Redis 測試 |
| 刪除 | `src/Website/Http/Security/AuthRateLimitMiddleware.ts` | 由 InMemory 版取代 |
| 修改 | `src/Website/Auth/routes/registerAuthRoutes.ts` | 改用 createInMemoryRateLimit |
| 修改 | `src/Website/Http/Middleware/index.ts` | 更新 exports |

---

## Task 1: IRedisService.incr + GravitoRedisAdapter 實作

**Files:**
- Modify: `src/Shared/Infrastructure/IRedisService.ts`
- Modify: `src/Shared/Infrastructure/Framework/GravitoRedisAdapter.ts`
- Create: `src/Shared/Infrastructure/Framework/__tests__/GravitoRedisAdapter.test.ts`

- [ ] **Step 1: 建立測試檔，寫 incr 失敗測試**

建立 `src/Shared/Infrastructure/Framework/__tests__/GravitoRedisAdapter.test.ts`：

```typescript
import { describe, expect, it, vi } from 'vitest'
import { GravitoRedisAdapter } from '../GravitoRedisAdapter'

const createMockPlasmaRedis = (incrReturn = 1, expireReturn = true) => ({
  ping: vi.fn().mockResolvedValue('PONG'),
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(1),
  exists: vi.fn().mockResolvedValue(0),
  incr: vi.fn().mockResolvedValue(incrReturn),
  expire: vi.fn().mockResolvedValue(expireReturn),
})

describe('GravitoRedisAdapter.incr', () => {
  it('新 key（count = 1）→ 呼叫 expire 設定 TTL，回傳 1', async () => {
    const plasma = createMockPlasmaRedis(1)
    const adapter = new GravitoRedisAdapter(plasma as any)
    const count = await adapter.incr('test:key', 60)
    expect(count).toBe(1)
    expect(plasma.incr).toHaveBeenCalledWith('test:key')
    expect(plasma.expire).toHaveBeenCalledWith('test:key', 60)
  })

  it('既有 key（count > 1）→ 不呼叫 expire，回傳累加值', async () => {
    const plasma = createMockPlasmaRedis(2)
    const adapter = new GravitoRedisAdapter(plasma as any)
    const count = await adapter.incr('test:key', 60)
    expect(count).toBe(2)
    expect(plasma.expire).not.toHaveBeenCalled()
  })

  it('每次呼叫都觸發 redis.incr', async () => {
    const plasma = createMockPlasmaRedis(3)
    const adapter = new GravitoRedisAdapter(plasma as any)
    await adapter.incr('rate:login:127.0.0.1:100', 600)
    expect(plasma.incr).toHaveBeenCalledWith('rate:login:127.0.0.1:100')
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗（incr 方法不存在）**

```bash
bun test src/Shared/Infrastructure/Framework/__tests__/GravitoRedisAdapter.test.ts
```

預期：`TypeError: adapter.incr is not a function` 或類似錯誤。

- [ ] **Step 3: 新增 incr 至 IRedisService**

在 `src/Shared/Infrastructure/IRedisService.ts` 的 `exists` 方法後新增：

```typescript
  /**
   * 原子遞增 key 的值，若 key 不存在則設為 1，同時設定 TTL。
   * 回傳遞增後的值。
   *
   * @param key - Redis key
   * @param ttlSeconds - key 的存活時間（秒），僅在 key 首次建立（count = 1）時設定
   */
  incr(key: string, ttlSeconds: number): Promise<number>
```

- [ ] **Step 4: 實作 GravitoRedisAdapter.incr**

在 `src/Shared/Infrastructure/Framework/GravitoRedisAdapter.ts` 的 `exists` 方法後新增：

```typescript
  async incr(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.redis.incr(key)
    if (count === 1) {
      await this.redis.expire(key, ttlSeconds)
    }
    return count
  }
```

- [ ] **Step 5: 執行測試，確認全部通過**

```bash
bun test src/Shared/Infrastructure/Framework/__tests__/GravitoRedisAdapter.test.ts
```

預期：3 個測試全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add src/Shared/Infrastructure/IRedisService.ts \
        src/Shared/Infrastructure/Framework/GravitoRedisAdapter.ts \
        src/Shared/Infrastructure/Framework/__tests__/GravitoRedisAdapter.test.ts
git commit -m "feat: [redis] IRedisService + GravitoRedisAdapter 新增 incr 原子遞增"
```

---

## Task 2: InMemoryRateLimitMiddleware

**Files:**
- Create: `src/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware.ts`
- Create: `src/Shared/Infrastructure/Middleware/__tests__/InMemoryRateLimitMiddleware.test.ts`

- [ ] **Step 1: 建立測試檔**

建立 `src/Shared/Infrastructure/Middleware/__tests__/InMemoryRateLimitMiddleware.test.ts`：

```typescript
import { describe, expect, it, vi } from 'vitest'
import { createInMemoryRateLimit } from '../InMemoryRateLimitMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

const createMockContext = (ip?: string): IHttpContext => {
  const state: Record<string, unknown> = {}
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: (name: string) => {
      if (name === 'x-forwarded-for') return ip
      return undefined
    },
    getPathname: () => '/',
    getMethod: () => 'POST',
    getParam: () => undefined,
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: <T>(data: T, status = 200) => new Response(JSON.stringify(data), { status }),
    text: (content: string, status = 200) => new Response(content, { status }),
    redirect: (url: string, status = 302) =>
      new Response(null, { status, headers: { Location: url } }),
    get: <T>(key: string): T | undefined => state[key] as T,
    set: (key: string, value: unknown) => { state[key] = value },
    getCookie: () => undefined,
    setCookie: () => {},
  } as IHttpContext
}

describe('InMemoryRateLimitMiddleware', () => {
  it('請求數在限制內 → next() 執行，回傳 200', async () => {
    const mw = createInMemoryRateLimit({ scope: 'test', max: 3, windowMs: 60_000 })
    const ctx = createMockContext('1.2.3.4')
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })

  it('請求數超過限制 → 429，不執行 next()', async () => {
    const mw = createInMemoryRateLimit({ scope: 'test', max: 2, windowMs: 60_000 })
    const ctx = createMockContext('1.2.3.4')
    await mw(ctx, async () => new Response('ok'))
    await mw(ctx, async () => new Response('ok'))
    let called = false
    const response = await mw(ctx, async () => {
      called = true
      return new Response('ok')
    })
    expect(response.status).toBe(429)
    expect(called).toBe(false)
    const body = await response.json()
    expect(body).toEqual({ success: false, message: 'Too many requests', error: 'RATE_LIMITED' })
  })

  it('429 回應包含 Retry-After header', async () => {
    const mw = createInMemoryRateLimit({ scope: 'test', max: 1, windowMs: 60_000 })
    const ctx = createMockContext('1.2.3.4')
    await mw(ctx, async () => new Response('ok'))
    const response = await mw(ctx, async () => new Response('ok'))
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBeTruthy()
  })

  it('窗口到期後計數重置 → next() 執行', async () => {
    const mw = createInMemoryRateLimit({ scope: 'reset', max: 1, windowMs: 50 })
    const ctx = createMockContext('1.2.3.4')
    await mw(ctx, async () => new Response('ok'))
    // 等窗口過期
    await new Promise(r => setTimeout(r, 60))
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })

  it('不同 scope 互不干擾', async () => {
    const mw1 = createInMemoryRateLimit({ scope: 'login', max: 1, windowMs: 60_000 })
    const mw2 = createInMemoryRateLimit({ scope: 'forgot', max: 1, windowMs: 60_000 })
    const ctx = createMockContext('1.2.3.4')
    await mw1(ctx, async () => new Response('ok'))
    // mw1 已滿，mw2 應仍可通過
    const response = await mw2(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })

  it('不同 IP 互不干擾', async () => {
    const mw = createInMemoryRateLimit({ scope: 'test', max: 1, windowMs: 60_000 })
    const ctx1 = createMockContext('1.1.1.1')
    const ctx2 = createMockContext('2.2.2.2')
    await mw(ctx1, async () => new Response('ok'))
    // ctx1 已滿，ctx2 應仍可通過
    const response = await mw(ctx2, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })

  it('無 IP header → 歸入 unknown，正常計數', async () => {
    const mw = createInMemoryRateLimit({ scope: 'test', max: 1, windowMs: 60_000 })
    const ctx = createMockContext(undefined)
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗（模組不存在）**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/InMemoryRateLimitMiddleware.test.ts
```

預期：`Cannot find module '../InMemoryRateLimitMiddleware'`

- [ ] **Step 3: 建立 InMemoryRateLimitMiddleware**

建立 `src/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware.ts`：

```typescript
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

export interface RateLimitConfig {
  /** key 前綴或計數器標籤，用於隔離不同端點的計數 */
  scope: string
  /** 窗口內最大請求數 */
  max: number
  /** 窗口大小（毫秒） */
  windowMs: number
}

const RATE_LIMITED_BODY = JSON.stringify({
  success: false,
  message: 'Too many requests',
  error: 'RATE_LIMITED',
})

/**
 * In-memory rate limit middleware factory（單機部署）。
 *
 * 使用 Map 追蹤每個 IP 在固定窗口內的請求計數。
 * 每個 createInMemoryRateLimit 呼叫建立獨立的計數器，不同端點互不干擾。
 */
export function createInMemoryRateLimit(config: RateLimitConfig): Middleware {
  const counts = new Map<string, { count: number; resetAt: number }>()

  return async (ctx, next) => {
    const ip =
      ctx.getHeader('x-forwarded-for') ?? ctx.getHeader('x-real-ip') ?? 'unknown'
    const key = `${config.scope}:${ip}`
    const now = Date.now()
    const entry = counts.get(key)

    if (!entry || now > entry.resetAt) {
      counts.set(key, { count: 1, resetAt: now + config.windowMs })
      return next()
    }

    if (entry.count >= config.max) {
      return new Response(RATE_LIMITED_BODY, {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      })
    }

    entry.count++
    return next()
  }
}
```

- [ ] **Step 4: 執行測試，確認全部通過**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/InMemoryRateLimitMiddleware.test.ts
```

預期：7 個測試全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware.ts \
        src/Shared/Infrastructure/Middleware/__tests__/InMemoryRateLimitMiddleware.test.ts
git commit -m "feat: [http] InMemoryRateLimitMiddleware — 通用固定窗口限速（in-memory）"
```

---

## Task 3: RedisRateLimitMiddleware

**Files:**
- Create: `src/Shared/Infrastructure/Middleware/RedisRateLimitMiddleware.ts`
- Create: `src/Shared/Infrastructure/Middleware/__tests__/RedisRateLimitMiddleware.test.ts`

- [ ] **Step 1: 建立測試檔**

建立 `src/Shared/Infrastructure/Middleware/__tests__/RedisRateLimitMiddleware.test.ts`：

```typescript
import { describe, expect, it, vi } from 'vitest'
import { createRedisRateLimit } from '../RedisRateLimitMiddleware'
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

const createMockRedis = (incrReturn: number | Error = 1): IRedisService => ({
  ping: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  incr: vi.fn().mockImplementation(() =>
    incrReturn instanceof Error
      ? Promise.reject(incrReturn)
      : Promise.resolve(incrReturn),
  ),
})

const createMockContext = (ip = '1.2.3.4'): IHttpContext => {
  const state: Record<string, unknown> = {}
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: (name: string) => {
      if (name === 'x-forwarded-for') return ip
      return undefined
    },
    getPathname: () => '/',
    getMethod: () => 'POST',
    getParam: () => undefined,
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: <T>(data: T, status = 200) => new Response(JSON.stringify(data), { status }),
    text: (content: string, status = 200) => new Response(content, { status }),
    redirect: (url: string, status = 302) =>
      new Response(null, { status, headers: { Location: url } }),
    get: <T>(key: string): T | undefined => state[key] as T,
    set: (key: string, value: unknown) => { state[key] = value },
    getCookie: () => undefined,
    setCookie: () => {},
  } as IHttpContext
}

describe('RedisRateLimitMiddleware', () => {
  const config = { scope: 'auth:login', max: 10, windowMs: 60_000 }

  it('Redis count 在限制內 → next() 執行，回傳 200', async () => {
    const redis = createMockRedis(5)
    const mw = createRedisRateLimit(redis, config)
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })

  it('Redis count 超過限制 → 429，不執行 next()', async () => {
    const redis = createMockRedis(11)
    const mw = createRedisRateLimit(redis, config)
    const ctx = createMockContext()
    let called = false
    const response = await mw(ctx, async () => {
      called = true
      return new Response('ok')
    })
    expect(response.status).toBe(429)
    expect(called).toBe(false)
    const body = await response.json()
    expect(body).toEqual({ success: false, message: 'Too many requests', error: 'RATE_LIMITED' })
  })

  it('429 回應包含 Retry-After header', async () => {
    const redis = createMockRedis(999)
    const mw = createRedisRateLimit(redis, config)
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('ok'))
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBeTruthy()
  })

  it('Redis.incr 拋錯（fail-open）→ next() 執行，回傳 200', async () => {
    const redis = createMockRedis(new Error('Redis connection refused'))
    const mw = createRedisRateLimit(redis, config)
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })

  it('呼叫 redis.incr 時 key 包含 scope 和 IP', async () => {
    const redis = createMockRedis(1)
    const mw = createRedisRateLimit(redis, { scope: 'auth:login', max: 10, windowMs: 60_000 })
    const ctx = createMockContext('10.0.0.1')
    await mw(ctx, async () => new Response('ok'))
    expect(redis.incr).toHaveBeenCalledWith(
      expect.stringContaining('auth:login'),
      expect.any(Number),
    )
    expect(redis.incr).toHaveBeenCalledWith(
      expect.stringContaining('10.0.0.1'),
      expect.any(Number),
    )
  })

  it('count 等於 max（邊界值）→ next() 執行', async () => {
    const redis = createMockRedis(10) // count === max
    const mw = createRedisRateLimit(redis, config)
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗（模組不存在）**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/RedisRateLimitMiddleware.test.ts
```

預期：`Cannot find module '../RedisRateLimitMiddleware'`

- [ ] **Step 3: 建立 RedisRateLimitMiddleware**

建立 `src/Shared/Infrastructure/Middleware/RedisRateLimitMiddleware.ts`：

```typescript
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'
import type { RateLimitConfig } from './InMemoryRateLimitMiddleware'

const RATE_LIMITED_BODY = JSON.stringify({
  success: false,
  message: 'Too many requests',
  error: 'RATE_LIMITED',
})

/**
 * Redis-backed rate limit middleware factory（多 instance 部署）。
 *
 * 使用固定窗口演算法：
 *   key = `rate:{scope}:{ip}:{windowIndex}`
 *   windowIndex = Math.floor(Date.now() / windowMs)
 *
 * Redis 故障時 fail-open：放行請求，保持服務可用。
 *
 * @param redis - IRedisService 實例（需支援 incr）
 * @param config - RateLimitConfig（scope、max、windowMs）
 */
export function createRedisRateLimit(redis: IRedisService, config: RateLimitConfig): Middleware {
  const ttlSeconds = Math.ceil(config.windowMs / 1000)

  return async (ctx, next) => {
    const ip =
      ctx.getHeader('x-forwarded-for') ?? ctx.getHeader('x-real-ip') ?? 'unknown'
    const windowIndex = Math.floor(Date.now() / config.windowMs)
    const key = `rate:${config.scope}:${ip}:${windowIndex}`

    try {
      const count = await redis.incr(key, ttlSeconds)
      if (count > config.max) {
        const resetAt = (windowIndex + 1) * config.windowMs
        return new Response(RATE_LIMITED_BODY, {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
          },
        })
      }
    } catch {
      // Redis 故障：fail-open，放行請求
    }

    return next()
  }
}
```

- [ ] **Step 4: 執行測試，確認全部通過**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/RedisRateLimitMiddleware.test.ts
```

預期：6 個測試全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/Shared/Infrastructure/Middleware/RedisRateLimitMiddleware.ts \
        src/Shared/Infrastructure/Middleware/__tests__/RedisRateLimitMiddleware.test.ts
git commit -m "feat: [http] RedisRateLimitMiddleware — Redis 持久化固定窗口限速（fail-open）"
```

---

## Task 4: 刪除舊檔案 + 更新消費端

**Files:**
- Delete: `src/Website/Http/Security/AuthRateLimitMiddleware.ts`
- Modify: `src/Website/Auth/routes/registerAuthRoutes.ts`（行 23-26、64、80、96）
- Modify: `src/Website/Http/Middleware/index.ts`

- [ ] **Step 1: 確認目前測試基線**

```bash
bun test src/Website/Auth/ src/Website/Http/__tests__/
```

預期：全部 PASS（記下通過數量作為基線）。

- [ ] **Step 2: 更新 middleware/index.ts**

將 `src/Website/Http/Middleware/index.ts` 中的 Auth rate limiting 區塊替換：

舊（移除）：
```typescript
// Auth rate limiting（用於 /login、/register、/forgot-password 路由）
export {
  createAuthRateLimit,
  forgotPasswordRateLimit,
  loginRateLimit,
} from '../Security/AuthRateLimitMiddleware'
```

新（取代）：
```typescript
// Rate limiting — in-memory（單機部署）
export { createInMemoryRateLimit } from '@/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware'
export type { RateLimitConfig } from '@/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware'

// Rate limiting — Redis（多 instance 部署）
export { createRedisRateLimit } from '@/Shared/Infrastructure/Middleware/RedisRateLimitMiddleware'
```

完整更新後的 `middleware/index.ts`：

```typescript
/**
 * Named middleware — 路由層的統一 import 入口。
 *
 * 在 registerXxxRoutes 裡從這裡 import，不直接引用各 Security/ 路徑。
 *
 * ## 擴充方式
 * 新增 route-level middleware 時，在這裡加一行 export。
 */

// Rate limiting — in-memory（單機部署，Map 計數）
export { createInMemoryRateLimit } from '@/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware'
export type { RateLimitConfig } from '@/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware'

// Rate limiting — Redis（多 instance 部署，原子計數）
export { createRedisRateLimit } from '@/Shared/Infrastructure/Middleware/RedisRateLimitMiddleware'

// Organization access control（用於需要 org manager 權限的路由）
export {
  requireOrganizationContext,
  requireOrganizationManager,
} from '@/Modules/Organization/Presentation/Middleware/OrganizationMiddleware'

import { createBodySizeLimitMiddleware } from '@/Shared/Infrastructure/Middleware/BodySizeLimitMiddleware'

// Body size limit（用於需要覆寫預設大小的路由，例如未來的檔案上傳）
export const bodyLimit = (maxBytes: number) => createBodySizeLimitMiddleware(maxBytes)
```

- [ ] **Step 3: 更新 registerAuthRoutes.ts**

在 `src/Website/Auth/routes/registerAuthRoutes.ts` 中：

移除舊 import（行 23-26）：
```typescript
import {
  forgotPasswordRateLimit,
  loginRateLimit,
} from '@/Website/Http/Security/AuthRateLimitMiddleware'
```

新增取代 import（加在其他 import 之後）：
```typescript
import { createInMemoryRateLimit } from '@/Shared/Infrastructure/Middleware/InMemoryRateLimitMiddleware'
```

在 `AUTH_PAGE_ROUTES` 陣列定義之前（約行 50），新增兩個 middleware 實例：

```typescript
const loginRateLimit = createInMemoryRateLimit({ scope: 'auth:login', max: 10, windowMs: 10 * 60 * 1000 })
const forgotPasswordRateLimit = createInMemoryRateLimit({ scope: 'auth:forgot', max: 5, windowMs: 60 * 60 * 1000 })
```

`AUTH_PAGE_ROUTES` 陣列中的 `middlewares: [loginRateLimit]` 和 `middlewares: [forgotPasswordRateLimit]` **不需要改動**（變數名稱相同）。

- [ ] **Step 4: 刪除舊的 AuthRateLimitMiddleware.ts**

```bash
rm src/Website/Http/Security/AuthRateLimitMiddleware.ts
```

- [ ] **Step 5: 執行全套測試，確認無回歸**

```bash
bun test src/Website/Auth/ src/Website/Http/__tests__/ src/Shared/Infrastructure/Middleware/__tests__/
```

預期：全部 PASS（與 Step 1 基線相同，新增 InMemory 和 Redis 的測試通過）。

- [ ] **Step 6: Commit**

```bash
git add src/Website/Http/Middleware/index.ts \
        src/Website/Auth/routes/registerAuthRoutes.ts
git rm src/Website/Http/Security/AuthRateLimitMiddleware.ts
git commit -m "refactor: [http] 以 InMemoryRateLimitMiddleware 取代 AuthRateLimitMiddleware，更新消費端"
```

---

## 完成確認

實作完成後，以下行為應成立：

| 情境 | 預期 |
|------|------|
| 單機：同 IP 超過 login 限制（10次/10分）| 429 |
| 多 instance：Redis INCR 累計超限 | 429 |
| Redis 故障 | 放行（fail-open） |
| 不同 scope 計數互不干擾 | 各自獨立 |
| 不同 IP 計數互不干擾 | 各自獨立 |
| `createInMemoryRateLimit` 可 import 自 middleware/index.ts | ✓ |
| `createRedisRateLimit` 可 import 自 middleware/index.ts | ✓ |
| `AuthRateLimitMiddleware.ts` 已刪除 | ✓ |
