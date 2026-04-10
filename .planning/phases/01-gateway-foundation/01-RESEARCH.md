# Phase 1: Gateway Foundation - Research

**Researched:** 2026-04-10
**Domain:** TypeScript interface abstraction, DI wiring, adapter pattern, Bun test framework
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Interface Surface (D-01 to D-08)**

- **D-01:** `ILLMGatewayClient` exposes **five** methods:
  ```ts
  interface ILLMGatewayClient {
    createKey(request: CreateKeyRequest): Promise<KeyResponse>
    updateKey(keyId: string, request: UpdateKeyRequest): Promise<KeyResponse>
    deleteKey(keyId: string): Promise<void>
    getUsageStats(keyIds: readonly string[], query?: UsageQuery): Promise<UsageStats>
    getUsageLogs(keyIds: readonly string[], query?: UsageQuery): Promise<readonly LogEntry[]>
  }
  ```

- **D-02:** `UpdateKeyRequest` is a wide DTO — every field optional:
  ```ts
  interface UpdateKeyRequest {
    readonly isActive?: boolean
    readonly rateLimit?: RateLimitUpdate
    readonly providerConfigs?: readonly ProviderConfigUpdate[]
  }
  interface RateLimitUpdate {
    readonly tokenMaxLimit?: number
    readonly tokenResetDuration?: string
    readonly requestMaxLimit?: number
    readonly requestResetDuration?: string
  }
  interface ProviderConfigUpdate {
    readonly provider: string
    readonly allowedModels?: readonly string[]
  }
  ```

- **D-03:** `getUsageStats`/`getUsageLogs` take `keyIds: readonly string[]` (array form). Adapter joins to comma string for Bifrost.

- **D-04:** `UsageStats` flat shape: `{ totalRequests, totalCost, totalTokens, avgLatency }`

- **D-05:** `LogEntry` typed DTO — only fields `UsageAggregator` consumers need:
  ```ts
  interface LogEntry {
    readonly timestamp: string
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
  NOTE: Verify field list against `UsageAggregator` consumers before finalizing (D-05 note from CONTEXT.md).

- **D-06:** `UsageQuery` minimal: `{ startTime?: string; endTime?: string }`

- **D-07:** All DTO fields `readonly` + camelCase. No snake_case outside `BifrostGatewayAdapter`.

- **D-08:** `KeyResponse` shape:
  ```ts
  interface KeyResponse {
    readonly id: string
    readonly name: string
    readonly value?: string
    readonly isActive: boolean
  }
  ```

**Error Model (D-09 to D-13)**

- **D-09:** Single `GatewayError` class with discriminator `code: GatewayErrorCode` (`NOT_FOUND | RATE_LIMITED | VALIDATION | NETWORK | UNAUTHORIZED | UNKNOWN`), `statusCode: number`, `retryable: boolean`, `originalError?: Error`.

- **D-10:** HTTP status → `GatewayErrorCode` mapping:
  - 404 → `NOT_FOUND`, retryable: false
  - 401/403 → `UNAUTHORIZED`, retryable: false
  - 422/400 → `VALIDATION`, retryable: false
  - 429 → `RATE_LIMITED`, retryable: true
  - 502/503/504 → `NETWORK`, retryable: true
  - Fetch/connection errors → `NETWORK`, retryable: true
  - Everything else → `UNKNOWN`, retryable: false

- **D-11:** No `details` field on `GatewayError`; raw cause in `originalError`.

- **D-12:** GatewayError stays within adapter boundary in Phase 1; callers keep existing `{success: false}` pattern.

- **D-13:** `HandleBalanceDepletedService` retry improvement (Phase 2 only, not Phase 1).

**MockGatewayClient (D-14 to D-17)**

- **D-14:** Stateful in-memory implementation with `Map<keyId, {...}>` for keys, seeded usage fixtures, monotonic ID generator.

- **D-15:** Exposes `.calls` getter with `readonly` arrays per method for test assertions.

- **D-16:** `failNext(error: GatewayError)` — FIFO queue of single-shot failures.

- **D-17:** `MockGatewayClient` lives at `implementations/MockGatewayClient.ts`, re-exported from barrel. Only test code may import it (enforcement mechanism to be decided by planner).

**DI Wiring (D-18 to D-21)**

- **D-18:** Register `llmGatewayClient` in **existing** `FoundationServiceProvider` (no new provider file):
  ```ts
  container.singleton('llmGatewayClient', (c: IContainer) => {
    const bifrost = c.make('bifrostClient') as BifrostClient
    return new BifrostGatewayAdapter(bifrost)
  })
  ```

- **D-19:** Adapter config reuses existing `createBifrostClientConfig()` — no duplication.

- **D-20:** `bifrostClient` singleton stays registered through Phases 1–3.

- **D-21:** Container key is literal string `'llmGatewayClient'`; type-narrowing via `as ILLMGatewayClient`.

**Amended Scope (D-22)**

- **D-22:** REQUIREMENTS.md amended to add MIGRATE-07/08/09 (Credit module + syncPermissions). Phase 1 interface is shaped to accommodate them via wide `UpdateKeyRequest` (D-02).

### Claude's Discretion

- Exact directory layout inside `LLMGateway/`: `types.ts` vs `types/` subdirectory, flat vs grouped `implementations/`
- Whether `BifrostGatewayAdapter` is one file or split by concern (e.g., separate `mapping.ts` helpers)
- Test file layout inside `tests/Unit/Foundation/LLMGateway/` (per-method files vs one file)
- Exact biome rule / lint check to prevent `src/` runtime import of `MockGatewayClient`
- Whether DTO type imports flow through the barrel or via direct file paths (be consistent with `src/Foundation/`)
- Name of symbolic package scope (Phase 4; default `@draupnir/bifrost-sdk`)

### Deferred Ideas (OUT OF SCOPE)

- `UsageQuery` widening (sort_by, limit, etc.) — add in Phase 2 if needed
- `LogEntry` field widening — add when consumer requires more fields
- `getKey()` / `listKeys()` read methods — add when caller appears
- Error taxonomy as tagged union — future milestone
- OpenRouter / Gemini adapter — v2 (GATE-V2-01/02)
- `ProxyModelCall` abstraction — v2 (PROXY-V2-01/02)
- DB column rename `bifrost_virtual_key_id` — out of scope per PROJECT.md
- Adapter-level retry policy beyond BifrostClient's existing retry.ts — revisit in Phase 4
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IFACE-01 | `ILLMGatewayClient` interface at `src/Foundation/Infrastructure/Services/LLMGateway/ILLMGatewayClient.ts` with 5 methods | Exact method signatures confirmed from CONTEXT.md D-01 through D-08 |
| IFACE-02 | DTO types at `types.ts` with `readonly` fields and camelCase naming | All DTO shapes confirmed; snake_case mapping lives exclusively in adapter |
| IFACE-03 | `GatewayError` class at `errors.ts` with `statusCode`, `code`, `retryable`, `originalError` | D-09/D-10 fully specify error class and HTTP status mapping table |
| IFACE-04 | Barrel export `index.ts` exposing interface, types, and errors | Existing `BifrostClient/index.ts` is the direct pattern to replicate |
| ADAPT-01 | `BifrostGatewayAdapter` at `implementations/BifrostGatewayAdapter.ts` wrapping injected `BifrostClient` | `BifrostClient` public API fully read; all 5 interface methods map to existing Bifrost methods |
| ADAPT-02 | Snake_case ↔ camelCase conversion at boundary for all methods | Concrete mapping documented in §Mapping Tables below |
| ADAPT-03 | Catches Bifrost errors (`BifrostApiError`), re-throws as `GatewayError` | `BifrostApiError.status` field available for HTTP code mapping; `isBifrostApiError()` guard available |
| ADAPT-04 | `MockGatewayClient` at `implementations/MockGatewayClient.ts` with in-memory behavior | D-14 through D-17 specify state model, `.calls` tracking, `failNext()` API |
| ADAPT-05 | Unit tests for `BifrostGatewayAdapter` in `tests/Unit/Foundation/LLMGateway/` | Test directory convention confirmed; Bun `mock()` + `globalThis.fetch` swap pattern from existing tests |
| ADAPT-06 | Unit tests for `MockGatewayClient` | Same directory; assertion against `.calls` getter; `failNext()` test for failure paths |
| WIRE-01 | `llmGatewayClient` singleton registered in `FoundationServiceProvider` | Existing `register()` method confirmed one-liner pattern; D-18 provides exact code |
</phase_requirements>

---

## Summary

Phase 1 is a **pure addition** — no existing file changes except `FoundationServiceProvider.ts` (one extra `container.singleton` call). All new code lives in a new directory `src/Foundation/Infrastructure/Services/LLMGateway/` that mirrors the existing `BifrostClient/` sibling directory pattern exactly.

The existing `BifrostClient` exposes 8 methods; the `ILLMGatewayClient` wraps 5 of them in a camelCase-clean interface. The adapter's job is mechanical: translate camelCase DTOs to snake_case Bifrost requests, translate snake_case Bifrost responses back to camelCase DTOs, and catch `BifrostApiError` and re-throw as `GatewayError`. No new dependencies, no HTTP calls to implement, no config changes.

The `MockGatewayClient` is a stateful reference implementation that tracks calls and supports `failNext()` for failure-path testing. It is the canonical test double for all downstream Phase 2/3 tests — getting it right now prevents test debt later.

**Primary recommendation:** Follow the `BifrostClient/` directory structure as the template. Replicate its `index.ts` barrel pattern, Bun test conventions, and `FoundationServiceProvider` registration pattern. All hard decisions are already made in CONTEXT.md — this is an implementation exercise.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.3.0 | Language | Project standard; strict mode enforced |
| Bun runtime | 1.3.10 | Test runner + runtime | Project standard; `bun:test` used for all unit tests |
| Biome | 2.4.11 | Lint + format | Project standard; replaces ESLint+Prettier |

### No New Dependencies

Phase 1 introduces zero new `npm` packages. All tools are already installed. This is confirmed by the CONTEXT.md constraint "No new framework dependencies; stay within the existing stack."

**Verification:** All new code is TypeScript interfaces, plain classes, and `Map` data structures — no external library needed.

---

## Architecture Patterns

### Directory Structure to Create

```
src/Foundation/Infrastructure/Services/LLMGateway/
├── ILLMGatewayClient.ts         # Interface definition (5 methods)
├── types.ts                     # All DTOs: CreateKeyRequest, UpdateKeyRequest, KeyResponse,
│                                #   RateLimitUpdate, ProviderConfigUpdate, UsageQuery,
│                                #   UsageStats, LogEntry
├── errors.ts                    # GatewayError class + GatewayErrorCode type
├── index.ts                     # Barrel export (public API surface)
└── implementations/
    ├── BifrostGatewayAdapter.ts  # Real adapter wrapping BifrostClient
    └── MockGatewayClient.ts      # In-memory test double

tests/Unit/Foundation/LLMGateway/
├── BifrostGatewayAdapter.test.ts
└── MockGatewayClient.test.ts
```

### Pattern 1: Interface + Barrel (mirrors BifrostClient/)

The existing `BifrostClient/index.ts` is the direct template:

```typescript
// src/Foundation/Infrastructure/Services/LLMGateway/index.ts
export type { ILLMGatewayClient } from './ILLMGatewayClient'
export type {
  CreateKeyRequest,
  UpdateKeyRequest,
  KeyResponse,
  RateLimitUpdate,
  ProviderConfigUpdate,
  UsageQuery,
  UsageStats,
  LogEntry,
} from './types'
export { GatewayError } from './errors'
export type { GatewayErrorCode } from './errors'
// Note: MockGatewayClient NOT exported from main barrel — only from implementations/ directly,
// to prevent runtime src/ code from importing it accidentally.
```

**Decision point for planner:** Whether to export `MockGatewayClient` from the barrel or only from its direct path. The CONTEXT.md (D-17) says it IS re-exported from barrel index — but a lint check / CI grep enforces test-only usage. Either approach works; keeping it in the barrel is simpler.

### Pattern 2: BifrostGatewayAdapter Structure

```typescript
// Source: CONTEXT.md D-18 + BifrostClient.ts reading
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { BifrostClient } from '../BifrostClient/BifrostClient'
import { BifrostApiError } from '../BifrostClient/errors'
import { GatewayError } from '../errors'
import type { ILLMGatewayClient } from '../ILLMGatewayClient'
import type { CreateKeyRequest, UpdateKeyRequest, KeyResponse, UsageQuery, UsageStats, LogEntry } from '../types'

export class BifrostGatewayAdapter implements ILLMGatewayClient {
  constructor(private readonly bifrostClient: BifrostClient) {}

  async createKey(request: CreateKeyRequest): Promise<KeyResponse> { ... }
  async updateKey(keyId: string, request: UpdateKeyRequest): Promise<KeyResponse> { ... }
  async deleteKey(keyId: string): Promise<void> { ... }
  async getUsageStats(keyIds: readonly string[], query?: UsageQuery): Promise<UsageStats> { ... }
  async getUsageLogs(keyIds: readonly string[], query?: UsageQuery): Promise<readonly LogEntry[]> { ... }

  private translateError(error: unknown): never { ... }
}
```

### Pattern 3: FoundationServiceProvider Registration

```typescript
// Source: Existing FoundationServiceProvider.ts + CONTEXT.md D-18
import { BifrostGatewayAdapter } from '../Services/LLMGateway/implementations/BifrostGatewayAdapter'
import type { ILLMGatewayClient } from '../Services/LLMGateway/ILLMGatewayClient'

export class FoundationServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('bifrostClient', () => {
      const config = createBifrostClientConfig()
      return new BifrostClient(config)
    })
    // New in Phase 1:
    container.singleton('llmGatewayClient', (c: IContainer) => {
      const bifrost = c.make('bifrostClient') as BifrostClient
      return new BifrostGatewayAdapter(bifrost)
    })
  }

  override boot(_context: unknown): void {
    console.log('🏗️  [Foundation] Module loaded')
  }
}
```

### Pattern 4: MockGatewayClient

```typescript
// Source: CONTEXT.md D-14 through D-16
export class MockGatewayClient implements ILLMGatewayClient {
  private readonly keys = new Map<string, { name: string; isActive: boolean; ... }>()
  private idCounter = 0
  private readonly failQueue: GatewayError[] = []

  private readonly _calls = {
    createKey: [] as CreateKeyRequest[],
    updateKey: [] as { keyId: string; request: UpdateKeyRequest }[],
    deleteKey: [] as string[],
    getUsageStats: [] as { keyIds: readonly string[]; query?: UsageQuery }[],
    getUsageLogs: [] as { keyIds: readonly string[]; query?: UsageQuery }[],
  }

  get calls(): Readonly<typeof this._calls> { return this._calls }

  failNext(error: GatewayError): void {
    this.failQueue.push(error)
  }

  private maybeThrow(): void {
    const error = this.failQueue.shift()
    if (error) throw error
  }

  // ... implements all 5 interface methods
}
```

### Pattern 5: Bun Test Style (from existing tests)

```typescript
// Source: tests/Unit/Foundation/BifrostClient/BifrostClient.test.ts
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { BifrostGatewayAdapter } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter'
import { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway/errors'

describe('BifrostGatewayAdapter', () => {
  let adapter: BifrostGatewayAdapter
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    const config = { baseUrl: 'https://bifrost.test', masterKey: 'test', timeoutMs: 5000, maxRetries: 0, retryBaseDelayMs: 1 }
    adapter = new BifrostGatewayAdapter(new BifrostClient(config))
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  // Mapping assertions: verify camelCase out, no snake_case leakage
  // Error translation assertions: verify GatewayError with correct code
})
```

### Anti-Patterns to Avoid

- **Importing from deep paths across modules:** Always import LLMGateway types from the barrel `index.ts`, not from `types.ts` directly (maintain the same discipline as `BifrostClient/index.ts` export pattern).
- **Snake_case in interface types:** Any `_` in a DTO field name is a bug — conversion must be 100% in the adapter.
- **Mutating adapter state:** Adapter is stateless; all translation returns new objects (immutability rule).
- **Registering adapter with `bind()` instead of `singleton()`:** Adapter is stateless; singleton is correct (same as `bifrostClient`).
- **Importing `MockGatewayClient` in `src/` runtime code:** Test-only class; restrict via lint or CI grep.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP retry logic | Custom retry in adapter | Existing `BifrostClient.retry.ts` via `BifrostClient` delegation | Already has exponential backoff + jitter + retryable classification; adapting it would duplicate |
| DI container registration | Custom factory pattern | Existing `container.singleton()` pattern | Already used for `bifrostClient`; consistent; no new abstraction needed |
| Error type detection | Custom `instanceof` chain | Existing `isBifrostApiError()` guard in `errors.ts` | Prevents double-check; `BifrostApiError.status` field gives HTTP code directly |
| Mapping helpers | Full mapping library (e.g., automapper) | Manual mapping functions | Interface is small (5 methods, ~8 fields); a mapper library adds complexity with no benefit |

**Key insight:** The adapter pattern here is intentionally thin. All HTTP complexity (retry, timeout, auth headers) lives in `BifrostClient`. The adapter only does translation and error wrapping — keeping it that way preserves the single-responsibility principle and makes Phase 4 SDK extraction straightforward.

---

## Mapping Tables

These are the exact translations `BifrostGatewayAdapter` must implement. Derived from reading `BifrostClient.ts` and `types.ts`.

### createKey

| Interface field (camelCase) | Bifrost request field (snake_case) |
|-----------------------------|------------------------------------|
| `name` | `name` |
| `customerId` | `customer_id` |
| `isActive` | `is_active` |
| `rateLimit.tokenMaxLimit` | `rate_limit.token_max_limit` |
| `rateLimit.tokenResetDuration` | `rate_limit.token_reset_duration` |
| `rateLimit.requestMaxLimit` | `rate_limit.request_max_limit` |
| `rateLimit.requestResetDuration` | `rate_limit.request_reset_duration` |
| `providerConfigs[i].provider` | `provider_configs[i].provider` |
| `providerConfigs[i].allowedModels` | `provider_configs[i].allowed_models` |

**Response (BifrostVirtualKey → KeyResponse):**
| Bifrost response field | Interface field |
|------------------------|-----------------|
| `id` | `id` |
| `name` | `name` |
| `value` | `value` (optional, only on create) |
| `is_active` | `isActive` |

### updateKey

Same camelCase → snake_case mapping as createKey for `rateLimit` and `providerConfigs`. Only sends fields that are defined (adapter must NOT send `undefined` fields — they'd overwrite existing Bifrost state with nulls).

### deleteKey

`deleteKey(keyId)` → `bifrostClient.deleteVirtualKey(keyId)`. No body mapping.

### getUsageStats

```
keyIds: readonly string[]  →  { virtual_key_ids: keyIds.join(','), start_time: query?.startTime, end_time: query?.endTime }
```

**Response (BifrostLogsStats → UsageStats):**
| Bifrost field | Interface field |
|---------------|-----------------|
| `total_requests` | `totalRequests` |
| `total_cost` | `totalCost` |
| `total_tokens` | `totalTokens` |
| `avg_latency` | `avgLatency` |

### getUsageLogs

```
keyIds: readonly string[]  →  { virtual_key_ids: keyIds.join(','), start_time: query?.startTime, end_time: query?.endTime }
```

**Response (BifrostLogEntry → LogEntry):**
| Bifrost field | Interface field | Notes |
|---------------|-----------------|-------|
| `virtual_key_id` | `keyId` | May be undefined in Bifrost — adapter uses `''` as fallback |
| `model` | `model` | Direct |
| `provider` | `provider` | Direct |
| `input_tokens` | `inputTokens` | May be undefined — use `?? 0` |
| `output_tokens` | `outputTokens` | May be undefined — use `?? 0` |
| `total_tokens` | `totalTokens` | May be undefined — use `?? 0` |
| `latency` | `latencyMs` | Renamed; verify unit (Bifrost `latency` appears to be seconds from test data `1.0`) |
| `cost` | `cost` | Direct |
| `timestamp` | `timestamp` | Direct |
| `status` | `status` | Bifrost has `'processing'` too — adapter maps `'processing'` to `'error'` (conservative) or filters; verify with UsageAggregator callers |

**NOTE (HIGH priority for planner):** The `BifrostLogEntry.status` includes `'processing'` which is not in the `LogEntry` union `'success' | 'error'`. The adapter must decide how to handle it. Two options: (a) treat `'processing'` as `'error'`, (b) filter out `'processing'` logs entirely. Recommend option (a) — simpler, no data loss.

**NOTE:** `BifrostLogEntry.latency` field — in the existing test fixture it is `1.0` with a `latency` key (no unit specified in types.ts comments). The interface names it `latencyMs`. If Bifrost's `latency` is in seconds, the adapter should multiply by 1000. The existing `UsageAggregator` passes it through as-is (no multiplication), so the unit ambiguity is pre-existing. Planner should check and document the decision.

---

## Common Pitfalls

### Pitfall 1: Sending `undefined` fields to Bifrost PUT body

**What goes wrong:** `updateKey` maps all `UpdateKeyRequest` fields including optional ones. If `rateLimit` is `undefined`, the adapter naively includes it as `{ rate_limit: undefined }`. Bifrost may interpret this as an explicit null and wipe the existing rate limit.

**Why it happens:** JavaScript `JSON.stringify` drops `undefined` values, so this is actually safe for direct serialization — but an explicit `null` would not be dropped. Verify the adapter only conditionally includes fields.

**How to avoid:** Build the Bifrost request object with conditional spread:
```typescript
const bifrostRequest: UpdateVirtualKeyRequest = {
  ...(request.isActive !== undefined && { is_active: request.isActive }),
  ...(request.rateLimit !== undefined && { rate_limit: mapRateLimit(request.rateLimit) }),
  ...(request.providerConfigs !== undefined && { provider_configs: request.providerConfigs.map(mapProviderConfig) }),
}
```

**Warning signs:** Tests for `updateKey({ isActive: true })` should NOT send `rate_limit` in the request body.

### Pitfall 2: GatewayError catch order in adapter

**What goes wrong:** Adapter catches `BifrostApiError` correctly but also needs to handle raw `TypeError` (network failure before response). If only `BifrostApiError` is caught, network errors propagate as raw `TypeError` instead of `GatewayError('NETWORK')`.

**Why it happens:** `BifrostClient.retry.ts` re-throws the last error after exhausting retries. If the error is a `TypeError` (fetch failed), it passes through `withRetry` unchanged.

**How to avoid:** The adapter `translateError` method should handle both cases:
```typescript
private translateError(error: unknown): never {
  if (error instanceof BifrostApiError) {
    const code = this.mapStatusToCode(error.status)
    const retryable = this.isRetryable(error.status)
    throw new GatewayError(error.message, code, error.status, retryable, error)
  }
  if (error instanceof TypeError || (error instanceof Error && error.message.includes('fetch'))) {
    throw new GatewayError('Network error', 'NETWORK', 0, true, error)
  }
  const cause = error instanceof Error ? error : new Error(String(error))
  throw new GatewayError('Unknown gateway error', 'UNKNOWN', 0, false, cause)
}
```

**Warning signs:** Test for adapter when `globalThis.fetch` throws `TypeError` should produce `GatewayError` with `code: 'NETWORK'`, not raw `TypeError`.

### Pitfall 3: BifrostApiError RETRYABLE_STATUS_CODES vs GatewayError mapping inconsistency

**What goes wrong:** `BifrostApiError` already classifies `500` as retryable (see `errors.ts`: `const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])`). But D-10 maps `500` to `UNKNOWN` with `retryable: false` (status 500 is "everything else"). This is intentional — `GatewayError.retryable` is independent of BifrostApiError's `isRetryable`.

**Why it happens:** The adapter wraps at a higher level and applies its own conservative retry policy (D-10 says "everything else → UNKNOWN, retryable: false").

**How to avoid:** Implement D-10 mapping table exactly as specified. Do NOT delegate to `BifrostApiError.isRetryable` — the adapter has its own policy.

**Warning signs:** Test for 500 response should produce `GatewayError` with `code: 'UNKNOWN'` and `retryable: false`.

### Pitfall 4: MockGatewayClient `failNext` queue drains on wrong call

**What goes wrong:** `failNext()` is designed to fail the *next* call regardless of which method it is. If a test calls `failNext()` and then does setup operations on the mock (e.g., `createKey` for seed data), the seed operation consumes the queued failure.

**Why it happens:** The queue is method-agnostic by design (D-16 says "the next interface call throws").

**How to avoid:** In tests, seed mock state via direct constructor injection or setters (not via interface calls) before calling `failNext()`. Document this constraint clearly in the mock's JSDoc.

### Pitfall 5: TypeScript `noUnusedParameters` breaks unused `_context` in FoundationServiceProvider.boot()

**What goes wrong:** Adding the new `container.singleton` import of `IContainer` type in the file header might trip unused-import detection if the type is only used in the factory callback and Biome/TS doesn't see it.

**Why it happens:** `IContainer` is already imported in the file, so this is a non-issue. But the adapter import added to `FoundationServiceProvider.ts` must be used — if the singleton registration is removed later or commented out, the import becomes unused and Biome will error.

**How to avoid:** Keep the adapter import co-located with the singleton registration and don't over-import.

---

## Code Examples

### Error Translation in Adapter

```typescript
// Source: CONTEXT.md D-09/D-10 + BifrostClient/errors.ts reading
private mapStatusToCode(status: number): GatewayErrorCode {
  if (status === 404) return 'NOT_FOUND'
  if (status === 401 || status === 403) return 'UNAUTHORIZED'
  if (status === 400 || status === 422) return 'VALIDATION'
  if (status === 429) return 'RATE_LIMITED'
  if (status === 502 || status === 503 || status === 504) return 'NETWORK'
  return 'UNKNOWN'
}

private isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504
}
```

### MockGatewayClient ID Generator

```typescript
// Source: CONTEXT.md D-14
private nextId(): string {
  this.idCounter++
  return `mock_vk_${String(this.idCounter).padStart(6, '0')}`
}
// Produces: 'mock_vk_000001', 'mock_vk_000002', ...
```

### MockGatewayClient failNext Test Pattern

```typescript
// Source: CONTEXT.md D-16
const mock = new MockGatewayClient()
mock.failNext(new GatewayError('rate limited', 'RATE_LIMITED', 429, true))
await expect(mock.createKey({ name: 'test', customerId: 'c-1' })).rejects.toThrow('rate limited')

// Verify queue is cleared after consumption
const result = await mock.createKey({ name: 'test2', customerId: 'c-2' })
expect(result.id).toMatch(/^mock_vk_/)
```

### Adapter createKey Mapping

```typescript
// Source: CONTEXT.md D-01, D-07, D-08 + BifrostClient.ts
async createKey(request: CreateKeyRequest): Promise<KeyResponse> {
  try {
    const bifrostKey = await this.bifrostClient.createVirtualKey({
      name: request.name,
      customer_id: request.customerId,
      ...(request.isActive !== undefined && { is_active: request.isActive }),
      ...(request.rateLimit !== undefined && {
        rate_limit: {
          token_max_limit: request.rateLimit.tokenMaxLimit ?? 0,
          token_reset_duration: request.rateLimit.tokenResetDuration ?? '1m',
          ...(request.rateLimit.requestMaxLimit !== undefined && {
            request_max_limit: request.rateLimit.requestMaxLimit,
          }),
          ...(request.rateLimit.requestResetDuration !== undefined && {
            request_reset_duration: request.rateLimit.requestResetDuration,
          }),
        },
      }),
      ...(request.providerConfigs !== undefined && {
        provider_configs: request.providerConfigs.map((pc) => ({
          provider: pc.provider,
          allowed_models: pc.allowedModels,
        })),
      }),
    })
    return {
      id: bifrostKey.id,
      name: bifrostKey.name,
      value: bifrostKey.value,
      isActive: bifrostKey.is_active,
    }
  } catch (error) {
    this.translateError(error)
  }
}
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun test (built-in, v1.3.10) |
| Config file | None — package.json scripts only |
| Quick run command | `bun test tests/Unit/Foundation/LLMGateway/` |
| Full suite command | `bun test src tests` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADAPT-05 | BifrostGatewayAdapter mapping + error translation | unit | `bun test tests/Unit/Foundation/LLMGateway/BifrostGatewayAdapter.test.ts` | Wave 0 |
| ADAPT-06 | MockGatewayClient in-memory behavior, calls tracking, failNext | unit | `bun test tests/Unit/Foundation/LLMGateway/MockGatewayClient.test.ts` | Wave 0 |
| WIRE-01 | `llmGatewayClient` singleton resolves from container | integration-smoke | `bun test tests/Unit/Foundation/LLMGateway/` | Wave 0 |
| IFACE-01/02/03/04 | TypeScript compile-time verification | typecheck | `bun run typecheck` | — (tsc) |
| QUAL-01 | Biome lint clean | lint | `bun run lint` | — (biome) |

### Sampling Rate

- **Per task commit:** `bun test tests/Unit/Foundation/LLMGateway/`
- **Per wave merge:** `bun test src tests && bun run typecheck && bun run lint`
- **Phase gate:** Full suite green before proceeding to Phase 2

### Wave 0 Gaps

- [ ] `tests/Unit/Foundation/LLMGateway/BifrostGatewayAdapter.test.ts` — covers ADAPT-05, mapping for all 5 methods + error translation for all 6 HTTP codes + network error
- [ ] `tests/Unit/Foundation/LLMGateway/MockGatewayClient.test.ts` — covers ADAPT-06, all 5 methods, `.calls` tracking, `failNext()` single-shot and FIFO behavior

*(No additional framework install needed — Bun test is already available)*

---

## MockGatewayClient Import Restriction

**Problem (D-17):** `MockGatewayClient` must only be imported in test files, never in `src/` runtime code.

**Research finding:** Biome 2.4.11 does **not** have a built-in per-file import restriction rule equivalent to ESLint's `no-restricted-imports` with pattern matching. Biome's `linter.rules` does not include an `importRestriction` category.

**Confidence:** MEDIUM — verified by reading `biome.json` structure; did not find import restriction capability in the rule set. Biome's roadmap may include this in a future version.

**Viable fallback (recommended):** Add a CI step or pre-commit grep check:
```bash
# Fails if any src/ file imports MockGatewayClient
grep -r "MockGatewayClient" src/ && echo "ERROR: MockGatewayClient imported in src/" && exit 1 || true
```

This can be added to `package.json` scripts as `"check:mock-import": "..."` and run as part of `bun run check`.

**Alternative:** Keep `MockGatewayClient` NOT re-exported from `LLMGateway/index.ts` barrel. Tests import it from the direct path `implementations/MockGatewayClient.ts`. This is the simplest enforcement — barrel-only imports in `src/` would never pull it in accidentally.

**Planner decision needed:** Pick the enforcement approach. Recommendation: direct-path-only (not in barrel) is the path of least resistance for Phase 1; add a grep check to `package.json scripts.check` if belt-and-suspenders is needed.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 1 is pure code addition with no new external dependencies. All required tools (Bun, TypeScript, Biome) are confirmed available.

| Dependency | Available | Version | Notes |
|------------|-----------|---------|-------|
| Bun runtime | ✓ | 1.3.10 | Confirmed via `bun test` run — 46 tests pass |
| Biome | ✓ | 2.4.11 | Confirmed via `node -e` check |
| TypeScript | ✓ | 5.3.0 | Per CLAUDE.md / tsconfig.json |

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Direct `BifrostClient` in modules | `ILLMGatewayClient` abstraction | Phase 1 introduces the interface; Phase 2 migrates consumers |
| Snake_case Bifrost types leaking into app layer | Camelcase DTOs at interface boundary | Adapter does 100% conversion |
| `vi.fn()` stubs on BifrostClient | `MockGatewayClient.calls` + `failNext()` | Phase 1 provides the canonical mock for Phase 2 tests |

---

## Open Questions

1. **`BifrostLogEntry.latency` unit — seconds or milliseconds?**
   - What we know: The `BifrostLogEntry.latency` field is a `number`. In the test fixture, it is `1.0`. The field is not documented with a unit in `types.ts`.
   - What's unclear: Is `1.0` = 1 second or 1 millisecond? The interface names it `latencyMs`.
   - Recommendation: Planner should check the Bifrost API docs or the actual Bifrost response in production. If it's seconds, multiply by 1000 in the adapter. If milliseconds, pass through. Default assumption: seconds (since `avg_latency: 0.8` from BifrostLogsStats looks like sub-second latency in seconds).

2. **`BifrostLogEntry.status: 'processing'` handling in `getUsageLogs`**
   - What we know: The `LogEntry` interface (D-05) has `status: 'success' | 'error'`. Bifrost has three values: `'processing' | 'success' | 'error'`.
   - What's unclear: Should `'processing'` entries be mapped to `'error'` or filtered out?
   - Recommendation: Map to `'error'` (conservative, no data loss). Document in adapter comment.

3. **`CreateKeyRequest` field set — what does the adapter need beyond `name`?**
   - What we know: `createVirtualKey` in Phase 2 callers (AppKeyBifrostSync) currently passes `name`, `customer_id`, `is_active`, and `provider_configs`. The CONTEXT.md D-08 defines `KeyResponse` but doesn't fully enumerate `CreateKeyRequest` fields.
   - What's unclear: Does `CreateKeyRequest` need a `customerId` field, or is it system-managed?
   - Recommendation: Include `customerId?: string` in `CreateKeyRequest` — it's present in `BifrostVirtualKey` creation calls. Planner should verify against `AppKeyBifrostSync.createVirtualKey` call sites (Phase 2 scope, but interface must accommodate).

---

## Sources

### Primary (HIGH confidence)

- Direct code reading: `src/Foundation/Infrastructure/Services/BifrostClient/BifrostClient.ts` — all 8 public methods, request/response shapes
- Direct code reading: `src/Foundation/Infrastructure/Services/BifrostClient/types.ts` — all Bifrost snake_case types
- Direct code reading: `src/Foundation/Infrastructure/Services/BifrostClient/errors.ts` — `BifrostApiError` structure, `RETRYABLE_STATUS_CODES`
- Direct code reading: `src/Foundation/Infrastructure/Services/BifrostClient/retry.ts` — retry logic delegation pattern
- Direct code reading: `src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts` — current `container.singleton` pattern to extend
- Direct code reading: `src/Modules/Dashboard/Infrastructure/Services/UsageAggregator.ts` — LogEntry field consumer verification
- Direct code reading: `tests/Unit/Foundation/BifrostClient/BifrostClient.test.ts` — Bun test + fetch mock pattern to replicate
- Direct code reading: `.planning/phases/01-gateway-foundation/01-CONTEXT.md` — all locked decisions (D-01 through D-22)

### Secondary (MEDIUM confidence)

- Biome 2.4.11 import restriction capability: verified by examining `biome.json` structure — no built-in rule found. CI grep fallback documented.

### Tertiary (LOW confidence)

- `BifrostLogEntry.latency` unit interpretation: inferred from test fixture value `1.0` and `avg_latency: 0.8` naming — not verified from official Bifrost API docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all from direct code reading, no new dependencies
- Architecture patterns: HIGH — exact templates confirmed from existing BifrostClient/ and FoundationServiceProvider
- Mapping tables: HIGH — derived from direct BifrostClient types.ts reading
- Pitfalls: HIGH — derived from actual code analysis (BifrostApiError RETRYABLE_STATUS_CODES, LogEntry.status values)
- MockGatewayClient import restriction: MEDIUM — Biome capability gap confirmed; fallback approach documented

**Research date:** 2026-04-10
**Valid until:** 2026-07-10 (stable — no external API changes expected; project conventions are internal)
