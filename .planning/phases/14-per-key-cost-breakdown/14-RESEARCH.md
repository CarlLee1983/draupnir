# Phase 14: Per-Key Cost Breakdown - Research

**Researched:** 2026-04-12
**Domain:** Dashboard Analytics — per-API-key cost attribution, Recharts donut chart, Drizzle GROUP BY queries
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Page Placement & Navigation**
- D-01: New dedicated page at `/member/cost-breakdown` with its own sidebar nav entry ("Cost Breakdown"). Keeps main dashboard focused on KPIs/trends.
- D-02: Own independent 7d/30d/90d time window selector on the Cost Breakdown page (not shared with dashboard state).
- D-03: Includes a "Download Report" button using the same `window.print()` + `@media print` pattern from Phase 12.

**Per-Key Cost Table (COST-01, COST-02)**
- D-04: Full metrics table with columns: Key Name | Cost | Requests | Tokens | $/Request | Tokens/Request | % of Total. All columns sortable (client-side).
- D-05: Default sort: cost descending (highest spending keys first). Matches Phase 10 model comparison table pattern.
- D-06: Summary/totals row at bottom showing org-wide totals: Total Cost, Total Requests, Total Tokens, weighted avg $/Req, weighted avg Tok/Req, 100%.
- D-07: Expandable rows — clicking a key row expands to show per-model breakdown for that specific key (which models the key used and their cost split). Answers "why is this key expensive?" directly.
- D-08: Expanded row data fetched lazily on expand (not eager). Shows brief loading spinner in expanded area. Keeps initial page load fast.

**Model Distribution Visualization (COST-03, COST-04)**
- D-09: Donut chart (Recharts PieChart with innerRadius) showing per-model cost distribution. Total cost displayed in the center.
- D-10: Chart + table side by side layout — donut chart on left, model breakdown table on right. Table shows: Model | Cost | Requests | % Share.
- D-11: Top 8 models displayed individually; remaining models grouped into "Other" segment. Keeps the donut readable.

**Data Scoping & Filtering**
- D-12: Same page, filtered data for all roles — MEMBER sees only their own keys (consistent with Phase 10 D-08 role scoping). ADMIN/MANAGER see org-wide data.
- D-13: Time window only — no additional filters (model filter, key filter) for v1.3. Expandable rows serve as the drill-down mechanism.
- D-14: New bulk query method `queryPerKeyCost(orgId, range)` added to IUsageRepository — single SQL query groups by api_key_id. Avoids N+1 queries.
- D-15: Expandable row model breakdown uses existing `queryModelBreakdownByKeys` with a single key ID, fetched lazily on row expand.

### Claude's Discretion
- New Inertia page component structure and layout for Cost Breakdown
- Backend service design (GetPerKeyCostService, etc.) and DTO shapes
- Donut chart color palette (follow existing Recharts color patterns)
- Print CSS specifics for the Cost Breakdown page
- Empty state design when no usage data exists for selected window
- Nav icon choice (PieChart or DollarSign from Lucide)

### Deferred Ideas (OUT OF SCOPE)
- Model filter dropdown (filter per-key table to specific model) — v2
- Key filter for model distribution (filter donut to specific key's models) — v2
- Custom date range picker (arbitrary start/end) — v2
- Shared time window state between dashboard and cost breakdown — considered, rejected for simplicity
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COST-01 | User can view per-key cost breakdown for a given time period | `queryPerKeyCost` bulk GROUP BY query; per-key cost table with 7 columns; time window selector |
| COST-02 | User can view per-key token usage efficiency metrics | $/Request and Tokens/Request computed at service layer from totalCost/totalRequests/totalTokens |
| COST-03 | User can view per-model cost distribution across the organization | Recharts PieChart (donut) top-8 + "Other" grouping; uses existing `queryModelBreakdown` / `queryModelBreakdownByKeys` |
| COST-04 | User can view per-model aggregation with usage percentage | Model breakdown table with % Share column computed from totalCost / grandTotal × 100 |
</phase_requirements>

---

## Summary

Phase 14 adds a dedicated Cost Breakdown page at `/member/cost-breakdown`. It is a pure addition to the existing Dashboard module — no new modules, no schema migrations, no new dependencies. All charting (Recharts), table UI (shadcn/ui Table components), and data infrastructure (DrizzleUsageRepository, DashboardKeyScopeResolver, GetModelComparisonService pattern) already exist.

The backend work consists of three focused additions: (1) a new `queryPerKeyCost` method in `IUsageRepository` / `DrizzleUsageRepository` (GROUP BY `api_key_id`), (2) a new `GetPerKeyCostService` application service following the exact `GetModelComparisonService` pattern, and (3) two new controller methods + route entries in the existing `DashboardController` / `dashboard.routes.ts`. The frontend work consists of a new Inertia page file (`resources/js/Pages/Member/CostBreakdown/Index.tsx`) with three components: a per-key sortable/expandable table, a donut chart, and a side-by-side model distribution table. Navigation wiring requires additions to `MemberLayout`, `memberPageKeys.ts`, `registerMemberPageBindings.ts`, and `registerMemberPageRoutes.ts`.

**Primary recommendation:** Follow the `GetModelComparisonService` pattern exactly for the backend; follow `ModelComparisonTable` + `Index.tsx` patterns for the frontend. The only genuinely new pattern is expandable table rows (React local `useState` per row) and the Recharts `PieChart` with `innerRadius` (donut). Both are straightforward with the existing stack.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.1 | PieChart donut chart | Already installed; ModelCostBarChart uses it |
| @radix-ui/* | various | Headless UI primitives | Already installed; Card, Table, Button in use |
| lucide-react | 1.8.0 | Nav icons | Already installed; all icons sourced here |
| drizzle-orm | 0.45.1 | SQL GROUP BY queries | Already the ORM; DrizzleUsageRepository pattern |
| @inertiajs/react | 3.0.3 | Page rendering bridge | All member pages use Inertia |

### No new dependencies required

Phase 14 uses zero new npm packages. All required pieces exist in the installed stack. `PieChart` and `Cell` are exported from `recharts` 3.8.1 already.

---

## Architecture Patterns

### Recommended File Structure

New files to create:

```
src/Modules/Dashboard/
├── Application/
│   ├── Ports/
│   │   └── IUsageRepository.ts          (MODIFIED — add queryPerKeyCost)
│   ├── DTOs/
│   │   └── DashboardDTO.ts              (MODIFIED — add PerKeyCostResponse, PerKeyCostRow)
│   └── Services/
│       └── GetPerKeyCostService.ts       (NEW)
├── Infrastructure/
│   └── Repositories/
│       └── DrizzleUsageRepository.ts    (MODIFIED — implement queryPerKeyCost)
├── Presentation/
│   ├── Controllers/
│   │   └── DashboardController.ts       (MODIFIED — add perKeyCost + modelDistribution methods)
│   └── Routes/
│       └── dashboard.routes.ts          (MODIFIED — add 2 new GET routes)
└── Infrastructure/
    └── Providers/
        └── DashboardServiceProvider.ts  (MODIFIED — register GetPerKeyCostService)

src/Pages/
├── routing/member/
│   ├── memberPageKeys.ts               (MODIFIED — add costBreakdown key)
│   └── registerMemberPageBindings.ts   (MODIFIED — bind MemberCostBreakdownPage)
├── registerMemberPageRoutes.ts         (MODIFIED — add /member/cost-breakdown route)
└── Member/
    └── MemberCostBreakdownPage.ts      (NEW — Inertia page handler)

resources/js/
├── layouts/
│   └── MemberLayout.tsx               (MODIFIED — add nav entry)
├── Pages/Member/CostBreakdown/
│   └── Index.tsx                      (NEW — main page component)
└── components/charts/
    ├── PerKeyCostTable.tsx             (NEW — sortable+expandable table)
    └── ModelDistributionDonut.tsx      (NEW — PieChart + side table)
```

### Pattern 1: New IUsageRepository Method

Add `PerKeyCostBucket` interface and `queryPerKeyCost` to the port. The bucket must include all columns needed for COST-01 and COST-02 efficiency metrics — the repository computes cost-per-token and tokens-per-request would be computed at the service/frontend layer from raw totals.

```typescript
// Source: IUsageRepository.ts (verified from codebase)
export interface PerKeyCostBucket {
  readonly apiKeyId: string
  readonly totalCost: number
  readonly totalRequests: number
  readonly totalTokens: number
}

export interface IUsageRepository {
  // ... existing methods ...
  queryPerKeyCost(orgId: string, range: DateRange): Promise<readonly PerKeyCostBucket[]>
  queryPerKeyCostByKeys(
    apiKeyIds: readonly string[],
    range: DateRange,
  ): Promise<readonly PerKeyCostBucket[]>
}
```

Note: Two variants are needed — org-wide (admin/manager) and key-scoped (member). This matches the `queryModelBreakdown` / `queryModelBreakdownByKeys` split.

### Pattern 2: DrizzleUsageRepository Implementation

GROUP BY `api_key_id`, aggregate cost/requests/tokens. No `LIMIT` clause — all keys are returned (unlike model comparison which limits to 10). The `% of Total` column is computed at the service layer, not in SQL.

```typescript
// Source: DrizzleUsageRepository.ts pattern (verified from codebase)
private async queryPerKeyCostInternal(condition: any): Promise<readonly PerKeyCostBucket[]> {
  const db = getDrizzleInstance()
  const rows = await db
    .select({
      apiKeyId: usageRecords.api_key_id,
      totalCost: sql<number>`SUM(CAST(${usageRecords.credit_cost} AS REAL))`,
      totalRequests: sql<number>`COUNT(*)`,
      totalTokens: sql<number>`SUM(${usageRecords.input_tokens} + ${usageRecords.output_tokens})`,
    })
    .from(usageRecords)
    .where(condition)
    .groupBy(usageRecords.api_key_id)
    .orderBy(desc(sql`SUM(CAST(${usageRecords.credit_cost} AS REAL))`))

  return rows.map((row) => ({
    apiKeyId: String(row.apiKeyId),
    totalCost: Number(row.totalCost ?? 0),
    totalRequests: Number(row.totalRequests ?? 0),
    totalTokens: Number(row.totalTokens ?? 0),
  }))
}
```

### Pattern 3: GetPerKeyCostService

Follows `GetModelComparisonService` exactly — same three constructor injections, same `DashboardKeyScopeResolver` for role scoping, same `resolveDateRange` helper. Only the repository call and DTO shape differ.

The service also resolves key labels: it must join the raw `apiKeyId` UUIDs with API key metadata (label/name) from `IApiKeyRepository`. This is a critical detail — the frontend table shows "Key Name" not UUID.

```typescript
// Resolved from codebase: apiKeyRepository.findByOrgId returns ApiKey[] with .id and .label
const keys = await this.apiKeyRepository.findByOrgId(query.orgId)
const keyMap = new Map(keys.map(k => [k.id, k.label]))
// ... resolve visible keys, query usage, merge label into response rows
```

### Pattern 4: New Controller Methods

Add `perKeyCost` and `modelDistribution` methods to `DashboardController`. The `modelDistribution` method reuses the existing `GetModelComparisonService` — no new service needed. It simply calls the same service that already powers the model comparison on the main dashboard.

```typescript
// DashboardController.ts pattern (verified from codebase)
async perKeyCost(ctx: IHttpContext): Promise<Response> {
  const auth = AuthMiddleware.getAuthContext(ctx)
  if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
  const orgId = ctx.getParam('orgId')
  if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
  const result = await this.perKeyCostService.execute({
    orgId,
    callerUserId: auth.userId,
    callerSystemRole: auth.role,
    startTime: ctx.getQuery('start_time') ?? undefined,
    endTime: ctx.getQuery('end_time') ?? undefined,
  })
  return ctx.json(result)
}
```

### Pattern 5: New API Routes

Extend `registerDashboardRoutes` with two new GET endpoints:

```
GET /api/organizations/:orgId/dashboard/per-key-cost
GET /api/organizations/:orgId/dashboard/model-distribution
```

Note: `model-distribution` can reuse the existing `model-comparison` endpoint if the data shape is identical. Evaluate during planning — if reuse is clean, avoid adding a second route.

### Pattern 6: Inertia Page Handler

`MemberCostBreakdownPage.ts` follows `MemberDashboardPage.ts` — uses `requireMember`, resolves `orgId` from query string, renders `Member/CostBreakdown/Index` with minimal server props (just `orgId`). All analytics data is fetched client-side via `useEffect` + `fetch`.

### Pattern 7: Navigation Wiring (4 files)

Following the established member page registration pattern:

1. `memberPageKeys.ts` — add `costBreakdown: 'page.member.costBreakdown'`
2. `registerMemberPageBindings.ts` — add `container.singleton(k.costBreakdown, ...)`
3. `registerMemberPageRoutes.ts` — add `{ method: 'get', path: '/member/cost-breakdown', page: MEMBER_PAGE_KEYS.costBreakdown, action: 'handle', name: 'pages.member.costBreakdown' }`
4. `MemberLayout.tsx` — add nav item `{ label: '成本分析', href: '/member/cost-breakdown', icon: <PieChart/> }`

### Pattern 8: Recharts PieChart (Donut)

`PieChart` with a `Pie` child using `innerRadius` creates the donut. `Cell` provides per-segment colors. Center label is a custom SVG element using Recharts `label` prop or a positioned `div` overlay. The `Tooltip` follows the same custom component pattern as `ModelCostTooltip`.

```typescript
// Source: Recharts 3.x API — verified via package.json version 3.8.1
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a855f7', '#ec4899', '#14b8a6', '#f97316']

<ResponsiveContainer width="100%" height={300}>
  <PieChart>
    <Pie
      data={chartData}
      cx="50%"
      cy="50%"
      innerRadius={70}
      outerRadius={110}
      dataKey="value"
    >
      {chartData.map((entry, index) => (
        <Cell key={entry.model} fill={COLORS[index % COLORS.length]} />
      ))}
    </Pie>
    <Tooltip content={<DonutTooltip />} />
  </PieChart>
</ResponsiveContainer>
```

### Pattern 9: Expandable Table Rows

React `useState` per-row expansion state (a `Set<string>` of expanded key IDs). On row click, toggle the key ID in the set. Expanded area renders below the row, shows a loading spinner while lazy-fetching from the per-key model breakdown endpoint.

```typescript
// No Radix/external dependency needed — pure React state
const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
const [expandedData, setExpandedData] = useState<Record<string, readonly ModelUsageBucket[]>>({})
const [expandedLoading, setExpandedLoading] = useState<ReadonlySet<string>>(new Set())

function toggleRow(keyId: string): void {
  setExpanded(prev => {
    const next = new Set(prev)
    if (next.has(keyId)) { next.delete(keyId) } else { next.add(keyId) }
    return next
  })
  // Lazy fetch on first expand
  if (!expandedData[keyId]) {
    void fetchModelBreakdown(keyId)
  }
}
```

The lazy fetch calls the existing `model-comparison` endpoint filtered to a single key's date range. Since `queryModelBreakdownByKeys` accepts an array, passing `[keyId]` works exactly as needed (D-15).

### Anti-Patterns to Avoid

- **Eager-loading all expanded data on page load:** D-08 requires lazy fetch on expand only.
- **Building a new model-distribution service:** Reuse `GetModelComparisonService` — it already handles role scoping and both query variants.
- **Computing % of Total in SQL:** Compute it at service layer or frontend — SQLite window functions are not available in Drizzle's libsql-client.
- **Putting efficiency metrics ($/Request, Tokens/Request) in the DB query:** These are derived fields — compute them from `totalCost / totalRequests` and `totalTokens / totalRequests` in the service or frontend.
- **Adding a `LIMIT` to `queryPerKeyCost`:** Unlike model comparison (top 10), the per-key table should show ALL keys for the org/member scope. Users need visibility into every key.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Donut chart | Custom SVG pie math | Recharts `PieChart` with `innerRadius` | Already installed; handles animation, tooltip, responsive |
| Sortable table | Custom sort logic from scratch | Copy `ModelComparisonTable` sort pattern | Established pattern; `useState` + array sort |
| Role-scoped key filtering | New authorization logic | `DashboardKeyScopeResolver.resolveVisibleKeys` | Already handles admin/manager/member scoping |
| Key label resolution | DB join in SQL | `apiKeyRepository.findByOrgId` + `Map` in service | Cleaner; matches existing service patterns |
| Print report | Custom PDF generation | `window.print()` + `@media print` CSS | Phase 12 pattern; already working |
| Expandable row state | External library | `useState<Set<string>>` | Sufficient; no dependency needed |

---

## Common Pitfalls

### Pitfall 1: Missing `api_key_id` Index on `usage_records`

**What goes wrong:** The `queryPerKeyCost` query groups by `api_key_id`, but `usage_records` only has indexes on `org_id` and `bifrost_log_id` (verified in schema.ts). For large datasets, GROUP BY on an unindexed column can be slow.

**Why it happens:** The index was not added in prior phases because existing queries use `org_id` or `inArray(api_key_id, [...])` with small arrays.

**How to avoid:** The GROUP BY query always filters by `org_id` first (which is indexed), so SQLite will use the `idx_usage_records_org_id` index to reduce the row set before grouping. For v1.3 dataset sizes, this is acceptable. A composite index `(org_id, api_key_id)` would be a future optimization, not required now.

**Warning signs:** Slow query response when an org has tens of thousands of usage_records rows.

### Pitfall 2: Key Label Resolution — N+1 Risk

**What goes wrong:** Fetching `apiKeyRepository.findByOrgId(orgId)` inside `GetPerKeyCostService` is one query. The cost query is a second query. This is acceptable (2 queries total for the service). Do NOT loop over each bucket and call `apiKeyRepository.findById` per key — that would be N+1.

**Why it happens:** Developers unfamiliar with the repository pattern may call per-key lookups inside a loop.

**How to avoid:** Call `findByOrgId` once, build a `Map<id, label>`, then resolve labels in a single `.map()` over the buckets.

### Pitfall 3: `% of Total` Off-By-One for Member Scope

**What goes wrong:** A MEMBER user sees only their own keys. If `% of Total` is computed as `keyCost / allOrgCost`, it will exceed 100% or show misleading numbers when the member's keys are a subset.

**Why it happens:** Using org-wide total as the denominator when only a subset of keys is visible.

**How to avoid:** Compute `grandTotal` as the sum of costs of the VISIBLE keys, not from a separate org-wide query. The totals row (D-06) shows the sum of visible keys, and `%` is relative to that sum.

### Pitfall 4: Donut "Other" Grouping Edge Cases

**What goes wrong:** If there are exactly 8 models, the "Other" segment would be empty (0 cost, 0%). Rendering a zero-cost segment causes the donut to show a phantom slice or tooltip glitch.

**Why it happens:** Blind application of top-8 + "Other" rule without checking if "Other" has data.

**How to avoid:** Only add the "Other" segment if `models.length > 8` AND the remaining models have `totalCost > 0`.

### Pitfall 5: Inertia Page Registration — Missing from One of Four Files

**What goes wrong:** Adding the nav link but forgetting to add the route, or adding the binding but forgetting the page key constant. The page 404s in production because one of the four required wiring files was missed.

**Why it happens:** The four-file wiring pattern (`memberPageKeys`, `registerMemberPageBindings`, `registerMemberPageRoutes`, `MemberLayout`) is easy to miss one.

**How to avoid:** Treat the four files as an atomic checklist. All four must be updated in the same plan task.

### Pitfall 6: `DashboardController` Constructor Arity

**What goes wrong:** Adding a new service to `DashboardController` but not updating the wiring in `src/wiring/` where the controller is instantiated.

**Why it happens:** The controller is constructed with positional arguments in the registration function.

**How to avoid:** Search for `DashboardController` instantiation in `src/wiring/` or `registerDashboard` function. Update the constructor call to pass the new service.

---

## Code Examples

### `queryPerKeyCost` — Drizzle SQL Pattern

```typescript
// Source: DrizzleUsageRepository.ts (verified existing patterns)
async queryPerKeyCost(orgId: string, range: DateRange): Promise<readonly PerKeyCostBucket[]> {
  return this.queryPerKeyCostInternal(
    and(
      eq(usageRecords.org_id, orgId),
      gte(usageRecords.occurred_at, range.startDate),
      lte(usageRecords.occurred_at, range.endDate),
    ),
  )
}

async queryPerKeyCostByKeys(
  apiKeyIds: readonly string[],
  range: DateRange,
): Promise<readonly PerKeyCostBucket[]> {
  if (apiKeyIds.length === 0) return []
  return this.queryPerKeyCostInternal(
    and(
      inArray(usageRecords.api_key_id, [...apiKeyIds]),
      gte(usageRecords.occurred_at, range.startDate),
      lte(usageRecords.occurred_at, range.endDate),
    ),
  )
}
```

### PerKeyCostResponse DTO Shape

```typescript
// Source: DashboardDTO.ts pattern (verified)
export interface PerKeyCostRow {
  readonly apiKeyId: string
  readonly keyName: string           // resolved from apiKeyRepository
  readonly totalCost: number
  readonly totalRequests: number
  readonly totalTokens: number
  readonly costPerRequest: number    // totalCost / totalRequests (0 if no requests)
  readonly tokensPerRequest: number  // totalTokens / totalRequests (0 if no requests)
  readonly percentOfTotal: number    // keyCost / grandTotal * 100
}

export interface PerKeyCostResponse {
  success: boolean
  message: string
  data?: {
    rows: readonly PerKeyCostRow[]
    grandTotal: {
      totalCost: number
      totalRequests: number
      totalTokens: number
    }
  }
  error?: string
}
```

### MemberLayout Nav Addition

```typescript
// Source: MemberLayout.tsx (verified)
import { LayoutDashboard, Key, BarChart3, FileText, Settings, PieChart } from 'lucide-react'

const memberNavItems: NavItem[] = [
  { label: '總覽', href: '/member/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'API Keys', href: '/member/api-keys', icon: <Key className="h-4 w-4" /> },
  { label: '用量', href: '/member/usage', icon: <BarChart3 className="h-4 w-4" /> },
  { label: '成本分析', href: '/member/cost-breakdown', icon: <PieChart className="h-4 w-4" /> },
  { label: '合約', href: '/member/contracts', icon: <FileText className="h-4 w-4" /> },
  { label: '設定', href: '/member/settings', icon: <Settings className="h-4 w-4" /> },
]
```

### Time Window Selector (copy from Index.tsx)

```typescript
// Source: resources/js/Pages/Member/Dashboard/Index.tsx (verified — copy verbatim)
type WindowOption = 7 | 30 | 90

const WINDOW_OPTIONS: readonly { value: WindowOption; label: string }[] = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
]

// WindowSelector component is also copy-pasteable from Dashboard/Index.tsx
```

### Print Button Pattern (from Phase 12)

```tsx
<Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
  Download Report
</Button>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Per-key stats from N Bifrost API calls | Single SQL GROUP BY on local `usage_records` | No rate limiting; instant response |
| Pie/donut charts built from scratch | Recharts `PieChart` with `innerRadius` | Animation, tooltip, responsive out of the box |
| Eager-load all expanded content | Lazy fetch on row expand (`AbortController`) | Fast initial page load |

---

## Environment Availability

Step 2.6: SKIPPED — Phase 14 is purely code additions within the existing stack. No external tools, services, or CLIs beyond what is already running (Bun, SQLite, Recharts, React).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 (unit/integration) + Bun test (native) |
| Config file | vitest.config.ts (inferred from existing tests using vitest imports) |
| Quick run command | `bun test src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` |
| Full suite command | `bun test src/Modules/Dashboard/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COST-01 | `GetPerKeyCostService` returns per-key rows with cost, requests, tokens | unit | `bun test src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` | ❌ Wave 0 |
| COST-01 | `DrizzleUsageRepository.queryPerKeyCost` returns grouped rows | integration | `bun test src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` | ✅ (extend existing) |
| COST-02 | `GetPerKeyCostService` computes `costPerRequest` and `tokensPerRequest` correctly | unit | `bun test src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` | ❌ Wave 0 |
| COST-02 | Zero-division guard when `totalRequests === 0` | unit | `bun test src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` | ❌ Wave 0 |
| COST-03 | Model distribution returns top-8 + "Other" grouping | unit | `bun test src/Modules/Dashboard/__tests__/GetModelComparisonService.test.ts` | ✅ (extend existing) |
| COST-04 | `percentOfTotal` sums to 100 across all rows | unit | `bun test src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `bun test src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts`
- **Per wave merge:** `bun test src/Modules/Dashboard/`
- **Phase gate:** Full Dashboard suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` — covers COST-01, COST-02, COST-04 (new file)
- [ ] Extend `src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` — add `queryPerKeyCost` test cases

*(Frontend component tests are not required per project conventions — no `*.test.tsx` files exist for existing chart components)*

---

## Open Questions

1. **`model-distribution` endpoint vs reusing `model-comparison`**
   - What we know: `GetModelComparisonService` already returns `ModelUsageBucket[]` grouped by model with cost/requests/latency. The Cost Breakdown page needs model distribution with `% Share`.
   - What's unclear: Whether to add a new endpoint or reuse `/dashboard/model-comparison` and compute `% Share` on the frontend.
   - Recommendation: Reuse the existing endpoint. `% Share` is a derived field computable from the array on the frontend. Avoids adding a new controller method, service registration, and route. Planner should decide.

2. **`DashboardController` constructor location**
   - What we know: The controller is instantiated somewhere in `src/wiring/`. The wiring file was not read during research.
   - What's unclear: Exact file path for controller instantiation (likely `src/wiring/index.ts` or a `registerDashboard.ts`).
   - Recommendation: The planner/implementer should search for `new DashboardController` to find the exact wiring file and update constructor args there.

---

## Sources

### Primary (HIGH confidence)

- Codebase direct reads — `IUsageRepository.ts`, `DrizzleUsageRepository.ts`, `DashboardController.ts`, `dashboard.routes.ts`, `DashboardServiceProvider.ts`, `GetModelComparisonService.ts`, `DashboardKeyScopeResolver.ts`, `MemberDashboardPage.ts`, `MemberLayout.tsx`, `registerMemberPageBindings.ts`, `registerMemberPageRoutes.ts`, `memberPageKeys.ts`, `schema.ts`
- Frontend reads — `Dashboard/Index.tsx`, `ModelComparisonTable.tsx`, `ModelCostBarChart.tsx`, `format.ts`, `ui/` component list
- `.planning/phases/14-per-key-cost-breakdown/14-CONTEXT.md` — locked decisions
- `.planning/codebase/CONVENTIONS.md`, `ARCHITECTURE.md`, `STACK.md` — verified patterns

### Secondary (MEDIUM confidence)

- Recharts 3.8.1 `PieChart` / `Cell` API — inferred from installed package version; donut chart pattern well-established in Recharts ecosystem

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified as installed in `package.json` (via STACK.md)
- Architecture: HIGH — patterns verified from reading actual source files in the codebase
- Pitfalls: HIGH — derived from reading existing code and identifying gaps (missing index, N+1 risk, scoping edge case)
- Recharts PieChart donut: MEDIUM — API inferred from version 3.8.1; exact props verified to be stable across Recharts 2.x+

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable stack; no fast-moving dependencies)
