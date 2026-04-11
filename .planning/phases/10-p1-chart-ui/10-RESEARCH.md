# Phase 10: P1 Chart UI - Research

**Researched:** 2026-04-11
**Domain:** React chart components (Recharts), application services (GetCostTrendsService, GetModelComparisonService), DashboardController extension, Member Dashboard page wiring
**Confidence:** HIGH — all findings grounded in direct codebase inspection

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** All 5 chart sections live on the existing Member Dashboard page (`/member/dashboard`), extended below the current 4 KPI cards. No new page, no new nav entry.
- **D-02:** Time window selector (7d | 30d | 90d button group) sits at top of dashboard, above KPI cards. Changing window updates all KPI cards and all charts simultaneously.
- **D-03:** Time window switching is client-side — React state tracks the selected window (default: 30 days). On change, fetches from existing `DashboardController` API endpoints using `start_time`/`end_time` query params.
- **D-04:** No page reload on window switch. Charts update in-place from fetched JSON.
- **D-05:** SSR for initial render only — no pre-fetched chart data passed as Inertia props; charts start in loading state and fetch on mount.
- **D-06:** Model comparison table sorting is client-side. All model rows delivered in one fetch. Default sort: cost descending. Maximum 10 models (top 10 by cost, filtered at repository layer).
- **D-07:** Empty state: single informational Card when `usage_records` is empty for the selected window. KPI cards still render showing "—" or $0.00.
- **D-08:** MEMBER callers receive chart data scoped to their own API keys only. MANAGER and ADMIN callers receive org-wide chart data. Mirrors Phase 8 permission model.

### Claude's Discretion

- Chart color scheme: follow existing hardcoded HSL patterns. Token chart: blue = input tokens, orange = output tokens.
- Loading state between window switches: show subtle spinner or skeleton on chart area while fetch is in flight.
- API endpoint design for new chart services: follow existing `DashboardController` pattern (auth via `AuthMiddleware`, orgId from route param).

### Deferred Ideas (OUT OF SCOPE)

- Admin Dashboard chart replacement (sampleUsageData → real system-wide data): different data source, deferred.
- Period-over-period change badges on KPI cards: Phase 12 scope.
- PDF export / Download Report: Phase 12 scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASHBOARD-01 | KPI cards (Cost, Requests, Total Tokens, Avg Latency) with 7/30/90-day time window selector | `IUsageRepository.queryStatsByOrg` / `queryStatsByKey` already implemented. `DashboardKeyScopeResolver` handles role scoping. New `GetKpiSummaryService` (or extend existing GetDashboardSummaryService) wraps these calls with a `DateRange`. |
| DASHBOARD-02 | Cost over time area chart (AreaChart, by date, hover tooltip) | `IUsageRepository.queryDailyCostByOrg` returns `DailyCostBucket[]` with `date`, `totalCost`. `GetCostTrendsService` calls this method. New `CostTrendAreaChart` component wraps `AreaChart` from Recharts. |
| DASHBOARD-03 | Cost by model bar chart, top 10, sorted descending | `IUsageRepository.queryModelBreakdown` returns `ModelUsageBucket[]` already sorted by cost DESC. Repository enforces top-10 via `.limit(10)`. New `ModelCostBarChart` component. |
| DASHBOARD-04 | Token usage stacked area chart (input=blue, output=orange) | `queryDailyCostByOrg` returns `totalInputTokens` and `totalOutputTokens` per bucket — same call as DASHBOARD-02, shared endpoint. `TokenUsageAreaChart` uses stacked `AreaChart` with two `Area` layers. |
| DASHBOARD-05 | Model comparison table, clickable column headers for sort (Cost, Requests, Avg Latency) | `queryModelBreakdown` returns all needed fields. `ModelComparisonTable` component uses `useState` for sort column + direction. Uses existing `Table` / `TableHead` / `TableBody` UI primitives. |
</phase_requirements>

---

## Summary

Phase 10 wires five live-data dashboard features to the existing `IUsageRepository` infrastructure built in Phase 9. All backend query methods already exist (`queryDailyCostByOrg`, `queryModelBreakdown`, `queryStatsByOrg`, `queryStatsByKey`). Phase 10's main work is: (1) two new application services (`GetCostTrendsService`, `GetModelComparisonService`), (2) two new controller methods on `DashboardController`, (3) two new API routes, (4) four new React chart components, and (5) extending `Member/Dashboard/Index.tsx` with the time window selector and chart sections.

The frontend is entirely client-fetching — no Inertia SSR props for chart data. React `useState` manages the selected time window and triggers `fetch()` calls to the new API endpoints on mount and on window change. The `DashboardKeyScopeResolver` (already implemented) provides role-based key scoping transparently at the service layer.

The table primitive (`Table`, `TableHead`, `TableBody`, `TableCell`) is already available in `resources/js/components/ui/table.tsx`. The chart library (Recharts 3.8.1) is already installed. No new dependencies are required.

**Primary recommendation:** Follow the existing `UsageLineChart` / `CreditBarChart` component pattern exactly (Card wrapper + ResponsiveContainer h=300), add two thin application services, wire through DI provider, extend controller, add two routes. The implementation is additive — nothing existing needs modification except `DashboardController` (add methods), `DashboardServiceProvider` (register two new services), `dashboard.routes.ts` (add two routes), and `Member/Dashboard/Index.tsx` (extend page).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Recharts | 3.8.1 (already installed) | AreaChart, BarChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer | Already used by UsageLineChart and CreditBarChart; zero new dependencies required |
| React | (existing) | useState for time window and sort state, useEffect for fetch-on-mount | Established pattern throughout codebase |
| shadcn/ui Card | (existing) | Chart wrapper | All existing charts use Card > CardHeader > CardContent |
| shadcn/ui Table | (existing) | ModelComparisonTable | `table.tsx` exports Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption |
| shadcn/ui Button | (existing) | Time window selector button group | Button variants available (outline / default) |
| shadcn/ui Skeleton | (existing) | Loading state for chart areas | `skeleton.tsx` exports `Skeleton` with `animate-pulse` |

### Recharts Components Needed per Chart

| Chart | Recharts Primitives |
|-------|-------------------|
| CostTrendAreaChart (DASHBOARD-02) | AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer |
| ModelCostBarChart (DASHBOARD-03) | BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer |
| TokenUsageAreaChart (DASHBOARD-04) | AreaChart, Area (×2, stackId="tokens"), XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer |
| ModelComparisonTable (DASHBOARD-05) | No Recharts — uses HTML table via shadcn/ui Table primitives |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js, Victory, Nivo | All require new dependencies. Recharts is already installed and has two established usage patterns in the codebase. |
| Client-side fetch | Inertia SSR props | SSR would add complexity to page handler (time-window-aware rendering). Client fetch with loading state is simpler and already the decided approach (D-05). |

**No installation required** — all dependencies already present.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/Modules/Dashboard/
├── Application/
│   ├── DTOs/
│   │   └── AnalyticsDTO.ts                 # new: CostTrendResponse, ModelComparisonResponse, KpiSummaryResponse
│   └── Services/
│       ├── GetCostTrendsService.ts          # new: wraps IUsageRepository.queryDailyCostByOrg
│       └── GetModelComparisonService.ts     # new: wraps IUsageRepository.queryModelBreakdown + queryStatsByOrg
├── Presentation/
│   ├── Controllers/
│   │   └── DashboardController.ts          # extend: add costTrends(), modelComparison(), kpiSummary() methods
│   └── Routes/
│       └── dashboard.routes.ts             # extend: register two new GET routes
└── Infrastructure/
    └── Providers/
        └── DashboardServiceProvider.ts     # extend: register GetCostTrendsService, GetModelComparisonService

resources/js/
├── components/charts/
│   ├── CostTrendAreaChart.tsx              # new: AreaChart for DASHBOARD-02
│   ├── ModelCostBarChart.tsx               # new: BarChart for DASHBOARD-03
│   ├── TokenUsageAreaChart.tsx             # new: stacked AreaChart for DASHBOARD-04
│   └── ModelComparisonTable.tsx            # new: sortable table for DASHBOARD-05
└── Pages/Member/Dashboard/
    └── Index.tsx                           # extend: time window selector + 4 new chart sections
```

### Pattern 1: Application Service for Chart Data

**What:** New services (`GetCostTrendsService`, `GetModelComparisonService`) inject `IUsageRepository`, `IApiKeyRepository`, and `OrgAuthorizationHelper`. They follow the exact same constructor shape as `GetDashboardSummaryService`.

**When to use:** All new chart-data services.

**Example:**
```typescript
// src/Modules/Dashboard/Application/Services/GetCostTrendsService.ts
export class GetCostTrendsService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly usageRepository: IUsageRepository,
  ) {}

  async execute(params: {
    orgId: string
    callerUserId: string
    callerSystemRole: string
    startDate: string
    endDate: string
  }): Promise<CostTrendResponse> {
    const authResult = await this.orgAuth.requireOrgMembership(
      params.orgId, params.callerUserId, params.callerSystemRole,
    )
    if (!authResult.authorized) {
      return { success: false, message: 'Unauthorized', error: authResult.error ?? 'NOT_ORG_MEMBER' }
    }

    const range = { startDate: params.startDate, endDate: params.endDate }
    const buckets = await this.usageRepository.queryDailyCostByOrg(params.orgId, range)

    return { success: true, message: 'Query successful', data: { buckets } }
  }
}
```

**Key insight for MEMBER scoping:** `GetCostTrendsService` uses `queryDailyCostByOrg` which is scoped by `orgId`. For MEMBER callers, the data is already scoped at the service level — but the `orgId` used must be the org of the caller's own keys. The existing `DashboardKeyScopeResolver` pattern (used in `GetDashboardSummaryService` and `GetUsageChartService`) applies here too: resolve visible keys first, determine if we query by org or by individual key IDs. Because `IUsageRepository` only has `queryDailyCostByOrg` (not `queryDailyCostByKey`), MEMBER-scoped cost trends require either: (a) adding `queryDailyCostByKeys(apiKeyIds, range)` to `IUsageRepository`, or (b) calling `queryDailyCostByOrg` and relying on the fact that MEMBER's keys are a subset of the org — but this would not scope the data. **The correct approach is (a).**

### Pattern 2: Controller Method for Chart Endpoints

**What:** New methods on `DashboardController` follow the exact existing method shape: `AuthMiddleware.getAuthContext` → validate → parse query params → call service → `ctx.json(result)`.

**When to use:** All new chart API endpoints.

**Example:**
```typescript
// Addition to DashboardController.ts
async costTrends(ctx: IHttpContext): Promise<Response> {
  const auth = AuthMiddleware.getAuthContext(ctx)
  if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
  const orgId = ctx.getParam('orgId')
  if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)

  const startDate = ctx.getQuery('start_date') ?? defaultStartDate(30)
  const endDate = ctx.getQuery('end_date') ?? new Date().toISOString()

  const result = await this.costTrendsService.execute({
    orgId, callerUserId: auth.userId, callerSystemRole: auth.role, startDate, endDate,
  })
  return ctx.json(result)
}
```

### Pattern 3: Route Registration

**What:** New routes are registered alongside existing dashboard routes in `dashboard.routes.ts`. Same middleware chain (`requireAuth()` + `createModuleAccessMiddleware('dashboard')`).

**Example:**
```typescript
// Additions to registerDashboardRoutes
router.get('/api/organizations/:orgId/dashboard/cost-trends', moduleAuth, (ctx) => controller.costTrends(ctx))
router.get('/api/organizations/:orgId/dashboard/model-comparison', moduleAuth, (ctx) => controller.modelComparison(ctx))
```

Note: CONTEXT.md specifies "no new routes or route shape changes" as out-of-scope for the *existing* routes. New routes for new chart endpoints are within scope — they are additions, not modifications to existing route shapes.

### Pattern 4: React Chart Component

**What:** All chart components follow the `UsageLineChart` / `CreditBarChart` template exactly.

**When to use:** All four new chart components.

**CostTrendAreaChart example:**
```typescript
// resources/js/components/charts/CostTrendAreaChart.tsx
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface CostBucket {
  date: string
  totalCost: number
}

export function CostTrendAreaChart({ data, title = '成本趨勢' }: { data: CostBucket[]; title?: string }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip formatter={(value: number) => [`$${value.toFixed(4)}`, '成本']} />
            <Area
              type="monotone"
              dataKey="totalCost"
              name="成本"
              stroke="hsl(222.2 47.4% 11.2%)"
              fill="hsl(222.2 47.4% 11.2% / 0.1)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

**TokenUsageAreaChart (stacked):**
```typescript
// Two stacked Area layers — stackId must match
<Area type="monotone" dataKey="totalInputTokens" name="輸入 Tokens"
  stackId="tokens" stroke="hsl(217 91% 60%)" fill="hsl(217 91% 60% / 0.3)" dot={false} />
<Area type="monotone" dataKey="totalOutputTokens" name="輸出 Tokens"
  stackId="tokens" stroke="hsl(25 95% 53%)" fill="hsl(25 95% 53% / 0.3)" dot={false} />
```

### Pattern 5: Client-Side Time Window Fetch

**What:** `Member/Dashboard/Index.tsx` holds `selectedDays` state (default 30). `useEffect` runs on mount and when `selectedDays` changes. Fetches from new API endpoints with computed `start_date`/`end_date`. Sets loading + data states.

**Example:**
```typescript
const [selectedDays, setSelectedDays] = useState(30)
const [costTrends, setCostTrends] = useState<CostBucket[] | null>(null)
const [isLoading, setIsLoading] = useState(false)

useEffect(() => {
  if (!orgId) return
  setIsLoading(true)
  const endDate = new Date().toISOString()
  const startDate = new Date(Date.now() - selectedDays * 86_400_000).toISOString()
  const base = `/api/organizations/${orgId}/dashboard`

  Promise.all([
    fetch(`${base}/cost-trends?start_date=${startDate}&end_date=${endDate}`).then(r => r.json()),
    fetch(`${base}/model-comparison?start_date=${startDate}&end_date=${endDate}`).then(r => r.json()),
  ]).then(([trends, models]) => {
    setCostTrends(trends.data?.buckets ?? [])
    // ... set other states
  }).catch(() => {
    // set error state
  }).finally(() => setIsLoading(false))
}, [orgId, selectedDays])
```

**KPI cards also need a fetch** — the existing `DashboardController.summary` endpoint does not accept `start_date`/`end_date`. A new `kpiSummary` controller method (backed by `GetCostTrendsService` or a thin new service using `queryStatsByOrg`) is needed, or the existing `summary` endpoint needs a date range parameter added.

### Pattern 6: ModelComparisonTable with Client-Side Sort

**What:** `useState` tracks `sortKey: 'totalCost' | 'totalRequests' | 'avgLatencyMs'` and `sortDir: 'asc' | 'desc'`. Sort applied in render via `[...rows].sort(...)`. Column headers are clickable `<button>` elements.

**Example:**
```typescript
const [sortKey, setSortKey] = useState<keyof ModelRow>('totalCost')
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

const sorted = [...data].sort((a, b) => {
  const diff = a[sortKey] - b[sortKey]
  return sortDir === 'desc' ? -diff : diff
})

function handleSort(key: keyof ModelRow) {
  if (key === sortKey) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
  else { setSortKey(key); setSortDir('desc') }
}
```

### Anti-Patterns to Avoid

- **Passing raw `DailyCostBucket[]` from API response directly to chart without type-checking:** The API returns JSON; add a type guard or parse with Zod at the fetch boundary before passing to chart props.
- **Calling a separate API endpoint per chart section:** Each window-switch triggers one batch of fetches; do not fire four independent useEffect hooks with no coordination — combine into one effect that fetches cost trends (which covers both DASHBOARD-02 and DASHBOARD-04 data) and model comparison separately.
- **Using SSR props for chart data:** CONTEXT.md D-05 locks this. All chart data is client-fetched on mount.
- **Rendering AreaChart with zero-length data array:** Recharts renders a blank SVG, not an error. The empty state check must happen at the container level before rendering the chart component.
- **Using `stackId` mismatch in stacked AreaChart:** Both `Area` components must use the same `stackId` string for stacking to work. A different `stackId` renders them as overlapping areas, not stacked.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Bar / Area charts | Custom SVG chart rendering | Recharts (`BarChart`, `AreaChart`) | Recharts handles responsive sizing, tooltips, axis formatting, animation. Already installed. |
| Table component | Custom `<table>` with raw HTML | `Table`, `TableHead`, `TableBody`, `TableCell` from `@/components/ui/table` | Already built, styled consistently with the design system. |
| Loading skeleton | Custom CSS animation | `Skeleton` from `@/components/ui/skeleton` | `animate-pulse rounded-md bg-muted` already implemented. |
| Role-based key scoping | Custom permission check in new services | `DashboardKeyScopeResolver.resolveVisibleKeys()` | Already implements admin/manager/member three-way logic. Reuse exactly. |
| Date range math | Custom date arithmetic | `Date.now() - days * 86_400_000` with `.toISOString()` | Simple, no library needed. |
| Cost number formatting | Custom formatter | `formatCredit()` from `@/lib/format` | Already handles locale-aware 2-decimal formatting. |

**Key insight:** The backend query layer is complete. `DrizzleUsageRepository` fully implements all four query methods needed for all five requirements. Phase 10 is primarily a wiring and UI task.

---

## Critical Gap: MEMBER Scoping for queryDailyCostByOrg

**Issue:** `IUsageRepository` has `queryDailyCostByOrg(orgId, range)` but no `queryDailyCostByKeys(keyIds, range)`. For MEMBER callers (D-08), cost trend data must be scoped to their own keys. The current `queryDailyCostByOrg` returns all records for the org — which would expose other members' usage to a MEMBER-role caller.

**Resolution options:**
1. Add `queryDailyCostByKey(apiKeyId, range)` to `IUsageRepository` — called in a loop for each of the member's keys, then merged. (LOW complexity, but N queries.)
2. Add `queryDailyCostByKeys(apiKeyIds, range)` to `IUsageRepository` — single SQL query with `IN (...)`. (PREFERRED — one query, consistent with `queryStatsByKey` pattern.)

**Same issue applies to `queryModelBreakdown`** — it also takes `orgId` only.

The planner must include a task to add `queryDailyCostByKeys` and `queryModelBreakdownByKeys` (or equivalent `apiKeyIds`-scoped variants) to `IUsageRepository` and `DrizzleUsageRepository` before `GetCostTrendsService` and `GetModelComparisonService` can implement MEMBER scoping correctly.

---

## Common Pitfalls

### Pitfall 1: Area Chart Empty State — Recharts Renders Blank SVG Not Error

**What goes wrong:** When `data=[]` is passed to `AreaChart`, Recharts renders an empty SVG with axes but no line. Users see a chart container with axis labels and no data — looks broken, not "empty."

**Why it happens:** Recharts does not throw or show a message for empty data.

**How to avoid:** Before rendering the chart component, check `if (data.length === 0) return <EmptyState />`. The empty state Card (D-07) renders instead of the chart container.

**Warning signs:** `<CostTrendAreaChart data={[]} />` rendering an axis-only chart.

### Pitfall 2: Stacked Area Chart Requiring Same stackId

**What goes wrong:** Two `Area` components with different `stackId` values render as overlapping (not stacked) areas. The visual looks correct when values are small but becomes misleading when output tokens > input tokens.

**Why it happens:** Recharts uses `stackId` to group areas for stacking. Missing or mismatched values disable stacking silently.

**How to avoid:** Both Area components must use `stackId="tokens"` (or any matching string).

### Pitfall 3: KPI Cards Also Need Date Range Scoping

**What goes wrong:** The existing `DashboardController.summary` endpoint is called by the current Member Dashboard to show total keys, active keys, and total usage. It does NOT accept `start_date`/`end_date`. If Phase 10 reuses this endpoint for the new KPI cards (Cost, Requests, Total Tokens, Avg Latency), the values will always show all-time totals regardless of the selected time window.

**Why it happens:** The existing `summary` endpoint was built before time windows were a requirement. It calls `GetDashboardSummaryService` which calls `usageAggregator.getStats()` — no date range parameter.

**How to avoid:** Add a new `kpiSummary` controller method that accepts `start_date`/`end_date` and calls `IUsageRepository.queryStatsByOrg` (or `queryStatsByKey` for MEMBER) with the derived `DateRange`. This is a new endpoint, not a modification to the existing `summary` endpoint.

### Pitfall 4: MEMBER Scoping Gap in New Services

**What goes wrong:** `GetCostTrendsService` calls `queryDailyCostByOrg(orgId, range)` for all callers including MEMBERs. A MEMBER sees cost trend data from ALL org members' API keys.

**Why it happens:** `queryDailyCostByOrg` is org-scoped, not key-scoped. There is no equivalent `queryDailyCostByKeys` in the current `IUsageRepository` interface.

**How to avoid:** Add `queryDailyCostByKeys(apiKeyIds, range)` to `IUsageRepository` and `DrizzleUsageRepository`. Services resolve visible keys via `DashboardKeyScopeResolver`, then choose the correct query method based on whether the caller is MEMBER or MANAGER+.

### Pitfall 5: orgId Unavailability on Member Dashboard Page

**What goes wrong:** The client-side fetch calls `/api/organizations/:orgId/dashboard/cost-trends` — but the React component must know `orgId` to construct this URL. The current `Member/Dashboard/Index.tsx` receives `orgId?: string | null` as an Inertia prop. If `orgId` is null (not yet assigned), the fetch cannot proceed.

**Why it happens:** New org members may not have an `orgId` assigned in the session yet.

**How to avoid:** Guard all chart fetch calls with `if (!orgId) return`. Render an "org not configured" message instead of loading spinners when `orgId` is null. The existing page already does this for `keysQuery`.

### Pitfall 6: Recharts XAxis Date Label Formatting

**What goes wrong:** `queryDailyCostByOrg` returns `date` as `'2026-04-11'` (ISO date string). Recharts renders this as-is on the XAxis. For 30-day and 90-day windows, labels overlap and become unreadable.

**Why it happens:** Recharts XAxis renders every dataKey tick by default with no skipping or formatting.

**How to avoid:** Use `XAxis tickFormatter={(v) => v.slice(5)}` to show `MM-DD` only. For 90-day windows, use `interval="preserveStartEnd"` or set `interval={Math.ceil(data.length / 8)}` to limit visible ticks.

---

## Code Examples

### DI Registration for New Services

```typescript
// Additions to DashboardServiceProvider.ts register()
container.bind('getCostTrendsService', (c: IContainer) => {
  return new GetCostTrendsService(
    c.make('apiKeyRepository') as IApiKeyRepository,
    c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    c.make('drizzleUsageRepository') as IUsageRepository,
  )
})

container.bind('getModelComparisonService', (c: IContainer) => {
  return new GetModelComparisonService(
    c.make('apiKeyRepository') as IApiKeyRepository,
    c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    c.make('drizzleUsageRepository') as IUsageRepository,
  )
})
```

### Time Window Button Group

```typescript
// Time window selector — hardcoded HSL, follows existing button pattern
const WINDOWS = [7, 30, 90] as const
type Window = (typeof WINDOWS)[number]

function TimeWindowSelector({ selected, onChange }: { selected: Window; onChange: (w: Window) => void }) {
  return (
    <div className="flex gap-1">
      {WINDOWS.map((w) => (
        <Button
          key={w}
          variant={selected === w ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(w)}
        >
          {w}天
        </Button>
      ))}
    </div>
  )
}
```

### Empty State Card

```typescript
// Empty state — D-07
function ChartEmptyState() {
  return (
    <Card>
      <CardContent className="py-12 text-center text-muted-foreground">
        尚無使用資料。資料每 5 分鐘從 Bifrost 同步一次。完成第一次 API 呼叫後請返回查看。
      </CardContent>
    </Card>
  )
}
```

### ModelComparisonTable Sortable Header

```typescript
function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
}: {
  label: string
  sortKey: string
  currentSort: string
  currentDir: 'asc' | 'desc'
  onSort: (key: string) => void
}) {
  return (
    <TableHead>
      <button
        className="flex items-center gap-1 font-medium"
        onClick={() => onSort(sortKey)}
      >
        {label}
        {currentSort === sortKey && (currentDir === 'desc' ? ' ↓' : ' ↑')}
      </button>
    </TableHead>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Live Bifrost queries per page load | Cached `usage_records` via `IUsageRepository` | Phase 9 | Dashboard loads in <50ms from SQLite vs 500ms-5s from Bifrost |
| `Record<string, unknown>[]` for log returns | Typed `UsageLogDTO` | Phase 9 | Type safety across the data pipeline |
| Global org-level stats for all roles | `DashboardKeyScopeResolver` role-based scoping | Phase 8 | MEMBER sees only their own usage |

---

## Open Questions

1. **KPI cards for time-window — new endpoint or extend existing summary?**
   - What we know: Existing `summary` endpoint has no date range. `IUsageRepository.queryStatsByOrg` accepts `DateRange`.
   - What's unclear: Whether to add a new `/dashboard/kpi` endpoint or extend `summary` with optional date params.
   - Recommendation: Add a new `kpiSummary` controller method and `/dashboard/kpi` endpoint. Keeps existing `summary` behavior unchanged and avoids breaking any existing callers.

2. **MEMBER scoping for `queryDailyCostByOrg` — add `queryDailyCostByKeys` or aggregate in-memory?**
   - What we know: Current interface lacks a key-set-scoped daily cost query. SQL `WHERE api_key_id IN (...)` is easy to add.
   - Recommendation: Add `queryDailyCostByKeys(apiKeyIds: readonly string[], range: DateRange)` to `IUsageRepository` port and `DrizzleUsageRepository`. Same for `queryModelBreakdownByKeys`. This is a clean extension with no breaking changes.

3. **`queryModelBreakdown` top-10 limit — enforce at repository or service?**
   - What we know: CONTEXT.md D-06 says "Maximum 10 models shown (top 10 by cost, filtered at the repository layer)." Current `DrizzleUsageRepository.queryModelBreakdown` does NOT have `.limit(10)` — it returns all models ordered by cost DESC.
   - Recommendation: Add `.limit(10)` to `DrizzleUsageRepository.queryModelBreakdown`. This is a one-line fix required before Phase 10 services can comply with D-06.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 10 is purely code additions. All runtime dependencies (Bun, SQLite, Recharts, React) were verified available and operational in earlier phases. No new external tools, services, or CLIs are required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun test (built-in) + Vitest 4.0.18 |
| Config file | No standalone vitest.config.ts — test runner is `bun test` |
| Quick run command | `bun test src/Modules/Dashboard` |
| Full suite command | `bun test src tests/Unit packages` |

Note: The project uses `bun test` (Bun's native test runner compatible with Vitest API) for all backend tests. Frontend components are not unit-tested via this pipeline (no jsdom setup detected). Integration tests for React components would require Playwright (already configured as `test:e2e`).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASHBOARD-01 | KPI service returns correct aggregates for date range, scoped by role | unit | `bun test src/Modules/Dashboard --filter GetKpiSummaryService` | ❌ Wave 0 |
| DASHBOARD-02 | `GetCostTrendsService` returns daily cost buckets for org, respects date range | unit | `bun test src/Modules/Dashboard --filter GetCostTrendsService` | ❌ Wave 0 |
| DASHBOARD-03 | `GetModelComparisonService` returns top-10 models sorted by cost DESC | unit | `bun test src/Modules/Dashboard --filter GetModelComparisonService` | ❌ Wave 0 |
| DASHBOARD-04 | `CostTrendResponse` includes `totalInputTokens` and `totalOutputTokens` per bucket (same service as DASHBOARD-02) | unit | `bun test src/Modules/Dashboard --filter GetCostTrendsService` | ❌ Wave 0 (same file as DASHBOARD-02 test) |
| DASHBOARD-05 | Model comparison data includes `avgLatencyMs`, scoped by role | unit | `bun test src/Modules/Dashboard --filter GetModelComparisonService` | ❌ Wave 0 (same file as DASHBOARD-03 test) |
| DASHBOARD-01 | MEMBER caller sees only own-key KPI data (not org-wide) | unit | `bun test src/Modules/Dashboard --filter GetKpiSummaryService` | ❌ Wave 0 |
| DASHBOARD-03 | Repository enforces top-10 limit | unit | `bun test src/Modules/Dashboard --filter DrizzleUsageRepository` | ✅ (extend existing file) |

### Sampling Rate

- **Per task commit:** `bun test src/Modules/Dashboard`
- **Per wave merge:** `bun test src tests/Unit packages`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/Modules/Dashboard/__tests__/GetCostTrendsService.test.ts` — covers DASHBOARD-02, DASHBOARD-04
- [ ] `src/Modules/Dashboard/__tests__/GetModelComparisonService.test.ts` — covers DASHBOARD-03, DASHBOARD-05
- [ ] `src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` — covers DASHBOARD-01 (time-window KPI fetch with role scoping)
- [ ] Extend `DrizzleUsageRepository.test.ts` — add test asserting `queryModelBreakdown` returns at most 10 results

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection: `src/Modules/Dashboard/Application/Ports/IUsageRepository.ts` — all query method signatures verified
- Direct codebase inspection: `src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts` — all four query implementations verified
- Direct codebase inspection: `resources/js/components/charts/UsageLineChart.tsx` — chart component pattern (Card + ResponsiveContainer h=300)
- Direct codebase inspection: `resources/js/components/charts/CreditBarChart.tsx` — BarChart pattern with HSL colors
- Direct codebase inspection: `resources/js/Pages/Member/Dashboard/Index.tsx` — current page structure, existing 4 StatCards, orgId prop
- Direct codebase inspection: `src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts` — controller method pattern
- Direct codebase inspection: `src/Modules/Dashboard/Presentation/Routes/dashboard.routes.ts` — route registration pattern
- Direct codebase inspection: `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts` — DI registration pattern
- Direct codebase inspection: `src/Modules/Dashboard/Application/Services/DashboardKeyScopeResolver.ts` — role-scoping logic
- Direct codebase inspection: `resources/js/components/ui/table.tsx` — Table primitive components
- Direct codebase inspection: `resources/js/components/ui/skeleton.tsx` — Skeleton component
- Direct codebase inspection: `resources/js/lib/format.ts` — formatCredit, formatNumber utilities
- Direct codebase inspection: `package.json` — recharts ^3.8.1 confirmed installed, bun test command confirmed
- `.planning/phases/10-p1-chart-ui/10-CONTEXT.md` — locked decisions D-01 through D-08
- `.planning/research/ARCHITECTURE.md` — cached aggregation architecture, component responsibilities
- `.planning/research/PITFALLS.md` — permission leaks, empty state handling, performance cliffs

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` — full acceptance criteria for DASHBOARD-01 through DASHBOARD-05 (project document)

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries verified installed in package.json; all UI primitives verified in resources/js/components/ui/
- Architecture: HIGH — service patterns verified by reading existing service implementations; DI pattern verified by reading DashboardServiceProvider
- Pitfalls: HIGH — derived from direct codebase gaps (missing `queryDailyCostByKeys`, missing `.limit(10)` on `queryModelBreakdown`, orgId-null guard)
- Frontend patterns: HIGH — derived from existing chart component files read directly

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable stack; recharts API unlikely to change within 30 days)
