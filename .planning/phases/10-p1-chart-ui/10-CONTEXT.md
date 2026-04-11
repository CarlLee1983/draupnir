# Phase 10: P1 Chart UI - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 10 wires five table-stakes dashboard features to live `usage_records` data:

1. KPI summary cards with 7/30/90-day time window selector (DASHBOARD-01)
2. Cost over time area chart (DASHBOARD-02)
3. Cost by model bar chart (DASHBOARD-03)
4. Token usage stacked area chart — input vs output (DASHBOARD-04)
5. Model comparison table with sortable columns (DASHBOARD-05)

**In scope:**
- New application services: `GetCostTrendsService`, `GetModelComparisonService` (read from `IUsageRepository`)
- New React chart components for each chart type
- Extending the Member Dashboard page with all chart sections
- Client-side time window switching via API fetch
- Empty state handling when `usage_records` is empty

**Explicitly not in scope:**
- Admin Dashboard chart (sampleUsageData replacement deferred — different data source)
- PDF export (Phase 12)
- Period-over-period badges (Phase 12)
- New routes or route shape changes

</domain>

<decisions>
## Implementation Decisions

### Dashboard Page Placement

- **D-01:** All 5 chart sections live on the existing Member Dashboard page (`/member/dashboard`), extended below the current 4 KPI cards.
- **D-02:** A time window selector (7d | 30d | 90d button group) sits at the top of the dashboard, above the KPI cards. Changing the window updates all KPI cards and all charts simultaneously.
- No new page, no new nav entry, no separate Analytics page.

### Time Window Data Fetching

- **D-03:** Time window switching is **client-side** — React state tracks the selected window (default: 30 days). On change, the component fetches from the existing `DashboardController` API endpoints using `start_time`/`end_time` query params.
- **D-04:** No page reload on window switch. Charts update in-place from fetched JSON.
- **D-05:** The Member Dashboard page handler performs **SSR for the initial render** — passing no pre-fetched chart data (charts start in loading state, fetch on mount). This avoids SSR complexity while keeping the page handler lean.
- The existing `DashboardController.usage` endpoint already accepts `start_time`/`end_time` — Phase 10 adds new chart-specific endpoints as needed, wired through the same controller.

### Model Comparison Table

- **D-06:** Sorting is **client-side** — all model rows are delivered in one fetch; React state manages the sort column and direction. Default sort: cost descending (matches REQUIREMENTS "sorted descending" spec).
- Maximum 10 models shown (top 10 by cost, filtered at the repository layer).

### Empty State

- **D-07:** When `usage_records` is empty (or returns zero rows for the selected window), the charts area renders a single informational Card:
  > "No usage data yet. Data syncs every 5 minutes from Bifrost. Check back after your first API call."
- Do **not** render zero-value charts — flat lines and zero bars confuse users into thinking data is missing.
- KPI cards still render (showing "—" or $0.00) so the page structure is visible.

### Role Scoping (Carrying Forward from Phase 8)

- **D-08:** MEMBER callers receive chart data scoped to their own API keys only (`queryStatsByKey` per key, aggregated). MANAGER and ADMIN callers receive org-wide chart data (`queryStatsByOrg`). This mirrors the Phase 8 permission model (D-01, D-02).

### Claude's Discretion

- Chart color scheme: follow existing patterns (hardcoded HSL values). Token chart: blue = input tokens, orange = output tokens (per REQUIREMENTS DASHBOARD-04).
- Loading state between window switches: show a subtle spinner or skeleton on the chart area while fetch is in flight.
- API endpoint design for new chart services: follow existing `DashboardController` pattern (auth via `AuthMiddleware`, orgId from route param).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §DASHBOARD-01 through DASHBOARD-05 — full acceptance criteria and data source specs for each chart

### Phase 9 Infrastructure (what Phase 10 builds on)
- `src/Modules/Dashboard/Application/Ports/IUsageRepository.ts` — read model port with all query method signatures Phase 10 services will call
- `src/Modules/Dashboard/Application/Ports/IUsageAggregator.ts` — existing live-data port (not used by Phase 10 chart services, but referenced for pattern)
- `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts` — DI registration pattern to follow for new services

### Existing Chart Patterns
- `resources/js/components/charts/UsageLineChart.tsx` — established chart component pattern (ResponsiveContainer, Card wrapper, Recharts primitives)
- `resources/js/components/charts/CreditBarChart.tsx` — established BarChart pattern

### Existing Dashboard Pages
- `resources/js/Pages/Member/Dashboard/Index.tsx` — page to extend with chart sections and time window selector
- `resources/js/Pages/Admin/Dashboard/Index.tsx` — admin dashboard (out of Phase 10 scope; noted for reference)

### Existing Controller
- `src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts` — pattern for new chart endpoints; note existing `usage` method signature
- `src/Modules/Dashboard/Presentation/Routes/dashboard.routes.ts` — route wiring pattern

### Phase 8 Context (permission scoping)
- `.planning/phases/08-data-correctness-permission-foundation/08-CONTEXT.md` — D-01/D-02/D-03 role-scoping decisions that Phase 10 must respect

### Research Artifacts
- `.planning/research/ARCHITECTURE.md` — cached aggregation architecture, schema design
- `.planning/research/FEATURES.md` — chart feature tier decisions (P1 vs P2)
- `.planning/research/PITFALLS.md` — known pitfalls: permission leaks, empty-table handling, performance cliffs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `UsageLineChart` / `CreditBarChart`: Chart component pattern to follow — both wrap Recharts in a `Card` with `ResponsiveContainer`. Phase 10 adds `CostTrendAreaChart`, `ModelCostBarChart`, `TokenUsageAreaChart`, and `ModelComparisonTable` following the same structure.
- `IUsageRepository` query methods map directly to chart data needs: `queryDailyCostByOrg` → cost trend + token chart; `queryModelBreakdown` → model bar chart + table; `queryStatsByOrg`/`queryStatsByKey` → KPI cards.
- `DashboardKeyScopeResolver` already handles role-based key filtering — Phase 10 services must use it or the same resolver logic.

### Established Patterns
- Chart components: `Card > CardHeader > CardTitle` + `CardContent > ResponsiveContainer(h=300)` — keep consistent.
- All controller methods: `AuthMiddleware.getAuthContext(ctx)` → validate → call service → `ctx.json(result)`.
- Application services: constructor-inject ports (`IUsageRepository`), return typed response DTOs.

### Integration Points
- `DashboardController` needs new methods for chart data endpoints (cost trends, model breakdown).
- `DashboardServiceProvider` needs to register `GetCostTrendsService` and `GetModelComparisonService`.
- `resources/js/Pages/Member/Dashboard/Index.tsx` receives no chart props from SSR; chart components fetch independently on mount.

</code_context>

<specifics>
## Specific Requirements

- Token chart colors: **blue = input tokens, orange = output tokens** (from REQUIREMENTS DASHBOARD-04)
- Model bar chart: **top 10 by cost, sorted descending** (from REQUIREMENTS DASHBOARD-03)
- Model comparison table: **clickable column headers** for sort (Cost, Requests, Avg Latency) — client-side sort
- Time window selector: **7d | 30d | 90d** button group — default 30 days
- KPI cards: **Cost (USD), Requests, Total Tokens, Avg Latency (ms)** — four cards

</specifics>

<deferred>
## Deferred Ideas

- Admin Dashboard chart replacement (sampleUsageData → real system-wide data): different data source (not per-org `usage_records`), deferred to a future phase.
- Period-over-period change badges on KPI cards: Phase 12 scope.
- PDF export / Download Report: Phase 12 scope.

</deferred>

---

*Phase: 10-p1-chart-ui*
*Context gathered: 2026-04-11*
