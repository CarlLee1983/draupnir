# Requirements: Draupnir — LLM Gateway Abstraction

**Defined:** 2026-04-10
**Core Value:** No file under `src/Modules/` or `src/Foundation/Application/` may import a Bifrost-specific symbol after this milestone ships. Gateway is a compile-time wiring decision, never a domain concern.

## v1 Requirements

### Interface & Types (IFACE)

- [x] **IFACE-01**: `ILLMGatewayClient` interface exists at `src/Foundation/Infrastructure/Services/LLMGateway/ILLMGatewayClient.ts` with methods `createKey`, `updateKey`, `deleteKey`, `getUsageStats`
- [x] **IFACE-02**: DTO types (`CreateKeyRequest`, `UpdateKeyRequest`, `KeyResponse`, `UsageQuery`, `UsageStats`) exist at `src/Foundation/Infrastructure/Services/LLMGateway/types.ts` with `readonly` fields and camelCase naming only
- [x] **IFACE-03**: `GatewayError` class exists at `src/Foundation/Infrastructure/Services/LLMGateway/errors.ts` exposing `statusCode` and optional `originalError`, and is the single error type adapters re-throw
- [x] **IFACE-04**: A barrel export `src/Foundation/Infrastructure/Services/LLMGateway/index.ts` exposes the interface, types, and errors as the public API of the abstraction layer

### Adapters (ADAPT)

- [x] **ADAPT-01**: `BifrostGatewayAdapter` exists at `src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts`, implements `ILLMGatewayClient`, and wraps an injected `BifrostClient`
- [x] **ADAPT-02**: `BifrostGatewayAdapter` converts snake_case ↔ camelCase at the boundary for all five methods (no snake_case leaks out through the interface)
- [x] **ADAPT-03**: `BifrostGatewayAdapter` catches Bifrost-specific errors and re-throws them as `GatewayError` with preserved `statusCode` and `originalError`
- [x] **ADAPT-04**: `MockGatewayClient` exists at `src/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient.ts`, implements `ILLMGatewayClient` with in-memory behavior (no HTTP), and is usable in tests
- [x] **ADAPT-05**: Unit tests cover `BifrostGatewayAdapter` request/response mapping and error translation (`tests/Unit/Foundation/LLMGateway/BifrostGatewayAdapter.test.ts`)
- [x] **ADAPT-06**: Unit tests cover `MockGatewayClient` behaviour so downstream tests can rely on it as a reference implementation

### Wiring (WIRE)

- [x] **WIRE-01**: Main `ServiceProvider` (or project bootstrap) registers `llmGatewayClient` as a singleton bound to `BifrostGatewayAdapter`, which itself receives the singleton `bifrostClient`
- [x] **WIRE-02**: `wireAppApiKey` resolves `llmGatewayClient` from the container and passes it to services that previously received `bifrostClient`
- [x] **WIRE-03**: `wireApiKey` is updated the same way for the separate `ApiKey` module
- [x] **WIRE-04**: `wireSdkApi` is updated for the `QueryUsage` injection (but **not** `ProxyModelCall` — see SDK-05)
- [x] **WIRE-05**: `wireDashboard` is updated for `UsageAggregator`
- [x] **WIRE-06**: No application-layer constructor type signature references `BifrostClient` after this requirement is complete

### Business-Layer Migration (MIGRATE)

- [x] **MIGRATE-01**: `AppKeyBifrostSync` constructor parameter type changes from `BifrostClient` to `ILLMGatewayClient`, and all method calls use the new interface vocabulary
- [x] **MIGRATE-02**: `ApiKeyBifrostSync.createVirtualKey` + `.deactivateVirtualKey` + `.deleteVirtualKey` migrate to `ILLMGatewayClient` (the `ApiKey` module sibling missing from the original spec)
- [x] **MIGRATE-03**: `GetAppKeyUsageService` migrates to `ILLMGatewayClient` and uses camelCase query types
- [x] **MIGRATE-04**: `QueryUsage` (SdkApi UseCase) migrates to `ILLMGatewayClient`
- [x] **MIGRATE-05**: `UsageAggregator.getStats` and `UsageAggregator.getLogs` (Dashboard) migrate to `ILLMGatewayClient` — uses the multi-key array form of `getUsageStats` and the new `getUsageLogs` method; stops passing snake_case query parameters
- [x] **MIGRATE-06**: Any remaining direct `BifrostClient` imports in application layer are removed (verified by `grep`)
- [x] **MIGRATE-07**: `HandleBalanceDepletedService` (Credit module) migrates from `BifrostClient.updateVirtualKey({rate_limit: {...}})` to `ILLMGatewayClient.updateKey({rateLimit: {...}})`; retry loop uses `GatewayError.retryable` flag to classify failures
- [x] **MIGRATE-08**: `HandleCreditToppedUpService` (Credit module) migrates from `BifrostClient.updateVirtualKey({rate_limit: {...}})` to `ILLMGatewayClient.updateKey({rateLimit: {...}})` to restore rate limits after credit top-up
- [x] **MIGRATE-09**: `ApiKeyBifrostSync.syncPermissions` migrates from `BifrostClient.updateVirtualKey({provider_configs, rate_limit})` to `ILLMGatewayClient.updateKey({providerConfigs, rateLimit})` — preserves the existing model-allowlist and rate-limit sync behavior

### Domain Rename (RENAME)

- [x] **RENAME-01**: TS field `bifrostVirtualKeyId` → `gatewayKeyId` in `src/Modules/AppApiKey/Domain/Aggregates/AppApiKey.ts` (and value objects, if any)
- [x] **RENAME-02**: TS field `bifrostVirtualKeyId` → `gatewayKeyId` in `src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts`
- [x] **RENAME-03**: Repository layer (`AppApiKeyRepository`, `ApiKeyRepository`, multi-ORM implementations) maps `gatewayKeyId` ↔ existing DB column `bifrost_virtual_key_id` — no DB migration
- [x] **RENAME-04**: All call sites across modules and tests updated to `gatewayKeyId`; no references to `bifrostVirtualKeyId` remain in TS source (verified by `grep`)

### SDK Extraction (SDK)

- [ ] **SDK-01**: `packages/bifrost-sdk/` exists as a Bun workspace package with its own `package.json`, `tsconfig.json`, and `README.md`
- [ ] **SDK-02**: `BifrostClient`, `BifrostClientConfig`, types, errors, and retry logic are moved from `src/Foundation/Infrastructure/Services/BifrostClient/` into `packages/bifrost-sdk/src/` and re-exported from its `index.ts`
- [x] **SDK-03**: Root `package.json` declares `packages/*` under `workspaces`; Draupnir imports `BifrostClient` from `@draupnir/bifrost-sdk` (or agreed scope) via `workspace:*`
- [x] **SDK-04**: `src/Foundation/Infrastructure/Services/BifrostClient/` directory is deleted, with no dangling imports anywhere in the repo
- [x] **SDK-05**: Hardcoded Bifrost proxy URL currently in `SdkApiServiceProvider` moves into `bifrost-sdk`'s config surface (e.g., `BifrostClientConfig.proxyBaseUrl`), and `ProxyModelCall` continues to work unchanged via the SDK
- [ ] **SDK-06**: `packages/bifrost-sdk/` has at least one self-contained smoke test that builds and runs without importing anything from Draupnir `src/`

### Tests (TEST)

- [x] **TEST-01**: Tests that previously mocked `BifrostClient` (e.g., `AppKeyBifrostSync.test.ts`, `GetAppKeyUsageService.test.ts`, `ApiKeyBifrostSync.test.ts`) are rewritten to mock `ILLMGatewayClient` or use `MockGatewayClient`
- [x] **TEST-02**: No test file imports the `BifrostClient` concrete class after migration (verified by `grep` excluding the sdk package itself)
- [x] **TEST-03**: Full Bun unit + feature test suite passes at every phase boundary
- [x] **TEST-04**: Playwright E2E suite passes unchanged (`bun run test:e2e`)

### Quality Gates (QUALITY)

- [x] **QUAL-01**: `bun run lint` (Biome) is clean across the workspace (root + `packages/bifrost-sdk`)
- [x] **QUAL-02**: `bun run typecheck` (`tsc --noEmit`) is clean across the workspace
- [x] **QUAL-03**: No new `any` types or `@ts-ignore` introduced by the refactor (verified by diff review)
- [x] **QUAL-04**: HTTP routes and request/response shapes unchanged — smoke-check via `routes-connectivity.test.ts` / `routes-existence.test.ts`
- [x] **QUAL-05**: `.planning/codebase/CONCERNS.md` items #1, #2, #3 (Bifrost coupling, snake_case leakage, missing abstraction) are resolved or explicitly updated to reflect new state

## v2 Requirements

Deferred for now — acknowledged but not in this milestone's roadmap.

### Multi-Gateway

- **GATE-V2-01**: Implement an `OpenRouterGatewayAdapter` against the now-stable `ILLMGatewayClient`
- **GATE-V2-02**: Implement a `GeminiGatewayAdapter`
- **GATE-V2-03**: Build-time gateway selection factory (once there's more than one real adapter to pick from)

### Proxy Abstraction

- **PROXY-V2-01**: Extend `ILLMGatewayClient` (or create `ILLMProxyClient`) to cover raw chat-completion forwarding so `ProxyModelCall` can also go through the abstraction
- **PROXY-V2-02**: Gateway-agnostic streaming response handling

### SDK Publishing

- **SDK-V2-01**: Publish `bifrost-sdk` to a private npm registry and decouple its release cadence from Draupnir

## Out of Scope

| Feature | Reason |
|---------|--------|
| Abstracting `ProxyModelCall` behind `ILLMGatewayClient` | Chat-completion proxying has a different shape than key management; would delay the interface landing. Deferred to v2. |
| Implementing an `OpenRouter` or `Gemini` adapter in this milestone | Interface correctness is validated by one real adapter + the mock. Real second adapters become trivial follow-ups. |
| Runtime gateway switching via env vars | Gateway is a compile-time ServiceProvider decision. No factory-by-env-var pattern. |
| Renaming the DB column `bifrost_virtual_key_id` | Migration risk is not worth it for this refactor. Column stays; repository does the mapping. |
| Publishing `bifrost-sdk` to an external registry | Workspace-only (`workspace:*`) suffices until a second project needs it. |
| Changing any domain invariant on `AppApiKey` or `ApiKey` aggregates | Only the one field name changes; aggregate behaviour is untouched. |
| Refactoring unrelated tech debt flagged in CONCERNS.md (Prisma adapter, etc.) | Stay scoped to the gateway abstraction; other items get their own milestones. |
| Changes to Bifrost API Gateway itself | We only wrap the existing surface. No upstream Bifrost PRs. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| IFACE-01 | Phase 1 | Complete |
| IFACE-02 | Phase 1 | Complete |
| IFACE-03 | Phase 1 | Complete |
| IFACE-04 | Phase 1 | Complete |
| ADAPT-01 | Phase 1 | Complete |
| ADAPT-02 | Phase 1 | Complete |
| ADAPT-03 | Phase 1 | Complete |
| ADAPT-04 | Phase 1 | Complete |
| ADAPT-05 | Phase 1 | Complete |
| ADAPT-06 | Phase 1 | Complete |
| WIRE-01 | Phase 1 | Complete |
| WIRE-02 | Phase 2 | Complete |
| WIRE-03 | Phase 2 | Complete |
| WIRE-04 | Phase 2 | Complete |
| WIRE-05 | Phase 2 | Complete |
| WIRE-06 | Phase 2 | Complete |
| MIGRATE-01 | Phase 2 | Complete |
| MIGRATE-02 | Phase 2 | Complete |
| MIGRATE-03 | Phase 2 | Complete |
| MIGRATE-04 | Phase 2 | Complete |
| MIGRATE-05 | Phase 2 | Complete |
| MIGRATE-06 | Phase 2 | Complete |
| MIGRATE-07 | Phase 2 | Complete |
| MIGRATE-08 | Phase 2 | Complete |
| MIGRATE-09 | Phase 2 | Complete |
| RENAME-01 | Phase 3 | Complete |
| RENAME-02 | Phase 3 | Complete |
| RENAME-03 | Phase 3 | Complete |
| RENAME-04 | Phase 3 | Complete |
| SDK-01 | Phase 4 | Pending |
| SDK-02 | Phase 4 | Pending |
| SDK-03 | Phase 4 | Complete |
| SDK-04 | Phase 4 | Complete |
| SDK-05 | Phase 4 | Complete |
| SDK-06 | Phase 4 | Pending |
| TEST-01 | Phase 2 | Complete |
| TEST-02 | Phase 5 | Complete |
| TEST-03 | Phase 2 | Complete |
| TEST-04 | Phase 5 | Complete |
| QUAL-01 | Phase 5 | Complete |
| QUAL-02 | Phase 5 | Complete |
| QUAL-03 | Phase 5 | Complete |
| QUAL-04 | Phase 5 | Complete |
| QUAL-05 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 44/44 ✓
- Unmapped: 0

---
*Requirements defined: 2026-04-10*
*Last updated: 2026-04-10 — amended during Phase 1 discussion to add MIGRATE-07/08/09 (Credit module + syncPermissions)*
