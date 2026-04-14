# HTTP Middleware Stack

整個 HTTP 請求流程分三層 middleware，由外到內依序執行。

## 層一：Global Middleware（所有路由）

在 `src/bootstrap.ts` 透過 `core.adapter.useGlobal(...)` 掛載。
每個請求無論路徑皆會經過，順序如下：

```
Request
  → SecurityHeadersGlobalMiddleware
  → CorsGlobalMiddleware              （僅在 CORS_ALLOWED_ORIGINS 有設值時掛載）
  → [路由分發]
```

| Middleware | 檔案 | 作用 |
|---|---|---|
| `SecurityHeadersGlobalMiddleware` | `src/Shared/Infrastructure/Middleware/SecurityHeadersGlobalMiddleware.ts` | 在每個 response 補上 `X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`X-XSS-Protection` |
| `CorsGlobalMiddleware` | `src/Shared/Infrastructure/Middleware/CorsGlobalMiddleware.ts` | OPTIONS preflight 回 204；一般請求在 `await next()` 後將 CORS headers 寫入 `ctx.res` |

這層使用 `GravitoMiddleware` 型別（框架原生），透過修改 `ctx.res` 來附加 response headers。
設定來源：環境變數 `CORS_ALLOWED_ORIGINS`（逗號分隔的 origin 清單）。

---

## 層二：Route Middleware（特定路由）

在 `registerXxxRoutes` 登記路由時以陣列形式傳入，只套用到指定路由：

```ts
// 範例：auth 端點的 rate limiting
router.post('/login', [loginRateLimit], LoginRequest, handler)

// 範例：需要 org manager 權限的路由
router.get('/member/alerts', [requireOrganizationManager()], handler)
```

這層使用 `Middleware` 型別（專案自定義）：`(ctx, next) => Promise<Response>`。

| Middleware | 套用路由 | 作用 |
|---|---|---|
| `loginRateLimit` | `POST /login`、`POST /register` | 10 次 / 15 分鐘 per IP |
| `forgotPasswordRateLimit` | `POST /forgot-password` | 5 次 / 60 分鐘 per IP |
| `requireOrganizationManager()` | `GET /member/alerts` | 驗證 JWT + org membership + manager role |

Rate limiter 實作：`src/Website/Http/Security/AuthRateLimitMiddleware.ts`，使用 in-memory sliding window，附 probabilistic eviction 防止 Map 無限增長。

---

## 層三：Page Handler Chain（Inertia 頁面）

每個 Inertia 頁面 handler 都被 wrapper 函式包裝，形成固定的執行鏈：

```
withXxxInertiaPageHandler(handler)
  → attachJwt()          ← 解析 JWT cookie，寫入 auth context（失敗不報錯）
  → attachWebCsrf()      ← GET：輪換 XSRF-TOKEN；POST/PUT/DELETE：驗證 double-submit
  → injectSharedData()   ← 注入 locale、i18n messages、auth user、csrfToken 等 shared props
  → [role check]         ← 視 wrapper 版本決定
  → handler(ctx)         ← 實際頁面邏輯
  → applyPendingCookies  ← 將 ctx 上暫存的 cookies 寫入 response
```

三種 wrapper 對應三種存取層級：

| Wrapper 函式 | 套用區域 | Role Check |
|---|---|---|
| `withInertiaPageHandler` | 公開頁面（login、register、reset-password 等） | 無 |
| `withAdminInertiaPageHandler` | Admin 區所有路由 | `auth.role === 'admin'`，否則 403 HTML |
| `withMemberInertiaPageHandler` | Member 區所有路由 | 任意已登入用戶，否則 redirect `/login` |

Wrapper 實作：`src/Website/Http/Inertia/withInertiaPage.ts`

---

## 完整請求流程範例

### `POST /login`

```
POST /login
  ├─ [Global]  SecurityHeadersGlobalMiddleware
  ├─ [Global]  CorsGlobalMiddleware
  ├─ [Route]   loginRateLimit (10次/15min per IP)
  ├─ [Route]   LoginRequest schema validation
  └─ [Chain]   withInertiaPageHandler
                 → attachJwt (no-op，尚未登入)
                 → attachWebCsrf (驗證 X-XSRF-TOKEN header)
                 → injectSharedData
                 → LoginPage.store(ctx)
```

### `GET /admin/users`

```
GET /admin/users
  ├─ [Global]  SecurityHeadersGlobalMiddleware
  ├─ [Global]  CorsGlobalMiddleware
  └─ [Chain]   withAdminInertiaPageHandler
                 → attachJwt (解析 auth_token cookie)
                 → attachWebCsrf (輪換 XSRF-TOKEN)
                 → injectSharedData
                 → requireAdmin → 403 if role ≠ admin
                 → AdminUsersPage.handle(ctx)
```

### `POST /member/api-keys`

```
POST /member/api-keys
  ├─ [Global]  SecurityHeadersGlobalMiddleware
  ├─ [Global]  CorsGlobalMiddleware
  └─ [Chain]   withMemberInertiaPageHandler
                 → attachJwt
                 → attachWebCsrf (驗證 CSRF)
                 → injectSharedData
                 → requireMember → redirect /login if unauthenticated
                 → MemberApiKeyCreatePage.store(ctx)
```

---

## HTTPS 偵測

`isSecureRequest(ctx)` — `src/Shared/Infrastructure/Http/isSecureRequest.ts`

決定 cookie 是否加上 `Secure` flag，優先順序：
1. `FORCE_HTTPS=true` 環境變數
2. `X-Forwarded-Proto: https` header（反向代理）
3. `NODE_ENV === production` fallback

套用位置：`auth_token` cookie（LoginPage）、`XSRF-TOKEN` cookie（CsrfMiddleware）。

---

## 相關檔案索引

| 類別 | 路徑 |
|---|---|
| Global middleware 掛載點 | `src/bootstrap.ts` |
| Security headers | `src/Shared/Infrastructure/Middleware/SecurityHeadersGlobalMiddleware.ts` |
| CORS | `src/Shared/Infrastructure/Middleware/CorsGlobalMiddleware.ts` |
| CSRF double-submit | `src/Website/Http/Security/CsrfMiddleware.ts` |
| Rate limiter | `src/Website/Http/Security/AuthRateLimitMiddleware.ts` |
| Inertia page wrappers | `src/Website/Http/Inertia/withInertiaPage.ts` |
| JWT middleware | `src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts` |
| Auth routes | `src/Website/Auth/routes/registerAuthRoutes.ts` |
| Admin routes | `src/Website/Admin/routes/registerAdminRoutes.ts` |
| Member routes | `src/Website/Member/routes/registerMemberRoutes.ts` |
| HTTPS detection | `src/Shared/Infrastructure/Http/isSecureRequest.ts` |
