# Draupnir — LLM Gateway Abstraction

## What This Is

Draupnir is an existing TypeScript + Bun + DDD service that currently speaks directly to Bifrost API Gateway for LLM virtual-key management, usage tracking, and chat-completion proxying. This project introduces an `ILLMGatewayClient` abstraction so business logic no longer imports Bifrost types, and extracts the `BifrostClient` into a standalone `packages/bifrost-sdk/` workspace package so future gateway backends (OpenRouter, Gemini, mocks) can be swapped in at build time without touching the application layer.

## Core Value

**No file under `src/Modules/` or `src/Foundation/Application/` may import a Bifrost-specific symbol after this milestone ships.** Gateway choice is a compile-time wiring decision made in ServiceProviders, not a runtime concern, and never a domain concern.

## Requirements

### Validated

- ✓ Draupnir uses `BifrostClient` to create/update/delete virtual keys for app API keys — existing
- ✓ `GetAppKeyUsageService` queries Bifrost logs stats for per-key usage metrics — existing
- ✓ `QueryUsage` (SdkApi) returns aggregated token/cost data from Bifrost — existing
- ✓ `UsageAggregator` (Dashboard) pulls per-org aggregations from Bifrost — existing
- ✓ `ProxyModelCall` (SdkApi) proxies chat completions through Bifrost — existing
- ✓ DI via `IContainer` with per-module `ServiceProvider`s and `wireXxxRoutes` wiring — existing
- ✓ Bun + Biome + TS strict + Zod validation + Bun test — existing
- ✓ Multi-ORM repository pattern (memory, drizzle, atlas) — existing
- ✓ `ILLMGatewayClient` interface with camelCase DTOs, adapter, mock, barrel export — v1.0
- ✓ All 7 application services migrated to `ILLMGatewayClient` with tests — v1.0
- ✓ `bifrostVirtualKeyId` → `gatewayKeyId` renamed across domain and repos — v1.0
- ✓ `packages/bifrost-sdk/` workspace package with BifrostClient, config, types, errors — v1.0
- ✓ Bifrost proxy URL sourced from `bifrost-sdk` config via DI — v1.0
- ✓ All feature, unit, and E2E tests pass — v1.0
- ✓ Lint (Biome) + typecheck (`tsc --noEmit`) clean across workspace — v1.0

### Active

- [ ] Implement `OpenRouterGatewayAdapter` (v2)
- [ ] Extend `ILLMGatewayClient` to cover raw chat-completion proxying (v2)
- [ ] Publish `bifrost-sdk` to private npm registry (v2)

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
| `ProxyModelCall` stays on Bifrost, out of `ILLMGatewayClient` | Chat-completion proxying has a different shape than key management; scoping creep would delay the interface landing | ✅ Completed — boundaries respected, clean separation |
| Move hardcoded Bifrost URL into `bifrost-sdk` package config | Even though `ProxyModelCall` stays coupled, the URL shouldn't live in an application-module ServiceProvider | ✅ Completed — URL sourced via DI singleton bifrostConfig |
| Rename `bifrostVirtualKeyId` → `gatewayKeyId` in TS only | Gateway-neutral domain vocabulary without the blast radius of a DB migration | ✅ Completed — TS-only rename with zero-risk repo mapping |
| `bifrost-sdk` lives at `packages/bifrost-sdk/` as a Bun workspace | Versioned together with Draupnir, no publishing overhead, keeps one-repo development loop | ✅ Completed — independent package with smoke tests |
| Ship only `BifrostGatewayAdapter` + `MockGatewayClient` — no OpenRouter this milestone | Prove interface correctness cheaply; OpenRouter becomes a trivial follow-up phase once the interface is stable | ✅ Completed — proved interface correctness with real + mock |
| Gateway binding is compile-time in ServiceProvider, not env-driven | Avoids a factory layer; matches project's DI-first architecture | ✅ Completed — DI-first binding in FoundationServiceProvider |
| Tests migrate to mock `ILLMGatewayClient` interface, not concrete adapter | Mocking the interface is the whole point of the refactor — it eliminates the test-coupling debt called out in CONCERNS.md | ✅ Completed — all tests now mock interface, not concrete class |

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
*Last updated: 2026-04-11 after v1.1 milestone completion*

## Shipped Milestones

### v1.0: LLM Gateway Abstraction ✓
**Completed 2026-04-10**
- Introduced `ILLMGatewayClient` abstraction layer
- Decoupled application logic from Bifrost-specific types
- Extracted `bifrost-sdk` into workspace package
- All services migrated to interface-based gateway access
- All tests passing; lint and type checking clean

### v1.1: Pages & Framework ✓
**Completed 2026-04-11**
- **Phase 6 (Pages):** All 19 page handler classes unit-tested (3 plans, 83 tests); all 25 Inertia page routes covered in integration tests
- **Phase 7 (Framework Capability & i18n):** Complete i18n migration for page handlers and API responses; all API modules return English-only messages; SharedDataMiddleware wired across all page tests; full test suite passing (912+ tests, 0 failures)

## Current State

**Codebase:** Draupnir is now a mature Bun + TypeScript + DDD service with:
- Gateway abstraction complete and proven (v1.0)
- Full page handler test coverage with i18n fixtures (v1.1)
- English-only API responses standardized across all modules (v1.1)
- Test infrastructure ready for further development (912+ tests, 0 failures)
- Lint and type checking clean

**What's Ready for Next Milestone:**
- Pages and page tests are fully covered and i18n-enabled
- All API modules speak English only
- Framework capabilities documented and standardized
- Foundation ready for new feature development

## Next Milestone Focus

Will be defined during `/gsd:new-milestone` process. Consider areas:
- OAuth/OIDC authentication system
- Dashboard analytics and reporting
- SDK public publishing
- Additional gateway adapters (v2 from Out of Scope)
