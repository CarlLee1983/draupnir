# Phase 12: Differentiators - Research

**Researched:** 2026-04-12
**Domain:** TypeScript backend service extension + React KPI badge UI + browser print CSS
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Backend computes prior period, returns `{ usage: KpiUsage, previousPeriod: KpiUsage, lastSyncedAt: string | null }` from the KPI endpoint.
- **D-02:** Prior period mirrors the selected window exactly — not a calendar month. 30d window → prior 30d window shifted back.
- **D-03:** Frontend computes `%` change from raw values. Zero division → show `"—"`.
- **D-04:** Change badges appear on all four KPI cards: Cost, Requests, Total Tokens, Avg Latency.
- **D-05:** `MetricCard` gains `changePercent?: number` prop. Render existing `Badge` component below main value. Positive = green, negative = red, zero = neutral grey. Format: `+5.2%` / `-3.1%`.
- **D-06:** PDF output is current view as-is — `window.print()`, no separate print layout.
- **D-07:** `@media print` hides: nav sidebar, action buttons (Download Report included), Quick Actions card, Balance card. Staleness label is **kept**.
- **D-08:** No print-specific header section needed.
- **D-09:** "Download Report" button in header row, right side, alongside staleness label. `variant="outline"`. On click: `window.print()`.
- **D-10:** Download Report button is hidden in print (covered by D-07).

### Claude's Discretion

- `MetricCard` badge: omit entirely when `changePercent` is `undefined` (no empty space placeholder).
- Print CSS location: `<style>` tag inside `Index.tsx` OR a `print.css` imported at layout level — match existing asset pipeline pattern.
- Button variant for Download Report: `variant="outline"`.

### Deferred Ideas (OUT OF SCOPE)

- Per-key breakdown table (cost per API Key): v1.2.x follow-on.
- Error rate trend chart: v1.2.x separate phase.
- Custom date picker: v1.2.x separate phase.
- Puppeteer-based PDF for email delivery: v1.3 scope.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASHBOARD-06 | Monthly PDF report: `window.print()` trigger, KPI data included, at least one trend chart visible | Backend prior-period extension + frontend MetricCard badge + `@media print` CSS rules |

</phase_requirements>

---

## Summary

Phase 12 adds two differentiating features on top of the existing Dashboard: period-over-period change badges on KPI cards and a browser-based PDF download via `window.print()`.

The backend change is surgical: `GetKpiSummaryService.execute()` runs a second call with a shifted date range (prior window of equal duration) and appends the result as `previousPeriod: UsageStats` in the response `data`. The `DashboardDTO.ts` `KpiSummaryResponse` interface is widened to include this field. No new services, routes, or repositories are required.

The frontend changes are also contained to `Index.tsx`: `KpiPayload` gains `previousPeriod: KpiUsage`, `MetricCard` gains `changePercent?: number`, the header row gains a `Download Report` button, and a `<style>` block adds `@media print` rules that hide the sidebar, Quick Actions card, and Balance card.

**Primary recommendation:** All changes are co-located in two files — `GetKpiSummaryService.ts` (backend) and `Index.tsx` (frontend). Keep the plan scoped to exactly those two files plus the DTO.

---

## Standard Stack

### Core (already installed — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | ^4.0.18 | Unit tests for backend service | Already used in all Dashboard `__tests__/` files |
| Tailwind CSS | 3 | Utility classes including print: modifier | Already used throughout; native `print:hidden` support |
| class-variance-authority | ^0.7.1 | Badge variant logic | Already used by `badge.tsx` |
| Recharts | ^3.8.1 | Charts remain unchanged | Already rendered in Index.tsx |

### No New Dependencies

The project constraint "zero new dependencies" applies. Every requirement in this phase is achievable with:
- Existing `Badge` component (`resources/js/components/ui/badge.tsx`)
- Existing `Button` component (`resources/js/components/ui/button.tsx`)
- `window.print()` (browser native)
- Tailwind `print:hidden` utility class

**Installation:** none required.

---

## Architecture Patterns

### Recommended Change Surface

```
src/Modules/Dashboard/
├── Application/
│   ├── DTOs/DashboardDTO.ts         # KpiSummaryResponse — add previousPeriod field
│   └── Services/GetKpiSummaryService.ts  # compute prior window, run second query
└── __tests__/
    └── GetKpiSummaryService.test.ts      # extend existing tests

resources/js/Pages/Member/Dashboard/
└── Index.tsx                             # KpiPayload, MetricCard, header row, print CSS
```

### Pattern 1: Shifted Date Window (Prior Period Computation)

**What:** Compute `priorEnd = startTime` and `priorStart = startTime - windowDurationMs`. Run the same query path (org-wide or per-key scoped) for the prior range.

**When to use:** Exactly once per `execute()` call, after the current-period query succeeds.

**Example (backend):**
```typescript
// In GetKpiSummaryService.execute(), after resolving range:
const windowMs = new Date(range.endDate).getTime() - new Date(range.startDate).getTime()
const priorRange = {
  startDate: new Date(new Date(range.startDate).getTime() - windowMs).toISOString(),
  endDate: range.startDate,
}
// Then run the same org/key-scoped query for priorRange
```

**Key constraint:** The prior-period query MUST use the same role-scoping path (admin/manager → `queryStatsByOrg`, member → `queryStatsByKey` per visible key). Do not bypass the role-check by calling `queryStatsByOrg` for both periods when the caller is a member.

### Pattern 2: MetricCard Change Badge

**What:** Accept optional `changePercent?: number` prop; render a `Badge` below the value row when defined.

**When to use:** All four KPI card call sites in `Index.tsx`.

**Example (frontend):**
```tsx
// MetricCard extended signature
function MetricCard({
  title, value, suffix, icon, accentClassName, changePercent,
}: {
  title: string
  value: string
  suffix?: string
  icon: ReactNode
  accentClassName: string
  changePercent?: number
}) {
  const badge = changePercent !== undefined
    ? renderChangeBadge(changePercent)
    : null

  return (
    <Card className="relative overflow-hidden">
      {/* ... existing markup ... */}
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight">{value}</span>
          {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
        </div>
        {badge}
      </CardContent>
    </Card>
  )
}

function renderChangeBadge(changePercent: number): ReactNode {
  if (changePercent === 0) {
    return <Badge variant="secondary" className="mt-1 text-xs">0%</Badge>
  }
  const formatted = changePercent > 0
    ? `+${changePercent.toFixed(1)}%`
    : `${changePercent.toFixed(1)}%`
  return (
    <Badge
      variant={changePercent > 0 ? 'default' : 'destructive'}
      className={`mt-1 text-xs ${changePercent > 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : ''}`}
    >
      {formatted}
    </Badge>
  )
}
```

**Badge color map (using existing Badge variants + Tailwind overrides):**
- Positive: green — Tailwind `bg-emerald-100 text-emerald-800` override on `variant="outline"`
- Negative: red — `variant="destructive"`
- Zero: grey — `variant="secondary"`

### Pattern 3: Frontend % Change Computation

**What:** Derive `changePercent` from `usage` and `previousPeriod` values at the call site in the JSX section (not inside MetricCard).

**When to use:** In the `MetricCard` call sites, where `bundle` is available.

**Example:**
```tsx
function computeChange(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined  // renders "—" via absent prop
  return ((current - previous) / previous) * 100
}

// Usage:
<MetricCard
  title="成本"
  value={bundle ? formatCredit(bundle.kpi.usage.totalCost) : '—'}
  suffix="USD"
  icon={<CreditCard className="h-4 w-4" />}
  accentClassName="from-emerald-400 to-teal-500"
  changePercent={bundle
    ? computeChange(bundle.kpi.usage.totalCost, bundle.kpi.previousPeriod.totalCost)
    : undefined}
/>
```

### Pattern 4: Print CSS via Tailwind `print:hidden`

**What:** Tailwind 3 natively supports the `print:` variant. Add `print:hidden` to the relevant JSX elements, or write a `@media print` block.

**Recommendation:** Use Tailwind `print:hidden` directly on component JSX — this is the idiomatic pattern in this codebase and requires no additional CSS files.

**Elements to mark `print:hidden`:**

| Element | Location in Index.tsx | How to identify |
|---------|----------------------|-----------------|
| Sidebar | `AppShell.tsx` → `<Sidebar>` | Add `print:hidden` to `<aside>` in `Sidebar.tsx`, or wrap in a div in `AppShell.tsx` |
| TopBar | `AppShell.tsx` → `<TopBar>` | Add `print:hidden` to TopBar root element |
| Balance card | `Index.tsx` → `<BalanceCard>` | Wrap call site with `<div className="print:hidden">` |
| Quick Actions card | `Index.tsx` → `<QuickActionsCard>` | Wrap call site with `<div className="print:hidden">` |
| Download Report button | `Index.tsx` header row | Add `print:hidden` to the button element |

**Alternative:** Add a `<style>` JSX tag inside `Index.tsx` with `@media print` rules targeting class selectors. This is valid but less idiomatic given Tailwind is already the CSS strategy. Both approaches work; Tailwind utilities are preferred.

**CSS pipeline:** `resources/css/app.css` imports `@tailwind utilities`, which includes the `print:` variant. No vite config changes needed.

### Pattern 5: Download Report Button Placement

**What:** Insert a `<Button variant="outline" size="sm">` into the existing right-side flex group in the header row.

**Location:** Inside the `<div className="flex flex-col items-end gap-1">` at line ~140 of `Index.tsx`.

**Example:**
```tsx
<div className="flex flex-col items-end gap-1">
  <div className="flex items-center gap-2">
    <WindowSelector value={selectedWindow} onChange={setSelectedWindow} />
    <Button
      variant="outline"
      size="sm"
      className="print:hidden"
      onClick={() => window.print()}
    >
      Download Report
    </Button>
  </div>
  <StalenessLabel lastSyncedAt={bundle?.kpi.lastSyncedAt ?? null} isLoading={loading} />
</div>
```

Note: The CONTEXT.md D-09 shows `[staleness label]  [Download Report button]` on same line. Current structure has staleness below window selector. The button can go either inside the top row or beside the staleness label — both work. The planner should match the D-09 layout exactly: button right-aligned alongside the staleness label, not alongside the window selector.

### Anti-Patterns to Avoid

- **Role bypass in prior-period query:** Do not call `queryStatsByOrg` for the prior period when the caller is a member. The same `DashboardKeyScopeResolver.resolveVisibleKeys` + `queryStatsByKey` pattern must be reused.
- **Frontend computing prior-period date range:** Backend does the date arithmetic. Frontend just reads `bundle.kpi.previousPeriod`.
- **Badge when bundle is null:** When `bundle` is null (loading state or error), pass `changePercent={undefined}` — badge is simply absent.
- **Mutating UsageStats objects:** The `combineStats` helper returns a new object; prior-period stats must also go through `combineStats` immutably.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Change badge styling | Custom CSS badge component | Existing `Badge` from `badge.tsx` + Tailwind colour overrides | Already imported at line 6 of Index.tsx |
| PDF generation | puppeteer / jsPDF | `window.print()` | Decision locked (D-06); PDF libraries are v1.3 scope |
| Print layout detection | Custom JS print hook | `@media print` CSS / Tailwind `print:hidden` | Browser handles this natively; no JS needed |
| Prior period date math | External date library | Inline arithmetic: `startTime - windowMs` | windowMs is computable from the existing ISO strings |

**Key insight:** This phase is intentionally zero-new-dependencies. Every building block already exists. The challenge is correct wiring, not new construction.

---

## Common Pitfalls

### Pitfall 1: Prior Period Bypasses Role Scoping

**What goes wrong:** Developer adds a second `queryStatsByOrg` call for the prior period without checking the caller's role, exposing org-wide data to `member` callers.

**Why it happens:** The admin/manager path is simpler (one call); it's tempting to reuse it for both periods.

**How to avoid:** Extract the current-period query logic into a helper (e.g., `queryStatsForCaller`) and call it twice — once for current range, once for prior range — both routed through the same role-scoping path.

**Warning signs:** Test: "member caller sees prior period scoped to own keys" does not exist yet — Wave 0 gap.

### Pitfall 2: Division by Zero in Change Computation

**What goes wrong:** `(current - 0) / 0 * 100` = `Infinity` or `NaN` renders as `"Infinity%"` or `"NaN%"` in the UI.

**Why it happens:** New organisations with zero usage in the prior period.

**How to avoid:** `computeChange` returns `undefined` when `previous === 0`. `MetricCard` renders `"—"` (empty badge) when `changePercent` is `undefined`. This is Decision D-03.

**Warning signs:** Check both unit test and visual: badge slot should be absent (not show "—" text) when no prior data.

### Pitfall 3: Print Output Includes Sensitive Balance Data

**What goes wrong:** The Balance card (Credit 餘額) appears in the PDF output.

**Why it happens:** Forgetting to mark `BalanceCard` call site with `print:hidden`.

**How to avoid:** Decision D-07 explicitly calls out Balance card as hidden. Add `print:hidden` wrapper at the `<BalanceCard>` call site in `Index.tsx`.

### Pitfall 4: Sidebar Not Hidden in Print

**What goes wrong:** PDF includes the navigation sidebar, making the dashboard content narrow and unusable.

**Why it happens:** `Sidebar` is rendered inside `AppShell`, not inside `Index.tsx`. A `print:hidden` added to `Index.tsx` content won't reach it.

**How to avoid:** Add `print:hidden` to the `<aside>` root element inside `Sidebar.tsx`, or to the `<Sidebar>` wrapper in `AppShell.tsx`. The `AppShell` approach is less invasive — wrap `<Sidebar>` with `<div className="print:hidden">`.

**Warning signs:** Print preview still shows the left nav column.

### Pitfall 5: windowMs Calculation Off-by-One

**What goes wrong:** A 30d window calculates as 29 days because of the existing `resolveDateRange` helper using `29 * DAY_MS`.

**Root cause:** In `GetKpiSummaryService.resolveDateRange`, the default start uses `Date.now() - 29 * 24 * 60 * 60 * 1000` — which is 29 days back, not 30. The `windowMs` derived from `range.endDate - range.startDate` will be 29 days in the default case.

**How to avoid:** Do NOT recalculate window duration independently. Compute `windowMs = new Date(range.endDate).getTime() - new Date(range.startDate).getTime()` from whatever dates were resolved. This ensures the prior window mirrors the actual query window, not an assumed duration.

### Pitfall 6: KpiPayload Type Mismatch Between Backend and Frontend

**What goes wrong:** Backend returns `previousPeriod` in `data`, but `KpiPayload` in `Index.tsx` does not include `previousPeriod`. TypeScript reports the field as `undefined` at runtime, badge never renders.

**How to avoid:** Both `KpiSummaryResponse` in `DashboardDTO.ts` and `KpiPayload` in `Index.tsx` must be updated together in the same task (or the test must catch it).

---

## Code Examples

Verified patterns from existing codebase:

### GetKpiSummaryService — Prior Period Helper Extraction

```typescript
// Source: src/Modules/Dashboard/Application/Services/GetKpiSummaryService.ts
// Pattern: extract query execution into a helper, call twice with different ranges

private async queryUsageForCaller(
  query: DashboardAnalyticsQuery,
  range: { startDate: string; endDate: string },
  membershipRole: string | undefined,
  visibleKeys: readonly { id: string }[],
): Promise<UsageStats> {
  if (query.callerSystemRole === 'admin' || membershipRole === 'manager') {
    return this.usageRepository.queryStatsByOrg(query.orgId, range)
  }
  if (visibleKeys.length === 0) return zeroUsage()
  const perKeyStats = await Promise.all(
    visibleKeys.map((key) => this.usageRepository.queryStatsByKey(key.id, range)),
  )
  return combineStats(perKeyStats)
}
```

### DashboardDTO.ts — KpiSummaryResponse Extension

```typescript
// Source: src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts
export interface KpiSummaryResponse {
  success: boolean
  message: string
  data?: {
    usage: UsageStats
    previousPeriod: UsageStats        // NEW
    lastSyncedAt: string | null
  }
  error?: string
}
```

### KpiPayload Frontend Extension

```typescript
// Source: resources/js/Pages/Member/Dashboard/Index.tsx
interface KpiPayload {
  usage: KpiUsage
  previousPeriod: KpiUsage            // NEW
  lastSyncedAt: string | null
}
```

### Tailwind Print Hide — AppShell

```tsx
// Source: resources/js/components/layout/AppShell.tsx
// Wrap Sidebar in print:hidden div
<div className="print:hidden">
  <Sidebar
    title={sidebarTitle}
    items={navItems}
    open={sidebarOpen}
    onClose={() => setSidebarOpen(false)}
  />
</div>
```

---

## Environment Availability

Step 2.6: SKIPPED — Phase 12 is purely code/config changes. No external services, CLIs, databases, or runtimes beyond those already running (Bun, Vite). No new external dependencies.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` |
| Full suite command | `bun run test` |

Note: The `bun run test` script runs `bun test src tests/Unit packages` — Bun's native test runner is used for `src/Pages/__tests__` (imports `bun:test`), while `src/Modules/Dashboard/__tests__` files import from `vitest`. Vitest picks up the latter. Both coexist.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASHBOARD-06 | Prior period returned in KPI response for admin/manager | unit | `npx vitest run src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` | ✅ (extend existing) |
| DASHBOARD-06 | Prior period scoped to visible keys for member caller | unit | `npx vitest run src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` | ❌ Wave 0 gap |
| DASHBOARD-06 | Zero prior period returns previousPeriod as zeroUsage | unit | `npx vitest run src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` | ❌ Wave 0 gap |
| DASHBOARD-06 | window.print() accessible via Download Report button | manual | Browser: click Download Report → print dialog appears | N/A manual |
| DASHBOARD-06 | `@media print` hides sidebar/balance/quick-actions | manual | Browser print preview: sidebar, balance, quick-actions absent | N/A manual |

### Sampling Rate

- **Per task commit:** `npx vitest run src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts`
- **Per wave merge:** `bun run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` — add test: "member prior period scoped to visible keys"
- [ ] `src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` — add test: "zero prior period returns zeroUsage for previousPeriod"
- [ ] `src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` — add test: "prior window duration mirrors current window"

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer for PDF | `window.print()` | v1.2 decision | No server-side rendering needed; simpler, zero-dependency |
| Calendar month comparison | Mirror-window comparison | Phase 12 scoping | Consistent with all three window options (7d/30d/90d) |

**Not applicable in this phase:**
- No library upgrades needed
- No deprecated APIs touched

---

## Open Questions

1. **Sidebar print suppression — where to add `print:hidden`**
   - What we know: The sidebar is rendered by `AppShell.tsx`, not `Index.tsx`. `Sidebar.tsx` renders an `<aside>` with `fixed` positioning.
   - What's unclear: Adding `print:hidden` to `AppShell.tsx` affects ALL pages (admin, member, auth). This may be desirable (print on any page hides nav) or overly broad.
   - Recommendation: Add `print:hidden` to the `<aside>` in `Sidebar.tsx` directly — sidebar on every page should be hidden when printing. This is correct by default. If admin needs a different print behaviour, it can be overridden later.

2. **TopBar print suppression**
   - What we know: D-07 lists "nav sidebar" as hidden. TopBar is not explicitly mentioned.
   - What's unclear: Whether TopBar (hamburger + user info row) should also be hidden in print.
   - Recommendation: Hide TopBar in print as well (`print:hidden` on TopBar root). It adds no value to a PDF and wastes page space. Mark as Claude's Discretion.

---

## Sources

### Primary (HIGH confidence)

- Direct code reading of `src/Modules/Dashboard/Application/Services/GetKpiSummaryService.ts` — full service logic confirmed
- Direct code reading of `src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts` — current `KpiSummaryResponse` shape confirmed
- Direct code reading of `resources/js/Pages/Member/Dashboard/Index.tsx` — `MetricCard`, `KpiPayload`, header layout confirmed
- Direct code reading of `resources/js/components/layout/AppShell.tsx` + `Sidebar.tsx` — print CSS target confirmed
- Direct code reading of `resources/js/components/ui/badge.tsx` — Badge variants confirmed
- Direct code reading of `vitest.config.ts` — test framework confirmed
- Direct reading of `12-CONTEXT.md` — all decisions locked

### Secondary (MEDIUM confidence)

- Tailwind CSS 3 `print:` variant — standard feature, documented, confirmed present via `tailwindcss: 3` in package.json
- `window.print()` browser API — standard Web API, no library needed

### Tertiary (LOW confidence)

- None — all claims are verified from direct code inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, all verified from package.json and existing imports
- Architecture: HIGH — verified by reading all affected files; patterns are consistent with Phases 10 & 11
- Pitfalls: HIGH — role-scoping bypass and zero-division are definitively identified from code structure; print pitfalls from DOM analysis

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable codebase; no fast-moving dependencies)
