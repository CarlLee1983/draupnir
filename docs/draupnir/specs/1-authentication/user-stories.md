# 身分與認證使用者故事（Auth + Profile）

> 本文件對標代碼日期：2026-04-18（commit `d602178`）。
> 若你看到的代碼與此文件明顯不一致，請提 issue 或直接 PR 修正。

## 範圍

- 本檔覆蓋：**Auth 模組**（register / login / password / email verification / refresh / logout / Google OAuth / admin 用戶狀態）+ **Profile 模組**（個人資料讀寫）
- Organization 相關的「建立 org 後 rotate JWT」互動動作屬 Organization 模組，見 [2-user-organization/user-stories.md](../2-user-organization/user-stories.md)

## 相關 personas

閱讀前請先看 [../personas.md](../personas.md)：
- **Cloud Admin** — 管使用者帳號啟停的 admin 操作
- **Org Manager / Org Member** — 所有使用者都會經歷的註冊 → 登入 → 改資料旅程

---

### US-AUTH-001 | 使用者註冊（Email + Password）

**As** a new user
**I want to** register an account with email and password
**so that** I can sign in to Draupnir and be added to an organization.

**Related**
- Module: `src/Modules/Auth`
- Entry: `RegisterUserService.execute()` → `src/Modules/Auth/Application/Services/RegisterUserService.ts`
- Controller: `AuthController.register()` → `src/Modules/Auth/Presentation/Controllers/AuthController.ts`
- Inertia Page: `RegisterPage` → `src/Website/Auth/Pages/RegisterPage.ts`
- Routes: `POST /api/auth/register`（REST）、`POST /register`（Inertia）

**Key rules**
- Email 必須唯一；重複註冊會回錯並不建立新帳號
- Password 走 `Password` value object 驗證強度，再透過 `IPasswordHasher` hash 寫庫
- 註冊成功會 dispatch `UserRegistered` domain event；`UserRegisteredHandler` 會非同步建立對應的 `UserProfile` 記錄

---

### US-AUTH-002 | 使用者登入（Email + Password）

**As** a registered user
**I want to** sign in with my email and password
**so that** I get access + refresh tokens to make authenticated requests.

**Related**
- Module: `src/Modules/Auth`
- Entry: `LoginUserService.execute()` → `src/Modules/Auth/Application/Services/LoginUserService.ts`
- Controller: `AuthController.login()` → `src/Modules/Auth/Presentation/Controllers/AuthController.ts`
- Inertia Page: `LoginPage` → `src/Website/Auth/Pages/LoginPage.ts`
- Routes: `POST /api/auth/login`（REST）、`POST /login`（Inertia）

**Key rules**
- Email 不存在或密碼錯誤都回 401 與同一個「帳密錯誤」訊息——避免帳號列舉
- 登入成功發一組 access + refresh token；兩者的 hash 存 `auth_tokens` 表供後續撤銷使用
- 帳號若被 admin 停用（`status != 'active'`），即使帳密正確也拒絕登入

---

### US-AUTH-003 | 使用者換發 Access Token（Refresh）

**As** a signed-in user whose access token is near expiry
**I want to** exchange my refresh token for a new access token (and possibly a new refresh token)
**so that** I stay signed in without having to re-enter my credentials.

**Related**
- Module: `src/Modules/Auth`
- Entry: `RefreshTokenService.execute()` → `src/Modules/Auth/Application/Services/RefreshTokenService.ts`
- Controller: `AuthController.refresh()` → `src/Modules/Auth/Presentation/Controllers/AuthController.ts`
- Route: `POST /api/auth/refresh`

**Key rules**
- Refresh token 本身已撤銷 / 過期 / 不存在時回 401、前端應導回登入
- 換發成功後舊的 access token hash 會被撤銷；refresh token 依策略可能 rotate
- 建立組織等特殊事件會主動 rotate access token（詳見 [Organization user stories](../2-user-organization/user-stories.md)），此時 client 應重新跑 refresh flow

---

### US-AUTH-004 | 使用者登出（撤銷當前 Token）

**As** a signed-in user
**I want to** sign out and have my current token revoked server-side
**so that** even if the token leaks afterwards it can't be used.

**Related**
- Module: `src/Modules/Auth`
- Entry: `LogoutUserService.execute()` → `src/Modules/Auth/Application/Services/LogoutUserService.ts`
- Controller: `AuthController.logout()` → `src/Modules/Auth/Presentation/Controllers/AuthController.ts`
- Inertia Page: `LogoutPage` → `src/Website/Auth/Pages/LogoutPage.ts`
- Routes: `POST /api/auth/logout`（REST，需 `Authorization: Bearer <token>`）、`GET /logout`（Inertia）

**Key rules**
- Logout 必須帶上要撤銷的 token（從 `Authorization` header 解析），否則 400
- 撤銷是寫入 `auth_tokens` 黑名單，保證之後任何使用該 token 的請求都被 middleware 拒
- Logout 只撤銷該次 token，不影響同帳號在其他裝置的 session

---

### US-AUTH-005 | 使用者以 Google 帳號登入

**As** a new or returning user
**I want to** sign in using my Google account
**so that** I don't have to manage a separate Draupnir password.

**Related**
- Module: `src/Modules/Auth`
- Entry: `GoogleOAuthService.exchange()` → `src/Modules/Auth/Application/Services/GoogleOAuthService.ts`
- Inertia Page: `GoogleOAuthCallbackPage` → `src/Website/Auth/Pages/GoogleOAuthCallbackPage.ts`
- Routes: `GET /oauth/google/authorize`（REST redirect to Google）、`GET /oauth/google/callback`（Inertia，接收 Google 回傳的 code）

**Key rules**
- 第一次用 Google 登入會自動建立對應的 `User` + `UserProfile`，password 以隨機值 hash 後寫庫（避免用 Google 登入的人能用 email/password 流程）
- 已存在的 email 若尚未綁 Google ID，會在此次 callback 綁定起來，之後可自由切換登入方式
- OAuth state 驗證在 authorize endpoint 產生、callback 驗證；不通過直接 401

---

### US-AUTH-006 | 使用者忘記密碼，請求重設連結

**As** a user who forgot their password
**I want to** enter my email and receive a password reset link
**so that** I can set a new password and regain access.

**Related**
- Module: `src/Modules/Auth`
- Entry: `ForgotPasswordService.execute()` → `src/Modules/Auth/Application/Services/ForgotPasswordService.ts`
- Inertia Page: `ForgotPasswordPage` → `src/Website/Auth/Pages/ForgotPasswordPage.ts`
- Routes: `GET /forgot-password`（Inertia 表單）、`POST /forgot-password`（Inertia 送出）

**Key rules**
- 無論 email 是否存在，皆回同一成功訊息（「若此 email 存在，重設連結已寄出」）——防帳號列舉
- Reset token 存 `password_resets` 表，有效期由 `IPasswordResetRepository.create` 決定
- 寄信動作走 `IEmailService.sendPasswordReset`；若寄信失敗也仍回成功（不讓使用者從錯誤推斷 email 是否存在）

---

### US-AUTH-007 | 使用者透過連結設定新密碼

**As** a user clicking a reset link I received by email
**I want to** enter a new password and complete the reset
**so that** I can sign in again with the new credentials.

**Related**
- Module: `src/Modules/Auth`
- Entry: `ResetPasswordService.execute()` → `src/Modules/Auth/Application/Services/ResetPasswordService.ts`
- Inertia Page: `ResetPasswordPage` → `src/Website/Auth/Pages/ResetPasswordPage.ts`
- Routes: `GET /reset-password/:token`（Inertia 表單）、`POST /reset-password/:token`（送出）

**Key rules**
- Token 需存在、未過期、未使用；任一不符回錯訊息
- 新密碼走 `Password` value object 驗證強度
- 重設成功後該 token 立即作廢，防重放

---

### US-AUTH-008 | 使用者驗證 Email

**As** a newly registered user
**I want to** confirm my email address via a verification link
**so that** my account is marked as verified and I can use flows that require verified email.

**Related**
- Module: `src/Modules/Auth`
- Entry: `EmailVerificationService.execute()` → `src/Modules/Auth/Application/Services/EmailVerificationService.ts`
- Inertia Page: `EmailVerificationPage` → `src/Website/Auth/Pages/EmailVerificationPage.ts`
- Route: `GET /verify-email/:token`

**Key rules**
- Token 必須有效且未過期；失敗顯示錯誤但不提示任何帳號存在資訊
- 成功會將 `User.emailVerifiedAt` 填入當下時間
- 重複點擊同一個連結（token 已用）顯示「已驗證」訊息

---

### US-AUTH-009 | 使用者（登入狀態）修改密碼

**As** a signed-in Manager / Member
**I want to** change my password by providing the current password plus a new one
**so that** I can rotate credentials without going through a reset email.

**Related**
- Module: `src/Modules/Auth`
- Entry: `ChangePasswordService.execute()` → `src/Modules/Auth/Application/Services/ChangePasswordService.ts`
- Inertia Page: `ManagerSettingsPage.changePassword()` → `src/Website/Manager/Pages/ManagerSettingsPage.ts`
- Route: `POST /manager/settings/password`（Inertia）

**Key rules**
- 須先通過現任密碼驗證，否則拒；防偷走 session 後直接改密碼
- 新密碼需通過 `Password` value object 強度檢查
- 改密碼成功**不會**自動撤銷其他裝置 session（v1 行為；留待後續強化）

---

### US-AUTH-010 | Cloud Admin 列出 / 檢視 / 啟停使用者帳號

**As** a Cloud Admin
**I want to** list users across the platform, view their profiles, and enable/disable their accounts
**so that** I can respond to compliance requests, fraud reports, and customer support escalations.

**Related**
- Module: `src/Modules/Auth`（服務） + Presentation 分散於 Profile REST 與 Admin Portal
- Entries:
  - `ListUsersService.execute()` → `src/Modules/Auth/Application/Services/ListUsersService.ts`
  - `GetUserDetailService.execute()` → `src/Modules/Auth/Application/Services/GetUserDetailService.ts`（Admin Portal 使用）
  - `ChangeUserStatusService.execute()` → `src/Modules/Auth/Application/Services/ChangeUserStatusService.ts`
- Admin Portal Pages: `AdminUsersPage`、`AdminUserDetailPage`（`src/Website/Admin/Pages/`）
- Routes：
  - REST（admin role-gated）：`GET /api/users`、`GET /api/users/:id`（此路徑走 `GetProfileService`，非 `GetUserDetailService`）、`PATCH /api/users/:id/status`
  - Admin Portal（Inertia）：`GET /admin/users`、`GET /admin/users/:id`、`POST /admin/users/:id/status`

**Key rules**
- 所有此 story 的路由皆走 `createRoleMiddleware('admin')` 或 admin portal 的 RBAC，非 admin 一律 403
- 帳號狀態（`active` / `suspended` / 其他）切換只影響之後的登入與 token 驗證，不立即撤銷在途 token
- REST `GET /api/users/:id` 用 `GetProfileService`、Admin Inertia `GET /admin/users/:id` 用 `GetUserDetailService`——兩者回傳欄位略有不同，是已知落差

---

### US-PROFILE-001 | 使用者取得與更新自己的個人資料

**As** an Org Manager or Member
**I want to** view and update my profile (name, preferred locale, etc.)
**so that** the UI greets me correctly and respects my language preference.

**Related**
- Module: `src/Modules/Profile`
- Entries:
  - `GetProfileService.execute()` → `src/Modules/Profile/Application/Services/GetProfileService.ts`
  - `UpdateProfileService.execute()` → `src/Modules/Profile/Application/Services/UpdateProfileService.ts`
- Controller: `ProfileController.getMe()` / `updateMe()` → `src/Modules/Profile/Presentation/Controllers/ProfileController.ts`
- Inertia Pages: `ManagerSettingsPage`、`MemberSettingsPage`（`src/Website/{Manager,Member}/Pages/`）
- Routes：
  - REST：`GET /api/users/me`、`PUT /api/users/me`
  - Manager Portal：`GET /manager/settings`、`POST /manager/settings`
  - Member Portal：`GET /member/settings`、`POST /member/settings`

**Key rules**
- `GET` 路徑一律以 token 的 `userId` 解析目標 profile；使用者無法讀別人的 profile（admin 走 US-AUTH-010）
- `preferredLocale` 變更即時影響下次進入頁面的語系（透過 cookie / header 傳遞給前端 i18n）
- `UpdateProfileService` 僅修改可變欄位；`email` 這類 identity 欄位由 Auth 模組管（改 email 目前走後續 stage 的驗證流程，非本 story）

---

## Coverage map

覆蓋 Auth + Profile 兩個模組的 Application Service 與主要 Presentation 入口。

### Auth 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `RegisterUserService.execute` | US-AUTH-001 | 註冊 |
| `LoginUserService.execute` | US-AUTH-002 | 登入 |
| `RefreshTokenService.execute` | US-AUTH-003 | 換 token |
| `LogoutUserService.execute` | US-AUTH-004 | 登出 / 撤銷 token |
| `GoogleOAuthService.exchange` | US-AUTH-005 | Google 登入（`exchange()`，非 `execute()`）|
| `ForgotPasswordService.execute` | US-AUTH-006 | 忘記密碼 |
| `ResetPasswordService.execute` | US-AUTH-007 | 重設密碼 |
| `EmailVerificationService.execute` | US-AUTH-008 | 驗證 email |
| `ChangePasswordService.execute` | US-AUTH-009 | 改密碼（登入狀態）|
| `ListUsersService.execute` | US-AUTH-010 | Admin 列出使用者 |
| `GetUserDetailService.execute` | US-AUTH-010 | Admin Portal 查看使用者詳細 |
| `ChangeUserStatusService.execute` | US-AUTH-010 | Admin 啟停使用者 |

### Profile 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `GetProfileService.execute` | US-PROFILE-001, US-AUTH-010 | 共用：使用者自己查、admin 走 REST `/api/users/:id` 也呼叫這個 |
| `UpdateProfileService.execute` | US-PROFILE-001 | 使用者改自己的 profile |

### Presentation 入口

| Entry | Story ID | 備註 |
|---|---|---|
| `AuthController.register` | US-AUTH-001 | REST |
| `AuthController.login` | US-AUTH-002 | REST |
| `AuthController.refresh` | US-AUTH-003 | REST |
| `AuthController.logout` | US-AUTH-004 | REST |
| `ProfileController.getMe` | US-PROFILE-001 | REST |
| `ProfileController.updateMe` | US-PROFILE-001 | REST |
| `ProfileController.listUsers` | US-AUTH-010 | REST admin |
| `ProfileController.getUser` | US-AUTH-010 | REST admin（走 `GetProfileService`）|
| `ProfileController.changeUserStatus` | US-AUTH-010 | REST admin |
| `GET /oauth/google/authorize`（inline） | US-AUTH-005 | 產生 state 並導向 Google |
| `LoginPage` / `RegisterPage` / `LogoutPage` | US-AUTH-001, 002, 004 | Inertia |
| `ForgotPasswordPage` / `ResetPasswordPage` | US-AUTH-006, 007 | Inertia |
| `EmailVerificationPage` | US-AUTH-008 | Inertia |
| `GoogleOAuthCallbackPage` | US-AUTH-005 | Inertia |
| `VerifyDevicePage` | — | ⚠️ 2FA / Device verification 相關頁面，v1 對應流程尚在迭代中；待後續 Task 針對 2FA 補 story |
| `ManagerSettingsPage.handle/update/changePassword` | US-PROFILE-001, US-AUTH-009 | Inertia |
| `MemberSettingsPage.handle/update` | US-PROFILE-001 | Inertia |
| `AdminUsersPage` / `AdminUserDetailPage` | US-AUTH-010 | Inertia admin |

### 已知覆蓋缺口

- **Device verification / 2FA**：`VerifyDevicePage` 存在但 v1 流程未完全收斂，暫不寫獨立 story
- **Change email**：使用者改 email 的完整流程（含 old/new email 雙向驗證）尚未實作，故無 story
- **Session 管理（看目前有哪些登入中裝置 / 全部登出）**：v1 未提供
