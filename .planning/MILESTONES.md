# Shipped Milestones

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
