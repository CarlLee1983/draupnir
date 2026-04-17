# 認證流程圖

與程式對齊重點：`POST /api/auth/*`、`LoginUserService` + `IAuthTokenRepository`、`AuthMiddleware`（JWT + 可選撤銷檢查 + Cookie `auth_token`）、`POST /api/auth/logout` 經 `attachJwt()` 亦可帶 Cookie；SDK 為 `AppAuthMiddleware` + `AuthenticateApp` + `drp_app_` 前綴與 `/sdk/v1/*` 路由。

---

## 1. 用戶認證流程（JWT）

### 1a. API 登入（JSON）

```
┌─────────────┐
│   用戶端     │
└──────┬──────┘
       │
       │ 1. POST /api/auth/login
       │    { email, password }
       ↓
┌──────────────────────────────────────────────────────────────────┐
│                   Presentation Layer                             │
│  AuthController.login()                                          │
│  ├─ 輸入已由 LoginRequest (Zod / FormRequest) 驗證               │
│  └─ 呼叫 LoginUserService.execute(body)                          │
└──────────────────────────────────────────────────────────────────┘
       │
       │ 2. 登入用例
       ↓
┌──────────────────────────────────────────────────────────────────┐
│               Application Layer                                  │
│  LoginUserService.execute({ email, password })                   │
│                                                                  │
│  ├─ 以 Email 查詢: authRepository.findByEmail(email)            │
│  │   └─ 不存在 → INVALID_CREDENTIALS                             │
│  ├─ 帳號停權: user.isSuspended() → ACCOUNT_SUSPENDED             │
│  ├─ 驗證密碼: passwordHasher.verify(hash, plainPassword)         │
│  │   └─ 失敗 → INVALID_CREDENTIALS                               │
│  ├─ 簽發 JWT: jwtTokenService.signAccessToken / signRefreshToken │
│  │   └─ payload: userId, email, role, permissions[], jti,      │
│  │                type(access|refresh), iat, exp               │
│  ├─ 持久化 token 雜湊: authTokenRepository.save(×2)              │
│  │   └─ access / refresh 各一筆（SHA-256 雜湊），供撤銷追蹤     │
│  └─（目前實作未於此用例發佈網域事件）                            │
└──────────────────────────────────────────────────────────────────┘
       │
       │ 3. 回應
       ↓
┌──────────────────────────────────────────────────────────────────┐
│                   Presentation Layer                             │
│  200 OK — LoginResponse                                          │
│  {                                                               │
│    "success": true,                                              │
│    "data": {                                                     │
│      "accessToken": "...",                                       │
│      "refreshToken": "...",                                      │
│      "user": { "id", "email", "role" }                           │
│    }                                                             │
│  }                                                               │
└──────────────────────────────────────────────────────────────────┘
```

**相關端點：** `POST /api/auth/register`、`POST /api/auth/refresh`、`POST /api/auth/logout`（logout 路由掛 `attachJwt()`：有效 **access** JWT 可來自 `Authorization: Bearer` 或 `Cookie: auth_token`，並透過 `LogoutUserService` 撤銷）。

### 1b. Inertia 表單登入（Cookie）

```
┌─────────────┐
│  瀏覽器      │
└──────┬──────┘
       │ POST（表單）→ LoginPage.store
       ↓
┌──────────────────────────────────────────────────────────────────┐
│  Website/Auth/Pages/LoginPage                                    │
│  ├─ LoginUserService.execute({ email, password })                │
│  └─ 成功時 httpOnly Cookie：                                     │
│      • auth_token = accessToken，maxAge **900**（與 access JWT   │
│        15 分鐘一致，`JwtTokenService` ACCESS_TOKEN_EXPIRES_IN）   │
│      • refresh_token = refreshToken，maxAge 7 天（與 refresh JWT）│
│      sameSite=Lax、path=/、secure 視 HTTPS                       │
└──────────────────────────────────────────────────────────────────┘
       │ redirect：admin → /admin/dashboard；manager → /manager/dashboard；
       │ 其餘 → /member/dashboard
       ↓
```

**Token 構成（JWT）**  
- 簽發／驗證：`JwtTokenService`（`jsonwebtoken`，`JWT_SECRET`）  
- Access 約 15 分鐘、Refresh 約 7 天（見 `JwtTokenService` 常數）  
- Payload 型別：`TokenPayload`（`AuthToken` 模組）— `userId`, `email`, `role`, `permissions`, `jti`, `type`, `iat`, `exp`

**Token 驗證（受保護路由）** — `AuthMiddleware`：

1. 擷取 token：`Authorization: Bearer <jwt>`，若無則 fallback `Cookie: auth_token`
2. `jwtService.verify(token)` — 簽名與 `exp`
3. 若注入 `IAuthTokenRepository`：以 SHA-256(token) 查是否已撤銷
4. 寫入 `ctx`：`auth`（`AuthContext`）、`user`；失敗時設 `authError`（由後續 `requireAuth` / Controller 決定 401）

---

## 2. 組織 API 密鑰（`drp_sk_*`）— 模組職責說明

組織成員透過 **ApiKey** 模組建立／列出／撤銷密鑰；原始字串格式為 `drp_sk_<uuid>`，儲存為 **雜湊**（見 `CreateApiKeyService`、`ApiKeyRepository.findByKeyHash`）。

**與共用 `AuthMiddleware` 的關係：** 目前 `AuthMiddleware` **僅驗證 JWT**（及上述 Cookie），**未**在一般 `/api/*` 上依 Bearer 內容分流「JWT vs `drp_sk_`」。CLI／SDK 若以用戶 API 密鑰呼叫 API，需在路由層另有專用中介層或閘道整合（例如 Bifrost virtual key）；本文件不臆測尚未接線的中介層名稱。

**生命週期（概念）：**

- 建立：會員流程或 API 建立後回傳一次性明文（實作見 `CreateApiKeyService`）
- 儲存：資料庫仅存雜湊與中繼資料
- 撤銷：`RevokeApiKeyService` 等更新狀態，後續驗證應拒絕

---

## 3. 應用級認證（App API Key，`drp_app_*`）與 SDK 路由

```
┌──────────────────────────────┐
│   持有 App Key 的整合端       │
└────────┬─────────────────────┘
         │
         │ POST /sdk/v1/chat/completions
         │ GET  /sdk/v1/usage | /sdk/v1/balance
         │ Authorization: Bearer drp_app_...
         ↓
┌──────────────────────────────────────────────────────────────────┐
│  SdkApi — AppAuthMiddleware                                      │
│  ├─ 必須為 Bearer；缺漏或格式錯誤 → 401 + 結構化錯誤碼            │
│  └─ authenticateApp.execute(rawKey) → ctx.set('appAuth', context)│
└──────────────────────────────────────────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────────────────────────────┐
│  Application — AuthenticateApp                                   │
│  ├─ 前綴必須為 drp_app_                                          │
│  ├─ keyHash = KeyHashingService.hash(rawKey)                       │
│  ├─ appApiKeyRepo.findByKeyHash；輪替寬限內可查 findByPreviousKeyHash │
│  ├─ 狀態: active / revoked / 過期檢查                            │
│  └─ AppAuthContext: appKeyId, orgId, gatewayKeyId, scope,        │
│                     boundModuleIds                               │
└──────────────────────────────────────────────────────────────────┘
         │
         ├─ chat/completions → ProxyModelCall.execute(auth, body)
         │   ├─ scope === read → 403 INSUFFICIENT_SCOPE
         │   ├─ boundModuleIds 非空且未含 ai_chat → 403 MODULE_NOT_ALLOWED
         │   └─ 以 gatewayKeyId 作 Bearer 呼叫 Bifrost /v1/chat/completions
         │
         ├─ usage → QueryUsage
         └─ balance → QueryBalance（讀取 Credit 帳戶；非於 Proxy 內扣款）
```

---

## 4. 組織成員邀請與接受

```
┌──────────────┐
│ 已登入使用者  │
└────┬─────────┘
     │ 路由：`requireOrganizationContext()`（須為該 org 成員或全域 admin）
     │ 注意：一般 member 也能通過此中介層；能否送出邀請由下一步 `requireOrgManager` 決定
     │ POST /api/organizations/:id/invitations
     │ { email, role? }  — role 預設 member（manager | member）
     ↓
┌─────────────────────────────────────────────────────────────────┐
│  InviteMemberService.execute(orgId, invitedByUserId, systemRole, request) │
│  ├─ orgAuth.requireOrgManager（非 manager 且非 admin → 失敗）   │
│  ├─ OrganizationInvitation.create(orgId, email, role, invitedBy)  │
│  └─ invitationRepository.save                                   │
└─────────────────────────────────────────────────────────────────┘
     │
     │ 接受方須為已註冊用戶且已登入
     ↓
┌─────────────────────────────────────────────────────────────────┐
│ POST /api/invitations/:token/accept  [requireAuth]              │
│ Body: { "token": "<邀請 token>" }（AcceptInvitationRequest，預設 │
│ 自 **JSON body** 驗證；路徑上的 `:token` 不作為驗證／查詢來源）   │
│ 另：`POST /api/invitations/:id/accept-by-id`、`POST /api/invitations/:id/decline` │
└─────────────────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────────────────┐
│  AcceptInvitationService.execute(userId, { token })             │
│  ├─ tokenHash = sha256(token) → findByTokenHash                 │
│  ├─ invitation 必須 pending                                     │
│  ├─ 登入者 email 必須與邀請 email 一致（大小寫不敏感）           │
│  ├─ transaction: OrganizationMember.save + markAsAccepted       │
│  └─ 不於此建立新 User（帳號應已存在）                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 認證決策（實作對齊版）

**共用 JWT 管線（`AuthMiddleware`）**

```
HTTP 請求
    → 有 Bearer 或 auth_token Cookie？
        否 → 不設定 auth（公開路由可繼續）
        是 → verify JWT
            → 無效 → authError = INVALID_TOKEN
            → 可選：token 已撤銷？→ TOKEN_REVOKED
            → 成功 → ctx.auth / ctx.user
```

**需登入的 API：** `RoleMiddleware` 的 `requireAuth()` 中介層：先跑與 `attachJwt()` 相同的 `AuthMiddleware.handle`，再以 `AuthMiddleware.isAuthenticated` 判斷；無有效認證脈絡則 **401** JSON（`UNAUTHORIZED`）。無效／撤銷 token 不會寫入 `auth`，故同樣 401。

**網站 Inertia 頁面：** 另見 `Website/Http/Middleware/requireAuth.ts` 的函式 `requireAuth(ctx)` — 於 JWT 已由頁面管線附上之後檢查 `AuthMiddleware.getAuthContext`，未登入則 **redirect `/login`**（與 API 中介層不同名稱、不同回應型態）。

**SDK 路由：** 不使用上述 JWT 管線作為主要機制；由 `AppAuthMiddleware` 單獨驗證 `drp_app_`，失敗直接 401 JSON。

---

## 6. 權限檢查模式

### 系統角色（Auth 模組 `user.role`）

全域 `admin` 在多處可繞過組織成員檢查（例如 `OrgAuthorizationHelper`）。

### 組織內角色（Organization）

```
manager — 可管理邀請與成員（見 isManager / requireOrgManager）
member  — 一般成員
```

（非舊版文件中的 OWNER／ADMIN／MEMBER 三階；以 `OrgMemberRoleType` 為準。）

### 組織操作範例

- 邀請：路由 `requireOrganizationContext` + `InviteMemberService`（內含 `requireOrgManager`）
- 僅成員可讀：`requireOrgMembership`（`OrganizationMiddleware` 的 `requireOrganizationContext` 等）
- 組織內管理操作：`requireOrganizationManager()`（會員 + `currentOrg.role === 'manager'` 或全域 admin），用於 Reports／Alerts 等路由

---

## 參考（原始碼）

| 區域 | 路徑 |
|------|------|
| JWT 登入／刷新／登出 | `src/Modules/Auth/Application/Services/LoginUserService.ts` 等 |
| HTTP 適配 | `src/Modules/Auth/Presentation/Controllers/AuthController.ts` |
| 路由 | `src/Modules/Auth/Presentation/Routes/auth.routes.ts` |
| JWT 與 Payload | `src/Modules/Auth/Infrastructure/Services/JwtTokenService.ts`、`Domain/ValueObjects/AuthToken.ts` |
| 共用中介層 | `src/Shared/Infrastructure/Middleware/AuthMiddleware.ts` |
| 登入頁 Cookie | `src/Website/Auth/Pages/LoginPage.ts` |
| 組織 org 中介層 | `src/Modules/Organization/Presentation/Middleware/OrganizationMiddleware.ts` |
| 組織 API 密鑰 | `src/Modules/ApiKey/` |
| App 密鑰與 SDK | `src/Modules/AppApiKey/`、`src/Modules/SdkApi/`（`AppAuthMiddleware`、`AuthenticateApp`、`ProxyModelCall`） |
| 邀請／接受 | `src/Modules/Organization/Application/Services/InviteMemberService.ts`、`AcceptInvitationService.ts` |
| 路由 | `src/Modules/Organization/Presentation/Routes/organization.routes.ts` |

- [`ddd-layered-architecture.md`](./ddd-layered-architecture.md) — 四層架構
