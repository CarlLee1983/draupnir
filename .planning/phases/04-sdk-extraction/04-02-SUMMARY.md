---
phase: 04-sdk-extraction
plan: 02
subsystem: infra
tags: [bifrost-sdk, workspace, imports, di-container, typescript]

# Dependency graph
requires:
  - phase: 04-01
    provides: "@draupnir/bifrost-sdk workspace package with BifrostClient, config, types, errors, retry"
provides:
  - "All src/ and tests/ imports rewired from old path to @draupnir/bifrost-sdk"
  - "bifrostConfig DI singleton registered in FoundationServiceProvider"
  - "SdkApiServiceProvider reads proxy URL from bifrostConfig.proxyBaseUrl via DI"
  - "Old src/Foundation/Infrastructure/Services/BifrostClient/ directory deleted"
  - "Root package.json scripts cover packages/ in test, lint, format commands"
affects: [05-verification, future-gateway-backends]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "bifrostConfig singleton pattern: config registered as DI singleton so multiple consumers share the same instance"
    - "Workspace import pattern: internal packages imported via @draupnir/bifrost-sdk workspace: protocol"

key-files:
  created: []
  modified:
    - src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts
    - src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts
    - src/Foundation/index.ts
    - src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts
    - src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts
    - tests/Unit/Foundation/BifrostClient/BifrostClient.test.ts
    - tests/Unit/Foundation/BifrostClient/errors.test.ts
    - tests/Unit/Foundation/BifrostClient/retry.test.ts
    - tests/Unit/Foundation/BifrostClient/types.test.ts
    - tests/Unit/Foundation/LLMGateway/BifrostGatewayAdapter.test.ts
    - package.json

key-decisions:
  - "bifrostConfig registered as a separate DI singleton from bifrostClient so both BifrostClient and SdkApiServiceProvider.proxyModelCall share the same config instance"
  - "Old BifrostClient directory deleted only after all imports verified; empty directory cleaned up after initial commit"

patterns-established:
  - "Package workspace import: consumers use from '@draupnir/bifrost-sdk' not from relative @/Foundation paths"
  - "Config-first DI: config objects registered before dependent services to enable multiple consumers"

requirements-completed:
  - SDK-03
  - SDK-04
  - SDK-05

# Metrics
duration: 15min
completed: 2026-04-10
---

# Phase 04 Plan 02: SDK Import Rewiring Summary

**All src/ and test/ BifrostClient imports migrated to @draupnir/bifrost-sdk; bifrostConfig DI singleton wires proxy URL into SdkApiServiceProvider without env-var leak**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-10T09:35:00Z
- **Completed:** 2026-04-10T09:50:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Rewired 5 src/ files to import from `@draupnir/bifrost-sdk` (FoundationServiceProvider, BifrostGatewayAdapter, Foundation/index.ts, CliApiServiceProvider, SdkApiServiceProvider)
- Rewired 5 test files to import from `@draupnir/bifrost-sdk` (BifrostClient.test.ts, errors.test.ts, retry.test.ts, types.test.ts, BifrostGatewayAdapter.test.ts)
- Registered `bifrostConfig` as DI singleton; `SdkApiServiceProvider` now sources `proxyBaseUrl` from `config.proxyBaseUrl` instead of hardcoded env var
- Deleted `src/Foundation/Infrastructure/Services/BifrostClient/` directory (6 source files + empty directory)
- Updated root `package.json` test/lint/format scripts to include `packages/` path; added `test:sdk` convenience script

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewire src/ imports and update SdkApiServiceProvider proxy URL** - `27363ad` (feat)
2. **Task 2: Update scripts, delete old directory** - `78b5da3` (chore)

**Plan metadata:** (created after tasks)

## Files Created/Modified

- `src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts` - Now imports from @draupnir/bifrost-sdk; registers bifrostConfig singleton
- `src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts` - Imports from @draupnir/bifrost-sdk
- `src/Foundation/index.ts` - Re-exports from @draupnir/bifrost-sdk
- `src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts` - BifrostClient type from @draupnir/bifrost-sdk
- `src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts` - ProxyModelCall uses config.proxyBaseUrl from DI
- `tests/Unit/Foundation/BifrostClient/*.test.ts` (4 files) - All imports from @draupnir/bifrost-sdk
- `tests/Unit/Foundation/LLMGateway/BifrostGatewayAdapter.test.ts` - Imports from @draupnir/bifrost-sdk
- `package.json` - Scripts updated: test/lint/format include packages/; test:sdk added
- `src/Foundation/Infrastructure/Services/BifrostClient/` - DELETED (all 6 files)

## Decisions Made

- `bifrostConfig` registered as a dedicated DI singleton separate from `bifrostClient` so both `BifrostClient` construction and `SdkApiServiceProvider.proxyModelCall` share one config instance without duplicating `createBifrostClientConfig()` calls.
- Directory deletion was split: the source files were deleted in commit `27363ad` but the empty directory remained; it was cleaned up in the subsequent `78b5da3` commit.

## Deviations from Plan

None - plan executed exactly as written. All 5 src/ files and 5 test files were already rewired in commit `27363ad`. Task 2 completed the remaining script updates and directory cleanup.

## Issues Encountered

None - all imports resolved cleanly. Pre-existing typecheck errors in `IHttpContext.ts` and `routes-connectivity.test.ts` are unrelated to this plan and out of scope.

## Known Stubs

None.

## Next Phase Readiness

- Phase 05 (verification) can proceed: zero `Services/BifrostClient` references in src/ or tests/, old directory deleted, full test suite passes (102 unit tests + 11 SDK smoke tests)
- `bun test src tests packages` exit 0 confirmed
- `bun run typecheck` clean for SDK-related files

---
*Phase: 04-sdk-extraction*
*Completed: 2026-04-10*
