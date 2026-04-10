# Draupnir — LLM Gateway Abstraction

## What This Is

Draupnir is an existing TypeScript + Bun + DDD service that currently speaks directly to Bifrost API Gateway for LLM virtual-key management, usage tracking, and chat-completion proxying. This project introduces an `ILLMGatewayClient` abstraction so business logic no longer imports Bifrost types, and extracts the `BifrostClient` into a standalone `packages/bifrost-sdk/` workspace package so future gateway backends (OpenRouter, Gemini, mocks) can be swapped in at build time without touching the application layer.

## Core Value

**No file under `src/Modules/` or `src/Foundation/Application/` may import a Bifrost-specific symbol after this milestone ships.** Gateway choice is a compile-time wiring decision made in ServiceProviders, not a runtime concern, and never a domain concern.

## Requirements

### Validated

<!-- Existing capabilities proven in production, inferred from codebase map -->

- ✓ Draupnir uses `BifrostClient` to create/update/delete virtual keys for app API keys — existing
- ✓ `GetAppKeyUsageService` queries Bifrost logs stats for per-key usage metrics — existing
- ✓ `QueryUsage` (SdkApi) returns aggregated token/cost data from Bifrost — existing
- ✓ `UsageAggregator` (Dashboard) pulls per-org aggregations from Bifrost — existing
- ✓ `ProxyModelCall` (SdkApi) proxies chat completions through Bifrost — existing
- ✓ DI via `IContainer` with per-module `ServiceProvider`s and `wireXxxRoutes` wiring — existing
- ✓ Bun + Biome + TS strict + Zod validation + Bun test — existing
- ✓ Multi-ORM repository pattern (memory, drizzle, atlas) — existing
- ✓ Tests mock `BifrostClient` directly (brittle, coupled to concrete class) — existing

### Active

<!-- The refactor scope for this milestone -->

- [ ] Define `ILLMGatewayClient` interface with camelCase DTOs (`CreateKeyRequest`, `UpdateKeyRequest`, `KeyResponse`, `UsageQuery`, `UsageStats`)
- [ ] Define `GatewayError` class as the single error type adapters throw
- [ ] Implement `BifrostGatewayAdapter` wrapping `BifrostClient`, converting snake_case ↔ camelCase at the boundary
- [ ] Implement `MockGatewayClient` for tests (satisfies interface, no HTTP)
- [ ] Register `llmGatewayClient` singleton in the main ServiceProvider, bound to `BifrostGatewayAdapter`
- [ ] Migrate `AppKeyBifrostSync` to inject `ILLMGatewayClient` instead of `BifrostClient`
- [ ] Migrate `ApiKeyBifrostSync` to inject `ILLMGatewayClient`
- [ ] Migrate `GetAppKeyUsageService` to inject `ILLMGatewayClient`
- [ ] Migrate `QueryUsage` (SdkApi) to inject `ILLMGatewayClient`
- [ ] Migrate `UsageAggregator` (Dashboard) to inject `ILLMGatewayClient`, eliminate snake_case leakage
- [ ] Update all wire functions (`wireAppApiKey`, `wireApiKey`, `wireSdkApi`, `wireDashboard`, ...) to pass `ILLMGatewayClient`
- [ ] Rewrite existing mock-based tests to mock `ILLMGatewayClient` interface (not `BifrostClient` concrete)
- [ ] Create `packages/bifrost-sdk/` Bun workspace package containing `BifrostClient`, config, types, errors, retry
- [ ] Update root `package.json` workspaces and migrate Draupnir imports to `@draupnir/bifrost-sdk` (or chosen scope)
- [ ] Delete `src/Foundation/Infrastructure/Services/BifrostClient/` after workspace migration verified
- [ ] Rename `bifrostVirtualKeyId` → `gatewayKeyId` in domain aggregates (`AppApiKey`, `ApiKey`), TypeScript only — repository maps to existing DB column
- [ ] Move hardcoded Bifrost proxy URL out of `SdkApiServiceProvider` into `bifrost-sdk` config, without changing `ProxyModelCall` logic
- [ ] All existing feature tests and E2E tests pass unchanged
- [ ] Lint clean (Biome) + typecheck clean (`tsc --noEmit`)

### Out of Scope

- **Abstracting `ProxyModelCall` behind `ILLMGatewayClient`** — Raw chat-completion proxying is a different concern than virtual-key management. The interface stays focused on key lifecycle + usage stats. `ProxyModelCall` continues to call Bifrost directly via the sdk package. Revisit if/when a second gateway provides a proxy endpoint.
- **Implementing an OpenRouter adapter** — The milestone proves the abstraction is correct with one real adapter (Bifrost) plus one test mock (`MockGatewayClient`). OpenRouter becomes a trivial follow-up once the interface is stable.
- **Runtime gateway switching** — Gateway is a compile-time/ServiceProvider decision, not an env-driven runtime toggle. No factory-by-env-var pattern.
- **Database schema migration for `bifrost_virtual_key_id` column** — Column name stays as-is. Only the TypeScript field is renamed; repository does the mapping.
- **Publishing `bifrost-sdk` to an external npm registry** — Workspace-only (`workspace:*`). Revisit publishing when a second project needs it.
- **Changing Bifrost itself** — We only wrap what's there. No Bifrost PRs from this project.
- **Changes to domain aggregates beyond the `gatewayKeyId` rename** — Aggregate logic, invariants, and repositories stay untouched structurally.

## Context

**Existing codebase:** Draupnir is a Bun + TypeScript DDD service with `src/Foundation/` (shared infrastructure) and `src/Modules/` (bounded contexts: `AppApiKey`, `ApiKey`, `SdkApi`, `Dashboard`, `Credit`, etc.). Each module has its own `ServiceProvider` and a `wireXxxRoutes` function that composes controllers from container-resolved services. Repositories follow a multi-ORM pattern via `RepositoryFactory`. Tests live under `tests/` (Unit, Feature, E2E) and run via Bun test + Playwright.

**Current Bifrost coupling surface (from `.planning/codebase/CONCERNS.md`):**
- 6 application-layer files import `BifrostClient` concrete class
- `BifrostClient` types use snake_case throughout; some snake_case has already leaked into domain via `bifrostVirtualKeyId` and into services via query parameter shapes
- Tests mock `BifrostClient` concrete class (not an interface), so any Bifrost method signature change is an incidental break
- `SdkApiServiceProvider` hardcodes a Bifrost URL for `ProxyModelCall`
- Design spec already exists at `docs/superpowers/specs/2026-04-10-llm-gateway-abstraction-design.md` with phases, interface signatures, data flow examples, and rationale — this project executes it with scope refinements captured in Out of Scope above

**Related docs:** `AGENTS.md`, `docs/draupnir/architecture/`, `docs/draupnir/DESIGN_DECISIONS.md`

## Constraints

- **Tech stack**: Bun runtime, TypeScript strict, Biome for lint/format, Zod for validation. No new framework dependencies; stay within the existing stack.
- **Compatibility**: All existing HTTP routes, request/response shapes, and DB schemas must remain unchanged. Only internal wiring changes. Clients of Draupnir should notice nothing.
- **Test baseline**: The full Bun test suite + Playwright E2E suite must pass at every phase boundary. No skipped or `todo` tests introduced.
- **Immutability**: Per project coding rules (`~/.claude/rules/coding-style.md`), new types use `readonly` fields. No mutation; always return new objects.
- **Language**: Commit messages, docs, and PROJECT artifacts in Traditional Chinese (Taiwan) per user global policy. Code and identifiers in English.
- **Commit format**: `<type>: [ <scope> ] <subject>` per user global git policy.
- **No DB migration**: The `bifrost_virtual_key_id` column name stays. TS-only rename.
- **Gateway decided at wire time, not runtime**: ServiceProvider binds `llmGatewayClient` once. No env-var factory, no conditional adapter selection at call sites.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| `ProxyModelCall` stays on Bifrost, out of `ILLMGatewayClient` | Chat-completion proxying has a different shape than key management; scoping creep would delay the interface landing | — Pending |
| Move hardcoded Bifrost URL into `bifrost-sdk` package config | Even though `ProxyModelCall` stays coupled, the URL shouldn't live in an application-module ServiceProvider | — Pending |
| Rename `bifrostVirtualKeyId` → `gatewayKeyId` in TS only | Gateway-neutral domain vocabulary without the blast radius of a DB migration | — Pending |
| `bifrost-sdk` lives at `packages/bifrost-sdk/` as a Bun workspace | Versioned together with Draupnir, no publishing overhead, keeps one-repo development loop | — Pending |
| Ship only `BifrostGatewayAdapter` + `MockGatewayClient` — no OpenRouter this milestone | Prove interface correctness cheaply; OpenRouter becomes a trivial follow-up phase once the interface is stable | — Pending |
| Gateway binding is compile-time in ServiceProvider, not env-driven | Avoids a factory layer; matches project's DI-first architecture | — Pending |
| Tests migrate to mock `ILLMGatewayClient` interface, not concrete adapter | Mocking the interface is the whole point of the refactor — it eliminates the test-coupling debt called out in CONCERNS.md | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-10 after initialization*
