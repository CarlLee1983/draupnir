# Auth 頁面完整實作規格

**日期：** 2026-04-11  
**範圍：** 全端 — 後端頁面 Controller、Application Services、Domain、Infrastructure、前端 React 頁面  
**目標：** 補完 `src/Pages/Auth/` 所有 TODO 功能，並建立對應前端頁面

---

## 背景

`src/Pages/Auth/` 的後端 Controller 均為 stub（`csrfToken: 'TODO'`、`error: 'Not implemented'`），且 `resources/js/Pages/Auth/` 根本不存在任何 React 元件。

現有可用服務：`LoginUserService`、`RegisterUserService`。  
缺少服務：`ForgotPasswordService`、`ResetPasswordService`、`EmailVerificationService`。  
缺少 Auth 機制：AuthMiddleware 只讀 Bearer header，無 cookie 支援，無法持久化 web 登入狀態。

---

## §1：基礎設施 — Cookie 支援

### IHttpContext 擴充

**檔案：** `src/Shared/Presentation/IHttpContext.ts`

新增兩個方法：

```typescript
interface CookieOptions {
  httpOnly?: boolean    // default: true
  secure?: boolean      // default: true in production
  sameSite?: 'Strict' | 'Lax' | 'None'  // default: 'Lax'
  path?: string         // default: '/'
  maxAge?: number       // seconds
}

getCookie(name: string): string | undefined
setCookie(name: string, value: string, options?: CookieOptions): void
```

**fromGravitoContext** 透過 Hono `getCookie` / `setCookie` API 實作。Cookie 透過 `ctx.header()` 累積設定於 response 上（Hono 在 response 時統一輸出）。

**所有測試 mock 的 IHttpContext** 需加上這兩個方法的 stub（回傳 undefined / no-op）。

### AuthMiddleware 更新

**檔案：** `src/Shared/Infrastructure/Middleware/AuthMiddleware.ts`

`extractToken()` 讀取順序：
1. `Authorization: Bearer <token>` header（現有）
2. Cookie `auth_token`（新增 fallback）

```typescript
private extractToken(ctx: IHttpContext): string | null {
  // 1. Bearer header
  const header = ctx.getHeader('authorization') ?? ctx.getHeader('Authorization')
  if (header) {
    const parts = header.split(' ')
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') return parts[1]
  }
  // 2. Cookie fallback
  return ctx.getCookie('auth_token') ?? null
}
```

Cookie 名稱：`auth_token`，設定時參數：`{ httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 3600 }`

---

## §2：Auth Domain — 密碼重設 Token

### PasswordResetToken Value Object

**檔案：** `src/Modules/Auth/Domain/ValueObjects/PasswordResetToken.ts`

```typescript
export class PasswordResetToken {
  readonly token: string      // 隨機 hex (64 chars = 32 bytes)
  readonly email: string
  readonly expiresAt: Date    // 建立後 1 小時
  readonly used: boolean

  isExpired(): boolean        // Date.now() > expiresAt
  isValid(): boolean          // !used && !isExpired()
}
```

### EmailVerificationToken Value Object

**檔案：** `src/Modules/Auth/Domain/ValueObjects/EmailVerificationToken.ts`

結構與 `PasswordResetToken` 相同，但語意獨立（防止跨類型重用）。

### Repository Ports

**IPasswordResetRepository：**
```
src/Modules/Auth/Domain/Repositories/IPasswordResetRepository.ts
```
```typescript
interface IPasswordResetRepository {
  create(email: string): Promise<PasswordResetToken>
  findByToken(token: string): Promise<PasswordResetToken | null>
  markUsed(token: string): Promise<void>
}
```

**IEmailVerificationRepository：**
```
src/Modules/Auth/Domain/Repositories/IEmailVerificationRepository.ts
```
同介面，型別為 `EmailVerificationToken`。

### Email Service Port

**IEmailService：**
```
src/Modules/Auth/Application/Ports/IEmailService.ts
```
```typescript
interface IEmailService {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>
  sendEmailVerification(to: string, verifyUrl: string): Promise<void>
}
```

### Infrastructure 實作

**ConsoleEmailService（stub）：**
```
src/Modules/Auth/Infrastructure/Services/ConsoleEmailService.ts
```
用 `console.log` 輸出連結，不實際寄信。可日後替換為 Resend / SendGrid。

**InMemoryPasswordResetRepository：**
```
src/Modules/Auth/Infrastructure/Repositories/InMemoryPasswordResetRepository.ts
```
Map 儲存，與 `MemoryDeviceCodeStore` 同模式。

**InMemoryEmailVerificationRepository：**
```
src/Modules/Auth/Infrastructure/Repositories/InMemoryEmailVerificationRepository.ts
```
同上模式。

---

## §3：Application Services

### ForgotPasswordService

**檔案：** `src/Modules/Auth/Application/Services/ForgotPasswordService.ts`

```typescript
execute(email: string): Promise<{ success: boolean; message: string }>
```

流程：
1. 查 user by email（若不存在，仍回傳 success，防枚舉攻擊）
2. 建立 `PasswordResetToken`
3. 呼叫 `IEmailService.sendPasswordReset(email, resetUrl)`
4. `resetUrl` = `${baseUrl}/reset-password/${token.token}`
5. 回傳 `{ success: true, message: '若此 email 存在，重設連結已寄出' }`

**安全原則：** 無論 email 是否存在，回應訊息相同。

### ResetPasswordService

**檔案：** `src/Modules/Auth/Application/Services/ResetPasswordService.ts`

```typescript
execute(token: string, newPassword: string): Promise<{ success: boolean; message: string; error?: string }>
validateToken(token: string): Promise<{ valid: boolean }>
```

流程（execute）：
1. `findByToken(token)` → 若找不到或 `!isValid()`，回傳 error
2. Hash 新密碼
3. 更新 user 密碼
4. `markUsed(token)`
5. 回傳 success

### EmailVerificationService

**檔案：** `src/Modules/Auth/Application/Services/EmailVerificationService.ts`

```typescript
execute(token: string): Promise<{ success: boolean; message: string; redirectUrl?: string }>
```

流程：
1. `findByToken(token)` → 驗 isValid()
2. 標記 user.emailVerified = true（或對應 Domain 操作）
3. `markUsed(token)`
4. 回傳 `{ success: true, redirectUrl: '/member/dashboard' }`

---

## §4：後端頁面

### csrfToken 統一修法（4 個頁面）

```typescript
// 修正前：csrfToken: 'TODO'
// 修正後（同 VerifyDevicePage 模式）：
const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
const csrfToken = (shared?.csrfToken as string) ?? ''
```

### LoginPage

注入：`LoginUserService`, `InertiaService`

**handle()：**
- 若已登入（`ctx.getCookie('auth_token')` 存在）→ redirect `/member/dashboard`
- 否則 render `Auth/Login` with `{ csrfToken, lastEmail: undefined }`

**store()：**
- 取 `validated: { email, password }`
- `loginService.execute({ email, password })`
- 成功：`ctx.setCookie('auth_token', data.accessToken, { httpOnly: true, sameSite: 'Lax', maxAge: 3600 })` → redirect `/member/dashboard`
- 失敗：render `Auth/Login` with `{ csrfToken, error: result.error, lastEmail: email }`

### RegisterPage

注入：`RegisterUserService`, `InertiaService`

**store()：**
- 取 `validated: { email, password, confirmPassword, agreedToTerms }`
- `registerService.execute({ email, password, confirmPassword })`
- 成功：`ctx.set('flash:success', '帳號建立成功，請登入')` → redirect `/login`
- 失敗：render `Auth/Register` with `{ csrfToken, error: result.error, passwordRequirements }`

### ForgotPasswordPage

注入：`ForgotPasswordService`, `InertiaService`

**store()：**
- `forgotPasswordService.execute(email)`
- 一律 render `Auth/ForgotPassword` with `{ csrfToken, message: '若此 email 存在，重設連結已寄出' }`

### ResetPasswordPage

注入：`ResetPasswordService`, `InertiaService`

**handle()：**
- `token = ctx.getParam('token')`
- `validateToken(token)` → `tokenValid: boolean`
- render `Auth/ResetPassword` with `{ csrfToken, token, tokenValid }`

**store()：**
- `resetPasswordService.execute(token, newPassword)`
- 成功：redirect `/login`
- 失敗：render `Auth/ResetPassword` with `{ csrfToken, token, tokenValid: true, error: result.error }`

### EmailVerificationPage

注入：`EmailVerificationService`, `InertiaService`

**handle()：**
- `token = ctx.getParam('token')`
- `emailVerificationService.execute(token)`
- 成功：render `Auth/EmailVerification` with `{ status: 'success', message: '電子郵件驗證成功', redirectUrl: '/member/dashboard', redirectSeconds: 5 }`
- 失敗：render `Auth/EmailVerification` with `{ status: 'error', message: '驗證連結無效或已過期' }`

### DI Bindings 更新

**檔案：** `src/Pages/routing/auth/registerAuthPageBindings.ts`

每個頁面從容器注入對應服務：
- `LoginPage(inertiaService, loginUserService)`
- `RegisterPage(inertiaService, registerUserService)`
- `ForgotPasswordPage(inertiaService, forgotPasswordService)`
- `ResetPasswordPage(inertiaService, resetPasswordService)`
- `EmailVerificationPage(inertiaService, emailVerificationService)`

---

## §5：前端 React 頁面

### AuthLayout

**檔案：** `resources/js/layouts/AuthLayout.tsx`

置中卡片容器，無 sidebar。用於所有 Auth 頁面。

```tsx
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
```

### Login.tsx

**Props：** `{ csrfToken: string; lastEmail?: string; error?: string }`

元件：
- `AuthLayout` 包覆
- `Card` with `CardHeader`（標題「登入」）, `CardContent`（表單）
- `useForm` (Inertia) → POST `/login`
- email + password `Input`，錯誤訊息顯示
- 「忘記密碼？」連結 → `/forgot-password`
- 「Google 登入」`Button` → `/oauth/google`（外部跳轉）
- 「還沒帳號？註冊」連結 → `/register`

### Register.tsx

**Props：** `{ csrfToken: string; passwordRequirements: PasswordRequirements; error?: string }`

元件：
- email + password + confirm password `Input`
- 密碼需求列表（從 props 讀取，動態顯示勾選狀態）
- 勾選同意條款 checkbox
- 「已有帳號？登入」連結

### ForgotPassword.tsx

**Props：** `{ csrfToken: string; message?: string }`

元件：
- 若 `message` 存在：顯示訊息（不再顯示表單）
- 否則：email 欄位 + 送出按鈕
- 「返回登入」連結

### ResetPassword.tsx

**Props：** `{ csrfToken: string; token: string; tokenValid: boolean; message?: string; error?: string }`

元件：
- 若 `!tokenValid`：顯示「連結已過期，請重新申請」卡片
- 否則：新密碼 + 確認密碼欄位
- 錯誤 / 成功訊息顯示

### EmailVerification.tsx

**Props：** `{ status: 'success' | 'error'; message: string; redirectUrl?: string; redirectSeconds?: number }`

元件：
- `status === 'success'`：綠色圖示 + 訊息 + 倒數 redirect（`useEffect` + `router.visit()`）
- `status === 'error'`：紅色圖示 + 錯誤訊息 + 「重新登入」連結

### VerifyDevice.tsx

**Props：** `{ csrfToken: string; message?: string; error?: string }`

元件：
- 需要登入才能使用（若 `auth.user` 為 null，redirect 到 `/login`）
- user code 輸入框（大寫、8 碼格式提示）
- 送出 → POST `/verify-device`
- 成功：顯示 `message`（「授權完成，請返回 CLI」）
- 失敗：顯示 `error`

---

## 測試策略

每個新服務需配套單元測試：
- `ForgotPasswordService` — mock repo + email service
- `ResetPasswordService` — expired token / valid token / already-used token
- `EmailVerificationService` — valid / invalid token

後端頁面測試更新：
- 所有 mock IHttpContext 加 `getCookie` / `setCookie` stub
- LoginPage.store() 測試：成功設 cookie + redirect；失敗 render error
- RegisterPage.store() 測試：成功 redirect；失敗 render error

前端無需額外測試（Inertia 表單由框架處理，E2E 覆蓋）。

---

## 實作順序

1. IHttpContext + fromGravitoContext（cookie 支援）
2. AuthMiddleware 更新（讀 cookie）
3. Domain ValueObjects + Repository Ports
4. Infrastructure 實作（InMemory repos + ConsoleEmailService）
5. ForgotPasswordService + ResetPasswordService + EmailVerificationService
6. 後端頁面更新（LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, EmailVerificationPage）
7. DI bindings 更新
8. 前端：AuthLayout + 6 個 Auth 頁面
9. 測試補齊
