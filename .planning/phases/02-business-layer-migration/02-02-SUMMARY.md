---
phase: 02-business-layer-migration
plan: "02"
subsystem: ApiKey
tags: [migration, llm-gateway, di-wiring, test-migration]
dependency_graph:
  requires: [Phase 01 — ILLMGatewayClient interface, MockGatewayClient]
  provides: [ApiKey module fully decoupled from BifrostClient]
  affects: [ApiKeyBifrostSync, ApiKeyServiceProvider, 4 test files]
tech_stack:
  added: []
  patterns: [ILLMGatewayClient constructor injection, MockGatewayClient in tests, mock store seeding for updateKey existence checks]
key_files:
  modified:
    - src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts
    - src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts
    - src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts
    - src/Modules/ApiKey/__tests__/SetKeyPermissionsService.test.ts
    - src/Modules/ApiKey/__tests__/CreateApiKeyService.test.ts
    - src/Modules/ApiKey/__tests__/RevokeApiKeyService.test.ts
decisions:
  - MockGatewayClient.updateKey throws NOT_FOUND if keyId not in store — tests must call mock.createKey() first to seed the store, then use the returned id as bifrostVirtualKeyId in ApiKey aggregate fixture
  - CreateApiKeyService and RevokeApiKeyService test files were not listed in the plan but also used BifrostClient mocks — migrated as Rule 2 auto-fix (blocking: new ApiKeyBifrostSync constructor rejects BifrostClient-shaped object)
metrics:
  duration: "~8 minutes"
  completed: "2026-04-10"
  tasks: 2
  files: 6
---

# Phase 02 Plan 02: ApiKey Module ILLMGatewayClient Migration Summary

ApiKey module fully migrated from BifrostClient to ILLMGatewayClient — camelCase field translation, DI wiring updated, 6 test files converted to MockGatewayClient.

## What Was Done

### Task 1: Migrate ApiKeyBifrostSync.ts

- Replaced `BifrostClient` constructor parameter with `ILLMGatewayClient`
- `createVirtualKey`: `bifrostClient.createVirtualKey({ name, customer_id })` → `gatewayClient.createKey({ name, customerId })`
- `syncPermissions`: translated all snake_case fields to camelCase per `UpdateKeyRequest` interface:
  - `allowed_models` → `allowedModels`
  - `provider_configs` → `providerConfigs`
  - `rate_limit` → `rateLimit`
  - `token_max_limit` → `tokenMaxLimit`
  - `token_reset_duration` → `tokenResetDuration`
  - `request_max_limit` → `requestMaxLimit`
  - `request_reset_duration` → `requestResetDuration`
- `deactivateVirtualKey`: `bifrostClient.updateVirtualKey(id, { is_active: false })` → `gatewayClient.updateKey(id, { isActive: false })`
- `deleteVirtualKey`: `bifrostClient.deleteVirtualKey(id)` → `gatewayClient.deleteKey(id)`

### Task 2: Update ApiKeyServiceProvider + Migrate Tests

- `ApiKeyServiceProvider`: changed `c.make('bifrostClient') as BifrostClient` → `c.make('llmGatewayClient') as ILLMGatewayClient`
- `ApiKeyBifrostSync.test.ts`: full replacement — MockGatewayClient replaces vi.fn() BifrostClient mock
- `SetKeyPermissionsService.test.ts`: MockGatewayClient + mock store seeded in beforeEach for syncPermissions path

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Migration] CreateApiKeyService.test.ts and RevokeApiKeyService.test.ts**

- **Found during:** Task 2 — first test run showed 4 failures in unlisted test files
- **Issue:** Both files used `createMockSync()` factory that built `BifrostClient`-shaped objects and passed them to `new ApiKeyBifrostSync(mockClient)`. After migration, `ApiKeyBifrostSync` calls `this.gatewayClient.updateKey` (camelCase) but the fake client only had `updateVirtualKey` — runtime error: `this.gatewayClient.updateKey is not a function`
- **Fix:** Migrated both files to `MockGatewayClient`. Seeded mock store in `beforeEach` so `deactivateVirtualKey` / `syncPermissions` can succeed (MockGatewayClient.updateKey throws NOT_FOUND for unseeded keys)
- **Files modified:** `CreateApiKeyService.test.ts`, `RevokeApiKeyService.test.ts`
- **Commit:** 3406c79

**2. [Rule 1 - Bug] Invalid GatewayErrorCode in CreateApiKeyService.test.ts**

- **Found during:** Typecheck after Task 2
- **Issue:** `new GatewayError('...', 'PROVIDER_ERROR', ...)` — `'PROVIDER_ERROR'` is not in `GatewayErrorCode` union
- **Fix:** Changed to `'NETWORK'` which is a valid code and semantically correct for a connection failure scenario
- **Files modified:** `src/Modules/ApiKey/__tests__/CreateApiKeyService.test.ts`
- **Commit:** 3406c79 (same commit)

## Verification Results

```
grep -rn "BifrostClient|bifrostClient" src/Modules/ApiKey/ | grep -v "bifrostVirtualKeyId|bifrostKeyValue"
# Result: zero matches — PASS

bun test src/Modules/ApiKey
# Result: 48 pass, 0 fail — PASS

bun run typecheck (ApiKey module)
# Result: zero TS errors in ApiKey files — PASS
```

## Known Stubs

None — all methods wired to real ILLMGatewayClient interface, tests use stateful MockGatewayClient.

## Self-Check: PASSED

- `src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts` — exists, contains `ILLMGatewayClient`, `allowedModels`, `tokenMaxLimit`
- `src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts` — exists, contains `llmGatewayClient`
- `src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts` — exists, contains `MockGatewayClient`
- Commit `3406c79` — verified in git log
