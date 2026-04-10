---
phase: 04-sdk-extraction
plan: 01
subsystem: infra
tags: [bun, typescript, workspace, sdk, testing]

# Dependency graph
requires:
  - phase: 03-domain-rename
    provides: gateway-neutral domain naming and stable application-layer wiring
provides:
  - standalone @draupnir/bifrost-sdk Bun workspace package
  - copied Bifrost client source tree with proxyBaseUrl config support
  - self-contained smoke test and package-level build/typecheck coverage
affects: [phase 04, package workspace, Bifrost SDK consumers]

# Tech tracking
tech-stack:
  added: [workspace package, bun test, bun build, TypeScript config]
  patterns: [self-contained SDK boundary, config-driven proxy URL sourcing]

key-files:
  created:
    - packages/bifrost-sdk/package.json
    - packages/bifrost-sdk/tsconfig.json
    - packages/bifrost-sdk/README.md
    - packages/bifrost-sdk/src/index.ts
    - packages/bifrost-sdk/src/BifrostClient.ts
    - packages/bifrost-sdk/src/BifrostClientConfig.ts
    - packages/bifrost-sdk/src/types.ts
    - packages/bifrost-sdk/src/errors.ts
    - packages/bifrost-sdk/src/retry.ts
    - packages/bifrost-sdk/__tests__/smoke.test.ts
  modified:
    - package.json
    - tsconfig.json
    - bun.lock

key-decisions:
  - "The SDK package is exposed as @draupnir/bifrost-sdk via workspace:*."
  - "BifrostClientConfig now owns proxyBaseUrl and defaults it to the cleaned baseUrl."
  - "The package smoke test imports only from ../src and validates all public exports."
  - "The smoke test clears BIFROST_* env vars around negative assertions so it is stable under root .env loading."

patterns-established:
  - "Pattern 1: standalone workspace packages can own their own build/test/typecheck loop."
  - "Pattern 2: shared gateway config should be centralized at the SDK boundary instead of in app providers."

requirements-completed: [SDK-01, SDK-02, SDK-05, SDK-06]

# Metrics
duration: 20min
completed: 2026-04-10
---

# Phase 4: SDK Extraction Summary

`@draupnir/bifrost-sdk` now exists as a standalone Bun workspace package with its own config, source barrel, smoke test, and independent build/typecheck/test path.

## Performance

- **Duration:** 20 min
- **Started:** 2026-04-10T09:07:00Z
- **Completed:** 2026-04-10T09:27:42Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Created the `packages/bifrost-sdk/` workspace package and wired the root workspace manifest to include it.
- Copied the Bifrost client implementation into the package and extended `BifrostClientConfig` with `proxyBaseUrl`.
- Added a self-contained smoke test that exercises the package exports without importing from Draupnir `src/`.
- Verified `bun run build`, `bun run typecheck`, and `bun test` inside the SDK package all pass.

## Task Commits

Both plan tasks were landed as separate atomic commits:

1. **Task 1: SDK package scaffold and copied Bifrost client sources** - `576cd45` (`feat(04-01): create bifrost sdk package`)
2. **Task 2: Self-contained SDK smoke test** - `3336f99` (`test(04-01): isolate sdk smoke env`)

## Files Created/Modified
- `packages/bifrost-sdk/package.json` - workspace package manifest and scripts
- `packages/bifrost-sdk/tsconfig.json` - strict package-local TypeScript config
- `packages/bifrost-sdk/README.md` - package usage and development notes
- `packages/bifrost-sdk/src/BifrostClient.ts` - copied SDK client implementation
- `packages/bifrost-sdk/src/BifrostClientConfig.ts` - config surface with `proxyBaseUrl`
- `packages/bifrost-sdk/src/types.ts` - copied Bifrost wire types
- `packages/bifrost-sdk/src/errors.ts` - copied API error helpers
- `packages/bifrost-sdk/src/retry.ts` - copied retry helper
- `packages/bifrost-sdk/src/index.ts` - package barrel exports
- `packages/bifrost-sdk/__tests__/smoke.test.ts` - self-contained package smoke test
- `package.json` - workspace declaration and package link
- `tsconfig.json` - include `packages/` in workspace typecheck scope
- `bun.lock` - workspace link and dependency resolution refresh

## Decisions Made
- Kept the SDK package self-contained so it can be built and tested without any `src/` imports.
- Exposed the package through `workspace:*` to keep the extraction local to this repository.
- Centralized proxy URL sourcing in `BifrostClientConfig` so app providers can depend on config instead of hardcoded env fallbacks.

## Deviations from Plan

None - plan executed exactly as written for the implementation itself.

## Issues Encountered

The root suite loads `.env`, so the SDK smoke test needed explicit env isolation for the negative-config assertions. The package test remains deterministic in both package-local and root-run contexts.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Wave 1 is complete. `packages/bifrost-sdk/` is ready for import rewiring in wave 2.

---
*Phase: 04-sdk-extraction*
*Completed: 2026-04-10*
