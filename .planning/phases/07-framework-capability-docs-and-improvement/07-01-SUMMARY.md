---
phase: 07-framework-capability-docs-and-improvement
plan: 01
subsystem: Pages + i18n
tags: [testing, unit-tests, i18n, member-pages]
dependencies:
  requires:
    - src/Pages/SharedDataMiddleware.ts
    - src/Shared/Infrastructure/I18n/*
  provides:
    - src/Pages/__tests__/Member/*.test.ts
affects:
  - Member page handler test fixtures
  - Phase 7 i18n readiness
key_files:
  modified:
    - src/Pages/__tests__/Member/MemberDashboardPage.test.ts
    - src/Pages/__tests__/Member/MemberApiKeysPage.test.ts
    - src/Pages/__tests__/Member/MemberContractsPage.test.ts
    - src/Pages/__tests__/Member/MemberSettingsPage.test.ts
    - src/Pages/__tests__/Member/MemberUsagePage.test.ts
    - src/Pages/__tests__/Member/MemberApiKeyCreatePage.test.ts
duration: 17min
completed: 2026-04-11
---

# Phase 07 Plan 01 Summary

**Objective:** Inject `inertia:shared` i18n fixtures into member page tests so the page handlers resolve catalog messages correctly.

## What Changed

- Added `loadMessages('en')` fixtures to the shared mock context helper in all 6 member page tests.
- Ensured the member page tests now provide:
  - `locale: 'en'`
  - `messages: loadMessages('en')`
  - `auth.user` metadata
  - `currentOrgId: null`
  - `flash: {}`
- Updated the member page assertions to expect catalog-driven English output such as:
  - `Please select an organization first`
  - `Failed to load API keys`
  - `Failed to load contracts`
  - `Failed to load profile`
  - `Failed to load usage`

## Verification

Executed:

```bash
bun test src/Pages/__tests__/Member/MemberDashboardPage.test.ts src/Pages/__tests__/Member/MemberApiKeysPage.test.ts src/Pages/__tests__/Member/MemberContractsPage.test.ts src/Pages/__tests__/Member/MemberSettingsPage.test.ts src/Pages/__tests__/Member/MemberUsagePage.test.ts src/Pages/__tests__/Member/MemberApiKeyCreatePage.test.ts
```

Result:

- 24 pass
- 0 fail
- 6 files covered

## Notes

- The member page tests still include a few intentional Chinese strings in mocked service failure cases, but the rendered page output now comes from the English catalog when `locale: 'en'` is injected.
