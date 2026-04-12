---
phase: 14-per-key-cost-breakdown
plan: 02
subsystem: ui
tags: [react, inertia, recharts, tailwind]
requires:
  - phase: 14-01
    provides: per-key cost API contract and key-filtered model comparison endpoint
provides:
  - cost breakdown member page
  - sortable per-key cost table with expandable model drill-down
  - donut-based model distribution view with side table
affects: [member navigation, cost analytics page, print flow]
tech-stack:
  added: []
  patterns: [client-side sorting, lazy row expansion, responsive donut chart, print-only report mode]
key-files:
  created:
    - resources/js/Pages/Member/CostBreakdown/Index.tsx
    - resources/js/components/charts/PerKeyCostTable.tsx
    - resources/js/components/charts/ModelDistributionDonut.tsx
    - src/Pages/Member/MemberCostBreakdownPage.ts
  modified:
    - resources/js/layouts/MemberLayout.tsx
    - src/Pages/routing/member/memberPageKeys.ts
    - src/Pages/routing/member/registerMemberPageBindings.ts
    - src/Pages/routing/registerMemberPageRoutes.ts
requirements-completed: [COST-01, COST-02, COST-03, COST-04]
key-decisions:
  - "Used the existing member shell and added a dedicated /member/cost-breakdown route instead of reusing the dashboard page."
  - "Kept time-window selection local to the Cost Breakdown page so it does not mutate dashboard state."
  - "Built expandable per-key rows with lazy fetch and a top-8-plus-Other donut distribution."
duration: 4h 12m
completed: 2026-04-12
---

# Phase 14 Plan 02: Cost Breakdown UI Summary

The member-facing Cost Breakdown page now renders per-key spend, efficiency metrics, a donut-based model distribution, and print-friendly report output from the existing dashboard shell.

## Performance

- **Duration:** 4h 12m
- **Started:** 2026-04-12T01:09:42Z
- **Completed:** 2026-04-12T05:21:48Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added a dedicated member page at `/member/cost-breakdown` with its own sidebar entry.
- Built a sortable 7-column per-key cost table with totals row and lazy-loaded per-model expansion.
- Built a donut chart and companion model table for model cost distribution.
- Added 7d/30d/90d switching and print-friendly report behavior.

## Task Commits

Worktree changes were applied directly in this session; atomic git commits were not created.

## Files Created/Modified
- `resources/js/Pages/Member/CostBreakdown/Index.tsx` - page shell, fetches, print mode, time window selector
- `resources/js/components/charts/PerKeyCostTable.tsx` - sortable expandable table and totals row
- `resources/js/components/charts/ModelDistributionDonut.tsx` - donut chart and side table
- `src/Pages/Member/MemberCostBreakdownPage.ts` - server-side Inertia page handler
- `resources/js/layouts/MemberLayout.tsx` - added PieChart nav item
- `src/Pages/routing/member/memberPageKeys.ts` - new page key
- `src/Pages/routing/member/registerMemberPageBindings.ts` - DI binding
- `src/Pages/routing/registerMemberPageRoutes.ts` - route registration

## Decisions Made
- Reused the existing dashboard model-comparison API for both the overall donut and per-key drill-down.
- Kept the page data-fetching client-side so the Inertia shell stays thin and the controls feel instant.
- Used `window.print()` plus print-only CSS instead of generating a separate PDF workflow.

## Deviations from Plan

### Auto-fixed Issues

**1. Added key-filter support to the model-comparison endpoint**
- **Found during:** Implementing row expansion
- **Issue:** The planned lazy fetch needed a single-key model breakdown, but the backend route only returned org-wide or member-wide results.
- **Fix:** Added optional `api_key_ids` query support and routed it through the existing `queryModelBreakdownByKeys` path.
- **Files modified:** `src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts`, `src/Modules/Dashboard/Application/Services/GetModelComparisonService.ts`, `src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts`
- **Verification:** Dashboard module suite passes, build passes

## Issues Encountered
None blocking. The only adjustment was adding the key-filter capability required by the lazy drill-down.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
The Cost Breakdown page is wired and builds cleanly. The remaining phase-level step is verification in a browser against live data.

---
*Phase: 14-per-key-cost-breakdown*
*Completed: 2026-04-12*
