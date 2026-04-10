---
phase: 6
slug: pages
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test (built-in to Bun 1.3.10) |
| **Config file** | `bunfig.toml` (implicit) |
| **Quick run command** | `bun test src/Pages` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test src/Pages`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | PAGE-01 | unit | `bun test src/Pages/__tests__/Admin` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | PAGE-02 | unit | `bun test src/Pages/__tests__/Member` | ❌ W0 | ⬜ pending |
| 06-01-03 | 01 | 1 | PAGE-03 | unit | `bun test src/Pages` | ❌ W0 | ⬜ pending |
| 06-01-04 | 01 | 1 | PAGE-04 | unit | `bun test src/Pages` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | PAGE-05 | integration | `bun test tests/Feature/routes-existence.test.ts` | ✅ (needs additions) | ⬜ pending |
| 06-01-05 | 01 | 1 | PAGE-06 | unit | `bun test src/Pages` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/Pages/__tests__/Admin/AdminDashboardPage.test.ts` — stubs for PAGE-01, PAGE-03, PAGE-04
- [ ] `src/Pages/__tests__/Admin/AdminUsersPage.test.ts` — stubs for PAGE-01, PAGE-03, PAGE-04
- [ ] `src/Pages/__tests__/Admin/AdminUserDetailPage.test.ts` — stubs for PAGE-01, PAGE-03, PAGE-04, PAGE-06
- [ ] `src/Pages/__tests__/Admin/AdminOrganizationsPage.test.ts` — stubs for PAGE-01, PAGE-03, PAGE-04
- [ ] `src/Pages/__tests__/Admin/AdminOrganizationDetailPage.test.ts` — stubs for PAGE-01, PAGE-03, PAGE-04
- [ ] `src/Pages/__tests__/Admin/AdminContractsPage.test.ts` — stubs for PAGE-01, PAGE-03, PAGE-04
- [ ] `src/Pages/__tests__/Admin/AdminContractCreatePage.test.ts` — stubs for PAGE-01, PAGE-03, PAGE-04, PAGE-06
- [ ] `src/Pages/__tests__/Admin/AdminContractDetailPage.test.ts` — stubs for PAGE-01, PAGE-03, PAGE-04, PAGE-06
- [ ] `src/Pages/__tests__/Admin/AdminModulesPage.test.ts` — stubs for PAGE-01, PAGE-03, PAGE-04
- [ ] `src/Pages/__tests__/Admin/AdminModuleCreatePage.test.ts` — stubs for PAGE-01, PAGE-03, PAGE-04, PAGE-06
- [ ] `src/Pages/__tests__/Admin/AdminApiKeysPage.test.ts` — stubs for PAGE-01, PAGE-03, PAGE-04
- [ ] `src/Pages/__tests__/Admin/AdminUsageSyncPage.test.ts` — stubs for PAGE-01, PAGE-03, PAGE-04
- [ ] `src/Pages/__tests__/Member/MemberDashboardPage.test.ts` — stubs for PAGE-02, PAGE-03
- [ ] `src/Pages/__tests__/Member/MemberApiKeysPage.test.ts` — stubs for PAGE-02, PAGE-03
- [ ] `src/Pages/__tests__/Member/MemberApiKeyCreatePage.test.ts` — stubs for PAGE-02, PAGE-03, PAGE-06
- [ ] `src/Pages/__tests__/Member/MemberApiKeyRevokeHandler.test.ts` — stubs for PAGE-02, PAGE-03, PAGE-06
- [ ] `src/Pages/__tests__/Member/MemberUsagePage.test.ts` — stubs for PAGE-02, PAGE-03
- [ ] `src/Pages/__tests__/Member/MemberContractsPage.test.ts` — stubs for PAGE-02, PAGE-03
- [ ] `src/Pages/__tests__/Member/MemberSettingsPage.test.ts` — stubs for PAGE-02, PAGE-03, PAGE-06

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Inertia page renders correctly in browser | PAGE-01/02 | Requires Vite build + client-side JS | Navigate to /admin/dashboard and /member/dashboard with dev server running |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
