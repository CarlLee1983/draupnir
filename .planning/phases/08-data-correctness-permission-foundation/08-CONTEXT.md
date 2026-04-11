# Phase 8: Data Correctness & Permission Foundation - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 is the prerequisite fix phase for the v1.2 dashboard work. It closes the current data-correctness and permission gaps before the chart-heavy phases begin.

**In scope:**
- Remove any remaining hardcoded sample data from dashboard pages
- Normalize usage-log DTO field names so charts receive real token counts
- Enforce dashboard access scope by role, especially for MEMBER vs MANAGER/ADMIN

**Explicitly not in scope:**
- New dashboard chart types
- New reporting/export features
- Any route changes
- Any schema migration
</domain>

<decisions>
## Locked Preferences

### D-01: MEMBER dashboard visibility is self-scoped

- On the member dashboard, a MEMBER may only see API keys and summary data that belong to the caller within the selected organization.
- MEMBER must not receive org-wide dashboard data for other members' keys.
- This applies to both the dashboard summary and any related member-dashboard usage presentation.

### D-02: MANAGER and ADMIN keep org-wide visibility

- A MANAGER may view org-wide dashboard data for the selected organization.
- An ADMIN may also view org-wide dashboard data for the selected organization.
- No separate per-user restriction applies to MANAGER/ADMIN on the dashboard surface.

### D-03: Denied org access stays inline on the member dashboard

- If the member dashboard fails org-level access checks, the page keeps the current inline error-state behavior.
- Do not replace that behavior with a `403` response or redirect.
- This preserves the current page flow and keeps the failure visible inside the dashboard surface.
</decisions>

<specifics>
## Notes

- The current codebase already uses page-handler classes for dashboards, not legacy page components under `src/Pages/Admin/Dashboard/Index.tsx`.
- Existing page auth helpers already follow a split pattern:
  - anonymous users are redirected to `/login`
  - non-admin admin-page access returns a `403`
  - member-page org failures can render inline error props
- The phase 8 work should align the application-layer dashboard services with the role behavior above, without widening the phase scope.
</specifics>

<deferred>
## Deferred Ideas

- None captured for phase 8 during this discussion.
</deferred>

<next_steps>
## Next Step

Proceed to `/gsd-plan-phase 8` using these locked preferences as the behavioral contract for planning.
</next_steps>
