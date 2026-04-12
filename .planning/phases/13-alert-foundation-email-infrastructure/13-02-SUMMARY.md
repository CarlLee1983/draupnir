---
phase: 13-alert-foundation-email-infrastructure
plan: 02
subsystem: infra
tags:
  - alerts
  - email
  - routing
  - dependency-injection
  - billing
  - dashboard
requires:
  - phase: 13-alert-foundation-email-infrastructure
    provides: shared IMailer port, alert config persistence, and sync-completion domain event
provides:
  - threshold evaluation pipeline with month-scoped deduplication
  - alert budget CRUD endpoints for organization managers
  - AlertsServiceProvider and app wiring
affects:
  - phase 14 per-key cost breakdown
  - phase 15 webhook alerts
  - phase 16 automated reports
tech-stack:
  added: []
  patterns:
    - domain-event-driven alert evaluation
    - manager-scoped budget HTTP endpoints
    - shared mailer binding in Foundation
key-files:
  created:
    - src/Modules/Alerts/Application/Services/EvaluateThresholdsService.ts
    - src/Modules/Alerts/Application/Services/SendAlertService.ts
    - src/Modules/Alerts/Application/Services/SetBudgetService.ts
    - src/Modules/Alerts/Application/Services/GetBudgetService.ts
    - src/Modules/Alerts/Infrastructure/Services/AlertEmailTemplates.ts
    - src/Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider.ts
    - src/Modules/Alerts/Presentation/Controllers/AlertController.ts
    - src/Modules/Alerts/Presentation/Routes/alert.routes.ts
    - src/Modules/Alerts/Presentation/Requests/SetBudgetRequest.ts
    - src/Modules/Alerts/index.ts
    - src/Modules/Alerts/__tests__/EvaluateThresholdsService.test.ts
  modified:
    - src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts
    - src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts
    - src/bootstrap.ts
    - src/routes.ts
    - src/wiring/index.ts
requirements-completed: [ALRT-01, ALRT-02, ALRT-03, ALRT-04, ALRT-05]
duration: 9m
completed: 2026-04-12
---

# Phase 13 Plan 02: Alert Pipeline Summary

**Bifrost-driven threshold evaluation, per-key alert attribution, budget CRUD, and application wiring for the Alerts module**

## Performance

- **Duration:** 9m
- **Started:** 2026-04-12T08:44:00+08:00
- **Completed:** 2026-04-12T08:53:14+08:00
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments
- Added `EvaluateThresholdsService` to evaluate org cost against fixed warning/critical thresholds and deduplicate alerts by month.
- Added `SendAlertService` and HTML alert templates with per-key breakdown tables and manager-only recipient delivery.
- Wired `BifrostSyncService` to emit `BifrostSyncCompletedEvent` after successful syncs so alerts evaluate automatically.
- Added budget CRUD endpoints and request validation for org managers.
- Registered the Alerts module, mailer binding, and route wiring in the app bootstrap.

## Task Commits

1. **Task 1: build alert evaluation pipeline and email templates** - `d63eb09` (feat)
2. **Task 2: add alert budget CRUD endpoints** - `cb186b2` (feat)
3. **Task 3: wire alerts module into the application** - `5d32615` (feat)

## Files Created/Modified
- `src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts` - Dispatches `BifrostSyncCompletedEvent` with affected org IDs.
- `src/Modules/Alerts/Application/Services/EvaluateThresholdsService.ts` - Compares monthly usage to budget and applies dedup rules.
- `src/Modules/Alerts/Application/Services/SendAlertService.ts` - Resolves recipients, sends mail, records alert events.
- `src/Modules/Alerts/Infrastructure/Services/AlertEmailTemplates.ts` - Plain HTML warning/critical alert bodies with per-key tables.
- `src/Modules/Alerts/Application/Services/SetBudgetService.ts` - Creates or updates org alert budgets.
- `src/Modules/Alerts/Application/Services/GetBudgetService.ts` - Reads current budget state.
- `src/Modules/Alerts/Presentation/Requests/SetBudgetRequest.ts` - Positive decimal validation for budget input.
- `src/Modules/Alerts/Presentation/Controllers/AlertController.ts` - HTTP adapter for budget GET/PUT.
- `src/Modules/Alerts/Presentation/Routes/alert.routes.ts` - Budget endpoint registration.
- `src/Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider.ts` - DI registration and event subscription.
- `src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts` - Registers `mailer` singleton.
- `src/bootstrap.ts` - Registers `AlertsServiceProvider`.
- `src/routes.ts` - Registers Alerts routes.
- `src/wiring/index.ts` - Adds `registerAlerts`.
- `src/Modules/Alerts/index.ts` - Public module exports.
- `src/Modules/Alerts/__tests__/EvaluateThresholdsService.test.ts` - Coverage for thresholds, dedup, and per-key breakdown.

## Decisions Made
- Used a shared Foundation mailer port so Alerts and Auth can share the same transport abstraction.
- Kept alert deduplication on the immutable `AlertConfig` aggregate with month-scoped state.
- Used the existing organization membership model and `isManager()` role check to gate budget editing and alert delivery.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

None.

## Self-Check

- [x] `bun test src/Modules/Alerts/__tests__/EvaluateThresholdsService.test.ts`
- [x] `bun run build`
- [x] Bifrost sync emits `BifrostSyncCompletedEvent`
- [x] Budget endpoints register under `/api/organizations/:orgId/alerts/budget`
- [x] Foundation provides `mailer` singleton

## Next Phase Readiness

Phase 13 is complete. Phase 14 can now build on the alert foundation for per-key cost analysis and downstream alert/report features can reuse the shared mail and event pipeline.

---
*Phase: 13-alert-foundation-email-infrastructure*
*Completed: 2026-04-12*
