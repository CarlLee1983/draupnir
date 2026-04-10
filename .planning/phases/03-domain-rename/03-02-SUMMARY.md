---
phase: 03-domain-rename
plan: 02
subsystem: api
tags: [gateway, sync, events, app-api-key, api-key]
requires:
  - phase: 03-domain-rename
    provides: renamed aggregate getters from Wave 1
provides:
  - Gateway sync services return `gatewayKeyId` and `gatewayKeyValue`
  - App key event payloads use gateway-neutral names
  - createVirtualKey call sites destructure the renamed field
affects: [phase-03, api-key, app-api-key, sdk-api]
tech-stack:
  added: []
  patterns: [sync DTO rename, event payload rename]
key-files:
  created: [.planning/phases/03-domain-rename/03-02-SUMMARY.md]
  modified:
    - src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts
    - src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts
    - src/Modules/AppApiKey/Domain/Events/AppApiKeyEvents.ts
    - src/Modules/ApiKey/Application/Services/CreateApiKeyService.ts
    - src/Modules/AppApiKey/Application/Services/IssueAppKeyService.ts
    - src/Modules/AppApiKey/Application/Services/RotateAppKeyService.ts
requirements-completed: [RENAME-04]
duration: 1h
completed: 2026-04-10
---

# Phase 3: Domain Rename Summary

**Gateway sync contracts and app-key event payloads now use gateway-neutral field names end to end.**

## Performance

- **Tasks:** 3
- **Files modified:** 6 source files

## Accomplishments
- Renamed `createVirtualKey()` results to `{ gatewayKeyId, gatewayKeyValue }`.
- Renamed app key rotation and revoke event payload fields.
- Updated the three call sites that consume `createVirtualKey()` to use `gatewayKeyId`.

## Task Commits

1. **Task 1: Rename sync return fields** - `46d9bd6` (`feat`)
2. **Task 2: Rename app key event payload fields** - `2823536` (`feat`)
3. **Task 3: Update create-virtual-key call sites** - `8b8d3f0` (`feat`)

## Files Created/Modified
- `src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts` - gateway-neutral sync result shape
- `src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts` - gateway-neutral sync result shape
- `src/Modules/AppApiKey/Domain/Events/AppApiKeyEvents.ts` - renamed app key event payloads
- `src/Modules/ApiKey/Application/Services/CreateApiKeyService.ts` - uses `gatewayKeyId`
- `src/Modules/AppApiKey/Application/Services/IssueAppKeyService.ts` - uses `gatewayKeyId`
- `src/Modules/AppApiKey/Application/Services/RotateAppKeyService.ts` - passes `newGatewayKeyId` to rotate

## Decisions Made
- Kept the external API behavior unchanged; only internal field names moved to gateway-neutral vocabulary.

## Deviations from Plan

None - plan executed as specified.

## Issues Encountered
- Full `bun run typecheck` and `bun test` are blocked by unrelated baseline issues elsewhere in the repository, not by this rename.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
Wave 2 now has stable sync and event contracts for the remaining DTO/service/test renames.

---
*Phase: 03-domain-rename*
*Completed: 2026-04-10*
