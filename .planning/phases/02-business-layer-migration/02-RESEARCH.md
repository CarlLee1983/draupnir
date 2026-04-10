# Phase 2: Business-Layer Migration - Research

**Researched:** 2026-04-10
**Domain:** TypeScript DDD service migration — replacing concrete `BifrostClient` constructor injection with `ILLMGatewayClient` interface across 7 services, 5 wire functions, and their tests
**Confidence:** HIGH (all source files read directly; no external library research needed — this is a pure internal refactor within an already-built interface)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-P01:** Phase 2 splits into **5 plans, one per module**. All 5 plans are independent and can execute in parallel.

  | Plan | Module | Services | Wire function |
  |------|--------|----------|---------------|
  | 02-01 | AppApiKey | `AppKeyBifrostSync`, `GetAppKeyUsageService` | `wireAppApiKey` (AppApiKeyServiceProvider) |
  | 02-02 | ApiKey | `ApiKeyBifrostSync` | `wireApiKey` (ApiKeyServiceProvider) |
  | 02-03 | Credit | `HandleBalanceDepletedService`, `HandleCreditToppedUpService` | `wireCredit` (CreditServiceProvider) |
  | 02-04 | SdkApi | `QueryUsage` | `wireSdkApi` (SdkApiServiceProvider) |
  | 02-05 | Dashboard | `UsageAggregator` | `wireDashboard` (DashboardServiceProvider) |

- **D-P02:** Both `execute()` AND `retryPending()` in `HandleBalanceDepletedService` get the `GatewayError.retryable` improvement. Specific behavior:
  - `execute()` catch block: `instanceof GatewayError && error.retryable` → normal log; `instanceof GatewayError && !error.retryable` → `console.error`; other errors → `console.error`
  - `retryPending()`: remove empty `catch {}`, replace with retryable/non-retryable/other error discrimination

- **D-P03:** `src/Modules/CliApi/` is **fully exempt** — do not touch any file in that module.

- **D-P04:** `AppKeyBifrostSync.createVirtualKey` and `ApiKeyBifrostSync.createVirtualKey` continue returning `{ bifrostVirtualKeyId: string, bifrostKeyValue: string }` in Phase 2. Rename is Phase 3.

- **Test migration strategy:** Tests that mocked `BifrostClient` with `vi.fn()` are rewritten to inject `MockGatewayClient`. Assertions use `mock.calls.{method}` arrays. `mock.failNext(new GatewayError(...))` for failure paths. `mock.reset()` between test cases.

- **`bifrostClient` stays registered:** Do not remove the `bifrostClient` singleton from `FoundationServiceProvider` — `CliApi` still needs it.

### Claude's Discretion

- Exact test fixture structure within each module (shared fixture file vs inline per test)
- Whether `HandleCreditToppedUpService` gets the same retryable logging as `HandleBalanceDepletedService` (it currently has a simpler structure without a retry loop — planner should check and apply consistently)
- Import organization within migrated files (direct path vs barrel import for `ILLMGatewayClient`)

### Deferred Ideas (OUT OF SCOPE)

- `HandleCreditToppedUpService` retry loop — it has no retry loop; don't add one
- `UsageQuery` field widening — if additional Bifrost query parameters are needed, add in the Phase 2 plan rather than this context
- CliApi migration — deferred indefinitely
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MIGRATE-01 | `AppKeyBifrostSync` constructor type → `ILLMGatewayClient`; all method calls use new interface | Source read: file uses `createVirtualKey`, `updateVirtualKey({is_active})`, `deleteVirtualKey` → maps to `createKey`, `updateKey({isActive})`, `deleteKey` |
| MIGRATE-02 | `ApiKeyBifrostSync.createVirtualKey` + `.deactivateVirtualKey` + `.deleteVirtualKey` migrate to `ILLMGatewayClient` | Source read: same pattern as MIGRATE-01 plus `syncPermissions` snake_case → camelCase |
| MIGRATE-03 | `GetAppKeyUsageService` migrates to `ILLMGatewayClient` and uses camelCase query types | Source read: calls `bifrostClient.getLogsStats({virtual_key_ids, start_time, end_time})` → `getUsageStats([keyId], {startTime, endTime})` |
| MIGRATE-04 | `QueryUsage` (SdkApi) migrates to `ILLMGatewayClient` | Source read: calls `getLogsStats({virtual_key_ids, start_time, end_time})` → `getUsageStats([bifrostVirtualKeyId], {startTime, endTime})` |
| MIGRATE-05 | `UsageAggregator.getStats` and `getLogs` migrate to `ILLMGatewayClient` | Source read: calls `getLogsStats({virtual_key_ids: ids.join(',')})` and `getLogs({...})` → `getUsageStats(keyIds)` and `getUsageLogs(keyIds)`; returns type changes from `BifrostLogEntry[]` to `LogEntry[]` |
| MIGRATE-06 | No remaining direct `BifrostClient` imports in application layer (verified by grep) | Grep check: `grep -r "BifrostClient" src/Modules/ src/Foundation/Application/` must return zero matches (excluding CliApi) |
| MIGRATE-07 | `HandleBalanceDepletedService` migrates from `BifrostClient.updateVirtualKey({rate_limit})` to `ILLMGatewayClient.updateKey({rateLimit})`; retry loop uses `GatewayError.retryable` | Source read: uses snake_case `rate_limit` object → camelCase `rateLimit` in UpdateKeyRequest |
| MIGRATE-08 | `HandleCreditToppedUpService` migrates from `BifrostClient.updateVirtualKey({rate_limit})` to `ILLMGatewayClient.updateKey({rateLimit})` | Source read: same snake_case → camelCase translation; no retry loop to add |
| MIGRATE-09 | `ApiKeyBifrostSync.syncPermissions` migrates from `BifrostClient.updateVirtualKey({provider_configs, rate_limit})` to `ILLMGatewayClient.updateKey({providerConfigs, rateLimit})` | Source read: detailed mapping documented in Architecture Patterns section |
| WIRE-02 | `wireAppApiKey` (AppApiKeyServiceProvider) resolves `llmGatewayClient` from container | Source read: currently uses `c.make('bifrostClient') as BifrostClient` in 2 places |
| WIRE-03 | `wireApiKey` (ApiKeyServiceProvider) resolves `llmGatewayClient` from container | Source read: currently uses `c.make('bifrostClient') as BifrostClient` in 1 place |
| WIRE-04 | `wireSdkApi` (SdkApiServiceProvider) resolves `llmGatewayClient` for `QueryUsage` | Source read: currently uses `c.make('bifrostClient') as BifrostClient` for `queryUsage` binding |
| WIRE-05 | `wireDashboard` (DashboardServiceProvider) resolves `llmGatewayClient` for `UsageAggregator` | Source read: currently uses `c.make('bifrostClient') as BifrostClient` for `usageAggregator` singleton |
| WIRE-06 | No application-layer constructor type signature references `BifrostClient` after completion | All 5 provider files migrated; CliApi is the only permitted survivor |
| TEST-01 | Tests rewritten to mock `ILLMGatewayClient` or use `MockGatewayClient` | 8 test files identified that use `BifrostClient` mocks — each migrated in same plan as its service |
| TEST-03 | Full Bun unit + feature test suite passes at every phase boundary | Test commands: `bun test src tests`; route tests: `bun test tests/Feature/` |
</phase_requirements>

---

## Summary

Phase 2 is a pure internal refactor — no new libraries, no schema changes, no new abstractions. Every piece of infrastructure is already in place from Phase 1. The only work is substituting constructor parameter types and updating method call signatures across 7 service files, 5 service provider files, and 8 test files.

The migration follows a single repeatable pattern: `import type { BifrostClient }` → `import type { ILLMGatewayClient }`, constructor parameter type change, method name and field name translation (snake_case → camelCase), and container resolution key change (`bifrostClient` → `llmGatewayClient`).

The most complex single file is `HandleBalanceDepletedService` because it adds a behavioral change (the `GatewayError.retryable` discriminator in both `execute()` and `retryPending()`). All other files are purely mechanical substitutions. The `UsageAggregator` migration has one structural difference: the return type of `getLogs` changes from `readonly BifrostLogEntry[]` to `readonly LogEntry[]`, which removes the Bifrost-specific import entirely.

**Primary recommendation:** Execute the 5 plans in parallel. Each plan is fully contained within one module directory. The only shared concern is the final grep verification (MIGRATE-06, WIRE-06), which runs after all 5 plans complete.

---

## Standard Stack

### Core (Phase 1 — already built, no installation needed)

| Asset | Location | Purpose |
|-------|----------|---------|
| `ILLMGatewayClient` | `src/Foundation/Infrastructure/Services/LLMGateway/ILLMGatewayClient.ts` | The interface all services must now inject |
| `UpdateKeyRequest` | `src/Foundation/Infrastructure/Services/LLMGateway/types.ts` | Wide DTO covering rateLimit + providerConfigs + isActive |
| `GatewayError` | `src/Foundation/Infrastructure/Services/LLMGateway/errors.ts` | Replaces all `BifrostApiError` catches; has `.retryable` flag |
| `MockGatewayClient` | `src/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient.ts` | Test double with `.calls`, `.failNext()`, `.reset()`, `.seedUsageStats()`, `.seedUsageLogs()` |
| Barrel export | `src/Foundation/Infrastructure/Services/LLMGateway/index.ts` | Import path for all runtime code |

**Import pattern for runtime files:**
```typescript
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { UpdateKeyRequest } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway'
```

**Import pattern for test files:**
```typescript
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway'
```

Note: The barrel export re-exports `MockGatewayClient`, but per the MockGatewayClient file's JSDoc, tests should import directly from the implementation path to avoid ambiguity.

---

## Architecture Patterns

### Pattern 1: Service Constructor Migration

**What:** Every service file replaces `BifrostClient` with `ILLMGatewayClient` in its constructor and updates all method call signatures.

**Template:**
```typescript
// BEFORE
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

export class SomeService {
  constructor(private readonly bifrostClient: BifrostClient) {}

  async doSomething(): Promise<void> {
    await this.bifrostClient.updateVirtualKey(keyId, {
      rate_limit: { token_max_limit: 0, token_reset_duration: '1h' },
    })
  }
}

// AFTER
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'

export class SomeService {
  constructor(private readonly gatewayClient: ILLMGatewayClient) {}

  async doSomething(): Promise<void> {
    await this.gatewayClient.updateKey(keyId, {
      rateLimit: { tokenMaxLimit: 0, tokenResetDuration: '1h' },
    })
  }
}
```

**Constructor parameter rename convention:** `bifrostClient` → `gatewayClient` (private field name). This is Claude's discretion — the planner may choose to keep it as `llmGatewayClient` or `gatewayClient` for consistency; either is correct as long as the type is `ILLMGatewayClient`.

### Pattern 2: Wire Function Migration

**What:** Each ServiceProvider changes one call: `c.make('bifrostClient') as BifrostClient` → `c.make('llmGatewayClient') as ILLMGatewayClient`.

**Template:**
```typescript
// BEFORE
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

container.singleton('someService', (c: IContainer) => {
  return new SomeService(c.make('bifrostClient') as BifrostClient)
})

// AFTER
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'

container.singleton('someService', (c: IContainer) => {
  return new SomeService(c.make('llmGatewayClient') as ILLMGatewayClient)
})
```

### Pattern 3: Test Migration to MockGatewayClient

**What:** Tests that built a `vi.fn()` mock object of `BifrostClient` instead construct a `MockGatewayClient` instance.

**Template:**
```typescript
// BEFORE
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

let mockClient: BifrostClient

beforeEach(() => {
  mockClient = {
    updateVirtualKey: vi.fn().mockResolvedValue({}),
  } as unknown as BifrostClient
  service = new SomeService(mockClient)
})

it('should call updateVirtualKey', async () => {
  await service.doSomething()
  expect(mockClient.updateVirtualKey).toHaveBeenCalledWith(...)
})

// AFTER
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway'

let mock: MockGatewayClient

beforeEach(() => {
  mock = new MockGatewayClient()
  service = new SomeService(mock)
})

afterEach(() => {
  mock.reset()
})

it('should call updateKey', async () => {
  await service.doSomething()
  expect(mock.calls.updateKey).toHaveLength(1)
  expect(mock.calls.updateKey[0].keyId).toBe('some-id')
  expect(mock.calls.updateKey[0].request.rateLimit?.tokenMaxLimit).toBe(0)
})

it('should handle failure', async () => {
  mock.failNext(new GatewayError('key not found', 'NOT_FOUND', 404, false))
  const result = await service.doSomething()
  expect(result.failed).toBe(1)
})
```

**Key difference:** `MockGatewayClient` is stateful — if a test creates a key first, `updateKey` will find it. Tests that need isolation must call `mock.reset()` in `afterEach` or `beforeEach`.

**Limitation:** `MockGatewayClient.updateKey` throws `GatewayError('Key not found', 'NOT_FOUND', 404, false)` if the keyId doesn't exist in its internal store. Tests that call `updateKey` without a prior `createKey` must use `failNext` to pre-seed the failure OR pre-populate the mock. The existing `HandleBalanceDepletedService` test mocks use a plain `vi.fn()` repository that returns keys without calling `createKey` on the mock — this means after migration, the `MockGatewayClient` internal store will be empty and `updateKey` will throw `NOT_FOUND` unexpectedly.

**Resolution for key-not-in-mock-store problem:** Use `mock.failNext()` only for the failure path tests. For the success path, call `mock.createKey(...)` first in `beforeEach` to seed the store, OR use a different approach: since `MockGatewayClient.maybeThrow()` runs before the store check, `failNext` takes priority. Alternatively, the service test can seed the mock's store by calling `await mock.createKey({ name: 'test' })` in `beforeEach` to get the ID, then pass that ID to the test fixtures.

**Practical resolution pattern for suspend/restore tests:**
```typescript
beforeEach(async () => {
  mock = new MockGatewayClient()
  // Seed a key so updateKey finds it in the store
  const created = await mock.createKey({ name: 'vkey-1', isActive: true })
  gatewayKeyId = created.id  // use this ID in test fixtures
  service = new HandleBalanceDepletedService(apiKeyRepo, mock)
})
```

However, the existing test fixtures hard-code `bifrostVirtualKeyId: 'vkey-1'` as the key's gateway ID in domain aggregates. The mock's generated IDs are `mock_vk_000001` format. There are two options:

1. **Option A (recommended):** Seed `mock.createKey()` in `beforeEach`, get the generated ID, then construct the `ApiKey` aggregate using that ID. Slightly more verbose but correctly exercises the roundtrip.
2. **Option B (simpler):** Don't rely on `MockGatewayClient`'s internal store for `updateKey` success path. Instead, pre-inject failure via `failNext` for failure tests and let the success path call succeed because `MockGatewayClient.updateKey` is called on an ID that doesn't exist — this would actually throw `NOT_FOUND`. This won't work for the happy path.

**Planner decision required:** Choose Option A (seed mock store in `beforeEach`) or note that the current tests don't actually verify the gateway key ID matches — they only verify that `apiKeyRepo.update` was called. In that case a simpler approach is to use `mock.failNext()` only for failure paths, and for success paths, pre-create a key in `beforeEach` that establishes the ID.

The cleanest approach: in `beforeEach`, call `await mock.createKey({ name: 'test-key', isActive: true })` — this seeds the store with ID `mock_vk_000001`. Then build the `ApiKey` domain aggregate with `bifrostVirtualKeyId: 'mock_vk_000001'`. Tests assert on `mock.calls.updateKey[0].keyId === 'mock_vk_000001'`.

### Pattern 4: ApiKeyBifrostSync.syncPermissions Field Translation

**What:** `syncPermissions` currently constructs snake_case objects for `BifrostClient.updateVirtualKey`. After migration it must use camelCase objects for `ILLMGatewayClient.updateKey`.

**Before (current source):**
```typescript
const providerConfigs = allowedModels
  ? [{ provider: '*', allowed_models: [...allowedModels] }]
  : undefined

const rateLimit =
  rpm != null || tpm != null
    ? {
        token_max_limit: tpm ?? 0,
        token_reset_duration: '1m',
        ...(rpm != null && { request_max_limit: rpm, request_reset_duration: '1m' }),
      }
    : undefined

await this.bifrostClient.updateVirtualKey(bifrostVirtualKeyId, {
  provider_configs: providerConfigs,
  rate_limit: rateLimit,
})
```

**After (migrated):**
```typescript
const providerConfigs = allowedModels
  ? [{ provider: '*', allowedModels: [...allowedModels] }]
  : undefined

const rateLimit =
  rpm != null || tpm != null
    ? {
        tokenMaxLimit: tpm ?? 0,
        tokenResetDuration: '1m',
        ...(rpm != null && { requestMaxLimit: rpm, requestResetDuration: '1m' }),
      }
    : undefined

await this.gatewayClient.updateKey(bifrostVirtualKeyId, {
  providerConfigs,
  rateLimit,
})
```

**Field mapping reference:**

| Old (snake_case) | New (camelCase) | Type |
|-----------------|-----------------|------|
| `provider_configs` | `providerConfigs` | `readonly ProviderConfigUpdate[]` |
| `rate_limit` | `rateLimit` | `RateLimitUpdate` |
| `is_active` | `isActive` | `boolean` |
| `allowed_models` | `allowedModels` | `readonly string[]` |
| `token_max_limit` | `tokenMaxLimit` | `number` |
| `token_reset_duration` | `tokenResetDuration` | `string` |
| `request_max_limit` | `requestMaxLimit` | `number` |
| `request_reset_duration` | `requestResetDuration` | `string` |
| `customer_id` (createKey) | `customerId` | `string` |
| `virtual_key_ids` (old stats) | `keyIds` (array) | `readonly string[]` |
| `start_time` | `startTime` | `string` |
| `end_time` | `endTime` | `string` |
| `total_requests` (stats) | `totalRequests` | `number` |
| `total_cost` | `totalCost` | `number` |
| `total_tokens` | `totalTokens` | `number` |
| `avg_latency` | `avgLatency` | `number` |

### Pattern 5: HandleBalanceDepletedService Retry Improvement (D-P02)

**Current `execute()` catch block:**
```typescript
} catch (error: unknown) {
  console.error(`Key ${key.id} 阻擋失敗，將由排程重試:`, error)
  failed++
}
```

**After migration (D-P02):**
```typescript
} catch (error: unknown) {
  if (error instanceof GatewayError && error.retryable) {
    console.log(`Key ${key.id} 暫時性錯誤，將由排程重試:`, error.message)
  } else if (error instanceof GatewayError && !error.retryable) {
    console.error(`Key ${key.id} 永久性錯誤 (${error.code})，不應重試:`, error.message)
  } else {
    console.error(`Key ${key.id} 未知錯誤:`, error)
  }
  failed++
}
```

**Current `retryPending()` catch block:**
```typescript
} catch {
  // 下次重試
}
```

**After migration (D-P02):**
```typescript
} catch (error: unknown) {
  if (error instanceof GatewayError && error.retryable) {
    // 暫時性錯誤：下次重試 tick 再嘗試
    continue
  } else if (error instanceof GatewayError && !error.retryable) {
    console.error(`Key ${key.id} 永久性錯誤，不再重試 (${error.code}):`, error.message)
  } else {
    console.error(`Key ${key.id} 未知錯誤，停止此 key 重試:`, error)
  }
}
```

Note: `continue` in the retryable branch replaces the silent `catch {}` — semantics are preserved (will retry next cron tick) but explicit.

### Pattern 6: UsageAggregator Return Type Change

**Current signature:**
```typescript
async getLogs(
  virtualKeyIds: readonly string[],
  query?: Partial<BifrostLogsQuery>,
): Promise<readonly BifrostLogEntry[]>
```

**After migration:**
```typescript
async getLogs(
  keyIds: readonly string[],
  query?: UsageQuery,
): Promise<readonly LogEntry[]>
```

The `BifrostLogEntry` type is replaced by `LogEntry` from the gateway types. The mapping is done inside `BifrostGatewayAdapter` (already built in Phase 1). At the `UsageAggregator` call site, the return value is now `readonly LogEntry[]` — callers (`GetUsageChartService`, `GetDashboardSummaryService`) must be checked to ensure they only access fields present in `LogEntry`.

**`LogEntry` fields available:**
- `timestamp`, `keyId`, `model`, `provider`, `inputTokens`, `outputTokens`, `totalTokens`, `latencyMs`, `cost`, `status`

**`BifrostLogEntry` fields that disappear:** `id`, `object`, `latency` (renamed to `latencyMs` already in adapter), `virtual_key_id` (renamed to `keyId`), `input_tokens` (camelCased), `output_tokens` (camelCased), `total_tokens` (camelCased)

Callers of `getLogs` must be checked before the plan executes — if `GetUsageChartService` accesses any of the removed fields, those accesses must be updated.

### Pattern 7: QueryUsage — Array vs. String Key ID

**Current `QueryUsage.execute()`:**
```typescript
const stats = await this.bifrostClient.getLogsStats({
  virtual_key_ids: auth.bifrostVirtualKeyId,  // string, single key
  ...
})
```

**After migration:**
```typescript
const stats = await this.gatewayClient.getUsageStats(
  [auth.bifrostVirtualKeyId],  // array, single-element
  options?.startDate || options?.endDate
    ? { startTime: options.startDate, endTime: options.endDate }
    : undefined,
)
```

Return value changes from `{ total_requests, total_cost, total_tokens, avg_latency }` to `{ totalRequests, totalCost, totalTokens, avgLatency }` — update all field accesses accordingly.

### Anti-Patterns to Avoid

- **Anti-pattern:** Importing `BifrostClient` type into a migrated file even as `unknown` cast — after this phase, zero imports of `BifrostClient` may exist in any migrated file.
- **Anti-pattern:** Using `c.make('bifrostClient')` in migrated provider files — must change to `c.make('llmGatewayClient')`.
- **Anti-pattern:** Leaving snake_case field names in migrated service method bodies — e.g., `{ rate_limit: ... }` — TypeScript strict mode will catch this but only if the type is correctly changed.
- **Anti-pattern:** Removing `bifrostClient` registration from `FoundationServiceProvider` — `CliApi` still uses it via `ProxyModelCall`. Do not touch `FoundationServiceProvider`.
- **Anti-pattern:** Importing `MockGatewayClient` from the barrel index in runtime src/ files — only import from the direct implementation path in test files.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Snake→camelCase field conversion at call sites | Manual rename helpers | Already done inside `BifrostGatewayAdapter` — just use the interface | Conversion is adapter's job; application layer sees only camelCase |
| Failure injection in tests | Custom mock with `shouldFail` flag | `MockGatewayClient.failNext(new GatewayError(...))` | FIFO queue already implemented in Phase 1 |
| Usage stats seeding in tests | Custom mock returning fixed stats | `MockGatewayClient.seedUsageStats({ totalRequests: 42, ... })` | Already implemented in Phase 1 |
| Log entry seeding in tests | Custom mock returning log arrays | `MockGatewayClient.seedUsageLogs([...])` | Already implemented in Phase 1 |
| Error discrimination | New error types | `GatewayError` with `.retryable` flag already defined | Defined in `errors.ts`, imported from barrel |

---

## Complete File-by-File Migration Map

### Plan 02-01: AppApiKey Module

**Service files to change:**

1. `src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts`
   - Remove: `import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'`
   - Add: `import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'`
   - Constructor: `private readonly bifrostClient: BifrostClient` → `private readonly gatewayClient: ILLMGatewayClient`
   - `createVirtualKey`: `bifrostClient.createVirtualKey({ name, customer_id })` → `gatewayClient.createKey({ name, customerId })`; return maps `vk.id` → `id`, `vk.value` → `value`
   - `deactivateVirtualKey`: `bifrostClient.updateVirtualKey(id, { is_active: false })` → `gatewayClient.updateKey(id, { isActive: false })`
   - `deleteVirtualKey`: `bifrostClient.deleteVirtualKey(id)` → `gatewayClient.deleteKey(id)`
   - Keep return interface `{ bifrostVirtualKeyId, bifrostKeyValue }` unchanged (D-P04)

2. `src/Modules/AppApiKey/Application/Services/GetAppKeyUsageService.ts`
   - Remove: `import type { BifrostClient } from ...`
   - Add: `import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'`
   - Constructor: replace `BifrostClient` with `ILLMGatewayClient`
   - `execute()`: `bifrostClient.getLogsStats({ virtual_key_ids: key.bifrostVirtualKeyId, start_time, end_time })` → `gatewayClient.getUsageStats([key.bifrostVirtualKeyId], { startTime: request.startDate, endTime: request.endDate })`
   - Return value: `stats.total_requests` → `stats.totalRequests`, `stats.total_tokens` → `stats.totalTokens`, `stats.total_cost` → `stats.totalCost`

**Provider file to change:**

3. `src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts`
   - Remove: `import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'`
   - Add: `import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'`
   - `appKeyBifrostSync` singleton: `c.make('bifrostClient') as BifrostClient` → `c.make('llmGatewayClient') as ILLMGatewayClient`
   - `getAppKeyUsageService` bind: `c.make('bifrostClient') as BifrostClient` → `c.make('llmGatewayClient') as ILLMGatewayClient`

**Test files to migrate:**

4. `src/Modules/AppApiKey/__tests__/GetAppKeyUsageService.test.ts`
   - Remove `createMockBifrostClient()` function and `BifrostClient` import
   - Add `MockGatewayClient` import
   - `beforeEach`: construct `MockGatewayClient`, call `mock.seedUsageStats({ totalRequests: 42, totalCost: 0.56, totalTokens: 12345, avgLatency: 0 })`
   - Service construction: pass `mock` instead of `bifrostClient`
   - Assertions: no `vi.fn` spy assertions needed — verify via `mock.calls.getUsageStats`

5. `src/Modules/AppApiKey/__tests__/IssueAppKeyService.test.ts`
   - `createMockSync()` currently constructs a `BifrostClient` mock and passes it to `new AppKeyBifrostSync(mockClient)` — after migration, `AppKeyBifrostSync` takes `ILLMGatewayClient`, so `createMockSync()` must use `MockGatewayClient` instead
   - The mock currently returns `{ id: 'bfr-vk-app-new', name: '[App] test', value: 'vk_live_app_abc', is_active: true, provider_configs: [] }` — with `MockGatewayClient`, `createKey` returns `{ id: 'mock_vk_000001', name: '[App] test', value: 'mock_raw_key_000001', isActive: true }` automatically
   - For the failure path test (`shouldFail = true`): use `mock.failNext(new GatewayError('connection failed', 'NETWORK', 503, true))`

### Plan 02-02: ApiKey Module

**Service files to change:**

1. `src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts`
   - Remove `BifrostClient` import; add `ILLMGatewayClient` import
   - Constructor type change
   - `createVirtualKey`: `createVirtualKey({ name, customer_id })` → `createKey({ name, customerId })`; map return fields
   - `syncPermissions`: full field translation (see Pattern 4 above)
   - `deactivateVirtualKey`: `updateVirtualKey(id, { is_active: false })` → `updateKey(id, { isActive: false })`
   - `deleteVirtualKey`: `deleteVirtualKey(id)` → `deleteKey(id)`

**Provider file to change:**

2. `src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts`
   - Remove `BifrostClient` import; add `ILLMGatewayClient` import
   - `apiKeyBifrostSync` singleton: change resolution key and type cast

**Test files to migrate:**

3. `src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts`
   - Remove `createMockBifrostClient()` and `BifrostClient` / `BifrostVirtualKey` imports
   - Add `MockGatewayClient` import
   - `beforeEach`: `mock = new MockGatewayClient(); sync = new ApiKeyBifrostSync(mock)`
   - `afterEach`: `mock.reset()`
   - `createVirtualKey` test: assert `mock.calls.createKey[0].name === 'My Key'`, `mock.calls.createKey[0].customerId === 'org-1'`; result still has `bifrostVirtualKeyId` and `bifrostKeyValue` fields
   - `syncPermissions` test: assert `mock.calls.updateKey[0].request.providerConfigs[0].allowedModels` contains `'gpt-4'`; assert `mock.calls.updateKey[0].request.rateLimit.requestMaxLimit === 60`
   - `deactivateVirtualKey` test: assert `mock.calls.updateKey[0].request.isActive === false`
   - `deleteVirtualKey` test: assert `mock.calls.deleteKey[0] === 'bfr-vk-1'`
   - Note: `syncPermissions` test needs to call `await mock.createKey({ name: 'test' })` first to seed the mock store with a known ID, OR change the assertion to not check the returned key (since `updateKey` throws NOT_FOUND if key not in store). **Recommended:** pre-create the key in the mock store.

4. `src/Modules/ApiKey/__tests__/SetKeyPermissionsService.test.ts`
   - `createMockSync()` currently passes a `BifrostClient` mock to `new ApiKeyBifrostSync(mockClient)` — after migration, pass `MockGatewayClient` instance
   - Success test: `updateVirtualKey` was `vi.fn().mockResolvedValue({...})` — now it's `MockGatewayClient.updateKey` which requires the key to exist in store. Seed with `await mock.createKey(...)` in the mock-sync creation or pre-populate.

### Plan 02-03: Credit Module

**Service files to change:**

1. `src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts`
   - Remove `BifrostClient` import; add `ILLMGatewayClient` and `GatewayError` imports
   - Constructor type change
   - `execute()`: `bifrostClient.updateVirtualKey(key.bifrostVirtualKeyId, { rate_limit: { token_max_limit: 0, token_reset_duration: '1h', request_max_limit: 0, request_reset_duration: '1h' } })` → `gatewayClient.updateKey(key.bifrostVirtualKeyId, { rateLimit: { tokenMaxLimit: 0, tokenResetDuration: '1h', requestMaxLimit: 0, requestResetDuration: '1h' } })`
   - `execute()` catch: apply D-P02 retryable discrimination
   - `retryPending()`: same `updateKey` translation; replace empty `catch {}` with D-P02 discrimination

2. `src/Modules/Credit/Application/Services/HandleCreditToppedUpService.ts`
   - Remove `BifrostClient` import; add `ILLMGatewayClient` import
   - Constructor type change
   - `execute()`: `bifrostClient.updateVirtualKey(key.bifrostVirtualKeyId, { rate_limit: { token_max_limit: preFreeze.tpm ?? 100000, token_reset_duration: '1h', request_max_limit: preFreeze.rpm ?? null, request_reset_duration: preFreeze.rpm ? '1m' : null } })` → `gatewayClient.updateKey(key.bifrostVirtualKeyId, { rateLimit: { tokenMaxLimit: preFreeze.tpm ?? 100000, tokenResetDuration: '1h', ...(preFreeze.rpm != null && { requestMaxLimit: preFreeze.rpm, requestResetDuration: '1m' }) } })`
   - Note: `request_max_limit: preFreeze.rpm ?? null` — in `UpdateKeyRequest`, `requestMaxLimit` is `number | undefined`, not `number | null`. Remove `?? null` pattern; use `...(preFreeze.rpm != null && { requestMaxLimit: preFreeze.rpm, requestResetDuration: '1m' })` spread instead.
   - Catch block: planner to decide whether to add retryable discrimination (discretion per CONTEXT.md) — it currently has `console.error` without GatewayError check.

**Provider file to change:**

3. `src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts`
   - Remove `BifrostClient` import; add `ILLMGatewayClient` import
   - `handleBalanceDepletedService` and `handleCreditToppedUpService` binds: change resolution key and type cast

**Test files to migrate:**

4. `src/Modules/Credit/__tests__/HandleBalanceDepletedService.test.ts`
   - Remove `BifrostClient` import and `bifrostClient` variable
   - Add `MockGatewayClient` and `GatewayError` imports
   - `beforeEach`: construct `mock = new MockGatewayClient()`; seed key in mock store: `await mock.createKey({ name: 'key-1', isActive: true })` to get `mock_vk_000001` ID; build `ApiKey` aggregate with `bifrostVirtualKeyId: 'mock_vk_000001'`
   - Success test: assert `mock.calls.updateKey[0].request.rateLimit.tokenMaxLimit === 0`
   - Failure test: use `mock.failNext(new GatewayError('error', 'NETWORK', 503, true))` before service call

5. `src/Modules/Credit/__tests__/HandleCreditToppedUpService.test.ts`
   - Same pattern as above for `HandleCreditToppedUpService`

### Plan 02-04: SdkApi Module

**Service files to change:**

1. `src/Modules/SdkApi/Application/UseCases/QueryUsage.ts`
   - Remove `BifrostClient` import; add `ILLMGatewayClient` import
   - Constructor type change
   - `execute()`: `bifrostClient.getLogsStats({ virtual_key_ids: auth.bifrostVirtualKeyId, start_time, end_time })` → `gatewayClient.getUsageStats([auth.bifrostVirtualKeyId], options?.startDate || options?.endDate ? { startTime: options.startDate, endTime: options.endDate } : undefined)`
   - Return mapping: `stats.total_requests` → `stats.totalRequests`, etc.

**Provider file to change:**

2. `src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts`
   - Remove `BifrostClient` import; add `ILLMGatewayClient` import
   - `queryUsage` bind: `c.make('bifrostClient') as BifrostClient` → `c.make('llmGatewayClient') as ILLMGatewayClient`
   - Note: `proxyModelCall` bind does NOT use `bifrostClient` — it uses `bifrostBaseUrl` directly. No change needed there.

**Test files to migrate:**

3. `src/Modules/SdkApi/__tests__/QueryUsage.test.ts`
   - Remove `createMockBifrostClient()` and `BifrostClient` import
   - Add `MockGatewayClient` import
   - `beforeEach`: `mock = new MockGatewayClient(); mock.seedUsageStats({ totalRequests: 100, totalCost: 5.25, totalTokens: 50000, avgLatency: 320 }); useCase = new QueryUsage(mock)`
   - Assertions: `mock.calls.getUsageStats[0].keyIds` contains `'bfr-vk-1'`; `mock.calls.getUsageStats[0].query?.startTime === '2026-04-01'`
   - Failure test: `mock.failNext(new GatewayError('connection failed', 'NETWORK', 503, true))`; result.success should be false

### Plan 02-05: Dashboard Module

**Service files to change:**

1. `src/Modules/Dashboard/Infrastructure/Services/UsageAggregator.ts`
   - Remove `BifrostClient` import and `BifrostLogEntry`, `BifrostLogsQuery` imports
   - Add `ILLMGatewayClient`, `LogEntry`, `UsageQuery` imports from gateway barrel
   - Remove local `UsageStats` interface definition — use `UsageStats` from gateway types (or keep local interface if it matches exactly; the gateway `UsageStats` has the same shape)
   - Constructor type change
   - `getStats()` signature: `query?: Partial<BifrostLogsQuery>` → `query?: UsageQuery`; call `gatewayClient.getUsageStats(virtualKeyIds, query)` (array already, no `.join(',')`); map return fields from camelCase (already camelCase in UsageStats, no change needed in return mapping since field names match the local interface)
   - `getLogs()` signature: `query?: Partial<BifrostLogsQuery>` → `query?: UsageQuery`; call `gatewayClient.getUsageLogs(virtualKeyIds, query)`; return type changes to `Promise<readonly LogEntry[]>`; remove the `.logs` property access (the old `response.logs` extraction)

**Provider file to change:**

2. `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts`
   - Remove `BifrostClient` import; add `ILLMGatewayClient` import
   - `usageAggregator` singleton: change resolution key and type cast

**Test files to migrate:**

3. `src/Modules/Dashboard/__tests__/UsageAggregator.test.ts`
   - Remove `createMockBifrostClient()` and `BifrostClient`, `BifrostLogEntry` imports
   - Add `MockGatewayClient`, `LogEntry` imports
   - Use `mock.seedUsageStats(...)` and `mock.seedUsageLogs([...])` for test data
   - `sampleLogs` must be converted from `BifrostLogEntry` shape to `LogEntry` shape (camelCase fields, no `id`/`object` fields)
   - Assertions change: `stats.totalRequests` (same), `stats.totalCost` (same); logs length check still works

4. `src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts`
   - `createMockAggregator()` currently passes a `BifrostClient` mock to `new UsageAggregator(mockClient)` — after migration, pass `MockGatewayClient` instance
   - Seed stats in `beforeEach` with `mock.seedUsageStats(...)`

---

## Common Pitfalls

### Pitfall 1: MockGatewayClient `updateKey` Throws NOT_FOUND by Default

**What goes wrong:** Test calls `service.execute()` which calls `gatewayClient.updateKey(someId, ...)`, but `MockGatewayClient` has no key with that ID in its internal map, so it throws `GatewayError('Key not found', 'NOT_FOUND', 404, false)` even in the "success" test case.

**Why it happens:** Unlike the old `vi.fn().mockResolvedValue({})` which always succeeds, `MockGatewayClient.updateKey` actually validates ID existence.

**How to avoid:** In `beforeEach`, seed the mock store before the success-path test:
```typescript
const created = await mock.createKey({ name: 'test-key', isActive: true })
// Now use created.id as the bifrostVirtualKeyId in test fixtures
```

**Warning signs:** Tests throw `GatewayError: Key not found: mock_vk_000001` in the success case.

### Pitfall 2: `UsageAggregator` Caller Uses `BifrostLogsQuery` Fields Not in `UsageQuery`

**What goes wrong:** `GetUsageChartService` constructs a `bifrostQuery` object with fields `start_time`, `end_time`, `providers`, `models`, and `limit`, then passes it to `usageAggregator.getLogs(virtualKeyIds, bifrostQuery)` and `usageAggregator.getStats(virtualKeyIds, bifrostQuery)`. After migration, `UsageAggregator` accepts `UsageQuery` which only has `startTime` and `endTime`. The fields `providers`, `models`, and `limit` do not exist in `UsageQuery`. TypeScript strict mode will reject this at compile time.

**Source confirmed:** `GetUsageChartService.ts` lines 45-56 — the `bifrostQuery` object is built with snake_case fields and passed to both aggregator methods.

**Why it happens:** `UsageQuery` was defined minimally in Phase 1. The CONTEXT.md deferred section explicitly permits: "If planner finds additional Bifrost query parameters consumed by `UsageAggregator` or `QueryUsage` that aren't in the current `UsageQuery` interface, add them in the Phase 2 plan."

**How to avoid:** Plan 02-05 MUST include a task to:
1. Widen `UsageQuery` in `src/Foundation/Infrastructure/Services/LLMGateway/types.ts`:
```typescript
export interface UsageQuery {
  readonly startTime?: string
  readonly endTime?: string
  readonly providers?: string    // new
  readonly models?: string       // new
  readonly limit?: number        // new
}
```
2. Update `GetUsageChartService` to pass camelCase query object (not `bifrostQuery` with snake_case keys)
3. Update `BifrostGatewayAdapter` to forward the new fields to Bifrost API in its `getUsageStats` and `getUsageLogs` implementations (snake_case translation in adapter)

**Warning signs:** `tsc --noEmit` fails with: `Object literal may only specify known properties, and 'start_time' does not exist in type 'UsageQuery'` in `GetUsageChartService`.

### Pitfall 3: `HandleCreditToppedUpService` `null` in `requestMaxLimit`

**What goes wrong:** Current code passes `request_max_limit: preFreeze.rpm ?? null` — after migration, `requestMaxLimit` is typed as `number | undefined`, not `number | null`. TypeScript strict mode will reject `null`.

**Why it happens:** The `UpdateKeyRequest.RateLimitUpdate` interface uses optional fields (`readonly requestMaxLimit?: number`), not nullable.

**How to avoid:** Use the spread pattern instead of `?? null`:
```typescript
...(preFreeze.rpm != null && { requestMaxLimit: preFreeze.rpm, requestResetDuration: '1m' })
```

**Warning signs:** `tsc --noEmit` error: `Type 'null' is not assignable to type 'number | undefined'`.

### Pitfall 4: Query Options Conditionality in `GetAppKeyUsageService` and `QueryUsage`

**What goes wrong:** Old code spreads `start_time: request.startDate` unconditionally. If `startDate` is `undefined`, `{ startTime: undefined }` is passed to `getUsageStats`, which may behave differently than omitting the field.

**Why it happens:** `UsageQuery` fields are optional (`readonly startTime?: string`). Passing `undefined` values should be safe, but it's cleaner to omit them.

**How to avoid:** Pass `undefined` for the entire query object if no dates are provided:
```typescript
const query = request.startDate || request.endDate
  ? { startTime: request.startDate, endTime: request.endDate }
  : undefined
const stats = await this.gatewayClient.getUsageStats([key.bifrostVirtualKeyId], query)
```

### Pitfall 5: `bifrostClient` Import Survives via Test Files

**What goes wrong:** After migrating service files, a test file still imports `BifrostClient` to construct a `vi.fn()` mock of it, which it then passes to the now-migrated sync class. TypeScript will catch the type mismatch, but the import itself may remain.

**Why it happens:** Test files sometimes import `BifrostClient` just to get the type for casting `as unknown as BifrostClient`. After migration, the service no longer accepts `BifrostClient`, so the cast fails.

**How to avoid:** Remove all `BifrostClient` imports from test files when migrating. Use `MockGatewayClient` directly.

**Warning signs:** `tsc --noEmit` error: `Argument of type 'BifrostClient' is not assignable to parameter of type 'ILLMGatewayClient'`.

---

## Code Examples

### Complete `AppKeyBifrostSync` After Migration

```typescript
// Source: direct source read + ILLMGatewayClient interface contract
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'

interface CreateVirtualKeyResult {
  bifrostVirtualKeyId: string
  bifrostKeyValue: string
}

export class AppKeyBifrostSync {
  constructor(private readonly gatewayClient: ILLMGatewayClient) {}

  async createVirtualKey(label: string, orgId: string): Promise<CreateVirtualKeyResult> {
    const vk = await this.gatewayClient.createKey({
      name: `[App] ${label}`,
      customerId: orgId,
    })
    return {
      bifrostVirtualKeyId: vk.id,
      bifrostKeyValue: vk.value ?? '',
    }
  }

  async deactivateVirtualKey(bifrostVirtualKeyId: string): Promise<void> {
    await this.gatewayClient.updateKey(bifrostVirtualKeyId, { isActive: false })
  }

  async deleteVirtualKey(bifrostVirtualKeyId: string): Promise<void> {
    await this.gatewayClient.deleteKey(bifrostVirtualKeyId)
  }
}
```

### Complete `ApiKeyBifrostSync.syncPermissions` After Migration

```typescript
// Source: direct source read + ILLMGatewayClient types contract
async syncPermissions(bifrostVirtualKeyId: string, scope: KeyScope): Promise<void> {
  const allowedModels = scope.getAllowedModels()
  const rpm = scope.getRateLimitRpm()
  const tpm = scope.getRateLimitTpm()

  const providerConfigs = allowedModels
    ? [{ provider: '*', allowedModels: [...allowedModels] }]
    : undefined

  const rateLimit =
    rpm != null || tpm != null
      ? {
          tokenMaxLimit: tpm ?? 0,
          tokenResetDuration: '1m',
          ...(rpm != null && { requestMaxLimit: rpm, requestResetDuration: '1m' }),
        }
      : undefined

  await this.gatewayClient.updateKey(bifrostVirtualKeyId, {
    providerConfigs,
    rateLimit,
  })
}
```

### MockGatewayClient Test Pattern for Sync Services

```typescript
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway'

let mock: MockGatewayClient
let sync: ApiKeyBifrostSync

beforeEach(async () => {
  mock = new MockGatewayClient()
  sync = new ApiKeyBifrostSync(mock)
})

afterEach(() => {
  mock.reset()
})

it('createVirtualKey should call createKey and return mapped fields', async () => {
  const result = await sync.createVirtualKey('My Key', 'org-1')
  expect(mock.calls.createKey).toHaveLength(1)
  expect(mock.calls.createKey[0].name).toBe('My Key')
  expect(mock.calls.createKey[0].customerId).toBe('org-1')
  expect(result.bifrostVirtualKeyId).toBe('mock_vk_000001')
  expect(result.bifrostKeyValue).toBe('mock_raw_key_000001')
})

it('updateKey-based methods need key in mock store first', async () => {
  // Create key to seed mock store
  const created = await mock.createKey({ name: 'test-key' })
  
  await sync.deactivateVirtualKey(created.id)
  expect(mock.calls.updateKey[0].keyId).toBe(created.id)
  expect(mock.calls.updateKey[0].request.isActive).toBe(false)
})
```

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — this is a pure internal TypeScript refactor within an existing codebase; all tools — Bun, TypeScript, Biome — are already in use by the project).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 (for module unit tests) + Bun test (for feature tests) |
| Config file | None (configured via `package.json` scripts) |
| Quick run command | `bun test src/Modules/[Module]/ --reporter=verbose` |
| Full suite command | `bun test src tests` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MIGRATE-01 | `AppKeyBifrostSync` uses `ILLMGatewayClient` methods | unit | `bun test src/Modules/AppApiKey/__tests__/IssueAppKeyService.test.ts` | Yes (needs rewrite) |
| MIGRATE-02 | `ApiKeyBifrostSync` sync methods use camelCase | unit | `bun test src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts` | Yes (needs rewrite) |
| MIGRATE-03 | `GetAppKeyUsageService` uses `getUsageStats` | unit | `bun test src/Modules/AppApiKey/__tests__/GetAppKeyUsageService.test.ts` | Yes (needs rewrite) |
| MIGRATE-04 | `QueryUsage` uses `getUsageStats` array form | unit | `bun test src/Modules/SdkApi/__tests__/QueryUsage.test.ts` | Yes (needs rewrite) |
| MIGRATE-05 | `UsageAggregator` uses `getUsageStats` + `getUsageLogs` | unit | `bun test src/Modules/Dashboard/__tests__/UsageAggregator.test.ts` | Yes (needs rewrite) |
| MIGRATE-06 | No `BifrostClient` imports in app layer | grep check | `grep -r "BifrostClient" src/Modules/ src/Foundation/Application/ --include="*.ts" \| grep -v CliApi \| grep -v __tests__` | manual |
| MIGRATE-07 | `HandleBalanceDepletedService` uses `updateKey` + `GatewayError.retryable` | unit | `bun test src/Modules/Credit/__tests__/HandleBalanceDepletedService.test.ts` | Yes (needs rewrite) |
| MIGRATE-08 | `HandleCreditToppedUpService` uses `updateKey` with camelCase | unit | `bun test src/Modules/Credit/__tests__/HandleCreditToppedUpService.test.ts` | Yes (needs rewrite) |
| MIGRATE-09 | `ApiKeyBifrostSync.syncPermissions` uses `providerConfigs`, `rateLimit` | unit | `bun test src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts` | Yes (needs rewrite) |
| WIRE-02–06 | Service providers resolve `llmGatewayClient` | feature (route smoke) | `bun test tests/Feature/routes-connectivity.test.ts tests/Feature/routes-existence.test.ts` | Yes |
| TEST-01 | Tests use `MockGatewayClient` | unit (all above) | `bun test src` | Yes (needs rewrite) |
| TEST-03 | Full suite passes | full | `bun test src tests` | Yes |

### Sampling Rate
- **Per plan commit:** `bun test src/Modules/[Module]/ --reporter=verbose`
- **Per all-plans merge:** `bun test src tests`
- **Phase gate:** `bun test src tests` green + grep verification before marking phase complete

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. The test files exist and simply need their mock strategies updated. No new test files need to be created; no new framework config required.

---

## Project Constraints (from CLAUDE.md)

The following directives from `CLAUDE.md` / `AGENTS.md` / global rules apply to this phase:

| Directive | Impact on Phase 2 |
|-----------|-------------------|
| **No file under `src/Modules/` or `src/Foundation/Application/` may import a Bifrost-specific symbol** | Core goal of the phase — enforced by final grep check |
| **Immutability: new types use `readonly` fields, no mutation** | All new/changed interface usages already use readonly fields (ILLMGatewayClient types are all readonly) |
| **TypeScript strict: `tsc --noEmit` must pass** | Run after each plan; TypeScript will catch field name mismatches |
| **Biome clean: `bun run lint` must pass** | Run after each plan; Biome catches unused imports |
| **Commit format: `<type>: [ <scope> ] <subject>`** | Example: `refactor: [ AppApiKey ] migrate AppKeyBifrostSync to ILLMGatewayClient` |
| **`bifrostClient` stays registered in FoundationServiceProvider** | Do not remove — `CliApi` still uses it |
| **CliApi is fully exempt** | Never touch `src/Modules/CliApi/` |
| **No snake_case at call sites after migration** | Enforced by TypeScript types — `UpdateKeyRequest` only has camelCase fields |
| **80% test coverage target** | Existing tests cover all services; rewriting them maintains coverage |
| **No new `any` types** | Use `ILLMGatewayClient` type directly; avoid `as unknown as` patterns |

---

## Sources

### Primary (HIGH confidence)
- Direct source code read — all 7 service files, 5 provider files, 8 test files
- `src/Foundation/Infrastructure/Services/LLMGateway/ILLMGatewayClient.ts` — interface contract
- `src/Foundation/Infrastructure/Services/LLMGateway/types.ts` — DTO field names (all camelCase, readonly)
- `src/Foundation/Infrastructure/Services/LLMGateway/errors.ts` — GatewayError with `.retryable` flag
- `src/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient.ts` — exact mock API
- `src/Foundation/Infrastructure/Services/LLMGateway/index.ts` — barrel export structure
- `.planning/phases/02-business-layer-migration/02-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- `.planning/codebase/TESTING.md` — confirmed Vitest + Bun test patterns, mocking conventions

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Migration patterns: HIGH — every source file was read; field mappings are exact
- Test migration strategy: HIGH — MockGatewayClient API read directly; `updateKey` NOT_FOUND behavior documented
- MockGatewayClient store interaction: MEDIUM — the `updateKey` NOT_FOUND pitfall requires test authors to pre-seed; this is a behavioral subtlety that could be missed
- Wire function changes: HIGH — provider files read; exact change locations identified

**Research date:** 2026-04-10
**Valid until:** This research is tied to a specific codebase snapshot. Re-read source files if implementation deviates unexpectedly. The research is valid as long as Phase 1 artifacts remain unchanged (HIGH stability — they are locked decisions).
