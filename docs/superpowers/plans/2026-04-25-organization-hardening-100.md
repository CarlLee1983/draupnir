# Organization Hardening Implementation Plan (Expanded)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Organization module test hardening to 100% acceptance coverage, focusing on the full API access control matrix and member management edge cases. Includes the **production-code adjustments** required to make `CANNOT_DEMOTE_SELF` and the admin "remove last manager" override behave as intended.

**Architecture:** Acceptance-First TDD. Production code changes (Task 0/0.5) ship with both unit tests (`bun:test` mocks) and acceptance tests (`TestApp` real DB + DI + HTTP).

**Tech Stack:** Vitest, Bun, Atlas ORM (via `TestApp` seeders).

---

## Scope clarification (vs. the original plan)

The original plan implied two test cases that **do not match current production code**:

1. `Manager cannot demote themselves` (`CANNOT_DEMOTE_SELF`) — no such check exists in `ChangeOrgMemberRoleService`.
2. `Admin can remove the last Manager` (200 OK) — `RemoveMemberService` currently rejects this for **every** requester via `OrgMembershipRules.assertNotLastManager`, and an existing acceptance test (`member-lifecycle.spec.ts:179-184`) pins the rejection.

To honor the user's stated intent, the expanded plan adds **Task 0** and **Task 0.5** to make the production code match the desired contract, plus a step in Task 2 to fix the now-conflicting acceptance test.

**Out-of-scope decisions (locked in):**
- Demotion of last manager remains rejected for *all* requesters (including admin). Only **removal** (org cleanup) gets an admin override.
- Self-demotion is rejected only when the demotion is from `manager` → non-`manager`. Self-promotion or no-op writes are not considered self-demotion.

---

## File Structure Changes

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/Modules/Organization/Application/Services/ChangeOrgMemberRoleService.ts` | Accept `requesterId`; reject self-demotion with `CANNOT_DEMOTE_SELF`. |
| Modify | `src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts` | Update existing tests to new signature; add self-demotion coverage. |
| Modify | All call sites of `ChangeOrgMemberRoleService.execute` | Pass requester id (likely `OrganizationController`). |
| Modify | `src/Modules/Organization/Application/Services/RemoveMemberService.ts` | Allow system-admin requester to remove the last manager. |
| Modify | `src/Modules/Organization/__tests__/RemoveMemberService.test.ts` | Flip the "admin removes last manager" expectation to success; add explicit non-admin rejection. |
| Modify | `tests/Acceptance/ApiContract/organization-endpoints.spec.ts` | Complete role matrix coverage for all organization endpoints. |
| Modify | `tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts` | Add self-removal/self-demotion/admin-override tests; **drop** the now-stale admin-removal-rejection assertion. |
| Modify | `tests/Acceptance/UseCases/Organization/access-control.spec.ts` | Enhance cross-tenant isolation tests. |

---

## Task 0: Production code — add `CANNOT_DEMOTE_SELF`

**Files:**
- Modify: `src/Modules/Organization/Application/Services/ChangeOrgMemberRoleService.ts`
- Modify: `src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts`
- Modify: any call sites of `ChangeOrgMemberRoleService.execute(...)` (e.g. `OrganizationController`).

- [ ] **Step 1: Add a failing unit test (RED)**
    - In `ChangeOrgMemberRoleService.test.ts`, add a test: when `targetUserId === requesterId` and target is currently `manager` being changed to `member`, expect `result.success === false` and `result.error === 'CANNOT_DEMOTE_SELF'`.
    - The test will fail (or fail to compile if signature changed first).

- [ ] **Step 2: Update the service signature**
    - Change `execute(orgId, targetUserId, newRole)` to `execute(orgId, targetUserId, newRole, requesterId)` in `ChangeOrgMemberRoleService.ts`.
    - Add a self-demotion check **before** any DB work: if `targetUserId === requesterId`, look up the current member, and if `member.isManager() && !newRoleVO.isManager()`, return `{ success: false, message: 'Cannot demote yourself', error: 'CANNOT_DEMOTE_SELF' }`.
    - Keep all existing branches (last-manager guard, role sync) intact.

- [ ] **Step 3: Update existing unit tests for new signature**
    - All `service.execute('org-1', 'user-mem-1', 'manager'|'member')` calls in `ChangeOrgMemberRoleService.test.ts` need a 4th arg. Use a sentinel like `'requester-id'` distinct from the `user-${id}` of the target so existing tests stay green.
    - Verify the new "self-demotion" test goes GREEN.

- [ ] **Step 4: Update call sites**
    - Search: `rg "ChangeOrgMemberRoleService" src/ --type ts`
    - Each caller (likely the controller in `src/Modules/Organization/Presentation/Controllers/`) must pass the authenticated requester's id. Read the request user from the existing pattern (other controllers nearby do this).
    - If the route is wired through dispatcher/middleware, ensure the requester id is already available; do not introduce new context plumbing.

- [ ] **Step 5: Run service unit tests**
    Run: `bun test src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts`

- [ ] **Step 6: Commit**
    ```bash
    git add src/Modules/Organization/Application/Services/ChangeOrgMemberRoleService.ts src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts <controller-files>
    git commit -m "feat: [organization] reject self-demotion with CANNOT_DEMOTE_SELF"
    ```

---

## Task 0.5: Production code — admin override for last-manager removal

**Files:**
- Modify: `src/Modules/Organization/Application/Services/RemoveMemberService.ts`
- Modify: `src/Modules/Organization/__tests__/RemoveMemberService.test.ts`

- [ ] **Step 1: Add a failing unit test (RED)**
    - In `RemoveMemberService.test.ts`, add a test: admin (`requesterSystemRole='admin'`, requester id ≠ target manager id) removes the only manager → `result.success === true`.
    - Note: existing test at line 98 currently expects `CANNOT_REMOVE_LAST_MANAGER` for admin requester. That test must be updated (Step 3).

- [ ] **Step 2: Implement admin override**
    - In `RemoveMemberService.execute`, around the `if (member.isManager())` last-manager guard, skip `OrgMembershipRules.assertNotLastManager(...)` when `requesterSystemRole === 'admin'`.
    - Keep the self-removal guard (`CANNOT_REMOVE_SELF`) and the rest of the flow unchanged.
    - Domain rule (`OrgMembershipRules.assertNotLastManager`) stays pure — the admin override is an application-layer policy decision.

- [ ] **Step 3: Update existing "admin cannot remove last manager" unit test**
    - The existing test (`RemoveMemberService.test.ts:98-102`) "不能移除最後一個 Manager" passes `'admin'` as `requesterSystemRole` and expects `CANNOT_REMOVE_LAST_MANAGER`. Flip its expectation: admin → success. Add a sibling test using a non-admin manager requester scenario where rejection is reachable; if no realistic scenario is reachable through the service's auth path, document the gap and rely on the domain-rule unit tests + acceptance tests for the rejection contract.

- [ ] **Step 4: Run service unit tests**
    Run: `bun test src/Modules/Organization/__tests__/RemoveMemberService.test.ts`

- [ ] **Step 5: Commit**
    ```bash
    git add src/Modules/Organization/Application/Services/RemoveMemberService.ts src/Modules/Organization/__tests__/RemoveMemberService.test.ts
    git commit -m "feat: [organization] admin can override last-manager removal guard"
    ```

---

## Task 1: Complete API Access Control Matrix

**Files:**
- Modify: `tests/Acceptance/ApiContract/organization-endpoints.spec.ts`

- [ ] **Step 1: Add `GET /api/organizations/:id/members` matrix**
    - Successful list for Admin.
    - Successful list for Org Manager.
    - Successful list for Org Member.
    - 403 for non-member (assert `error === 'NOT_ORG_MEMBER'`).
    - 401 for unauthorized.

- [ ] **Step 2: Add `POST /api/organizations/:id/invitations` matrix**
    - Success for Admin.
    - Success for Org Manager.
    - 403 for Org Member.
    - 403 for non-member.

- [ ] **Step 3: Add `DELETE /api/organizations/:id/invitations/:invId` matrix**
    - Success for Admin.
    - Success for Org Manager.
    - 403 for Org Member.
    - 403 for non-member.

- [ ] **Step 4: Add `DELETE /api/organizations/:id/members/:userId` matrix**
    - Success for Admin (removing anyone, including non-last manager).
    - Success for Org Manager (removing a member).
    - 403 for Org Manager attempting to remove another manager.
    - 403 for Org Member.
    - **Note:** the "admin removes last manager" case is covered in Task 2 Step 3 (lifecycle test).

- [ ] **Step 5: Run tests**
    Run: `bun test tests/Acceptance/ApiContract/organization-endpoints.spec.ts`

- [ ] **Step 6: Commit**
    ```bash
    git add tests/Acceptance/ApiContract/organization-endpoints.spec.ts
    git commit -m "test: [organization] complete api access control matrix"
    ```

---

## Task 2: Harden Member Lifecycle Edge Cases

**Files:**
- Modify: `tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts`

- [ ] **Step 1: Add "Manager cannot remove themselves"**
    - Manager DELETEs their own membership.
    - Expect 400 with `error === 'CANNOT_REMOVE_SELF'`.

- [ ] **Step 2: Add "Manager cannot demote themselves"**
    - Manager PATCHes their own role to `'member'`.
    - Expect 400 with `error === 'CANNOT_DEMOTE_SELF'` (provided by Task 0).

- [ ] **Step 3: Add "Admin can remove the last Manager"**
    - Admin DELETEs the membership of the only Manager in an org.
    - Expect 200 OK; verify the row is gone in DB (`organization_members` no longer has the manager).
    - Verify the now-orphaned ex-manager's system role decay still runs (their `users.role` should be downgraded to `member` if they aren't a manager elsewhere) — copy the assertion pattern from the existing "removes a member and clears any API key assignment first" test.

- [ ] **Step 4: Update the existing "refuses to demote or remove the last manager" test**
    - Path: `tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts` (the `it('refuses to demote or remove the last manager', ...)` block, around lines 146–185).
    - **Keep** the demotion assertion (admin still can't demote last manager → `CANNOT_DEMOTE_LAST_MANAGER`).
    - **Remove** the admin-removal assertion (lines around 179–184) — this contract is replaced by Step 3 above.
    - Rename the test to "refuses to demote the last manager (even for admin)" to reflect the narrowed scope.

- [ ] **Step 5: Run tests**
    Run: `bun test tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts`

- [ ] **Step 6: Commit**
    ```bash
    git add tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts
    git commit -m "test: [organization] add member lifecycle edge cases and admin override"
    ```

---

## Task 3: Enhance Cross-Tenant Isolation

**Files:**
- Modify: `tests/Acceptance/UseCases/Organization/access-control.spec.ts`

- [ ] **Step 1: Add "Member of Org A cannot invite to Org B"**
    - User is `manager` of Org A; POSTs to `/api/organizations/<orgB>/invitations`.
    - Expect 403 with `error === 'NOT_ORG_MEMBER'`.

- [ ] **Step 2: Add "Member of Org A cannot list members of Org B"**
    - User is `member` of Org A; GETs `/api/organizations/<orgB>/members`.
    - Expect 403 with `error === 'NOT_ORG_MEMBER'`.

- [ ] **Step 3: Add "Member of Org A cannot remove member of Org B"**
    - User is `manager` of Org A; DELETEs `/api/organizations/<orgB>/members/<any-user>`.
    - Expect 403 with `error === 'NOT_ORG_MEMBER'`.

- [ ] **Step 4: Run tests**
    Run: `bun test tests/Acceptance/UseCases/Organization/access-control.spec.ts`

- [ ] **Step 5: Commit**
    ```bash
    git add tests/Acceptance/UseCases/Organization/access-control.spec.ts
    git commit -m "test: [organization] enhance cross-tenant isolation coverage"
    ```

---

## Task 4: Final Verification

- [ ] **Step 1: Run all organization acceptance tests**
    Run: `bun test tests/Acceptance/UseCases/Organization/ tests/Acceptance/ApiContract/organization-endpoints.spec.ts`

- [ ] **Step 2: Run all organization unit tests**
    Run: `bun test src/Modules/Organization/__tests__/`

- [ ] **Step 3: Run typecheck**
    Run: `bun run typecheck`

- [ ] **Step 4: Final empty-commit milestone marker**
    ```bash
    git commit --allow-empty -m "test: [organization] module hardening 100% complete"
    ```

---

## Notes & Risk Register

- **Domain rule purity (Task 0.5):** the admin override lives in the application service, not the domain rule. This keeps `OrgMembershipRules.assertNotLastManager` reusable for any caller that does not have an admin escape hatch (e.g. background jobs).
- **Self-demotion check ordering (Task 0):** the check runs before DB work and before the last-manager guard. If the requester self-demotes the only manager seat in the org, they will see `CANNOT_DEMOTE_SELF` (not `CANNOT_DEMOTE_LAST_MANAGER`). This is the intended UX hint.
- **Controller wiring (Task 0 Step 4):** if no controller currently has the requester's id readily available for `changeMemberRole`, prefer reading from the same auth context other controllers use (e.g. `req.user.id`). Do not introduce new middleware.
- **Acceptance smoke run:** Task 4 Step 1's combined run is the canonical green-bar gate before declaring the slice done.
