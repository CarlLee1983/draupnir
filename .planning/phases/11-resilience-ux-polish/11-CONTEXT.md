# Phase 11: Resilience & UX Polish - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 hardens the Phase 10 dashboard for production conditions. The four success criteria drive the scope:

1. Bifrost sync timeout → dashboard renders stale data with a visible staleness indicator (not a failure)
2. Date-range queries complete in under 500ms (composite index, no full-table scans)
3. "Last updated N minutes ago" label visible on the dashboard, reflects actual sync time
4. Empty `usage_records` → no blank charts or JS errors (Phase 10 already handles this; Phase 11 verifies and does not regress it)

**In scope:**
- Add 30-second `Promise.race` timeout to `BifrostSyncService.sync()`
- Surface `lastSyncedAt` from the KPI summary response
- Add staleness label to the header area of `Member/Dashboard/Index.tsx` with amber/red thresholds
- Add `(org_id, occurred_at)` composite index via Drizzle migration

**Explicitly not in scope:**
- New charts or chart types (Phase 10)
- PDF export (Phase 12)
- Period-over-period badges (Phase 12)
- Admin dashboard changes
- WebSocket / real-time sync

</domain>

<decisions>
## Implementation Decisions

### Staleness Indicator — Data Source

- **D-01:** `lastSyncedAt` is bundled into the existing **KPI summary response** — `DashboardController.kpiSummary` reads from `ISyncCursorRepository` and adds `lastSyncedAt: string | null` to the response payload.
- No new endpoint. The frontend already fetches KPI on load; this piggybacks on that fetch. Zero additional network round trips.

### Staleness Indicator — UI Placement

- **D-02:** The staleness label lives in the **header area, next to the 7d | 30d | 90d time window selector** — same row, right-aligned muted text.
  ```
  [ 7d | 30d | 90d ]          Last updated 3 min ago
  ```
- **D-03:** The label **always shows**, even immediately after sync ("just now" / "< 1 min ago"). No hide-on-fresh behaviour.
- While the KPI fetch is in flight, show a neutral "Syncing…" placeholder in the same position.

### Sync Timeout

- **D-04:** Timeout is enforced **inside `BifrostSyncService.sync()`** using `Promise.race` against a 30-second timeout promise.
- **D-05:** On timeout or any unhandled error: log the failure, do **not** advance the cursor (`cursorRepo.advance` is skipped), return `{ synced: 0, quarantined: 0 }`.
- This means `lastSyncedAt` in the cursor table is the timestamp of the last *successful* sync — precisely what the frontend should display.

### Sync Failure UX (User-Facing)

- **D-06:** No error banner for sync failures. The user-facing signal is the **staleness label aging** — if sync is broken, the "Last updated" time grows older cycle by cycle. Users who notice an amber or red badge know something is wrong without a disruptive alert.

### Stale Data Warning Thresholds

- **D-07:** Progressive staleness colouring:
  - **≤ 10 min** → muted grey (normal)
  - **10–30 min** → amber badge (sync missed at least one 5-minute cycle — something may be wrong)
  - **> 30 min** → red badge (multiple failures — clearly broken)
- **D-08:** Always show the label — never hide when fresh.

### Claude's Discretion

- **Composite index:** Add `(org_id, occurred_at)` index to `usage_records` via a new Drizzle migration. All chart services query by `org_id` + date range; this eliminates the full-table-scan risk on 90-day windows. Exact migration filename follows the project convention.
- **Exact label wording:** "just now", "< 1 min ago", "N min ago", "N hrs ago" — Claude chooses wording consistent with existing UI copy style.
- **Loading placeholder:** "Syncing…" text shown while KPI is in flight, in the same position as the staleness label.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Success Criteria
- `.planning/REQUIREMENTS.md` — Phase 11 success criteria come from the quality-phase requirements for DASHBOARD-01 through DASHBOARD-05

### Backend — Timeout & Sync
- `src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts` — file to add `Promise.race` timeout (D-04, D-05)
- `src/Modules/Dashboard/Application/Ports/ISyncCursorRepository.ts` — `lastSyncedAt` field shape; used by KPI endpoint (D-01)

### Backend — KPI Response Extension
- `src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts` — `kpiSummary` method to extend with `lastSyncedAt` (D-01)
- `src/Modules/Dashboard/Application/Services/GetKpiSummaryService.ts` — service to extend if `lastSyncedAt` is injected here

### Frontend
- `resources/js/Pages/Member/Dashboard/Index.tsx` — extend header with staleness label (D-02, D-03, D-07, D-08)

### Schema & Migrations
- `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` — add composite index on `(org_id, occurred_at)` (Claude's discretion)

### Research
- `.planning/research/PITFALLS.md` — performance cliffs section (missing index risk, permission leak)

### Phase 10 Context (what Phase 11 builds on)
- `.planning/phases/10-p1-chart-ui/10-CONTEXT.md` — D-07 empty state (not regressed), loading/skeleton patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ISyncCursorRepository.get('bifrost_logs')` returns `{ lastSyncedAt: string | null, ... }` — ready to read in the KPI service/controller.
- `BifrostSyncService.sync()` already has a `try/catch` that logs and returns `{ synced: 0, quarantined: 0 }` — the timeout just adds a `Promise.race` wrapper before the existing logic.
- `Badge` component already imported in `Member/Dashboard/Index.tsx` (line 7) — staleness badge can reuse it directly.

### Established Patterns
- KPI response shape: `{ usage: { totalRequests, totalCost, totalTokens, avgLatency } }` — Phase 11 extends it with `{ ..., lastSyncedAt: string | null }`.
- Header layout: `flex flex-col gap-3 md:flex-row md:items-end md:justify-between` — staleness label goes into the right column alongside `<WindowSelector />`.

### Integration Points
- `DashboardController.kpiSummary` needs access to `ISyncCursorRepository` — inject via constructor (DashboardServiceProvider).
- New Drizzle migration file: follow existing migration naming convention in `src/Shared/Infrastructure/Database/Adapters/Drizzle/migrations/`.

### Current Index Gap
- `usage_records` has `idx_usage_records_org_id` and `idx_usage_records_bifrost_log_id`.
- **Missing:** `idx_usage_records_org_occurred` on `(org_id, occurred_at)` — needed by all date-range chart queries.

</code_context>

<specifics>
## Specific Requirements

- Sync timeout: **30 seconds**, `Promise.race` inside `BifrostSyncService.sync()`
- Staleness thresholds: **≤10 min** = grey, **10–30 min** = amber badge, **>30 min** = red badge
- Label always visible (even "just now" / "< 1 min ago") — never hidden
- Label position: **header row, right of time window selector**
- Cursor NOT advanced on timeout — `lastSyncedAt` reflects last *successful* sync only
- No user-facing error banner for sync failures — staleness label is the sole signal

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-resilience-ux-polish*
*Context gathered: 2026-04-12*
