# HTTP Middleware Stack

整個 HTTP 請求流程分三層 middleware，由外到內依序執行。

## 層一：Global Middleware（所有路由）

在 `src/bootstrap.ts` 於 `core.bootstrap()` 之後呼叫 `registerGlobalMiddlewares(core, HttpKernel.global())`，順序以 **`src/Website/Http/HttpKernel.ts` 的 `HttpKernel.global()`** 為準（與舊版文件僅列 Security／CORS 不同，實作已補齊錯誤包裝與請求追蹤）。

```
Request
  → BodySizeLimitMiddleware          （預設 512KB；過大 body 直接 413，不進後續鏈）
  → GlobalErrorMiddleware             （包一層 try/catch，統一錯誤回應）
  → RequestIdMiddleware               （產生／傳遞 request id）
  → RequestLoggerMiddleware           （結構化請求日誌）
  → SecurityHeadersGlobalMiddleware   （安全相關 response headers）
  → CorsGlobalMiddleware              （僅在 CORS_ALLOWED_ORIGINS 有設值時掛載）
  → [路由分發]
```

| Middleware | 檔案 | 作用 |
|---|---|---|
| `BodySizeLimitMiddleware` | `src/Shared/Infrastructure/Middleware/BodySizeLimitMiddleware.ts` | 限制 body 大小，避免後續 middleware 讀取過大 payload |
| `GlobalErrorMiddleware` | `src/Shared/Infrastructure/Middleware/GlobalErrorMiddleware.ts` | 捕捉下層未處理錯誤，回傳一致錯誤格式 |
| `RequestIdMiddleware` | `src/Shared/Infrastructure/Middleware/RequestIdMiddleware.ts` | 指派或轉發 `X-Request-Id`（或等效），供日誌關聯 |
| `RequestLoggerMiddleware` | `src/Shared/Infrastructure/Middleware/RequestLoggerMiddleware.ts` | 記錄方法、路徑、狀態碼、耗時等 |
| `SecurityHeadersGlobalMiddleware` | `src/Shared/Infrastructure/Middleware/SecurityHeadersGlobalMiddleware.ts` | 在每個 response 補上 `X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`X-XSS-Protection` 等 |
| `CorsGlobalMiddleware` | `src/Shared/Infrastructure/Middleware/CorsGlobalMiddleware.ts` | OPTIONS preflight 回 204；一般請求在 `await next()` 後將 CORS headers 寫入 `ctx.res` |

這層使用 `GravitoMiddleware` 型別（框架原生）；`registerGlobalMiddlewares` 將專案 `Middleware` 轉接於 `src/Website/Http/GravitoKernelAdapter.ts`。  
CORS 設定來源：環境變數 `CORS_ALLOWED_ORIGINS`（逗號分隔的 origin 清單）。

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
  → attachJwt()                    ← 解析 auth_token cookie，寫入 auth context（失敗不報錯）
  → createTokenRefreshMiddleware() ← 見下文「網頁 access token 靜默換發」
  → attachWebCsrf()                ← GET：輪換 XSRF-TOKEN；POST/PUT/DELETE：驗證 double-submit
  → injectSharedData()             ← 注入 locale、i18n messages、auth user、csrfToken 等 shared props
  → [role check]                   ← 視 wrapper 版本決定
  → handler(ctx)                   ← 實際頁面邏輯
  → applyPendingCookies            ← 將 ctx 上暫存的 cookies 寫入 response
```

順序定義於 `src/Website/Http/HttpKernel.ts` 的 `webBase()`，與 `withInertiaPage.ts` 組出的 onion 一致。

三種 wrapper 對應三種存取層級：

| Wrapper 函式 | 套用區域 | Role Check |
|---|---|---|
| `withInertiaPageHandler` | 公開頁面（login、register、reset-password 等） | 無 |
| `withAdminInertiaPageHandler` | Admin 區所有路由 | `auth.role === 'admin'`，否則 403 HTML |
| `withMemberInertiaPageHandler` | Member 區所有路由 | 任意已登入用戶，否則 redirect `/login` |

Wrapper 實作：`src/Website/Http/Inertia/withInertiaPage.ts`

### JWT 附掛（`attachJwt`）

- **實作**：`src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts` 的 `attachJwt()`。
- **行為**：依序嘗試 `Authorization: Bearer` 與 **`Cookie: auth_token`**；驗簽成功則寫入 `ctx` 的 `auth`／`user`（細節與撤銷檢查見 [`AuthMiddleware`](../../../src/Shared/Infrastructure/Middleware/AuthMiddleware.ts) 與 [`auth-flow-diagrams.md`](./auth-flow-diagrams.md)）。失敗時**不拋錯**，讓後續 **靜默 refresh** 或 **`require*`** 決定是否阻擋。
- **在鏈上位置**：`webBase()` 第一棒，必須早於 `createTokenRefreshMiddleware`（refresh 依賴「尚未被視為已登入」的判斷與 refresh cookie）。

### CSRF（`attachWebCsrf`）

- **實作**：`src/Website/Http/Security/CsrfMiddleware.ts` 的 `attachWebCsrf()`。
- **行為**：對 **GET** 輪換可讀 **`XSRF-TOKEN`** cookie（非 HttpOnly），供前端寫入 **`X-XSRF-TOKEN`** header；對 **POST／PUT／PATCH／DELETE** 做 cookie 與 header 的 **double-submit** 比對（常數見檔案內 `WEB_CSRF_COOKIE_NAME`）。與登入後寫入的 **`csrf_token`** HttpOnly cookie 並存時，會一併納入解析（見 `SharedPropsBuilder` 內 CSRF cookie 名列表）。
- **在鏈上位置**：refresh 之後、`injectSharedData` 之前，確保表單頁取得的 `csrfToken` shared prop 與 cookie 一致。

### 共用 Inertia props（`injectSharedData`）

- **實作**：`src/Website/Http/Inertia/SharedPropsBuilder.ts`（由 `HttpKernel` 內 `injectSharedDataMiddleware` 呼叫 `injectSharedData(ctx)`）。
- **行為**：合併 **locale、i18n messages、`auth.user`、組織標頭、flash、CSRF token** 等到 Inertia shared payload，供所有頁面與 `InertiaService.render` 合併。依賴前段 `attachJwt`／refresh 已寫入的 `ctx` 狀態。

---

## 網頁 access token 靜默換發（`TokenRefreshMiddleware`）

**實作**：[`src/Website/Http/Middleware/TokenRefreshMiddleware.ts`](../../../src/Website/Http/Middleware/TokenRefreshMiddleware.ts)

### 為什麼需要這一層？

`attachJwt()` 只負責從 **`auth_token`** HttpOnly cookie 讀取 JWT 並填入 `ctx`；若 access 已過期、被撤銷或尚未帶 cookie，在 **`AuthMiddleware.isAuthenticated(ctx)`** 仍為 false 時，後續的 `requireMember` / `requireAdmin` 會直接導向登入或 403。  
靜默換發在 **同一個請求內** 用 **`refresh_token`** cookie 向應用層換新 access，寫回 **`auth_token`** 並手動補上 `auth` / `user`，讓本請求後半段與後續 middleware 視同已登入，**不必**再走一輪完整的 `attachJwt` 解析路徑（實作上以 `JwtTokenService.verify` 解 payload 對齊欄位）。

### 執行流程（決策樹）

1. **已認證**：`AuthMiddleware.isAuthenticated(ctx)` 為 true → 直接 `next()`（不碰 refresh）。
2. **未注入服務**：`configureTokenRefresh` 尚未被呼叫（例如極早啟動或測試未 mock）→ `next()`（略過換發）。
3. **無 refresh cookie**：沒有 `refresh_token` → `next()`。
4. **呼叫換發**：`RefreshTokenService.execute({ refreshToken })`（與 `POST /api/auth/refresh` 共用同一應用服務邏輯；網頁鏈路為 cookie 驅動）。
5. **失敗**：`success === false` 或無 `data` → `next()`（維持訪客／未登入狀態，由 `require*` 處理）。
6. **成功**：
   - `ctx.setCookie('auth_token', newAccessToken, { httpOnly, sameSite: 'Lax', path: '/', maxAge: 900, secure: … })`（15 分鐘；`secure` 由 `isSecureRequest(ctx)` 決定）。
   - 以 `JwtTokenService.verify(newAccessToken)` 取得 payload，若有效則 `ctx.set('auth', { userId, email, role, permissions, tokenType })` 與 `ctx.set('user', { id, email, role })`。
   - `next()`。

### 與啟動／DI 的接線

- **`configureTokenRefresh(service)`** 由 [`WebsiteServiceProvider.boot`](../../../src/Website/bootstrap/WebsiteServiceProvider.ts) 呼叫：`container.make('refreshTokenService')` 注入後，middleware 閉包才持有可執行的 `RefreshTokenService`。
- **掛載位置**：`HttpKernel` 的 `webBase()` 中，**緊接在 `attachJwt()` 之後**、`attachWebCsrf()` 與各區塊 `require*` **之前**，確保 CSRF 與角色檢查看到的是換發後的 session。

### 與 JSON API refresh 的關係

瀏覽器表單／Inertia 走 **cookie + 靜默 middleware**；REST 客戶端通常走 **`POST /api/auth/refresh`**（見 [認證流程圖](./auth-flow-diagrams.md)）。兩者底層可共用 `RefreshTokenService` 與 token 持久／撤銷策略，但傳輸載體不同（cookie vs Bearer / body）。

---

## 完整請求流程範例

### `POST /login`

（Global 層完整順序見 **§ 層一**；以下僅標頭尾以縮排。）

```
POST /login
  ├─ [Global]  BodySizeLimit → GlobalError → RequestId → RequestLogger → …
  ├─ [Global]  SecurityHeadersGlobalMiddleware
  ├─ [Global]  CorsGlobalMiddleware（有設定時）
  ├─ [Route]   loginRateLimit (10次/15min per IP)
  ├─ [Route]   LoginRequest schema validation
  └─ [Chain]   withInertiaPageHandler
                 → attachJwt (no-op，尚未登入)
                 → token refresh (通常無 refresh cookie，略過)
                 → attachWebCsrf (驗證 X-XSRF-TOKEN header)
                 → injectSharedData
                 → LoginPage.store(ctx)
```

### `GET /admin/users`

```
GET /admin/users
  ├─ [Global]  BodySizeLimit → … → SecurityHeaders → CORS（有設定時）
  └─ [Chain]   withAdminInertiaPageHandler
                 → attachJwt (解析 auth_token cookie)
                 → token refresh（若有 refresh_token 且 access 無效，則換發並寫回 auth_token / ctx.auth）
                 → attachWebCsrf (輪換 XSRF-TOKEN)
                 → injectSharedData
                 → requireAdmin → 403 if role ≠ admin
                 → AdminUsersPage.handle(ctx)
```

### `POST /member/api-keys`

```
POST /member/api-keys
  ├─ [Global]  BodySizeLimit → … → SecurityHeaders → CORS（有設定時）
  └─ [Chain]   withMemberInertiaPageHandler
                 → attachJwt
                 → token refresh（見上節）
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

## 相關檔案索引與說明對照

下表每列指向本文 **對應章節標題**（請用搜尋或目錄跳轉）；跨模組語意另見 [`auth-flow-diagrams.md`](./auth-flow-diagrams.md)、[`website-inertia-layer.md`](./website-inertia-layer.md)。

| 類別 | 路徑 | 說明位置（本頁） |
|------|------|------------------|
| Global middleware 掛載點 | `src/bootstrap.ts` | **§ 層一：Global Middleware** 首段 |
| Global 順序定義 | `src/Website/Http/HttpKernel.ts`（`HttpKernel.global`） | **§ 層一** 圖與表 |
| Body / 錯誤 / RequestId / Logger | `src/Shared/Infrastructure/Middleware/BodySizeLimitMiddleware.ts` 等 | **§ 層一** 表 |
| Security headers | `src/Shared/Infrastructure/Middleware/SecurityHeadersGlobalMiddleware.ts` | **§ 層一** 表 |
| CORS | `src/Shared/Infrastructure/Middleware/CorsGlobalMiddleware.ts` | **§ 層一** 表 |
| Gravito 轉接 | `src/Website/Http/GravitoKernelAdapter.ts` | **§ 層一** 末段 |
| CSRF double-submit | `src/Website/Http/Security/CsrfMiddleware.ts` | **§ 層三** 鏈圖 + **§ CSRF（`attachWebCsrf`）** |
| Rate limiter | `src/Website/Http/Security/AuthRateLimitMiddleware.ts` | **§ 層二：Route Middleware** |
| Inertia page wrappers | `src/Website/Http/Inertia/withInertiaPage.ts` | **§ 層三：Page Handler Chain** |
| JWT attach | `src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts` | **§ 層三** + **§ JWT 附掛（`attachJwt`）** |
| Shared props | `src/Website/Http/Inertia/SharedPropsBuilder.ts` | **§ 層三** + **§ 共用 Inertia props（`injectSharedData`）** |
| Web silent token refresh | `src/Website/Http/Middleware/TokenRefreshMiddleware.ts` | **§ 網頁 access token 靜默換發** |
| Auth routes | `src/Website/Auth/routes/registerAuthRoutes.ts` | **§ 層二**（rate limit 範例）；路由／DI 模式見 **Website／Inertia 層** |
| Admin routes | `src/Website/Admin/routes/registerAdminRoutes.ts` | **§ 完整請求流程範例**（`GET /admin/users`）；模式見 **Website／Inertia 層** |
| Manager routes | `src/Website/Manager/routes/registerManagerRoutes.ts` | 與 Admin／Member 相同 `webBase` + `withManagerInertiaPageHandler`；模式見 **Website／Inertia 層** |
| Member routes | `src/Website/Member/routes/registerMemberRoutes.ts` | **§ 完整請求流程範例**（`POST /member/api-keys`）；模式見 **Website／Inertia 層** |
| HTTPS detection | `src/Shared/Infrastructure/Http/isSecureRequest.ts` | **§ HTTPS 偵測** |
