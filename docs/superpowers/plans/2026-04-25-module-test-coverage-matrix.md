# Module Test Coverage Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the matrix in `docs/superpowers/specs/module-test-coverage-matrix.md` into the first executable hardening slice by unblocking acceptance verification and completing the Auth P0 coverage gaps.

**Architecture:** This plan intentionally scopes the broad matrix down to Phase 0 plus the first P0 module (`Auth`), because the matrix spans many independent bounded contexts that should each receive their own bite-sized plan. The Auth slice follows Acceptance-First TDD: acceptance use-case specs exercise real DI, real DB, real middleware, real repositories, and observable side effects; unit tests only support deterministic clock behavior needed by the acceptance layer.

**Tech Stack:** Bun test runner, Vitest assertions, TypeScript strict mode, Gravito DI/router, Draupnir `TestApp`, SQLite-backed acceptance DB, real Auth/Profile modules, fake `TestClock` only for external time control.

---

## Scope check

`docs/superpowers/specs/module-test-coverage-matrix.md` covers independent modules: Auth, Credit, Organization, ApiKey, AppApiKey, SdkApi, Contract, AppModule, Alerts, Reports, Dashboard, CliApi, Profile, DevPortal, and Health. Implementing all of them in one plan would create a long-running cross-module branch with hard-to-review risk.

This plan implements only:

1. Phase 0 unblockers from the matrix.
2. Auth P0 hardening slices:
   - password reset lifecycle;
   - email verification lifecycle;
   - JWT/token expiry controlled by `TestClock`;
   - admin status changes that suspend a user, revoke sessions, and block login/protected routes;
   - endpoint contract coverage for the same public entry points.
3. A documentation update that marks the Auth slice complete and records that remaining modules need their own follow-up plans.

Create separate plans after this one for `Organization`, `ApiKey/AppApiKey/SdkApi`, and each Phase 2/3 cluster.

## File structure

### Files to modify

- `tests/Acceptance/support/http/TestAuth.ts`
  - Remove the duplicate `sha256` import that currently blocks `bun run typecheck`.

- `src/Modules/Auth/Infrastructure/Services/JwtTokenService.ts`
  - Inject `IClock` with a default `SystemClock` fallback.
  - Use the injected clock for signing, verifying, and expiry calculations.

- `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`
  - Resolve `clock` from the container when constructing `JwtTokenService`.

- `tests/Acceptance/ApiContract/auth-endpoints.spec.ts`
  - Extend the existing Auth contract coverage with web Auth endpoints and token expiry contract cases.

- `docs/superpowers/specs/module-test-coverage-matrix.md`
  - Update the evidence snapshot and Auth matrix row after the slice is green.

### Files to create

- `src/Modules/Auth/__tests__/JwtTokenService.clock.test.ts`
  - Unit-level deterministic proof that JWT signing and verifying honor injected time.

- `tests/Acceptance/UseCases/Auth/password-reset-lifecycle.spec.ts`
  - Acceptance use case for request reset → reset password → session revocation → rejected reused/expired token.

- `tests/Acceptance/UseCases/Auth/email-verification-lifecycle.spec.ts`
  - Acceptance use case for issued token → verify → duplicate/expired token rejected.

- `tests/Acceptance/UseCases/Auth/token-expiry.spec.ts`
  - Acceptance use case for access/refresh token expiry controlled by `TestClock` through real HTTP middleware.

- `tests/Acceptance/UseCases/Auth/admin-status-changes.spec.ts`
  - Acceptance use case for admin suspending/reactivating a user through the real Profile HTTP endpoint backed by Auth services.

## Cleanup plan before edits

- Keep existing Organization acceptance edits untouched; do not format or rewrite them in this branch.
- Make one smell-focused cleanup only: remove the duplicate import in `TestAuth.ts`.
- Do not introduce new dependencies.
- Do not mock repositories, middleware, validation, or application services in acceptance specs.
- Prefer DB assertions and HTTP responses over implementation-detail assertions.

---

### Task 1: Fix Phase 0 typecheck blocker

**Files:**
- Modify: `tests/Acceptance/support/http/TestAuth.ts:1-6`
- Test: `tests/Acceptance/support/__tests__/TestAuth.test.ts`

- [ ] **Step 1: Write the failing verification command**

Run the known blocker first so the failure is documented before editing:

```bash
bun run typecheck
```

Expected before this task: FAIL with a duplicate identifier/import error for `sha256` in `tests/Acceptance/support/http/TestAuth.ts`.

- [ ] **Step 2: Remove the duplicate import**

Edit the top of `tests/Acceptance/support/http/TestAuth.ts` to exactly this import block:

```ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { sha256 } from '@/Modules/Auth/Application/Utils/sha256'
import type { IJwtTokenService } from '@/Modules/Auth/Application/Ports/IJwtTokenService'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
```

Leave the rest of the file unchanged.

- [ ] **Step 3: Verify the support helper still passes its own tests**

Run:

```bash
bun test tests/Acceptance/support/__tests__/TestAuth.test.ts
```

Expected: PASS.

- [ ] **Step 4: Verify Phase 0 smoke commands**

Run:

```bash
bun test tests/Acceptance/smoke.spec.ts tests/Acceptance/smoke-db.spec.ts
bun run typecheck
```

Expected: both commands PASS unless the only failures are the already-uncommitted Organization acceptance edits. If Organization failures appear, record exact filenames and error output in the final report and continue with Auth-only targeted commands.

- [ ] **Step 5: Commit**

```bash
git add tests/Acceptance/support/http/TestAuth.ts
git commit -m "Unblock acceptance typechecking

The acceptance Auth helper imported sha256 twice, which prevented broad
verification before module hardening work could begin.

Constraint: Must not touch existing uncommitted Organization acceptance edits
Confidence: high
Scope-risk: narrow
Tested: bun test tests/Acceptance/support/__tests__/TestAuth.test.ts; bun run typecheck
Not-tested: Full acceptance suite deferred until Auth hardening slice is added"
```

---

### Task 2: Make JWT expiry deterministic through injected clock

**Files:**
- Create: `src/Modules/Auth/__tests__/JwtTokenService.clock.test.ts`
- Modify: `src/Modules/Auth/Infrastructure/Services/JwtTokenService.ts`
- Modify: `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`

- [ ] **Step 1: Write the failing unit test**

Create `src/Modules/Auth/__tests__/JwtTokenService.clock.test.ts` with this content:

```ts
import { describe, expect, it } from 'vitest'
import type { IClock } from '@/Shared/Application/Ports/IClock'
import { JwtTokenService } from '../Infrastructure/Services/JwtTokenService'

class MutableClock implements IClock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current.getTime())
  }

  nowIso(): string {
    return this.now().toISOString()
  }

  setNow(next: Date): void {
    this.current = new Date(next.getTime())
  }
}

describe('JwtTokenService clock injection', () => {
  it('signs and verifies access tokens against the injected clock', () => {
    const clock = new MutableClock(new Date('2026-01-01T00:00:00.000Z'))
    const service = new JwtTokenService(clock)

    const token = service.signAccessToken({
      userId: 'user-clock-1',
      email: 'clock@example.test',
      role: 'member',
      permissions: [],
    })

    expect(token.getExpiresAt().toISOString()).toBe('2026-01-01T00:15:00.000Z')
    expect(service.verify(token.getValue())?.userId).toBe('user-clock-1')
    expect(service.getTimeToExpire(token.getValue())).toBe(15 * 60 * 1000)

    clock.setNow(new Date('2026-01-01T00:16:00.000Z'))

    expect(service.verify(token.getValue())).toBeNull()
    expect(service.isValid(token.getValue())).toBe(false)
    expect(service.getTimeToExpire(token.getValue())).toBe(0)
  })
})
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run:

```bash
bun test src/Modules/Auth/__tests__/JwtTokenService.clock.test.ts
```

Expected: FAIL because `JwtTokenService` does not accept `IClock` yet and verification uses real wall-clock time.

- [ ] **Step 3: Implement clock injection**

Replace `src/Modules/Auth/Infrastructure/Services/JwtTokenService.ts` with this content:

```ts
/**
 * JwtTokenService
 * Issues and verifies JWT access and refresh tokens.
 *
 * Responsibilities:
 * - Sign access tokens (15 minutes)
 * - Sign refresh tokens (7 days)
 * - Verify token signature and expiry
 * - Decode token payloads
 */

import jwt from 'jsonwebtoken'
import type { IClock } from '@/Shared/Application/Ports/IClock'
import { SystemClock } from '@/Shared/Infrastructure/Services/SystemClock'
import type { IJwtTokenService, TokenSignPayload } from '../../Application/Ports/IJwtTokenService'
import { AuthToken, type TokenPayload, TokenType } from '../../Domain/ValueObjects/AuthToken'

/** Secret key used for signing JWTs. */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
/** Access token expiration time in seconds (15 minutes). */
const ACCESS_TOKEN_EXPIRES_IN = 15 * 60
/** Refresh token expiration time in seconds (7 days). */
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60

/**
 * Service for managing JSON Web Tokens (JWT).
 */
export class JwtTokenService implements IJwtTokenService {
  constructor(private readonly clock: IClock = new SystemClock()) {}

  /**
   * Signs a new access token.
   */
  signAccessToken(payload: TokenSignPayload): AuthToken {
    const now = this.clock.now()
    const expiresAt = new Date(now.getTime() + ACCESS_TOKEN_EXPIRES_IN * 1000)
    const tokenPayload: TokenPayload = {
      ...payload,
      jti: crypto.randomUUID(),
      type: TokenType.ACCESS,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET)

    return new AuthToken(token, expiresAt, TokenType.ACCESS, tokenPayload)
  }

  /**
   * Signs a new refresh token.
   */
  signRefreshToken(payload: TokenSignPayload): AuthToken {
    const now = this.clock.now()
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRES_IN * 1000)
    const tokenPayload: TokenPayload = {
      ...payload,
      jti: crypto.randomUUID(),
      type: TokenType.REFRESH,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET)

    return new AuthToken(token, expiresAt, TokenType.REFRESH, tokenPayload)
  }

  /**
   * Verifies a token's signature and expiration.
   */
  verify(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET, {
        clockTimestamp: Math.floor(this.clock.now().getTime() / 1000),
      }) as TokenPayload
      return payload
    } catch {
      return null
    }
  }

  /**
   * Decodes a token without verifying the signature.
   * Use this only when the signature has been verified or verification is not required.
   */
  decode(token: string): TokenPayload | null {
    try {
      const payload = jwt.decode(token) as TokenPayload
      return payload
    } catch {
      return null
    }
  }

  /**
   * Checks if the token is valid (signature is correct and not expired).
   */
  isValid(token: string): boolean {
    const payload = this.verify(token)
    if (!payload) {
      return false
    }
    return payload.exp > Math.floor(this.clock.now().getTime() / 1000)
  }

  /**
   * Calculates the remaining time until the token expires.
   */
  getTimeToExpire(token: string): number {
    const payload = this.decode(token)
    if (!payload) {
      return -1
    }
    const now = Math.floor(this.clock.now().getTime() / 1000)
    return Math.max(0, (payload.exp - now) * 1000)
  }

  /**
   * Checks if the token is close to expiring (less than 60 seconds remaining).
   */
  isAboutToExpire(token: string): boolean {
    return this.getTimeToExpire(token) < 60 * 1000
  }
}
```

- [ ] **Step 4: Wire the injected clock through the Auth provider**

In `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`, change the `jwtTokenService` singleton from:

```ts
container.singleton('jwtTokenService', () => new JwtTokenService())
```

to:

```ts
container.singleton('jwtTokenService', (c: IContainer) => new JwtTokenService(c.make('clock')))
```

- [ ] **Step 5: Run tests to verify the implementation**

Run:

```bash
bun test src/Modules/Auth/__tests__/JwtTokenService.clock.test.ts src/Modules/Auth/__tests__/LoginUserService.test.ts src/Modules/Auth/__tests__/RefreshTokenService.test.ts
bun test tests/Acceptance/smoke.spec.ts
bun run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/Modules/Auth/Infrastructure/Services/JwtTokenService.ts src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts src/Modules/Auth/__tests__/JwtTokenService.clock.test.ts
git commit -m "Make auth token expiry testable through injected time

Auth acceptance tests need deterministic expiry behavior. JwtTokenService now
uses the shared clock binding for signing, verification, and expiry math while
keeping SystemClock as the default for direct construction.

Constraint: Acceptance TestApp already rebinds clock after provider registration
Rejected: Monkey-patch Date.now in tests | global time mutation would leak across concurrent Bun tests
Confidence: high
Scope-risk: moderate
Tested: bun test src/Modules/Auth/__tests__/JwtTokenService.clock.test.ts src/Modules/Auth/__tests__/LoginUserService.test.ts src/Modules/Auth/__tests__/RefreshTokenService.test.ts; bun test tests/Acceptance/smoke.spec.ts; bun run typecheck"
```

---

### Task 3: Add password reset lifecycle acceptance coverage

**Files:**
- Create: `tests/Acceptance/UseCases/Auth/password-reset-lifecycle.spec.ts`

- [ ] **Step 1: Write the failing acceptance spec**

Create `tests/Acceptance/UseCases/Auth/password-reset-lifecycle.spec.ts` with this content:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

describe('Auth password reset lifecycle', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await TestApp.boot()
  })

  afterAll(async () => {
    await app.shutdown()
  })

  beforeEach(async () => {
    await app.reset()
  })

  it('requests a reset, changes the password, revokes active sessions, and rejects reused or expired tokens', async () => {
    const email = 'auth-reset@example.test'
    const oldPassword = 'OldSecure123'
    const newPassword = 'NewSecure123'

    const registerRes = await app.http.post('/api/auth/register', {
      body: { email, password: oldPassword },
    })
    expect(registerRes.status).toBe(201)

    const loginRes = await app.http.post('/api/auth/login', {
      body: { email, password: oldPassword },
    })
    expect(loginRes.status).toBe(200)
    const loginJson = (await loginRes.json()) as {
      data?: { accessToken: string; user: { id: string } }
    }
    const oldAccessToken = loginJson.data?.accessToken as string
    const userId = loginJson.data?.user.id as string

    const forgotRes = await app.http.post('/forgot-password', {
      body: { email },
    })
    expect(forgotRes.status).toBe(200)

    const resetRow = await app.db
      .table('password_reset_tokens')
      .where('email', '=', email)
      .first()
    expect(resetRow).toBeTruthy()
    const resetToken = String(resetRow.id)

    const resetPageRes = await app.http.get(`/reset-password/${resetToken}`)
    expect(resetPageRes.status).toBe(200)

    const resetRes = await app.http.post(`/reset-password/${resetToken}`, {
      body: { password: newPassword, passwordConfirmation: newPassword },
    })
    expect([200, 302, 303]).toContain(resetRes.status)

    const usedResetRow = await app.db
      .table('password_reset_tokens')
      .where('id', '=', resetToken)
      .first()
    expect(Boolean(usedResetRow?.used)).toBe(true)

    const revokedTokens = await app.db
      .table('auth_tokens')
      .where('user_id', '=', userId)
      .whereNotNull('revoked_at')
      .select()
    expect(revokedTokens.length).toBeGreaterThan(0)

    const oldSessionRes = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${oldAccessToken}` },
    })
    expect(oldSessionRes.status).toBe(401)

    const oldLoginRes = await app.http.post('/api/auth/login', {
      body: { email, password: oldPassword },
    })
    expect(oldLoginRes.status).toBe(401)

    const newLoginRes = await app.http.post('/api/auth/login', {
      body: { email, password: newPassword },
    })
    expect(newLoginRes.status).toBe(200)

    const reusedTokenRes = await app.http.post(`/reset-password/${resetToken}`, {
      body: { password: 'AnotherSecure123', passwordConfirmation: 'AnotherSecure123' },
    })
    expect(reusedTokenRes.status).toBe(200)

    const stillNewLoginRes = await app.http.post('/api/auth/login', {
      body: { email, password: newPassword },
    })
    expect(stillNewLoginRes.status).toBe(200)

    await app.db.table('password_reset_tokens').insert({
      id: 'expired-reset-token',
      email,
      expires_at: '2025-12-31T23:00:00.000Z',
      used: false,
    })

    const expiredResetRes = await app.http.post('/reset-password/expired-reset-token', {
      body: { password: 'ExpiredSecure123', passwordConfirmation: 'ExpiredSecure123' },
    })
    expect(expiredResetRes.status).toBe(200)

    const expiredRow = await app.db
      .table('password_reset_tokens')
      .where('id', '=', 'expired-reset-token')
      .first()
    expect(Boolean(expiredRow?.used)).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify the current behavior**

Run:

```bash
bun test tests/Acceptance/UseCases/Auth/password-reset-lifecycle.spec.ts
```

Expected: either PASS if the existing implementation already satisfies the slice, or FAIL with one concrete mismatch. If it fails, only change production code needed to satisfy the business assertions in this spec; do not loosen assertions to match broken behavior.

- [ ] **Step 3: Run nearby Auth tests**

Run:

```bash
bun test src/Modules/Auth/__tests__/ForgotPasswordService.test.ts src/Modules/Auth/__tests__/ResetPasswordService.test.ts tests/Acceptance/UseCases/Auth/password-reset-lifecycle.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/Acceptance/UseCases/Auth/password-reset-lifecycle.spec.ts
git commit -m "Cover password reset as an acceptance lifecycle

The matrix marks password reset as an Auth P0 gap. This use-case spec proves
reset issuance, one-time token consumption, password change, active session
revocation, and expired token rejection through real HTTP, DI, and DB paths.

Constraint: Password reset is an Inertia web route, not an /api route
Rejected: Unit-only reset coverage | misses route wiring, DB mapping, and session revocation behavior
Confidence: high
Scope-risk: narrow
Tested: bun test src/Modules/Auth/__tests__/ForgotPasswordService.test.ts src/Modules/Auth/__tests__/ResetPasswordService.test.ts tests/Acceptance/UseCases/Auth/password-reset-lifecycle.spec.ts"
```

---

### Task 4: Add email verification lifecycle acceptance coverage

**Files:**
- Create: `tests/Acceptance/UseCases/Auth/email-verification-lifecycle.spec.ts`

- [ ] **Step 1: Write the failing acceptance spec**

Create `tests/Acceptance/UseCases/Auth/email-verification-lifecycle.spec.ts` with this content:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { IEmailVerificationRepository } from '@/Modules/Auth/Domain/Repositories/IEmailVerificationRepository'
import { TestApp } from '../../support/TestApp'

describe('Auth email verification lifecycle', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await TestApp.boot()
  })

  afterAll(async () => {
    await app.shutdown()
  })

  beforeEach(async () => {
    await app.reset()
  })

  it('verifies an issued token once and rejects duplicate or expired verification attempts', async () => {
    const email = 'auth-verify@example.test'
    const repository = app.container.make(
      'emailVerificationRepository',
    ) as IEmailVerificationRepository

    const issued = await repository.create(email)

    const verifyRes = await app.http.get(`/verify-email/${issued.token}`)
    expect(verifyRes.status).toBe(200)

    const usedRow = await app.db
      .table('email_verification_tokens')
      .where('id', '=', issued.token)
      .first()
    expect(Boolean(usedRow?.used)).toBe(true)

    const duplicateRes = await app.http.get(`/verify-email/${issued.token}`)
    expect(duplicateRes.status).toBe(200)

    const stillUsedRow = await app.db
      .table('email_verification_tokens')
      .where('id', '=', issued.token)
      .first()
    expect(Boolean(stillUsedRow?.used)).toBe(true)

    await app.db.table('email_verification_tokens').insert({
      id: 'expired-verify-token',
      email,
      expires_at: '2025-12-31T23:00:00.000Z',
      used: false,
    })

    const expiredRes = await app.http.get('/verify-email/expired-verify-token')
    expect(expiredRes.status).toBe(200)

    const expiredRow = await app.db
      .table('email_verification_tokens')
      .where('id', '=', 'expired-verify-token')
      .first()
    expect(Boolean(expiredRow?.used)).toBe(false)
  })
})
```

- [ ] **Step 2: Run it to verify the current behavior**

Run:

```bash
bun test tests/Acceptance/UseCases/Auth/email-verification-lifecycle.spec.ts
```

Expected: either PASS if current implementation already satisfies the slice, or FAIL with one concrete mismatch. If it fails, fix only the behavior required by the spec.

- [ ] **Step 3: Run nearby Auth tests**

Run:

```bash
bun test src/Modules/Auth/__tests__/EmailVerificationService.test.ts src/Modules/Auth/__tests__/EmailVerificationRepository.test.ts tests/Acceptance/UseCases/Auth/email-verification-lifecycle.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/Acceptance/UseCases/Auth/email-verification-lifecycle.spec.ts
git commit -m "Cover email verification as an acceptance lifecycle

The Auth matrix calls out missing email verification lifecycle coverage. This
spec proves issued verification tokens are consumed once and that used or
expired tokens do not mutate persisted verification state.

Constraint: Current email verification page renders success or error with HTTP 200
Rejected: Assert translated Inertia payload text | less stable than persisted token state
Confidence: high
Scope-risk: narrow
Tested: bun test src/Modules/Auth/__tests__/EmailVerificationService.test.ts src/Modules/Auth/__tests__/EmailVerificationRepository.test.ts tests/Acceptance/UseCases/Auth/email-verification-lifecycle.spec.ts"
```

---

### Task 5: Add token expiry acceptance coverage

**Files:**
- Create: `tests/Acceptance/UseCases/Auth/token-expiry.spec.ts`

- [ ] **Step 1: Write the failing acceptance spec**

Create `tests/Acceptance/UseCases/Auth/token-expiry.spec.ts` with this content:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

describe('Auth token expiry', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await TestApp.boot()
  })

  afterAll(async () => {
    await app.shutdown()
  })

  beforeEach(async () => {
    await app.reset()
  })

  it('rejects expired access tokens and expired refresh tokens using TestClock-controlled time', async () => {
    const email = 'auth-expiry@example.test'
    const password = 'SecurePass123'

    await app.http.post('/api/auth/register', { body: { email, password } })
    const loginRes = await app.http.post('/api/auth/login', { body: { email, password } })
    expect(loginRes.status).toBe(200)
    const loginJson = (await loginRes.json()) as {
      data?: { accessToken: string; refreshToken: string }
    }
    const accessToken = loginJson.data?.accessToken as string
    const refreshToken = loginJson.data?.refreshToken as string

    const activeSessionRes = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(activeSessionRes.status).toBe(200)

    app.clock.advance(16 * 60 * 1000)

    const expiredSessionRes = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(expiredSessionRes.status).toBe(401)

    const refreshWithinSevenDaysRes = await app.http.post('/api/auth/refresh', {
      body: { refreshToken },
    })
    expect(refreshWithinSevenDaysRes.status).toBe(200)

    app.clock.advance(8 * 24 * 60 * 60 * 1000)

    const expiredRefreshRes = await app.http.post('/api/auth/refresh', {
      body: { refreshToken },
    })
    expect(expiredRefreshRes.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run it to verify it fails before Task 2 or passes after Task 2**

Run:

```bash
bun test tests/Acceptance/UseCases/Auth/token-expiry.spec.ts
```

Expected after Task 2: PASS. If this fails because auth middleware still verifies JWTs with wall-clock time, route middleware must resolve and use the same `jwtTokenService` binding instead of constructing its own verifier.

- [ ] **Step 3: Run session lifecycle regression tests**

Run:

```bash
bun test tests/Acceptance/UseCases/Auth/session-lifecycle.spec.ts tests/Acceptance/UseCases/Auth/logout-revocation.spec.ts tests/Acceptance/UseCases/Auth/token-expiry.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/Acceptance/UseCases/Auth/token-expiry.spec.ts
git commit -m "Cover auth token expiry at the acceptance boundary

The Auth matrix identifies expiry and clock behavior as a P0 gap. This spec
proves real HTTP middleware rejects expired access tokens and refresh rejects
expired refresh tokens under the TestClock-controlled container binding.

Constraint: Expiry must be proven through real HTTP, not token object internals alone
Rejected: Time-sensitive sleep-based tests | slow and flaky under concurrent test runs
Confidence: high
Scope-risk: narrow
Tested: bun test tests/Acceptance/UseCases/Auth/session-lifecycle.spec.ts tests/Acceptance/UseCases/Auth/logout-revocation.spec.ts tests/Acceptance/UseCases/Auth/token-expiry.spec.ts"
```

---

### Task 6: Add admin status change acceptance coverage

**Files:**
- Create: `tests/Acceptance/UseCases/Auth/admin-status-changes.spec.ts`

- [ ] **Step 1: Write the failing acceptance spec**

Create `tests/Acceptance/UseCases/Auth/admin-status-changes.spec.ts` with this content:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

describe('Auth admin status changes', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await TestApp.boot()
  })

  afterAll(async () => {
    await app.shutdown()
  })

  beforeEach(async () => {
    await app.reset()
  })

  it('lets an admin suspend and reactivate a user while enforcing login and token access rules', async () => {
    const adminEmail = 'status-admin@example.test'
    const memberEmail = 'status-member@example.test'
    const password = 'SecurePass123'

    const adminRegisterRes = await app.http.post('/api/auth/register', {
      body: { email: adminEmail, password },
    })
    const adminRegisterJson = (await adminRegisterRes.json()) as { data?: { id: string } }
    const adminId = adminRegisterJson.data?.id as string
    await app.db.table('users').where('id', '=', adminId).update({ role: 'admin' })

    const memberRegisterRes = await app.http.post('/api/auth/register', {
      body: { email: memberEmail, password },
    })
    const memberRegisterJson = (await memberRegisterRes.json()) as { data?: { id: string } }
    const memberId = memberRegisterJson.data?.id as string

    const adminHeaders = await app.auth.bearerHeaderFor({
      userId: adminId,
      email: adminEmail,
      role: 'admin',
    })

    const memberLoginRes = await app.http.post('/api/auth/login', {
      body: { email: memberEmail, password },
    })
    const memberLoginJson = (await memberLoginRes.json()) as { data?: { accessToken: string } }
    const memberAccessToken = memberLoginJson.data?.accessToken as string

    const suspendRes = await app.http.patch(`/api/users/${memberId}/status`, {
      headers: adminHeaders,
      body: { status: 'suspended' },
    })
    expect(suspendRes.status).toBe(200)

    const suspendedUser = await app.db.table('users').where('id', '=', memberId).first()
    expect(suspendedUser?.status).toBe('suspended')

    const revokedRows = await app.db
      .table('auth_tokens')
      .where('user_id', '=', memberId)
      .whereNotNull('revoked_at')
      .select()
    expect(revokedRows.length).toBeGreaterThan(0)

    const suspendedLoginRes = await app.http.post('/api/auth/login', {
      body: { email: memberEmail, password },
    })
    expect(suspendedLoginRes.status).toBe(401)
    const suspendedLoginJson = (await suspendedLoginRes.json()) as { error?: string }
    expect(suspendedLoginJson.error).toBe('ACCOUNT_SUSPENDED')

    const revokedSessionRes = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${memberAccessToken}` },
    })
    expect(revokedSessionRes.status).toBe(401)

    const reactivateRes = await app.http.patch(`/api/users/${memberId}/status`, {
      headers: adminHeaders,
      body: { status: 'active' },
    })
    expect(reactivateRes.status).toBe(200)

    const activeUser = await app.db.table('users').where('id', '=', memberId).first()
    expect(activeUser?.status).toBe('active')

    const activeLoginRes = await app.http.post('/api/auth/login', {
      body: { email: memberEmail, password },
    })
    expect(activeLoginRes.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run it to verify current behavior**

Run:

```bash
bun test tests/Acceptance/UseCases/Auth/admin-status-changes.spec.ts
```

Expected: either PASS if current implementation and middleware satisfy the slice, or FAIL with a concrete status/permission/revocation mismatch. If it fails, fix only the Auth/Profile boundary needed to satisfy this spec.

- [ ] **Step 3: Run admin status and Profile route regressions**

Run:

```bash
bun test src/Modules/Auth/__tests__/ChangeUserStatusService.test.ts tests/Acceptance/UseCases/Auth/admin-status-changes.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/Acceptance/UseCases/Auth/admin-status-changes.spec.ts
git commit -m "Cover admin status changes across Auth and Profile boundaries

The Auth matrix lists admin status changes as a P0 gap. This use-case spec
proves the real admin HTTP route suspends users, revokes existing tokens,
blocks login/protected access while suspended, and allows login again after
reactivation.

Constraint: Status endpoint lives in Profile routes but delegates to Auth service
Rejected: Testing ChangeUserStatusService only | misses auth middleware and route permission boundary
Confidence: high
Scope-risk: narrow
Tested: bun test src/Modules/Auth/__tests__/ChangeUserStatusService.test.ts tests/Acceptance/UseCases/Auth/admin-status-changes.spec.ts"
```

---

### Task 7: Extend Auth endpoint contract coverage

**Files:**
- Modify: `tests/Acceptance/ApiContract/auth-endpoints.spec.ts`

- [ ] **Step 1: Append contract tests for the new Auth slices**

Append these imports and tests to `tests/Acceptance/ApiContract/auth-endpoints.spec.ts`. The file already imports `afterAll`, `beforeAll`, `beforeEach`, `describe`, `expect`, `it`, and `TestApp`, so add only the `it(...)` blocks inside the existing `describe('Auth API contract', () => { ... })` block before its closing `})`:

```ts
  it('web password reset endpoints accept valid input and reject invalid input', async () => {
    const email = 'contract-reset@example.test'
    await app.http.post('/api/auth/register', {
      body: { email, password: 'SecurePass123' },
    })

    const requestHappy = await app.http.post('/forgot-password', {
      body: { email },
    })
    expect(requestHappy.status).toBe(200)

    const requestInvalid = await app.http.post('/forgot-password', {
      body: { email: 'not-an-email' },
    })
    expect(requestInvalid.status).toBe(422)

    const resetRow = await app.db
      .table('password_reset_tokens')
      .where('email', '=', email)
      .first()
    const token = String(resetRow?.id)

    const resetHappy = await app.http.post(`/reset-password/${token}`, {
      body: { password: 'NewSecure123', passwordConfirmation: 'NewSecure123' },
    })
    expect([200, 302, 303]).toContain(resetHappy.status)

    const resetInvalid = await app.http.post(`/reset-password/${token}`, {
      body: { password: 'short', passwordConfirmation: 'short' },
    })
    expect(resetInvalid.status).toBe(422)
  })

  it('web email verification endpoint handles valid and unknown tokens without mutating unknown state', async () => {
    const repository = app.container.make('emailVerificationRepository') as {
      create(email: string): Promise<{ token: string }>
    }
    const issued = await repository.create('contract-verify@example.test')

    const happy = await app.http.get(`/verify-email/${issued.token}`)
    expect(happy.status).toBe(200)

    const usedRow = await app.db
      .table('email_verification_tokens')
      .where('id', '=', issued.token)
      .first()
    expect(Boolean(usedRow?.used)).toBe(true)

    const unknown = await app.http.get('/verify-email/unknown-token')
    expect(unknown.status).toBe(200)

    const unknownRow = await app.db
      .table('email_verification_tokens')
      .where('id', '=', 'unknown-token')
      .first()
    expect(unknownRow).toBeFalsy()
  })

  it('admin status endpoint enforces admin authorization and validation', async () => {
    const adminEmail = 'contract-status-admin@example.test'
    const memberEmail = 'contract-status-member@example.test'
    const password = 'SecurePass123'

    const adminRegister = await app.http.post('/api/auth/register', {
      body: { email: adminEmail, password },
    })
    const adminJson = (await adminRegister.json()) as { data?: { id: string } }
    const adminId = adminJson.data?.id as string
    await app.db.table('users').where('id', '=', adminId).update({ role: 'admin' })

    const memberRegister = await app.http.post('/api/auth/register', {
      body: { email: memberEmail, password },
    })
    const memberJson = (await memberRegister.json()) as { data?: { id: string } }
    const memberId = memberJson.data?.id as string

    const adminHeaders = await app.auth.bearerHeaderFor({
      userId: adminId,
      email: adminEmail,
      role: 'admin',
    })
    const memberHeaders = await app.auth.bearerHeaderFor({
      userId: memberId,
      email: memberEmail,
      role: 'member',
    })

    const unauthenticated = await app.http.patch(`/api/users/${memberId}/status`, {
      body: { status: 'suspended' },
    })
    expect(unauthenticated.status).toBe(401)

    const forbidden = await app.http.patch(`/api/users/${memberId}/status`, {
      headers: memberHeaders,
      body: { status: 'suspended' },
    })
    expect(forbidden.status).toBe(403)

    const invalid = await app.http.patch(`/api/users/${memberId}/status`, {
      headers: adminHeaders,
      body: { status: 'paused' },
    })
    expect(invalid.status).toBe(422)

    const happy = await app.http.patch(`/api/users/${memberId}/status`, {
      headers: adminHeaders,
      body: { status: 'suspended' },
    })
    expect(happy.status).toBe(200)
  })
```

- [ ] **Step 2: Run the Auth API contract spec**

Run:

```bash
bun test tests/Acceptance/ApiContract/auth-endpoints.spec.ts
```

Expected: PASS. If failures show that web routes return 400 instead of 422 for validation, preserve the framework's existing validation convention only if nearby route contract tests use the same status; otherwise fix the validation adapter for consistency.

- [ ] **Step 3: Run all Auth acceptance specs together**

Run:

```bash
bun test tests/Acceptance/UseCases/Auth tests/Acceptance/ApiContract/auth-endpoints.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/Acceptance/ApiContract/auth-endpoints.spec.ts
git commit -m "Lock Auth endpoint contracts for reset verification and status flows

The Auth matrix marks API contract coverage as partial. These contract tests
cover validation, auth/permission failures, and happy paths for the Auth web
flows and the admin status endpoint that delegates to Auth behavior.

Constraint: Password reset and email verification are web/Inertia routes
Rejected: Browser-only coverage | HTTP contract tests are faster and prove route middleware/validation
Confidence: high
Scope-risk: narrow
Tested: bun test tests/Acceptance/UseCases/Auth tests/Acceptance/ApiContract/auth-endpoints.spec.ts"
```

---

### Task 8: Update the matrix and run final verification

**Files:**
- Modify: `docs/superpowers/specs/module-test-coverage-matrix.md`

- [ ] **Step 1: Update the Auth row and evidence snapshot**

In `docs/superpowers/specs/module-test-coverage-matrix.md`, update the evidence snapshot rows to reflect the new Auth coverage:

```md
| Acceptance UseCases | Present for `Auth`, `Credit`, and `Organization`; Auth now includes session, logout, password reset, email verification, token expiry, and admin status-change lifecycles. |
| API Contract acceptance | Present for `Auth`, `Credit`, and `Organization`; Auth now includes reset/verification/status endpoint contracts. |
| Known verification blocker | Duplicate `sha256` import in `tests/Acceptance/support/http/TestAuth.ts` resolved by the Auth hardening slice. |
```

Update the Auth matrix row to:

```md
| `Auth` | Good | Good | Good | Good | P0 | Google OAuth acceptance remains as a follow-up because it depends on OAuth adapter contract fakes; current slice covers password reset, email verification, token expiry/clock behavior, and admin status changes. |
```

Add this note under `## 4. Recommended hardening order` after the Phase 1 list:

```md
> Auth hardening note: Password reset, email verification, token expiry, and admin status-change coverage were completed in the first implementation slice. Google OAuth acceptance should be planned separately because it needs a dedicated OAuth adapter fake and callback contract review.
```

- [ ] **Step 2: Run final targeted verification**

Run:

```bash
bun test src/Modules/Auth/__tests__ tests/Acceptance/UseCases/Auth tests/Acceptance/ApiContract/auth-endpoints.spec.ts
bun test tests/Acceptance/smoke.spec.ts tests/Acceptance/smoke-db.spec.ts
bun run typecheck
bun run lint
```

Expected: PASS. If `bun run lint` reports pre-existing warnings outside files touched by this plan, record the exact filenames and rerun a narrower lint check against touched files:

```bash
bun ./node_modules/.bin/biome lint src/Modules/Auth tests/Acceptance/UseCases/Auth tests/Acceptance/ApiContract/auth-endpoints.spec.ts tests/Acceptance/support/http/TestAuth.ts
```

Expected for the narrower command: PASS.

- [ ] **Step 3: Commit the documentation update**

```bash
git add docs/superpowers/specs/module-test-coverage-matrix.md
git commit -m "Record completed Auth coverage hardening slice

The module coverage matrix now reflects the first executable P0 hardening
slice and keeps Google OAuth acceptance as a separate focused plan.

Constraint: The broader matrix still spans independent modules that need separate follow-up plans
Confidence: high
Scope-risk: narrow
Tested: bun test src/Modules/Auth/__tests__ tests/Acceptance/UseCases/Auth tests/Acceptance/ApiContract/auth-endpoints.spec.ts; bun test tests/Acceptance/smoke.spec.ts tests/Acceptance/smoke-db.spec.ts; bun run typecheck; bun run lint
Not-tested: Non-Auth P0/P1/P2 module hardening is intentionally out of scope for this plan"
```

---

## Self-review

### Spec coverage

- Phase 0 duplicate `sha256` import blocker: covered by Task 1.
- Resolve existing Organization acceptance changes: not modified by this plan; preserved as a blocker/parallel branch because `git status` already shows uncommitted Organization files.
- Auth password reset lifecycle: covered by Task 3 and Task 7.
- Auth email verification lifecycle: covered by Task 4 and Task 7.
- Auth token expiry/clock behavior: covered by Task 2 and Task 5.
- Auth admin status changes: covered by Task 6 and Task 7.
- Google OAuth acceptance: explicitly deferred to a separate plan because it needs OAuth adapter fake design.
- Remaining matrix modules: explicitly deferred to separate per-module or per-cluster plans.

### Placeholder scan

This plan contains concrete paths, commands, code blocks, and expected outcomes. It intentionally avoids placeholder instructions and avoids asking implementers to invent tests without examples.

### Type consistency

- `JwtTokenService(clock: IClock)` is introduced in Task 2 before acceptance tests depend on `TestClock`.
- `app.auth.bearerHeaderFor(...)`, `app.clock.advance(...)`, `app.db.table(...)`, and `app.http.*(...)` are existing `TestApp` APIs.
- Auth token/session assertions use existing table names: `auth_tokens`, `password_reset_tokens`, `email_verification_tokens`, and `users`.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-25-module-test-coverage-matrix.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints.
