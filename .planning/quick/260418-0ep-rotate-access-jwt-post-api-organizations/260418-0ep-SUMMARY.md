---
phase: 260418-0ep
plan: 01
subsystem: [Organization, Auth, Website-Http]
tags: [jwt-rotation, cookie-flush, pending-cookies, redirect, ddd, e2e]
dependency_graph:
  requires:
    - AuthServiceProvider 已註冊 'jwtTokenService' + 'authTokenRepository' singleton
    - HttpKernel.pendingCookiesMiddleware（內部已存在，需匯出）
    - dashboardPathForWebRole('manager') => '/manager/dashboard'
    - isSecureRequest(ctx) 判定 Secure 旗標
  provides:
    - POST /api/organizations 成功後 rotate access JWT 並回 data.redirectTo
    - pendingCookiesMiddleware 對外匯出，供其他 /api/* 路由選擇性使用（本次僅掛 POST /api/organizations）
  affects:
    - CreateOrganizationModal 前端成功導頁改讀 payload.data.redirectTo
    - member-portal.e2e @smoke 增加 rotate JWT e2e case
tech_stack:
  added: []
  patterns:
    - "Token hash 持久化 (IAuthTokenRepository.save) — 配合 AuthMiddleware fail-closed isRevoked"
    - "Presentation 層拼接 redirectTo（不汙染 Application DTO）"
    - "局部 middleware flush（方案 1A）：僅本條路由加 pendingCookiesMiddleware，不擴散"
key_files:
  created:
    - src/Modules/Organization/__tests__/Controllers/OrganizationController.test.ts
  modified:
    - src/Website/Http/HttpKernel.ts
    - src/Modules/Organization/Presentation/Routes/organization.routes.ts
    - src/Modules/Organization/Presentation/Controllers/OrganizationController.ts
    - src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts
    - resources/js/Pages/Member/Dashboard/components/CreateOrganizationModal.tsx
    - e2e/member-portal.e2e.ts
decisions:
  - "AuthToken 讀 raw JWT 字串改用 .getValue()（AuthToken 私有欄位，無 .token / .value，有 toString()；getValue() 為顯式 API，符合 LoginUserService 既有實作）"
  - "jwtTokenService 沿用 AuthServiceProvider 已註冊的 'jwtTokenService' singleton（無重複綁定；同 AuthController、CliApiController 模式）"
  - "authTokenRepository 沿用 AuthServiceProvider 已註冊的 'authTokenRepository' singleton"
  - "只 rotate access，不動 refresh_token（plan 明訂、也避免用戶被動登出其他 session）"
  - "Controller 拼接 redirectTo（在回傳 JSON 前）而不改 CreateOrganizationService —— Application DTO 保持純 Use Case 語意"
metrics:
  duration: "~35 min"
  completed: "2026-04-18"
  tasks_total: 3
  tasks_completed: 3
  commits: 4
---

# Quick Task 260418-0ep: POST /api/organizations access JWT rotation Summary

**One-liner：** POST /api/organizations 成功時於同一請求簽新 role=manager 的 access JWT、
以 httpOnly cookie 回寫、並於回應 body 附上 `data.redirectTo=/manager/dashboard`，
解決新晉 manager 導頁後仍帶舊 role token 被 `requireManager` 退回的回歸。

## Tasks

### Task 1 — Export pendingCookiesMiddleware 並掛上 POST /api/organizations
`commit cfd3f48` `refactor: [http] 匯出 pendingCookiesMiddleware 並用於 POST /api/organizations`

- `src/Website/Http/HttpKernel.ts`：把 `function pendingCookiesMiddleware()` 改成
  `export function`；`HttpKernel.groups.web/admin/manager/member` 呼叫點維持原樣。
- `src/Modules/Organization/Presentation/Routes/organization.routes.ts`：
  - 匯入 `pendingCookiesMiddleware`
  - `POST /api/organizations` middleware 陣列改為 `[requireAuth(), pendingCookiesMiddleware()]`
  - 其他 organization routes（GET/PUT/PATCH/DELETE 等）維持不變，刻意局部 flush（方案 1A）。

### Task 2 — OrganizationController.create 簽新 access JWT + setCookie + redirectTo（含單元測試）
`commit 014cde6` `feat: [organization] 建立組織後 rotate access JWT 並回 redirectTo`

實作：
- Controller 建構子新增 `jwtTokenService: IJwtTokenService`
- 成功分支以 `auth.userId / auth.email / role: 'manager' / permissions: []` 簽新 access token
- `ctx.setCookie('auth_token', accessToken.getValue(), { httpOnly, sameSite: 'Lax', path: '/', maxAge: 900, secure: isSecureRequest(ctx) })`
- 回傳 `ctx.json({ ...result, data: { ...result.data, redirectTo: '/manager/dashboard' } }, 201)`
- 失敗 / 未授權分支不簽 token、不 setCookie、無 redirectTo
- `refresh_token` cookie 不被改寫

DI：
- `OrganizationServiceProvider.registerControllers` 追加 `c.make('jwtTokenService') as IJwtTokenService`

單元測試（`OrganizationController.test.ts`，初版 3 用例，後續 Rule 2 擴充至 4 斷言）：
- success：JWT 簽 role=manager、只有 1 個 auth_token cookie、cookie 屬性正確、無 refresh 呼叫、HTTP 201、body.data.redirectTo=/manager/dashboard
- failure NAME_REQUIRED：不簽 token、不 setCookie、無 redirectTo、400
- failure ALREADY_HAS_ORGANIZATION：同上
- unauthorized：401、不呼叫任何下游

### Task 2.5 — Rule 2 自動補強：持久化新 token hash
`commit bf73a65` `fix: [organization] rotate 後將新 access token hash 寫入 auth_tokens`

**發現於：** Task 3 E2E 執行時，`/api/users/me` 用新 JWT 回傳 401、Inertia 頁被導向 `/login`。

**根因：** `AuthMiddleware.isRevoked` 採 fail-closed 策略 —— tokenHash 不在 `auth_tokens` 表時直接視為 revoked。
Task 2 只簽 token 未持久化，導致下一個請求就被判 revoked，rotate 等於白做。

**修復：**
- Controller 建構子新增 `authTokenRepository: IAuthTokenRepository`
- 成功分支計算 `sha256(tokenStr)` 後呼叫 `authTokenRepository.save({ id, userId, tokenHash, type: 'access', expiresAt, createdAt })`
  —— 完全對齊 `LoginUserService` 既有模式（只記 access，不記 refresh）
- DI 追加 `c.make('authTokenRepository') as IAuthTokenRepository`
- 單元測試補斷言：`saveTokenRecord` 在成功路徑被呼叫 1 次、`tokenHash` 為 64 字 hex；
  失敗/未授權路徑不呼叫 save

### Task 3 — 前端 modal 改讀 redirectTo + E2E journey
`commit 5a11507` `feat: [member] modal 用 redirectTo 導向並新增 create-org JWT rotation e2e`

- `CreateOrganizationModal.tsx`：payload type 新增 `data?: { redirectTo?: string }`；
  success 分支改為 `router.visit(payload.data?.redirectTo ?? '/member/dashboard', { replace: true })`；
  `ALREADY_HAS_ORGANIZATION` 分支維持原 fallback。
- `e2e/member-portal.e2e.ts` 新 test（`@smoke` tag）：
  1. register → login 拿 oldToken
  2. `POST /api/organizations` 成功 → `createJson.success && data.redirectTo === '/manager/dashboard'`
  3. 解析 Set-Cookie `auth_token` 第一段（`firstSegment.indexOf('=') + 1` 保守切分；JWT base64url 無 `=` 字元）
  4. expect newToken !== oldToken
  5. `GET /api/users/me` 帶 newToken → 200（確認 token hash 真的落地、未被判 revoked）
  6. `page.goto('/manager/dashboard')` → URL 留在 `/manager/dashboard`（requireManager 通過）

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Missing critical functionality] OrganizationController 需持久化新 access token hash**
- **Found during：** Task 3（E2E）
- **Issue：** Plan 沒有要求 `authTokenRepository.save`，但 `AuthMiddleware.isRevoked` fail-closed 讓未登錄的新 token 直接被判 revoked，整個 rotate 形同虛設。
- **Fix：** 注入 `IAuthTokenRepository` → 簽完 token 即 `sha256` 後 `save()`；DI 從 `authTokenRepository` singleton 取（已由 AuthServiceProvider 註冊，不重複綁）
- **Files modified：** OrganizationController.ts、OrganizationServiceProvider.ts、OrganizationController.test.ts
- **Commit：** bf73a65
- **Plan 影響：** `must_haves.artifacts.OrganizationController` 新增一個隱含需求「持久化新 token hash」。單元測試同步擴充（3 → 4 個 assertion 面）。

## AuthToken 取字串的實際寫法

AuthToken 的 raw JWT 字串用 `accessToken.getValue()` 取得（類別有 `private readonly token: string` 欄位、對外暴露 `getValue()` 與 `toString()`；plan 描述的 `.token` / `.value` 都不是公開 API）。這與 `LoginUserService.execute` 既有模式一致。

## jwtTokenService / authTokenRepository 綁定來源

兩者都沿用 `AuthServiceProvider` 已註冊的 singleton（`src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts:72 / :65`），沒有在 `OrganizationServiceProvider` 重複綁 — 避免多實例與不一致行為。

## E2E Set-Cookie 解析穩定性

`createRes.headersArray().filter(name === 'set-cookie')` 在 Playwright 1.53+ 會列出所有 Set-Cookie header。解析用 `firstSegment.indexOf('=') + 1` 而非 `.split('=')[1]`，即使 JWT payload 含 base64 padding `=` 也不會截斷。實測穩定通過。

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | `cfd3f48` | refactor: [http] 匯出 pendingCookiesMiddleware 並用於 POST /api/organizations |
| 2 | `014cde6` | feat: [organization] 建立組織後 rotate access JWT 並回 redirectTo |
| 3 | `bf73a65` | fix: [organization] rotate 後將新 access token hash 寫入 auth_tokens（Rule 2 auto-fix） |
| 4 | `5a11507` | feat: [member] modal 用 redirectTo 導向並新增 create-org JWT rotation e2e |

## Verification

- `bun test src/Modules/Organization/__tests__ src/Website/__tests__/Http` → **121 pass / 0 fail / 265 expect**
- `bun x tsc --noEmit`（僅檢視本 plan 接觸檔案）→ 無新錯誤（repo 有其他 pre-existing 錯誤於 `loadMessages.ts`、`MemberDashboardPage.test.ts` 等，與本 plan 無關，已在 deferred-items 脈絡外不處理）
- `bunx playwright test e2e/member-portal.e2e.ts -g "rotates JWT"`（`BIFROST_API_URL`、`BIFROST_MASTER_KEY`、`JWT_SECRET` 設為 CI 值）→ **1 passed (2.8~2.9s)**

## Success Criteria Checklist

- [x] POST /api/organizations 成功回應含 `Set-Cookie: auth_token=` 與 `data.redirectTo: /manager/dashboard`
- [x] 新 access JWT `role` claim 為 `manager`
- [x] 失敗回應（NAME_REQUIRED / SLUG_EXISTS / ALREADY_HAS_ORGANIZATION / 401）不寫 auth_token cookie、不帶 redirectTo
- [x] refresh_token cookie 不被變更
- [x] 前端 modal 以 `payload.data?.redirectTo` 為主、`/member/dashboard` 為 fallback
- [x] 其他 /api/* 路由 middleware 鏈未改變（只動 POST /api/organizations）
- [x] `tsc --noEmit` 對本次修改檔案無錯誤
- [x] `playwright test @smoke` 新 "rotates JWT and lands on manager dashboard" 測試 pass
- [x] 4 個獨立 atomic commit（refactor HttpKernel / feat Organization controller / fix auth_tokens persistence / feat member modal+e2e），message 格式 `<type>: [scope] <subject>` 繁體中文

## Self-Check: PASSED

- FOUND: src/Modules/Organization/__tests__/Controllers/OrganizationController.test.ts
- FOUND: src/Website/Http/HttpKernel.ts (modified `export function pendingCookiesMiddleware`)
- FOUND: src/Modules/Organization/Presentation/Routes/organization.routes.ts (pendingCookiesMiddleware in middleware chain)
- FOUND: src/Modules/Organization/Presentation/Controllers/OrganizationController.ts (jwtTokenService + authTokenRepository injected)
- FOUND: src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts (both DI edges wired)
- FOUND: resources/js/Pages/Member/Dashboard/components/CreateOrganizationModal.tsx (redirectTo branch)
- FOUND: e2e/member-portal.e2e.ts (new "rotates JWT" test)
- FOUND commit: cfd3f48
- FOUND commit: 014cde6
- FOUND commit: bf73a65
- FOUND commit: 5a11507
