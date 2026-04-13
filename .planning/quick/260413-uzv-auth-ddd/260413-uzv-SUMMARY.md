---
phase: 260413-uzv-auth-ddd
plan: "01"
subsystem: Auth
tags: [ddd, immutability, refactor, clean-architecture]
dependency_graph:
  requires: []
  provides: [immutable-user-aggregate, IGoogleOAuthAdapter-port, sha256-utility]
  affects: [Auth]
tech_stack:
  added: []
  patterns: [immutable-aggregate, dependency-inversion, shared-utility-extraction]
key_files:
  created:
    - src/Modules/Auth/Application/Ports/IGoogleOAuthAdapter.ts
    - src/Modules/Auth/Application/Utils/sha256.ts
  modified:
    - src/Modules/Auth/Domain/Aggregates/User.ts
    - src/Modules/Auth/Application/Services/ChangeUserStatusService.ts
    - src/Modules/Auth/Application/Services/GoogleOAuthService.ts
    - src/Modules/Auth/Application/Services/LoginUserService.ts
    - src/Modules/Auth/Application/Services/LogoutUserService.ts
    - src/Modules/Auth/Application/Services/RefreshTokenService.ts
    - src/Modules/Auth/Application/Services/ResetPasswordService.ts
    - src/Modules/Auth/Domain/Repositories/IAuthRepository.ts
    - src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts
    - src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts
    - src/Modules/Auth/__tests__/User.test.ts
    - src/Modules/Auth/__tests__/LoginUserService.test.ts
    - src/Modules/Auth/__tests__/ListUsersService.test.ts
    - src/Modules/Auth/__tests__/ResetPasswordService.test.ts
decisions:
  - "suspend()/activate() now return new User instead of void — callers must capture result"
  - "IGoogleOAuthAdapter port defined in Application layer; Infrastructure adapter implements it"
  - "sha256 extracted to Application/Utils/sha256.ts as single source of truth"
  - "IAuthRepository.updatePassword removed — password changes go through withPassword+save"
  - "UserStatus limited to ACTIVE and SUSPENDED (INACTIVE removed)"
  - "Token record IDs use crypto.randomUUID() instead of date-string concatenation"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-04-13"
  tasks_completed: 3
  files_changed: 14
---

# Phase 260413-uzv Plan 01: Auth DDD Tactical Design Fixes Summary

**One-liner:** Immutable User aggregate with withStatus/withGoogleId factories, IGoogleOAuthAdapter port, shared sha256 utility, and UserStatus pruned to ACTIVE+SUSPENDED.

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | P0 — User Aggregate 不可變性 + IGoogleOAuthAdapter Port | eea848d | User.ts immutable methods; IGoogleOAuthAdapter.ts created; GoogleOAuthService updated to use port |
| 2 | P1+P2 — Remove updatePassword, extract sha256, fix token IDs | 954e513 | sha256.ts extracted; IAuthRepository/AuthRepository updatePassword removed; ResetPasswordService uses withPassword+save; Login/Logout/Refresh use shared sha256 and randomUUID token IDs |
| 3 | P3 — Remove UserStatus.INACTIVE | 6bdb5c8 | UserStatus enum trimmed to ACTIVE+SUSPENDED; AuthRepository.mapStatus INACTIVE case removed |

## Success Criteria Verified

1. `User.ts` — zero void-returning state-mutation methods; all state changes return new User instances. **PASS**
2. `GoogleOAuthService.ts` — imports `IGoogleOAuthAdapter` from Application/Ports. **PASS**
3. `IAuthRepository.ts` — no `updatePassword` method. **PASS**
4. `sha256.ts` — single source of truth; three services import from it. **PASS**
5. Token record IDs — all use `crypto.randomUUID()`. **PASS**
6. `UserStatus` — only `ACTIVE` and `SUSPENDED` remain. **PASS**
7. `npx tsc --noEmit` exits 0. **PASS**
8. Existing Auth test suite remains green (67 pass, 0 fail). **PASS**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated test mocks broken by immutable User API**
- **Found during:** Task 3 verification (bun test run)
- **Issue:** `User.suspend()` and `User.activate()` now return `new User` instead of `void`. Three test files called these methods and checked `user.status` on the original (unchanged) variable. `ResetPasswordService.test.ts` mocked `authRepository.updatePassword` which no longer exists on the interface.
- **Fix:** Updated four test files to capture returned User values and use `save` mock instead of `updatePassword` mock.
- **Files modified:** `User.test.ts`, `LoginUserService.test.ts`, `ListUsersService.test.ts`, `ResetPasswordService.test.ts`
- **Commit:** 7e98723

## Known Stubs

None.

## Self-Check: PASSED

- `src/Modules/Auth/Application/Ports/IGoogleOAuthAdapter.ts` — exists
- `src/Modules/Auth/Application/Utils/sha256.ts` — exists
- Commits eea848d, 954e513, 6bdb5c8, 7e98723 — all present in git log
- `tsc --noEmit` exits 0
- Auth tests: 67 pass, 0 fail
