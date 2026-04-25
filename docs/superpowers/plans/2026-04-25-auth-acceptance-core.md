# Auth Acceptance Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Acceptance Layer from Credit into Auth core session flows so real HTTP requests, real token revocation, real DI wiring, and real SQLite state are covered by acceptance tests.

**Architecture:**  
Reuse the existing acceptance harness as-is. Auth rollout should stay small and concrete: prefer `app.http` against the real `/api/auth/*` routes, `TestAuth` only when a raw bearer header is needed, and direct DB assertions for revocation/session state. Do not introduce new harness abstractions unless a spec proves the current harness cannot express the behavior.

**Tech Stack:** TypeScript 5.x, Bun runtime, Vitest API on Bun, existing acceptance harness, SQLite + Atlas migrations, existing Auth provider/controller/routes, existing `TestApp` / `TestAuth`.

---

## File Structure

### Existing files to reuse

| Path | Responsibility |
|------|----------------|
| `tests/Acceptance/support/TestApp.ts` | Boots the real app with acceptance SQLite, `app.http`, `app.auth`, and `app.events`. |
| `tests/Acceptance/support/http/TestAuth.ts` | Issues a real JWT through the booted container’s `jwtTokenService`. |
| `tests/Acceptance/support/http/InProcessHttpClient.ts` | Sends real in-process HTTP requests through the app’s middleware stack. |
| `tests/Acceptance/support/seeds/*` | Seed helpers for any Auth user/profile rows needed in setup. |
| `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts` | Auth DI wiring and route registration entrypoint. |
| `src/Modules/Auth/Presentation/Routes/auth.routes.ts` | API Auth route surface to cover. |
| `src/Modules/Auth/Presentation/Controllers/AuthController.ts` | Current Auth HTTP behavior and response codes. |
| `src/Modules/Auth/Domain/Repositories/IAuthTokenRepository.ts` | Token revocation/session inspection surface for DB assertions. |
| `src/Modules/Auth/Infrastructure/Repositories/AuthTokenRepository.ts` | Concrete revocation behavior used by acceptance assertions. |
| `src/Modules/Profile/Infrastructure/Repositories/UserProfileRepository.ts` | Profile row assertion target for registration side effects. |

### New files to create

| Path | Responsibility |
|------|----------------|
| `tests/Acceptance/UseCases/Auth/session-lifecycle.spec.ts` | Register → login → sessions → refresh happy path with real token + profile side-effect assertions. |
| `tests/Acceptance/UseCases/Auth/logout-revocation.spec.ts` | Logout and logout-all revocation behavior with DB assertions. |
| `tests/Acceptance/ApiContract/auth-endpoints.spec.ts` | HTTP contract coverage for auth endpoints: happy path, auth failure, validation failure. |

### Files that should remain untouched in this rollout

| Path | Reason |
|------|--------|
| `tests/Acceptance/support/TestApp.ts` | Already provides the needed harness surface. |
| `tests/Acceptance/support/http/TestAuth.ts` | Already provides bearer header helpers. |
| `src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts` | Keep as a bridge until Auth acceptance proves coverage parity. |
| `tests/Feature/api-spec.e2e.ts` | Keep until acceptance coverage is stable enough to judge duplication. |
| `tests/Feature/api-flows.e2e.ts` | Same reason. |

---

## Requirements Summary

The core Auth slice should verify these behaviors with real app boot, real HTTP, and real DB:

1. User registration returns success, persists the user, and dispatches `auth.user_registered`.
2. Registration side effects still create a profile row through the real event handler.
3. Login returns both access and refresh tokens and creates token records.
4. `GET /api/auth/sessions` lists the current access token as current when called with the real login token.
5. `POST /api/auth/refresh` returns a fresh access token for a valid refresh token.
6. `POST /api/auth/logout` revokes only the current token, and subsequent authenticated calls with that token fail.
7. `POST /api/auth/logout-all` revokes every active token for the user.
8. Auth API contract tests cover success, unauthorized, and validation-failure cases.
9. Existing Auth unit tests continue to pass after the new acceptance files land.

Non-goals for this plan:
- Do not add recovery/password-reset/email-verification/OAuth acceptance yet.
- Do not replace Playwright or delete legacy Auth tests yet.
- Do not add new fake infrastructure unless a core session test proves it is necessary.

---

## Task 1: Freeze current Auth behavior before writing acceptance specs

**Files:**
- Read: `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`
- Read: `src/Modules/Auth/Presentation/Routes/auth.routes.ts`
- Read: `src/Modules/Auth/Presentation/Controllers/AuthController.ts`
- Read: `src/Modules/Auth/Infrastructure/Repositories/AuthTokenRepository.ts`
- Read: `src/Modules/Profile/Infrastructure/Repositories/UserProfileRepository.ts`
- Read: `tests/Acceptance/support/TestApp.ts`
- Read: `tests/Acceptance/support/http/TestAuth.ts`
- Read: `tests/Acceptance/support/http/InProcessHttpClient.ts`
- Read: `src/Modules/Auth/__tests__/LoginUserService.test.ts`
- Read: `src/Modules/Auth/__tests__/RefreshTokenService.test.ts`
- Read: `src/Modules/Auth/__tests__/ListSessionsService.test.ts`
- Read: `src/Modules/Auth/__tests__/RegisterUserService.test.ts`

**Why:** lock the current response codes and token semantics before adding acceptance coverage, so the new specs are written against the real behavior instead of assumptions.

- [ ] **Step 1: Run the existing Auth service tests and the existing acceptance helper tests**

Run:
```bash
bun test src/Modules/Auth/__tests__/LoginUserService.test.ts \
  src/Modules/Auth/__tests__/RefreshTokenService.test.ts \
  src/Modules/Auth/__tests__/ListSessionsService.test.ts \
  src/Modules/Auth/__tests__/RegisterUserService.test.ts \
  tests/Acceptance/support/__tests__/TestAuth.test.ts \
  tests/Acceptance/support/__tests__/InProcessHttpClient.test.ts
```

Expected:
- All tests pass.
- `TestAuth` continues to sign real tokens.
- `InProcessHttpClient` continues to traverse the real middleware stack.

- [ ] **Step 2: Record the actual Auth HTTP status codes from the controller paths**

Use the route/controller source to confirm and document these values in the plan while implementing:
- `POST /api/auth/register` success → `201`
- `POST /api/auth/login` success → `200`
- `POST /api/auth/refresh` success → `200`
- `POST /api/auth/logout` success → `200`
- `GET /api/auth/sessions` success → `200`
- `POST /api/auth/logout-all` success → `200`
- missing auth on protected routes → `401` with `UNAUTHORIZED`
- invalid refresh token → `401` with `INVALID_REFRESH_TOKEN`
- invalid login credentials → `401` with `INVALID_CREDENTIALS`

Do not change code in this task.

- [ ] **Step 3: Commit the baseline audit notes if you recorded any local markdown notes while implementing**

If the engineer adds a note file during the audit, commit it immediately. Otherwise, do not create a no-op commit.

---

## Task 2: Create the Auth session lifecycle acceptance spec

**Files:**
- Create: `tests/Acceptance/UseCases/Auth/session-lifecycle.spec.ts`

**Why:** cover the highest-signal happy path first: registration, login, session listing, and refresh, with real DB evidence that registration created both the user and the downstream profile row.

- [ ] **Step 1: Write the failing acceptance spec**

Create `tests/Acceptance/UseCases/Auth/session-lifecycle.spec.ts` with this shape:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

describe('Auth session lifecycle', () => {
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

  it('registers a user, creates a profile, logs in, lists the current session, and refreshes the token', async () => {
    const email = 'auth-core@example.test'
    const password = 'SecurePass123'

    const registerRes = await app.http.post('/api/auth/register', {
      body: { email, password },
    })
    expect(registerRes.status).toBe(201)

    const registerJson = (await registerRes.json()) as {
      success: boolean
      data?: { id: string; email: string; role: string }
    }
    expect(registerJson.success).toBe(true)
    expect(registerJson.data?.email).toBe(email)
    expect(registerJson.data?.role).toBe('member')

    const userId = registerJson.data?.id as string
    const profileRow = await app.db.table('user_profiles').where('user_id', '=', userId).first()
    expect(profileRow).toBeTruthy()

    const eventTypes = app.events.map((event) => event.eventType)
    expect(eventTypes).toContain('auth.user_registered')

    const loginRes = await app.http.post('/api/auth/login', {
      body: { email, password },
    })
    expect(loginRes.status).toBe(200)

    const loginJson = (await loginRes.json()) as {
      success: boolean
      data?: {
        accessToken: string
        refreshToken: string
        user: { id: string; email: string; role: string }
      }
    }
    expect(loginJson.success).toBe(true)
    expect(loginJson.data?.user.id).toBe(userId)

    const accessToken = loginJson.data?.accessToken as string
    const refreshToken = loginJson.data?.refreshToken as string

    const sessionsRes = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(sessionsRes.status).toBe(200)

    const sessionsJson = (await sessionsRes.json()) as {
      success: boolean
      sessions: Array<{ id: string; type: 'access'; isCurrent: boolean }>
    }
    expect(sessionsJson.success).toBe(true)
    expect(sessionsJson.sessions.length).toBeGreaterThan(0)
    expect(sessionsJson.sessions.some((session) => session.isCurrent)).toBe(true)

    const refreshRes = await app.http.post('/api/auth/refresh', {
      body: { refreshToken },
    })
    expect(refreshRes.status).toBe(200)

    const refreshJson = (await refreshRes.json()) as {
      success: boolean
      data?: { accessToken: string; expiresIn: number }
    }
    expect(refreshJson.success).toBe(true)
    expect(refreshJson.data?.accessToken).toBeTruthy()
    expect(refreshJson.data?.expiresIn).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run the spec and verify it fails for the right reason**

Run:
```bash
bun test tests/Acceptance/UseCases/Auth/session-lifecycle.spec.ts --reporter=dot
```

Expected:
- The file exists and loads.
- The first run fails on the missing implementation or on a behavior mismatch that reveals the actual Auth semantics.
- Do not change unrelated files in response to this first failure.

- [ ] **Step 3: Implement the smallest changes needed only if the spec reveals a real Auth acceptance gap**

If the test fails because the current harness cannot see the profile row or the event, fix the harness only in the smallest possible way. If the test fails because the Auth behavior itself differs from the intended acceptance contract, change the acceptance expectation only after confirming the behavior is deliberate.

- [ ] **Step 4: Re-run the spec until it passes**

Run:
```bash
bun test tests/Acceptance/UseCases/Auth/session-lifecycle.spec.ts --reporter=dot
```

Expected:
- PASS
- The output proves the real registration/login/session/refresh flow works through the container.

- [ ] **Step 5: Commit**

Run:
```bash
git add tests/Acceptance/UseCases/Auth/session-lifecycle.spec.ts
git commit -m "test: [auth] add session lifecycle acceptance coverage"
```

---

## Task 3: Create the Auth revocation acceptance spec

**Files:**
- Create: `tests/Acceptance/UseCases/Auth/logout-revocation.spec.ts`

**Why:** verify the session invalidation behavior with real token records, not just controller responses.

- [ ] **Step 1: Write the failing acceptance spec**

Create `tests/Acceptance/UseCases/Auth/logout-revocation.spec.ts` with this shape:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

describe('Auth logout revocation', () => {
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

  it('logout revokes only the current token and makes the protected route reject that token', async () => {
    const email = 'auth-logout@example.test'
    const password = 'SecurePass123'

    await app.http.post('/api/auth/register', { body: { email, password } })
    const loginRes = await app.http.post('/api/auth/login', {
      body: { email, password },
    })
    const loginJson = (await loginRes.json()) as {
      data?: { accessToken: string; refreshToken: string; user: { id: string } }
    }
    const accessToken = loginJson.data?.accessToken as string

    const logoutRes = await app.http.post('/api/auth/logout', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(logoutRes.status).toBe(200)

    const revokedSessionsRes = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(revokedSessionsRes.status).toBe(401)
    const revokedJson = (await revokedSessionsRes.json()) as { error?: string }
    expect(revokedJson.error).toBe('UNAUTHORIZED')

    const authTokenRepository = app.container.make('authTokenRepository') as {
      findRevokedByUserId(userId: string): Promise<Array<{ revokedAt?: Date }>>
    }
    const revokedRows = await authTokenRepository.findRevokedByUserId(
      loginJson.data?.user.id as string,
    )
    expect(revokedRows.length).toBeGreaterThan(0)
  })

  it('logout-all revokes every active token for the same user', async () => {
    const email = 'auth-logout-all@example.test'
    const password = 'SecurePass123'

    await app.http.post('/api/auth/register', { body: { email, password } })

    const firstLoginRes = await app.http.post('/api/auth/login', { body: { email, password } })
    const firstLoginJson = (await firstLoginRes.json()) as {
      data?: { accessToken: string; refreshToken: string; user: { id: string } }
    }

    const secondLoginRes = await app.http.post('/api/auth/login', { body: { email, password } })
    const secondLoginJson = (await secondLoginRes.json()) as {
      data?: { accessToken: string; refreshToken: string; user: { id: string } }
    }

    const logoutAllRes = await app.http.post('/api/auth/logout-all', {
      headers: { Authorization: `Bearer ${firstLoginJson.data?.accessToken as string}` },
    })
    expect(logoutAllRes.status).toBe(200)

    const revokedCheckOne = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${firstLoginJson.data?.accessToken as string}` },
    })
    const revokedCheckTwo = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${secondLoginJson.data?.accessToken as string}` },
    })
    expect(revokedCheckOne.status).toBe(401)
    expect(revokedCheckTwo.status).toBe(401)

    const authTokenRepository = app.container.make('authTokenRepository') as {
      findRevokedByUserId(userId: string): Promise<Array<{ revokedAt?: Date }>>
    }
    const revokedRows = await authTokenRepository.findRevokedByUserId(
      firstLoginJson.data?.user.id as string,
    )
    expect(revokedRows.length).toBe(4)
  })
})
```

- [ ] **Step 2: Run the spec and verify the current behavior**

Run:
```bash
bun test tests/Acceptance/UseCases/Auth/logout-revocation.spec.ts --reporter=dot
```

Expected:
- The `logout` scenario proves a single token is revoked.
- The `logout-all` scenario proves all active tokens for the user are revoked.
- If the `findRevokedByUserId` count does not match 4 after two logins, update the assertion to match the actual token issuance behavior only after confirming the real login flow.

- [ ] **Step 3: Implement the smallest fix if the acceptance spec exposes a genuine revocation gap**

Do not add new abstractions. If the route already behaves correctly, keep the spec. If the route or repository behavior is wrong, fix the route/repository in place.

- [ ] **Step 4: Re-run the spec until it passes**

Run:
```bash
bun test tests/Acceptance/UseCases/Auth/logout-revocation.spec.ts --reporter=dot
```

Expected:
- PASS
- The revoked-token behavior is observable through both HTTP failure and token repository state.

- [ ] **Step 5: Commit**

Run:
```bash
git add tests/Acceptance/UseCases/Auth/logout-revocation.spec.ts
git commit -m "test: [auth] add logout revocation acceptance coverage"
```

---

## Task 4: Create the Auth API contract acceptance spec

**Files:**
- Create: `tests/Acceptance/ApiContract/auth-endpoints.spec.ts`

**Why:** pin the HTTP contract for the core auth endpoints with one small, readable spec file instead of scattering route assertions across many tests.

- [ ] **Step 1: Write the failing contract spec**

Create `tests/Acceptance/ApiContract/auth-endpoints.spec.ts` with this shape:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../support/TestApp'

describe('Auth API contract', () => {
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

  it('POST /api/auth/register accepts a valid payload and rejects invalid payloads', async () => {
    const happy = await app.http.post('/api/auth/register', {
      body: { email: 'contract-register@example.test', password: 'SecurePass123' },
    })
    expect(happy.status).toBe(201)

    const invalid = await app.http.post('/api/auth/register', {
      body: { email: 'not-an-email', password: 'short' },
    })
    expect(invalid.status).toBe(422)
    const invalidJson = (await invalid.json()) as {
      success?: boolean
      error?: { code?: string; details?: Array<{ message?: string }> }
    }
    expect(invalidJson.success).toBe(false)
    expect(invalidJson.error?.code).toBe('VALIDATION_ERROR')
  })

  it('POST /api/auth/login accepts credentials and rejects invalid credentials', async () => {
    const email = 'contract-login@example.test'
    const password = 'SecurePass123'
    await app.http.post('/api/auth/register', {
      body: { email, password },
    })

    const happy = await app.http.post('/api/auth/login', {
      body: { email, password },
    })
    expect(happy.status).toBe(200)

    const invalid = await app.http.post('/api/auth/login', {
      body: { email, password: 'WrongPass123' },
    })
    expect(invalid.status).toBe(401)
    const invalidJson = (await invalid.json()) as { error?: string }
    expect(invalidJson.error).toBe('INVALID_CREDENTIALS')
  })

  it('POST /api/auth/refresh, POST /api/auth/logout, GET /api/auth/sessions, and POST /api/auth/logout-all obey the contract', async () => {
    const email = 'contract-session@example.test'
    const password = 'SecurePass123'
    await app.http.post('/api/auth/register', { body: { email, password } })

    const loginRes = await app.http.post('/api/auth/login', { body: { email, password } })
    const loginJson = (await loginRes.json()) as {
      data?: { accessToken: string; refreshToken: string; user: { id: string } }
    }
    const accessToken = loginJson.data?.accessToken as string
    const refreshToken = loginJson.data?.refreshToken as string

    const refreshHappy = await app.http.post('/api/auth/refresh', {
      body: { refreshToken },
    })
    expect(refreshHappy.status).toBe(200)

    const logoutUnauthorized = await app.http.post('/api/auth/logout')
    expect(logoutUnauthorized.status).toBe(401)

    const sessionsHappy = await app.http.get('/api/auth/sessions', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(sessionsHappy.status).toBe(200)

    const logoutAllUnauthorized = await app.http.post('/api/auth/logout-all')
    expect(logoutAllUnauthorized.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run the contract spec and lock the actual response payloads**

Run:
```bash
bun test tests/Acceptance/ApiContract/auth-endpoints.spec.ts --reporter=dot
```

Expected:
- The happy-path cases pass with the real HTTP stack.
- Validation failures use the codebase’s real 422 validation payload.
- Unauthorized cases return 401 and `UNAUTHORIZED`.

- [ ] **Step 3: Adjust only the assertions if a route’s real contract differs from the intended one**

If the route semantics differ from the ideal contract, keep the test aligned to the actual controller behavior and note the divergence before making any code change.

- [ ] **Step 4: Re-run the contract spec until it passes**

Run:
```bash
bun test tests/Acceptance/ApiContract/auth-endpoints.spec.ts --reporter=dot
```

Expected:
- PASS

- [ ] **Step 5: Commit**

Run:
```bash
git add tests/Acceptance/ApiContract/auth-endpoints.spec.ts
git commit -m "test: [auth] add auth API contract acceptance coverage"
```

---

## Task 5: Verify the whole acceptance slice and decide what stays legacy

**Files:**
- `tests/Acceptance/UseCases/Auth/session-lifecycle.spec.ts`
- `tests/Acceptance/UseCases/Auth/logout-revocation.spec.ts`
- `tests/Acceptance/ApiContract/auth-endpoints.spec.ts`
- `src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts`
- `tests/Feature/api-spec.e2e.ts`
- `tests/Feature/api-flows.e2e.ts`

**Why:** confirm the new Auth acceptance slice is stable before considering any legacy test cleanup.

- [ ] **Step 1: Run the Auth acceptance directory**

Run:
```bash
bun test tests/Acceptance/UseCases/Auth tests/Acceptance/ApiContract/auth-endpoints.spec.ts --reporter=dot
```

Expected:
- PASS
- The output shows registration, login, sessions, refresh, logout, and logout-all all execute through the real app.

- [ ] **Step 2: Run the full acceptance suite**

Run:
```bash
bun run test:acceptance
```

Expected:
- PASS
- Credit acceptance still passes alongside Auth acceptance.

- [ ] **Step 3: Run the Auth-specific legacy suite to judge overlap**

Run:
```bash
bun test src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts
```

Expected:
- PASS
- If the legacy E2E adds no coverage beyond the new acceptance files, flag it as a future cleanup candidate but do not delete it in this rollout.

- [ ] **Step 4: Run the repo-wide check once more**

Run:
```bash
bun run check
```

Expected:
- PASS
- Auth acceptance is now part of the standard verification path.

- [ ] **Step 5: Commit any final documentation or note updates**

Only commit if the engineer added a real note or documentation file. Otherwise, finish with the verified code changes already committed in the task-level commits.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Auth acceptance drifts into recovery/OAuth scope | Keep this plan limited to core session flows only; split recovery/OAuth into a separate plan later. |
| Validation payload assertions differ from the real FormRequest middleware | Run the failing contract spec first and pin the actual 422 response shape before changing code. |
| `logout-all` revocation count is different from the expected 4 rows after two logins | Use the repo’s actual token issuance behavior, but keep the DB assertion that all active tokens are revoked. |
| The new acceptance tests duplicate too much of `tests/Feature/*` | Keep legacy tests for now; decide on shrinkage only after the Auth acceptance slice is stable. |
| A helper method or route behaves differently in production than in acceptance | Prefer real HTTP and real repository assertions so the mismatch is visible immediately. |

---

## Verification Steps

1. `bun test src/Modules/Auth/__tests__/LoginUserService.test.ts src/Modules/Auth/__tests__/RefreshTokenService.test.ts src/Modules/Auth/__tests__/ListSessionsService.test.ts src/Modules/Auth/__tests__/RegisterUserService.test.ts`
2. `bun test tests/Acceptance/support/__tests__/TestAuth.test.ts tests/Acceptance/support/__tests__/InProcessHttpClient.test.ts`
3. `bun test tests/Acceptance/UseCases/Auth/session-lifecycle.spec.ts --reporter=dot`
4. `bun test tests/Acceptance/UseCases/Auth/logout-revocation.spec.ts --reporter=dot`
5. `bun test tests/Acceptance/ApiContract/auth-endpoints.spec.ts --reporter=dot`
6. `bun test tests/Acceptance/UseCases/Auth tests/Acceptance/ApiContract/auth-endpoints.spec.ts --reporter=dot`
7. `bun run test:acceptance`
8. `bun test src/Modules/Auth/__tests__/AuthFlow.e2e.test.ts`
9. `bun run check`

Every run should be repeated until it passes. Do not claim the rollout is complete until the acceptance suite and repo-wide check are green together.

---

## Self-Review

### 1. Spec coverage

- Authentication registration/login/session flow → Task 2
- Token revocation and logout-all behavior → Task 3
- HTTP contract validation for auth endpoints → Task 4
- Baseline behavior locking and status code discovery → Task 1
- Whole-suite verification and legacy overlap judgment → Task 5

### 2. Placeholder scan

Checked for:
- `TBD`
- `TODO`
- `implement later`
- `fill in details`
- vague test directions without commands

None remain in the plan.

### 3. Type consistency

Confirmed that these names stay consistent throughout the plan:
- `TestApp.boot()`
- `app.http.get/post(...)`
- `app.auth.bearerHeaderFor(...)`
- `authTokenRepository.findRevokedByUserId(...)`
- `user_profiles`
- `auth.user_registered`

---

## Follow-up Scope

This plan intentionally excludes:
- Forgot-password / reset-password / email-verification
- Google OAuth
- Verify-device flows
- Any new mail or OAuth fake infrastructure

Those should be written as a separate Auth follow-on plan after the core session slice proves stable.
