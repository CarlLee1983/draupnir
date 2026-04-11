---
phase: 260411-qi1
plan: 01
subsystem: Auth
tags: [security, form-validation, device-flow, token-revocation, email-gate]
dependency_graph:
  requires: []
  provides:
    - FormRequest validation wired to all POST auth routes
    - VerifyDevicePage server-side device authorization
    - Token revocation on password reset
    - Production email transport gate
  affects:
    - src/Modules/Auth/Presentation/Requests/
    - src/Pages/routing/registerAuthPageRoutes.ts
    - src/Pages/Auth/VerifyDevicePage.ts
    - src/Modules/Auth/Application/Services/ResetPasswordService.ts
    - src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts
tech_stack:
  added: []
  patterns:
    - FormRequest class wired as second arg to router.post()
    - AuthMiddleware.getAuthContext() for server-side identity in Page handlers
    - Token revocation after credential change (defense-in-depth)
    - Environment-gated service binding (throw at startup in production)
key_files:
  created:
    - src/Modules/Auth/Presentation/Requests/ForgotPasswordRequest.ts
    - src/Modules/Auth/Presentation/Requests/ResetPasswordRequest.ts
    - src/Modules/Auth/Presentation/Requests/VerifyDeviceRequest.ts
  modified:
    - src/Pages/routing/registerAuthPageRoutes.ts
    - src/Pages/Auth/VerifyDevicePage.ts
    - src/Pages/routing/auth/registerAuthPageBindings.ts
    - src/Modules/Auth/Application/Services/ResetPasswordService.ts
    - src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts
    - src/Pages/__tests__/Auth/VerifyDevicePage.test.ts
    - src/Pages/__tests__/Auth/VerifyDevicePageFlow.integration.test.ts
    - src/Modules/Auth/__tests__/ResetPasswordService.test.ts
decisions:
  - FormRequest classes are imported directly (not via dynamic container resolve) in registerAuthPageRoutes.ts for simplicity and type safety
  - revokeAllByUserId is called before markUsed so a crash during markUsed still invalidates all sessions
  - EMAIL_TRANSPORT_CONFIGURED=true is the production escape hatch rather than checking for specific env vars, preserving flexibility for future email transports
metrics:
  duration: ~15 minutes
  completed: "2026-04-11T11:13:33Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 11
---

# Phase 260411-qi1 Plan 01: Adversarial Review — Auth Routes FormRequest Summary

**One-liner:** Wired Zod FormRequest validators to all 5 POST auth routes, replaced stubbed device-flow handler with real AuthorizeDeviceService call, added token revocation after password reset, and gated ConsoleEmailService from production startup.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add missing FormRequest classes and wire to POST routes | 93f9f77 | ForgotPasswordRequest.ts, ResetPasswordRequest.ts, VerifyDeviceRequest.ts, registerAuthPageRoutes.ts |
| 2 | Fix VerifyDevicePage.authorize() to call AuthorizeDeviceService server-side | b6f692e | VerifyDevicePage.ts, registerAuthPageBindings.ts, VerifyDevicePage.test.ts, VerifyDevicePageFlow.integration.test.ts |
| 3 | Revoke tokens on password reset and gate email service for production | eac62f1 | ResetPasswordService.ts, AuthServiceProvider.ts, ResetPasswordService.test.ts |

## Verification Results

- Full auth test suite: **88 pass, 1 skip, 0 fail** (89 tests across 27 files)
- TypeScript: **clean** (no errors in modified files; pre-existing CliTestClient.ts errors unrelated to this plan)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All four issues identified in the adversarial review have been fully resolved:
1. POST routes now receive validated body from FormRequest (not undefined)
2. VerifyDevicePage.authorize() calls AuthorizeDeviceService.execute() with real service response
3. ResetPasswordService revokes all active tokens after successful password reset
4. AuthServiceProvider throws at startup when NODE_ENV=production and EMAIL_TRANSPORT_CONFIGURED is not 'true'

## Self-Check: PASSED

Files created/exist:
- src/Modules/Auth/Presentation/Requests/ForgotPasswordRequest.ts: FOUND
- src/Modules/Auth/Presentation/Requests/ResetPasswordRequest.ts: FOUND
- src/Modules/Auth/Presentation/Requests/VerifyDeviceRequest.ts: FOUND

Commits exist:
- 93f9f77: FOUND
- b6f692e: FOUND
- eac62f1: FOUND
