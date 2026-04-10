# Phase 6: 補完 Pages 頁面模組功能實作 - Research

**Researched:** 2026-04-10
**Domain:** Inertia server-side page layer (`src/Pages`), unit test coverage, route existence verification
**Confidence:** HIGH

## Summary

The `src/Pages` module already exists and is structurally complete. It implements a hand-rolled server-side Inertia protocol adapter that serves 12 admin pages and 7 member pages via DI-resolved page classes. The module is registered in `bootstrap.ts` and all routes are mounted in `routes.ts`. The infrastructure (InertiaService, ViteTagHelper, withInertiaPageHandler, requireAdmin/requireMember helpers) is tested.

The "completion" work for Phase 6 falls into three distinct gaps: (1) **no unit tests for the 19 page handler classes** — only `InertiaService` and `ViteTagHelper` have tests; (2) **the Inertia page routes (`/admin/*`, `/member/*`) are absent from `routes-existence.test.ts`** — the feature test suite exercises zero page routes; (3) there is a known **placeholder page** (`AdminUsageSyncPage`) that returns static data with an explicit comment saying "Phase 4 UsageSync 待完成."

Phase 6's goal is therefore: add unit tests for page handler classes, add page routes to the routes-existence test, and assess whether any handler logic needs to be hardened (e.g., the UsageSync placeholder).

**Primary recommendation:** Write unit tests for all page handler classes using the existing `IHttpContext` mock pattern from `InertiaService.test.ts`, then extend `routes-existence.test.ts` with `/admin/*` and `/member/*` coverage. Do not refactor InertiaService or change route registration — the architecture is correct and complete.

## Project Constraints (from CLAUDE.md)

There is no CONTEXT.md for Phase 6 (no prior `/gsd:discuss-phase` run). Constraints come from project documentation.

### From AGENTS.md / docs/draupnir/ rules

- **No new dependencies** without explicit justification — the milestone constraint ("No new deps") from prior phases still applies to this scope.
- **Routes unchanged** — HTTP routes registered must not change shape; this phase adds tests for existing routes.
- **Immutability** — all code must follow immutable patterns (`readonly`, no mutation).
- **TypeScript strict** — no new `any`, no `@ts-ignore`.
- **Biome** — lint and format must pass (`bun run lint`).
- **Test coverage** — 80%+ minimum; new code requires tests.
- **JSDoc** — page classes are Presentation; require class-level + per-handler `@param ctx` / `@returns` in English.
- **Language policy** —繁體中文 for commit messages, natural text; English for JSDoc in `src/`.

### From CONCERNS.md

- Items #1, #2, #3 are resolved. This phase must not re-introduce BifrostClient imports into Modules.
- Item #4 (Prisma adapter) — out of scope for Phase 6.

---

## Standard Stack

### Core (already in use — no installation needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `bun:test` | built-in | Test runner | Project-wide; no Jest/Vitest |
| `@gravito/core` | workspace | DI container, HTTP routing | Project framework |
| `@gravito/prism` | workspace | Template rendering orbit | Registered in bootstrap |

### Supporting (already in use)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `IHttpContext` mock pattern | — | Simulate requests in unit tests | All page handler tests |
| `InertiaService` | local | Render Inertia responses | Inject into page classes for testing |

### Installation

No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/Pages/
├── Admin/
│   ├── helpers/requireAdmin.ts
│   └── Admin*Page.ts             # 12 page classes (all exist)
├── Member/
│   ├── helpers/requireMember.ts
│   └── Member*Page.ts            # 7 page classes + 1 handler (all exist)
├── __tests__/
│   ├── InertiaService.test.ts    ← EXISTS
│   ├── ViteTagHelper.test.ts     ← EXISTS
│   ├── Admin/                    ← MISSING - needs creation
│   │   └── Admin*Page.test.ts
│   └── Member/                   ← MISSING - needs creation
│       └── Member*Page.test.ts
├── InertiaService.ts
├── SharedDataMiddleware.ts
├── ViteTagHelper.ts
├── Infrastructure/Providers/PagesServiceProvider.ts
├── page-routes.ts
├── pageContainerKeys.ts
└── routing/
    ├── admin/
    ├── member/
    ├── bindPageAction.ts
    ├── inertiaFactory.ts
    ├── pathUtils.ts
    ├── registerAdminPageRoutes.ts
    ├── registerMemberPageRoutes.ts
    ├── registerPageStaticRoutes.ts
    └── withInertiaPage.ts
```

### Pattern 1: IHttpContext Mock for Page Handler Tests

The `InertiaService.test.ts` already establishes the factory pattern. All page tests use the same pattern extended with query/param/header support.

```typescript
// Source: src/Pages/__tests__/InertiaService.test.ts (adapted for page tests)
import { describe, expect, test, mock } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/admin/dashboard',
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: (data: unknown, statusCode?: number) =>
      Response.json(data, { status: statusCode ?? 200 }),
    text: (content: string, statusCode?: number) =>
      new Response(content, { status: statusCode ?? 200 }),
    redirect: (url: string, statusCode?: number) =>
      Response.redirect(url, statusCode ?? 302),
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => { store.set(key, value) },
    ...overrides,
  }
}

// Mock InertiaService to capture what component + props were rendered
function createMockInertia(): { inertia: InertiaService; lastCall: { component: string; props: Record<string, unknown> } | null } {
  const state = { lastCall: null as { component: string; props: Record<string, unknown> } | null }
  const inertia = {
    render: (ctx: IHttpContext, component: string, props: Record<string, unknown>) => {
      state.lastCall = { component, props }
      return new Response(JSON.stringify({ component, props }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }
  } as unknown as InertiaService
  return { inertia, state }
}
```

### Pattern 2: Auth Context Injection for requireAdmin/requireMember

Page handlers call `AuthMiddleware.getAuthContext(ctx)`. Tests must supply this via `ctx.get('auth')` (confirmed from `AuthMiddleware.ts` line 77: `ctx.set('auth', authContext)`).

```typescript
// Authenticated admin context
const ctx = createMockContext({
  get: <T>(key: string) => {
    if (key === 'auth') {
      return { userId: 'admin-1', email: 'admin@test.com', role: 'admin' } as T
    }
    return undefined
  }
})
```

### Pattern 3: Testing Unauthenticated Paths

```typescript
// Unauthenticated — get() returns undefined for 'auth'
const ctx = createMockContext()  // no auth in store
const page = new AdminDashboardPage(mockInertia, mockListUsers, mockListOrgs, mockContracts)
const response = await page.handle(ctx)
// Expect redirect to /login
expect(response.status).toBe(302)
```

### Anti-Patterns to Avoid

- **Never import BifrostClient into page tests** — mock service dependencies directly.
- **Never call `new AdminXxxPage()` in route files** — DI binding pattern is enforced; tests should test page classes directly.
- **Never assert on HTML body of Inertia responses in page tests** — mock InertiaService and assert on `component` and `props` instead. Integration-level HTML structure is covered by InertiaService.test.ts.

---

## What "Completing" the Pages Module Means

Based on investigation, the following gaps exist:

### Gap 1: No unit tests for page handler classes (19 files)

**Admin pages missing tests (12):**
- `AdminDashboardPage` — `handle`
- `AdminUsersPage` — `handle`
- `AdminUserDetailPage` — `handle`, `postStatus`
- `AdminOrganizationsPage` — `handle`
- `AdminOrganizationDetailPage` — `handle`
- `AdminContractsPage` — `handle`
- `AdminContractCreatePage` — `handle`, `store`
- `AdminContractDetailPage` — `handle`, `postAction`
- `AdminModulesPage` — `handle`
- `AdminModuleCreatePage` — `handle`, `store`
- `AdminApiKeysPage` — `handle`
- `AdminUsageSyncPage` — `handle`

**Member pages missing tests (7 + 1 handler):**
- `MemberDashboardPage` — `handle`
- `MemberApiKeysPage` — `handle`
- `MemberApiKeyCreatePage` — `handle`, `store`
- `MemberApiKeyRevokeHandler` — `handle`
- `MemberUsagePage` — `handle`
- `MemberContractsPage` — `handle`
- `MemberSettingsPage` — `handle`, `update`

### Gap 2: Page routes absent from routes-existence.test.ts

`tests/Feature/routes-existence.test.ts` covers all API modules but has **zero coverage of Inertia page routes**. The following routes need existence assertions added:

**Admin routes (16 routes):**
```
GET  /admin/dashboard
GET  /admin/users
GET  /admin/users/:id
POST /admin/users/:id/status
GET  /admin/organizations
GET  /admin/organizations/:id
GET  /admin/contracts
GET  /admin/contracts/create
POST /admin/contracts
GET  /admin/contracts/:id
POST /admin/contracts/:id/action
GET  /admin/modules
GET  /admin/modules/create
POST /admin/modules
GET  /admin/api-keys
GET  /admin/usage-sync
```

**Member routes (9 routes):**
```
GET  /member/dashboard
GET  /member/api-keys
GET  /member/api-keys/create
POST /member/api-keys
POST /member/api-keys/:keyId/revoke
GET  /member/usage
GET  /member/contracts
GET  /member/settings
PUT  /member/settings
```

### Gap 3: AdminUsageSyncPage placeholder

`AdminUsageSyncPage` is explicitly documented as a placeholder returning static data. The comment says "Phase 4 UsageSync 待完成." Phase 4 (SDK Extraction) is now complete. The planner needs to decide if UsageSync is still deferred or if Phase 6 should wire up a real implementation. Based on REQUIREMENTS.md, UsageSync is not part of the v1 requirements — the placeholder behavior is intentional and should remain with a test confirming its static behavior.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth context in tests | Custom auth middleware mock | `ctx.get('auth')` set directly | AuthMiddleware.getAuthContext reads from ctx store |
| HTTP response assertions | Parse HTML body | Assert on mock InertiaService capture | InertiaService rendering is already tested separately |
| Service mocks | Complex factory | Direct `{ execute: mock(() => ...) }` object | Page classes accept interfaces, not concrete types |

---

## Common Pitfalls

### Pitfall 1: AuthMiddleware Key Name

**What goes wrong:** Test sets auth data under wrong ctx store key; requireAdmin/requireMember always returns unauthenticated.
**Why it happens:** The key `AuthMiddleware.getAuthContext(ctx)` reads is internal — must trace from `AuthMiddleware` source.
**How to avoid:** Check `src/Shared/Infrastructure/Middleware/AuthMiddleware.ts` for the exact key name before writing tests.
**Warning signs:** All auth-guarded pages redirect to `/login` even when auth is injected.

```typescript
// Confirmed from AuthMiddleware.ts line 77: ctx.set('auth', authContext)
ctx.get('auth')
```

### Pitfall 2: Service mock shape must match interface

**What goes wrong:** Mocked service returns `undefined` instead of `{ success: false, message: '...' }`, causing pages to throw on destructuring.
**Why it happens:** Page handlers expect the Application layer's `{ success, data, message }` envelope.
**How to avoid:** Always return the full response envelope from mock services.

```typescript
// Correct mock shape
const mockListService = {
  execute: mock(() => Promise.resolve({ success: true, data: { keys: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } } }))
}
```

### Pitfall 3: routes-existence test uses `TestClient` with live server

**What goes wrong:** Routes-existence tests start a real Bun HTTP server via `setupTestServer()` — test setup requires `warmInertiaService()` which reads from filesystem (Vite manifest or template file).
**Why it happens:** `inertiaFactory.ts` reads `src/views/app.html` and optionally `public/build/.vite/manifest.json`.
**How to avoid:** Confirm test server setup does `warmInertiaService()` before asserting on page routes. Check `tests/Feature/lib/test-server.ts` to verify this is called.
**Warning signs:** 500 errors from page routes in test suite.

### Pitfall 4: Static paths must precede dynamic paths

**What goes wrong:** Adding `/admin/contracts/create` AFTER `/admin/contracts/:id` causes create to be matched as `:id = 'create'`.
**Why it happens:** Route ordering in `registerAdminPageRoutes.ts` — already correct in existing code, but any additions must maintain this order.
**How to avoid:** Always add static-path routes BEFORE `/:id` segments in the route table.

### Pitfall 5: Inertia version mismatch in routes-existence

**What goes wrong:** Full-page Inertia responses get 409 in test if the client sends an `X-Inertia-Version` header with a wrong version.
**Why it happens:** `InertiaService.render` returns 409 when client version != server version.
**How to avoid:** Don't send `X-Inertia-Version` header in routes-existence tests (only checking existence = non-404). Unauthenticated requests return 302/403 before reaching Inertia render.

---

## Code Examples

### Checking AuthMiddleware key name

```typescript
// Source: verify by reading src/Shared/Infrastructure/Middleware/AuthMiddleware.ts
// The auth context is stored via ctx.set() in the middleware
// and retrieved via AuthMiddleware.getAuthContext(ctx) which calls ctx.get(SOME_KEY)
```

### Minimal page test structure

```typescript
// Source: pattern derived from src/Pages/__tests__/InertiaService.test.ts
import { describe, expect, test, mock } from 'bun:test'
import { AdminUsersPage } from '../Admin/AdminUsersPage'

describe('AdminUsersPage', () => {
  test('未登入時重導向至 /login', async () => {
    // No auth in context store
    const ctx = createMockContext()
    const page = new AdminUsersPage(mockInertia, mockListUsersService)
    const response = await page.handle(ctx)
    expect(response.status).toBe(302)
  })

  test('非 admin 時回傳 403', async () => {
    const ctx = createMockContextWithRole('member')
    const page = new AdminUsersPage(mockInertia, mockListUsersService)
    const response = await page.handle(ctx)
    expect(response.status).toBe(403)
  })

  test('handle 回傳 Admin/Users/Index 頁面', async () => {
    const ctx = createMockContextWithRole('admin')
    mockListUsersService.execute.mockResolvedValue({
      success: true,
      data: { users: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }
    })
    const { inertia, state } = createMockInertia()
    const page = new AdminUsersPage(inertia, mockListUsersService)
    await page.handle(ctx)
    expect(state.lastCall?.component).toBe('Admin/Users/Index')
  })
})
```

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase is code and tests only, using existing Bun test infrastructure).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bun:test (built-in to Bun 1.3.10) |
| Config file | `bunfig.toml` (if exists) or implicit |
| Quick run command | `bun test src/Pages` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAGE-01 | Admin page handlers return correct Inertia component | unit | `bun test src/Pages/__tests__/Admin` | ❌ Wave 0 |
| PAGE-02 | Member page handlers return correct Inertia component | unit | `bun test src/Pages/__tests__/Member` | ❌ Wave 0 |
| PAGE-03 | Unauthenticated requests redirect to /login | unit | `bun test src/Pages` | ❌ Wave 0 |
| PAGE-04 | Non-admin requests to admin pages return 403 | unit | `bun test src/Pages` | ❌ Wave 0 |
| PAGE-05 | All page routes exist (non-404) | integration | `bun test tests/Feature/routes-existence.test.ts` | ✅ (test file exists; needs new cases) |
| PAGE-06 | POST handlers process body and redirect/re-render correctly | unit | `bun test src/Pages` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `bun test src/Pages`
- **Per wave merge:** `bun test`
- **Phase gate:** `bun run check` (typecheck + lint + full suite) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/Pages/__tests__/Admin/AdminDashboardPage.test.ts`
- [ ] `src/Pages/__tests__/Admin/AdminUsersPage.test.ts`
- [ ] `src/Pages/__tests__/Admin/AdminUserDetailPage.test.ts`
- [ ] `src/Pages/__tests__/Admin/AdminOrganizationsPage.test.ts`
- [ ] `src/Pages/__tests__/Admin/AdminOrganizationDetailPage.test.ts`
- [ ] `src/Pages/__tests__/Admin/AdminContractsPage.test.ts`
- [ ] `src/Pages/__tests__/Admin/AdminContractCreatePage.test.ts`
- [ ] `src/Pages/__tests__/Admin/AdminContractDetailPage.test.ts`
- [ ] `src/Pages/__tests__/Admin/AdminModulesPage.test.ts`
- [ ] `src/Pages/__tests__/Admin/AdminModuleCreatePage.test.ts`
- [ ] `src/Pages/__tests__/Admin/AdminApiKeysPage.test.ts`
- [ ] `src/Pages/__tests__/Admin/AdminUsageSyncPage.test.ts`
- [ ] `src/Pages/__tests__/Member/MemberDashboardPage.test.ts`
- [ ] `src/Pages/__tests__/Member/MemberApiKeysPage.test.ts`
- [ ] `src/Pages/__tests__/Member/MemberApiKeyCreatePage.test.ts`
- [ ] `src/Pages/__tests__/Member/MemberApiKeyRevokeHandler.test.ts`
- [ ] `src/Pages/__tests__/Member/MemberUsagePage.test.ts`
- [ ] `src/Pages/__tests__/Member/MemberContractsPage.test.ts`
- [ ] `src/Pages/__tests__/Member/MemberSettingsPage.test.ts`
- [ ] `tests/Feature/routes-existence.test.ts` — add admin/member route cases (file exists, needs additions)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No page tests | Unit tests per page class needed | Phase 6 | 80%+ coverage target |
| Routes-existence missing pages | All routes covered | Phase 6 | Quality gate completeness |

**Already current:**
- InertiaService: server-side custom implementation (not using @inertiajs/server) — intentional, no dependencies.
- ViteTagHelper: custom, Bun-native file reads — correct for project stack.

---

## Open Questions

1. **AuthMiddleware key name for test setup** — RESOLVED
   - Confirmed: `AuthMiddleware.ts` line 77 uses `ctx.set('auth', authContext)`. The key is `'auth'`.
   - All plan test helpers use `key === 'auth'` correctly.

2. **Test server setup for routes-existence page route additions**
   - What we know: `setupTestServer()` starts a Bun server; `warmInertiaService()` must run or page routes will 500.
   - What's unclear: Whether `tests/Feature/lib/test-server.ts` already calls `warmInertiaService()`.
   - Recommendation: Read `test-server.ts` before adding page route tests to routes-existence; add `warmInertiaService()` call if missing.

3. **AdminUsageSyncPage — keep placeholder or implement?**
   - What we know: The comment says "Phase 4 UsageSync 待完成" but Phase 4 is now SDK Extraction (complete). UsageSync is not in REQUIREMENTS.md v1.
   - What's unclear: Whether there is a new UsageSync feature spec.
   - Recommendation: Keep the placeholder. Test it verifies the static response shape. No implementation work needed.

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection of `src/Pages/**/*.ts` — all 40 files read.
- `tests/Feature/routes-existence.test.ts` — confirmed no page routes tested.
- `src/Pages/__tests__/` — confirmed only 2 test files exist (InertiaService, ViteTagHelper).
- `docs/draupnir/knowledge/pages-inertia-architecture.md` — official architecture doc.
- `docs/draupnir/knowledge/coding-conventions.md` — coding standards.
- `.planning/REQUIREMENTS.md` — v1 requirements (confirmed no Pages-specific requirements).
- `.planning/ROADMAP.md` — Phase 6 entry confirmed.

### Secondary (MEDIUM confidence)

- `src/bootstrap.ts` + `src/routes.ts` — confirms Pages is fully wired in production path.
- `src/Pages/routing/registerAdminPageRoutes.ts` + `registerMemberPageRoutes.ts` — complete route inventory verified.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all files verified by direct inspection
- Architecture: HIGH — code and documentation align
- Pitfalls: HIGH — auth middleware key is the one unresolved item (open question #1)
- Test gaps: HIGH — verified by listing all test files and comparing to page class inventory

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable codebase, no external dependencies)
