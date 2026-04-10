# Phase 1: Gateway Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 01-gateway-foundation
**Areas discussed:** Interface width + missing targets, Error taxonomy, MockGatewayClient strategy, DI wiring location

---

## Gray Area Selection

**Question:** Which gray areas do you want to deep-dive for Phase 1?

| Option | Description | Selected |
|--------|-------------|----------|
| Interface width + missing targets | CRITICAL. Interface width locked by Phase 2 consumers; Credit module + syncPermissions missing from REQUIREMENTS.md. | ✓ |
| Error taxonomy | Single class vs tagged union; retry classification. | ✓ |
| MockGatewayClient strategy | Stateful reference impl vs per-test stubs. | ✓ |
| DI wiring location | Dedicated provider vs extend FoundationServiceProvider. | ✓ |

**User's choice:** All four areas selected.

---

## Area 1: Interface Width + Missing Migration Targets

### Q1.1 — `UpdateKeyRequest` shape

| Option | Description | Selected |
|--------|-------------|----------|
| Wide DTO with all 3 fields | `{isActive?, rateLimit?, providerConfigs?}`. Matches real usage. | ✓ |
| Split into separate methods | `setActive`, `setRateLimit`, `setProviderConfigs`. More surface. | |
| Single method with untyped patch | `Record<string, unknown>` — escape hatch, no type safety. | |

**User's choice:** Wide DTO.
**Notes:** Drives D-02 in CONTEXT.md. All three use cases (Credit throttling, syncPermissions, deactivation) live under one method with optional fields.

### Q1.2 — Usage API shape (multi-key + logs)

| Option | Description | Selected |
|--------|-------------|----------|
| `getUsageStats(keyIds[])` + add `getUsageLogs(keyIds[])` | Multi-key native; first-class logs method. | ✓ |
| Single-key; require loop in callers | Cleaner interface; forces aggregation into callers, loses Bifrost's batch efficiency. | |
| Opaque `UsageQuery` object | Most flexible, least typed. | |

**User's choice:** Array-form multi-key + add `getUsageLogs`.
**Notes:** Drives D-03, D-05 in CONTEXT.md. Adapter hides Bifrost's comma-joined-string quirk.

### Q1.3 — LogEntry typing

| Option | Description | Selected |
|--------|-------------|----------|
| Typed `LogEntry` DTO | Defined fields UsageAggregator actually reads. | ✓ |
| Opaque `Record<string, unknown>` | Caller casts. Defeats abstraction purpose. | |
| Don't expose logs — aggregate in adapter | Narrower interface, locks callers into one aggregation shape. | |

**User's choice:** Typed DTO.
**Notes:** Drives D-05 in CONTEXT.md. Adapter drops Bifrost fields not in the DTO.

### Q1.4 — Amend REQUIREMENTS.md for missing targets

| Option | Description | Selected |
|--------|-------------|----------|
| Amend now | Add MIGRATE-07/08/09 before writing CONTEXT.md. | ✓ |
| Defer to before Phase 2 plan | Note in CONTEXT.md; amend later. | |
| Leave as-is | Not recommended — Phase 2 success criterion would silently fail. | |

**User's choice:** Amend now.
**Notes:** REQUIREMENTS.md + ROADMAP.md Phase 2 updated. Drives D-22 in CONTEXT.md. Total v1 reqs: 41 → 44.

---

## Area 2: Error Taxonomy

### Q2.1 — Error model shape

| Option | Description | Selected |
|--------|-------------|----------|
| Single `GatewayError` + code enum + retryable | One class, discriminator + retry flag. Matches existing catch-once patterns. | ✓ |
| Tagged union of concrete classes | `GatewayNotFoundError`, etc. Most idiomatic TS. | |
| Plain Error with `.cause` only | Simplest, no type distinction. | |

**User's choice:** Single class with discriminator.
**Notes:** Drives D-09 in CONTEXT.md. Chose to minimize caller-site refactors outside Phase 1 scope.

### Q2.2 — Retry classification

| Option | Description | Selected |
|--------|-------------|----------|
| Adapter classifies | Adapter maps 429/5xx → retryable. Policy in one place. | ✓ |
| Callers decide | Each caller writes own classification. Duplicated. | |
| Retry inside adapter, never surface | Hides transient failures. Conflates HTTP retry with business retry. | |

**User's choice:** Adapter classifies.
**Notes:** Drives D-10 in CONTEXT.md. Explicit HTTP code mapping provided.

### Q2.3 — Error boundary for migrated services

| Option | Description | Selected |
|--------|-------------|----------|
| Keep existing Response pattern | Catch at service, convert to `{success:false, error:...}`. Smallest Phase 2 diff. | ✓ |
| Propagate to controllers | Cleaner separation, larger Phase 2 diff. | |
| Mixed: throw unexpected, Response expected | More nuanced, harder to reason about. | |

**User's choice:** Keep existing Response pattern.
**Notes:** Drives D-12 in CONTEXT.md. Zero controller/middleware churn in Phase 2.

### Q2.4 — Debug info on errors

| Option | Description | Selected |
|--------|-------------|----------|
| Include in `originalError` only | Raw Error preserved; high-level message stays safe to log. | ✓ |
| Add explicit `details: unknown` field | Another field to maintain. | |
| No debug info — log at throw site | Debug lives in logs, not on error. | |

**User's choice:** `originalError` only.
**Notes:** Drives D-11 in CONTEXT.md.

---

## Area 3: MockGatewayClient Strategy

### Q3.1 — Default behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Stateful in-memory store | Map<keyId, KeyState>. Reference impl, reusable. | ✓ |
| Null-object no-op | Returns defaults, doesn't track. | |
| Programmable fluent double | `mock.whenX(req).returns(...)`. Most control, chattier tests. | |

**User's choice:** Stateful in-memory.
**Notes:** Drives D-14 in CONTEXT.md.

### Q3.2 — Call history tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — `calls` getter | `mock.calls.createKey` returns `readonly` array. | ✓ |
| No — tests use vi.fn wrappers | Mock is state-only; tests wrap for assertions. | |

**User's choice:** `calls` getter.
**Notes:** Drives D-15 in CONTEXT.md. Replaces vi.fn spy pattern.

### Q3.3 — Error injection

| Option | Description | Selected |
|--------|-------------|----------|
| `mock.failNext(error)` API | Queue single-shot failure. | ✓ |
| Subclass per test | Extend mock, override methods. | |
| No injection — vi.fn for failures | Two patterns per test file. | |

**User's choice:** `failNext` API.
**Notes:** Drives D-16 in CONTEXT.md. Enables retry-logic tests without HTTP.

### Q3.4 — Mock location

| Option | Description | Selected |
|--------|-------------|----------|
| Alongside adapter in `implementations/` | Colocated with real adapter, barrel-exported. | ✓ |
| Separate `tests/helpers/` package | Can never be accidentally imported by src/. | |
| Inside `packages/bifrost-sdk/` | Confuses abstraction — mock is for the interface, not Bifrost. | |

**User's choice:** Alongside adapter.
**Notes:** Drives D-17 in CONTEXT.md. Lint/CI check needed to prevent runtime import (noted as discretion item for planner).

---

## Area 4: DI Wiring Location

### Q4.1 — Where to register `llmGatewayClient`

| Option | Description | Selected |
|--------|-------------|----------|
| Extend FoundationServiceProvider | Next to existing `bifrostClient` singleton. Minimal churn. | ✓ |
| New LLMGatewayServiceProvider | Dedicated file, more moving parts. | |
| Inline in `src/bootstrap.ts` | Skip provider pattern; breaks convention. | |

**User's choice:** Extend FoundationServiceProvider.
**Notes:** Drives D-18 in CONTEXT.md.

### Q4.2 — When to retire `bifrostClient` singleton

| Option | Description | Selected |
|--------|-------------|----------|
| End of Phase 4 | After SDK extraction, adapter instantiates its own BifrostClient. | ✓ |
| End of Phase 2 | Earliest point business layer stops needing it. | |
| Keep indefinitely | Loose end; violates core value. | |

**User's choice:** End of Phase 4.
**Notes:** Drives D-20 in CONTEXT.md. Coexistence window is Phases 1–3.

### Q4.3 — Adapter config source

| Option | Description | Selected |
|--------|-------------|----------|
| Existing `createBifrostClientConfig()` | Reuse env-reading helper. Zero duplication. | ✓ |
| New `createLLMGatewayConfig()` | Gateway-agnostic shape, indirection with no payoff now. | |

**User's choice:** Reuse existing helper.
**Notes:** Drives D-19 in CONTEXT.md.

### Q4.4 — Deprecation of old `bifrostClient` resolution path

| Option | Description | Selected |
|--------|-------------|----------|
| No deprecation warning | Silent until Phase 4 removes it. | ✓ |
| Log warning on first resolve | Loud during migration, quiet after. | |
| Throw after Phase 2 | Aggressive; risks breaking transition. | |

**User's choice:** No deprecation warning.
**Notes:** Phase 2 migrates all callers; nothing should resolve it anyway by end of Phase 2.

---

## Claude's Discretion

Items explicitly left to planner/executor (no user input needed, documented in CONTEXT.md §Claude's Discretion):

- Exact directory layout inside `LLMGateway/`
- `BifrostGatewayAdapter` file splitting
- Test file layout under `tests/Unit/Foundation/LLMGateway/`
- Biome rule / CI grep check mechanism for MockGatewayClient import restriction
- DTO type import style (barrel vs direct paths)
- Eventual bifrost-sdk package scope name (Phase 4)

---

## Deferred Ideas

Items captured but not in Phase 1 scope (see CONTEXT.md §Deferred Ideas):

- `UsageQuery` / `LogEntry` field widening — when a caller needs more
- `getKey()` / `listKeys()` read methods — when a caller appears
- Error taxonomy refactor to tagged union — future milestone if needed
- OpenRouter / Gemini adapters — v2
- `ProxyModelCall` abstraction — v2 per user decision
- DB column rename — out of scope per PROJECT.md
- Adapter-level retry beyond Bifrost SDK's retry.ts — revisit in Phase 4
