# Roadmap: Draupnir — LLM Gateway Abstraction

## Overview

This milestone decouples Draupnir's business layer from the `BifrostClient` concrete class by introducing an `ILLMGatewayClient` interface and a `BifrostGatewayAdapter`, migrating all application-layer consumers to the interface, renaming the one gateway-specific domain field to gateway-neutral vocabulary, extracting `BifrostClient` into a standalone Bun workspace package, and verifying the full test suite passes throughout. The old Bifrost path keeps working until the last phase deletes it — there is no big-bang cutover.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Gateway Foundation** - Define the interface, adapter, mock, and register the singleton — no business-layer changes yet (completed 2026-04-10)
- [ ] **Phase 2: Business-Layer Migration** - Migrate all application services and wire functions to inject `ILLMGatewayClient`; rewrite tests to mock the interface
- [ ] **Phase 3: Domain Rename** - Rename `bifrostVirtualKeyId` → `gatewayKeyId` in TS domain aggregates and repositories; no DB migration
- [ ] **Phase 4: SDK Extraction** - Move `BifrostClient` into `packages/bifrost-sdk/` Bun workspace package; update all imports
- [ ] **Phase 5: Final Verification** - Grep-verify zero business-layer Bifrost imports, run full lint/typecheck/unit/feature/E2E, update CONCERNS.md

## Phase Details

### Phase 1: Gateway Foundation
**Goal**: The `ILLMGatewayClient` abstraction layer exists and is registered in the DI container, so both `BifrostClient` and the interface coexist with zero business-layer changes.
**Depends on**: Nothing (first phase)
**Requirements**: IFACE-01, IFACE-02, IFACE-03, IFACE-04, ADAPT-01, ADAPT-02, ADAPT-03, ADAPT-04, ADAPT-05, ADAPT-06, WIRE-01
**Success Criteria** (what must be TRUE):
  1. `src/Foundation/Infrastructure/Services/LLMGateway/` exists with `ILLMGatewayClient.ts`, `types.ts`, `errors.ts`, `index.ts`, and `implementations/` containing `BifrostGatewayAdapter.ts` and `MockGatewayClient.ts`
  2. `BifrostGatewayAdapter` unit tests pass and verify snake_case → camelCase mapping for all four interface methods and error translation to `GatewayError`
  3. `MockGatewayClient` unit tests pass and verify in-memory behavior with no HTTP calls
  4. `llmGatewayClient` singleton resolves from the DI container and returns a `BifrostGatewayAdapter` instance
  5. Full Bun unit + feature test suite passes unchanged (existing `BifrostClient` path untouched)
**Plans**: 4 plans
Plans:
- [x] 01-01-PLAN.md — Interface contracts: ILLMGatewayClient, DTOs, GatewayError, barrel export
- [x] 01-02-PLAN.md — BifrostGatewayAdapter implementation + unit tests
- [x] 01-03-PLAN.md — MockGatewayClient implementation + unit tests
- [x] 01-04-PLAN.md — DI registration in FoundationServiceProvider + human verification

### Phase 2: Business-Layer Migration
**Goal**: All application services and wire functions use `ILLMGatewayClient` — no file under `src/Modules/` or `src/Foundation/Application/` has a constructor parameter typed as `BifrostClient`.
**Depends on**: Phase 1
**Requirements**: MIGRATE-01, MIGRATE-02, MIGRATE-03, MIGRATE-04, MIGRATE-05, MIGRATE-06, MIGRATE-07, MIGRATE-08, MIGRATE-09, WIRE-02, WIRE-03, WIRE-04, WIRE-05, WIRE-06, TEST-01, TEST-03
**Success Criteria** (what must be TRUE):
  1. `AppKeyBifrostSync`, `ApiKeyBifrostSync`, `GetAppKeyUsageService`, `QueryUsage`, `UsageAggregator`, `HandleBalanceDepletedService`, and `HandleCreditToppedUpService` each accept `ILLMGatewayClient` in their constructor — no `BifrostClient` type reference in their source files
  2. `wireAppApiKey`, `wireApiKey`, `wireSdkApi`, `wireDashboard`, and `wireCredit` resolve `llmGatewayClient` from the container (not `bifrostClient`) when constructing the migrated services
  3. `ApiKeyBifrostSync.syncPermissions` uses `ILLMGatewayClient.updateKey({providerConfigs, rateLimit})` and preserves the existing model-allowlist + rate-limit sync behavior
  4. All tests that previously mocked `BifrostClient` now mock `ILLMGatewayClient` or use `MockGatewayClient` — the old `vi.fn()` mocks of concrete Bifrost methods are gone from those files
  5. Full Bun unit + feature test suite passes (including `routes-connectivity.test.ts` and `routes-existence.test.ts`) — all HTTP routes respond correctly
**UI hint**: no
**Plans**: TBD

### Phase 3: Domain Rename
**Goal**: The gateway-specific field name `bifrostVirtualKeyId` no longer exists in TypeScript source; all domain aggregates, repositories, and call sites use `gatewayKeyId`, while the DB column `bifrost_virtual_key_id` is unchanged.
**Depends on**: Phase 2
**Requirements**: RENAME-01, RENAME-02, RENAME-03, RENAME-04
**Success Criteria** (what must be TRUE):
  1. `AppApiKey` aggregate and `ApiKey` aggregate expose `gatewayKeyId` (not `bifrostVirtualKeyId`) — verified by reading their source files
  2. `AppApiKeyRepository` and `ApiKeyRepository` (all ORM variants) map `gatewayKeyId` to the existing DB column `bifrost_virtual_key_id` — no DB migration file exists
  3. `grep -r bifrostVirtualKeyId src/` returns zero matches
  4. Full Bun unit + feature test suite passes unchanged
**UI hint**: no
**Plans**: TBD

### Phase 4: SDK Extraction
**Goal**: `BifrostClient` lives in `packages/bifrost-sdk/` as a standalone Bun workspace package; `src/Foundation/Infrastructure/Services/BifrostClient/` is deleted; all imports in Draupnir and the adapter use the workspace package.
**Depends on**: Phase 3
**Requirements**: SDK-01, SDK-02, SDK-03, SDK-04, SDK-05, SDK-06
**Success Criteria** (what must be TRUE):
  1. `packages/bifrost-sdk/` builds independently (`bun run build` inside the package succeeds) and has at least one smoke test that passes without importing anything from `src/`
  2. Root `package.json` declares `packages/*` workspaces; `BifrostGatewayAdapter` imports `BifrostClient` from `@draupnir/bifrost-sdk` (or agreed scope) via `workspace:*`
  3. `src/Foundation/Infrastructure/Services/BifrostClient/` directory does not exist; `grep -r "Services/BifrostClient" src/` returns zero matches
  4. The hardcoded Bifrost proxy URL previously in `SdkApiServiceProvider` is now sourced from `bifrost-sdk` config; `ProxyModelCall` continues to work and its existing tests pass
  5. Full Bun unit + feature test suite passes with the new import paths
**UI hint**: no
**Plans**: TBD

### Phase 5: Final Verification
**Goal**: The milestone is provably complete — zero gateway-specific imports in business layer, all quality gates pass, and CONCERNS.md reflects the resolved state.
**Depends on**: Phase 4
**Requirements**: TEST-02, TEST-04, QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05
**Success Criteria** (what must be TRUE):
  1. `grep -rn "BifrostClient\|bifrostClient" src/Modules/ src/Foundation/Application/` (excluding `bifrost-sdk` and adapter) returns zero matches
  2. `bun run lint` (Biome, workspace-wide including `packages/bifrost-sdk/`) exits clean with zero errors or warnings
  3. `bun run typecheck` (`tsc --noEmit`, workspace-wide) exits clean; diff review confirms no new `any` or `@ts-ignore` introduced by this milestone
  4. Playwright E2E suite (`bun run test:e2e`) passes unchanged — all critical user flows verified
  5. `.planning/codebase/CONCERNS.md` items #1 (Bifrost coupling), #2 (snake_case leakage), and #3 (missing abstraction) are updated to reflect resolved state with phase references
**UI hint**: no
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Gateway Foundation | 4/4 | Complete   | 2026-04-10 |
| 2. Business-Layer Migration | 0/TBD | Not started | - |
| 3. Domain Rename | 0/TBD | Not started | - |
| 4. SDK Extraction | 0/TBD | Not started | - |
| 5. Final Verification | 0/TBD | Not started | - |
