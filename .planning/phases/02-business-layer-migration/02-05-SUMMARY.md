---
phase: 02-business-layer-migration
plan: "05"
subsystem: Dashboard / LLMGateway
tags: [migration, dashboard, llm-gateway, usage-aggregator, wave-2]
dependency_graph:
  requires: [02-01, 02-02, 02-03, 02-04]
  provides: [complete-bifrost-elimination, usage-query-widened]
  affects: [Dashboard, Foundation/LLMGateway]
tech_stack:
  added: []
  patterns: [ILLMGatewayClient, MockGatewayClient, LogEntry, UsageQuery]
key_files:
  created: []
  modified:
    - src/Foundation/Infrastructure/Services/LLMGateway/types.ts
    - src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts
    - src/Modules/Dashboard/Infrastructure/Services/UsageAggregator.ts
    - src/Modules/Dashboard/Application/Services/GetUsageChartService.ts
    - src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts
    - src/Modules/Dashboard/__tests__/UsageAggregator.test.ts
    - src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts
    - src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts
decisions:
  - "UsageQuery 擴充 providers/models/limit 欄位以解決 TypeScript strict mode 阻擋 GetUsageChartService 通過型別檢查"
  - "BifrostGatewayAdapter 條件式轉發新欄位（undefined 時不帶入 query params），符合現有 start_time/end_time 處理模式"
metrics:
  duration_minutes: 10
  completed_date: "2026-04-10T07:39:51Z"
  tasks_completed: 3
  files_modified: 8
---

# Phase 02 Plan 05: Dashboard Migration to ILLMGatewayClient Summary

**One-liner:** Dashboard UsageAggregator migrated to ILLMGatewayClient using LogEntry/UsageQuery domain types, with UsageQuery widened (providers, models, limit) to unblock TypeScript strict mode across all five modules.

## What Was Done

### Task 1a — Widen UsageQuery + Update BifrostGatewayAdapter

Added three new optional fields to `UsageQuery` in `types.ts`:
- `providers?: string` — comma-separated provider filter
- `models?: string` — comma-separated model filter
- `limit?: number` — max log entries

Updated `BifrostGatewayAdapter` to conditionally forward these fields to Bifrost API in both `getUsageStats` and `getUsageLogs` calls using the same conditional-spread pattern as `start_time`/`end_time`.

### Task 1b — Migrate UsageAggregator + GetUsageChartService

Rewrote `UsageAggregator.ts`:
- Constructor now accepts `ILLMGatewayClient` (replaced `BifrostClient`)
- `getLogs()` returns `Promise<readonly LogEntry[]>` (replaced `BifrostLogEntry[]`)
- `getStats()` delegates directly to `gatewayClient.getUsageStats()`
- Removed local `UsageStats` interface definition — imported from gateway barrel

Updated `GetUsageChartService.ts`:
- Replaced `bifrostQuery` object (snake_case: `start_time`, `end_time`) with `usageQuery` object (camelCase: `startTime`, `endTime`, `providers`, `models`, `limit`)
- Added `UsageQuery` type import from LLMGateway barrel

### Task 2 — DashboardServiceProvider + Test Migration

Updated `DashboardServiceProvider.ts`:
- `usageAggregator` singleton now resolves `c.make('llmGatewayClient') as ILLMGatewayClient`
- Removed `BifrostClient` import entirely

Migrated all three Dashboard test files to `MockGatewayClient`:
- `UsageAggregator.test.ts`: uses `seedUsageStats()`/`seedUsageLogs()`, validates empty-array early-return bypasses gateway
- `GetDashboardSummaryService.test.ts`: `createMockAggregator()` now uses `MockGatewayClient` with `seedUsageStats()`
- `GetUsageChartService.test.ts` (auto-fix Rule 1): also uses old BifrostClient pattern, migrated to MockGatewayClient with LogEntry shape

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GetUsageChartService.test.ts also used old BifrostClient mock**
- **Found during:** Task 2 — test run showed 1 failure
- **Issue:** `GetUsageChartService.test.ts` was not listed in the plan's task files but constructed `UsageAggregator` with a `BifrostClient` mock, which failed after `UsageAggregator` constructor signature changed
- **Fix:** Migrated `GetUsageChartService.test.ts` to `MockGatewayClient` + `LogEntry` shape, matching the plan's mock pattern
- **Files modified:** `src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts`
- **Commit:** 4c50dd2

## Verification Results

### Dashboard Tests
```
9 pass, 0 fail
Ran 9 tests across 3 files
```

### Cross-module grep (MIGRATE-06 + WIRE-06)
```
grep -rn "BifrostClient|bifrostClient" src/Modules/ | grep -v "CliApi|bifrostVirtualKeyId|bifrostKeyValue|bifrostBaseUrl"
# Result: zero matches — complete migration confirmed
```

### TypeScript
No new type errors in changed files. Pre-existing errors in `IHttpContext.ts` and `routes-connectivity.e2e.ts` are unrelated to this plan.

### Full Test Suite
762 pass, 17 fail (all failures are pre-existing: Routes Connectivity Verification + Playwright tests unrelated to Dashboard or LLMGateway migration).

## Known Stubs

None.

## Self-Check: PASSED

- `src/Foundation/Infrastructure/Services/LLMGateway/types.ts` — FOUND (contains `readonly providers`)
- `src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts` — FOUND (contains `query.providers`)
- `src/Modules/Dashboard/Infrastructure/Services/UsageAggregator.ts` — FOUND (contains `ILLMGatewayClient`)
- `src/Modules/Dashboard/Application/Services/GetUsageChartService.ts` — FOUND (contains `startTime`)
- `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts` — FOUND (contains `llmGatewayClient`)
- Commit 4c50dd2 — FOUND
