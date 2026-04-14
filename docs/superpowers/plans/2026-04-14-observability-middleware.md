# Observability Middleware Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `RequestIdMiddleware`, `RequestLoggerMiddleware`, and `GlobalErrorMiddleware` to `HttpKernel.global()` for production-grade observability and safe error handling.

**Architecture:** Three middleware factory functions follow the existing `Middleware = (ctx, next) => Promise<Response>` pattern in `src/Shared/Infrastructure/Middleware/`. They are registered as the first three entries in `HttpKernel.global()` so they wrap every request. `GlobalErrorMiddleware` is outermost; `RequestIdMiddleware` is second so the logger can read the ID; `RequestLoggerMiddleware` is third and uses try/catch to log both success and error responses.

**Tech Stack:** TypeScript (strict), Bun runtime, Vitest test framework, existing `IHttpContext` interface (`@/Shared/Presentation/IHttpContext`)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/Shared/Infrastructure/Middleware/RequestIdMiddleware.ts` | Produce/pass-through `x-request-id` |
| Create | `src/Shared/Infrastructure/Middleware/RequestLoggerMiddleware.ts` | Structured JSON / colored-text log per request |
| Create | `src/Shared/Infrastructure/Middleware/GlobalErrorMiddleware.ts` | Catch unhandled exceptions, format safe response |
| Create | `src/Shared/Infrastructure/Middleware/__tests__/RequestIdMiddleware.test.ts` | Unit tests |
| Create | `src/Shared/Infrastructure/Middleware/__tests__/RequestLoggerMiddleware.test.ts` | Unit tests |
| Create | `src/Shared/Infrastructure/Middleware/__tests__/GlobalErrorMiddleware.test.ts` | Unit tests |
| Modify | `src/Website/Http/HttpKernel.ts` | Add three new middleware to `global()` |

---

## Task 1: RequestIdMiddleware

**Files:**
- Create: `src/Shared/Infrastructure/Middleware/RequestIdMiddleware.ts`
- Create: `src/Shared/Infrastructure/Middleware/__tests__/RequestIdMiddleware.test.ts`

- [ ] **Step 1.1: Write the failing tests**

Create `src/Shared/Infrastructure/Middleware/__tests__/RequestIdMiddleware.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { createRequestIdMiddleware } from '../RequestIdMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

const createMockContext = (opts: { requestId?: string } = {}): IHttpContext => {
  const state: Record<string, unknown> = {}
  const headers: Record<string, string | undefined> = {
    'x-request-id': opts.requestId,
  }
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: (name: string) => headers[name.toLowerCase()],
    getPathname: () => '/',
    getMethod: () => 'GET',
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
    set: (key: string, value: unknown) => {
      state[key] = value
    },
    getCookie: () => undefined,
    setCookie: () => {},
  } as IHttpContext
}

describe('RequestIdMiddleware', () => {
  const mw = createRequestIdMiddleware()

  it('上游有 x-request-id → 透傳並存入 ctx', async () => {
    const upstream = 'upstream-id-123'
    const ctx = createMockContext({ requestId: upstream })
    const response = await mw(ctx, async () => new Response('ok'))
    expect(ctx.get('requestId')).toBe(upstream)
    expect(response.headers.get('x-request-id')).toBe(upstream)
  })

  it('上游無 x-request-id → 產生新 UUID 存入 ctx', async () => {
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('ok'))
    const id = ctx.get<string>('requestId')
    expect(id).toBeDefined()
    expect(typeof id).toBe('string')
    expect(id!.length).toBeGreaterThan(0)
    expect(response.headers.get('x-request-id')).toBe(id)
  })

  it('每次產生的 ID 不重複', async () => {
    const mw2 = createRequestIdMiddleware()
    const ctx1 = createMockContext()
    const ctx2 = createMockContext()
    await mw(ctx1, async () => new Response('ok'))
    await mw2(ctx2, async () => new Response('ok'))
    expect(ctx1.get('requestId')).not.toBe(ctx2.get('requestId'))
  })

  it('response header x-request-id 保留原有 response headers', async () => {
    const ctx = createMockContext()
    const response = await mw(ctx, async () =>
      new Response('ok', { headers: { 'content-type': 'application/json' } }),
    )
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(response.headers.get('x-request-id')).toBeTruthy()
  })
})
```

- [ ] **Step 1.2: 確認測試失敗**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/RequestIdMiddleware.test.ts
```

預期：`Cannot find module '../RequestIdMiddleware'`

- [ ] **Step 1.3: 實作 RequestIdMiddleware**

Create `src/Shared/Infrastructure/Middleware/RequestIdMiddleware.ts`:

```typescript
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

/**
 * Middleware that assigns a unique ID to every request.
 *
 * Priority:
 * 1. Upstream `x-request-id` header (e.g. from Cloudflare / load balancer)
 * 2. Newly generated `crypto.randomUUID()`
 *
 * Stores the ID in ctx under key `'requestId'` and appends `x-request-id`
 * to the response headers.
 */
export function createRequestIdMiddleware(): Middleware {
  return async (ctx, next) => {
    const id = ctx.getHeader('x-request-id') ?? crypto.randomUUID()
    ctx.set('requestId', id)

    const response = await next()
    const headers = new Headers(response.headers)
    headers.set('x-request-id', id)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}
```

- [ ] **Step 1.4: 確認測試通過**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/RequestIdMiddleware.test.ts
```

預期：全部 PASS

- [ ] **Step 1.5: Commit**

```bash
git add src/Shared/Infrastructure/Middleware/RequestIdMiddleware.ts \
        src/Shared/Infrastructure/Middleware/__tests__/RequestIdMiddleware.test.ts
git commit -m "feat: [http] RequestIdMiddleware — 透傳或產生 x-request-id"
```

---

## Task 2: RequestLoggerMiddleware

**Files:**
- Create: `src/Shared/Infrastructure/Middleware/RequestLoggerMiddleware.ts`
- Create: `src/Shared/Infrastructure/Middleware/__tests__/RequestLoggerMiddleware.test.ts`

- [ ] **Step 2.1: 寫失敗測試**

Create `src/Shared/Infrastructure/Middleware/__tests__/RequestLoggerMiddleware.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequestLoggerMiddleware } from '../RequestLoggerMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

const createMockContext = (opts: {
  method?: string
  path?: string
  requestId?: string
  ip?: string
  userAgent?: string
} = {}): IHttpContext => {
  const state: Record<string, unknown> = {
    requestId: opts.requestId ?? 'test-id',
  }
  const headers: Record<string, string | undefined> = {
    'x-forwarded-for': opts.ip,
    'user-agent': opts.userAgent,
  }
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: (name: string) => headers[name.toLowerCase()],
    getPathname: () => opts.path ?? '/test',
    getMethod: () => (opts.method ?? 'GET').toUpperCase(),
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
    set: (key: string, value: unknown) => {
      state[key] = value
    },
    getCookie: () => undefined,
    setCookie: () => {},
  } as IHttpContext
}

describe('RequestLoggerMiddleware', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.LOG_LEVEL
    delete process.env.NODE_ENV
  })

  describe('LOG_LEVEL=error (production default)', () => {
    it('200 response → 不輸出 log', async () => {
      process.env.LOG_LEVEL = 'error'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext()
      await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('404 response → 不輸出 log', async () => {
      process.env.LOG_LEVEL = 'error'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext()
      await mw(ctx, async () => new Response('not found', { status: 404 }))
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('500 response → 輸出 JSON log', async () => {
      process.env.LOG_LEVEL = 'error'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext({ method: 'POST', path: '/api/test', requestId: 'req-abc' })
      await mw(ctx, async () => new Response('error', { status: 500 }))
      expect(consoleSpy).toHaveBeenCalledOnce()
      const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
      expect(logged.requestId).toBe('req-abc')
      expect(logged.method).toBe('POST')
      expect(logged.path).toBe('/api/test')
      expect(logged.status).toBe(500)
      expect(logged.level).toBe('error')
      expect(typeof logged.durationMs).toBe('number')
      expect(logged.durationMs).toBeGreaterThanOrEqual(0)
      expect(logged.timestamp).toBeDefined()
      expect(logged.env).toBeDefined()
    })
  })

  describe('LOG_LEVEL=warn', () => {
    it('200 response → 不輸出 log', async () => {
      process.env.LOG_LEVEL = 'warn'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext()
      await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('400 response → 輸出 JSON log', async () => {
      process.env.LOG_LEVEL = 'warn'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext()
      await mw(ctx, async () => new Response('bad request', { status: 400 }))
      expect(consoleSpy).toHaveBeenCalledOnce()
      const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
      expect(logged.status).toBe(400)
      expect(logged.level).toBe('warn')
    })
  })

  describe('LOG_LEVEL=info', () => {
    it('200 response → 不輸出 log', async () => {
      process.env.LOG_LEVEL = 'info'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext()
      await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('301 response → 輸出 JSON log', async () => {
      process.env.LOG_LEVEL = 'info'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext()
      await mw(ctx, async () => new Response(null, { status: 301 }))
      expect(consoleSpy).toHaveBeenCalledOnce()
      const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
      expect(logged.status).toBe(301)
      expect(logged.level).toBe('info')
    })
  })

  describe('LOG_LEVEL=debug', () => {
    it('200 response → 輸出 colored text log', async () => {
      process.env.LOG_LEVEL = 'debug'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext({ method: 'GET', path: '/health' })
      await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(consoleSpy).toHaveBeenCalledOnce()
      const output = consoleSpy.mock.calls[0][0] as string
      expect(output).toContain('GET')
      expect(output).toContain('/health')
      expect(output).toContain('200')
    })
  })

  it('handler throws → log 5xx 後 re-throw', async () => {
    process.env.LOG_LEVEL = 'error'
    const mw = createRequestLoggerMiddleware()
    const ctx = createMockContext({ path: '/broken' })
    const err = new Error('DB exploded')
    await expect(
      mw(ctx, async () => { throw err }),
    ).rejects.toThrow('DB exploded')
    expect(consoleSpy).toHaveBeenCalledOnce()
    const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(logged.status).toBe(500)
    expect(logged.msg).toBe('DB exploded')
    expect(logged.error).toBe('Error')
  })

  it('JSON log 格式可完整 parse', async () => {
    process.env.LOG_LEVEL = 'error'
    const mw = createRequestLoggerMiddleware()
    const ctx = createMockContext()
    await mw(ctx, async () => new Response('error', { status: 500 }))
    expect(() => JSON.parse(consoleSpy.mock.calls[0][0] as string)).not.toThrow()
  })
})
```

- [ ] **Step 2.2: 確認測試失敗**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/RequestLoggerMiddleware.test.ts
```

預期：`Cannot find module '../RequestLoggerMiddleware'`

- [ ] **Step 2.3: 實作 RequestLoggerMiddleware**

Create `src/Shared/Infrastructure/Middleware/RequestLoggerMiddleware.ts`:

```typescript
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function resolveLogLevel(): LogLevel {
  const env = process.env.LOG_LEVEL as LogLevel | undefined
  if (env && env in LOG_LEVEL_RANK) return env
  return process.env.NODE_ENV === 'production' ? 'error' : 'debug'
}

function shouldLog(status: number, level: LogLevel): boolean {
  if (level === 'debug') return true
  if (level === 'info') return status >= 300
  if (level === 'warn') return status >= 400
  return status >= 500 // error
}

function resolveLevel(status: number): LogLevel {
  if (status >= 500) return 'error'
  if (status >= 400) return 'warn'
  if (status >= 300) return 'info'
  return 'debug'
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  env: string
  requestId: string
  method: string
  path: string
  status: number
  durationMs: number
  ip: string
  userAgent: string
  msg?: string
  error?: string
}

/**
 * Middleware that logs each request as structured JSON (production) or
 * colored text (debug). Controlled by the LOG_LEVEL environment variable.
 *
 * Log level thresholds:
 * - debug: all requests (colored text)
 * - info:  3xx, 4xx, 5xx (JSON)
 * - warn:  4xx, 5xx (JSON)
 * - error: 5xx only (JSON)  ← production default
 *
 * Default: LOG_LEVEL=error when NODE_ENV=production, otherwise LOG_LEVEL=debug.
 */
export function createRequestLoggerMiddleware(): Middleware {
  return async (ctx, next) => {
    const configuredLevel = resolveLogLevel()
    const start = Date.now()
    const method = ctx.getMethod()
    const path = ctx.getPathname()
    const requestId = ctx.get<string>('requestId') ?? 'unknown'
    const ip =
      ctx.getHeader('x-forwarded-for') ?? ctx.getHeader('x-real-ip') ?? 'unknown'
    const userAgent = ctx.getHeader('user-agent') ?? 'unknown'
    const env = process.env.NODE_ENV ?? 'development'

    function emit(status: number, extra?: { msg?: string; error?: string }): void {
      const durationMs = Date.now() - start
      if (!shouldLog(status, configuredLevel)) return

      const level = resolveLevel(status)

      if (configuredLevel === 'debug') {
        // Colored text for local development
        const arrow = status >= 400 ? '\x1b[31m←\x1b[0m' : '\x1b[32m←\x1b[0m'
        console.log(
          `\x1b[36m→\x1b[0m ${method} ${path}\n${arrow} ${status}  ${durationMs}ms`,
        )
        return
      }

      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        env,
        requestId,
        method,
        path,
        status,
        durationMs,
        ip,
        userAgent,
        ...extra,
      }
      console.log(JSON.stringify(entry))
    }

    try {
      const response = await next()
      emit(response.status)
      return response
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      emit(500, { msg: error.message, error: error.constructor.name })
      throw err
    }
  }
}
```

- [ ] **Step 2.4: 確認測試通過**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/RequestLoggerMiddleware.test.ts
```

預期：全部 PASS

- [ ] **Step 2.5: Commit**

```bash
git add src/Shared/Infrastructure/Middleware/RequestLoggerMiddleware.ts \
        src/Shared/Infrastructure/Middleware/__tests__/RequestLoggerMiddleware.test.ts
git commit -m "feat: [http] RequestLoggerMiddleware — 依 LOG_LEVEL 輸出結構化 log"
```

---

## Task 3: GlobalErrorMiddleware

**Files:**
- Create: `src/Shared/Infrastructure/Middleware/GlobalErrorMiddleware.ts`
- Create: `src/Shared/Infrastructure/Middleware/__tests__/GlobalErrorMiddleware.test.ts`

- [ ] **Step 3.1: 寫失敗測試**

Create `src/Shared/Infrastructure/Middleware/__tests__/GlobalErrorMiddleware.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGlobalErrorMiddleware } from '../GlobalErrorMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

const createMockContext = (opts: {
  isInertia?: boolean
  acceptJson?: boolean
  requestId?: string
} = {}): IHttpContext => {
  const state: Record<string, unknown> = {
    requestId: opts.requestId ?? 'test-id',
  }
  const headers: Record<string, string | undefined> = {
    'x-inertia': opts.isInertia ? 'true' : undefined,
    accept: opts.acceptJson ? 'application/json' : 'text/html',
  }
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: (name: string) => headers[name.toLowerCase()],
    getPathname: () => '/',
    getMethod: () => 'GET',
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
    set: (key: string, value: unknown) => {
      state[key] = value
    },
    getCookie: () => undefined,
    setCookie: () => {},
  } as IHttpContext
}

describe('GlobalErrorMiddleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('handler 正常回應 → pass-through，不攔截', async () => {
    const mw = createGlobalErrorMiddleware()
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })

  it('handler 回傳 4xx Response → pass-through，不攔截', async () => {
    const mw = createGlobalErrorMiddleware()
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('not found', { status: 404 }))
    expect(response.status).toBe(404)
  })

  it('handler throw Response → pass-through', async () => {
    const mw = createGlobalErrorMiddleware()
    const ctx = createMockContext()
    const thrown = new Response('custom', { status: 422 })
    const response = await mw(ctx, async () => { throw thrown })
    expect(response.status).toBe(422)
  })

  it('JSON 請求 throw Error → JSON 500，不含 stack trace', async () => {
    const mw = createGlobalErrorMiddleware()
    const ctx = createMockContext({ acceptJson: true })
    const response = await mw(ctx, async () => { throw new Error('DB failed') })
    expect(response.status).toBe(500)
    const body = await response.json() as Record<string, unknown>
    expect(body.success).toBe(false)
    expect(body.error).toBe('INTERNAL_ERROR')
    expect(JSON.stringify(body)).not.toContain('DB failed')
    expect(JSON.stringify(body)).not.toContain('stack')
  })

  it('Inertia 請求 throw Error → Inertia 格式 JSON 500', async () => {
    const mw = createGlobalErrorMiddleware()
    const ctx = createMockContext({ isInertia: true })
    const response = await mw(ctx, async () => { throw new Error('crash') })
    expect(response.status).toBe(500)
    const body = await response.json() as Record<string, unknown>
    expect(body.component).toBeDefined()
    expect(JSON.stringify(body)).not.toContain('crash')
    expect(JSON.stringify(body)).not.toContain('stack')
  })

  it('一般 HTML 請求 throw Error → 500 text/html', async () => {
    const mw = createGlobalErrorMiddleware()
    const ctx = createMockContext()
    const response = await mw(ctx, async () => { throw new Error('boom') })
    expect(response.status).toBe(500)
    expect(response.headers.get('content-type')).toContain('text/html')
    const text = await response.text()
    expect(text).not.toContain('boom')
    expect(text).not.toContain('stack')
  })

  it('server-side error log 包含 requestId', async () => {
    const errorSpy = vi.spyOn(console, 'error')
    const mw = createGlobalErrorMiddleware()
    const ctx = createMockContext({ requestId: 'req-xyz', acceptJson: true })
    await mw(ctx, async () => { throw new Error('something') })
    expect(errorSpy).toHaveBeenCalled()
    const logArg = JSON.stringify(errorSpy.mock.calls[0])
    expect(logArg).toContain('req-xyz')
  })
})
```

- [ ] **Step 3.2: 確認測試失敗**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/GlobalErrorMiddleware.test.ts
```

預期：`Cannot find module '../GlobalErrorMiddleware'`

- [ ] **Step 3.3: 實作 GlobalErrorMiddleware**

Create `src/Shared/Infrastructure/Middleware/GlobalErrorMiddleware.ts`:

```typescript
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

/**
 * Outermost middleware that catches unhandled exceptions.
 *
 * Response format is determined by the request type:
 * - `X-Inertia` header present → Inertia-compatible JSON 500
 * - `Accept: application/json`  → JSON { success: false, error: "INTERNAL_ERROR" }
 * - Otherwise                   → plain text/html 500
 *
 * Stack traces are NEVER exposed to the client. The full error is logged
 * server-side with the requestId for tracing.
 */
export function createGlobalErrorMiddleware(): Middleware {
  return async (ctx, next) => {
    try {
      return await next()
    } catch (err) {
      // Pass through Response objects thrown intentionally
      if (err instanceof Response) return err

      const error = err instanceof Error ? err : new Error(String(err))
      const requestId = ctx.get<string>('requestId') ?? 'unknown'

      // Log full error server-side only
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          requestId,
          msg: error.message,
          stack: error.stack,
        }),
      )

      const isInertia = Boolean(ctx.getHeader('x-inertia'))
      const acceptsJson = (ctx.getHeader('accept') ?? '').includes('application/json')

      if (isInertia) {
        return new Response(
          JSON.stringify({
            component: 'Error',
            props: { status: 500 },
            url: ctx.getPathname(),
            version: null,
            clearHistory: false,
            encryptHistory: false,
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'X-Inertia': 'true',
            },
          },
        )
      }

      if (acceptsJson) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred. Please try again later.',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(
        '<!DOCTYPE html><html><body><h1>500 Internal Server Error</h1><p>An unexpected error occurred.</p></body></html>',
        {
          status: 500,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        },
      )
    }
  }
}
```

- [ ] **Step 3.4: 確認測試通過**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/GlobalErrorMiddleware.test.ts
```

預期：全部 PASS

- [ ] **Step 3.5: Commit**

```bash
git add src/Shared/Infrastructure/Middleware/GlobalErrorMiddleware.ts \
        src/Shared/Infrastructure/Middleware/__tests__/GlobalErrorMiddleware.test.ts
git commit -m "feat: [http] GlobalErrorMiddleware — 安全捕捉未處理 exception"
```

---

## Task 4: 接入 HttpKernel

**Files:**
- Modify: `src/Website/Http/HttpKernel.ts`

- [ ] **Step 4.1: 更新 HttpKernel.ts**

讀取 `src/Website/Http/HttpKernel.ts`，將 import 區塊和 `global()` 更新如下：

在現有 import 區加入（加在第一行 import 前或其後，視現有排列）：

```typescript
import { createGlobalErrorMiddleware } from '@/Shared/Infrastructure/Middleware/GlobalErrorMiddleware'
import { createRequestIdMiddleware } from '@/Shared/Infrastructure/Middleware/RequestIdMiddleware'
import { createRequestLoggerMiddleware } from '@/Shared/Infrastructure/Middleware/RequestLoggerMiddleware'
```

將 `global()` 改為：

```typescript
global: (): Middleware[] => {
  const corsOrigins = parseCorsAllowedOrigins()
  return [
    createGlobalErrorMiddleware(),
    createRequestIdMiddleware(),
    createRequestLoggerMiddleware(),
    createSecurityHeadersMiddleware(),
    ...(corsOrigins.length > 0
      ? [createCorsMiddleware({ allowedOrigins: corsOrigins, allowCredentials: true })]
      : []),
  ]
},
```

- [ ] **Step 4.2: TypeScript 型別檢查**

```bash
bun run typecheck 2>/dev/null || bunx tsc --noEmit
```

預期：無型別錯誤

- [ ] **Step 4.3: 執行全部 middleware 測試**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/
```

預期：全部 PASS（包含現有的 CorsGlobalMiddleware、SecurityHeadersGlobalMiddleware 等）

- [ ] **Step 4.4: Commit**

```bash
git add src/Website/Http/HttpKernel.ts
git commit -m "feat: [http] HttpKernel 接入 GlobalError + RequestId + RequestLogger"
```

---

## Self-Review

**Spec coverage check:**

| 需求 | 對應 Task |
|---|---|
| RequestIdMiddleware 透傳上游 ID | Task 1 |
| RequestIdMiddleware 產生新 UUID | Task 1 |
| x-request-id 加入 response header | Task 1 |
| LOG_LEVEL=debug 全記，colored text | Task 2 |
| LOG_LEVEL=info 記 3xx+ | Task 2 |
| LOG_LEVEL=warn 記 4xx+ | Task 2 |
| LOG_LEVEL=error 記 5xx | Task 2 |
| JSON log 含 timestamp/level/env/requestId | Task 2 |
| handler throw → 記 5xx 後 re-throw | Task 2 |
| GlobalError：pass-through Response | Task 3 |
| GlobalError：Inertia 請求 → Inertia JSON | Task 3 |
| GlobalError：JSON 請求 → JSON 500 | Task 3 |
| GlobalError：HTML 請求 → HTML 500 | Task 3 |
| 不暴露 stack trace 給 client | Task 3 |
| server log 含 requestId | Task 3 |
| 接入 HttpKernel.global() | Task 4 |

所有需求均有對應任務。
