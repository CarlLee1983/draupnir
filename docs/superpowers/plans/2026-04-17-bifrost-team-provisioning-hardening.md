# Bifrost Team Provisioning Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close two high-severity correctness defects — fail-closed key issuance when the Bifrost Team binding is missing, and race-safe `ensureTeam` under concurrent provisioning / SDK-level POST retries.

**Architecture:** Two independent layers. (1) `ApiKeyBifrostSync.createVirtualKey` throws `GatewayError('VALIDATION')` instead of creating an unscoped key. (2) `ProvisionOrganizationDefaultsService` wraps its Team-binding block in a DB transaction + per-org `SELECT ... FOR UPDATE` row lock via a new `IQueryBuilder.forUpdate()`; `BifrostClient.createTeam` opts out of `withRetry` so a retried POST cannot double-create after a 5xx.

**Tech Stack:** TypeScript strict, DDD four-layer, vitest (in `src/`), bun:test (in `packages/bifrost-sdk/`), Atlas/Drizzle/Memory DB adapters behind `IDatabaseAccess`.

**Spec:** `docs/superpowers/specs/2026-04-17-bifrost-team-provisioning-hardening-design.md`

---

## File Structure

### Modify
- `packages/bifrost-sdk/src/BifrostClient.ts` — add `{ retry?: boolean }` option to `request`/`post`; `createTeam` passes `retry: false`.
- `src/Shared/Infrastructure/IDatabaseAccess.ts` — add `forUpdate(): IQueryBuilder` method to `IQueryBuilder`.
- `src/Shared/Infrastructure/Database/Adapters/Atlas/AtlasQueryBuilder.ts` — real row lock (use Atlas's `forUpdate()` if exposed; otherwise raw SQL passthrough).
- `src/Shared/Infrastructure/Database/Adapters/Drizzle/DrizzleQueryBuilder.ts` — `.for('update')` (Drizzle convention).
- `src/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess.ts` — no-op (memory DB is single-threaded); fluent return.
- `src/Modules/Organization/Domain/Repositories/IOrganizationRepository.ts` — add `findByIdForUpdate(id): Promise<Organization | null>`.
- `src/Modules/Organization/Infrastructure/Repositories/OrganizationRepository.ts` — implement `findByIdForUpdate`.
- `src/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService.ts` — inject `IDatabaseAccess`; wrap Team-binding in `db.transaction(…)` using `findByIdForUpdate`.
- `src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts` — pass `db` into `ProvisionOrganizationDefaultsService` construction.
- `src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts` — throw `GatewayError` on missing `gatewayTeamId`.

### Test files (modify / create)
- `packages/bifrost-sdk/__tests__/retry.createTeam.test.ts` — **create** — verify `createTeam` does not retry on 503; `createVirtualKey` still retries.
- `src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts` — update: replace the existing "naked org → creates unscoped key" test with two "throws" cases.
- `src/Modules/AppModule/__tests__/ProvisionOrganizationDefaultsService.test.ts` — update the idempotency test to also assert `findByIdForUpdate` path; add "second execute short-circuits after first wrote gatewayTeamId".
- Audit pass: `src/Modules/ApiKey/__tests__/CreateApiKeyService.test.ts`, `SetKeyPermissionsService.test.ts`, `RevokeApiKeyService.test.ts`, `UpdateApiKeyBudgetService.test.ts` — ensure mocks of `orgRepo.findById` return an org with `gatewayTeamId` set.
- Audit pass: `src/Modules/Organization/__tests__/CreateOrganizationService.test.ts`, `InviteMemberService.test.ts`, `RemoveMemberService.test.ts`, `AcceptInvitationService.test.ts` — these construct `ProvisionOrganizationDefaultsService`; constructor signature changes, so they need the new `db` argument.

---

## Task 1: SDK — `createTeam` opts out of retry

**Files:**
- Modify: `packages/bifrost-sdk/src/BifrostClient.ts`
- Create: `packages/bifrost-sdk/__tests__/retry.createTeam.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/bifrost-sdk/__tests__/retry.createTeam.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { BifrostClient } from '../src'

describe('BifrostClient.createTeam retry behavior', () => {
  let fetchCalls: number
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    fetchCalls = 0
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function mkClient() {
    return new BifrostClient({
      baseUrl: 'https://bifrost.example.com',
      masterKey: 'k',
      timeoutMs: 1_000,
      maxRetries: 3,
      retryBaseDelayMs: 1,
      proxyBaseUrl: 'https://bifrost.example.com',
    })
  }

  it('createTeam does NOT retry on 503', async () => {
    globalThis.fetch = mock(async () => {
      fetchCalls++
      return new Response('{"error":"upstream down"}', {
        status: 503,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch

    const client = mkClient()
    await expect(client.createTeam({ name: 'org-1' })).rejects.toThrow()
    expect(fetchCalls).toBe(1)
  })

  it('createVirtualKey still retries on 503', async () => {
    globalThis.fetch = mock(async () => {
      fetchCalls++
      return new Response('{"error":"upstream down"}', {
        status: 503,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch

    const client = mkClient()
    await expect(client.createVirtualKey({ name: 'k' })).rejects.toThrow()
    expect(fetchCalls).toBeGreaterThan(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/bifrost-sdk && bun test __tests__/retry.createTeam.test.ts`
Expected: `createTeam does NOT retry on 503` fails — `fetchCalls` will be 4 (1 + 3 retries).

- [ ] **Step 3: Implement the opt-out**

In `packages/bifrost-sdk/src/BifrostClient.ts`:

Update `createTeam` to pass `retry: false`:

```ts
async createTeam(request: CreateTeamRequest): Promise<BifrostTeam> {
  const response = await this.post<TeamResponse>(
    '/api/governance/teams',
    request,
    { retry: false },
  )
  return response.team
}
```

Update private `post` to accept and forward the option:

```ts
private async post<T>(path: string, body: unknown, opts?: { retry?: boolean }): Promise<T> {
  return this.request<T>('POST', path, body, opts)
}
```

Update private `request` to honor the opt-out:

```ts
private async request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { retry?: boolean },
): Promise<T> {
  const url = `${this.config.baseUrl}${path}`

  const run = async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    const bearer = this.config.masterKey?.trim()
    if (bearer) {
      headers.Authorization = `Bearer ${bearer}`
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeoutMs),
    })

    if (!response.ok) {
      let responseBody: unknown
      try {
        responseBody = await response.json()
      } catch {
        responseBody = await response.text().catch(() => null)
      }
      throw new BifrostApiError(response.status, path, `${method} request failed`, responseBody)
    }

    return response.json() as Promise<T>
  }

  if (opts?.retry === false) return run()
  return withRetry(run, {
    maxRetries: this.config.maxRetries,
    baseDelayMs: this.config.retryBaseDelayMs,
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/bifrost-sdk && bun test __tests__/retry.createTeam.test.ts`
Expected: both tests pass; `createTeam` fetchCalls === 1; `createVirtualKey` fetchCalls > 1.

- [ ] **Step 5: Run the full SDK test suite**

Run: `cd packages/bifrost-sdk && bun test`
Expected: all tests pass (existing smoke tests unaffected).

- [ ] **Step 6: Commit**

```bash
git add packages/bifrost-sdk/src/BifrostClient.ts packages/bifrost-sdk/__tests__/retry.createTeam.test.ts
git commit -m "fix: [bifrost-sdk] createTeam POST 不再被 withRetry 重送，避免 5xx 後重複建 Team"
```

---

## Task 2: `IQueryBuilder.forUpdate()` — interface + three adapters

**Files:**
- Modify: `src/Shared/Infrastructure/IDatabaseAccess.ts`
- Modify: `src/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess.ts`
- Modify: `src/Shared/Infrastructure/Database/Adapters/Atlas/AtlasQueryBuilder.ts`
- Modify: `src/Shared/Infrastructure/Database/Adapters/Drizzle/DrizzleQueryBuilder.ts`

No new tests for this task alone — behavior is covered by Task 4's provisioning tests.

- [ ] **Step 1: Add `forUpdate()` to `IQueryBuilder`**

In `src/Shared/Infrastructure/IDatabaseAccess.ts`, add to the `IQueryBuilder` interface (after `whereBetween`):

```ts
/**
 * Applies a row-level lock (SELECT ... FOR UPDATE) to the query.
 *
 * Must be invoked inside an open transaction (via {@link IDatabaseAccess.transaction}).
 * The lock is released when the transaction commits or rolls back.
 *
 * Memory adapter is single-threaded and treats this as a no-op.
 *
 * @returns Returns self to support chaining.
 */
forUpdate(): IQueryBuilder
```

- [ ] **Step 2: Implement `forUpdate()` in `MemoryDatabaseAccess`**

Open `src/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess.ts`. Locate the `MemoryQueryBuilder` class (same file or sibling). Add:

```ts
forUpdate(): IQueryBuilder {
  // Memory adapter is single-threaded; no-op.
  return this
}
```

Place it near the other fluent methods (`orderBy`, `whereBetween`).

- [ ] **Step 3: Implement `forUpdate()` in `AtlasQueryBuilder`**

Open `src/Shared/Infrastructure/Database/Adapters/Atlas/AtlasQueryBuilder.ts`. Atlas exposes `forUpdate()` on its query builder when available; if the instance supports it, delegate; otherwise record the flag and apply it at `first()`/`select()` time. Minimal add — store a flag and apply in the query execution chain:

```ts
private forUpdateFlag = false

forUpdate(): IQueryBuilder {
  this.forUpdateFlag = true
  return this
}
```

In the `first()` method body (around the existing `let query = ...table(this.tableName)` line), after applying where/order/limit/offset, apply the flag:

```ts
if (this.forUpdateFlag && typeof query.forUpdate === 'function') {
  query = query.forUpdate()
}
```

Apply the same guard inside `select()` if it has its own query construction path. If Atlas does not expose `forUpdate()` on the query builder, the flag is silently dropped — the failure mode is "no lock", which is the existing behavior. A TODO comment is acceptable here:

```ts
// Atlas <version> may not expose forUpdate(); fallback = no lock.
// Row-level serialization then relies on higher layers (advisory lock / app mutex).
```

- [ ] **Step 4: Implement `forUpdate()` in `DrizzleQueryBuilder`**

Open `src/Shared/Infrastructure/Database/Adapters/Drizzle/DrizzleQueryBuilder.ts`. Drizzle exposes `.for('update')` on select queries. Add flag + apply:

```ts
private forUpdateFlag = false

forUpdate(): IQueryBuilder {
  this.forUpdateFlag = true
  return this
}
```

When constructing the Drizzle query in `first()`/`select()`, apply `.for('update')` if the flag is set (only on SELECT, not INSERT/UPDATE). Example:

```ts
let q = db.select().from(table).where(this.buildWhere())
if (this.forUpdateFlag) q = q.for('update')
```

If the Drizzle version pinned in this project doesn't support `.for()`, fall back to raw SQL via `sql\`FOR UPDATE\`` appended to the query. Keep the behavior equivalent.

- [ ] **Step 5: Type check the shared layer**

Run: `bun run typecheck` (or `bunx tsc --noEmit`)
Expected: no type errors. Every `IQueryBuilder` implementor has a `forUpdate()` method.

- [ ] **Step 6: Commit**

```bash
git add src/Shared/Infrastructure/IDatabaseAccess.ts src/Shared/Infrastructure/Database/Adapters/
git commit -m "feat: [db] IQueryBuilder 新增 forUpdate() 支援 row-level 鎖定（Atlas/Drizzle 實作，Memory no-op）"
```

---

## Task 3: `IOrganizationRepository.findByIdForUpdate`

**Files:**
- Modify: `src/Modules/Organization/Domain/Repositories/IOrganizationRepository.ts`
- Modify: `src/Modules/Organization/Infrastructure/Repositories/OrganizationRepository.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/Modules/Organization/__tests__/OrganizationRepository.test.ts` (create the file if it does not exist):

```ts
import { describe, expect, it } from 'bun:test'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'

describe('OrganizationRepository.findByIdForUpdate', () => {
  it('returns the org by id (memory adapter treats forUpdate as no-op)', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new OrganizationRepository(db)
    await repo.save(Organization.create('org-x', 'org-x', ''))
    const org = await repo.findByIdForUpdate('org-x')
    expect(org).not.toBeNull()
    expect(org?.id).toBe('org-x')
  })

  it('returns null when org does not exist', async () => {
    const repo = new OrganizationRepository(new MemoryDatabaseAccess())
    expect(await repo.findByIdForUpdate('missing')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/Organization/__tests__/OrganizationRepository.test.ts`
Expected: fails — `findByIdForUpdate is not a function`.

- [ ] **Step 3: Add the interface method**

In `src/Modules/Organization/Domain/Repositories/IOrganizationRepository.ts`, add after `findById`:

```ts
/**
 * Finds an organization by id with a row-level lock (SELECT ... FOR UPDATE).
 *
 * MUST be called inside an open transaction — the lock is bound to the current
 * transaction and is released on commit/rollback.
 *
 * Used by ProvisionOrganizationDefaultsService to serialize concurrent
 * Bifrost Team provisioning attempts for the same organization.
 */
findByIdForUpdate(id: string): Promise<Organization | null>
```

- [ ] **Step 4: Implement in `OrganizationRepository`**

In `src/Modules/Organization/Infrastructure/Repositories/OrganizationRepository.ts`, add alongside `findById`:

```ts
async findByIdForUpdate(id: string): Promise<Organization | null> {
  const row = await this.db.table('organizations').where('id', '=', id).forUpdate().first()
  return row ? OrganizationMapper.toEntity(row) : null
}
```

- [ ] **Step 5: Run the test**

Run: `bun test src/Modules/Organization/__tests__/OrganizationRepository.test.ts`
Expected: both cases pass.

- [ ] **Step 6: Commit**

```bash
git add src/Modules/Organization/Domain/Repositories/IOrganizationRepository.ts src/Modules/Organization/Infrastructure/Repositories/OrganizationRepository.ts src/Modules/Organization/__tests__/OrganizationRepository.test.ts
git commit -m "feat: [organization] IOrganizationRepository 新增 findByIdForUpdate 供 provisioning 加鎖使用"
```

---

## Task 4: `ProvisionOrganizationDefaultsService` wraps Team-binding in transaction

**Files:**
- Modify: `src/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService.ts`
- Modify: `src/Modules/AppModule/__tests__/ProvisionOrganizationDefaultsService.test.ts`

- [ ] **Step 1: Update the failing test**

In `src/Modules/AppModule/__tests__/ProvisionOrganizationDefaultsService.test.ts`:

(a) Update the `setup` helper to pass `db` into the service constructor:

```ts
async function setup(orgId: string) {
  const db = new MemoryDatabaseAccess()
  const moduleRepo = new AppModuleRepository(db)
  const contractRepo = new ContractRepository(db)
  const subRepo = new ModuleSubscriptionRepository(db)
  const orgRepo = new OrganizationRepository(db)
  const gateway = new MockGatewayClient()
  await orgRepo.save(Organization.create(orgId, orgId, ''))
  const service = new ProvisionOrganizationDefaultsService(
    moduleRepo,
    contractRepo,
    subRepo,
    gateway,
    orgRepo,
    db,
  )
  return { service, moduleRepo, contractRepo, subRepo, orgRepo, gateway, db }
}
```

(b) Add a new test after the existing idempotency test:

```ts
test('第二次 execute 在 lock 下 re-read 到既有 gatewayTeamId，短路不再呼叫 ensureTeam', async () => {
  const { service, gateway } = await setup('org-short')
  await service.execute('org-short', 'user-1')
  const ensureCountAfterFirst = gateway.calls.ensureTeam.length
  expect(ensureCountAfterFirst).toBe(1)

  await service.execute('org-short', 'user-1')
  // 既有 gatewayTeamId 已寫入，transaction 內 re-read 命中後應短路。
  expect(gateway.calls.ensureTeam).toHaveLength(ensureCountAfterFirst)
  expect(gateway.calls.createTeam).toHaveLength(1)
})
```

Also update the existing `重複 provision 時 ensureTeam 不會建立第二個 Team（冪等）` test — it previously expected `ensureTeam` to be called twice. After the short-circuit, the second call should NOT invoke `ensureTeam`. Update:

```ts
test('重複 provision 時 ensureTeam 不會建立第二個 Team（冪等）', async () => {
  const { service, gateway } = await setup('org-retry')
  await service.execute('org-retry', 'user-1')
  await service.execute('org-retry', 'user-1')

  expect(gateway.calls.ensureTeam).toHaveLength(1) // was 2 before short-circuit
  expect(gateway.calls.createTeam).toHaveLength(1)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/Modules/AppModule/__tests__/ProvisionOrganizationDefaultsService.test.ts`
Expected:
- Compilation error: `ProvisionOrganizationDefaultsService` constructor does not accept a 6th argument.

- [ ] **Step 3: Update the service**

Replace `src/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService.ts` with:

```ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { Contract } from '@/Modules/Contract/Domain/Aggregates/Contract'
import type { IContractRepository } from '@/Modules/Contract/Domain/Repositories/IContractRepository'
import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
import { CORE_APP_MODULE_SPECS } from '../../Domain/CoreAppModules'
import { ModuleSubscription } from '../../Domain/Entities/ModuleSubscription'
import type { IAppModuleRepository } from '../../Domain/Repositories/IAppModuleRepository'
import type { IModuleSubscriptionRepository } from '../../Domain/Repositories/IModuleSubscriptionRepository'
import { EnsureCoreAppModulesService } from './EnsureCoreAppModulesService'

const DEFAULT_CONTRACT_TERMS = {
  creditQuota: 0,
  allowedModules: [...CORE_APP_MODULE_SPECS.map((s) => s.name)],
  rateLimit: { rpm: 10_000, tpm: 10_000_000 },
  validityPeriod: { startDate: '2020-01-01', endDate: '2099-12-31' },
}

export class ProvisionOrganizationDefaultsService {
  constructor(
    private readonly moduleRepo: IAppModuleRepository,
    private readonly contractRepo: IContractRepository,
    private readonly subRepo: IModuleSubscriptionRepository,
    private readonly gatewayClient: ILLMGatewayClient,
    private readonly orgRepo: IOrganizationRepository,
    private readonly db: IDatabaseAccess,
  ) {}

  async execute(orgId: string, createdByUserId: string): Promise<void> {
    await new EnsureCoreAppModulesService(this.moduleRepo).execute()

    // Bifrost Team binding — serialized per orgId via SELECT ... FOR UPDATE.
    // Re-read inside the lock lets a second concurrent provisioner short-circuit
    // once the first one has written gatewayTeamId. Bifrost POST is not retried
    // (see BifrostClient.createTeam), so a 5xx cannot double-create.
    await this.db.transaction(async (tx) => {
      const orgRepo = this.orgRepo.withTransaction(tx)
      const org = await orgRepo.findByIdForUpdate(orgId)
      if (!org) return
      if (org.gatewayTeamId) return
      try {
        const team = await this.gatewayClient.ensureTeam({ name: orgId })
        await orgRepo.update(org.attachGatewayTeam(team.id))
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('[ProvisionOrganizationDefaults] Failed to ensure Bifrost Team', {
          orgId,
          error: message,
        })
      }
    })

    const existing = await this.contractRepo.findActiveByTargetId(orgId)
    if (existing) return

    const contract = Contract.create({
      targetType: 'organization',
      targetId: orgId,
      terms: { ...DEFAULT_CONTRACT_TERMS },
      createdBy: createdByUserId,
    }).activate()
    await this.contractRepo.save(contract)

    for (const spec of CORE_APP_MODULE_SPECS) {
      const mod = await this.moduleRepo.findByName(spec.name)
      if (!mod) continue
      const sub = ModuleSubscription.create(orgId, mod.id)
      await this.subRepo.save(sub)
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/Modules/AppModule/__tests__/ProvisionOrganizationDefaultsService.test.ts`
Expected: all four tests pass, including:
- first-provision writes `gatewayTeamId` = `mock_team_000001`.
- Second provision short-circuits (ensureTeam called once total).
- Failure-then-recover still works (first attempt fails, second attempt writes).

- [ ] **Step 5: Commit**

```bash
git add src/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService.ts src/Modules/AppModule/__tests__/ProvisionOrganizationDefaultsService.test.ts
git commit -m "fix: [app-module] provisioning 以 transaction + findByIdForUpdate 序列化 Bifrost Team 綁定"
```

---

## Task 5: Wire `db` into `AppModuleServiceProvider`

**Files:**
- Modify: `src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts`

- [ ] **Step 1: Update the provider binding**

In `src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts`, add `IDatabaseAccess` import and pass `db` as the 6th arg:

```ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
// ...existing imports...
```

Update the `provisionOrganizationDefaultsService` singleton registration:

```ts
container.singleton('provisionOrganizationDefaultsService', (c: IContainer) =>
  new ProvisionOrganizationDefaultsService(
    c.make('appModuleRepository') as IAppModuleRepository,
    c.make('contractRepository') as IContractRepository,
    c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository,
    c.make('llmGatewayClient') as ILLMGatewayClient,
    c.make('organizationRepository') as IOrganizationRepository,
    getCurrentDatabaseAccess() as IDatabaseAccess,
  )
)
```

`getCurrentDatabaseAccess` is already imported at the top of the file.

- [ ] **Step 2: Run app-module + organization tests**

Run: `bun test src/Modules/AppModule src/Modules/Organization`
Expected: all passing. If any Organization test (`CreateOrganizationService.test.ts`, `InviteMemberService.test.ts`, `RemoveMemberService.test.ts`, `AcceptInvitationService.test.ts`) constructs `ProvisionOrganizationDefaultsService` directly, those tests must be updated to pass a `MemoryDatabaseAccess` as the 6th argument — do that now.

For each failing constructor call:
```ts
// before
new ProvisionOrganizationDefaultsService(moduleRepo, contractRepo, subRepo, gateway, orgRepo)
// after
new ProvisionOrganizationDefaultsService(moduleRepo, contractRepo, subRepo, gateway, orgRepo, db)
```

If `db` is not already in scope in that test, instantiate one: `const db = new MemoryDatabaseAccess()` and share it with the repos that need it.

- [ ] **Step 3: Commit**

```bash
git add src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts src/Modules/Organization/__tests__/
git commit -m "chore: [app-module] AppModuleServiceProvider 注入 db 至 ProvisionOrganizationDefaultsService，更新相依測試"
```

---

## Task 6: Fail-closed key issuance in `ApiKeyBifrostSync`

**Files:**
- Modify: `src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts`
- Modify: `src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts`

- [ ] **Step 1: Update the test — replace "unscoped key" with "throws"**

In `src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts`:

Delete the existing "org 尚未 provision 完 gatewayTeamId 時，createVirtualKey 仍會建立 key 但不帶 teamId" test (lines 39-44). Replace with:

```ts
it('createVirtualKey 在 org 不存在時拋 GatewayError(VALIDATION)', async () => {
  const { GatewayError } = await import(
    '@/Foundation/Infrastructure/Services/LLMGateway/errors'
  )
  await expect(sync.createVirtualKey('k', 'org-missing')).rejects.toBeInstanceOf(GatewayError)
  await expect(sync.createVirtualKey('k', 'org-missing')).rejects.toMatchObject({
    code: 'VALIDATION',
  })
  expect(mock.calls.createKey).toHaveLength(0)
})

it('createVirtualKey 在 org.gatewayTeamId 為 null 時拋 GatewayError(VALIDATION)', async () => {
  const { GatewayError } = await import(
    '@/Foundation/Infrastructure/Services/LLMGateway/errors'
  )
  const naked = Organization.create('org-naked', 'org-naked', '')
  await orgRepo.save(naked)
  await expect(sync.createVirtualKey('k', 'org-naked')).rejects.toBeInstanceOf(GatewayError)
  expect(mock.calls.createKey).toHaveLength(0)
})
```

Also update the happy-path test to assert `teamId` is always present (no conditional):

```ts
it('createVirtualKey 應呼叫 gateway 並以 org 的 gatewayTeamId 作為 teamId', async () => {
  const result = await sync.createVirtualKey('My Key', 'org-1')
  expect(result.gatewayKeyId).toBe('mock_vk_000001')
  expect(result.gatewayKeyValue).toBe('mock_raw_key_000001')
  expect(mock.calls.createKey[0].name).toBe('My Key')
  expect(mock.calls.createKey[0].teamId).toBe('gateway-team-org-1')
  expect(mock.calls.createKey[0].customerId).toBeUndefined()
  expect(mock.calls.createKey[0].keyIds).toEqual(['*'])
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts`
Expected: the two new "throws" tests fail — the current implementation logs-and-continues.

- [ ] **Step 3: Update the implementation**

Replace `createVirtualKey` in `src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts`:

```ts
async createVirtualKey(
  label: string,
  orgId: string,
  options?: CreateVirtualKeyOptions,
): Promise<CreateVirtualKeyResult> {
  const org = await this.orgRepo.findById(orgId)
  const teamId = org?.gatewayTeamId
  if (!teamId) {
    const { GatewayError } = await import(
      '@/Foundation/Infrastructure/Services/LLMGateway/errors'
    )
    throw new GatewayError(
      `Organization ${orgId} has no Bifrost Team binding; re-run provisioning before issuing keys.`,
      'VALIDATION',
      0,
      false,
    )
  }
  const vk = await this.gatewayClient.createKey({
    name: label,
    keyIds: ['*'],
    teamId,
    ...(options?.budget != null && {
      budget: {
        maxLimit: options.budget.maxLimit,
        resetDuration: options.budget.resetDuration,
      },
    }),
  })
  return {
    gatewayKeyId: vk.id,
    gatewayKeyValue: vk.value ?? '',
  }
}
```

Notes:
- The conditional spread for `teamId` is removed — it's always a string after the guard.
- The stale comment (lines 22-24 of the original) about "log 警告並以無 team_id 方式建立" is deleted.
- Use a static import at the top of the file instead of dynamic `await import` if the adapter already imports from `../errors`:

```ts
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway/errors'
```

Then just `throw new GatewayError(...)` inline. Adjust whichever matches current file style.

- [ ] **Step 4: Run the file's tests**

Run: `bun test src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Audit ApiKey service tests**

Run: `bun test src/Modules/ApiKey`
Expected: tests that mock `orgRepo.findById` but don't set `gatewayTeamId` will now fail (they reach `createVirtualKey`). Fix by updating fixtures:

- `src/Modules/ApiKey/__tests__/CreateApiKeyService.test.ts`
- `src/Modules/ApiKey/__tests__/SetKeyPermissionsService.test.ts`
- `src/Modules/ApiKey/__tests__/RevokeApiKeyService.test.ts`
- `src/Modules/ApiKey/__tests__/UpdateApiKeyBudgetService.test.ts`
- `src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts` — already fixed above.

In each affected test, find the organization fixture and ensure it's built via `.attachGatewayTeam('gateway-team-<orgId>')`:

```ts
// before
await orgRepo.save(Organization.create('org-1', 'org-1', ''))
// after
await orgRepo.save(
  Organization.create('org-1', 'org-1', '').attachGatewayTeam('gateway-team-org-1'),
)
```

Apply only where the test exercises a code path that reaches `createVirtualKey`.

- [ ] **Step 6: Re-run ApiKey tests**

Run: `bun test src/Modules/ApiKey`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/Modules/ApiKey/
git commit -m "fix: [api-key] ApiKeyBifrostSync 在缺少 gatewayTeamId 時 fail-closed 拋 GatewayError"
```

---

## Task 7: Full-suite verification

- [ ] **Step 1: Run the whole backend test suite**

Run: `bun test`
Expected: green.

- [ ] **Step 2: Run the SDK test suite**

Run: `cd packages/bifrost-sdk && bun test`
Expected: green.

- [ ] **Step 3: Type check**

Run: `bunx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: (Optional) manual smoke of integration tests**

If `packages/bifrost-sdk/__tests__/teams.integration.test.ts` is runnable against a local Bifrost, run it to confirm no regression in live Team create/list.

- [ ] **Step 5: Final review commit (if anything remains to clean up)**

If any test imports / lint issues surfaced, fix and commit as:
```bash
git commit -m "chore: clean up after Bifrost Team provisioning hardening"
```

---

## Self-Review (done during plan writing)

**Spec coverage:**
- Spec §1 (fail-closed key issuance) → Task 6. ✓
- Spec §2 (atomic ensureTeam via DB lock) → Tasks 2, 3, 4. ✓
- Spec §3 (disable createTeam POST retry) → Task 1. ✓
- Spec §4 (wiring) → Task 5. ✓
- Spec §Tests — all listed test files covered across Tasks 1, 4, 6. ✓

**Placeholder scan:** one intentional fallback note in Task 2 Step 3 ("if Atlas does not expose forUpdate, fallback = no lock") — this is a real runtime concern documented with a comment, not a TBD; the runtime guard `typeof query.forUpdate === 'function'` makes the code safe. No other placeholders.

**Type consistency:**
- `findByIdForUpdate(id: string): Promise<Organization | null>` — same signature in Task 3 Steps 3 & 4, used in Task 4 Step 3. ✓
- `GatewayError` constructor args `(message, code, status, retryable)` — matches existing `errors.ts` usage seen in `BifrostGatewayAdapter` and `MockGatewayClient`. ✓
- `forUpdate(): IQueryBuilder` — same signature added to interface (Task 2 Step 1) and every adapter (Steps 2-4). ✓
