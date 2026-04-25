# Organization Acceptance Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Acceptance Layer 從 Credit/Auth 延伸到 Organization 核心流程，讓真實 HTTP、真實 membership / invitation state、真實 middleware 授權與 provisioning repair 都能在 SQLite acceptance 環境中被驗收。

**Architecture:**
- 以既有 `TestApp` 為主，不新增新的 harness 層；Organization 的關鍵價值在 route 授權、context middleware 與狀態轉移，所以 acceptance 以 `app.http` 為第一入口。
- 資料層直接讀真實 SQLite；對 `organizations`、`organization_members`、`organization_invitations`、`api_keys`、`users` 的結果做 DB assertions。
- `MockGatewayClient` 只用來觀察 provisioning repair 的副作用，不 fake repository、middleware 或 service flow。
- DSL 只在多步驟、跨資料表、同一故事重複出現時才補；若單檔中只出現 1 次，不為了美觀硬抽 helper。

**Tech Stack:** TypeScript 5.x / Bun runtime / Vitest API on Bun / 既有 acceptance harness / SQLite + Atlas migrations / Organization & Auth providers / `MockGatewayClient`。

---

## File Structure

### Existing files to reuse

| Path | Responsibility |
|------|----------------|
| `tests/Acceptance/support/TestApp.ts` | Boots the real app with acceptance SQLite, `app.http`, `app.auth`, `app.seed`, `app.events`, `app.gateway`. |
| `tests/Acceptance/support/http/TestAuth.ts` | Issues bearer tokens directly from the booted `jwtTokenService`. |
| `tests/Acceptance/support/http/InProcessHttpClient.ts` | Traverses the real middleware stack without a network listener. |
| `tests/Acceptance/support/seeds/organization.ts` | Seed organization rows for direct-state scenarios. |
| `tests/Acceptance/support/seeds/orgMember.ts` | Seed organization membership rows. |
| `tests/Acceptance/support/seeds/user.ts` | Seed users with system roles. |
| `tests/Acceptance/support/seeds/apiKey.ts` | Seed API keys so member-removal can assert assignment clearing. |
| `tests/Acceptance/support/seeds/appModule.ts` / `moduleSubscription.ts` / `contract.ts` | Seed provisioning prerequisites when middleware repair is expected to succeed. |
| `tests/Acceptance/support/scenarios/given/admin.ts` | Reusable admin seed helper. |
| `tests/Acceptance/support/scenarios/given/member.ts` | Reusable member seed helper. |
| `tests/Acceptance/support/scenarios/given/organization.ts` | Reusable organization seed helper. |
| `tests/Acceptance/support/scenarios/given/coreAppModulesProvisioned.ts` | Reusable provisioning helper for middleware flows. |
| `src/Modules/Organization/Presentation/Routes/organization.routes.ts` | Route surface to cover. |
| `src/Modules/Organization/Presentation/Controllers/OrganizationController.ts` | HTTP status / body behavior to pin. |
| `src/Modules/Organization/Presentation/Middleware/OrganizationMiddleware.ts` | Context resolution, authorization, auto-repair, and 503 paths. |
| `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts` | DI wiring and route registration entrypoint. |
| `src/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService.ts` | The provisioning side effect that middleware should trigger. |
| `src/Modules/Organization/__tests__/*.test.ts` | Existing unit tests that should continue to pass unchanged. |

### New files to create

| Path | Responsibility |
|------|----------------|
| `tests/Acceptance/UseCases/Organization/create-and-bootstrap.spec.ts` | Organization creation, creator promotion, token/cookie rotation, and duplicate-membership rejection. |
| `tests/Acceptance/UseCases/Organization/access-control.spec.ts` | Admin vs member vs non-member behavior for list/get/update/status routes. |
| `tests/Acceptance/UseCases/Organization/invitation-lifecycle.spec.ts` | Invite, cancel, accept, decline, and duplicate-invite replacement behavior. |
| `tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts` | Member listing, removal, role changes, last-manager protection, and API key assignment clearing. |
| `tests/Acceptance/UseCases/Organization/context-repair.spec.ts` | `requireOrganizationContext()` resolution rules and provisioning auto-repair / failure paths. |
| `tests/Acceptance/ApiContract/organization-endpoints.spec.ts` | Route-level happy path / auth failure / validation failure checks for the top Organization endpoints. |

### Files that should remain untouched in this rollout

| Path | Reason |
|------|--------|
| `tests/Acceptance/support/TestApp.ts` | Already provides the needed harness surface. |
| `tests/Acceptance/support/http/TestAuth.ts` | Already provides bearer-token helpers. |
| `tests/Acceptance/support/scenarios/**` | Existing credit DSL helpers are already sufficient; do not extend unless a test file becomes noisy. |
| `tests/Acceptance/UseCases/Credit/*.spec.ts` | Credit pilot stays as-is. |
| `tests/Acceptance/ApiContract/credit-endpoints.spec.ts` | Credit contract tests stay as-is. |
| `src/Modules/Auth/__tests__/*.test.ts` | Auth unit coverage is out of scope for this rollout. |

---

## Requirements Summary

The Organization slice should verify these behaviors with real app boot, real HTTP, and real DB:

1. `POST /api/organizations` creates the organization, creates the creator’s membership as `manager`, updates the creator’s system role to `manager`, rotates the auth cookie, and returns `201` with `redirectTo: /manager/dashboard`.
2. A user who already has any membership cannot create a second organization.
3. `GET /api/organizations`, `GET /api/organizations/:id`, `PUT /api/organizations/:id`, and `PATCH /api/organizations/:id/status` obey the current admin / membership / forbidden rules from the route + middleware stack.
4. Invitation lifecycle flows work end-to-end: invite, list, cancel, accept-by-token, accept-by-id, decline, and duplicate pending invite replacement.
5. Member lifecycle flows work end-to-end: list members, remove members, change roles, clear assigned API keys before removal, and protect the last manager from removal/demotion.
6. `requireOrganizationContext()` resolves organization IDs from headers, params, and manager auto-resolution; missing org ID returns `400`; non-member returns `403`; provisioning repair failure returns `503` and blocks the route.
7. Existing Organization unit tests continue to pass after the acceptance files land.

Non-goals for this plan:
- Do not add UI / Inertia coverage.
- Do not change Auth, Credit, ApiKey, or Reports behavior except where Organization acceptance needs direct seeding.
- Do not introduce new infrastructure abstractions unless a spec proves the current harness cannot express the behavior.

---

## Task 1: Freeze current Organization behavior and status matrix before writing acceptance specs

**Files:**
- Read: `src/Modules/Organization/Presentation/Routes/organization.routes.ts`
- Read: `src/Modules/Organization/Presentation/Controllers/OrganizationController.ts`
- Read: `src/Modules/Organization/Presentation/Middleware/OrganizationMiddleware.ts`
- Read: `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts`
- Read: `src/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService.ts`
- Read: `src/Modules/Organization/__tests__/Controllers/OrganizationController.test.ts`
- Read: `src/Modules/Organization/__tests__/CreateOrganizationService.test.ts`
- Read: `src/Modules/Organization/__tests__/InviteMemberService.test.ts`
- Read: `src/Modules/Organization/__tests__/AcceptInvitationService.test.ts`
- Read: `src/Modules/Organization/__tests__/RemoveMemberService.test.ts`
- Read: `src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts`
- Read: `src/Modules/AppModule/__tests__/ProvisionOrganizationDefaultsService.test.ts`
- Read: `tests/Acceptance/support/TestApp.ts`
- Read: `tests/Acceptance/support/http/TestAuth.ts`
- Read: `tests/Acceptance/support/http/InProcessHttpClient.ts`

**Why:** lock the current route / middleware behavior before writing acceptance coverage, so the new specs encode real outcomes instead of assumptions.

- [ ] **Step 1: Run the current unit tests that cover the Organization controller, services, and provisioning repair path**

Run:
```bash
bun test src/Modules/Organization/__tests__/Controllers/OrganizationController.test.ts \
  src/Modules/Organization/__tests__/CreateOrganizationService.test.ts \
  src/Modules/Organization/__tests__/InviteMemberService.test.ts \
  src/Modules/Organization/__tests__/AcceptInvitationService.test.ts \
  src/Modules/Organization/__tests__/RemoveMemberService.test.ts \
  src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts \
  src/Modules/AppModule/__tests__/ProvisionOrganizationDefaultsService.test.ts
```

Expected:
- The current Organization unit suite passes.
- `OrganizationController.create` still returns `201` on success and `401` when auth context is missing.
- `OrganizationMiddleware` still returns `400` for missing org ID, `403` for non-members, and `503` when auto-repair cannot complete.

- [ ] **Step 2: Record the current HTTP matrix directly in the plan before writing acceptance files**

Use the controller / middleware source to confirm and record the values that the acceptance layer must pin:
- `POST /api/organizations` success → `201`
- `GET /api/organizations` success → `200`
- `GET /api/organizations/:id` success → `200`
- `PUT /api/organizations/:id` success → `200`
- `PATCH /api/organizations/:id/status` success → `200`
- `GET /api/organizations/:id/members` success → `200`
- `POST /api/organizations/:id/invitations` success → `201`
- `GET /api/organizations/:id/invitations` success → `200`
- `DELETE /api/organizations/:id/invitations/:invId` success → `200`
- `POST /api/invitations/:token/accept` success → `200`
- `POST /api/invitations/:id/accept-by-id` success → `200`
- `POST /api/invitations/:id/decline` success → `200`
- `DELETE /api/organizations/:id/members/:userId` success → `200`
- `PATCH /api/organizations/:id/members/:userId/role` success → `200`
- missing auth → `401`
- missing org ID → `400`
- non-member / non-manager / non-admin → `403`
- auto-repair failure → `503`

Do not change code in this task.

- [ ] **Step 3: Commit any audit notes only if you created them while reading**

If the engineer writes a local markdown note during the audit, commit it immediately. Otherwise, do not create a no-op commit.

---

## Task 2: Create the Organization bootstrap and access-control acceptance specs

**Files:**
- Create: `tests/Acceptance/UseCases/Organization/create-and-bootstrap.spec.ts`
- Create: `tests/Acceptance/UseCases/Organization/access-control.spec.ts`

**Why:** cover the highest-signal Organization happy path first: creation, creator promotion, auth rotation, and the route matrix for admin / member / non-member access.

- [ ] **Step 1: Write the failing bootstrap spec**

Create `tests/Acceptance/UseCases/Organization/create-and-bootstrap.spec.ts` with this shape:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

function extractAuthToken(setCookie: string | null): string | null {
  if (!setCookie) return null
  const match = setCookie.match(/auth_token=([^;]+)/)
  return match?.[1] ?? null
}

describe('Organization bootstrap', () => {
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

  it('creates an organization, promotes the creator to manager, and rotates the auth cookie', async () => {
    const creator = await app.seed.user({
      id: 'user-1',
      email: 'member@example.test',
      role: 'user',
    })

    const response = await app.http.post('/api/organizations', {
      headers: app.auth.bearerHeaderFor({
        userId: creator.id,
        email: creator.email,
        role: 'member',
      }),
      body: { name: 'Acme', slug: 'acme' },
    })

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      success: boolean
      data?: { id: string; redirectTo?: string }
    }
    expect(body.success).toBe(true)
    expect(body.data?.redirectTo).toBe('/manager/dashboard')

    const setCookie = response.headers.get('set-cookie')
    expect(setCookie).toContain('auth_token=')

    const orgRow = await app.db.table('organizations').where('slug', '=', 'acme').first()
    expect(orgRow).toBeTruthy()

    const memberRow = await app.db
      .table('organization_members')
      .where('organization_id', '=', body.data?.id ?? '')
      .where('user_id', '=', creator.id)
      .first()
    expect(memberRow?.role).toBe('manager')

    const userRow = await app.db.table('users').where('id', '=', creator.id).first()
    expect(userRow?.role).toBe('manager')

    const rotatedToken = extractAuthToken(setCookie)
    expect(rotatedToken).toBeTruthy()

    const followUp = await app.http.get(`/api/organizations/${body.data?.id ?? ''}`, {
      headers: { Cookie: `auth_token=${rotatedToken}` },
    })
    expect(followUp.status).toBe(200)
  })

  it('rejects a second organization when the user already has membership', async () => {
    const creator = await app.seed.user({
      id: 'user-2',
      email: 'member-2@example.test',
      role: 'user',
    })
    await app.seed.organization({ id: 'org-existing', name: 'Existing Org', slug: 'existing-org' })
    await app.seed.orgMember({ orgId: 'org-existing', userId: creator.id, role: 'member' })

    const response = await app.http.post('/api/organizations', {
      headers: app.auth.bearerHeaderFor({
        userId: creator.id,
        email: creator.email,
        role: 'member',
      }),
      body: { name: 'Second Org', slug: 'second-org' },
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as {
      success: boolean
      error?: string
    }
    expect(body.success).toBe(false)
    expect(body.error).toBe('ALREADY_HAS_ORGANIZATION')
  })
})
```

- [ ] **Step 2: Run the spec and verify it fails for the right reason**

Run:
```bash
bun test tests/Acceptance/UseCases/Organization/create-and-bootstrap.spec.ts --reporter=dot
```

Expected:
- The file exists and loads.
- The first run fails because the current acceptance coverage does not yet exist, or because the route / cookie / DB assertion surface reveals a genuine mismatch.
- Do not change unrelated files in response to the first failure.

- [ ] **Step 3: Write the access-control spec that pins the admin / member / non-member route matrix**

Create `tests/Acceptance/UseCases/Organization/access-control.spec.ts` with tests for:
- admin can `GET /api/organizations`
- member can `GET /api/organizations/:id` when membership exists
- non-member receives `403` from `GET /api/organizations/:id`
- member receives `403` from `PUT /api/organizations/:id` and `PATCH /api/organizations/:id/status`
- missing auth returns `401` on the protected routes

Representative shape:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

describe('Organization access control', () => {
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

  it('lets an admin list organizations but blocks a non-member from reading someone else\'s org', async () => {
    const admin = await app.seed.user({ id: 'admin-1', email: 'admin@example.test', role: 'admin' })
    const member = await app.seed.user({ id: 'user-1', email: 'member@example.test', role: 'user' })
    const org = await app.seed.organization({ id: 'org-1', name: 'Acme', slug: 'acme' })
    await app.seed.orgMember({ orgId: org.id, userId: member.id, role: 'member' })

    const listRes = await app.http.get('/api/organizations', {
      headers: app.auth.bearerHeaderFor({
        userId: admin.id,
        email: admin.email,
        role: 'admin',
      }),
    })
    expect(listRes.status).toBe(200)

    const getRes = await app.http.get(`/api/organizations/${org.id}`, {
      headers: app.auth.bearerHeaderFor({
        userId: admin.id,
        email: admin.email,
        role: 'admin',
      }),
    })
    expect(getRes.status).toBe(200)

    const forbiddenRes = await app.http.get(`/api/organizations/${org.id}`, {
      headers: app.auth.bearerHeaderFor({
        userId: 'outsider-1',
        email: 'outsider@example.test',
        role: 'member',
      }),
    })
    expect(forbiddenRes.status).toBe(403)
  })
})
```

- [ ] **Step 4: Re-run the two specs until they pass**

Run:
```bash
bun test tests/Acceptance/UseCases/Organization/create-and-bootstrap.spec.ts \
  tests/Acceptance/UseCases/Organization/access-control.spec.ts --reporter=dot
```

Expected:
- PASS
- The output proves the real create / auth rotation / access control behavior works through the container.

- [ ] **Step 5: Commit**

Run:
```bash
git add tests/Acceptance/UseCases/Organization/create-and-bootstrap.spec.ts \
  tests/Acceptance/UseCases/Organization/access-control.spec.ts
git commit -m "test: add organization bootstrap and access control acceptance coverage"
```

---

## Task 3: Create the Organization invitation lifecycle acceptance spec

**Files:**
- Create: `tests/Acceptance/UseCases/Organization/invitation-lifecycle.spec.ts`

**Why:** invitations are the most stateful Organization flow and are the easiest place for route / middleware / repository drift to hide.

- [ ] **Step 1: Write the failing invitation lifecycle spec**

Create `tests/Acceptance/UseCases/Organization/invitation-lifecycle.spec.ts` with this shape:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

describe('Organization invitation lifecycle', () => {
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

  it('invites a member, replaces a pending invite for the same email, and allows accept / decline / cancel', async () => {
    const org = await app.seed.organization({ id: 'org-1', name: 'Acme', slug: 'acme' })
    await app.seed.user({ id: 'manager-1', email: 'manager@example.test', role: 'manager' })
    await app.seed.orgMember({ orgId: org.id, userId: 'manager-1', role: 'manager' })

    const inviteRes = await app.http.post(`/api/organizations/${org.id}/invitations`, {
      headers: app.auth.bearerHeaderFor({
        userId: 'manager-1',
        email: 'manager@example.test',
        role: 'manager',
      }),
      body: { email: 'new.member@example.test', role: 'member' },
    })
    expect(inviteRes.status).toBe(201)

    const inviteJson = (await inviteRes.json()) as {
      success: boolean
      data?: { id: string; token: string; expiresAt: string }
    }
    expect(inviteJson.success).toBe(true)

    const pending = await app.db
      .table('organization_invitations')
      .where('organization_id', '=', org.id)
      .where('email', '=', 'new.member@example.test')
      .select()
    expect(pending.length).toBe(1)
    expect(pending[0]?.status).toBe('pending')

    const acceptRes = await app.http.post(`/api/invitations/${inviteJson.data?.token}/accept`, {
      headers: app.auth.bearerHeaderFor({
        userId: 'invitee-1',
        email: 'new.member@example.test',
        role: 'member',
      }),
    })
    expect(acceptRes.status).toBe(200)

    const membership = await app.db
      .table('organization_members')
      .where('organization_id', '=', org.id)
      .where('user_id', '=', 'invitee-1')
      .first()
    expect(membership?.role).toBe('member')
  })
})
```

- [ ] **Step 2: Run the spec and verify it fails for the right reason**

Run:
```bash
bun test tests/Acceptance/UseCases/Organization/invitation-lifecycle.spec.ts --reporter=dot
```

Expected:
- The file exists and loads.
- The first run fails because the acceptance coverage is not written yet, or because the route behavior reveals a genuine mismatch.

- [ ] **Step 3: Extend the spec until it covers the full invitation lifecycle**

Add explicit assertions for:
- duplicate pending invite replacement cancels the old pending invitation before creating the new one
- `GET /api/organizations/:id/invitations` shows the pending invitations for a member / manager / admin
- `DELETE /api/organizations/:id/invitations/:invId` marks the invitation cancelled
- `POST /api/invitations/:id/decline` marks the invitation cancelled
- `POST /api/invitations/:id/accept-by-id` creates membership and marks the invitation accepted
- wrong email / unauthorized accept path is rejected with the current controller status code

- [ ] **Step 4: Re-run until the spec passes**

Run:
```bash
bun test tests/Acceptance/UseCases/Organization/invitation-lifecycle.spec.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:
```bash
git add tests/Acceptance/UseCases/Organization/invitation-lifecycle.spec.ts
git commit -m "test: add organization invitation lifecycle acceptance coverage"
```

---

## Task 4: Create the Organization member lifecycle acceptance spec

**Files:**
- Create: `tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts`

**Why:** member removal / role changes are where hidden data corruption usually appears first; the acceptance spec should pin the last-manager guard and the API key assignment cleanup.

- [ ] **Step 1: Write the failing member lifecycle spec**

Create `tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts` with this shape:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

describe('Organization member lifecycle', () => {
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

  it('removes a member, clears assigned API keys, and prevents removing the last manager', async () => {
    const org = await app.seed.organization({ id: 'org-1', name: 'Acme', slug: 'acme' })
    await app.seed.user({ id: 'manager-1', email: 'manager@example.test', role: 'manager' })
    await app.seed.user({ id: 'member-1', email: 'member@example.test', role: 'member' })
    await app.seed.orgMember({ orgId: org.id, userId: 'manager-1', role: 'manager' })
    await app.seed.orgMember({ orgId: org.id, userId: 'member-1', role: 'member' })
    await app.seed.apiKey({
      id: 'key-1',
      orgId: org.id,
      createdByUserId: 'manager-1',
      label: 'Member Key',
      status: 'active',
    })
    await app.db.table('api_keys').where('id', '=', 'key-1').update({ assigned_member_id: 'member-1' })

    const removeRes = await app.http.delete(`/api/organizations/${org.id}/members/member-1`, {
      headers: app.auth.bearerHeaderFor({
        userId: 'manager-1',
        email: 'manager@example.test',
        role: 'manager',
      }),
    })
    expect(removeRes.status).toBe(200)

    const removedMember = await app.db
      .table('organization_members')
      .where('organization_id', '=', org.id)
      .where('user_id', '=', 'member-1')
      .first()
    expect(removedMember).toBeNull()

    const keyRow = await app.db.table('api_keys').where('id', '=', 'key-1').first()
    expect(keyRow?.assigned_member_id).toBeNull()

    const lastManagerRes = await app.http.delete(`/api/organizations/${org.id}/members/manager-1`, {
      headers: app.auth.bearerHeaderFor({
        userId: 'manager-1',
        email: 'manager@example.test',
        role: 'manager',
      }),
    })
    expect(lastManagerRes.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run the spec and verify it fails for the right reason**

Run:
```bash
bun test tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts --reporter=dot
```

Expected:
- The file exists and loads.
- The first run fails until the member removal / role-change assertions are wired to the real acceptance state.

- [ ] **Step 3: Extend the spec until it covers the full member lifecycle**

Add explicit assertions for:
- `GET /api/organizations/:id/members` returns the current membership list
- `PATCH /api/organizations/:id/members/:userId/role` changes roles only for admin as the current route contract requires
- demoting the last manager returns the current `CANNOT_DEMOTE_LAST_MANAGER` / `CANNOT_REMOVE_LAST_MANAGER` behavior
- removing the current requester returns `CANNOT_REMOVE_SELF`
- a demoted non-admin user is downgraded in `users.role` only when they are no longer a manager anywhere

- [ ] **Step 4: Re-run until the spec passes**

Run:
```bash
bun test tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:
```bash
git add tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts
git commit -m "test: add organization member lifecycle acceptance coverage"
```

---

## Task 5: Create the Organization middleware / provisioning repair acceptance spec

**Files:**
- Create: `tests/Acceptance/UseCases/Organization/context-repair.spec.ts`

**Why:** Organization is the only acceptance target here whose middleware can auto-resolve org IDs and auto-repair missing gateway team provisioning; those branches need their own focused regression file.

- [ ] **Step 1: Write the failing middleware repair spec**

Create `tests/Acceptance/UseCases/Organization/context-repair.spec.ts` with this shape:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../support/TestApp'

describe('Organization context repair', () => {
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

  it('resolves org id from manager context and auto-repairs missing gateway provisioning', async () => {
    const org = await app.seed.organization({ id: 'org-1', name: 'Acme', slug: 'acme' })
    await app.seed.user({ id: 'manager-1', email: 'manager@example.test', role: 'manager' })
    await app.seed.orgMember({ orgId: org.id, userId: 'manager-1', role: 'manager' })
    await app.seed.allCoreAppModules()

    const response = await app.http.get('/api/organizations/org-1', {
      headers: app.auth.bearerHeaderFor({
        userId: 'manager-1',
        email: 'manager@example.test',
        role: 'manager',
      }),
    })

    expect(response.status).toBe(200)
    expect(app.gateway.calls.createTeam.length).toBeGreaterThan(0)

    const repairedOrg = await app.db.table('organizations').where('id', '=', org.id).first()
    expect(repairedOrg?.gateway_team_id).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run the spec and verify it fails for the right reason**

Run:
```bash
bun test tests/Acceptance/UseCases/Organization/context-repair.spec.ts --reporter=dot
```

Expected:
- The file exists and loads.
- The first run fails until the middleware path is exercised against the real repair branch.

- [ ] **Step 3: Add the remaining edge cases to the same spec**

Add explicit assertions for:
- `X-Organization-Id`, `x-organization-id`, `organization-id`, `:id`, and `:orgId` are all accepted as org ID sources
- manager auto-resolution works when the request omits org ID entirely
- missing org ID returns `400` with `MISSING_ORGANIZATION_ID`
- non-member returns `403` with `FORBIDDEN` or the current middleware error code
- repair failure returns `503` and blocks the route before any controller side effect can occur

- [ ] **Step 4: Re-run until the spec passes**

Run:
```bash
bun test tests/Acceptance/UseCases/Organization/context-repair.spec.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:
```bash
git add tests/Acceptance/UseCases/Organization/context-repair.spec.ts
git commit -m "test: add organization context repair acceptance coverage"
```

---

## Task 6: Create the Organization API contract acceptance spec

**Files:**
- Create: `tests/Acceptance/ApiContract/organization-endpoints.spec.ts`

**Why:** the use-case specs cover business state, but this contract file pins the HTTP surface — auth failure, validation failure, and status codes on the top Organization endpoints.

- [ ] **Step 1: Write the failing API contract spec**

Create `tests/Acceptance/ApiContract/organization-endpoints.spec.ts` with this shape:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../support/TestApp'

describe('Organization API contract', () => {
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

  it('pins the create / get / invite route contracts', async () => {
    const admin = await app.seed.user({ id: 'admin-1', email: 'admin@example.test', role: 'admin' })
    const org = await app.seed.organization({ id: 'org-1', name: 'Acme', slug: 'acme' })
    await app.seed.user({ id: 'manager-1', email: 'manager@example.test', role: 'manager' })
    await app.seed.orgMember({ orgId: org.id, userId: 'manager-1', role: 'manager' })

    const createRes = await app.http.post('/api/organizations', {
      headers: app.auth.bearerHeaderFor({
        userId: 'manager-1',
        email: 'manager@example.test',
        role: 'member',
      }),
      body: { name: 'Beta', slug: 'beta' },
    })
    expect(createRes.status).toBe(201)

    const getRes = await app.http.get(`/api/organizations/${org.id}`, {
      headers: app.auth.bearerHeaderFor({
        userId: admin.id,
        email: admin.email,
        role: 'admin',
      }),
    })
    expect(getRes.status).toBe(200)

    const inviteRes = await app.http.post(`/api/organizations/${org.id}/invitations`, {
      headers: app.auth.bearerHeaderFor({
        userId: 'manager-1',
        email: 'manager@example.test',
        role: 'manager',
      }),
      body: { email: 'new.member@example.test' },
    })
    expect(inviteRes.status).toBe(201)
  })
})
```

- [ ] **Step 2: Run the spec and verify it fails for the right reason**

Run:
```bash
bun test tests/Acceptance/ApiContract/organization-endpoints.spec.ts --reporter=dot
```

Expected:
- The file exists and loads.
- The first run fails until the HTTP contract is wired to the real route surface.

- [ ] **Step 3: Expand the contract checks to cover auth and validation failures**

Add explicit assertions for:
- `POST /api/organizations` without auth returns `401`
- `POST /api/organizations` with invalid body returns the current validation status / error shape from `CreateOrganizationRequest`
- `GET /api/organizations/:id` without auth returns `401`
- `POST /api/organizations/:id/invitations` with invalid email returns the current validation failure status
- `GET /api/organizations/:id/members` and `GET /api/organizations/:id/invitations` preserve the current middleware error matrix

- [ ] **Step 4: Re-run until the spec passes**

Run:
```bash
bun test tests/Acceptance/ApiContract/organization-endpoints.spec.ts --reporter=dot
```

Expected: PASS.

- [ ] **Step 5: Commit**

Run:
```bash
git add tests/Acceptance/ApiContract/organization-endpoints.spec.ts
git commit -m "test: add organization api contract acceptance coverage"
```

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Middleware auto-repair introduces flaky external state assertions | Keep provisioning assertions limited to `MockGatewayClient` call counts and the final `gateway_team_id` writeback in SQLite. |
| Organization acceptance specs become noisy because every test needs the same setup | Add shared helpers only after the second repeated setup appears; prefer inline local helpers first. |
| Role / membership assertions drift from current service behavior | Task 1 freezes the actual current matrix before writing acceptance files, so the specs encode observed behavior, not memory. |
| API key assignment cleanup is easy to miss | Force one removal scenario to seed an assigned API key and assert `assigned_member_id` becomes `null` before the member row disappears. |
| Route validation status codes may differ from the controller fallback | Record the current controller / request-middleware behavior in Task 1 and use that as the acceptance contract source of truth. |

---

## Verification Steps

1. After each spec file is added, run that file alone with `bun test ... --reporter=dot` until it passes.
2. After all Organization acceptance files pass individually, run the whole Organization acceptance slice:
   ```bash
   bun test tests/Acceptance/UseCases/Organization tests/Acceptance/ApiContract/organization-endpoints.spec.ts --reporter=dot
   ```
3. Run the Organization unit suite again to confirm no regression in the legacy tests:
   ```bash
   bun test src/Modules/Organization/__tests__/Controllers/OrganizationController.test.ts \
     src/Modules/Organization/__tests__/CreateOrganizationService.test.ts \
     src/Modules/Organization/__tests__/InviteMemberService.test.ts \
     src/Modules/Organization/__tests__/AcceptInvitationService.test.ts \
     src/Modules/Organization/__tests__/RemoveMemberService.test.ts \
     src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts \
     src/Modules/AppModule/__tests__/ProvisionOrganizationDefaultsService.test.ts
   ```
4. Run `bun run typecheck` once the acceptance files are stable.
5. If the repo already exposes `bun run test:acceptance`, run the full acceptance suite before merging.

---

## Delivery Notes

- Keep the Organization rollout independent from Credit / Auth so the review surface stays manageable.
- Avoid new fakes or shared abstractions unless a single acceptance file proves the current harness cannot express the behavior.
- Prefer direct HTTP + DB assertions over service-level testing when the route or middleware is the thing being verified.
- If the engineer finds a repeated helper pattern in two specs, extract it into `tests/Acceptance/support/scenarios/**` only after the second repetition.
