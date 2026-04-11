---
phase: 08-data-correctness-permission-foundation
plan: 01
subsystem: Dashboard
tags: [permissions, api-keys, dashboard, tests]
dependencies:
  requires:
    - src/Modules/Organization/Application/Services/OrgAuthorizationHelper.ts
    - src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts
  provides:
    - src/Modules/Dashboard/Application/Services/DashboardKeyScopeResolver.ts
    - Role-aware GetDashboardSummaryService / GetUsageChartService
key_files:
  created:
    - src/Modules/Dashboard/Application/Services/DashboardKeyScopeResolver.ts
  modified:
    - src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts
    - src/Modules/Dashboard/Application/Services/GetUsageChartService.ts
    - src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts
    - src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts
    - src/Pages/__tests__/Admin/AdminDashboardPage.test.ts
decisions:
  - Org-wide dashboard visibility uses org membership role `manager`; global `callerSystemRole === 'admin'` sees all org keys without a membership row.
  - Org `member` (and any non-manager org role) only sees keys where `createdByUserId === callerUserId`.
metrics:
  completed_at: "2026-04-11"
  verification: "bun test src/Modules/Dashboard src/Pages/__tests__/Admin src/Pages/__tests__/Member tests/Unit/Foundation/LLMGateway"
---

# Phase 08 Plan 01: Data Correctness & Permission Foundation — Summary

**Objective:** Scope dashboard summary and usage chart aggregation by caller role so members only see their own API keys while managers (and global admins) see the full org; keep existing auth error behavior; lock behavior with tests.

## Delivered

1. **`DashboardKeyScopeResolver`** — Single place for visible-key rules; used by both dashboard services.
2. **`GetDashboardSummaryService`** — `totalKeys` / `activeKeys` / usage stats derive from visible keys only (no longer full-org counts for members).
3. **`GetUsageChartService`** — Log/stats aggregation uses the same visible virtual key id set.
4. **Tests** — Member vs manager matrix on summary and usage services; usage chart asserts non-zero `inputTokens` / `outputTokens` / `totalTokens`; admin dashboard test asserts list services were invoked.

## Verification

```bash
bun test src/Modules/Dashboard src/Pages/__tests__/Admin src/Pages/__tests__/Member tests/Unit/Foundation/LLMGateway
```

All tests passed (153) at completion.
