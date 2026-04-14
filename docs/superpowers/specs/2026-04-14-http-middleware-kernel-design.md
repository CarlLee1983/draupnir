# HTTP Middleware Kernel 架構設計

**日期：** 2026-04-14  
**狀態：** 已核准，待實作

---

## 背景與目標

現有 middleware 散落三處（`bootstrap.ts`、各 `registerXxxRoutes`、`withInertiaPage.ts`），新開發者無法從單一位置理解「這個請求經過了哪些 middleware」，擴充新 middleware 也沒有清楚的模式可循。

目標：提供一個如 Laravel/AdonisJS 般的集中式 middleware 管理架構，讓開發者能明確知道如何管理與擴充，同時保持與 Gravito 框架的相容性（但隔離耦合）。

---

## 架構概覽

三層 middleware 結構不變，管理方式集中化：

```
Request
  └── [Layer 1] HttpKernel.global()     ← 每個請求都經過
        → SecurityHeaders
        → CORS（CORS_ALLOWED_ORIGINS 有設值時）
  └── [Layer 2] HttpKernel.groups.*()   ← Inertia 頁面 handler 的固定鏈
        → attachJwt → attachWebCsrf → injectSharedData
        → [requireAdmin | requireMember]（依 group）
        → applyPendingCookies
        → handler
  └── [Layer 3] middleware/index.ts     ← 路由層的 named middleware
        → loginRateLimit, forgotPasswordRateLimit, requireOrganizationManager...
```

---

## Gravito 框架隔離策略

專案使用兩種 middleware 型別：

| 型別 | 來源 | 說明 |
|------|------|------|
| `GravitoMiddleware` | `@gravito/core` | 用於 `core.adapter.useGlobal()`，修改 `ctx.res` |
| `Middleware` | `@/Shared/Presentation/IModuleRouter` | `(ctx, next) => Promise<Response>`，專案自定義 |

**設計原則：`HttpKernel` 內部只說 `Middleware`，`GravitoKernelAdapter` 是唯一的型別轉換點。**

```
HttpKernel.ts          → 只用 Middleware 型別
GravitoKernelAdapter.ts → 唯一知道 GravitoMiddleware 的地方
bootstrap.ts           → 呼叫 registerGlobalMiddlewares(core, HttpKernel.global())
```

---

## 新增檔案

### `src/Website/Http/HttpKernel.ts`

集中式 middleware 定義，全檔案只使用 `Middleware` 型別。

**層一 — Global：**
```ts
global: (): Middleware[] => [
  createSecurityHeadersMiddleware(),
  ...(corsOrigins.length > 0
    ? [createCorsMiddleware({ allowedOrigins: corsOrigins, allowCredentials: true })]
    : []),
]
```

**層二 — Page groups：**
```ts
const webBase = (): Middleware[] => [
  attachJwt(),
  attachWebCsrf(),
  injectSharedDataMiddleware(),
]

groups: {
  web:    (): Middleware[] => [...webBase(), pendingCookiesMiddleware()],
  admin:  (): Middleware[] => [...webBase(), requireAdminMiddleware(), pendingCookiesMiddleware()],
  member: (): Middleware[] => [...webBase(), requireMemberMiddleware(), pendingCookiesMiddleware()],
}
```

內部 helper 將同步函式（`requireAdmin`、`requireMember`、`injectSharedData`、`applyPendingCookies`）包裝成 `Middleware` 型別，讓 pipeline 組合保持一致。

**擴充模式：**
- 加 global middleware → `global()` 陣列加一行
- 加新 page group → `groups` 加一個 key
- 調整所有 page 共用的鏈 → 修改 `webBase()`

---

### `src/Website/Http/GravitoKernelAdapter.ts`

```ts
// 型別轉換
export function toGravitoMiddleware(mw: Middleware): GravitoMiddleware

// bootstrap 呼叫點
export function registerGlobalMiddlewares(core: PlanetCore, middlewares: Middleware[]): void
```

`toGravitoMiddleware` 的實作：將 `IHttpContext`（專案型別）橋接回 `GravitoContext`，確保 `gravitoCtx.res` 在 middleware 執行後被正確設定。

---

### `src/Website/Http/middleware/index.ts`

Route 層 named middleware 統一入口。開發者在 `registerXxxRoutes` 只從這裡 import，不直接從各 `Security/` 路徑取用。

```ts
export { loginRateLimit, forgotPasswordRateLimit, createAuthRateLimit }
export { requireOrganizationManager }
```

---

## 修改檔案

### `src/Shared/Infrastructure/Middleware/SecurityHeadersGlobalMiddleware.ts`

回傳型別從 `GravitoMiddleware` 改為 `Middleware`。

實作從「修改 `ctx.res`」改為「`await next()` 取得 Response 後建立新 Response」：

```ts
export function createSecurityHeadersMiddleware(): Middleware {
  return async (_ctx, next) => {
    const response = await next()
    const headers = new Headers(response.headers)
    headers.set('X-Content-Type-Options', 'nosniff')
    // ...
    return new Response(response.body, { status: response.status, headers })
  }
}
```

### `src/Shared/Infrastructure/Middleware/CorsGlobalMiddleware.ts`

回傳型別從 `GravitoMiddleware` 改為 `Middleware`。

- Preflight：直接回傳帶 CORS headers 的 `new Response(null, { status: 204, headers })`
- 一般請求：`await next()` 後在新 Response 上附加 CORS headers
- `ctx.req.header()` → `ctx.getHeader()`，`ctx.header()` → Headers 物件操作

### `src/Website/Http/Inertia/withInertiaPage.ts`

三個 wrapper 改用 `composePageHandler(HttpKernel.groups.xxx(), handler)`：

```ts
function composePageHandler(middlewares: Middleware[], handler): RouteHandler {
  return (ctx) => {
    const run = (i: number): Promise<Response> =>
      i >= middlewares.length ? handler(ctx) : middlewares[i]!(ctx, () => run(i + 1))
    return run(0)
  }
}

export const withInertiaPageHandler = (h) => composePageHandler(HttpKernel.groups.web(), h)
export const withAdminInertiaPageHandler = (h) => composePageHandler(HttpKernel.groups.admin(), h)
export const withMemberInertiaPageHandler = (h) => composePageHandler(HttpKernel.groups.member(), h)
```

88 行 → ~33 行，重複代碼消除。

### `src/bootstrap.ts`

Global middleware 註冊從 8 行換成 1 行：

```ts
// Before
core.adapter.useGlobal(createSecurityHeadersMiddleware())
const corsAllowedOrigins = parseCorsAllowedOrigins()
if (corsAllowedOrigins.length > 0) {
  core.adapter.useGlobal(createCorsMiddleware({ ... }))
}

// After
registerGlobalMiddlewares(core, HttpKernel.global())
```

---

## 不在本次範圍內

- `IModuleRouter.ts` 的 `FormRequestClass` import 技術債（獨立 task）
- Session middleware 實作（未來 task）
- Bot 防護 middleware 實作（未來 task）

---

## 開發者擴充指南

| 我想加... | 去哪個檔案 | 怎麼加 |
|-----------|-----------|--------|
| 新 global middleware（如 Session） | `HttpKernel.ts` → `global()` | 陣列加一個 `createXxxMiddleware()` |
| 所有 page 都要跑的 middleware | `HttpKernel.ts` → `webBase()` | 陣列加一行 |
| 只有 admin page 的 middleware | `HttpKernel.ts` → `groups.admin()` | 陣列加一行 |
| 路由層的 named middleware | `middleware/index.ts` | export 新的 middleware |
| 全新的 page group（如 api zone） | `HttpKernel.ts` → `groups` | 加新 key |
