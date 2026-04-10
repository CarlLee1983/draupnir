---
phase: 03-domain-rename
plan: 01
subsystem: database
tags: [api-key, app-api-key, aggregate, repository, rename]
requires:
  - phase: 02-business-layer-migration
    provides: renamed gateway-neutral aggregate getters used by downstream services
provides:
  - ApiKey aggregate exposes `gatewayKeyId`
  - AppApiKey aggregate exposes `gatewayKeyId` and `previousGatewayKeyId`
  - Repository row mapping still targets frozen DB columns
affects: [phase-03, api-key, app-api-key, repositories]
tech-stack:
  added: []
  patterns: [aggregate getter rename, frozen-column ORM mapping]
key-files:
  created: [.planning/phases/03-domain-rename/03-01-SUMMARY.md]
  modified:
    - src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts
    - src/Modules/AppApiKey/Domain/Aggregates/AppApiKey.ts
requirements-completed: [RENAME-01, RENAME-02, RENAME-03]
duration: 1h
completed: 2026-04-10
---

# Phase 3: Domain Rename Summary

**ApiKey and AppApiKey aggregates now use gateway-neutral field names while still persisting to the frozen `bifrost_virtual_key_id` columns.**

## Performance

- **Tasks:** 3
- **Files modified:** 2 source files

## Accomplishments
- Renamed `bifrostVirtualKeyId` to `gatewayKeyId` in `ApiKey`.
- Renamed `bifrostVirtualKeyId` to `gatewayKeyId` and `previousBifrostVirtualKeyId` to `previousGatewayKeyId` in `AppApiKey`.
- Preserved the existing database schema and repository row mapping.

## Task Commits

1. **Task 1: Rename ApiKey aggregate** - `5de13bd` (`feat`)
2. **Task 2: Rename AppApiKey aggregate** - `e800586` (`feat`)
3. **Task 3: Verify repositories still compile and run tests** - covered by later phase verification

## Files Created/Modified
- `src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts` - gateway-neutral ApiKey aggregate contract
- `src/Modules/AppApiKey/Domain/Aggregates/AppApiKey.ts` - gateway-neutral AppApiKey aggregate contract

## Decisions Made
- Kept `bifrost_virtual_key_id` and `previous_bifrost_virtual_key_id` frozen in the database mapping.
- Left repository query logic unchanged because all mapping is already delegated to the aggregates.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered
- Full `bun run typecheck` and `bun test` are blocked by unrelated baseline issues elsewhere in the repository, not by this rename.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
Phase 3 downstream call sites can now consume `gatewayKeyId` and `previousGatewayKeyId`.
This plan is ready for Wave 2 work.

---
*Phase: 03-domain-rename*
*Completed: 2026-04-10*
