---
phase: 03-domain-rename
plan: 03
subsystem: testing
tags: [sdk-api, credit, dashboard, app-api-key, rename]
requires:
  - phase: 03-domain-rename
    provides: gateway-neutral aggregate getters and sync payloads
provides:
  - SdkApi auth context uses `gatewayKeyId`
  - application services read `gatewayKeyId` / `previousGatewayKeyId`
  - test fixtures and assertions use the renamed fields
affects: [phase-03, sdk-api, credit, dashboard, tests]
tech-stack:
  added: []
  patterns: [context rename, service consumer rename, test fixture rename]
key-files:
  created: [.planning/phases/03-domain-rename/03-03-SUMMARY.md]
  modified:
    - src/Modules/SdkApi/Application/DTOs/SdkApiDTO.ts
    - src/Modules/SdkApi/Application/UseCases/AuthenticateApp.ts
    - src/Modules/SdkApi/Application/UseCases/ProxyModelCall.ts
    - src/Modules/SdkApi/Application/UseCases/QueryUsage.ts
    - src/Modules/AppApiKey/Application/Services/GetAppKeyUsageService.ts
    - src/Modules/ApiKey/Application/Services/RevokeApiKeyService.ts
    - src/Modules/ApiKey/Application/Services/SetKeyPermissionsService.ts
    - src/Modules/AppApiKey/Application/Services/RevokeAppKeyService.ts
    - src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts
    - src/Modules/Credit/Application/Services/HandleCreditToppedUpService.ts
    - src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts
    - src/Modules/Dashboard/Application/Services/GetUsageChartService.ts
    - src/Modules/ApiKey/__tests__/ApiKey.test.ts
    - src/Modules/AppApiKey/__tests__/AppApiKey.test.ts
    - src/Modules/SdkApi/__tests__/AuthenticateApp.test.ts
    - src/Modules/SdkApi/__tests__/ProxyModelCall.test.ts
    - src/Modules/SdkApi/__tests__/QueryUsage.test.ts
    - src/Modules/SdkApi/__tests__/AppAuthMiddleware.test.ts
    - src/Modules/SdkApi/__tests__/SdkApiController.test.ts
    - src/Modules/SdkApi/__tests__/SdkApiIntegration.test.ts
    - src/Modules/SdkApi/__tests__/QueryBalance.test.ts
    - src/Modules/ApiKey/__tests__/RevokeApiKeyService.test.ts
    - src/Modules/ApiKey/__tests__/SetKeyPermissionsService.test.ts
    - src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts
    - src/Modules/AppApiKey/__tests__/RotateAppKeyService.test.ts
    - src/Modules/AppApiKey/__tests__/RevokeAppKeyService.test.ts
    - src/Modules/AppApiKey/__tests__/SetAppKeyScopeService.test.ts
    - src/Modules/AppApiKey/__tests__/GetAppKeyUsageService.test.ts
    - src/Modules/Credit/__tests__/HandleBalanceDepletedService.test.ts
    - src/Modules/Credit/__tests__/HandleCreditToppedUpService.test.ts
    - src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts
    - src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts
    - src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts
requirements-completed: [RENAME-04]
duration: 1h
completed: 2026-04-10
---

# Phase 3: Domain Rename Summary

**All remaining gateway-specific field names were removed from SDK auth context, application services, and test fixtures.**

## Performance

- **Tasks:** 3
- **Files modified:** 22 files

## Accomplishments
- Renamed the SDK auth context to use `gatewayKeyId`.
- Updated all application services to read `gatewayKeyId` / `previousGatewayKeyId`.
- Rewrote the affected test fixtures and expectations to match the renamed contracts.

## Task Commits

1. **Task 1: Rename AppAuthContext DTO and SDK use cases** - `351a4e1` (`feat`)
2. **Task 2: Update application services** - `059bd55` (`feat`)
3. **Task 3: Rename test fixtures and expectations** - `378b2f8` (`feat`)

## Files Created/Modified
- `src/Modules/SdkApi/Application/DTOs/SdkApiDTO.ts` - auth context field rename
- `src/Modules/SdkApi/Application/UseCases/AuthenticateApp.ts` - auth context population
- `src/Modules/SdkApi/Application/UseCases/ProxyModelCall.ts` - bearer token source rename
- `src/Modules/SdkApi/Application/UseCases/QueryUsage.ts` - usage query input rename
- `src/Modules/AppApiKey/Application/Services/GetAppKeyUsageService.ts` - usage query input rename
- `src/Modules/ApiKey/Application/Services/RevokeApiKeyService.ts` - deactivation getter rename
- `src/Modules/ApiKey/Application/Services/SetKeyPermissionsService.ts` - sync getter rename
- `src/Modules/AppApiKey/Application/Services/RevokeAppKeyService.ts` - revoke/deactivate getter renames
- `src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts` - gateway update input rename
- `src/Modules/Credit/Application/Services/HandleCreditToppedUpService.ts` - gateway update input rename
- `src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts` - usage stats key rename
- `src/Modules/Dashboard/Application/Services/GetUsageChartService.ts` - usage stats key rename
- `src/Modules/*/__tests__/*.test.ts` - renamed fixture fields and assertions

## Decisions Made
- Kept the public HTTP API shapes unchanged; these are internal field-name changes only.
- Updated test fixtures to use the same gateway-neutral vocabulary as production code.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered
- `bun run typecheck` and `bun test` both fail for unrelated baseline repository issues outside the rename scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
The phase 3 rename surface is clean in `src/`; downstream verification and later phases can build on the gateway-neutral names.

---
*Phase: 03-domain-rename*
*Completed: 2026-04-10*
