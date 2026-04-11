# Phase 8: Data Correctness & Permission Foundation - Research

**Date:** 2026-04-11  
**Status:** Research complete  
**Input:** [08-CONTEXT.md](./08-CONTEXT.md)

<scope>
## Research Goal

Determine the minimum implementation shape for DASHBOARD-P1, DASHBOARD-P2, and DASHBOARD-P3 without widening phase 8 beyond data correctness and permission foundation work.
</scope>

<findings>
## Key Findings

### 1) Phase 8 is mostly a dashboard permission/data-shape phase, not a broad UI rewrite

- The current dashboard page architecture already uses page-handler classes:
  - `src/Pages/Admin/AdminDashboardPage.ts`
  - `src/Pages/Member/MemberDashboardPage.ts`
- The legacy `src/Pages/Admin/Dashboard/Index.tsx` path referenced by the roadmap does not exist in the current tree.
- Result: phase 8 should be planned around the current page-handler layer and dashboard services, not around a legacy component rewrite.

### 2) DASHBOARD-P1 appears stale in the roadmap wording, but the underlying requirement is still useful

- Repository search found no `sampleUsageData` symbol in `src/` or `tests/`.
- `AdminDashboardPage` already renders live totals from services:
  - `ListUsersService`
  - `ListOrganizationsService`
  - `ListAdminContractsService`
- That means the literal "remove hardcoded sample data" task is likely already satisfied or at least no longer represented by the current source tree.
- Planner implication: treat P1 as a verification / no-regression item unless a hidden fixture exists outside the current code search.

### 3) DASHBOARD-P2 is already normalized at the adapter boundary

- `src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts` owns the snake_case to camelCase translation boundary.
- `UsageAggregator` and dashboard services consume camelCase `LogEntry` fields:
  - `inputTokens`
  - `outputTokens`
  - `totalTokens`
- Search found no remaining usage-log snake_case consumption in `src/` outside the Drizzle schema definition.
- Result: phase 8 should not introduce a new DTO normalization layer. The important planner question is verification, not redesign.

### 4) DASHBOARD-P3 is the real implementation gap

- `GetDashboardSummaryService` and `GetUsageChartService` both call `OrgAuthorizationHelper.requireOrgMembership(...)`.
- That helper authorizes any org member, but it does not decide visibility scope.
- Both services then load all active API keys for the org and pass every key ID into `UsageAggregator`.
- This means the current behavior is org-wide, not member-scoped.
- The member dashboard page already supports inline error rendering for service failures, so access-denied behavior does not need to become a redirect or 403 to satisfy phase 8.

### 5) Existing permission helpers already give the correct UX split

- `requireMember(ctx)` redirects anonymous users to `/login`.
- `requireAdmin(ctx)` redirects anonymous users to `/login` and returns `403` HTML for non-admins.
- `MemberDashboardPage` currently renders inline error props when `GetDashboardSummaryService` fails.
- Context decision confirms this inline error-state should remain for member dashboard access failure, so planner should preserve that pattern.

### 6) Current data model already contains the fields needed for member self-scoping

- `ApiKey` includes `createdByUserId`.
- `ApiKeyRepository.findByOrgId(orgId)` already returns full `ApiKey` aggregates.
- That means planner can choose either:
  - filter in the dashboard service by `createdByUserId`, or
  - add a scoped repository method for cleaner intent.
- No new schema migration is required for phase 8.
</findings>

<planner_implications>
## Planner-Ready Decisions

### P1
- Treat admin dashboard "sample data removal" as a no-regression check against live service totals, not as a component rewrite.

### P2
- Keep usage-log normalization at the `BifrostGatewayAdapter` boundary.
- Verify that dashboard consumers use camelCase `LogEntry` fields only.

### P3
- Implement one shared role-aware key-selection path for dashboard summary and usage chart so the two surfaces cannot drift.
- MEMBER should see only keys they created in the selected organization.
- MANAGER and ADMIN should continue to see org-wide dashboard data.
</planner_implications>

<recommended_code_paths>
## Minimal Code Paths

1. `src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts`
2. `src/Modules/Dashboard/Application/Services/GetUsageChartService.ts`
3. `src/Modules/Dashboard/Infrastructure/Services/UsageAggregator.ts` only if planner needs a small helper boundary adjustment
4. `src/Pages/Member/MemberDashboardPage.ts` only for preserving current inline error-state flow
5. Tests for the above services/pages

### Likely supporting repository surface
- `src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts`
- `src/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository.ts`
- `src/Modules/Organization/Application/Services/OrgAuthorizationHelper.ts`
</recommended_code_paths>

<risks>
## Risks

- If self-scoping is implemented only in summary and not usage chart, member users may still see org-wide usage data in one surface.
- If filtering is done separately in multiple places, summary and chart can drift.
- If planner treats P1 as a UI rewrite, scope will expand unnecessarily because the current page layer already uses live data.
- If tests only cover admin/member page handlers and not the underlying services, the permission bug can remain hidden.
</risks>

<validation_architecture>
## Validation Architecture

Phase 8 should be proven with focused service and page tests:

1. `GetDashboardSummaryService`
   - MEMBER returns only self-scoped counts / usage for the selected org.
   - MANAGER returns org-wide counts / usage.
   - ADMIN returns org-wide counts / usage.

2. `GetUsageChartService`
   - Same role split as summary service.
   - Log payloads remain camelCase and contain the expected token fields.

3. `MemberDashboardPage`
   - Missing org still renders the existing inline error state.
   - Org-level failure remains inline, not redirect/403.

4. `AdminDashboardPage`
   - Continues to render live totals from services.
   - No sample-data fallback is introduced.

5. `UsageAggregator` / gateway adapter tests
   - Existing camelCase mapping remains the source of truth.
   - No new snake_case leaks enter the dashboard layer.
</validation_architecture>

<deferred>
## Deferred Ideas

- No new dashboard chart types.
- No reporting/export work.
- No route changes.
- No schema migration.
</deferred>

<summary>
## Summary

Phase 8 should be planned as a narrow fix phase:
- P1 is likely already functionally satisfied by the current admin dashboard page structure.
- P2 is already normalized in the gateway adapter boundary.
- P3 is the real remaining product decision: member-scoped vs org-wide dashboard visibility.
- The implementation should keep member dashboard denial inline and avoid introducing new abstractions unless they reduce duplication across summary and usage chart.
</summary>

---

*Phase: 08-data-correctness-permission-foundation*  
*Research gathered: 2026-04-11*
