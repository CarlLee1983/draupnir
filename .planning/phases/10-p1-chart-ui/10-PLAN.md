---
phase: 10-p1-chart-ui
plan: 01
type: execute
wave: 1
depends_on:
  - 09-05
files_modified:
  - src/Modules/Dashboard/Application/Ports/IUsageRepository.ts
  - src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts
  - src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts
  - src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts
  - src/Modules/Dashboard/__tests__/GetCostTrendsService.test.ts
  - src/Modules/Dashboard/__tests__/GetModelComparisonService.test.ts
  - src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts
  - src/Modules/Dashboard/Application/Services/GetKpiSummaryService.ts
  - src/Modules/Dashboard/Application/Services/GetCostTrendsService.ts
  - src/Modules/Dashboard/Application/Services/GetModelComparisonService.ts
  - src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts
  - src/Modules/Dashboard/Presentation/Routes/dashboard.routes.ts
  - src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts
  - src/Modules/Dashboard/index.ts
  - resources/js/Pages/Member/Dashboard/Index.tsx
  - resources/js/components/charts/CostTrendAreaChart.tsx
  - resources/js/components/charts/ModelCostBarChart.tsx
  - resources/js/components/charts/TokenUsageAreaChart.tsx
  - resources/js/components/charts/ModelComparisonTable.tsx
autonomous: true
requirements:
  - DASHBOARD-01
  - DASHBOARD-02
  - DASHBOARD-03
  - DASHBOARD-04
  - DASHBOARD-05
must_haves:
  truths:
    - "The Member Dashboard shows 7d/30d/90d window controls and refreshes all KPI cards and charts in place when the window changes."
    - "KPI cards are computed from cached usage_records and remain role-correct for MEMBER versus MANAGER/ADMIN callers."
    - "Cost trend, token usage, and model comparison data come from date-ranged local queries, not live Bifrost calls or SSR props."
    - "The model bar chart and comparison table honor top-10-by-cost semantics, with the table sortable client-side by cost, requests, and average latency."
    - "An empty selected window renders one informational empty-state card instead of blank charts."
  artifacts:
    - path: src/Modules/Dashboard/Application/Ports/IUsageRepository.ts
      provides: "key-scoped daily cost and model breakdown query contracts"
    - path: src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts
      provides: "cached usage_records query implementation with top-10 enforcement"
    - path: src/Modules/Dashboard/Application/Services/GetKpiSummaryService.ts
      provides: "date-range-aware KPI summary payload"
    - path: src/Modules/Dashboard/Application/Services/GetCostTrendsService.ts
      provides: "daily cost + token trend payload"
    - path: src/Modules/Dashboard/Application/Services/GetModelComparisonService.ts
      provides: "top-10 model comparison payload"
    - path: src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts
      provides: "new dashboard analytics API endpoints"
    - path: resources/js/Pages/Member/Dashboard/Index.tsx
      provides: "time-window selector, loading state, empty state, dashboard composition"
    - path: resources/js/components/charts/CostTrendAreaChart.tsx
      provides: "daily cost area chart"
    - path: resources/js/components/charts/TokenUsageAreaChart.tsx
      provides: "stacked token usage area chart"
    - path: resources/js/components/charts/ModelCostBarChart.tsx
      provides: "top-10 cost-by-model bar chart"
    - path: resources/js/components/charts/ModelComparisonTable.tsx
      provides: "sortable model comparison table"
  key_links:
    - from: src/Modules/Dashboard/Application/Ports/IUsageRepository.ts
      to: src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts
      via: "key-scoped query methods and repository-level top-10 limit"
      pattern: "queryDailyCostByKeys|queryModelBreakdownByKeys|limit\\(10\\)"
    - from: src/Modules/Dashboard/Application/Services/GetKpiSummaryService.ts
      to: src/Modules/Dashboard/Application/Services/DashboardKeyScopeResolver.ts
      via: "role-aware key resolution before stats aggregation"
      pattern: "DashboardKeyScopeResolver"
    - from: src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts
      to: src/Modules/Dashboard/Application/Services/*
      via: "start_time/end_time query params into date-range service calls"
      pattern: "start_time|end_time"
    - from: resources/js/Pages/Member/Dashboard/Index.tsx
      to: "/api/organizations/:orgId/dashboard/*"
      via: "client-side fetch on selected window change"
      pattern: "fetch\\("
    - from: resources/js/Pages/Member/Dashboard/Index.tsx
      to: resources/js/components/charts/*
      via: "loading and empty-state gating before Recharts renders"
      pattern: "loading|empty"
---

<objective>
Deliver the P1 dashboard analytics surface on the existing Member Dashboard page using cached `usage_records` data, with correct MEMBER scoping, top-10 model constraints, and zero new dependencies.

Purpose: Make the live dashboard usable end-to-end for 7/30/90-day analysis without leaving the existing page or leaking org data across member boundaries.

Output: New read-model contracts, backend analytics services/endpoints, four chart components, and an updated Member Dashboard page with loading and empty states.
</objective>

<execution_context>
@/Users/carl/.codex/get-shit-done/workflows/execute-plan.md
@/Users/carl/.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/10-p1-chart-ui/10-CONTEXT.md
@.planning/phases/10-p1-chart-ui/10-RESEARCH.md
@.planning/phases/10-p1-chart-ui/10-VALIDATION.md
@src/Modules/Dashboard/Application/Ports/IUsageRepository.ts
@src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts
@src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts
@src/Modules/Dashboard/Presentation/Routes/dashboard.routes.ts
@src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts
@src/Modules/Dashboard/Application/Services/GetUsageChartService.ts
@resources/js/Pages/Member/Dashboard/Index.tsx
@resources/js/components/charts/UsageLineChart.tsx
@resources/js/components/charts/CreditBarChart.tsx

<interfaces>
From `src/Modules/Dashboard/Application/Ports/IUsageRepository.ts`:
```ts
export interface DateRange {
  readonly startDate: string
  readonly endDate: string
}

export interface IUsageRepository {
  upsert(record: UsageRecordInsert): Promise<void>
  queryDailyCostByOrg(orgId: string, range: DateRange): Promise<readonly DailyCostBucket[]>
  queryDailyCostByKeys(apiKeyIds: readonly string[], range: DateRange): Promise<readonly DailyCostBucket[]>
  queryModelBreakdown(orgId: string, range: DateRange): Promise<readonly ModelUsageBucket[]>
  queryModelBreakdownByKeys(apiKeyIds: readonly string[], range: DateRange): Promise<readonly ModelUsageBucket[]>
  queryStatsByOrg(orgId: string, range: DateRange): Promise<UsageStats>
  queryStatsByKey(apiKeyId: string, range: DateRange): Promise<UsageStats>
}
```

From `src/Modules/Dashboard/Application/Services/DashboardKeyScopeResolver.ts`:
```ts
resolveVisibleKeys(orgKeys, { callerUserId, callerSystemRole, orgMembershipRole }): ApiKey[]
```

From `src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts`:
```ts
export interface DashboardSummaryResponse { success: boolean; message: string; data?: { totalKeys: number; activeKeys: number; usage: { totalRequests: number; totalCost: number; totalTokens: number; avgLatency: number } }; error?: string }
export interface UsageChartQuery { orgId: string; callerUserId: string; callerSystemRole: string; startTime?: string; endTime?: string; providers?: string; models?: string; limit?: number }
export interface UsageChartResponse { success: boolean; message: string; data?: { logs: Record<string, unknown>[]; stats: { totalRequests: number; totalCost: number; totalTokens: number; avgLatency: number } }; error?: string }
```

From `src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts`:
```ts
summary(ctx): Promise<Response>
usage(ctx): Promise<Response>
```

From `resources/js/components/charts/UsageLineChart.tsx` and `CreditBarChart.tsx`:
```ts
UsageLineChart({ data, title? })
CreditBarChart({ data, title? })
```

New chart components should mirror the existing `Card > CardHeader > CardContent > ResponsiveContainer(height=300)` pattern and keep Recharts usage local to the component.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: W0 stabilize cached query contracts and failing tests</name>
  <files>src/Modules/Dashboard/Application/Ports/IUsageRepository.ts, src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts, src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts, src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts, src/Modules/Dashboard/__tests__/GetCostTrendsService.test.ts, src/Modules/Dashboard/__tests__/GetModelComparisonService.test.ts</files>
  <behavior>
    - Add key-scoped daily cost and model breakdown query contracts so MEMBER scoping cannot be faked through org-wide methods.
    - Extend repository tests to assert model breakdown is capped at 10 rows and remains sorted by cost descending.
    - Add red tests for the three new services that encode the phase contract: date-window KPI summary, shared cost/token trends, and sortable model comparison.
  </behavior>
  <action>
    Extend the read-model port and Drizzle repository exactly enough for Phase 10 to query cached usage_records by either org or explicit api key set. Keep the existing org-scoped methods unchanged for MANAGER/ADMIN callers, but add the key-scoped variants needed for MEMBER correctness. Enforce the top-10 limit in the repository layer, not in React. Keep tests red for the new service contracts if the implementations do not exist yet; these files are the wave-0 safety net from VALIDATION.md.
  </action>
  <verify>
    bun test src/Modules/Dashboard --filter DrizzleUsageRepository
  </verify>
  <done>
    The repository port exposes key-scoped query methods, DrizzleUsageRepository top-10 behavior is asserted, and the phase now has failing/covered service tests that describe the intended contracts.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: W1 implement dashboard analytics services and HTTP wiring</name>
  <files>src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts, src/Modules/Dashboard/Application/Services/GetKpiSummaryService.ts, src/Modules/Dashboard/Application/Services/GetCostTrendsService.ts, src/Modules/Dashboard/Application/Services/GetModelComparisonService.ts, src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts, src/Modules/Dashboard/Presentation/Routes/dashboard.routes.ts, src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts, src/Modules/Dashboard/index.ts</files>
  <behavior>
    - Implement date-range-aware KPI summary as a new service instead of reusing the existing all-time summary endpoint.
    - Resolve visible API keys through DashboardKeyScopeResolver so MEMBER callers aggregate only their own keys while MANAGER/ADMIN keep org scope.
    - Add the new controller methods and routes for `kpi-summary`, `cost-trends`, and `model-comparison`, reading `start_time`/`end_time` from the request and preserving the existing `/dashboard` and `/dashboard/usage` routes.
    - Bind all new services in DashboardServiceProvider and export them from the module barrel if the module API needs to consume them elsewhere.
  </behavior>
  <action>
    Build the backend read APIs for Phase 10 on top of the stabilized cached repository contracts. KPI summary should return the four cards needed on the page and combine per-key stats in memory for MEMBER callers when required. Cost trends should return the daily buckets used by both the cost area chart and stacked token chart. Model comparison should return the top 10 rows already sorted by cost descending, with the table allowed to re-sort client-side by cost, requests, or average latency. Keep the controller/auth pattern consistent with the current dashboard module and avoid changing existing route shapes.
  </action>
  <verify>
    bun test src/Modules/Dashboard
  </verify>
  <done>
    The dashboard module exposes live JSON endpoints for KPI summary, cost trends, and model comparison with correct role scoping and cached-data queries.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: W2 build the Member Dashboard chart UI and client-side fetch flow</name>
  <files>resources/js/Pages/Member/Dashboard/Index.tsx, resources/js/components/charts/CostTrendAreaChart.tsx, resources/js/components/charts/ModelCostBarChart.tsx, resources/js/components/charts/TokenUsageAreaChart.tsx, resources/js/components/charts/ModelComparisonTable.tsx</files>
  <behavior>
    - Add the 7d/30d/90d selector at the top of the existing Member Dashboard page and make it drive all KPI and chart requests through local React state.
    - Fetch chart data on mount and on window change, show a loading state while requests are in flight, and short-circuit to a single informational empty-state card when the selected window has no usage rows.
    - Reuse the existing chart wrapper pattern from UsageLineChart/CreditBarChart so the new charts remain consistent with the rest of the module.
    - Implement client-side sorting for the comparison table with default cost-descending order, keeping the blue/orange token palette and top-10-by-cost bar chart semantics intact.
  </behavior>
  <action>
    Replace the current four-card-only dashboard composition with the complete P1 analytics surface. Keep the page on `/member/dashboard`, do not add a new navigation entry, and do not SSR chart props. The page should fetch its own JSON payloads from the new dashboard endpoints, merge them into the existing KPI cards, and render the four chart sections below the summary area. Ensure empty-state handling prevents blank Recharts canvases, and keep KPI cards visible even when the chart area is empty.
  </action>
  <verify>
    bun run typecheck
  </verify>
  <done>
    The Member Dashboard page shows live KPI cards, the three chart visualizations, and the sortable model comparison table with loading and empty states handled in place.
  </done>
</task>

</tasks>

<verification>
1. After each task commit, run `bun test src/Modules/Dashboard`.
2. After Task 3, run `bun test src tests/Unit packages` and `bun run typecheck`.
3. Manually open `/member/dashboard` and verify 7d/30d/90d window switching, loading state, empty-state card, chart rendering, token colors, and model-table sorting.
</verification>

<success_criteria>
1. Phase 10 renders all five DASHBOARD-01 through DASHBOARD-05 surfaces from cached `usage_records` data.
2. MEMBER callers only see their own key data, while MANAGER and ADMIN callers see org-wide analytics.
3. The cost-by-model chart is limited to the top 10 rows and the comparison table sorts client-side on the requested columns.
4. Empty windows render the single informational card instead of blank charts or JS errors.
5. The dashboard module test suite and workspace typecheck pass after implementation.
</success_criteria>

<output>
After completion, create `.planning/phases/10-p1-chart-ui/10-01-SUMMARY.md`
</output>
