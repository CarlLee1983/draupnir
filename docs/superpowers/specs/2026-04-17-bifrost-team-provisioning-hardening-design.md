# Bifrost Team Provisioning Hardening — Design

**Date**: 2026-04-17
**Status**: Draft (awaiting implementation)
**Origin**: Codex adversarial review of working-tree diff (session `019d9ace-28e9-7830-801c-c65c93b401e4`), two high-severity findings.

## Goal

Close two high-severity correctness defects introduced by the Bifrost Team provisioning change:

1. Key issuance must fail closed when an organization has no persisted `gatewayTeamId`, rather than silently creating a Virtual Key with no Team binding.
2. `ensureTeam` must not create duplicate Teams under concurrent provisioning or SDK-level POST retries.

## Scope

- Pre-production only. No live orgs exist, so no legacy backfill command and no zero-downtime migration are required.
- No new `provisioning_status` column on `organizations`. Current "log + continue" behavior on `ensureTeam` failure is preserved, because the fail-closed key-issuance change is sufficient to prevent unsafe keys.
- Out of scope: extending the same guarantees to Virtual Key creation, Bifrost server-side idempotency-key support, admin reconciliation UI.

## Context

The change set under review adds `organizations.gateway_team_id` (nullable), provisions a Bifrost Team during `ProvisionOrganizationDefaultsService`, and passes `team_id` into `createVirtualKey`. The review flagged:

- `ApiKeyBifrostSync.createVirtualKey` (src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts:22-35) — logs a warning and still creates an unscoped key when `gatewayTeamId` is missing.
- `BifrostGatewayAdapter.ensureTeam` (src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts:32-44) — non-atomic list-then-create; no server-side idempotency key; `withRetry` on POST can double-create on 5xx.

Two independent races:

- **Race A — concurrent provisioners**: two `ProvisionOrganizationDefaultsService.execute` calls for the same orgId both see an empty `listTeams` and both POST `createTeam`.
- **Race B — SDK retry after 5xx**: a single `createTeam` POST that the Bifrost server processed but returned 502/503/504 is re-POSTed by `withRetry`, creating a duplicate Team.

## Design

### 1. Fail-closed key issuance

**File**: `src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts`

Replace the warn-log fallback with a hard failure:

- If `org` is null OR `org.gatewayTeamId` is null → throw `GatewayError('VALIDATION', ...)` with a clear operator message (`Organization <orgId> has no Bifrost Team binding; re-run provisioning before issuing keys.`).
- Remove the conditional spread on `teamId`; after the guard it is always a string.

Why `GatewayError` and not a domain error: the gateway error taxonomy already flows cleanly through `CreateApiKeyService` and the HTTP controller into a structured 4xx response. Introducing a new error type would ripple through more layers for no semantic gain. `VALIDATION` is the closest fit because the caller-supplied identifier resolves to an unusable organization state.

**Test changes**:
- `src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts` — add cases: `findById` returns null → throws; org has null `gatewayTeamId` → throws; happy path asserts `teamId` always present in the createKey call.
- Other ApiKey service tests — audit mocks; any org fixture that previously omitted `gatewayTeamId` must now set one, because the path to `createVirtualKey` is now blocked without it.

### 2. Atomic `ensureTeam` — per-org DB lock

**Interface change**: `src/Modules/Organization/Domain/Repositories/IOrganizationRepository.ts`

Add:
```ts
findByIdForUpdate(id: string): Promise<Organization | null>
```

**Impl**: `src/Modules/Organization/Infrastructure/Repositories/OrganizationRepository.ts`

Use Atlas's query builder row-lock syntax (`forUpdate()` if available, otherwise `db.raw('SELECT ... FOR UPDATE')` inside the existing transaction). The method MUST only be callable inside an open transaction — document this in the interface.

**Service change**: `src/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService.ts`

Inject the transaction runner (probably `IDatabaseAccess` with a `.transaction()` helper — confirm during implementation; if the repo already exposes `withTransaction` the runner is separate). Wrap the Team-binding block:

```ts
await this.db.transaction(async (tx) => {
  const orgRepo = this.orgRepo.withTransaction(tx)
  const org = await orgRepo.findByIdForUpdate(orgId)
  if (!org) return                                // log + skip
  if (org.gatewayTeamId) return                   // already provisioned
  try {
    const team = await this.gatewayClient.ensureTeam({ name: orgId })
    await orgRepo.update(org.attachGatewayTeam(team.id))
  } catch (error) {
    // Preserve existing log-and-continue behavior.
    console.error('[ProvisionOrganizationDefaults] Failed to ensure Bifrost Team', {
      orgId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
})
```

Rationale:
- The `SELECT ... FOR UPDATE` serializes any other `ProvisionOrganizationDefaultsService.execute` call for the same orgId until this transaction commits.
- The post-lock re-read handles the "someone already provisioned it" case without re-calling Bifrost.
- The existing `BifrostGatewayAdapter.ensureTeam` (list-then-create) remains — it is now a cheap belt-and-braces check that also recovers when a prior attempt succeeded on the gateway but crashed before persisting `gatewayTeamId`.
- Portable row lock chosen over PG advisory lock to avoid coupling domain logic to Postgres-specific features.

### 3. Disable retry on `createTeam` POST

**File**: `packages/bifrost-sdk/src/BifrostClient.ts`

Add an optional `{ retry?: boolean }` to the private `request`/`post` methods. Default `true` (no behavior change for existing callers). `createTeam` invokes `post` with `retry: false`.

```ts
async createTeam(request: CreateTeamRequest): Promise<BifrostTeam> {
  const response = await this.post<TeamResponse>(
    '/api/governance/teams',
    request,
    { retry: false },
  )
  return response.team
}

private async post<T>(path: string, body: unknown, opts?: { retry?: boolean }): Promise<T> {
  return this.request<T>('POST', path, body, opts)
}

private async request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: { retry?: boolean },
): Promise<T> {
  const run = async () => { /* ...existing fetch logic... */ }
  if (opts?.retry === false) return run()
  return withRetry(run, {
    maxRetries: this.config.maxRetries,
    baseDelayMs: this.config.retryBaseDelayMs,
  })
}
```

`listTeams` stays retryable — GETs are idempotent. `createVirtualKey` also stays retryable for now; tightening it is listed as a follow-up (out of scope).

Why not fix server-side: Bifrost SDK does not expose an `Idempotency-Key` header and server-side idempotency is a cross-team change. Disabling retry for the single unsafe POST is a minimal, local fix that fully closes Race B.

**Test**: `packages/bifrost-sdk/__tests__/` — add a test that simulates a 503 response and asserts `createTeam` throws after one attempt; optionally assert `createVirtualKey` still retries on the same fixture for regression coverage.

### 4. Wiring

**File**: `src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts`

Add the transaction runner / `IDatabaseAccess` dependency when constructing `ProvisionOrganizationDefaultsService`.

## Execution order

1. SDK retry opt-out (`BifrostClient`) + its unit test.
2. Repository: `findByIdForUpdate` on interface + impl.
3. Provisioning: transaction wrapper; concurrency test with two overlapping `execute` calls.
4. Fail-closed key sync + audit of existing ApiKey tests.
5. Wiring in service provider.
6. Full type check + test suite green.

Each step is independently testable.

## Tests (new / updated)

- `packages/bifrost-sdk/__tests__/BifrostClient.createTeam.test.ts` — 503 → throws immediately (no retry); GET still retries.
- `src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts` — null org / null `gatewayTeamId` → `GatewayError` thrown; happy path always sends `teamId`.
- `src/Modules/AppModule/__tests__/ProvisionOrganizationDefaultsService.test.ts` — concurrency test using Promise.all of two `execute(orgId, userId)` calls; assert gateway `ensureTeam`/`createTeam` invocation count ≤ 1.
- Audit pass across ApiKey service tests for mocks missing `gatewayTeamId`.

## Risks

- **Atlas row-lock API**: `forUpdate()` may not be exposed by Atlas's query builder. Fallback: `db.raw('SELECT ... FOR UPDATE')` inside the transaction. Verify during implementation; the spec does not hinge on the exact syntax, only on the row-lock guarantee.
- **Transaction runner location**: `ProvisionOrganizationDefaultsService` currently has no DB dependency. The new injection must stay within the existing DI contract — confirm how other services inject a transaction runner (likely `IDatabaseAccess`).

## Estimated footprint

Approximately 250 lines across 6 files, weighted toward tests. Implementation changes are small (< 80 net lines of production code).

## References

- Codex adversarial review output, 2026-04-17 (session `019d9ace-28e9-7830-801c-c65c93b401e4`).
- Related prior spec: `2026-04-10-llm-gateway-abstraction-design.md`.
