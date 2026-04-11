---
phase: 08-data-correctness-permission-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts
  - src/Modules/Dashboard/Application/Services/GetUsageChartService.ts
  - src/Modules/Dashboard/Application/Services/DashboardKeyScopeResolver.ts
  - src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts
  - src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts
  - src/Pages/__tests__/Admin/AdminDashboardPage.test.ts
  - src/Pages/__tests__/Member/MemberDashboardPage.test.ts
  - tests/Unit/Foundation/LLMGateway/BifrostGatewayAdapter.test.ts
autonomous: true
requirements:
  - DASHBOARD-P1
  - DASHBOARD-P2
  - DASHBOARD-P3
user_setup: []

must_haves:
  truths:
    - "MEMBER 在 member dashboard 中只看自己於所選 organization 下的 API keys / summary"
    - "MANAGER 與 ADMIN 可查看該 organization 的 org-wide dashboard data"
    - "member dashboard 的 denied org access / org-level access failure 維持 inline error-state，不改為 403 或 redirect"
    - "usage-log DTO normalization stays inside BifrostGatewayAdapter; dashboard layer only consumes camelCase fields"
    - "AdminDashboardPage continues to use live service totals instead of sample data"
  artifacts:
    - path: "src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts"
      provides: "Role-aware dashboard summary scoping"
      contains: "createdByUserId"
    - path: "src/Modules/Dashboard/Application/Services/GetUsageChartService.ts"
      provides: "Role-aware usage chart scoping"
      contains: "createdByUserId"
    - path: "src/Modules/Dashboard/Application/Services/DashboardKeyScopeResolver.ts"
      provides: "Shared role-aware visible-key resolver"
      contains: "member / manager / admin branching"
    - path: "src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts"
      provides: "Summary permission matrix tests"
      contains: "member, manager, admin"
    - path: "src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts"
      provides: "Usage chart permission matrix tests"
      contains: "member, manager, admin"
    - path: "src/Pages/__tests__/Member/MemberDashboardPage.test.ts"
      provides: "Inline error-state regression coverage"
      contains: "error"
    - path: "src/Pages/__tests__/Admin/AdminDashboardPage.test.ts"
      provides: "Admin live-total regression coverage"
      contains: "Admin/Dashboard/Index"
    - path: "tests/Unit/Foundation/LLMGateway/BifrostGatewayAdapter.test.ts"
      provides: "CamelCase normalization boundary coverage"
      contains: "inputTokens"
  key_links:
    - from: "GetDashboardSummaryService / GetUsageChartService"
      to: "shared visibility resolver"
      via: "single role-aware key-selection path"
      pattern: "createdByUserId === callerUserId"
    - from: "BifrostGatewayAdapter"
      to: "dashboard layer"
      via: "camelCase LogEntry DTOs"
      pattern: "inputTokens / outputTokens"
    - from: "MemberDashboardPage"
      to: "inline error props"
      via: "summary service failure response"
      pattern: "props.error"
---

<objective>
Implement the minimum phase 8 fix set for dashboard data correctness and permission scoping.

P1 is treated as a no-regression verification on the current admin dashboard wiring because the repository no longer contains the roadmap's legacy sample-data path.
P2 is treated as a normalization boundary verification because usage-log snake_case conversion is already owned by `BifrostGatewayAdapter`.
P3 is the real code change: MEMBER dashboard access must be self-scoped, while MANAGER and ADMIN remain org-wide.

Output: the dashboard services and tests prove that member, manager, and admin see the correct data scope, and member dashboard denial remains inline.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/08-data-correctness-permission-foundation/08-CONTEXT.md
@.planning/phases/08-data-correctness-permission-foundation/08-RESEARCH.md
@.planning/phases/08-data-correctness-permission-foundation/08-VALIDATION.md
@src/Modules/Organization/Application/Services/OrgAuthorizationHelper.ts
@src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts
@src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts
@src/Modules/Dashboard/Application/Services/GetUsageChartService.ts
@src/Modules/Dashboard/Infrastructure/Services/UsageAggregator.ts
@src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts

## Existing implementation facts

- `AdminDashboardPage` already renders live totals from `ListUsersService`, `ListOrganizationsService`, and `ListAdminContractsService`.
- `MemberDashboardPage` already keeps org-level failure inline by rendering `props.error` instead of redirecting or returning 403.
- `BifrostGatewayAdapter` already maps Bifrost snake_case log fields to camelCase `LogEntry` fields.
- `ApiKey` already stores `createdByUserId`, so member self-scoping can be implemented without a schema migration.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Build shared dashboard visibility resolution and apply it to summary + usage chart</name>
  <read_first>
    - src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts
    - src/Modules/Dashboard/Application/Services/GetUsageChartService.ts
    - src/Modules/Dashboard/Application/Services/DashboardKeyScopeResolver.ts
    - src/Modules/Organization/Application/Services/OrgAuthorizationHelper.ts
    - src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts
    - src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts
  </read_first>
  <files>
    src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts,
    src/Modules/Dashboard/Application/Services/GetUsageChartService.ts,
    src/Modules/Dashboard/Application/Services/DashboardKeyScopeResolver.ts
  </files>
  <behavior>
    Add a small shared helper in the Dashboard module that resolves visible API keys or visible key IDs from the active org key list and caller role.

    Rules:
    - MEMBER sees only keys where `createdByUserId === callerUserId`.
    - MANAGER and ADMIN see all active org keys.
    - Summary and usage chart use the same helper so they cannot drift.
    - Keep the existing inline error-state behavior for denied org access; do not add redirects or 403 responses here.
    - Do not change routes, schemas, or page-handler auth helpers.

    Use the existing `OrgAuthorizationHelper.requireOrgMembership(...)` result as the auth gate, then branch on the caller role for visibility.
  </behavior>
  <action>
    Update `GetDashboardSummaryService.execute(...)` and `GetUsageChartService.execute(...)` to:
    - load org membership as they do today,
    - resolve the allowed key set through the shared helper,
    - use only the allowed keys for totals and usage aggregation.

    If the planner/executor chooses to keep the helper private to Dashboard, it must still be shared by both services via one local source of truth.
  </action>
  <verify>
    <automated>bun test src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `GetDashboardSummaryService` and `GetUsageChartService` both use the same role-aware visible-key logic.
    - MEMBER requests only aggregate `ApiKey.createdByUserId === callerUserId`.
    - MANAGER and ADMIN requests continue to aggregate all active keys in the selected org.
    - No route files change.
    - No schema migration files change.
  </acceptance_criteria>
  <done>Summary and usage chart are role-aware and share the same visibility rule.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Lock the regression tests for P1, P2, and the inline member error-state</name>
  <read_first>
    - src/Pages/__tests__/Admin/AdminDashboardPage.test.ts
    - src/Pages/__tests__/Member/MemberDashboardPage.test.ts
    - tests/Unit/Foundation/LLMGateway/BifrostGatewayAdapter.test.ts
    - src/Modules/Dashboard/__tests__/UsageAggregator.test.ts
    - src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts
    - src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts
  </read_first>
  <files>
    src/Pages/__tests__/Admin/AdminDashboardPage.test.ts,
    src/Pages/__tests__/Member/MemberDashboardPage.test.ts,
    tests/Unit/Foundation/LLMGateway/BifrostGatewayAdapter.test.ts,
    src/Modules/Dashboard/__tests__/UsageAggregator.test.ts,
    src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts,
    src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts
  </files>
  <behavior>
    - Admin dashboard tests must prove the page still renders live totals from services.
    - No sample-data fallback should be added or reintroduced.
    - Member dashboard tests must keep the current inline error-state behavior for org-level failures.
    - Gateway adapter tests must continue proving camelCase `LogEntry` output from Bifrost snake_case fields.
    - UsageAggregator tests must continue proving empty-key short-circuit behavior and camelCase log consumption.
  </behavior>
  <action>
    Update or add assertions so the phase is locked by tests:
    - admin totals come from injected services,
    - member denial remains inline,
    - log mapping stays camelCase,
    - no hidden `sampleUsageData` or snake_case dashboard consumption remains.
  </action>
  <verify>
    <automated>bun test src/Pages/__tests__/Admin/AdminDashboardPage.test.ts src/Pages/__tests__/Member/MemberDashboardPage.test.ts tests/Unit/Foundation/LLMGateway/BifrostGatewayAdapter.test.ts src/Modules/Dashboard/__tests__/UsageAggregator.test.ts src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `AdminDashboardPage.test.ts` still asserts component `Admin/Dashboard/Index` and live totals from services.
    - `MemberDashboardPage.test.ts` still asserts inline `props.error` rendering on failure.
    - `BifrostGatewayAdapter.test.ts` still asserts camelCase `inputTokens`/`outputTokens`.
    - `UsageAggregator.test.ts` still asserts empty-key short-circuit behavior.
    - No test introduces a 403 expectation for member dashboard org failures.
  </acceptance_criteria>
  <done>Phase 8 regression tests lock the final behavior and normalization boundary.</done>
</task>

</tasks>
