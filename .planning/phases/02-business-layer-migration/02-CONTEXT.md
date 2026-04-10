# Phase 2: Business-Layer Migration - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 migrates all application-layer consumers from `BifrostClient` to `ILLMGatewayClient`. After this phase, no file under `src/Modules/` or `src/Foundation/Application/` has a constructor parameter typed as `BifrostClient`.

**In scope:**
- Migrate 7 services: `AppKeyBifrostSync`, `ApiKeyBifrostSync`, `GetAppKeyUsageService`, `QueryUsage`, `UsageAggregator`, `HandleBalanceDepletedService`, `HandleCreditToppedUpService`
- Update 5 wire functions: `wireAppApiKey`, `wireApiKey`, `wireSdkApi`, `wireDashboard`, `wireCredit`
- Rewrite all affected tests to mock `ILLMGatewayClient` or use `MockGatewayClient`
- Add `GatewayError.retryable` check to `HandleBalanceDepletedService.execute()` AND `retryPending()`

**Explicitly NOT in scope:**
- `CliApiServiceProvider` / `ProxyCliRequestService` / `ProxyModelCall` — uses `bifrostClient` for proxy passthrough; exempt per PROJECT.md constraints
- Renaming `bifrostVirtualKeyId` → `gatewayKeyId` (Phase 3)
- Creating `packages/bifrost-sdk/` (Phase 4)
- Any second-gateway adapter (v2)

</domain>

<decisions>
## Implementation Decisions

### Plan Organization (D-P01)

- **D-P01:** Phase 2 splits into **5 plans, one per module**. Each plan covers: service migration + wire-function update + test rewrite for that module. All 5 plans are independent and can execute in parallel if the executor supports it.

  | Plan | Module | Services | Wire function |
  |------|--------|----------|---------------|
  | 02-01 | AppApiKey | `AppKeyBifrostSync`, `GetAppKeyUsageService` | `wireAppApiKey` |
  | 02-02 | ApiKey | `ApiKeyBifrostSync` | `wireApiKey` |
  | 02-03 | Credit | `HandleBalanceDepletedService`, `HandleCreditToppedUpService` | `wireCredit` |
  | 02-04 | SdkApi | `QueryUsage` | `wireSdkApi` |
  | 02-05 | Dashboard | `UsageAggregator` | `wireDashboard` |

### HandleBalanceDepletedService Retry Improvement (D-P02)

- **D-P02:** Both `execute()` AND `retryPending()` get the `GatewayError.retryable` improvement.

  **execute():** Change the `catch (error: unknown)` block:
  - `instanceof GatewayError && error.retryable` → log at normal level, increment `failed` (will retry via schedule)
  - `instanceof GatewayError && !error.retryable` → log at **error severity** (programming error or NOT_FOUND), increment `failed`
  - Other errors → log at error severity, increment `failed`

  **retryPending():** Remove the empty `catch {}` block and replace with:
  - `instanceof GatewayError && error.retryable` → silent continue (will retry next cron tick — same semantics as before)
  - `instanceof GatewayError && !error.retryable` → log at error severity (key doesn't exist, shouldn't be retried)
  - Other errors → log at error severity

  Rationale: Permanent failures (e.g., `NOT_FOUND` — key was deleted from Bifrost) should never accumulate silently in the retry queue. The `retryable` flag is the signal to distinguish transient from permanent.

### CliApi Exemption (D-P03)

- **D-P03:** `CliApiServiceProvider` and `ProxyCliRequestService` are **fully exempt** from Phase 2. `CliApi` uses `bifrostClient` only for `ProxyModelCall` passthrough. This is explicitly out of scope per PROJECT.md ("Abstracting ProxyModelCall behind ILLMGatewayClient" is listed as Out of Scope). Plans must not touch `src/Modules/CliApi/`.

### Sync Service Return Type Naming (D-P04, inherited decision)

- **D-P04:** `AppKeyBifrostSync.createVirtualKey` and `ApiKeyBifrostSync.createVirtualKey` continue returning `{ bifrostVirtualKeyId: string, bifrostKeyValue: string }` in Phase 2. Field name renaming is Phase 3's responsibility (RENAME-01–04). Phase 2 only changes the injected client type, not the return interface shape.

### Test Migration Strategy (inherited from Phase 1 D-14–D-16)

- Tests that previously mocked `BifrostClient` with `vi.fn()` are rewritten to inject `MockGatewayClient` instead.
- Assertions use `mock.calls.{method}` rather than spying on concrete methods.
- `mock.failNext(new GatewayError(...))` for failure-path and retry-path tests.
- `mock.reset()` between test cases.
- Each plan migrates the tests for its module in the same commit as the service migration.

### Claude's Discretion

- Exact test fixture structure within each module (shared fixture file vs inline per test)
- Whether `HandleCreditToppedUpService` gets the same retryable logging as `HandleBalanceDepletedService` (it currently has a simpler structure without a retry loop — planner should check and apply consistently)
- Import organization within migrated files (direct path vs barrel import for `ILLMGatewayClient`)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 2 Interface Contract (already built in Phase 1)
- `src/Foundation/Infrastructure/Services/LLMGateway/ILLMGatewayClient.ts` — The interface all services must now inject
- `src/Foundation/Infrastructure/Services/LLMGateway/types.ts` — DTOs (CreateKeyRequest, UpdateKeyRequest, KeyResponse, UsageStats, LogEntry, UsageQuery)
- `src/Foundation/Infrastructure/Services/LLMGateway/errors.ts` — GatewayError with retryable flag
- `src/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient.ts` — Test double with .calls, failNext(), reset()
- `src/Foundation/Infrastructure/Services/LLMGateway/index.ts` — Barrel export (use this for imports)

### Services to migrate (read before planning each plan)
- `src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts` — Plan 02-01
- `src/Modules/AppApiKey/Application/Services/GetAppKeyUsageService.ts` — Plan 02-01
- `src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts` — Plan 02-02
- `src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts` — Plan 02-03 (+ D-P02 retry improvement)
- `src/Modules/Credit/Application/Services/HandleCreditToppedUpService.ts` — Plan 02-03
- `src/Modules/SdkApi/Application/UseCases/QueryUsage.ts` — Plan 02-04
- `src/Modules/Dashboard/Infrastructure/Services/UsageAggregator.ts` — Plan 02-05

### Wire functions to update (read alongside service plans)
- `src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts` — Plan 02-01
- `src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts` — Plan 02-02
- `src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts` — Plan 02-03
- `src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts` — Plan 02-04
- `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts` — Plan 02-05

### DO NOT TOUCH (Phase 2 exemption)
- `src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts` — ProxyModelCall exempt per D-P03
- `src/Modules/CliApi/` (entire module) — out of scope

### Phase 1 decisions (locked interface contracts)
- `.planning/phases/01-gateway-foundation/01-CONTEXT.md` — All D-01 through D-22 decisions are locked. UpdateKeyRequest wide DTO, GatewayError classification, MockGatewayClient API.

### Project-level constraints
- `.planning/PROJECT.md` — Core value, constraints, out-of-scope list
- `.planning/REQUIREMENTS.md` — MIGRATE-01–09, WIRE-02–06, TEST-01/03 are Phase 2 requirements
- `.planning/ROADMAP.md` §Phase 2 — Success criteria (all 5 criteria must be true after this phase)
- `.planning/codebase/CONCERNS.md` §1–3 — The coupling audit motivating this migration
- `.planning/codebase/ARCHITECTURE.md` — DI container + ServiceProvider pattern
- `.planning/codebase/TESTING.md` — Bun test layout, mocking patterns

### User-global policies
- `~/.claude/rules/coding-style.md` — Immutability mandate (readonly fields, no mutation)
- `~/.claude/rules/git-workflow.md` — Commit format `<type>: [<scope>] <subject>`
- `~/.claude/rules/testing.md` — 80% coverage target, mock interface not concrete class

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`MockGatewayClient`** — Full-featured test double already built in Phase 1. Use for all test rewrites.
- **`ILLMGatewayClient` barrel export** — Import from `@/Foundation/Infrastructure/Services/LLMGateway`; no deep path imports needed.
- **Existing `c.make('bifrostClient')` pattern** — Wire functions change this one call to `c.make('llmGatewayClient') as ILLMGatewayClient`.

### Established Patterns
- **Service constructor injection**: Parameter type changes from `BifrostClient` to `ILLMGatewayClient`; all call sites update method names (snake_case → camelCase via the interface).
- **Wire function pattern**: `c.make('llmGatewayClient') as ILLMGatewayClient` replaces `c.make('bifrostClient') as BifrostClient` at each injection site.
- **`bifrostClient` stays registered**: Do not remove the `bifrostClient` singleton from `FoundationServiceProvider` — it's needed by `CliApi` (out of scope) and will be removed in Phase 4.

### Integration Points
- `AppKeyBifrostSync.createVirtualKey` returns `{ bifrostVirtualKeyId, bifrostKeyValue }` — maps from `KeyResponse.id` and `KeyResponse.value`. Keep these field names through Phase 2; Phase 3 renames them.
- `UsageAggregator.getStats` passes multi-key arrays → `getUsageStats(keyIds, query)`. Adapter already handles the array-to-comma-join conversion.
- `UsageAggregator.getLogs` → `getUsageLogs(keyIds, query)`. Maps to `LogEntry[]`.

### Constraints Observed
- **No snake_case at call sites**: After migration, no call site under `src/Modules/` should pass `snake_case` field names (e.g., `rate_limit`, `provider_configs`). Use `rateLimit`, `providerConfigs`.
- **No `bifrostClient` import in application layer**: After this phase, `grep -r "BifrostClient" src/Modules/ src/Foundation/Application/` must return zero matches (excluding CliApi and test files that mock the interface).
- **TypeScript strict**: `tsc --noEmit` must pass after each plan.
- **Biome clean**: `bun run lint` must pass after each plan.

</code_context>

<specifics>
## Specific Ideas

- **5-plan-per-module structure** is user's explicit preference — planner must not collapse into fewer plans or expand to per-service granularity.
- **Both `execute()` and `retryPending()` get the retryable check** — this is a behavioral change: non-retryable `GatewayError`s and unknown errors now get `console.error` in `retryPending()` instead of silent swallow.
- **CliApi is the one survivor** — After Phase 2, `CliApiServiceProvider` will be the only place in `src/Modules/` still importing `BifrostClient`. This is intentional and must not trigger a lint failure or CI alert.

</specifics>

<deferred>
## Deferred Ideas

- **`HandleCreditToppedUpService` retry loop** — It currently has no retry loop (simpler than `HandleBalanceDepletedService`). If planner finds it needs one for consistency, defer to a future phase — don't add behavior beyond the `GatewayError` type change.
- **`UsageQuery` field widening** — If planner finds additional Bifrost query parameters consumed by `UsageAggregator` or `QueryUsage` that aren't in the current `UsageQuery` interface, add them in the Phase 2 plan rather than this context. The interface allows widening.
- **CliApi migration** — Deferred indefinitely per PROJECT.md out-of-scope decision.

</deferred>

---

*Phase: 02-business-layer-migration*
*Context gathered: 2026-04-10*
