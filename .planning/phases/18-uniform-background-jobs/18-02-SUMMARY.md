---
phase: 18-uniform-background-jobs
plan: 02
subsystem: Scheduler
tags: [jobs, scheduling, refactor]
tech-stack: [IScheduler, IJobRegistrar, croner]
key-files:
  - src/bootstrap.ts
  - src/Modules/Reports/Application/Services/ScheduleReportService.ts
  - src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider.ts
  - src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts
  - config/app.ts
  - tests/Integration/Bootstrap/registerJobs.test.ts
metrics:
  duration: 45m
  completed_date: "2026-04-13"
---

# Phase 18 Plan 02 Summary: Migrate Jobs to IScheduler

## Substantive Changes
Migrated all existing background jobs to the unified `IScheduler` abstraction. Removed `setInterval` and direct `croner` usage from application logic. Centralized job registration through the `IJobRegistrar` interface.

### Key Modifications
- **bootstrap.ts**: Removed the 20-line `setInterval` block for BifrostSync. Added a loop to iterate over all registered module providers and call `registerJobs(scheduler)` for those implementing `IJobRegistrar`.
- **ScheduleReportService**: Refactored to delegate all scheduling to `IScheduler`. Removed internal `Map<string, Cron>` and `croner` dependency. Preserved public API for `ReportController`.
- **BifrostSync**: Migrated to `IScheduler` via `DashboardServiceProvider.registerJobs()`.
- **Config**: Added `BIFROST_SYNC_CRON` to `config/app.ts` with validation at startup.
- **Service Providers**: `DashboardServiceProvider` and `ReportsServiceProvider` now implement `IJobRegistrar`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Missing DatabaseUsageAggregator**
- **Found during:** Task 2 execution. `DashboardServiceProvider` referenced `DatabaseUsageAggregator` but it was missing from the filesystem (or untracked).
- **Fix:** Created/restored `src/Modules/Dashboard/Infrastructure/Services/DatabaseUsageAggregator.ts`.
- **Commit:** a944be1

**2. [Rule 1 - Bug] Unused variables in DatabaseUsageAggregator**
- **Found during:** Final verification (`tsc`).
- **Fix:** Prefixed unused `query` parameters with `_`.
- **Commit:** Pending final commit (combined with fix).

## Test Results

| Suite | Result | Passed | Failed |
|-------|--------|--------|--------|
| Unit (Reports) | PASSED | 8 | 0 |
| Integration (Bootstrap) | PASSED | 3 | 0 |
| Unit (Scheduler) | PASSED | 14 | 0 |
| **Total** | **PASSED** | **25** | **0** |

## Known Stubs
None.

## Self-Check: PASSED
- [x] Zero `setInterval` in bootstrap.ts.
- [x] All jobs registered via `IScheduler`.
- [x] Integration test verifies wiring.
- [x] `tsc` clean for all modified files (ignoring pre-existing Atlas errors).
