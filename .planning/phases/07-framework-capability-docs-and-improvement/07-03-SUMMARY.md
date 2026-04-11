---
phase: 07-framework-capability-docs-and-improvement
plan: 03
subsystem: API English-only
tags: [api, validation, english-only, auth, organization, contract, appmodule, credit]
dependencies:
  requires:
    - src/Modules/Auth/Presentation/Requests/*
    - src/Modules/Auth/Application/Services/*
    - src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts
    - src/Modules/Auth/Presentation/Controllers/AuthController.ts
    - src/Modules/Organization/Presentation/Requests/*
    - src/Modules/Contract/Presentation/Requests/*
    - src/Modules/AppModule/Presentation/Requests/*
    - src/Modules/Credit/Presentation/Requests/*
affects:
  - API request validation messages
  - Auth response messages
  - Organization/Contract/AppModule/Credit service fallbacks
key_files:
  modified:
    - src/Modules/Auth/Presentation/Requests/LoginRequest.ts
    - src/Modules/Auth/Presentation/Requests/RegisterRequest.ts
    - src/Modules/Auth/Presentation/Requests/RefreshTokenRequest.ts
    - src/Modules/Auth/Application/Services/RegisterUserService.ts
    - src/Modules/Auth/Application/Services/LoginUserService.ts
    - src/Modules/Auth/Application/Services/RefreshTokenService.ts
    - src/Modules/Auth/Application/Services/LogoutUserService.ts
    - src/Modules/Auth/Application/Services/ListUsersService.ts
    - src/Modules/Auth/Application/Services/GetUserDetailService.ts
    - src/Modules/Auth/Application/Services/ChangeUserStatusService.ts
    - src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts
    - src/Modules/Auth/Presentation/Controllers/AuthController.ts
    - src/Modules/Organization/Presentation/Requests/CreateOrganizationRequest.ts
    - src/Modules/Organization/Presentation/Requests/UpdateOrganizationRequest.ts
    - src/Modules/Organization/Presentation/Requests/InviteMemberRequest.ts
    - src/Modules/Organization/Presentation/Requests/AcceptInvitationRequest.ts
    - src/Modules/Organization/Presentation/Requests/ChangeMemberRoleRequest.ts
    - src/Modules/Organization/Presentation/Requests/ChangeOrgStatusRequest.ts
    - src/Modules/Contract/Presentation/Requests/CreateContractRequest.ts
    - src/Modules/Contract/Presentation/Requests/AssignContractRequest.ts
    - src/Modules/Contract/Presentation/Requests/ListContractsRequest.ts
    - src/Modules/AppModule/Presentation/Requests/RegisterModuleRequest.ts
    - src/Modules/AppModule/Presentation/Requests/SubscribeModuleRequest.ts
    - src/Modules/Credit/Presentation/Requests/TopUpRequest.ts
    - src/Modules/Credit/Presentation/Requests/RefundRequest.ts
duration: 24min
completed: 2026-04-11
---

# Phase 07 Plan 03 Summary

**Objective:** Replace Chinese validation and fallback messages in the Auth, Organization, Contract, AppModule, and Credit API surfaces with English-only equivalents.

## What Changed

- Standardized request schema validation text to English for API request bodies.
- Updated service-level `message` fallbacks to English for user-facing API responses.
- Preserved machine-readable error codes such as `UNAUTHORIZED`, `NOT_FOUND`, and validation codes.
- Aligned the Auth middleware/controller response messages to English-only strings.

## Verification

Executed:

```bash
bun test
```

Result:

- 661 pass
- 1 skip
- 0 fail
- 1539 expect() calls

## Notes

- The API layer is now English-only for user-visible response messages.
- Domain comments and docs were left untouched unless they fed user-visible responses.
