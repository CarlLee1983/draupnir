# Shipped Milestones

## v1.3 Advanced Analytics & Alerts (Shipped: 2026-04-12)

**Phases completed:** 17 phases, 52 plans, 50 tasks

**Key accomplishments:**

- One-liner:
- ILLMGatewayClient 介面合約層：5 個方法、8 個 readonly camelCase DTO 類型、GatewayError 判別碼類別、完整 barrel export，附 MockGatewayClient 具狀態 in-memory 實作
- `llmGatewayClient` singleton registered in FoundationServiceProvider — wraps `bifrostClient` via `BifrostGatewayAdapter`, completing the Phase 1 ILLMGatewayClient abstraction layer
- MockGatewayClient 完整測試套件：30 個單元測試覆蓋具狀態 in-memory 行為、呼叫追蹤、FIFO 失敗注入、reset 與 seed 方法，並更新實作以符合 D-14 規格
- One-liner:
- 1. [Rule 2 - Missing Migration] CreateApiKeyService.test.ts and RevokeApiKeyService.test.ts
- 一句話摘要：
- 一句話摘要：
- 1. [Rule 1 - Bug] CreditEventFlow.integration.test.ts 仍使用 BifrostClient mock
- All remaining gateway-specific field names were removed from SDK auth context, application services, and test fixtures.
- ApiKey and AppApiKey aggregates now use gateway-neutral field names while still persisting to the frozen `bifrost_virtual_key_id` columns.
- Gateway sync contracts and app-key event payloads now use gateway-neutral field names end to end.
- All src/ and test/ BifrostClient imports migrated to @draupnir/bifrost-sdk; bifrostConfig DI singleton wires proxy URL into SdkApiServiceProvider without env-var leak
- CONCERNS.md updated with resolved-state markers for the gateway abstraction milestone
- CliApi DI binding cleaned up and IHttpContext import restored, with verification scoped to the touched files and pre-existing route baselines
- Playwright E2E suite passed against the local auto-started Draupnir app, closing the final milestone gate
- One-liner:
- Objective:
- One-liner:
- Objective:
- Phase:
- Objective:
- Objective:
- Objective:
- Objective:
- Objective:
- Composite usage_records index migration for dashboard range-query performance
- Bifrost sync timeout hardening with cursor-backed KPI freshness metadata and test-runner alias support
- Dashboard header freshness indicator with always-visible staleness state and progressive badge colouring
- 1. [Rule 1 - Bug] Updated existing tests to handle dual-range queries
- Shared mailer port, immutable alert budget/value objects, alert persistence, and the sync-completion event that Wave 2 consumes
- Bifrost-driven threshold evaluation, per-key alert attribution, budget CRUD, and application wiring for the Alerts module
- 1. Added optional key filtering to the model-comparison endpoint
- 1. Added key-filter support to the model-comparison endpoint

---

## v1.1 Pages & Framework (Shipped: 2026-04-11)

**Phases completed:** 2 phases, 8 plans, 5 tasks

**Key accomplishments:**

- Objective:
- One-liner:
- One-liner:
- Objective:
- Objective:
- Objective:
- Objective:
- Objective:
- Phase:

---

## v1.0: LLM Gateway Abstraction

**Shipped**: 2026-04-11  
**Phases**: 1-5 (5 phases, 17 plans total)  
**Duration**: 2 days (2026-04-10 — 2026-04-11)

### What Was Built

1. ✅ **`ILLMGatewayClient` Abstraction Layer** — Interface + DTO types + error handling + barrel export
2. ✅ **Adapter Pattern Implementation** — `BifrostGatewayAdapter` with snake_case ↔ camelCase translation
3. ✅ **Test Mock** — `MockGatewayClient` for zero-HTTP testing
4. ✅ **DI Integration** — `llmGatewayClient` singleton registered in FoundationServiceProvider
5. ✅ **Service Migration** — 7 application services refactored to use the new interface
6. ✅ **Domain Rename** — `bifrostVirtualKeyId` → `gatewayKeyId` across aggregates and repos
7. ✅ **SDK Extraction** — `packages/bifrost-sdk/` workspace package with independent smoke tests
8. ✅ **Quality Gates** — Lint, typecheck, unit, feature, and E2E tests all passing

### Key Metrics

- **Requirements**: 44/44 satisfied (100%)
- **Test Coverage**: All phases verified
- **Code Quality**: Biome lint clean, TypeScript strict clean
- **Integration**: All cross-phase wiring verified

### Technical Decisions Validated

- ✅ `ProxyModelCall` deferred (chat-completion out of scope for v1)
- ✅ Bifrost proxy URL sourced from DI-configured `bifrostConfig`
- ✅ TS-only field rename (no DB migration)
- ✅ Bun workspace package model for `bifrost-sdk`
- ✅ Compile-time gateway binding (not runtime env-driven)
- ✅ Interface mocking in tests eliminates concrete class coupling

### Known Gaps (Tech Debt)

- **Process Artifacts**: 3 phases missing formal VERIFICATION.md (verification gaps, not functional)
- **Nyquist Validation**: 2 phases with incomplete wave_0 validation
- **Pre-existing**: 14 feature test failures in routes tests, 5 TypeScript errors (not introduced by v1)

See `.planning/milestones/v1.0-MILESTONE-AUDIT.md` for full audit details.

### Next Milestone

**v1.1: Pages & Framework Capability** (in planning)

- Phase 6: Complete pages test coverage
- Phase 7: Framework capability review and i18n improvements

---

For archived roadmap and requirements, see:

- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`
