# ApiKey & AppApiKey Acceptance Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add HTTP-level acceptance coverage for the ApiKey (member-facing virtual keys) and AppApiKey (system/app-level keys) modules using the existing `TestApp` framework.

**Tech Stack:** Vitest, Knex (via `app.db`), `InProcessHttpClient`, existing `MockGatewayClient`.

---

## Pre-Plan Findings (verified against codebase)

These facts shaped the plan; do not re-derive them while executing.

1. **No new fakes required.** `TestApp.boot()` already rebinds `llmGatewayClient` to `MockGatewayClient`. Both `ApiKeyServiceProvider` and `AppApiKeyServiceProvider` register `apiKeyBifrostSync` / `appKeyBifrostSync` as wrappers around `llmGatewayClient`, so they automatically use the mock. Tests can:
   - Inspect `app.gateway.calls.createKey` / `updateKey` / `deleteKey` / `getUsageStats`.
   - Seed return values via `app.gateway.seedUsageStats(...)`.
   - Trust that `app.reset()` already calls `app.gateway.reset()`.

2. **Real interface signatures (use these, not the prior plan's):**
   - `IBifrostKeySync`:
     - `createVirtualKey(label: string, orgId: string, options?: { budget?: { maxLimit, resetDuration } }): Promise<{ gatewayKeyId, gatewayKeyValue }>`
     - `syncPermissions(gatewayKeyId, scope: KeyScope): Promise<void>`
     - `updateVirtualKeyBudget(gatewayKeyId, budget): Promise<void>`
     - `deactivateVirtualKey(gatewayKeyId): Promise<void>` (used by revoke)
     - `deleteVirtualKey(gatewayKeyId): Promise<void>` (rollback)
   - `IAppKeyBifrostSync`:
     - `createVirtualKey(label, orgId): Promise<{ gatewayKeyId, gatewayKeyValue }>`
     - `deactivateVirtualKey(gatewayKeyId): Promise<void>`
     - `deleteVirtualKey(gatewayKeyId): Promise<void>`

3. **Routes (final):**
   - `POST /api/organizations/:orgId/keys` — auth + module access `api_keys`
   - `GET /api/organizations/:orgId/keys` — auth + module access `api_keys`
   - `POST /api/keys/:keyId/revoke` — auth only
   - `PATCH /api/keys/:keyId/label` — auth only
   - `PUT /api/keys/:keyId/permissions` — auth only
   - `POST /api/organizations/:orgId/app-keys` — auth + module access `app_api_keys`
   - `GET /api/organizations/:orgId/app-keys` — auth + module access `app_api_keys`
   - `POST /api/app-keys/:keyId/rotate` — auth only
   - `POST /api/app-keys/:keyId/revoke` — auth only
   - `PUT /api/app-keys/:keyId/scope` — auth only
   - `GET /api/app-keys/:keyId/usage` — auth only

4. **Service-level role checks (independent of route middleware):**
   - `CreateApiKeyService` → `requireOrgMembership` (member|manager|admin OK).
   - `RevokeApiKeyService`, `UpdateKeyLabelService`, `SetKeyPermissionsService` → `requireOrgMembership`.
   - `IssueAppKeyService`, `RotateAppKeyService`, `RevokeAppKeyService`, `SetAppKeyScopeService` → `requireOrgManager` (manager-or-admin only).
   - `ListAppKeysService`, `GetAppKeyUsageService` → `requireOrgMembership`.

5. **Module-access middleware** returns 403 `MODULE_ACCESS_DENIED` for non-admin callers when the org has no active `module_subscriptions` row for the relevant module. **Admins skip the check.** Tests for non-admin calls on org-scoped routes must seed both `app_modules` (use `app.seed.allCoreAppModules()`) and `module_subscriptions` for the org.

6. **Org provisioning:** `ApiKeyBifrostSync.createVirtualKey` throws `GatewayError('VALIDATION')` if `organizations.gateway_team_id` is null. Tests that issue keys via the create endpoint must set it (mirror `provisionOrganizationForContext` from `tests/Acceptance/UseCases/Organization/access-control.spec.ts`).

7. **DB tables `api_keys` and `app_api_keys` are already in `ACCEPTANCE_TABLES`** (truncated between tests via `tests/Acceptance/support/db/tables.ts`). No migration changes needed.

8. **Existing seeders:** `app.seed.apiKey({...})` exists. **No `seed.appApiKey`** exists yet; AppApiKey rows in tests must be created either through the issue endpoint or via direct `app.db.table('app_api_keys').insert(...)`.

9. **Auth headers:** `app.auth.persistedBearerHeaderFor({userId, email, role})` is the canonical helper used by Organization tests.

10. **Conventions:** New tests live at `tests/Acceptance/UseCases/<Module>/<theme>.spec.ts` and follow the `beforeAll → boot`, `afterAll → shutdown`, `beforeEach → reset` pattern.

---

### Task 1: Member ApiKey acceptance tests

**Files:**
- Create: `tests/Acceptance/UseCases/ApiKey/lifecycle.spec.ts`
- Create: `tests/Acceptance/UseCases/ApiKey/access-control.spec.ts`

**Persona helpers** (copy/adapt from `tests/Acceptance/UseCases/Organization/access-control.spec.ts`):
- `provisionOrganizationForContext(app, orgId)` — sets `organizations.gateway_team_id = mock_team_<orgId>`.
- `enableApiKeysModule(app, orgId)` — calls `app.seed.allCoreAppModules()` once per test (it's reset between tests via `truncateAcceptanceTables`), then `app.seed.moduleSubscription({ orgId, moduleId: '00000000-0000-4000-8000-000000000003', status: 'active' })`. Use the constant `CORE_APP_MODULE_SPECS` id for `api_keys` (`...003`).
- `adminHeader / managerHeader / memberHeader` — wrap `persistedBearerHeaderFor` with the matching system role.

- [ ] **Step 1: Lifecycle spec — happy paths**

Create `tests/Acceptance/UseCases/ApiKey/lifecycle.spec.ts` with the helper block at top and these cases inside `describe('ApiKey lifecycle', ...)`:

  - **`manager creates an API key for their org`**
    - Seed manager + org; provision team binding; enable api_keys module subscription.
    - `POST /api/organizations/:orgId/keys` with body `{ label: 'Production Key', allowedModels: ['gpt-4o'], rateLimitRpm: 60, rateLimitTpm: 90000 }`.
    - Assert `status === 201`, `body.success === true`, `body.data.rawKey` is a non-empty string, `body.data.status === 'active'`, `body.data.scope.allowedModels` includes `'gpt-4o'`.
    - DB: `api_keys` row exists with `status='active'`, `org_id` matches, `bifrost_virtual_key_id` is set.
    - Mock: `app.gateway.calls.createKey.length === 1` and the captured `request.teamId === 'mock_team_<orgId>'`. `app.gateway.calls.updateKey` includes one entry whose `request.providerConfigs` carries the model allow-list (this is the `syncPermissions` call).

  - **`manager creates an API key with a budget`**
    - Same setup. Body: `{ label: 'Capped Key', budgetMaxLimit: 1000, budgetResetPeriod: '7d' }`.
    - Assert `201`, `body.data.quotaAllocated === 1000`, and `app.gateway.calls.createKey[0].budget` === `{ maxLimit: 1000, resetDuration: '7d' }`.

  - **`manager lists keys for their org`**
    - Seed two keys via `app.seed.apiKey({ id, orgId, createdByUserId: manager.id, label, status: 'active' })` (one suspended via `status: 'suspended_no_credit'`).
    - `GET /api/organizations/:orgId/keys` as manager → `200`, `body.data.keys.length === 2`, both keys present with correct `status` field.

  - **`manager revokes an active key`**
    - Seed an active key. `POST /api/keys/:keyId/revoke` as manager → `200`, `body.data.status === 'revoked'`.
    - DB: `api_keys.status='revoked'`, `revoked_at` not null.
    - Mock: `app.gateway.calls.updateKey` includes `{ keyId: <gatewayKeyId>, request: { isActive: false } }`.

  - **`revoking the same key twice returns ALREADY_REVOKED`**
    - Seed an already-revoked key (`status: 'revoked'`). `POST /api/keys/:keyId/revoke` as manager → `400`, `error === 'ALREADY_REVOKED'`.

  - **`manager updates a key label`**
    - Seed key. `PATCH /api/keys/:keyId/label` body `{ label: 'New Label' }` as manager → `200`. DB confirms updated label.

  - **`manager sets key permissions to a narrower model list`**
    - Seed key. `PUT /api/keys/:keyId/permissions` body `{ allowedModels: ['gpt-4o-mini'], rateLimitRpm: 30, rateLimitTpm: 60000 }` as manager → `200`. Mock: latest `updateKey` entry's `request.providerConfigs[0].allowedModels` includes `'gpt-4o-mini'`.

- [ ] **Step 2: Access-control spec — isolation & errors**

Create `tests/Acceptance/UseCases/ApiKey/access-control.spec.ts`:

  - **`returns 401 on protected routes when unauthenticated`**
    - `GET /api/organizations/<orgId>/keys` (no auth header) → `401`.
    - `POST /api/keys/<some-keyId>/revoke` (no auth header) → `401`.

  - **`module-access denies non-admin caller without subscription`**
    - Seed manager + org; do NOT seed module subscription.
    - `POST /api/organizations/:orgId/keys` as manager → `403`, `error === 'MODULE_ACCESS_DENIED'`.

  - **`admin bypasses module access`**
    - Seed admin + org; do NOT seed module subscription; provision team binding.
    - `POST /api/organizations/:orgId/keys` as admin → `201` (works because admin skips the middleware and `requireOrgMembership` accepts `callerSystemRole === 'admin'`).

  - **`manager of org A cannot create keys in org B (cross-tenant)`**
    - Seed manager in org A; org B with team binding and api_keys subscription. Manager A calls `POST /api/organizations/<orgB.id>/keys` → `400` (service-layer rejection), `error === 'NOT_ORG_MEMBER'`.
      - NOTE: 400 not 403 here because `CreateApiKeyService` returns `success:false` with HTTP 400 on auth failure (per controller mapping `result.success ? 201 : 400`).

  - **`manager of org A cannot revoke a key from org B`**
    - Seed manager A in org A; seed an active key in org B. Manager A calls `POST /api/keys/<orgB-keyId>/revoke` → expect non-200; verify body `error === 'NOT_ORG_MEMBER'`. Status will be `400` based on controller fall-through; assert exact status from observed behavior on first run, then lock it in.

  - **`admin can revoke any org's key`**
    - Seed admin (no membership); seed active key in some org. Admin calls revoke → `200`.

  - **`outsider (no membership) gets NOT_ORG_MEMBER on list`**
    - Seed outsider user (system role `member`/`user`); seed org B with subscription. Outsider calls `GET /api/organizations/<orgB.id>/keys` → expect `body.success === false && body.error === 'NOT_ORG_MEMBER'`. Controller maps list to default 200 status (`return ctx.json(result)`), so assert on body fields, not on `200/403`.

- [ ] **Step 3: Run and stabilize**

```
npm test tests/Acceptance/UseCases/ApiKey
```

Address any drift between the assertions above and observed behavior:
- If a status code differs, **prefer changing the test to match the live controller** (these are acceptance tests, not change drivers).
- Capture the exact `error` string returned and tighten the assertion.

- [ ] **Step 4: Commit**

```bash
git add tests/Acceptance/UseCases/ApiKey/
git commit -m "test: [ApiKey] add acceptance coverage for lifecycle and access control"
```

---

### Task 2: System AppApiKey acceptance tests

**Files:**
- Create: `tests/Acceptance/UseCases/AppApiKey/lifecycle.spec.ts`
- Create: `tests/Acceptance/UseCases/AppApiKey/access-control.spec.ts`

**Persona helpers:** Same pattern as Task 1, but for `app_api_keys` use module id `00000000-0000-4000-8000-000000000004`.

**App-key seeding helper (file-local):** Because there's no `app.seed.appApiKey`, tests that need a pre-existing app key should issue one via the HTTP endpoint and capture its id from the response body. This is preferred because it goes through the real flow. For tests that need a *specific shape* (e.g. revoked already), use a private helper that calls `app.db.table('app_api_keys').insert(...)` with the columns derived from the migration (`database/migrations/2026_04_10_000001_create_app_api_keys_table.ts`). Inspect the migration file before writing the helper to make sure column names match.

- [ ] **Step 1: Lifecycle spec**

Create `tests/Acceptance/UseCases/AppApiKey/lifecycle.spec.ts`:

  - **`manager issues an app key with manual rotation`**
    - Setup: manager + org + team binding + `app_api_keys` subscription.
    - `POST /api/organizations/:orgId/app-keys` body `{ label: 'CI Pipeline', scope: 'write', rotationPolicy: { autoRotate: false, gracePeriodHours: 12 }, boundModuleIds: [] }`.
    - Expect `201`, `body.data.rawKey` starts with `'drp_app_'`, `body.data.scope === 'write'`, `body.data.rotationPolicy.auto_rotate === false`.
    - DB: `app_api_keys` row with `status='active'`, `bifrost_virtual_key_id` set.
    - Mock: `app.gateway.calls.createKey[0].name === '[App] CI Pipeline'`.

  - **`manager issues an app key with auto-rotation policy`**
    - Body: `{ label: 'AutoRot', rotationPolicy: { autoRotate: true, rotationIntervalDays: 30, gracePeriodHours: 24 } }`. Assert `body.data.rotationPolicy.auto_rotate === true && rotation_interval_days === 30`.

  - **`manager manually rotates an active app key`**
    - Issue a key (capture `keyId`, `rawKey1`, `gatewayKeyId1`).
    - `POST /api/app-keys/:keyId/rotate` as manager → `200`, `body.data.rawKey !== rawKey1`, `body.data.gatewayKeyId !== gatewayKeyId1`, `body.data.isInGracePeriod === true`.
    - DB: row's `previous_bifrost_virtual_key_id === gatewayKeyId1` and `grace_period_ends_at` is not null.
    - Mock: `app.gateway.calls.createKey.length === 2` (issue + rotate).

  - **`manager updates scope and bound modules`**
    - Issue a key. The seeded core modules already include `dashboard`/`credit`; pick one as `boundModuleIds` for the realistic case (or `[]`).
    - `PUT /api/app-keys/:keyId/scope` body `{ scope: 'admin', boundModuleIds: [<moduleId>] }` as manager → `200`. Body confirms scope `'admin'`, `boundModules` array contains the id. DB row reflects updated `scope` and `bound_modules`.

  - **`manager revokes an active app key`**
    - Issue → revoke. Expect `200`, `body.data.status === 'revoked'`. DB: `revoked_at` set. Mock: `updateKey` with `{ isActive: false }` for the gateway id.

  - **`manager fetches usage for a key`**
    - Issue a key.
    - Call `app.gateway.seedUsageStats({ totalRequests: 12, totalTokens: 3400, totalCost: 0.42, avgLatency: 100 })` before the request.
    - `GET /api/app-keys/:keyId/usage?startDate=2026-04-01&endDate=2026-04-30` as manager → `200`, `body.data.totalRequests === 12`, `totalTokens === 3400`, `totalCost === 0.42`.
    - Mock: `app.gateway.calls.getUsageStats[0]` contains the issued key's gateway id and the date query.

- [ ] **Step 2: Access-control spec**

Create `tests/Acceptance/UseCases/AppApiKey/access-control.spec.ts`:

  - **`401 on protected routes when unauthenticated`** — same shape as Task 1.

  - **`module-access denies non-admin manager without subscription`** — issue endpoint → `403 MODULE_ACCESS_DENIED`.

  - **`member (non-manager) cannot issue an app key`**
    - Seed member-role org member, subscription enabled, team binding set. Issue endpoint → `400`, `error === 'NOT_ORG_MANAGER'` (per `IssueAppKeyService`).

  - **`member (non-manager) cannot rotate or revoke or set scope`**
    - Issue a key first as a manager (via DB or via http with a manager). Then attempt rotate/revoke/setScope as a non-manager member of the same org. Expect non-200 with `error === 'NOT_ORG_MANAGER'`.

  - **`member can list and view usage`**
    - Setup org with manager-issued key + subscription. Add a member to the org. Member calls `GET /api/organizations/:orgId/app-keys` → `200` with the seeded key visible. Member calls `GET /api/app-keys/:keyId/usage` → `200`.

  - **`manager of org A cannot rotate an app key from org B`**
    - Two orgs each with subscriptions and team bindings. Issue a key in org B (use manager B). Manager A calls rotate on org B's key → expect non-200 with `error === 'NOT_ORG_MANAGER'`.

  - **`admin can rotate/revoke any org's app key`**
    - Issue a key as manager B. Admin calls rotate → `200`. Admin calls revoke → `200`.

- [ ] **Step 3: Run and stabilize**

```
npm test tests/Acceptance/UseCases/AppApiKey
```

Same drift-handling as Task 1.

- [ ] **Step 4: Commit**

```bash
git add tests/Acceptance/UseCases/AppApiKey/
git commit -m "test: [AppApiKey] add acceptance coverage for lifecycle and access control"
```

---

### Task 3: Wrap-up

- [ ] **Step 1: Full acceptance run**

```
npm test tests/Acceptance
```

Confirm green and that no existing Organization specs regressed.

- [ ] **Step 2: (Optional) Add `seed.appApiKey` if a test needs identical seed shapes more than twice.** Defer if not needed — tests that go through the real issue endpoint are higher-fidelity.

---

## Out of Scope

- Bifrost network failure paths (covered by unit tests in `src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts`).
- AssignApiKeyService and member self-service routes (no member route currently exists for ApiKey list — the controller's list route requires `requireOrgMembership` which already covers members).
- Rate-limit / quota suspension flows (those involve Credit + scheduler events).
