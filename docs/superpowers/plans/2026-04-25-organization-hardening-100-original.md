# Organization Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Organization module test hardening to 100% acceptance coverage, specifically focusing on the full API access control matrix and member management edge cases.

**Architecture:** Use the Acceptance-First TDD pattern to verify business rules across the API and UseCase layers. Leverage `TestApp` for real DB, DI, and HTTP request simulation without mocking internal services.

**Tech Stack:** Vitest, Bun, Atlas ORM (via `TestApp` seeders).

---

## File Structure Changes

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `tests/Acceptance/ApiContract/organization-endpoints.spec.ts` | Complete role matrix coverage for all organization endpoints. |
| Modify | `tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts` | Add missing edge cases for member removal and role promotion/demotion. |
| Modify | `tests/Acceptance/UseCases/Organization/access-control.spec.ts` | Enhance cross-tenant isolation tests. |

---

## Task 1: Complete API Access Control Matrix

**Files:**
- Modify: `tests/Acceptance/ApiContract/organization-endpoints.spec.ts`

- [ ] **Step 1: Add GET /api/organizations/:id/members matrix**
    - Test successful list for Admin.
    - Test successful list for Org Manager.
    - Test successful list for Org Member.
    - Test 403 for non-member.
    - Test 401 for unauthorized.

- [ ] **Step 2: Add POST /api/organizations/:id/invitations matrix**
    - Test success for Admin.
    - Test success for Org Manager.
    - Test 403 for Org Member.
    - Test 403 for non-member.

- [ ] **Step 3: Add DELETE /api/organizations/:id/invitations/:invId matrix**
    - Test success for Admin.
    - Test success for Org Manager.
    - Test 403 for Org Member.
    - Test 403 for non-member.

- [ ] **Step 4: Add DELETE /api/organizations/:id/members/:userId matrix**
    - Test success for Admin (removing anyone).
    - Test success for Org Manager (removing member).
    - Test 403 for Org Manager (removing other manager).
    - Test 403 for Org Member.

- [ ] **Step 5: Run tests and verify results**
    Run: `bun test tests/Acceptance/ApiContract/organization-endpoints.spec.ts`

- [ ] **Step 6: Commit**
    ```bash
    git add tests/Acceptance/ApiContract/organization-endpoints.spec.ts
    git commit -m "test: complete organization api access control matrix"
    ```

---

## Task 2: Harden Member Lifecycle Edge Cases

**Files:**
- Modify: `tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts`

- [ ] **Step 1: Test "Manager cannot remove themselves"**
    - Scenario: Org Manager attempts to DELETE their own membership.
    - Expected: 400 Bad Request with error 'CANNOT_REMOVE_SELF'.

- [ ] **Step 2: Test "Manager cannot demote themselves"**
    - Scenario: Org Manager attempts to PATCH their own role to 'member'.
    - Expected: 400 Bad Request with error 'CANNOT_DEMOTE_SELF'.

- [ ] **Step 3: Test "Admin can remove the last Manager"**
    - Scenario: System Admin attempts to DELETE the membership of the only Manager in an organization.
    - Expected: 200 OK (Admins have full override power to clean up/archive orgs).

- [ ] **Step 4: Run tests and verify results**
    Run: `bun test tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts`

- [ ] **Step 5: Commit**
    ```bash
    git add tests/Acceptance/UseCases/Organization/member-lifecycle.spec.ts
    git commit -m "test: add organization member lifecycle edge cases"
    ```

---

## Task 3: Enhance Cross-Tenant Isolation

**Files:**
- Modify: `tests/Acceptance/UseCases/Organization/access-control.spec.ts`

- [ ] **Step 1: Test "Member of Org A cannot invite to Org B"**
    - Scenario: User is 'manager' of Org A, attempts POST to `/api/organizations/org-b/invitations`.
    - Expected: 403 Forbidden with error 'NOT_ORG_MEMBER'.

- [ ] **Step 2: Test "Member of Org A cannot list members of Org B"**
    - Scenario: User is 'member' of Org A, attempts GET to `/api/organizations/org-b/members`.
    - Expected: 403 Forbidden with error 'NOT_ORG_MEMBER'.

- [ ] **Step 3: Test "Member of Org A cannot remove member of Org B"**
    - Scenario: User is 'manager' of Org A, attempts DELETE to `/api/organizations/org-b/members/any-user`.
    - Expected: 403 Forbidden with error 'NOT_ORG_MEMBER'.

- [ ] **Step 4: Run tests and verify results**
    Run: `bun test tests/Acceptance/UseCases/Organization/access-control.spec.ts`

- [ ] **Step 5: Commit**
    ```bash
    git add tests/Acceptance/UseCases/Organization/access-control.spec.ts
    git commit -m "test: enhance organization cross-tenant isolation coverage"
    ```

---

## Task 4: Final Verification

- [ ] **Step 1: Run all organization acceptance tests**
    Run: `bun test tests/Acceptance/UseCases/Organization/ tests/Acceptance/ApiContract/organization-endpoints.spec.ts`

- [ ] **Step 2: Run typecheck**
    Run: `bun run typecheck`

- [ ] **Step 3: Final Commit**
    ```bash
    git commit --allow-empty -m "test: organization module hardening 100% complete"
    ```
