# Roadmap: Draupnir

**Last Updated**: 2026-04-12

## Milestones

- ✅ **v1.0 LLM Gateway Abstraction** — Phases 1-5 (shipped 2026-04-10)
- ✅ **v1.1 Pages & Framework** — Phases 6-7 (shipped 2026-04-11)
- 🚧 **v1.2 Dashboard 分析和報告** — Phases 8-12 (in progress)

<details>
<summary><strong>v1.1 Pages & Framework</strong> (Phases 6-7) — SHIPPED 2026-04-11</summary>

### Phase 6: Pages Test Coverage

**Goal**: All 19 page handler classes have unit tests; all 25 Inertia page routes (`/admin/*`, `/member/*`) are covered in `routes-existence.test.ts`; the full test suite passes.

**Plans**: 3 plans
- [x] 06-01-PLAN.md — Admin page handler unit tests (completed 2026-04-11)
- [x] 06-02-PLAN.md — Member page handler unit tests (completed 2026-04-11)
- [ ] 06-03-PLAN.md — routes-existence page route coverage

**Requirements**: [PAGES-01, PAGES-02, PAGES-03]

### Phase 7: Framework Capability & i18n

**Goal**: Complete i18n migration (wire SharedDataMiddleware, replace page hardcoded strings), standardize all API responses to English, fix failing tests (39 fail, 3 errors → 0).

**Plans**: 5 plans
- [x] 07-01-PLAN.md — Member page test fixtures with i18n (Wave 1)
- [x] 07-02-PLAN.md — Admin page tests + Credit service fixes (Wave 1)
- [x] 07-03-PLAN.md — API English-only: Auth, Organization, Contract, AppModule, Credit (Wave 2)
- [x] 07-04-PLAN.md — API English-only: SdkApi, Health, Dashboard, DevPortal, AppApiKey, CliApi (Wave 2)
- [x] 07-05-PLAN.md — Final verification and phase completion (Wave 3)

**Requirements**: [I18N-01, I18N-02, API-01, TEST-01, QUAL-01, QUAL-02]

</details>

---

## 🚧 v1.2 Dashboard 分析和報告 (In Progress)

**Milestone Goal:** 為多角色使用者（工程師、產品經理、財務）提供完整的 API 使用分析和每月決算報告。零新依賴，快取聚合架構，修復三個先決條件 bug 後再開發圖表功能。

### Phases

- [x] **Phase 8: Data Correctness & Permission Foundation** ✅ - Fix 3 prerequisite bugs: hardcoded data, field mismatch, role-scoped permissions (completed 2026-04-11)
- [x] **Phase 9: Cached Sync Infrastructure** ✅ - BifrostSyncService + usage_records SQLite schema enabling local 5-50ms reads
- [x] **Phase 10: P1 Chart UI** - Six table-stakes dashboard features wired end-to-end with real data (completed 2026-04-11)
- [x] **Phase 11: Resilience & UX Polish** - Gateway timeout handling, performance safeguards, staleness UX (completed 2026-04-11)
- [ ] **Phase 12: Differentiators** - Period-over-period comparison, per-key breakdown, PDF export

## Phase Details

### Phase 8: Data Correctness & Permission Foundation
**Goal**: The dashboard reads real data and respects role boundaries — no hardcoded samples, no field mismatches, no cross-member data leakage
**Depends on**: Phase 7 (v1.1 complete)
**Requirements**: DASHBOARD-P1, DASHBOARD-P2, DASHBOARD-P3
**Success Criteria** (what must be TRUE):
  1. ✅ Admin dashboard displays real organisation cost figures, not the static `sampleUsageData` literal
  2. ✅ Token charts show non-zero input and output token counts matching Bifrost log values
  3. ✅ A MEMBER user cannot see another member's API key costs or usage data
  4. ✅ A MANAGER or ADMIN user sees the full organisation-level usage summary
  5. ✅ All existing tests continue to pass with zero regressions
**Plans**: 
- [x] 08-01-PLAN.md — DashboardKeyScopeResolver + role-aware summary/usage (completed 2026-04-11)
**Status**: ✅ COMPLETED 2026-04-11

### Phase 9: Cached Sync Infrastructure
**Goal**: A local `usage_records` SQLite table is populated by `BifrostSyncService` on a 5-minute schedule, enabling all chart services to query sub-100ms local data instead of hitting Bifrost directly
**Depends on**: Phase 8
**Requirements**: (infrastructure phase — enables DASHBOARD-01 through DASHBOARD-05)
**Status**: ✅ COMPLETED 2026-04-11
**Success Criteria** (what must be TRUE):
  1. `usage_records` table exists in the local SQLite database with correct schema
  2. `BifrostSyncService` fetches incremental Bifrost logs and upserts rows on schedule
  3. A chart service query against `usage_records` returns in under 100ms
  4. Sync failures are logged and surfaced; the dashboard continues to serve stale data without crashing
**Plans**: 5 plans
- [x] 09-01-PLAN.md — Schema migration + LogEntry.logId + ApiKeyRepository.findByBifrostVirtualKeyId (Wave 1)
- [x] 09-02-PLAN.md — Application ports: IUsageRepository, ISyncCursorRepository, UsageLogDTO (Wave 1)
- [x] 09-03-PLAN.md — Infrastructure repositories: DrizzleUsageRepository + DrizzleSyncCursorRepository (Wave 2)
- [x] 09-04-PLAN.md — BifrostSyncService implementation + unit tests (Wave 2)
- [x] 09-05-PLAN.md — DI wiring (DashboardServiceProvider) + bootstrap scheduler (Wave 3)

### Phase 10: P1 Chart UI
**Goal**: Users can view the full dashboard — KPI summary cards, cost trend, model comparison bar chart, token usage stacked chart, and model comparison table — all wired to live local data
**Depends on**: Phase 9
**Requirements**: DASHBOARD-01, DASHBOARD-02, DASHBOARD-03, DASHBOARD-04, DASHBOARD-05
**Success Criteria** (what must be TRUE):
  1. User can select 7, 30, or 90-day windows and four KPI cards update (cost, requests, tokens, avg latency)
  2. User sees an area chart of daily cost over the selected time window with correct per-day aggregation
  3. User sees a bar chart of cost by model, sorted descending, showing the top 10 models
  4. User sees a stacked area chart of input vs output tokens over time (blue/orange, non-zero values)
  5. User can click a column header on the model comparison table to sort rows by that metric
**Plans**: 1 plan
- [x] 10-01-PLAN.md — Full chart UI implementation (completed 2026-04-11)
**UI hint**: yes

### Phase 11: Resilience & UX Polish
**Goal**: The dashboard degrades gracefully under Bifrost timeouts, never blocks on slow sync, and shows users when data was last refreshed
**Depends on**: Phase 10
**Requirements**: (quality phase — hardens DASHBOARD-01 through DASHBOARD-05 in production conditions)
**Success Criteria** (what must be TRUE):
  1. When Bifrost sync takes longer than the configured timeout, the dashboard renders stale data with a visible staleness indicator rather than failing
  2. Chart queries with large date ranges complete in under 500ms (indexed queries, no full-table scans)
  3. A "Last updated N minutes ago" label is visible on the dashboard and reflects actual sync time
  4. The page handles an empty `usage_records` table without blank charts or JS errors
**Plans**: 3 plans
- [ ] 11-01-PLAN.md — BifrostSyncService timeout + KPI lastSyncedAt + DI wiring (Wave 1, TDD)
- [ ] 11-02-PLAN.md — Composite index migration on usage_records(org_id, occurred_at) (Wave 1)
- [ ] 11-03-PLAN.md — StalenessLabel frontend component + KpiPayload extension (Wave 2)
**UI hint**: yes

### Phase 12: Differentiators
**Goal**: Users can generate and download a monthly PDF report and see period-over-period cost change badges on KPI cards
**Depends on**: Phase 11
**Requirements**: DASHBOARD-06
**Success Criteria** (what must be TRUE):
  1. User can click "Download Report" to trigger a `window.print()` PDF of the dashboard with all KPI data included
  2. KPI cards show a percentage-change badge comparing the current period to the prior equivalent period (e.g., +5% / -3%)
  3. The PDF output contains the correct cost total and at least one trend chart
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Gateway Foundation | v1.0 | 4/4 | Complete | 2026-04-10 |
| 2. Business-Layer Migration | v1.0 | 5/5 | Complete | 2026-04-10 |
| 3. Domain Rename | v1.0 | 3/3 | Complete | 2026-04-10 |
| 4. SDK Extraction | v1.0 | 2/2 | Complete | 2026-04-10 |
| 5. Final Verification | v1.0 | 3/3 | Complete | 2026-04-10 |
| 6. Pages Test Coverage | v1.1 | 2/3 | Complete | 2026-04-11 |
| 7. Framework & i18n | v1.1 | 5/5 | Complete | 2026-04-11 |
| 8. Data Correctness & Permission Foundation | v1.2 | 1/1 | Complete | 2026-04-11 |
| 9. Cached Sync Infrastructure | v1.2 | 5/5 | Complete | 2026-04-11 |
| 10. P1 Chart UI | v1.2 | 1/1 | Complete    | 2026-04-11 |
| 11. Resilience & UX Polish | v1.2 | 0/3 | Complete    | 2026-04-11 |
| 12. Differentiators | v1.2 | 0/? | Not started | - |
