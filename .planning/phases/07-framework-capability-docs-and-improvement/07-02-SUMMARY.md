---
phase: 07-framework-capability-docs-and-improvement
plan: 02
subsystem: Pages + Credit
tags: [testing, unit-tests, i18n, admin-pages, credit]
dependencies:
  requires:
    - src/Pages/Admin/*.ts
    - src/Modules/Credit/Application/Services/HandleCreditToppedUpService.ts
    - src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts
    - src/Shared/Infrastructure/I18n/*
  provides:
    - src/Pages/__tests__/Admin/*.test.ts
    - src/Pages/__tests__/Admin/AdminContractCreatePage.test.ts
    - src/Modules/Credit/__tests__/HandleCreditToppedUpService.test.ts
affects:
  - Admin page handler test fixtures
  - Credit failure-path verification
  - Phase 7 verification readiness
key_files:
  modified:
    - src/Pages/__tests__/Admin/AdminDashboardPage.test.ts
    - src/Pages/__tests__/Admin/AdminApiKeysPage.test.ts
    - src/Pages/__tests__/Admin/AdminContractsPage.test.ts
    - src/Pages/__tests__/Admin/AdminContractDetailPage.test.ts
    - src/Pages/__tests__/Admin/AdminModuleCreatePage.test.ts
    - src/Pages/__tests__/Admin/AdminModulesPage.test.ts
    - src/Pages/__tests__/Admin/AdminOrganizationDetailPage.test.ts
    - src/Pages/__tests__/Admin/AdminOrganizationsPage.test.ts
    - src/Pages/__tests__/Admin/AdminUserDetailPage.test.ts
    - src/Pages/__tests__/Admin/AdminUsersPage.test.ts
    - src/Pages/__tests__/Admin/AdminContractCreatePage.test.ts
  verified:
    - src/Modules/Credit/__tests__/HandleCreditToppedUpService.test.ts
    - src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts
duration: 18min
completed: 2026-04-11
---

# Phase 07 Plan 02 Summary

**Objective:** Stabilize the admin page test fixtures, align the adjacent contract-create i18n test, and verify the credit failure-path behavior.

## What Changed

- Reworked the admin page test helpers to inject `inertia:shared` through an explicit in-memory store.
- Standardized the admin page fixtures so they now provide:
  - `locale: 'en'`
  - `messages: loadMessages('en')`
  - `auth.user` metadata
  - `currentOrgId: null`
  - `flash: {}`
- Updated `AdminContractCreatePage.test.ts` to use the same i18n fixture pattern and to assert the English catalog message:
  - `Please fill in all required fields, including target and terms`
- Verified `HandleCreditToppedUpService.test.ts` still passes with the gateway failure path.
- Verified `HandleBalanceDepletedService.ts` already uses English log strings, so no translation edit was needed in this workspace.

## Verification

Executed:

```bash
bun test src/Modules/Credit/__tests__/HandleCreditToppedUpService.test.ts src/Pages/__tests__/Admin/Admin*.test.ts
```

Result:

- 53 pass
- 0 fail
- 13 files covered

## Notes

- The credit service failure test still emits the expected console error from the service catch block, but it no longer fails the suite.
- This plan is ready for the wave 2 API standardization work.
