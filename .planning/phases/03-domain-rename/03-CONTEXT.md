---
phase: 03-domain-rename
created: "2026-04-10"
status: ready-for-research
---

# Phase 3: Domain Rename — Context

## Phase Goal

Remove all Bifrost-specific TypeScript field names from domain and application layers.
After this phase, `grep -r "bifrostVirtualKeyId\|bifrostKeyValue" src/` returns zero matches.
The DB column `bifrost_virtual_key_id` is **unchanged** — no migration file.

## Decisions

### D-P03-01: Full rename scope — both `bifrostVirtualKeyId` and `bifrostKeyValue`

**Decision:** Phase 3 renames BOTH fields, not just `bifrostVirtualKeyId`.

- `bifrostVirtualKeyId` → `gatewayKeyId` everywhere in TypeScript source
- `bifrostKeyValue` → `gatewayKeyValue` everywhere in TypeScript source
- `previousBifrostVirtualKeyId` → `previousGatewayKeyId` (AppApiKey aggregate and events)

**Why:** Mixed naming (`{ gatewayKeyId, bifrostKeyValue }`) is awkward after renaming only half. Clean sweep now avoids a follow-up rename in Phase 4.

**Scope:** All TypeScript source files under `src/` — domain aggregates, sync service return types, application services, DTOs, events, tests.

### D-P03-02: DB column name is frozen

**Decision:** The Drizzle schema column `bifrost_virtual_key_id` stays exactly as-is. No DB migration is created. The repository row-mapping code changes the TS field name on both sides of the mapping:

```ts
// Before
bifrostVirtualKeyId: row.bifrost_virtual_key_id as string,
// After
gatewayKeyId: row.bifrost_virtual_key_id as string,

// And the reverse (toRow/toDB):
// Before
bifrost_virtual_key_id: this.props.bifrostVirtualKeyId,
// After
bifrost_virtual_key_id: this.props.gatewayKeyId,
```

### D-P03-03: Sync service interface return types updated

**Decision:** The `createVirtualKey()` return shape in both sync interfaces (`IAppKeySyncService` / inline return type in `AppKeyBifrostSync` and `ApiKeyBifrostSync`) changes to:

```ts
{ gatewayKeyId: string, gatewayKeyValue: string }
```

All call sites that destructure the old shape are updated in the same pass.

### D-P03-04: AppApiKeyEvents rotation event updated

**Decision:** `AppApiKeyEvents.ts` (the `AppKeyRotated` event payload) renames:
- `bifrostVirtualKeyId` → `gatewayKeyId`
- `previousBifrostVirtualKeyId` → `previousGatewayKeyId`

Any consumers of these events (subscribed handlers in ServiceProviders) are updated in the same pass.

### D-P03-05: SdkApiDTO updated

**Decision:** `SdkApiDTO.ts` renames `bifrostVirtualKeyId` → `gatewayKeyId`. All call sites that read `auth.bifrostVirtualKeyId` (e.g., `ProxyModelCall.ts`, `QueryUsage.ts`) are updated to `auth.gatewayKeyId`.

### D-P03-06: No parallelization within this phase

**Decision:** Plans execute sequentially (Wave 1 only). The rename touches shared type contracts — aggregates must be renamed before downstream call sites. Suggested plan split:

1. **Plan 03-01** — Domain aggregates + repository row mapping (`ApiKey.ts`, `AppApiKey.ts`, both repo implementations)
2. **Plan 03-02** — Sync service interfaces + return types + event payloads (`ApiKeyBifrostSync.ts`, `AppKeyBifrostSync.ts`, `AppApiKeyEvents.ts`, all call sites that destructure `createVirtualKey()` return value)
3. **Plan 03-03** — DTOs + application service call sites + tests (`SdkApiDTO.ts`, all `.bifrostVirtualKeyId` / `.bifrostKeyValue` references in application services and test files)

**Note to planner:** Plans 03-02 and 03-03 depend on 03-01 (aggregates must expose `gatewayKeyId` before call sites reference it). Treat as Wave 1 → Wave 2 structure where 03-01 is Wave 1 and 03-02/03-03 can run in parallel as Wave 2.

## Reference: Files to Touch

### Domain Aggregates (Plan 03-01)
- `src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts` — props interface, getter, fromRow, toRow
- `src/Modules/AppApiKey/Domain/Aggregates/AppApiKey.ts` — props interface, getters, fromRow, toRow (including `previousGatewayKeyId`)
- `src/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository.ts` (all ORM variants if any)
- `src/Modules/AppApiKey/Infrastructure/Repositories/AppApiKeyRepository.ts`

### Sync Services + Events (Plan 03-02)
- `src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts` — return type + method param names
- `src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts` — return type + method param names
- `src/Modules/AppApiKey/Domain/Events/AppApiKeyEvents.ts` — rotation event payload fields
- Call sites that destructure `{ bifrostVirtualKeyId, bifrostKeyValue }` from `createVirtualKey()`:
  - `src/Modules/ApiKey/Application/Services/CreateApiKeyService.ts`
  - `src/Modules/AppApiKey/Application/Services/IssueAppKeyService.ts`
  - `src/Modules/AppApiKey/Application/Services/RotateAppKeyService.ts`

### DTOs + Application Services + Tests (Plan 03-03)
- `src/Modules/SdkApi/Application/DTOs/SdkApiDTO.ts`
- `src/Modules/SdkApi/Application/UseCases/AuthenticateApp.ts`
- `src/Modules/SdkApi/Application/UseCases/ProxyModelCall.ts`
- `src/Modules/SdkApi/Application/UseCases/QueryUsage.ts`
- `src/Modules/ApiKey/Application/Services/RevokeApiKeyService.ts`
- `src/Modules/ApiKey/Application/Services/SetKeyPermissionsService.ts`
- `src/Modules/AppApiKey/Application/Services/RevokeAppKeyService.ts`
- `src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts`
- `src/Modules/Credit/Application/Services/HandleCreditToppedUpService.ts`
- `src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts`
- `src/Modules/Dashboard/Application/Services/GetUsageChartService.ts`
- All test files with `bifrostVirtualKeyId` or `bifrostKeyValue` references (~40 occurrences across 15 files)

## Constraints (Inherited from Prior Phases)

- **No DB migration** — `bifrost_virtual_key_id` column name is frozen (AGENTS.md, CLAUDE.md)
- **No HTTP API changes** — external response shapes unchanged
- **bun test must pass** at each plan boundary
- **bun run typecheck** must pass at each plan boundary
- Commit format: `feat: [ phase-03 ] <description>`

## Verification Criteria

```bash
# Must return zero matches after Phase 3
grep -r "bifrostVirtualKeyId\|bifrostKeyValue\|previousBifrostVirtualKeyId" src/

# Must still pass
bun test
bun run typecheck
```
