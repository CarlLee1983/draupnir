# Phase 1: Gateway Foundation - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the `ILLMGatewayClient` abstraction layer + `BifrostGatewayAdapter` + `MockGatewayClient` + DI registration, coexisting with the existing `BifrostClient`. **Zero business-layer changes.** No file under `src/Modules/` or `src/Foundation/Application/` is touched in this phase — that's Phase 2.

After Phase 1 lands, both `container.make('bifrostClient')` and `container.make('llmGatewayClient')` resolve, and all existing tests pass unchanged. The interface is ready for consumers but has no consumers yet.

**In scope:**
- `src/Foundation/Infrastructure/Services/LLMGateway/` directory with interface, DTOs, errors, adapters, mock, barrel export
- Unit tests for `BifrostGatewayAdapter` (mapping + error translation) and `MockGatewayClient` (reference impl)
- Singleton registration in `FoundationServiceProvider` alongside existing `bifrostClient`

**Explicitly NOT in scope:**
- Touching any file under `src/Modules/`
- Renaming `bifrostVirtualKeyId` (Phase 3)
- Creating `packages/bifrost-sdk/` (Phase 4)
- Any OpenRouter / second-gateway adapter (v2)
- Abstracting `ProxyModelCall` (deferred indefinitely)

</domain>

<decisions>
## Implementation Decisions

### Interface Surface (D-01 to D-08)

- **D-01:** `ILLMGatewayClient` exposes **five** methods, not four as the original spec proposed. The added method is `getUsageLogs` because `UsageAggregator.getLogs` reads raw log records that aggregate-only stats can't replace.
  ```ts
  interface ILLMGatewayClient {
    createKey(request: CreateKeyRequest): Promise<KeyResponse>
    updateKey(keyId: string, request: UpdateKeyRequest): Promise<KeyResponse>
    deleteKey(keyId: string): Promise<void>
    getUsageStats(keyIds: readonly string[], query?: UsageQuery): Promise<UsageStats>
    getUsageLogs(keyIds: readonly string[], query?: UsageQuery): Promise<readonly LogEntry[]>
  }
  ```

- **D-02:** `UpdateKeyRequest` is a **wide DTO**, not the original spec's `{isActive?}` alone. It must accept all three patterns real callers use, with every field optional so partial updates are natural:
  ```ts
  interface UpdateKeyRequest {
    readonly isActive?: boolean
    readonly rateLimit?: RateLimitUpdate
    readonly providerConfigs?: readonly ProviderConfigUpdate[]
  }
  interface RateLimitUpdate {
    readonly tokenMaxLimit?: number
    readonly tokenResetDuration?: string   // e.g. '1m', '1h'
    readonly requestMaxLimit?: number
    readonly requestResetDuration?: string
  }
  interface ProviderConfigUpdate {
    readonly provider: string               // '*' or specific provider name
    readonly allowedModels?: readonly string[]
  }
  ```
  Rationale: scouting found `HandleBalanceDepletedService`, `HandleCreditToppedUpService`, and `ApiKeyBifrostSync.syncPermissions` all need rate-limit or provider-config updates. Splitting into 3+ methods would multiply the interface surface; an opaque `Record<string, unknown>` would defeat type safety.

- **D-03:** `getUsageStats` and `getUsageLogs` take `keyIds: readonly string[]` — array form, not single-key. Callers doing single-key queries pass `[keyId]`. The Bifrost adapter converts the array to Bifrost's comma-joined `virtual_key_ids` string at the boundary.

- **D-04:** `UsageStats` stays the spec's flat shape (`totalRequests`, `totalCost`, `totalTokens`, `avgLatency`) — these are the fields all current callers (`GetAppKeyUsageService`, `QueryUsage`, `UsageAggregator`) actually read.

- **D-05:** `LogEntry` is a **typed DTO** exposing only the fields `UsageAggregator` actually consumes. Adapter drops/ignores everything else from the raw Bifrost log record. Initial field set derived from the current `UsageAggregator.getLogs` consumers — if later consumers need more fields, widen the DTO then.
  ```ts
  interface LogEntry {
    readonly timestamp: string           // ISO 8601
    readonly keyId: string
    readonly model: string
    readonly provider: string
    readonly inputTokens: number
    readonly outputTokens: number
    readonly totalTokens: number
    readonly latencyMs: number
    readonly cost: number
    readonly status: 'success' | 'error'
  }
  ```
  *Downstream agents: verify the exact field list against `UsageAggregator` consumers + current `BifrostLogEntry` type before finalizing.*

- **D-06:** `UsageQuery` remains minimal:
  ```ts
  interface UsageQuery {
    readonly startTime?: string  // ISO 8601
    readonly endTime?: string
  }
  ```
  Other Bifrost query parameters (sort_by, limit, etc.) not exposed in the interface unless a caller actually needs them. If planner finds additional required fields during Phase 2 migration, add them here.

- **D-07:** All DTO fields use `readonly` modifiers and camelCase naming. No snake_case anywhere in the interface surface. Conversion happens **exclusively inside `BifrostGatewayAdapter`**.

- **D-08:** `KeyResponse` shape:
  ```ts
  interface KeyResponse {
    readonly id: string
    readonly name: string
    readonly value?: string        // Only populated on createKey (Bifrost only returns raw key on creation)
    readonly isActive: boolean
  }
  ```

### Error Model (D-09 to D-13)

- **D-09:** Single `GatewayError` class (not a tagged union of subclasses) with a discriminator `code` field. Rationale: current caller sites use `catch (error: unknown)` and a single branch; tagged unions would add imports and refactor pressure outside Phase 1's scope.
  ```ts
  export type GatewayErrorCode =
    | 'NOT_FOUND'
    | 'RATE_LIMITED'
    | 'VALIDATION'
    | 'NETWORK'
    | 'UNAUTHORIZED'
    | 'UNKNOWN'

  export class GatewayError extends Error {
    constructor(
      message: string,
      readonly code: GatewayErrorCode,
      readonly statusCode: number,
      readonly retryable: boolean,
      readonly originalError?: Error,
    ) {
      super(message)
      this.name = 'GatewayError'
    }
  }
  ```

- **D-10:** `BifrostGatewayAdapter` is responsible for classifying HTTP status codes into `code` + `retryable`. Mapping:
  - `404` → `NOT_FOUND`, retryable: false
  - `401/403` → `UNAUTHORIZED`, retryable: false
  - `422/400` → `VALIDATION`, retryable: false
  - `429` → `RATE_LIMITED`, retryable: true
  - `502/503/504` → `NETWORK`, retryable: true
  - Fetch/connection errors → `NETWORK`, retryable: true
  - Everything else → `UNKNOWN`, retryable: false (conservative default)

- **D-11:** `originalError` holds the raw cause. Adapter does **not** add a separate `details` field. If a caller needs the response body for debugging, they can traverse `originalError`. `GatewayError.message` stays high-level and safe to log.

- **D-12:** Phase 2 migrated services **keep their existing `{success: false, error: ...}` Response pattern**. GatewayError is caught and converted to the existing error-response shape at the same boundary where `bifrostClient` errors are caught today. Phase 1 does not change any controller or middleware.

- **D-13:** `HandleBalanceDepletedService`'s retry loop (Phase 2 scope) will gain a small improvement: check `error instanceof GatewayError && error.retryable` to distinguish "retry on next cron tick" from "abort, this is a programming error". Non-retryable errors get logged at a higher severity and don't count toward the retry budget. *Not a Phase 1 deliverable — noted for Phase 2 planning.*

### MockGatewayClient (D-14 to D-17)

- **D-14:** `MockGatewayClient` is a **stateful in-memory reference implementation**, not a null-object or programmable double. Internal state:
  - `Map<keyId, { name, customerId, isActive, rateLimit?, providerConfigs? }>` for keys
  - Seeded `UsageStats` + `LogEntry[]` fixtures (configurable via constructor or setter)
  - Monotonic ID generator (`mock_vk_000001`, `mock_vk_000002`, ...)

- **D-15:** `MockGatewayClient` exposes a `calls` getter that returns `readonly` arrays of received requests per method:
  ```ts
  mock.calls.createKey   // readonly CreateKeyRequest[]
  mock.calls.updateKey   // readonly { keyId: string; request: UpdateKeyRequest }[]
  mock.calls.deleteKey   // readonly string[]
  mock.calls.getUsageStats  // readonly { keyIds: readonly string[]; query?: UsageQuery }[]
  mock.calls.getUsageLogs   // same shape
  ```
  Tests assert against these instead of wrapping methods in `vi.fn`.

- **D-16:** `MockGatewayClient.failNext(error: GatewayError)` queues a single-shot failure: the next interface call throws `error`, then the queue is cleared. Tests use this for failure-path verification (e.g., retry logic, error propagation).
  ```ts
  mock.failNext(new GatewayError('rate limited', 'RATE_LIMITED', 429, true))
  await expect(service.execute(...)).rejects.toThrow('rate limited')
  ```
  Multi-failure scenarios can call `failNext` repeatedly; calls drain FIFO.

- **D-17:** `MockGatewayClient` lives at `src/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient.ts` and is re-exported from the barrel `index.ts`. A biome lint rule or pre-commit check should forbid `src/` runtime code from importing `MockGatewayClient` — tests only. Planner should investigate whether biome supports a per-file-import restriction; fallback is a repo-level grep check in CI.

### DI Wiring (D-18 to D-21)

- **D-18:** `llmGatewayClient` is registered in the **existing** `FoundationServiceProvider` (`src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts`), next to the existing `bifrostClient` singleton registration. No new provider file.
  ```ts
  container.singleton('llmGatewayClient', (c: IContainer) => {
    const bifrost = c.make('bifrostClient') as BifrostClient
    return new BifrostGatewayAdapter(bifrost)
  })
  ```

- **D-19:** Adapter config reuses the existing `createBifrostClientConfig()` helper. No new `createLLMGatewayConfig()` — zero duplication. Bifrost env vars (`BIFROST_API_URL`, `BIFROST_MASTER_KEY`) remain the source of truth during coexistence.

- **D-20:** `bifrostClient` singleton **stays registered** through Phases 1–3. No deprecation warning, no runtime throw. The registration is removed only in Phase 4, after SDK extraction, when `BifrostGatewayAdapter` instantiates its own `BifrostClient` from the sdk package.

- **D-21:** Container key is the literal string `llmGatewayClient`. Type-narrowing at call sites uses `as ILLMGatewayClient`. Consistent with existing `c.make('bifrostClient') as BifrostClient` pattern.

### Amended Scope (D-22)

- **D-22:** REQUIREMENTS.md amended during this discussion — 3 requirements added: **MIGRATE-07** (HandleBalanceDepletedService), **MIGRATE-08** (HandleCreditToppedUpService), **MIGRATE-09** (ApiKeyBifrostSync.syncPermissions). These are Phase 2 requirements but influenced Phase 1's interface shape (D-02 wide `UpdateKeyRequest`). ROADMAP.md Phase 2 success criteria expanded to reference these files plus `wireCredit` and a new criterion for `syncPermissions` behavior preservation.

### Claude's Discretion

The following micro-decisions are left to the planner/executor — no user input needed:

- Exact directory layout inside `LLMGateway/`: `types.ts` vs `types/` subdirectory, flat implementations/ vs grouped, etc.
- Whether `BifrostGatewayAdapter` is one file or split by concern (e.g., separate `mapping.ts` helpers)
- Test file layout inside `tests/Unit/Foundation/LLMGateway/` (per-method files vs one big test file)
- Exact biome rule / lint check to prevent `src/` runtime import of `MockGatewayClient`
- Whether DTO type imports flow through the barrel or via direct file paths (pick the one consistent with the rest of `src/Foundation/`)
- Name of the symbolic package `@draupnir/bifrost-sdk` vs `@gravito/bifrost-sdk` or another scope (Phase 4 decision; default to `@draupnir/bifrost-sdk` unless conflict)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 Design Source
- `docs/superpowers/specs/2026-04-10-llm-gateway-abstraction-design.md` — The original design spec the user provided. **Note: its `UpdateKeyRequest` is narrower than what this phase ships (D-02).** Treat the spec as inspiration, not literal contract. The decisions in this CONTEXT.md override any conflict with the spec.

### Existing Bifrost surface (the adapter must wrap this)
- `src/Foundation/Infrastructure/Services/BifrostClient/BifrostClient.ts` — Concrete client to wrap
- `src/Foundation/Infrastructure/Services/BifrostClient/types.ts` — Existing snake_case types to convert
- `src/Foundation/Infrastructure/Services/BifrostClient/errors.ts` — Error classes the adapter catches and re-throws as `GatewayError`
- `src/Foundation/Infrastructure/Services/BifrostClient/retry.ts` — Existing retry logic (adapter delegates to this via BifrostClient; does not re-implement)
- `src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts` — Where `bifrostClient` is currently registered; where `llmGatewayClient` gets added

### Phase 2 consumers (NOT touched in Phase 1, but interface must cover them)
- `src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts` — Uses createVirtualKey, updateVirtualKey({is_active}), deleteVirtualKey
- `src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts` — Uses createVirtualKey, **syncPermissions (provider_configs + rate_limit)**, deactivate, delete
- `src/Modules/AppApiKey/Application/Services/GetAppKeyUsageService.ts` — Uses getLogsStats single-key
- `src/Modules/SdkApi/Application/UseCases/QueryUsage.ts` — Uses getLogsStats
- `src/Modules/Dashboard/Infrastructure/Services/UsageAggregator.ts` — **Uses getLogsStats + getLogs multi-key** (drove D-03 and D-05)
- `src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts` — Uses updateVirtualKey({rate_limit}) + retry loop (drove D-10, D-13)
- `src/Modules/Credit/Application/Services/HandleCreditToppedUpService.ts` — Uses updateVirtualKey({rate_limit})

### Project-level constraints
- `.planning/PROJECT.md` — Core value, constraints, out-of-scope list
- `.planning/REQUIREMENTS.md` — Amended during this discussion (+MIGRATE-07/08/09)
- `.planning/ROADMAP.md` §Phase 2 — Amended success criteria now reference Credit module
- `.planning/codebase/CONCERNS.md` §1–3 — The coupling audit that motivated this milestone
- `.planning/codebase/ARCHITECTURE.md` — DI container + ServiceProvider pattern
- `.planning/codebase/STRUCTURE.md` — `src/Foundation/` vs `src/Modules/` layout
- `.planning/codebase/CONVENTIONS.md` — Immutability, readonly, error handling, biome config
- `.planning/codebase/TESTING.md` — Bun test layout, mocking patterns, fixtures

### User-global policies (affect all code + commits)
- `~/.claude/rules/coding-style.md` — Immutability mandate (no mutation; always return new objects)
- `~/.claude/rules/git-workflow.md` — Commit format `<type>: [<scope>] <subject>`
- `~/.claude/rules/testing.md` — 80% coverage target, TDD workflow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`createBifrostClientConfig()`** (in Foundation) — Already reads env vars. Adapter reuses it; no new config factory.
- **`BifrostClient.retry.ts`** — Existing retry/backoff logic. `BifrostClient` already calls it internally; adapter doesn't re-implement. Adapter-level retry is layered *on top* of this (via `GatewayError.retryable` flag, not via internal re-call).
- **`FoundationServiceProvider`** pattern — Register interface + factory function + extend via `container.singleton('name', (c) => new Impl(...))`. Same pattern adopted for `llmGatewayClient`.
- **Bun test assertion style** — `import { describe, it, expect } from 'bun:test'`. Adapter tests follow this convention. Fixtures pattern TBD by planner.

### Established Patterns
- **DDD layering**: `src/Foundation/Infrastructure/Services/` is the correct home for LLMGateway. Interfaces colocate with implementations inside Foundation — no separate "Domain" directory for infrastructure-level abstractions. Matches existing `BifrostClient/` and others.
- **Barrel exports**: Each Services/ subdirectory has an `index.ts` re-exporting the public API. `LLMGateway/index.ts` will follow suit.
- **`readonly` on all DTO fields**: Project convention per `CONVENTIONS.md` and user-global rules. All ILLMGatewayClient DTOs comply.
- **Type assertion from container**: `c.make('key') as SomeType` — consistent across the codebase. Adopted for `llmGatewayClient`.

### Integration Points
- **`FoundationServiceProvider.register()`** — one new `container.singleton('llmGatewayClient', ...)` call, colocated with existing `bifrostClient` singleton.
- **No route or controller changes** in Phase 1. Routes continue to resolve the same services they do today.
- **Test directory**: `tests/Unit/Foundation/LLMGateway/` — new folder for adapter + mock unit tests.

### Constraints Observed
- **No mutation**: All DTOs are `readonly`; helpers return new objects.
- **No `any` / `@ts-ignore`** introduced by the new code (tracked in QUAL-03).
- **Biome clean**: Run `bun run lint` before commit.
- **TypeScript strict**: `tsc --noEmit` must pass.

</code_context>

<specifics>
## Specific Ideas

- **Wide `UpdateKeyRequest`** is directly driven by 3 real call sites that would otherwise break: `HandleBalanceDepletedService`, `HandleCreditToppedUpService`, `ApiKeyBifrostSync.syncPermissions`. The user confirmed these must migrate in Phase 2, so Phase 1's interface has to accommodate them.

- **Multi-key `getUsageStats`** is driven by `UsageAggregator.getStats(virtualKeyIds: readonly string[], ...)`, which currently joins into `'id1,id2,id3'` as a Bifrost quirk. The adapter hides the quirk.

- **`getUsageLogs` is a new first-class method** — added solely to cover `UsageAggregator.getLogs`. The spec didn't mention logs at all. Without it, Phase 2's `UsageAggregator` migration fails.

- **Single `GatewayError` class with discriminator**, not a tagged union, because existing callers use `catch (error: unknown)` and a single branch. Introducing multiple error classes would force refactors outside Phase 1's scope.

- **`retryable` flag is the Credit module's retry dial** — `HandleBalanceDepletedService` currently re-tries every failure on a cron schedule. Post-migration, it can distinguish transient failures (retry) from permanent failures (log + skip).

- **`MockGatewayClient.failNext(error)`** is the user's explicit preference — it replaces per-test vi.fn stubs for failure paths and makes retry-logic tests easier to write.

- **Biome rule to prevent runtime import of MockGatewayClient** — user flagged the concern; planner needs to decide the exact enforcement mechanism (biome config vs CI grep check).

</specifics>

<deferred>
## Deferred Ideas

- **`UsageQuery` query field widening** — if Phase 2 planning finds additional Bifrost query fields (sort_by, limit, ...) that current callers need, widen `UsageQuery` then. Not a Phase 1 concern.
- **`LogEntry` field widening** — same pattern: widen when a consumer needs more fields.
- **`getKey(keyId)` / `listKeys(customerId)` read methods** — no current caller needs them. Add when a caller appears.
- **Error taxonomy as tagged union** — if error handling callsites grow complex and would benefit from type narrowing, refactor the single-class model into discriminated subclasses in a future milestone.
- **OpenRouter / Gemini adapter** — v2 (GATE-V2-01, GATE-V2-02). Interface is designed to accommodate them.
- **`ProxyModelCall` abstraction** — v2 (PROXY-V2-01, PROXY-V2-02). Not in this milestone per user decision.
- **DB column rename `bifrost_virtual_key_id` → `gateway_key_id`** — Out of scope per PROJECT.md. Rename lives in TS only (Phase 3 RENAME-03).
- **Adapter-level retry policy beyond Bifrost's existing retry.ts** — If planner finds the Bifrost SDK's retry is insufficient, revisit in Phase 4 when the sdk package is extracted.

</deferred>

---

*Phase: 01-gateway-foundation*
*Context gathered: 2026-04-10*
