# Auth 頁面完整實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 補完所有 Auth 頁面功能：cookie 認證機制、密碼重設服務、後端頁面 Controller、前端 React 頁面。

**Architecture:** 分層實作：(1) IHttpContext cookie 擴充 + AuthMiddleware fallback，(2) 密碼重設 Domain/Services，(3) 後端頁面 Controller 注入真實服務，(4) 前端 React 頁面。Cookie 採 pending queue 模式：`setCookie()` 存入 ctx，`withInertiaPageHandler` 在回應前自動套用。

**Tech Stack:** TypeScript, Bun test, Inertia.js (React), shadcn/ui, Hono/Gravito

---

## File Structure Map

### 新增檔案

```
src/Shared/Presentation/
└── IHttpContext.ts                              ← 擴充 getCookie/setCookie

src/Modules/Auth/Domain/
├── ValueObjects/PasswordResetToken.ts          ← 密碼重設 token VO
├── ValueObjects/EmailVerificationToken.ts      ← email 驗證 token VO
├── Repositories/IPasswordResetRepository.ts    ← 密碼重設 repo port
└── Repositories/IEmailVerificationRepository.ts← email 驗證 repo port

src/Modules/Auth/Application/
├── Ports/IEmailService.ts                      ← email 寄送 port
├── Services/ForgotPasswordService.ts           ← 寄送重設連結
├── Services/ResetPasswordService.ts            ← 驗證 token + 更新密碼
└── Services/EmailVerificationService.ts        ← 驗證 email token

src/Modules/Auth/Infrastructure/
├── Services/ConsoleEmailService.ts             ← stub: console.log
├── Repositories/InMemoryPasswordResetRepository.ts
└── Repositories/InMemoryEmailVerificationRepository.ts

resources/js/layouts/AuthLayout.tsx             ← Auth 頁面共用版型
resources/js/Pages/Auth/
├── Login.tsx
├── Register.tsx
├── ForgotPassword.tsx
├── ResetPassword.tsx
├── EmailVerification.tsx
└── VerifyDevice.tsx
```

### 修改檔案

```
src/Shared/Presentation/IHttpContext.ts          ← 加 getCookie/setCookie
src/Shared/Infrastructure/Middleware/AuthMiddleware.ts ← 讀 cookie fallback
src/Pages/routing/withInertiaPage.ts             ← 套用 pending cookies
src/Modules/Auth/Domain/Aggregates/User.ts       ← 加 withPassword()
src/Modules/Auth/Domain/Repositories/IAuthRepository.ts ← 加 updatePassword()
src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts ← 實作 updatePassword()
src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts ← 注冊新服務
src/Pages/Auth/LoginPage.ts                      ← inject + real logic
src/Pages/Auth/RegisterPage.ts
src/Pages/Auth/ForgotPasswordPage.ts
src/Pages/Auth/ResetPasswordPage.ts
src/Pages/Auth/EmailVerificationPage.ts
src/Pages/routing/auth/registerAuthPageBindings.ts ← 注入新服務
```

### 測試檔案

```
src/Shared/Presentation/__tests__/cookieUtils.test.ts
src/Modules/Auth/__tests__/PasswordResetToken.test.ts
src/Modules/Auth/__tests__/InMemoryPasswordResetRepository.test.ts
src/Modules/Auth/__tests__/ForgotPasswordService.test.ts
src/Modules/Auth/__tests__/ResetPasswordService.test.ts
src/Modules/Auth/__tests__/EmailVerificationService.test.ts
src/Pages/__tests__/Auth/LoginPage.test.ts       ← 更新現有
src/Pages/__tests__/Auth/RegisterPage.test.ts    ← 更新現有
```

---

## Task 1：IHttpContext Cookie 支援（介面）

**Files:**
- Modify: `src/Shared/Presentation/IHttpContext.ts`

- [ ] **Step 1: 在 IHttpContext 加入 cookie 相關型別和方法**

在 `IHttpContext.ts` 的 `export interface IHttpContext {` 區塊末端（`set` 方法之後）加入：

```typescript
/** Cookie 設定選項 */
export interface CookieOptions {
  httpOnly?: boolean    // default: true
  secure?: boolean      // default: false（生產環境由呼叫端決定）
  sameSite?: 'Strict' | 'Lax' | 'None'  // default: 'Lax'
  path?: string         // default: '/'
  maxAge?: number       // seconds
}

/** Pending cookie，用於 setCookie queue */
export interface PendingCookie {
  name: string
  value: string
  options: CookieOptions
}
```

在 `IHttpContext` interface 加入：

```typescript
/** 從請求 Cookie header 讀取指定 cookie 值 */
getCookie(name: string): string | undefined

/** 將 cookie 加入 pending queue（由 withInertiaPageHandler 套用至回應） */
setCookie(name: string, value: string, options?: CookieOptions): void
```

- [ ] **Step 2: 在 fromGravitoContext 加入 cookie 實作**

在 `fromGravitoContext` 函式返回物件中加入（return 區塊末尾，`set` 之後）：

```typescript
getCookie: (name: string) => {
  const cookieHeader =
    (ctx.req.header('Cookie') ?? ctx.req.header('cookie')) as string | undefined
  if (!cookieHeader) return undefined
  for (const pair of cookieHeader.split(';')) {
    const [rawKey, ...rest] = pair.split('=')
    if (rawKey?.trim() === name) return rest.join('=').trim() || undefined
  }
  return undefined
},
setCookie: (name: string, value: string, options: CookieOptions = {}) => {
  const pending: PendingCookie[] = (ctx.get('__pending_cookies__') as PendingCookie[]) ?? []
  pending.push({ name, value, options })
  ctx.set('__pending_cookies__', pending)
},
```

注意：`CookieOptions` 和 `PendingCookie` 需從 `IHttpContext` import。

- [ ] **Step 3: 驗證 TypeScript 編譯**

```bash
cd /Users/carl/Dev/CMG/Draupnir
npx tsc --noEmit 2>&1 | head -30
```

Expected：錯誤應只有「各 mock context 缺少 getCookie/setCookie」，尚未修改 mock 所以正常。

---

## Task 2：applyPendingCookies 工具函式

**Files:**
- Create: `src/Shared/Presentation/cookieUtils.ts`
- Create: `src/Shared/Presentation/__tests__/cookieUtils.test.ts`

- [ ] **Step 1: 撰寫失敗測試**

建立 `src/Shared/Presentation/__tests__/cookieUtils.test.ts`：

```typescript
import { describe, expect, test } from 'bun:test'
import { buildCookieString, applyPendingCookies } from '../cookieUtils'

describe('buildCookieString', () => {
  test('builds minimal cookie', () => {
    const result = buildCookieString('token', 'abc', {})
    expect(result).toBe('token=abc; Path=/')
  })

  test('builds full cookie with all options', () => {
    const result = buildCookieString('auth_token', 'xyz', {
      httpOnly: true,
      sameSite: 'Lax',
      maxAge: 3600,
      path: '/',
    })
    expect(result).toContain('auth_token=xyz')
    expect(result).toContain('HttpOnly')
    expect(result).toContain('SameSite=Lax')
    expect(result).toContain('Max-Age=3600')
    expect(result).toContain('Path=/')
  })
})

describe('applyPendingCookies', () => {
  test('returns original response when no cookies', () => {
    const res = new Response('body', { status: 200 })
    const result = applyPendingCookies(res, [])
    expect(result).toBe(res)
  })

  test('adds Set-Cookie header to response', () => {
    const res = new Response(null, { status: 302, headers: { Location: '/dashboard' } })
    const result = applyPendingCookies(res, [
      { name: 'auth_token', value: 'tok123', options: { httpOnly: true, maxAge: 3600 } },
    ])
    expect(result.headers.get('Set-Cookie')).toContain('auth_token=tok123')
    expect(result.headers.get('Set-Cookie')).toContain('HttpOnly')
    expect(result.headers.get('Location')).toBe('/dashboard')
  })

  test('preserves response status', () => {
    const res = new Response(null, { status: 302, headers: { Location: '/x' } })
    const result = applyPendingCookies(res, [
      { name: 'a', value: 'b', options: {} },
    ])
    expect(result.status).toBe(302)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Shared/Presentation/__tests__/cookieUtils.test.ts --no-coverage 2>&1 | tail -10
```

Expected：`FAIL` - 模組不存在。

- [ ] **Step 3: 實作 cookieUtils**

建立 `src/Shared/Presentation/cookieUtils.ts`：

```typescript
import type { CookieOptions, PendingCookie } from './IHttpContext'

/**
 * Builds a Set-Cookie header string from name, value, and options.
 */
export function buildCookieString(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  const parts: string[] = [`${name}=${value}`]

  parts.push(`Path=${options.path ?? '/'}`)

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`)
  }
  if (options.httpOnly) {
    parts.push('HttpOnly')
  }
  if (options.secure) {
    parts.push('Secure')
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`)
  }

  return parts.join('; ')
}

/**
 * Applies pending cookies from ctx.__pending_cookies__ to a Response.
 * Returns the original response unchanged if no cookies are pending.
 */
export function applyPendingCookies(
  response: Response,
  pendingCookies: PendingCookie[],
): Response {
  if (pendingCookies.length === 0) return response

  const headers = new Headers(response.headers)
  for (const { name, value, options } of pendingCookies) {
    headers.append('Set-Cookie', buildCookieString(name, value, options))
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Shared/Presentation/__tests__/cookieUtils.test.ts --no-coverage 2>&1 | tail -10
```

Expected：全部通過。

- [ ] **Step 5: Commit**

```bash
git add src/Shared/Presentation/IHttpContext.ts src/Shared/Presentation/cookieUtils.ts src/Shared/Presentation/__tests__/cookieUtils.test.ts
git commit -m "feat: add cookie support to IHttpContext and cookieUtils"
```

---

## Task 3：withInertiaPageHandler 套用 Pending Cookies

**Files:**
- Modify: `src/Pages/routing/withInertiaPage.ts`

- [ ] **Step 1: 更新 withInertiaPageHandler 套用 pending cookies**

在 `src/Pages/routing/withInertiaPage.ts` 加入 import：

```typescript
import { applyPendingCookies } from '@/Shared/Presentation/cookieUtils'
import type { PendingCookie } from '@/Shared/Presentation/IHttpContext'
```

修改 `withInertiaPageHandler` 中的 handler 呼叫：

```typescript
// 修改前：
return handler(ctx)

// 修改後：
const response = await handler(ctx)
const pending = ctx.get<PendingCookie[]>('__pending_cookies__') ?? []
return applyPendingCookies(response, pending)
```

- [ ] **Step 2: 驗證編譯**

```bash
cd /Users/carl/Dev/CMG/Draupnir
npx tsc --noEmit 2>&1 | grep "withInertiaPage" | head -5
```

Expected：無 withInertiaPage 相關錯誤。

- [ ] **Step 3: Commit**

```bash
git add src/Pages/routing/withInertiaPage.ts
git commit -m "feat: apply pending cookies to Inertia page responses"
```

---

## Task 4：AuthMiddleware Cookie Fallback + 更新所有 Mock

**Files:**
- Modify: `src/Shared/Infrastructure/Middleware/AuthMiddleware.ts`
- Modify: 所有使用 `createMockContext()` 的測試檔案

- [ ] **Step 1: 更新 AuthMiddleware extractToken 讀取 cookie**

在 `AuthMiddleware.ts` 的 `extractToken` 方法中，在回傳 `null` 之前加入 cookie fallback：

```typescript
private extractToken(ctx: IHttpContext): string | null {
  // 1. Bearer header（現有邏輯保持不變）
  const header =
    ctx.getHeader('authorization') ??
    ctx.getHeader('Authorization') ??
    (ctx.headers as Record<string, string | undefined>)?.authorization ??
    (ctx.headers as Record<string, string | undefined>)?.Authorization
  if (header) {
    const parts = header.split(' ')
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1]
    }
  }

  // 2. Cookie fallback
  return ctx.getCookie('auth_token') ?? null
}
```

- [ ] **Step 2: 在所有測試 mock context 加入 getCookie/setCookie stub**

搜尋所有 `createMockContext` 函式（共 ~10 個測試檔案）。每個 mock 需加入：

```typescript
getCookie: (_name: string) => undefined,
setCookie: (_name: string, _value: string, _options?: unknown) => {},
```

需更新的檔案（以 grep 確認）：
```bash
grep -rl "createMockContext\|IHttpContext" /Users/carl/Dev/CMG/Draupnir/src/Pages/__tests__ --include="*.ts"
```

對每個找到的測試檔案，在 mock object 中加入上述兩個方法。

- [ ] **Step 3: 確認全部測試通過**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Pages/__tests__/ --no-coverage 2>&1 | tail -5
```

Expected：全部通過（數量與修改前相同）。

- [ ] **Step 4: Commit**

```bash
git add src/Shared/Infrastructure/Middleware/AuthMiddleware.ts
git add src/Pages/__tests__/
git commit -m "feat: AuthMiddleware reads auth_token cookie as fallback"
```

---

## Task 5：PasswordResetToken + EmailVerificationToken Value Objects

**Files:**
- Create: `src/Modules/Auth/Domain/ValueObjects/PasswordResetToken.ts`
- Create: `src/Modules/Auth/Domain/ValueObjects/EmailVerificationToken.ts`
- Create: `src/Modules/Auth/__tests__/PasswordResetToken.test.ts`

- [ ] **Step 1: 撰寫失敗測試**

建立 `src/Modules/Auth/__tests__/PasswordResetToken.test.ts`：

```typescript
import { describe, expect, test } from 'bun:test'
import { PasswordResetToken } from '../Domain/ValueObjects/PasswordResetToken'

describe('PasswordResetToken', () => {
  test('creates token with required properties', () => {
    const token = PasswordResetToken.create('user@example.com')
    expect(token.token).toBeDefined()
    expect(token.token.length).toBe(64) // 32 bytes hex
    expect(token.email).toBe('user@example.com')
    expect(token.used).toBe(false)
    expect(token.isExpired()).toBe(false)
    expect(token.isValid()).toBe(true)
  })

  test('isExpired returns true for past expiry', () => {
    const pastDate = new Date(Date.now() - 1000)
    const token = PasswordResetToken.reconstruct('abc', 'e@e.com', pastDate, false)
    expect(token.isExpired()).toBe(true)
    expect(token.isValid()).toBe(false)
  })

  test('isValid returns false when used', () => {
    const futureDate = new Date(Date.now() + 3600000)
    const token = PasswordResetToken.reconstruct('abc', 'e@e.com', futureDate, true)
    expect(token.isValid()).toBe(false)
  })

  test('markUsed returns new token with used=true', () => {
    const token = PasswordResetToken.create('e@e.com')
    const used = token.markUsed()
    expect(used.used).toBe(true)
    expect(token.used).toBe(false) // original unchanged
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Modules/Auth/__tests__/PasswordResetToken.test.ts --no-coverage 2>&1 | tail -5
```

Expected：FAIL。

- [ ] **Step 3: 實作 PasswordResetToken**

建立 `src/Modules/Auth/Domain/ValueObjects/PasswordResetToken.ts`：

```typescript
/**
 * PasswordResetToken value object.
 * Represents a one-time token for resetting a user's password.
 */
export class PasswordResetToken {
  private constructor(
    readonly token: string,
    readonly email: string,
    readonly expiresAt: Date,
    readonly used: boolean,
  ) {}

  /**
   * Creates a new password reset token valid for 1 hour.
   */
  static create(email: string): PasswordResetToken {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    return new PasswordResetToken(token, email, expiresAt, false)
  }

  /**
   * Reconstructs a token from persisted data.
   */
  static reconstruct(
    token: string,
    email: string,
    expiresAt: Date,
    used: boolean,
  ): PasswordResetToken {
    return new PasswordResetToken(token, email, expiresAt, used)
  }

  isExpired(): boolean {
    return Date.now() > this.expiresAt.getTime()
  }

  isValid(): boolean {
    return !this.used && !this.isExpired()
  }

  markUsed(): PasswordResetToken {
    return new PasswordResetToken(this.token, this.email, this.expiresAt, true)
  }
}
```

建立 `src/Modules/Auth/Domain/ValueObjects/EmailVerificationToken.ts`（結構相同，語意獨立）：

```typescript
/**
 * EmailVerificationToken value object.
 * Represents a one-time token for verifying a user's email address.
 */
export class EmailVerificationToken {
  private constructor(
    readonly token: string,
    readonly email: string,
    readonly expiresAt: Date,
    readonly used: boolean,
  ) {}

  static create(email: string): EmailVerificationToken {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    return new EmailVerificationToken(token, email, expiresAt, false)
  }

  static reconstruct(
    token: string,
    email: string,
    expiresAt: Date,
    used: boolean,
  ): EmailVerificationToken {
    return new EmailVerificationToken(token, email, expiresAt, used)
  }

  isExpired(): boolean {
    return Date.now() > this.expiresAt.getTime()
  }

  isValid(): boolean {
    return !this.used && !this.isExpired()
  }

  markUsed(): EmailVerificationToken {
    return new EmailVerificationToken(this.token, this.email, this.expiresAt, true)
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Modules/Auth/__tests__/PasswordResetToken.test.ts --no-coverage 2>&1 | tail -5
```

Expected：全部通過。

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Auth/Domain/ValueObjects/PasswordResetToken.ts
git add src/Modules/Auth/Domain/ValueObjects/EmailVerificationToken.ts
git add src/Modules/Auth/__tests__/PasswordResetToken.test.ts
git commit -m "feat(auth): add PasswordResetToken and EmailVerificationToken value objects"
```

---

## Task 6：Repository Ports + IEmailService

**Files:**
- Create: `src/Modules/Auth/Domain/Repositories/IPasswordResetRepository.ts`
- Create: `src/Modules/Auth/Domain/Repositories/IEmailVerificationRepository.ts`
- Create: `src/Modules/Auth/Application/Ports/IEmailService.ts`

- [ ] **Step 1: 建立三個 port 介面**

建立 `src/Modules/Auth/Domain/Repositories/IPasswordResetRepository.ts`：

```typescript
import type { PasswordResetToken } from '../ValueObjects/PasswordResetToken'

export interface IPasswordResetRepository {
  /** Creates and persists a new password reset token for the given email. */
  create(email: string): Promise<PasswordResetToken>
  /** Finds a token by its string value. Returns null if not found. */
  findByToken(token: string): Promise<PasswordResetToken | null>
  /** Marks a token as used (consumed). */
  markUsed(token: string): Promise<void>
}
```

建立 `src/Modules/Auth/Domain/Repositories/IEmailVerificationRepository.ts`：

```typescript
import type { EmailVerificationToken } from '../ValueObjects/EmailVerificationToken'

export interface IEmailVerificationRepository {
  create(email: string): Promise<EmailVerificationToken>
  findByToken(token: string): Promise<EmailVerificationToken | null>
  markUsed(token: string): Promise<void>
}
```

建立 `src/Modules/Auth/Application/Ports/IEmailService.ts`：

```typescript
export interface IEmailService {
  /** Sends a password reset link to the given email address. */
  sendPasswordReset(to: string, resetUrl: string): Promise<void>
  /** Sends an email verification link to the given email address. */
  sendEmailVerification(to: string, verifyUrl: string): Promise<void>
}
```

- [ ] **Step 2: 驗證 TypeScript 編譯**

```bash
cd /Users/carl/Dev/CMG/Draupnir
npx tsc --noEmit 2>&1 | grep "IPasswordReset\|IEmailVerification\|IEmailService" | head -10
```

Expected：無錯誤。

- [ ] **Step 3: Commit**

```bash
git add src/Modules/Auth/Domain/Repositories/IPasswordResetRepository.ts
git add src/Modules/Auth/Domain/Repositories/IEmailVerificationRepository.ts
git add src/Modules/Auth/Application/Ports/IEmailService.ts
git commit -m "feat(auth): add password reset and email verification repository ports"
```

---

## Task 7：Infrastructure 實作（InMemory Repos + ConsoleEmailService）

**Files:**
- Create: `src/Modules/Auth/Infrastructure/Repositories/InMemoryPasswordResetRepository.ts`
- Create: `src/Modules/Auth/Infrastructure/Repositories/InMemoryEmailVerificationRepository.ts`
- Create: `src/Modules/Auth/Infrastructure/Services/ConsoleEmailService.ts`
- Create: `src/Modules/Auth/__tests__/InMemoryPasswordResetRepository.test.ts`

- [ ] **Step 1: 撰寫 InMemoryPasswordResetRepository 測試**

建立 `src/Modules/Auth/__tests__/InMemoryPasswordResetRepository.test.ts`：

```typescript
import { describe, expect, test, beforeEach } from 'bun:test'
import { InMemoryPasswordResetRepository } from '../Infrastructure/Repositories/InMemoryPasswordResetRepository'

describe('InMemoryPasswordResetRepository', () => {
  let repo: InMemoryPasswordResetRepository

  beforeEach(() => {
    repo = new InMemoryPasswordResetRepository()
  })

  test('creates and retrieves token by value', async () => {
    const token = await repo.create('user@example.com')
    expect(token.isValid()).toBe(true)

    const found = await repo.findByToken(token.token)
    expect(found).not.toBeNull()
    expect(found!.email).toBe('user@example.com')
  })

  test('returns null for unknown token', async () => {
    const result = await repo.findByToken('nonexistent')
    expect(result).toBeNull()
  })

  test('markUsed updates token', async () => {
    const token = await repo.create('user@example.com')
    await repo.markUsed(token.token)

    const found = await repo.findByToken(token.token)
    expect(found!.used).toBe(true)
    expect(found!.isValid()).toBe(false)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Modules/Auth/__tests__/InMemoryPasswordResetRepository.test.ts --no-coverage 2>&1 | tail -5
```

Expected：FAIL。

- [ ] **Step 3: 實作三個 Infrastructure 類別**

建立 `src/Modules/Auth/Infrastructure/Repositories/InMemoryPasswordResetRepository.ts`：

```typescript
import type { IPasswordResetRepository } from '../../Domain/Repositories/IPasswordResetRepository'
import { PasswordResetToken } from '../../Domain/ValueObjects/PasswordResetToken'

export class InMemoryPasswordResetRepository implements IPasswordResetRepository {
  private readonly store = new Map<string, PasswordResetToken>()

  async create(email: string): Promise<PasswordResetToken> {
    const token = PasswordResetToken.create(email)
    this.store.set(token.token, token)
    return token
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    return this.store.get(token) ?? null
  }

  async markUsed(token: string): Promise<void> {
    const existing = this.store.get(token)
    if (existing) {
      this.store.set(token, existing.markUsed())
    }
  }
}
```

建立 `src/Modules/Auth/Infrastructure/Repositories/InMemoryEmailVerificationRepository.ts`：

```typescript
import type { IEmailVerificationRepository } from '../../Domain/Repositories/IEmailVerificationRepository'
import { EmailVerificationToken } from '../../Domain/ValueObjects/EmailVerificationToken'

export class InMemoryEmailVerificationRepository implements IEmailVerificationRepository {
  private readonly store = new Map<string, EmailVerificationToken>()

  async create(email: string): Promise<EmailVerificationToken> {
    const token = EmailVerificationToken.create(email)
    this.store.set(token.token, token)
    return token
  }

  async findByToken(token: string): Promise<EmailVerificationToken | null> {
    return this.store.get(token) ?? null
  }

  async markUsed(token: string): Promise<void> {
    const existing = this.store.get(token)
    if (existing) {
      this.store.set(token, existing.markUsed())
    }
  }
}
```

建立 `src/Modules/Auth/Infrastructure/Services/ConsoleEmailService.ts`：

```typescript
import type { IEmailService } from '../../Application/Ports/IEmailService'

/**
 * Development stub: logs email content to console instead of sending.
 * Replace with a real email provider (Resend, SendGrid) in production.
 */
export class ConsoleEmailService implements IEmailService {
  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    console.log(`[Email] Password Reset → ${to}`)
    console.log(`[Email] Reset URL: ${resetUrl}`)
  }

  async sendEmailVerification(to: string, verifyUrl: string): Promise<void> {
    console.log(`[Email] Email Verification → ${to}`)
    console.log(`[Email] Verify URL: ${verifyUrl}`)
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Modules/Auth/__tests__/InMemoryPasswordResetRepository.test.ts --no-coverage 2>&1 | tail -5
```

Expected：全部通過。

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Auth/Infrastructure/Repositories/InMemoryPasswordResetRepository.ts
git add src/Modules/Auth/Infrastructure/Repositories/InMemoryEmailVerificationRepository.ts
git add src/Modules/Auth/Infrastructure/Services/ConsoleEmailService.ts
git add src/Modules/Auth/__tests__/InMemoryPasswordResetRepository.test.ts
git commit -m "feat(auth): add in-memory repos and ConsoleEmailService"
```

---

## Task 8：ForgotPasswordService

**Files:**
- Create: `src/Modules/Auth/Application/Services/ForgotPasswordService.ts`
- Create: `src/Modules/Auth/__tests__/ForgotPasswordService.test.ts`

- [ ] **Step 1: 撰寫失敗測試**

建立 `src/Modules/Auth/__tests__/ForgotPasswordService.test.ts`：

```typescript
import { describe, expect, mock, test } from 'bun:test'
import { ForgotPasswordService } from '../Application/Services/ForgotPasswordService'
import type { IAuthRepository } from '../Domain/Repositories/IAuthRepository'
import type { IPasswordResetRepository } from '../Domain/Repositories/IPasswordResetRepository'
import type { IEmailService } from '../Application/Ports/IEmailService'
import { PasswordResetToken } from '../Domain/ValueObjects/PasswordResetToken'

function makeToken(email: string) {
  return PasswordResetToken.create(email)
}

describe('ForgotPasswordService', () => {
  test('sends reset email when user exists', async () => {
    const mockUser = { emailValue: 'user@example.com' } as any
    const authRepo: IAuthRepository = {
      findByEmail: mock(async () => mockUser),
    } as any
    const resetRepo: IPasswordResetRepository = {
      create: mock(async (email: string) => makeToken(email)),
    } as any
    const emailService: IEmailService = {
      sendPasswordReset: mock(async () => {}),
    } as any

    const service = new ForgotPasswordService(authRepo, resetRepo, emailService, 'http://localhost:3000')
    const result = await service.execute('user@example.com')

    expect(result.success).toBe(true)
    expect(emailService.sendPasswordReset).toHaveBeenCalled()
  })

  test('returns success even when user does not exist (anti-enumeration)', async () => {
    const authRepo: IAuthRepository = {
      findByEmail: mock(async () => null),
    } as any
    const resetRepo: IPasswordResetRepository = {
      create: mock(async (email: string) => makeToken(email)),
    } as any
    const emailService: IEmailService = {
      sendPasswordReset: mock(async () => {}),
    } as any

    const service = new ForgotPasswordService(authRepo, resetRepo, emailService, 'http://localhost:3000')
    const result = await service.execute('unknown@example.com')

    expect(result.success).toBe(true)
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Modules/Auth/__tests__/ForgotPasswordService.test.ts --no-coverage 2>&1 | tail -5
```

Expected：FAIL。

- [ ] **Step 3: 實作 ForgotPasswordService**

建立 `src/Modules/Auth/Application/Services/ForgotPasswordService.ts`：

```typescript
import { Email } from '../../Domain/ValueObjects/Email'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IPasswordResetRepository } from '../../Domain/Repositories/IPasswordResetRepository'
import type { IEmailService } from '../Ports/IEmailService'

export class ForgotPasswordService {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly passwordResetRepository: IPasswordResetRepository,
    private readonly emailService: IEmailService,
    private readonly baseUrl: string,
  ) {}

  async execute(emailStr: string): Promise<{ success: boolean; message: string }> {
    const message = '若此 email 存在，重設連結已寄出'

    try {
      const email = Email.create(emailStr)
      const user = await this.authRepository.findByEmail(email)

      if (!user) {
        return { success: true, message }
      }

      const token = await this.passwordResetRepository.create(emailStr)
      const resetUrl = `${this.baseUrl}/reset-password/${token.token}`
      await this.emailService.sendPasswordReset(emailStr, resetUrl)

      return { success: true, message }
    } catch {
      return { success: true, message }
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Modules/Auth/__tests__/ForgotPasswordService.test.ts --no-coverage 2>&1 | tail -5
```

Expected：全部通過。

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Auth/Application/Services/ForgotPasswordService.ts
git add src/Modules/Auth/__tests__/ForgotPasswordService.test.ts
git commit -m "feat(auth): add ForgotPasswordService with anti-enumeration protection"
```

---

## Task 9：ResetPasswordService（含 User.withPassword + IAuthRepository.updatePassword）

**Files:**
- Modify: `src/Modules/Auth/Domain/Aggregates/User.ts`
- Modify: `src/Modules/Auth/Domain/Repositories/IAuthRepository.ts`
- Modify: `src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts`
- Create: `src/Modules/Auth/Application/Services/ResetPasswordService.ts`
- Create: `src/Modules/Auth/__tests__/ResetPasswordService.test.ts`

- [ ] **Step 1: 在 User aggregate 加入 withPassword()**

在 `User.ts` 的 class body 末端（最後一個 getter 之後）加入：

```typescript
/**
 * Returns a new User with an updated hashed password (immutable pattern).
 */
withPassword(hashedPassword: string): User {
  return new User({
    ...this.props,
    password: Password.fromHashed(hashedPassword),
    updatedAt: new Date(),
  })
}
```

- [ ] **Step 2: 在 IAuthRepository 加入 updatePassword()**

在 `IAuthRepository.ts` interface 中加入：

```typescript
/**
 * Updates the hashed password for a user by ID.
 */
updatePassword(id: string, hashedPassword: string): Promise<void>
```

- [ ] **Step 3: 在 AuthRepository 實作 updatePassword()**

在 `AuthRepository.ts` 的 class body 加入（`save()` 之後）：

```typescript
async updatePassword(id: string, hashedPassword: string): Promise<void> {
  await this.db
    .table('users')
    .where('id', '=', id)
    .update({ password: hashedPassword, updated_at: new Date().toISOString() })
}
```

- [ ] **Step 4: 撰寫 ResetPasswordService 失敗測試**

建立 `src/Modules/Auth/__tests__/ResetPasswordService.test.ts`：

```typescript
import { describe, expect, mock, test } from 'bun:test'
import { ResetPasswordService } from '../Application/Services/ResetPasswordService'
import type { IAuthRepository } from '../Domain/Repositories/IAuthRepository'
import type { IPasswordResetRepository } from '../Domain/Repositories/IPasswordResetRepository'
import type { IPasswordHasher } from '../Application/Ports/IPasswordHasher'
import { PasswordResetToken } from '../Domain/ValueObjects/PasswordResetToken'

describe('ResetPasswordService', () => {
  const validToken = PasswordResetToken.reconstruct(
    'valid-token-abc',
    'user@example.com',
    new Date(Date.now() + 3600000),
    false,
  )
  const expiredToken = PasswordResetToken.reconstruct(
    'expired-token',
    'user@example.com',
    new Date(Date.now() - 1000),
    false,
  )
  const usedToken = PasswordResetToken.reconstruct(
    'used-token',
    'user@example.com',
    new Date(Date.now() + 3600000),
    true,
  )
  const mockUser = { id: 'user-1', emailValue: 'user@example.com' } as any

  test('resets password with valid token', async () => {
    const resetRepo: IPasswordResetRepository = {
      findByToken: mock(async () => validToken),
      markUsed: mock(async () => {}),
    } as any
    const authRepo: IAuthRepository = {
      findByEmail: mock(async () => mockUser),
      updatePassword: mock(async () => {}),
    } as any
    const hasher: IPasswordHasher = {
      hash: mock(async () => 'hashed-new-password'),
    } as any

    const service = new ResetPasswordService(resetRepo, authRepo, hasher)
    const result = await service.execute('valid-token-abc', 'NewPassword123!')

    expect(result.success).toBe(true)
    expect(authRepo.updatePassword).toHaveBeenCalledWith('user-1', 'hashed-new-password')
    expect(resetRepo.markUsed).toHaveBeenCalledWith('valid-token-abc')
  })

  test('rejects expired token', async () => {
    const resetRepo: IPasswordResetRepository = {
      findByToken: mock(async () => expiredToken),
    } as any

    const service = new ResetPasswordService(resetRepo, {} as any, {} as any)
    const result = await service.execute('expired-token', 'NewPassword123!')

    expect(result.success).toBe(false)
    expect(result.error).toContain('過期')
  })

  test('rejects already-used token', async () => {
    const resetRepo: IPasswordResetRepository = {
      findByToken: mock(async () => usedToken),
    } as any

    const service = new ResetPasswordService(resetRepo, {} as any, {} as any)
    const result = await service.execute('used-token', 'NewPassword123!')

    expect(result.success).toBe(false)
  })

  test('returns error for unknown token', async () => {
    const resetRepo: IPasswordResetRepository = {
      findByToken: mock(async () => null),
    } as any

    const service = new ResetPasswordService(resetRepo, {} as any, {} as any)
    const result = await service.execute('unknown', 'NewPassword123!')

    expect(result.success).toBe(false)
  })

  test('validateToken returns valid:true for valid token', async () => {
    const resetRepo: IPasswordResetRepository = {
      findByToken: mock(async () => validToken),
    } as any

    const service = new ResetPasswordService(resetRepo, {} as any, {} as any)
    const result = await service.validateToken('valid-token-abc')

    expect(result.valid).toBe(true)
  })
})
```

- [ ] **Step 5: 執行測試確認失敗**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Modules/Auth/__tests__/ResetPasswordService.test.ts --no-coverage 2>&1 | tail -5
```

Expected：FAIL。

- [ ] **Step 6: 實作 ResetPasswordService**

建立 `src/Modules/Auth/Application/Services/ResetPasswordService.ts`：

```typescript
import { Email } from '../../Domain/ValueObjects/Email'
import type { IPasswordResetRepository } from '../../Domain/Repositories/IPasswordResetRepository'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IPasswordHasher } from '../Ports/IPasswordHasher'

export class ResetPasswordService {
  constructor(
    private readonly passwordResetRepository: IPasswordResetRepository,
    private readonly authRepository: IAuthRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async validateToken(token: string): Promise<{ valid: boolean }> {
    const record = await this.passwordResetRepository.findByToken(token)
    return { valid: record?.isValid() ?? false }
  }

  async execute(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string; error?: string }> {
    const record = await this.passwordResetRepository.findByToken(token)

    if (!record) {
      return { success: false, message: '重設連結無效', error: '重設連結無效或不存在' }
    }

    if (!record.isValid()) {
      const reason = record.used ? '已使用' : '過期'
      return { success: false, message: `重設連結已${reason}`, error: `重設連結已${reason}` }
    }

    const user = await this.authRepository.findByEmail(Email.create(record.email))
    if (!user) {
      return { success: false, message: '使用者不存在', error: '使用者不存在' }
    }

    const hashedPassword = await this.passwordHasher.hash(newPassword)
    await this.authRepository.updatePassword(user.id, hashedPassword)
    await this.passwordResetRepository.markUsed(token)

    return { success: true, message: '密碼已成功重設' }
  }
}
```

- [ ] **Step 7: 執行測試確認通過**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Modules/Auth/__tests__/ResetPasswordService.test.ts --no-coverage 2>&1 | tail -5
```

Expected：全部通過。

- [ ] **Step 8: Commit**

```bash
git add src/Modules/Auth/Domain/Aggregates/User.ts
git add src/Modules/Auth/Domain/Repositories/IAuthRepository.ts
git add src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts
git add src/Modules/Auth/Application/Services/ResetPasswordService.ts
git add src/Modules/Auth/__tests__/ResetPasswordService.test.ts
git commit -m "feat(auth): add ResetPasswordService with token validation"
```

---

## Task 10：EmailVerificationService

**Files:**
- Create: `src/Modules/Auth/Application/Services/EmailVerificationService.ts`
- Create: `src/Modules/Auth/__tests__/EmailVerificationService.test.ts`

- [ ] **Step 1: 撰寫失敗測試**

建立 `src/Modules/Auth/__tests__/EmailVerificationService.test.ts`：

```typescript
import { describe, expect, mock, test } from 'bun:test'
import { EmailVerificationService } from '../Application/Services/EmailVerificationService'
import type { IEmailVerificationRepository } from '../Domain/Repositories/IEmailVerificationRepository'
import { EmailVerificationToken } from '../Domain/ValueObjects/EmailVerificationToken'

describe('EmailVerificationService', () => {
  const validToken = EmailVerificationToken.reconstruct(
    'valid-verify-token',
    'user@example.com',
    new Date(Date.now() + 86400000),
    false,
  )
  const expiredToken = EmailVerificationToken.reconstruct(
    'expired-verify',
    'user@example.com',
    new Date(Date.now() - 1000),
    false,
  )

  test('verifies email with valid token', async () => {
    const repo: IEmailVerificationRepository = {
      findByToken: mock(async () => validToken),
      markUsed: mock(async () => {}),
    } as any

    const service = new EmailVerificationService(repo)
    const result = await service.execute('valid-verify-token')

    expect(result.success).toBe(true)
    expect(result.redirectUrl).toBe('/member/dashboard')
    expect(repo.markUsed).toHaveBeenCalledWith('valid-verify-token')
  })

  test('rejects expired token', async () => {
    const repo: IEmailVerificationRepository = {
      findByToken: mock(async () => expiredToken),
    } as any

    const service = new EmailVerificationService(repo)
    const result = await service.execute('expired-verify')

    expect(result.success).toBe(false)
  })

  test('rejects unknown token', async () => {
    const repo: IEmailVerificationRepository = {
      findByToken: mock(async () => null),
    } as any

    const service = new EmailVerificationService(repo)
    const result = await service.execute('unknown')

    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
bun test src/Modules/Auth/__tests__/EmailVerificationService.test.ts --no-coverage 2>&1 | tail -5
```

- [ ] **Step 3: 實作 EmailVerificationService**

建立 `src/Modules/Auth/Application/Services/EmailVerificationService.ts`：

```typescript
import type { IEmailVerificationRepository } from '../../Domain/Repositories/IEmailVerificationRepository'

export class EmailVerificationService {
  constructor(
    private readonly emailVerificationRepository: IEmailVerificationRepository,
  ) {}

  async execute(
    token: string,
  ): Promise<{ success: boolean; message: string; redirectUrl?: string }> {
    const record = await this.emailVerificationRepository.findByToken(token)

    if (!record || !record.isValid()) {
      return { success: false, message: '驗證連結無效或已過期' }
    }

    await this.emailVerificationRepository.markUsed(token)

    return {
      success: true,
      message: '電子郵件驗證成功',
      redirectUrl: '/member/dashboard',
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
bun test src/Modules/Auth/__tests__/EmailVerificationService.test.ts --no-coverage 2>&1 | tail -5
```

Expected：全部通過。

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Auth/Application/Services/EmailVerificationService.ts
git add src/Modules/Auth/__tests__/EmailVerificationService.test.ts
git commit -m "feat(auth): add EmailVerificationService"
```

---

## Task 11：AuthServiceProvider 注冊新服務

**Files:**
- Modify: `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`

- [ ] **Step 1: 加入新服務到 AuthServiceProvider**

在 `AuthServiceProvider.ts` 中加入 imports（現有 imports 區塊末端）：

```typescript
import { ConsoleEmailService } from '../Services/ConsoleEmailService'
import { InMemoryPasswordResetRepository } from '../Repositories/InMemoryPasswordResetRepository'
import { InMemoryEmailVerificationRepository } from '../Repositories/InMemoryEmailVerificationRepository'
import { ForgotPasswordService } from '../../Application/Services/ForgotPasswordService'
import { ResetPasswordService } from '../../Application/Services/ResetPasswordService'
import { EmailVerificationService } from '../../Application/Services/EmailVerificationService'
```

在 `register()` 方法末端（`configureAuthMiddleware` 呼叫之前）加入：

```typescript
container.singleton('emailService', () => new ConsoleEmailService())

container.singleton('passwordResetRepository', () => new InMemoryPasswordResetRepository())

container.singleton(
  'emailVerificationRepository',
  () => new InMemoryEmailVerificationRepository(),
)

container.bind('forgotPasswordService', (c: IContainer) => {
  const baseUrl = process.env.APP_URL?.trim() || 'http://localhost:3000'
  return new ForgotPasswordService(
    c.make('authRepository') as IAuthRepository,
    c.make('passwordResetRepository') as InMemoryPasswordResetRepository,
    c.make('emailService') as ConsoleEmailService,
    baseUrl,
  )
})

container.bind('resetPasswordService', (c: IContainer) => {
  return new ResetPasswordService(
    c.make('passwordResetRepository') as InMemoryPasswordResetRepository,
    c.make('authRepository') as IAuthRepository,
    c.make('passwordHasher') as ScryptPasswordHasher,
  )
})

container.bind('emailVerificationService', (c: IContainer) => {
  return new EmailVerificationService(
    c.make('emailVerificationRepository') as InMemoryEmailVerificationRepository,
  )
})
```

- [ ] **Step 2: 驗證編譯**

```bash
cd /Users/carl/Dev/CMG/Draupnir
npx tsc --noEmit 2>&1 | grep "AuthServiceProvider" | head -10
```

Expected：無錯誤。

- [ ] **Step 3: Commit**

```bash
git add src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts
git commit -m "feat(auth): register password reset and email verification services in DI"
```

---

## Task 12：LoginPage + RegisterPage 完整實作

**Files:**
- Modify: `src/Pages/Auth/LoginPage.ts`
- Modify: `src/Pages/Auth/RegisterPage.ts`
- Modify: `src/Pages/routing/auth/registerAuthPageBindings.ts`
- Modify: `src/Pages/__tests__/Auth/LoginPage.test.ts`
- Modify: `src/Pages/__tests__/Auth/RegisterPage.test.ts`

- [ ] **Step 1: 更新 LoginPage**

將 `src/Pages/Auth/LoginPage.ts` 完整替換：

```typescript
import type { LoginUserService } from '@/Modules/Auth/Application/Services/LoginUserService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

export class LoginPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly loginService: LoginUserService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    // 已登入則直接跳轉
    if (ctx.getCookie('auth_token')) {
      return ctx.redirect('/member/dashboard')
    }

    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''

    return this.inertia.render(ctx, 'Auth/Login', {
      csrfToken,
      lastEmail: undefined,
    })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''
    const validated = ctx.get('validated') as { email?: string; password?: string } | undefined
    const email = validated?.email ?? ''
    const password = validated?.password ?? ''

    const result = await this.loginService.execute({ email, password })

    if (!result.success || !result.data) {
      return this.inertia.render(ctx, 'Auth/Login', {
        csrfToken,
        error: result.error ?? result.message,
        lastEmail: email,
      })
    }

    ctx.setCookie('auth_token', result.data.accessToken, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 3600,
    })

    return ctx.redirect('/member/dashboard')
  }
}
```

- [ ] **Step 2: 更新 RegisterPage**

將 `src/Pages/Auth/RegisterPage.ts` 完整替換：

```typescript
import type { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requiresUppercase: true,
  requiresLowercase: true,
  requiresNumbers: true,
  requiresSpecialChars: true,
}

export class RegisterPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly registerService: RegisterUserService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''

    return this.inertia.render(ctx, 'Auth/Register', {
      csrfToken,
      passwordRequirements: PASSWORD_REQUIREMENTS,
    })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''
    const validated = ctx.get('validated') as {
      email?: string
      password?: string
      passwordConfirmation?: string
      agreedToTerms?: boolean
    } | undefined

    const email = validated?.email ?? ''
    const password = validated?.password ?? ''
    const confirmPassword = validated?.passwordConfirmation ?? ''

    const result = await this.registerService.execute({ email, password, confirmPassword })

    if (!result.success) {
      return this.inertia.render(ctx, 'Auth/Register', {
        csrfToken,
        error: result.error ?? result.message,
        passwordRequirements: PASSWORD_REQUIREMENTS,
      })
    }

    ctx.set('flash:success', '帳號建立成功，請登入')
    return ctx.redirect('/login')
  }
}
```

- [ ] **Step 3: 更新 DI bindings for Login + Register**

在 `registerAuthPageBindings.ts` 更新兩個 singleton：

```typescript
// 新增 imports
import type { LoginUserService } from '@/Modules/Auth/Application/Services/LoginUserService'
import type { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'

// 替換現有的：
container.singleton(k.login, (c) =>
  new LoginPage(
    c.make(i) as InertiaService,
    c.make('loginUserService') as LoginUserService,
  ),
)

container.singleton(k.register, (c) =>
  new RegisterPage(
    c.make(i) as InertiaService,
    c.make('registerUserService') as RegisterUserService,
  ),
)
```

- [ ] **Step 4: 更新 LoginPage.test.ts 和 RegisterPage.test.ts**

在兩個測試檔案的 `createMockContext` 加入 cookie stubs（如 Task 4 中所述），並更新測試：

在 `LoginPage.test.ts` 加入 `loginService` mock：

```typescript
import { LoginPage } from '../../Auth/LoginPage'

const mockLoginService = {
  execute: mock(async () => ({
    success: true,
    message: 'OK',
    data: { accessToken: 'tok', refreshToken: 'ref', user: { id: '1', email: 'a@b.com', role: 'member' } },
  })),
}

// 在 createMockContext 加入 cookie stubs
getCookie: (_name: string) => undefined,
setCookie: mock((_name: string, _value: string, _opts?: unknown) => {}),

// 更新測試：
const page = new LoginPage(inertia, mockLoginService as any)
```

在 `RegisterPage.test.ts` 加入 `registerService` mock：

```typescript
import { RegisterPage } from '../../Auth/RegisterPage'

const mockRegisterService = {
  execute: mock(async () => ({ success: true, message: '帳號建立成功' })),
}
const page = new RegisterPage(inertia, mockRegisterService as any)
```

- [ ] **Step 5: 執行測試**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Pages/__tests__/Auth/LoginPage.test.ts src/Pages/__tests__/Auth/RegisterPage.test.ts --no-coverage 2>&1 | tail -10
```

Expected：全部通過。

- [ ] **Step 6: Commit**

```bash
git add src/Pages/Auth/LoginPage.ts src/Pages/Auth/RegisterPage.ts
git add src/Pages/routing/auth/registerAuthPageBindings.ts
git add src/Pages/__tests__/Auth/LoginPage.test.ts src/Pages/__tests__/Auth/RegisterPage.test.ts
git commit -m "feat(pages): implement LoginPage and RegisterPage with real auth services"
```

---

## Task 13：ForgotPasswordPage + ResetPasswordPage + EmailVerificationPage

**Files:**
- Modify: `src/Pages/Auth/ForgotPasswordPage.ts`
- Modify: `src/Pages/Auth/ResetPasswordPage.ts`
- Modify: `src/Pages/Auth/EmailVerificationPage.ts`
- Modify: `src/Pages/routing/auth/registerAuthPageBindings.ts`

- [ ] **Step 1: 更新 ForgotPasswordPage**

將 `src/Pages/Auth/ForgotPasswordPage.ts` 完整替換：

```typescript
import type { ForgotPasswordService } from '@/Modules/Auth/Application/Services/ForgotPasswordService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

export class ForgotPasswordPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly forgotPasswordService: ForgotPasswordService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''
    return this.inertia.render(ctx, 'Auth/ForgotPassword', { csrfToken })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''
    const validated = ctx.get('validated') as { email?: string } | undefined
    const email = validated?.email ?? ''

    await this.forgotPasswordService.execute(email)

    return this.inertia.render(ctx, 'Auth/ForgotPassword', {
      csrfToken,
      message: '若此 email 存在，重設連結已寄出',
    })
  }
}
```

- [ ] **Step 2: 更新 ResetPasswordPage**

將 `src/Pages/Auth/ResetPasswordPage.ts` 完整替換：

```typescript
import type { ResetPasswordService } from '@/Modules/Auth/Application/Services/ResetPasswordService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

export class ResetPasswordPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly resetPasswordService: ResetPasswordService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''
    const token = ctx.getParam('token') ?? ''

    const { valid } = await this.resetPasswordService.validateToken(token)

    return this.inertia.render(ctx, 'Auth/ResetPassword', {
      csrfToken,
      token,
      tokenValid: valid,
    })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''
    const token = ctx.getParam('token') ?? ''
    const validated = ctx.get('validated') as {
      password?: string
      passwordConfirmation?: string
    } | undefined
    const password = validated?.password ?? ''

    const result = await this.resetPasswordService.execute(token, password)

    if (!result.success) {
      return this.inertia.render(ctx, 'Auth/ResetPassword', {
        csrfToken,
        token,
        tokenValid: true,
        error: result.error,
      })
    }

    ctx.set('flash:success', '密碼已重設，請使用新密碼登入')
    return ctx.redirect('/login')
  }
}
```

- [ ] **Step 3: 更新 EmailVerificationPage**

將 `src/Pages/Auth/EmailVerificationPage.ts` 完整替換：

```typescript
import type { EmailVerificationService } from '@/Modules/Auth/Application/Services/EmailVerificationService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

export class EmailVerificationPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const token = ctx.getParam('token') ?? ''
    const result = await this.emailVerificationService.execute(token)

    if (result.success) {
      return this.inertia.render(ctx, 'Auth/EmailVerification', {
        status: 'success',
        message: result.message,
        redirectUrl: result.redirectUrl ?? '/member/dashboard',
        redirectSeconds: 5,
      })
    }

    return this.inertia.render(ctx, 'Auth/EmailVerification', {
      status: 'error',
      message: result.message,
    })
  }
}
```

- [ ] **Step 4: 更新 DI bindings for 三個新頁面**

在 `registerAuthPageBindings.ts` 加入 imports 並更新三個 singleton：

```typescript
import type { ForgotPasswordService } from '@/Modules/Auth/Application/Services/ForgotPasswordService'
import type { ResetPasswordService } from '@/Modules/Auth/Application/Services/ResetPasswordService'
import type { EmailVerificationService } from '@/Modules/Auth/Application/Services/EmailVerificationService'

container.singleton(k.forgotPassword, (c) =>
  new ForgotPasswordPage(
    c.make(i) as InertiaService,
    c.make('forgotPasswordService') as ForgotPasswordService,
  ),
)

container.singleton(k.resetPassword, (c) =>
  new ResetPasswordPage(
    c.make(i) as InertiaService,
    c.make('resetPasswordService') as ResetPasswordService,
  ),
)

container.singleton(k.emailVerification, (c) =>
  new EmailVerificationPage(
    c.make(i) as InertiaService,
    c.make('emailVerificationService') as EmailVerificationService,
  ),
)
```

- [ ] **Step 5: 驗證編譯**

```bash
cd /Users/carl/Dev/CMG/Draupnir
npx tsc --noEmit 2>&1 | head -20
```

Expected：無錯誤。

- [ ] **Step 6: Commit**

```bash
git add src/Pages/Auth/ForgotPasswordPage.ts src/Pages/Auth/ResetPasswordPage.ts src/Pages/Auth/EmailVerificationPage.ts
git add src/Pages/routing/auth/registerAuthPageBindings.ts
git commit -m "feat(pages): implement ForgotPassword, ResetPassword, EmailVerification pages"
```

---

## Task 14：AuthLayout

**Files:**
- Create: `resources/js/layouts/AuthLayout.tsx`

- [ ] **Step 1: 建立 AuthLayout**

建立 `resources/js/layouts/AuthLayout.tsx`：

```tsx
import type { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Draupnir</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/layouts/AuthLayout.tsx
git commit -m "feat(ui): add AuthLayout for auth pages"
```

---

## Task 15：Login.tsx

**Files:**
- Create: `resources/js/Pages/Auth/Login.tsx`

- [ ] **Step 1: 建立 Login 頁面**

建立 `resources/js/Pages/Auth/Login.tsx`：

```tsx
import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  csrfToken: string
  lastEmail?: string
  error?: string
}

export default function Login({ lastEmail, error }: Props) {
  const [email, setEmail] = useState(lastEmail ?? '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    router.post('/login', { email, password }, {
      onFinish: () => setLoading(false),
    })
  }

  return (
    <AuthLayout>
      <Head title="登入" />
      <Card>
        <CardHeader>
          <CardTitle>登入</CardTitle>
          <CardDescription>輸入您的帳號和密碼</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="text-right text-sm">
              <a href="/forgot-password" className="text-muted-foreground hover:underline">
                忘記密碼？
              </a>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登入中…' : '登入'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => { window.location.href = '/oauth/google' }}
            >
              使用 Google 登入
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            還沒帳號？{' '}
            <a href="/register" className="underline hover:text-foreground">
              註冊
            </a>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Auth/Login.tsx
git commit -m "feat(ui): add Login page"
```

---

## Task 16：Register.tsx

**Files:**
- Create: `resources/js/Pages/Auth/Register.tsx`

- [ ] **Step 1: 建立 Register 頁面**

建立 `resources/js/Pages/Auth/Register.tsx`：

```tsx
import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PasswordRequirements {
  minLength: number
  requiresUppercase: boolean
  requiresLowercase: boolean
  requiresNumbers: boolean
  requiresSpecialChars: boolean
}

interface Props {
  csrfToken: string
  passwordRequirements: PasswordRequirements
  error?: string
}

export default function Register({ passwordRequirements, error }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    router.post('/register', { email, password, passwordConfirmation, agreedToTerms }, {
      onFinish: () => setLoading(false),
    })
  }

  return (
    <AuthLayout>
      <Head title="註冊" />
      <Card>
        <CardHeader>
          <CardTitle>建立帳號</CardTitle>
          <CardDescription>輸入您的資訊以建立帳號</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">電子郵件</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密碼</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                <li className={password.length >= passwordRequirements.minLength ? 'text-green-600' : ''}>
                  最少 {passwordRequirements.minLength} 個字元
                </li>
                {passwordRequirements.requiresUppercase && (
                  <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>包含大寫字母</li>
                )}
                {passwordRequirements.requiresNumbers && (
                  <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>包含數字</li>
                )}
                {passwordRequirements.requiresSpecialChars && (
                  <li className={/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : ''}>包含特殊符號</li>
                )}
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConfirmation">確認密碼</Label>
              <Input
                id="passwordConfirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="agreedToTerms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                required
              />
              <Label htmlFor="agreedToTerms" className="text-sm font-normal cursor-pointer">
                我同意服務條款
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !agreedToTerms}>
              {loading ? '建立中…' : '建立帳號'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            已有帳號？{' '}
            <a href="/login" className="underline hover:text-foreground">
              登入
            </a>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Auth/Register.tsx
git commit -m "feat(ui): add Register page"
```

---

## Task 17：ForgotPassword.tsx

**Files:**
- Create: `resources/js/Pages/Auth/ForgotPassword.tsx`

- [ ] **Step 1: 建立 ForgotPassword 頁面**

建立 `resources/js/Pages/Auth/ForgotPassword.tsx`：

```tsx
import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  csrfToken: string
  message?: string
}

export default function ForgotPassword({ message }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    router.post('/forgot-password', { email }, {
      onFinish: () => setLoading(false),
    })
  }

  return (
    <AuthLayout>
      <Head title="忘記密碼" />
      <Card>
        <CardHeader>
          <CardTitle>忘記密碼</CardTitle>
          <CardDescription>輸入您的電子郵件，我們將寄送重設連結</CardDescription>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
              {message}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">電子郵件</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '寄送中…' : '寄送重設連結'}
              </Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <a href="/login" className="underline hover:text-foreground">
              返回登入
            </a>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Auth/ForgotPassword.tsx
git commit -m "feat(ui): add ForgotPassword page"
```

---

## Task 18：ResetPassword.tsx

**Files:**
- Create: `resources/js/Pages/Auth/ResetPassword.tsx`

- [ ] **Step 1: 建立 ResetPassword 頁面**

建立 `resources/js/Pages/Auth/ResetPassword.tsx`：

```tsx
import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  csrfToken: string
  token: string
  tokenValid: boolean
  message?: string
  error?: string
}

export default function ResetPassword({ token, tokenValid, error }: Props) {
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    router.post(`/reset-password/${token}`, { password, passwordConfirmation }, {
      onFinish: () => setLoading(false),
    })
  }

  if (!tokenValid) {
    return (
      <AuthLayout>
        <Head title="重設密碼" />
        <Card>
          <CardHeader>
            <CardTitle>連結已過期</CardTitle>
            <CardDescription>此重設連結已失效或過期</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              請重新申請密碼重設連結。
            </p>
            <Button variant="outline" className="w-full" onClick={() => { window.location.href = '/forgot-password' }}>
              重新申請
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Head title="重設密碼" />
      <Card>
        <CardHeader>
          <CardTitle>設定新密碼</CardTitle>
          <CardDescription>請輸入您的新密碼</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">新密碼</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConfirmation">確認新密碼</Label>
              <Input
                id="passwordConfirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '重設中…' : '重設密碼'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Auth/ResetPassword.tsx
git commit -m "feat(ui): add ResetPassword page"
```

---

## Task 19：EmailVerification.tsx

**Files:**
- Create: `resources/js/Pages/Auth/EmailVerification.tsx`

- [ ] **Step 1: 建立 EmailVerification 頁面**

建立 `resources/js/Pages/Auth/EmailVerification.tsx`：

```tsx
import { Head, router } from '@inertiajs/react'
import { useEffect } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  status: 'success' | 'error'
  message: string
  redirectUrl?: string
  redirectSeconds?: number
}

export default function EmailVerification({ status, message, redirectUrl, redirectSeconds = 5 }: Props) {
  useEffect(() => {
    if (status === 'success' && redirectUrl) {
      const timer = setTimeout(() => {
        router.visit(redirectUrl)
      }, redirectSeconds * 1000)
      return () => clearTimeout(timer)
    }
  }, [status, redirectUrl, redirectSeconds])

  return (
    <AuthLayout>
      <Head title="電子郵件驗證" />
      <Card>
        <CardHeader>
          <CardTitle>
            {status === 'success' ? '驗證成功' : '驗證失敗'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className={`text-4xl ${status === 'success' ? 'text-green-500' : 'text-destructive'}`}>
            {status === 'success' ? '✓' : '✕'}
          </div>
          <p className="text-sm text-muted-foreground">{message}</p>
          {status === 'success' && redirectUrl && (
            <p className="text-xs text-muted-foreground">
              {redirectSeconds} 秒後自動跳轉…
            </p>
          )}
          {status === 'error' && (
            <Button variant="outline" onClick={() => { window.location.href = '/login' }}>
              返回登入
            </Button>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Auth/EmailVerification.tsx
git commit -m "feat(ui): add EmailVerification page"
```

---

## Task 20：VerifyDevice.tsx

**Files:**
- Create: `resources/js/Pages/Auth/VerifyDevice.tsx`

- [ ] **Step 1: 建立 VerifyDevice 頁面**

建立 `resources/js/Pages/Auth/VerifyDevice.tsx`：

```tsx
import { Head, router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

interface Props {
  csrfToken: string
  message?: string
  error?: string
}

export default function VerifyDevice({ message, error }: Props) {
  const auth = useAuth()
  const [userCode, setUserCode] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!auth.user) {
      router.visit('/login')
    }
  }, [auth.user])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    router.post('/verify-device', { userCode }, {
      onFinish: () => setLoading(false),
    })
  }

  if (!auth.user) return null

  return (
    <AuthLayout>
      <Head title="授權裝置" />
      <Card>
        <CardHeader>
          <CardTitle>授權 CLI 裝置</CardTitle>
          <CardDescription>輸入 CLI 顯示的 8 碼授權碼</CardDescription>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="rounded-md bg-green-50 px-4 py-6 text-center space-y-2">
              <div className="text-2xl text-green-600">✓</div>
              <p className="text-sm text-green-800 font-medium">{message}</p>
              <p className="text-xs text-green-700">您現在可以返回 CLI 繼續操作</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="userCode">授權碼</Label>
                <Input
                  id="userCode"
                  name="userCode"
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  maxLength={8}
                  required
                  autoFocus
                  className="font-mono text-lg tracking-widest text-center uppercase"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || userCode.length !== 8}>
                {loading ? '驗證中…' : '授權'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Auth/VerifyDevice.tsx
git commit -m "feat(ui): add VerifyDevice page"
```

---

## Task 21：最終驗證

- [ ] **Step 1: 執行全部測試**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test --no-coverage 2>&1 | tail -10
```

Expected：全部通過（包含新增的 service 測試）。

- [ ] **Step 2: 驗證 TypeScript**

```bash
cd /Users/carl/Dev/CMG/Draupnir
npx tsc --noEmit 2>&1 | head -20
```

Expected：無錯誤。

- [ ] **Step 3: 確認所有 Auth 頁面 React 元件存在**

```bash
ls resources/js/Pages/Auth/
```

Expected：`Login.tsx  Register.tsx  ForgotPassword.tsx  ResetPassword.tsx  EmailVerification.tsx  VerifyDevice.tsx`

---

## Self-Review Checklist

✅ **Spec Coverage:**
- [x] §1 IHttpContext cookie 支援 → Task 1+2+3
- [x] §1 AuthMiddleware cookie fallback → Task 4
- [x] §2 PasswordResetToken + EmailVerificationToken → Task 5
- [x] §2 Repository ports + IEmailService → Task 6
- [x] §2 Infrastructure stubs → Task 7
- [x] §3 ForgotPasswordService → Task 8
- [x] §3 ResetPasswordService → Task 9
- [x] §3 EmailVerificationService → Task 10
- [x] §4 AuthServiceProvider 注冊 → Task 11
- [x] §4 LoginPage + RegisterPage → Task 12
- [x] §4 ForgotPassword/ResetPassword/EmailVerification pages → Task 13
- [x] §5 AuthLayout → Task 14
- [x] §5 Login.tsx → Task 15
- [x] §5 Register.tsx → Task 16
- [x] §5 ForgotPassword.tsx → Task 17
- [x] §5 ResetPassword.tsx → Task 18
- [x] §5 EmailVerification.tsx → Task 19
- [x] §5 VerifyDevice.tsx → Task 20

✅ **No Placeholders:** 所有步驟包含實際程式碼。

✅ **Type Consistency:**
- `PasswordResetToken.create()` / `.reconstruct()` / `.markUsed()` — Task 5 定義，Task 7/8/9 使用
- `IPasswordResetRepository.create/findByToken/markUsed` — Task 6 定義，Task 7/9 實作
- `ForgotPasswordService.execute(email)` → `{ success, message }` — Task 8 定義，Task 13 使用
- `ResetPasswordService.validateToken(token)` → `{ valid }` — Task 9 定義，Task 13 使用
- `ctx.setCookie(name, value, options)` — Task 1 定義，Task 12 使用，Task 3 套用
