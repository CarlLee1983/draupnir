# Request Body Size Limit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Gravito HTTP 層加入 Body Size Limit Middleware，預設 512 KB 全域保護，並暴露 `bodyLimit(n)` named middleware 供未來路由層覆寫。

**Architecture:** Global middleware 位於 `HttpKernel.global()` 最前，優先於 GlobalErrorMiddleware，讓 GlobalError 仍可捕捉任何非預期錯誤。使用兩道防線：先查 `Content-Length` header（快速路徑），若無 Content-Length 則讀取 body 並計算 byte 大小。所有邏輯封裝於 `BodySizeLimitMiddleware.ts`，HttpKernel 與 middleware/index.ts 各加一行即可。

**Tech Stack:** Bun / Vitest / TypeScript strict / `IHttpContext` (`Middleware` 型別) / `TextEncoder` for byte counting

---

## 檔案清單

| 動作 | 路徑 | 說明 |
|------|------|------|
| 新增 | `src/Shared/Infrastructure/Middleware/BodySizeLimitMiddleware.ts` | Factory + 回應格式 |
| 新增 | `src/Shared/Infrastructure/Middleware/__tests__/BodySizeLimitMiddleware.test.ts` | 完整測試 |
| 修改 | `src/Website/Http/HttpKernel.ts` | global() 加一行 |
| 修改 | `src/Website/Http/Middleware/index.ts` | 暴露 bodyLimit |

---

## Task 1: BodySizeLimitMiddleware — Content-Length 路徑

**Files:**
- Create: `src/Shared/Infrastructure/Middleware/BodySizeLimitMiddleware.ts`
- Create: `src/Shared/Infrastructure/Middleware/__tests__/BodySizeLimitMiddleware.test.ts`

- [ ] **Step 1: 建立測試檔，寫 Content-Length 相關失敗測試**

建立 `src/Shared/Infrastructure/Middleware/__tests__/BodySizeLimitMiddleware.test.ts`：

```typescript
import { describe, expect, it } from 'vitest'
import { createBodySizeLimitMiddleware } from '../BodySizeLimitMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

const createMockContext = (opts: {
  headers?: Record<string, string | undefined>
  bodyText?: string
} = {}): IHttpContext => {
  const state: Record<string, unknown> = {}
  const headers = opts.headers ?? {}
  const bodyText = opts.bodyText ?? ''
  return {
    getBodyText: async () => bodyText,
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
    set: (key: string, value: unknown) => { state[key] = value },
    getCookie: () => undefined,
    setCookie: () => {},
  } as IHttpContext
}

describe('BodySizeLimitMiddleware', () => {
  describe('Content-Length header 存在時', () => {
    it('Content-Length 在限制內 → next() 執行，回傳 200', async () => {
      const mw = createBodySizeLimitMiddleware(512 * 1024)
      const ctx = createMockContext({ headers: { 'content-length': '1024' } })
      const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(response.status).toBe(200)
    })

    it('Content-Length 超過限制 → 回傳 413，不執行 next()', async () => {
      const mw = createBodySizeLimitMiddleware(512 * 1024)
      const ctx = createMockContext({ headers: { 'content-length': String(600 * 1024) } })
      let called = false
      const response = await mw(ctx, async () => {
        called = true
        return new Response('ok')
      })
      expect(response.status).toBe(413)
      expect(called).toBe(false)
      const body = await response.json()
      expect(body).toEqual({
        success: false,
        message: 'Request too large',
        error: 'PAYLOAD_TOO_LARGE',
      })
    })

    it('Content-Length 等於限制（邊界值）→ next() 執行', async () => {
      const limit = 512 * 1024
      const mw = createBodySizeLimitMiddleware(limit)
      const ctx = createMockContext({ headers: { 'content-length': String(limit) } })
      const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(response.status).toBe(200)
    })

    it('Content-Length 為 1（遠小於限制）→ next() 執行', async () => {
      const mw = createBodySizeLimitMiddleware(512 * 1024)
      const ctx = createMockContext({ headers: { 'content-length': '1' } })
      const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(response.status).toBe(200)
    })
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗（模組不存在）**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/BodySizeLimitMiddleware.test.ts
```

預期：`Cannot find module '../BodySizeLimitMiddleware'` 或類似錯誤。

- [ ] **Step 3: 建立 BodySizeLimitMiddleware，實作 Content-Length 路徑**

建立 `src/Shared/Infrastructure/Middleware/BodySizeLimitMiddleware.ts`：

```typescript
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

const PAYLOAD_TOO_LARGE_BODY = JSON.stringify({
  success: false,
  message: 'Request too large',
  error: 'PAYLOAD_TOO_LARGE',
})

function tooLargeResponse(): Response {
  return new Response(PAYLOAD_TOO_LARGE_BODY, {
    status: 413,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Middleware that rejects requests exceeding `maxBytes`.
 *
 * Two-pass protection:
 * 1. If `Content-Length` header is present: check immediately (no body read).
 * 2. If absent (chunked transfer): read body and measure byte length via TextEncoder.
 *
 * @param maxBytes - Maximum allowed request body size in bytes.
 */
export function createBodySizeLimitMiddleware(maxBytes: number): Middleware {
  return async (ctx, next) => {
    const contentLength = ctx.getHeader('content-length')

    if (contentLength !== undefined) {
      const size = parseInt(contentLength, 10)
      if (!isNaN(size) && size > maxBytes) {
        return tooLargeResponse()
      }
      return next()
    }

    // No Content-Length: read body and check actual byte size
    const body = await ctx.getBodyText()
    const byteSize = new TextEncoder().encode(body).byteLength
    if (byteSize > maxBytes) {
      return tooLargeResponse()
    }

    return next()
  }
}
```

- [ ] **Step 4: 執行測試，確認 Content-Length 測試全部通過**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/BodySizeLimitMiddleware.test.ts
```

預期：4 個 `Content-Length header 存在時` 測試全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/Shared/Infrastructure/Middleware/BodySizeLimitMiddleware.ts \
        src/Shared/Infrastructure/Middleware/__tests__/BodySizeLimitMiddleware.test.ts
git commit -m "feat: [http] BodySizeLimitMiddleware — Content-Length 快速路徑"
```

---

## Task 2: BodySizeLimitMiddleware — Chunked（無 Content-Length）路徑

**Files:**
- Modify: `src/Shared/Infrastructure/Middleware/__tests__/BodySizeLimitMiddleware.test.ts`

- [ ] **Step 1: 在測試檔加入 chunked 相關測試（目前應該失敗）**

在 `BodySizeLimitMiddleware.test.ts` 的 `describe('BodySizeLimitMiddleware')` 內部，緊接現有 `describe` 之後加入：

```typescript
  describe('Content-Length header 不存在時（chunked transfer）', () => {
    it('body 大小在限制內 → next() 執行', async () => {
      const mw = createBodySizeLimitMiddleware(512 * 1024)
      const ctx = createMockContext({ bodyText: 'hello world' })
      const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(response.status).toBe(200)
    })

    it('body 大小超過限制 → 回傳 413', async () => {
      const mw = createBodySizeLimitMiddleware(100)
      const ctx = createMockContext({ bodyText: 'x'.repeat(200) })
      const response = await mw(ctx, async () => new Response('ok'))
      expect(response.status).toBe(413)
      const body = await response.json()
      expect(body).toEqual({
        success: false,
        message: 'Request too large',
        error: 'PAYLOAD_TOO_LARGE',
      })
    })

    it('body 為空 → next() 執行', async () => {
      const mw = createBodySizeLimitMiddleware(512 * 1024)
      const ctx = createMockContext()
      const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(response.status).toBe(200)
    })

    it('body 大小超過限制 → next() 不執行', async () => {
      const mw = createBodySizeLimitMiddleware(100)
      const ctx = createMockContext({ bodyText: 'x'.repeat(200) })
      let called = false
      await mw(ctx, async () => {
        called = true
        return new Response('ok')
      })
      expect(called).toBe(false)
    })

    it('body 恰等於限制（邊界值）→ next() 執行', async () => {
      const limit = 100
      const mw = createBodySizeLimitMiddleware(limit)
      // ASCII 字元：1 char = 1 byte
      const ctx = createMockContext({ bodyText: 'x'.repeat(limit) })
      const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(response.status).toBe(200)
    })
  })
```

- [ ] **Step 2: 執行測試，確認新增的測試也全部通過（BodySizeLimitMiddleware 已實作 chunked 路徑）**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/BodySizeLimitMiddleware.test.ts
```

預期：9 個測試全部 PASS（chunked 路徑在 Step 3 的實作已覆蓋，若有失敗則回到 `BodySizeLimitMiddleware.ts` 的 chunked 分支排查）。

- [ ] **Step 3: Commit**

```bash
git add src/Shared/Infrastructure/Middleware/__tests__/BodySizeLimitMiddleware.test.ts
git commit -m "test: [http] BodySizeLimitMiddleware — chunked transfer 測試"
```

---

## Task 3: 接入 HttpKernel.global()

**Files:**
- Modify: `src/Website/Http/HttpKernel.ts`

- [ ] **Step 1: 確認現有 HttpKernel 測試正常通過**

```bash
bun test src/Website/Http/__tests__/HttpKernel.test.ts
```

預期：全部 PASS。記下 `global()` 測試目前通過的條件（`>= 1` 且 `global[0]` 為 function），後續不會破壞。

- [ ] **Step 2: 修改 HttpKernel.ts，在 global() 最前加入 BodySizeLimit**

編輯 `src/Website/Http/HttpKernel.ts`，在頂端 import 區塊加入：

```typescript
import { createBodySizeLimitMiddleware } from '@/Shared/Infrastructure/Middleware/BodySizeLimitMiddleware'
```

修改 `global()` 函式，在 `createGlobalErrorMiddleware()` 之前加一行：

```typescript
global: (): Middleware[] => {
  const corsOrigins = parseCorsAllowedOrigins()
  return [
    createBodySizeLimitMiddleware(512 * 1024),
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

- [ ] **Step 3: 執行 HttpKernel 測試，確認全部通過**

```bash
bun test src/Website/Http/__tests__/HttpKernel.test.ts
```

預期：全部 PASS（`global[0]` 現在是 bodyLimit middleware，仍是 function；`global.length >= 1` 仍成立）。

- [ ] **Step 4: 執行全套 Middleware 測試，確認無回歸**

```bash
bun test src/Shared/Infrastructure/Middleware/__tests__/ src/Website/Http/__tests__/
```

預期：全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/Website/Http/HttpKernel.ts
git commit -m "feat: [http] HttpKernel.global() 接入 BodySizeLimitMiddleware（預設 512 KB）"
```

---

## Task 4: 暴露 bodyLimit Named Middleware

**Files:**
- Modify: `src/Website/Http/Middleware/index.ts`

- [ ] **Step 1: 修改 middleware/index.ts，加入 bodyLimit export**

在 `src/Website/Http/Middleware/index.ts` 尾端加入：

```typescript
// Body size limit（用於需要覆寫預設大小的路由，例如未來的檔案上傳）
export { createBodySizeLimitMiddleware } from '@/Shared/Infrastructure/Middleware/BodySizeLimitMiddleware'

export const bodyLimit = (maxBytes: number) => createBodySizeLimitMiddleware(maxBytes)
```

- [ ] **Step 2: 執行全套測試，確認無破壞**

```bash
bun test src/
```

預期：全部 PASS（不包含已知 pre-existing 失敗項：CliApi DeviceFlowE2E、Credit MockGateway）。

- [ ] **Step 3: Commit**

```bash
git add src/Website/Http/Middleware/index.ts
git commit -m "feat: [http] middleware/index.ts 暴露 bodyLimit named middleware"
```

---

## 完成確認

實作完成後，以下行為應成立：

| 情境 | 預期 |
|------|------|
| POST 請求帶 `Content-Length: 600000`（> 512KB）| 413 JSON 回應，不進 handler |
| POST 請求帶 `Content-Length: 1024`（< 512KB）| 正常通過 |
| POST 請求無 Content-Length，body 200 bytes | 正常通過 |
| POST 請求無 Content-Length，body 600KB | 413 JSON 回應 |
| 路由層使用 `bodyLimit(10 * 1024 * 1024)` | 該路由允許 10MB |
| GET 請求（通常無 body）| 正常通過 |
