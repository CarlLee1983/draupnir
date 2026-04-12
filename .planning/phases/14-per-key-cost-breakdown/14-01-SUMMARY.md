---
phase: 14-per-key-cost-breakdown
plan: 01
subsystem: api
tags: [dashboard, analytics, drizzle, typescript]
requires:
  - phase: 13-dashboard-foundation
    provides: dashboard analytics patterns, role-scoped usage queries, and controller/route wiring
provides:
  - per-key cost aggregation endpoint
  - role-scoped per-key cost service and DTOs
  - GROUP BY api_key_id repository methods
affects: [member cost breakdown page, model comparison endpoint]
tech-stack:
  added: []
  patterns: [role-scoped aggregation, GROUP BY api_key_id, derived metrics in service layer]
key-files:
  created:
    - src/Modules/Dashboard/Application/Services/GetPerKeyCostService.ts
    - src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts
  modified:
    - src/Modules/Dashboard/Application/Ports/IUsageRepository.ts
    - src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts
    - src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts
    - src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts
    - src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts
    - src/Modules/Dashboard/Presentation/Routes/dashboard.routes.ts
    - src/wiring/index.ts
    - src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts
    - src/Modules/Dashboard/__tests__/GetModelComparisonService.test.ts
    - src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts
key-decisions:
  - "Added queryPerKeyCost/queryPerKeyCostByKeys to reuse cached usage_records instead of new tables or joins."
  - "Resolved key labels in the application service so the API returns readable names instead of raw UUIDs."
  - "Computed per-request efficiency metrics and percent-of-total in the service layer for safe division and visible-scope totals."
requirements-completed: [COST-01, COST-02, COST-03, COST-04]
duration: 4h 12m
completed: 2026-04-12
---

# Phase 14 Plan 01: Backend Contract Summary

Per-key cost attribution now ships as a dedicated Dashboard API with role-scoped aggregation, safe derived metrics, and lazy-ready model breakdown support.

## Performance

- **Duration:** 4h 12m
- **Started:** 2026-04-12T01:09:42Z
- **Completed:** 2026-04-12T05:21:48Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Added `queryPerKeyCost` and `queryPerKeyCostByKeys` to the usage repository port and Drizzle implementation.
- Added `GetPerKeyCostService` with label resolution, role scoping, grand totals, and derived efficiency metrics.
- Wired the new API route, controller method, provider binding, and module container entry.
- Extended the existing model-comparison endpoint to accept optional key filters for per-key drill-down.

## Task Commits

Worktree changes were applied directly in this session; atomic git commits were not created.

## Files Created/Modified
- `src/Modules/Dashboard/Application/Services/GetPerKeyCostService.ts` - per-key aggregation service
- `src/Modules/Dashboard/Application/Ports/IUsageRepository.ts` - new bucket and repository methods
- `src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts` - per-key response DTOs
- `src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts` - GROUP BY api_key_id queries
- `src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts` - new per-key endpoint and key-filter parsing
- `src/Modules/Dashboard/Presentation/Routes/dashboard.routes.ts` - per-key-cost route
- `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts` - DI registration
- `src/wiring/index.ts` - Dashboard controller wiring
- `src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` - service contract coverage
- `src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` - repository aggregation coverage
- `src/Modules/Dashboard/__tests__/GetModelComparisonService.test.ts` - key-filter coverage

## Decisions Made
- Kept the model distribution on the existing `model-comparison` endpoint and added optional `api_key_ids` filtering instead of introducing a second route.
- Used the existing key-scope resolver so MEMBER callers only see their own keys.
- Kept all cost math in the service layer to avoid division-by-zero and make the visible-scope percent totals explicit.

## Deviations from Plan

### Auto-fixed Issues

**1. Added optional key filtering to the model-comparison endpoint**
- **Found during:** Frontend wiring for lazy per-key model drill-down
- **Issue:** The plan’s row expansion behavior required a per-key model breakdown surface, but the existing route only supported org-wide scope.
- **Fix:** Allowed `api_key_ids` on `model-comparison` and routed it through `queryModelBreakdownByKeys`.
- **Files modified:** `src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts`, `src/Modules/Dashboard/Application/Services/GetModelComparisonService.ts`, `src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts`
- **Verification:** Dashboard module test suite passes and new service test covers the filter branch

### Additional Maintenance

**2. Updated stale Bifrost sync expectations**
- **Found during:** Full Dashboard module verification
- **Issue:** Existing tests still asserted the older `SyncResult` shape without `affectedOrgIds`.
- **Fix:** Updated expectations to the current service contract.
- **Files modified:** `src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts`
- **Verification:** `bun test src/Modules/Dashboard/` passes

## Issues Encountered
None blocking. The only notable cleanup was aligning the stale sync test contract.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Backend contract is ready for the Cost Breakdown UI. The API now supports per-key cost aggregation and key-scoped model drill-down.

---
*Phase: 14-per-key-cost-breakdown*
*Completed: 2026-04-12*
