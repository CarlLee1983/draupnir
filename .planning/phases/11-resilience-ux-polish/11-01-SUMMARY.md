---
phase: 11-resilience-ux-polish
plan: 01
subsystem: infra
tags: [bifrost, timeout, kpi, vitest, sqlite]
requires:
  - phase: 10-p1-chart-ui
    provides: dashboard baseline, loading states, empty-state behavior
provides:
  - 30-second Promise.race timeout for Bifrost sync
  - KPI summary payload with lastSyncedAt
  - Vitest resolver support for src and resources/js @/ imports
affects: [dashboard, analytics, testing]
tech-stack:
  added: []
  patterns: [Promise.race timeout wrapper, cursor-backed freshness metadata, Vitest workspace alias resolver]
key-files:
  created:
    - vitest.config.ts
  modified:
    - src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts
    - src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts
    - src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts
    - src/Modules/Dashboard/Application/Services/GetKpiSummaryService.ts
    - src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts
    - src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts
key-decisions:
  - "Wrapped the existing sync body in Promise.race so timeouts fail fast without advancing the cursor."
  - "Injected ISyncCursorRepository into GetKpiSummaryService so the KPI response can expose lastSyncedAt directly."
  - "Added a Vitest-only alias resolver that checks resources/js first and falls back to src so backend tests can load the shared '@/...' imports used throughout the repo."
patterns-established:
  - "Backend freshness metadata should come from the sync cursor, not from a separate endpoint."
  - "Test harness fixes that are required for validation should live in a small dedicated config file rather than rewriting large import graphs."
requirements-completed: [DASHBOARD-01, DASHBOARD-02, DASHBOARD-03, DASHBOARD-04, DASHBOARD-05]
duration: 20m
completed: 2026-04-11T16:48:40Z
---

# Phase 11: Resilience & UX Polish Summary

**Bifrost sync timeout hardening with cursor-backed KPI freshness metadata and test-runner alias support**

## Performance

- **Duration:** 20m
- **Completed:** 2026-04-11T16:48:40Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added a 30-second `Promise.race` timeout around `BifrostSyncService.sync()`.
- Kept cursor advancement inside the sync body so timed-out runs do not advance freshness metadata.
- Extended KPI responses with `lastSyncedAt` and wired `GetKpiSummaryService` to read the cursor repository.
- Added a Vitest-only resolver so dashboard backend tests can import both `src/` and `resources/js/` code through the existing `@/` convention.

## Task Commits

1. **Task 1: TDD - BifrostSyncService timeout (RED -> GREEN)** - `c60c022` (feat)
2. **Task 2: TDD - KpiSummaryResponse lastSyncedAt + service injection (RED -> GREEN)** - `cec5338` (feat)
3. **Support: Vitest alias resolver for src tests** - `4626e6f` (test)

## Files Created/Modified
- `vitest.config.ts` - Vitest-only alias resolver for backend and frontend imports.
- `src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts` - Adds the timeout wrapper and `syncInternal()`.
- `src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` - Covers timeout and cursor non-advance behavior.
- `src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts` - Adds `lastSyncedAt` to the KPI payload.
- `src/Modules/Dashboard/Application/Services/GetKpiSummaryService.ts` - Reads cursor freshness and returns it with KPI stats.
- `src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` - Verifies cursor timestamp propagation and null handling.
- `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts` - Injects `syncCursorRepository` into KPI service wiring.

## Decisions Made
- Used `Promise.race` instead of AbortController because the sync flow is already promise-based and does not own the underlying transport.
- Kept `lastSyncedAt` on the existing KPI endpoint so the dashboard gains freshness metadata without a new fetch.
- Kept the timeout visible only through staleness aging, not through a user-facing error banner.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest import resolution for backend tests**
- **Found during:** Task 1 verification
- **Issue:** `bun vitest` could not resolve the repo's shared `@/` imports because the default Vite alias only pointed at `resources/js`
- **Fix:** Added `vitest.config.ts` with a workspace resolver that checks `resources/js` first and falls back to `src`
- **Files modified:** `vitest.config.ts`
- **Verification:** `bun vitest run src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` and `bun vitest run src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` both passed
- **Committed in:** `4626e6f`

**Total deviations:** 1 auto-fixed (Rule 3 - Blocking).
**Impact on plan:** No scope change. The fix was required to make the mandated test harness usable.

## Issues Encountered

`bun vitest` initially failed on the backend Dashboard tests because the repo uses `@/` for both frontend and backend code, but the default Vitest/Vite alias only resolved frontend paths. The dedicated resolver fixed that without changing production build behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Wave 1 is complete and the dashboard freshness metadata is ready for the UI consumer in plan 03.

---
*Phase: 11-resilience-ux-polish*
*Completed: 2026-04-11T16:48:40Z*
