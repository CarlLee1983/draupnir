# Phase 14: Per-Key Cost Breakdown - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can analyze cost attribution per API key and per model to identify spending patterns. This phase delivers: a dedicated Cost Breakdown page with per-key cost table (with expandable per-model detail rows), per-model cost distribution donut chart with companion table, time window selector, print support, and the backend services/queries to power it all.

Requirements covered: COST-01, COST-02, COST-03, COST-04.

</domain>

<decisions>
## Implementation Decisions

### Page Placement & Navigation
- **D-01:** New dedicated page at `/member/cost-breakdown` with its own sidebar nav entry ("Cost Breakdown"). Keeps main dashboard focused on KPIs/trends.
- **D-02:** Own independent 7d/30d/90d time window selector on the Cost Breakdown page (not shared with dashboard state).
- **D-03:** Includes a "Download Report" button using the same `window.print()` + `@media print` pattern from Phase 12.

### Per-Key Cost Table (COST-01, COST-02)
- **D-04:** Full metrics table with columns: Key Name | Cost | Requests | Tokens | $/Request | Tokens/Request | % of Total. All columns sortable (client-side).
- **D-05:** Default sort: cost descending (highest spending keys first). Matches Phase 10 model comparison table pattern.
- **D-06:** Summary/totals row at bottom showing org-wide totals: Total Cost, Total Requests, Total Tokens, weighted avg $/Req, weighted avg Tok/Req, 100%.
- **D-07:** Expandable rows — clicking a key row expands to show per-model breakdown for that specific key (which models the key used and their cost split). Answers "why is this key expensive?" directly.
- **D-08:** Expanded row data fetched lazily on expand (not eager). Shows brief loading spinner in expanded area. Keeps initial page load fast.

### Model Distribution Visualization (COST-03, COST-04)
- **D-09:** Donut chart (Recharts PieChart with innerRadius) showing per-model cost distribution. Total cost displayed in the center.
- **D-10:** Chart + table side by side layout — donut chart on left, model breakdown table on right. Table shows: Model | Cost | Requests | % Share.
- **D-11:** Top 8 models displayed individually; remaining models grouped into "Other" segment. Keeps the donut readable.

### Data Scoping & Filtering
- **D-12:** Same page, filtered data for all roles — MEMBER sees only their own keys (consistent with Phase 10 D-08 role scoping). ADMIN/MANAGER see org-wide data.
- **D-13:** Time window only — no additional filters (model filter, key filter) for v1.3. Expandable rows serve as the drill-down mechanism.
- **D-14:** New bulk query method `queryPerKeyCost(orgId, range)` added to IUsageRepository — single SQL query groups by api_key_id. Avoids N+1 queries.
- **D-15:** Expandable row model breakdown uses existing `queryModelBreakdownByKeys` with a single key ID, fetched lazily on row expand.

### Claude's Discretion
- New Inertia page component structure and layout for Cost Breakdown
- Backend service design (GetPerKeyCostService, etc.) and DTO shapes
- Donut chart color palette (follow existing Recharts color patterns)
- Print CSS specifics for the Cost Breakdown page
- Empty state design when no usage data exists for selected window
- Nav icon choice (PieChart or DollarSign from Lucide)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Research
- `.planning/REQUIREMENTS.md` — COST-01 through COST-04 acceptance criteria
- `.planning/research/FEATURES-v1.3.md` — Feature landscape, per-key cost breakdown positioning
- `.planning/research/ARCHITECTURE.md` — Recommended module topology, cached aggregation architecture
- `.planning/research/STACK.md` — Technology stack decisions

### Existing Dashboard Infrastructure (what Phase 14 builds on)
- `src/Modules/Dashboard/Application/Ports/IUsageRepository.ts` — Read model port; `queryStatsByKey`, `queryModelBreakdown`, `queryModelBreakdownByKeys` already exist. Phase 14 adds `queryPerKeyCost`.
- `src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts` — Existing response DTOs (KpiSummaryResponse, ModelComparisonResponse) — follow same pattern for new endpoints
- `src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts` — Controller pattern for new endpoints
- `src/Modules/Dashboard/Presentation/Routes/dashboard.routes.ts` — Route wiring pattern; add new cost breakdown endpoints here
- `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts` — DI registration pattern for new services

### Frontend Components & Patterns
- `resources/js/Pages/Member/Dashboard/Index.tsx` — Existing dashboard page pattern (time window selector, chart layout, MetricCard, fetch-on-mount)
- `resources/js/components/charts/ModelCostBarChart.tsx` — Existing Recharts chart component pattern
- `resources/js/components/charts/ModelComparisonTable.tsx` — Existing sortable table pattern (client-side sort)
- `resources/js/components/ui/` — Reusable UI components (Card, Button, Badge, Skeleton)

### Phase Context (prior decisions that apply)
- `.planning/phases/10-p1-chart-ui/10-CONTEXT.md` — D-02 time window selector, D-03/D-04 client-side fetching, D-08 role scoping
- `.planning/phases/12-differentiators/12-CONTEXT.md` — D-06/D-07 print CSS pattern, D-09 Download Report button pattern

### Codebase Maps
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, DDD module structure, error handling
- `.planning/codebase/ARCHITECTURE.md` — Four-layer DDD architecture, data flow, key abstractions
- `.planning/codebase/STACK.md` — Technology stack, Bun runtime, Drizzle ORM

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ModelComparisonTable` component: Sortable table pattern with clickable column headers — adapt for per-key cost table
- `ModelCostBarChart` / Recharts setup: PieChart (for donut) available in same Recharts library already installed
- `DashboardKeyScopeResolver`: Role-based key filtering — reuse for per-key cost scoping
- `Card`, `Button`, `Badge`, `Skeleton` UI components: All available for the new page
- `formatCredit`, `formatNumber` utilities: Already handle cost/number formatting
- Time window selector pattern from `Index.tsx`: Reusable `WINDOW_OPTIONS` + button group approach

### Established Patterns
- **Chart components:** `Card > CardHeader > CardTitle + CardContent > ResponsiveContainer` wrapper
- **Controller methods:** `AuthMiddleware.getAuthContext(ctx)` -> validate -> call service -> `ctx.json(result)`
- **Application services:** Constructor-inject ports (IUsageRepository), return typed response DTOs
- **Client-side fetching:** `useEffect` + `useState` with fetch on mount and window change
- **Sortable tables:** Client-side sort state with clickable column headers (ModelComparisonTable pattern)

### Integration Points
- `DashboardController` — Add new methods for per-key cost and model distribution endpoints
- `DashboardServiceProvider` — Register new services (GetPerKeyCostService, GetModelDistributionService or similar)
- `dashboard.routes.ts` — Add new route entries for cost breakdown API endpoints
- `IUsageRepository` — Add `queryPerKeyCost` bulk method
- `DrizzleUsageRepository` — Implement the new query method
- Sidebar navigation (`MemberLayout`) — Add "Cost Breakdown" nav entry
- New Inertia page at `resources/js/Pages/Member/CostBreakdown/Index.tsx`

</code_context>

<specifics>
## Specific Ideas

- Per-key table: 7 columns (Key Name, Cost, Requests, Tokens, $/Request, Tokens/Request, % of Total) with totals row
- Expandable rows show per-model breakdown for that specific key — fetched lazily
- Donut chart with total cost in center, top 8 models + "Other" grouping
- Donut chart + model table side-by-side layout
- Print button reuses exact Phase 12 pattern (`window.print()` + `@media print`)
- MEMBER role sees their own keys only — same data, same page layout, fewer rows

</specifics>

<deferred>
## Deferred Ideas

- Model filter dropdown (filter per-key table to specific model) — v2
- Key filter for model distribution (filter donut to specific key's models) — v2
- Custom date range picker (arbitrary start/end) — v2
- Shared time window state between dashboard and cost breakdown — considered, rejected for simplicity

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-per-key-cost-breakdown*
*Context gathered: 2026-04-12*
