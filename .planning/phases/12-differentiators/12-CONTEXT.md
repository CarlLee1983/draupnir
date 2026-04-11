# Phase 12: Differentiators - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 adds two differentiator features on top of the fully-wired dashboard from Phases 10 & 11:

1. **Period-over-period change badges** — each KPI card shows a % change vs the prior equivalent period (e.g., "+5% vs prior 30d")
2. **PDF download** — a "Download Report" button triggers `window.print()` of the current dashboard view

**In scope:**
- Extend `GetKpiSummaryService` (or `DashboardController.kpiSummary`) to fetch and return `previousPeriod` data alongside the current period
- Add `previousPeriod: KpiUsage` field to the KPI response payload
- Extend `MetricCard` in `Index.tsx` to accept and render a change badge
- Add `@media print` CSS to hide nav, buttons, and balance card
- Add "Download Report" button to the header row (right side, after staleness label)

**Explicitly not in scope:**
- Admin Dashboard changes
- New chart types
- Calendar-month comparisons (always mirror the selected window)
- Per-key breakdown (v1.2.x)
- Error rate trend (v1.2.x)
- Custom date pickers (v1.2.x)

</domain>

<decisions>
## Implementation Decisions

### Badge Data Flow

- **D-01:** The backend computes the prior period and returns it directly in the KPI response. The KPI response shape extends to:
  ```
  { usage: KpiUsage, previousPeriod: KpiUsage, lastSyncedAt: string | null }
  ```
  `GetKpiSummaryService` fetches both the current window and the immediately preceding window of the same duration in one service call.

- **D-02:** The "prior period" is a **mirror of the selected window** — not a calendar month. If the user selects the 30d window (e.g., Apr 12 back to Mar 13), the prior period is the 30 days before that (Mar 12 back to Feb 11). Consistent across all three window options (7d, 30d, 90d).

- **D-03:** The **frontend computes % change** from `usage` and `previousPeriod` values. Backend returns raw metric totals for both periods; frontend does the arithmetic (`(current - previous) / previous * 100`). Zero division: if `previousPeriod` value is 0, show "—" instead of a badge.

- **D-04:** Change badges appear on **all four KPI cards**: Cost, Requests, Total Tokens, Avg Latency. Backend returns `previousPeriod` for all four metrics.

### Badge Presentation

- **D-05:** Claude's Discretion — `MetricCard` gains an optional `changePercent?: number` prop. When provided, render a small `Badge` component below the main value. Positive = green, negative = red, zero = neutral grey. Format: `+5.2%` / `-3.1%`. Reuse the existing `Badge` component already imported in `Index.tsx`.

### PDF Scope & Print Layout

- **D-06:** PDF output is **current view as-is** — no separate print layout, no special report view. `window.print()` prints what the user currently sees.

- **D-07:** `@media print` CSS hides:
  - Navigation sidebar (left nav)
  - Action buttons (Download Report button, Quick Actions card)
  - Balance card (Credit balance — sensitive/irrelevant for cost report)
  - Staleness label is **kept** (user chose not to hide it)

- **D-08:** No print-specific page title or header section is needed — current dashboard is the report.

### Download Button Placement

- **D-09:** The "Download Report" button lives in the **header row, right side** — same row as the `7d | 30d | 90d` selector and staleness label. Right-aligned alongside those controls.
  ```
  [ 7d | 30d | 90d ]    Last updated 3 min ago    [Download Report]
  ```
  Uses the existing `Button` component. On click: `window.print()`.

- **D-10:** The Download Report button is hidden in print output (covered by D-07: action buttons hidden).

### Claude's Discretion

- `MetricCard` badge slot: add `changePercent?: number` prop; omit badge entirely when prop is absent or `undefined` (no empty space).
- Print CSS location: add a `<style>` tag with `@media print` rules inside `Index.tsx`, or a separate `print.css` imported at the layout level — whichever fits the existing asset pipeline pattern.
- Button variant for Download Report: use `variant="outline"` to keep it secondary to the time window selector visually.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §DASHBOARD-06 — Monthly PDF report acceptance criteria (window.print() approach confirmed for v1.2)

### Backend — KPI Service (primary change target)
- `src/Modules/Dashboard/Application/Services/GetKpiSummaryService.ts` — extend to fetch prior period data
- `src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts` — `kpiSummary` method; response shape to extend with `previousPeriod`
- `src/Modules/Dashboard/Application/Ports/IUsageRepository.ts` — query methods available; `queryStatsByOrg`/`queryStatsByKey` are the read paths used by KPI service

### Frontend — Dashboard Page (primary UI change target)
- `resources/js/Pages/Member/Dashboard/Index.tsx` — `MetricCard`, `KpiPayload`, header layout, all extend here

### Phase Context (what Phase 12 builds on)
- `.planning/phases/10-p1-chart-ui/10-CONTEXT.md` — D-01 time window selector layout, D-08 role scoping, `MetricCard` shape
- `.planning/phases/11-resilience-ux-polish/11-CONTEXT.md` — D-01 `lastSyncedAt` in KPI payload, D-02 header row layout (staleness label position)

### Existing UI Components
- `resources/js/components/ui/badge.tsx` — Badge component already in use; reuse for change badges
- `resources/js/components/ui/button.tsx` — Button component for Download Report trigger

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MetricCard` (line 240, `Index.tsx`): `{ title, value, suffix, icon, accentClassName }` — add `changePercent?: number` as an optional prop. Currently renders value + optional suffix; badge goes below.
- `Badge` component already imported at line 6 of `Index.tsx` — no new import needed for change badges.
- `Button` component already imported at line 5 — Download Report button is zero new imports.
- `KpiPayload` interface (line 33): currently `{ usage: KpiUsage, lastSyncedAt: string | null }` — extend with `previousPeriod: KpiUsage`.

### Established Patterns
- Phase 11 extended the KPI response shape (added `lastSyncedAt`) without breaking consumers — same pattern applies here for `previousPeriod`.
- Header layout (`flex flex-col gap-3 md:flex-row md:items-end md:justify-between`) from Phase 11 — Download button goes into the same right-side flex group as the staleness label.
- `DashboardController.kpiSummary` uses `IUsageRepository` queries via `GetKpiSummaryService` — prior period just needs a second call with shifted `start_time`/`end_time`.

### Integration Points
- `GetKpiSummaryService.execute({ orgId, startTime, endTime, ... })` — compute `priorStart = startTime - windowMs`, `priorEnd = startTime`, run same query, append result as `previousPeriod` in response.
- No new routes needed — piggybacking on existing `/kpi-summary` endpoint.
- No new application services needed — `GetKpiSummaryService` handles both current and prior period queries.

</code_context>

<specifics>
## Specific Requirements

- Change badge format: `+5.2%` (green) / `-3.1%` (red) / `—` (when prior period is zero)
- Badge appears on: Cost, Requests, Total Tokens, Avg Latency — all four KPI cards
- Prior period window: mirror of selected window (7d → prior 7d, 30d → prior 30d, 90d → prior 90d)
- Header row layout (right side): `[staleness label]  [Download Report button]`
- Print hides: nav sidebar, action buttons (incl. Download Report), Quick Actions card, Balance card
- Print keeps: KPI cards, charts, model table, staleness label
- `window.print()` on button click — no PDF library

</specifics>

<deferred>
## Deferred Ideas

- Per-key breakdown table (cost per API Key): listed in REQUIREMENTS as v1.2.x Differentiator — belongs in a follow-on phase
- Error rate trend chart: v1.2.x Differentiator — separate phase
- Custom date picker (arbitrary start/end): v1.2.x Differentiator — separate phase
- Puppeteer-based PDF for email delivery: v1.3 scope per REQUIREMENTS §DASHBOARD-06

</deferred>

---

*Phase: 12-differentiators*
*Context gathered: 2026-04-12*
