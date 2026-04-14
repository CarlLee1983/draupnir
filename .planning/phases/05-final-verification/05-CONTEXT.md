# Phase 5: Final Verification - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 proves the milestone is complete: zero gateway-specific imports in the business layer, all quality gates pass, and CONCERNS.md reflects the resolved state.

**In scope:**
- Grep-verify zero `BifrostClient`/`bifrostClient` references in `src/Modules/` and `src/Foundation/Application/`
- Workspace-wide lint (`bun run lint`) and typecheck (`bun run typecheck`) clean
- Git diff review confirming no new `any` or `@ts-ignore` introduced by this milestone
- Playwright E2E suite passes unchanged
- CONCERNS.md items #1, #2, #3 marked as resolved; #6 marked as partially resolved
- Fix any issues discovered during verification (residual imports, lint errors, type errors)

**Explicitly NOT in scope:**
- Renaming files containing 'Bifrost' (e.g., `ApiKeyBifrostSync.ts`) — file names are not considered violations
- Renaming `ErrorCodes` constants (`BIFROST_ERROR`, `BIFROST_TIMEOUT`) — in Shared layer, breaking API change
- Renaming `BIFROST_*` environment variable names — separate future milestone
- Adding new features or abstractions beyond the existing milestone work

</domain>

<decisions>
## Implementation Decisions

### Grep Exclusion Rules
- **D-01:** Grep scope is `src/Modules/` and `src/Foundation/Application/` for `BifrostClient|bifrostClient` patterns
- **D-02:** Exclusions: `packages/bifrost-sdk/**` and `BifrostGatewayAdapter.ts` only. Imports from `@draupnir/bifrost-sdk` are allowed (e.g., in `FoundationServiceProvider`); old-path imports from `@/Foundation/Infrastructure/Services/BifrostClient/` are violations
- **D-03:** File names containing 'Bifrost' are NOT violations — only import statements and type references count. File renaming is a separate milestone concern
- **D-04:** `ErrorCodes.BIFROST_ERROR` and `ErrorCodes.BIFROST_TIMEOUT` in `src/Shared/Application/ErrorCodes.ts` are NOT violations for this phase. They are in the Shared layer (not Module/Application), and renaming them is a breaking API change. Not handled in this milestone

### CONCERNS.md Update Strategy
- **D-05:** Items #1 (Bifrost coupling), #2 (snake_case leakage), #3 (missing abstraction) get a `Resolved` marker with date, phase references, and 1-2 line summary of how they were resolved. Original description preserved below for historical context
- **D-06:** Item #6 (Bifrost env coupling) gets a `Partially Resolved` marker — proxy URL moved into SDK package (Phase 4), but `BIFROST_*` env var names and `ErrorCodes` constants remain. Note remaining items as future milestone work
- **D-07:** Other CONCERNS.md items (#4-#5, #7-#17) are not touched unless directly affected by this milestone's changes

### Verification & Fix Strategy
- **D-08:** Phase 5 includes verification AND small fixes. If grep finds residual Bifrost imports, lint errors, or typecheck failures — fix them directly. These are previous phase omissions, not new features
- **D-09:** QUAL-03 (no new `any` or `@ts-ignore`) verified via git diff against `master` branch. Only check lines added by this milestone, not pre-existing `any` types in the codebase

### Claude's Discretion
- Execution order of verification steps (grep, lint, typecheck, E2E) — Claude decides the optimal sequence
- Commit granularity for fixes — Claude decides whether to batch or commit individually
- Level of detail in CONCERNS.md resolution summaries

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 5 scope and requirements
- `.planning/ROADMAP.md` — Phase 5 goal, success criteria (5 items), requirements list
- `.planning/REQUIREMENTS.md` — TEST-02, TEST-04, QUAL-01 through QUAL-05 (7 pending requirements)
- `.planning/PROJECT.md` — Core value: "No file under `src/Modules/` or `src/Foundation/Application/` may import a Bifrost-specific symbol"

### Files to verify and update
- `.planning/codebase/CONCERNS.md` — Items #1, #2, #3 to mark resolved; #6 to mark partially resolved
- `src/Shared/Application/ErrorCodes.ts` — Contains BIFROST_ERROR/BIFROST_TIMEOUT (NOT to be modified, per D-04)

### Quality gate commands
- `bun run lint` — Biome linter, workspace-wide including `packages/bifrost-sdk/`
- `bun run typecheck` — `tsc --noEmit`, workspace-wide
- `bun run test:e2e` — Playwright E2E suite
- `biome.json` — Linter configuration

### Prior phase context
- `.planning/phases/01-gateway-foundation/01-CONTEXT.md` — Interface design decisions
- `.planning/phases/02-business-layer-migration/02-CONTEXT.md` — Migration decisions
- `.planning/phases/03-domain-rename/03-CONTEXT.md` — Rename decisions
- `.planning/phases/04-sdk-extraction/04-CONTEXT.md` — SDK extraction decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Verification Targets
- `src/Modules/` — All 13 modules must have zero `BifrostClient`/`bifrostClient` type references
- `src/Foundation/Application/` — Zero gateway-specific imports
- `packages/bifrost-sdk/` — Must build independently, smoke test must pass
- `tests/Feature/routes-connectivity.e2e.ts` — Route-level smoke check (QUAL-04)
- `tests/Feature/routes-existence.e2e.ts` — Route existence check (QUAL-04)

### Known Exclusion Points
- `src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts` — Legitimately imports from `@draupnir/bifrost-sdk`
- `src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts` — Legitimately imports from `@draupnir/bifrost-sdk` for DI wiring
- `src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts` — File name contains 'Bifrost' but internal code uses `ILLMGatewayClient` (not a violation per D-03)
- `src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts` — Same as above

### Quality Gate Infrastructure
- Biome v2.4.11 configured in `biome.json` — handles both lint and format
- TypeScript strict mode with `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, `noUnusedParameters`
- Playwright configured in `playwright.config.ts`

</code_context>

<specifics>
## Specific Ideas

- Use the preview format from D-05 for CONCERNS.md updates: `Resolved` header, date, phase refs, summary, then preserved original description
- Git diff against master for QUAL-03: `git diff master...HEAD` and grep for added lines containing `any` or `@ts-ignore`
- Run verification in a logical order: grep first (cheapest), then lint, then typecheck, then E2E (most expensive)

</specifics>

<deferred>
## Deferred Ideas

- **Rename `ErrorCodes` constants** — `BIFROST_ERROR` -> `GATEWAY_ERROR`, `BIFROST_TIMEOUT` -> `GATEWAY_TIMEOUT`. Separate milestone due to API breaking change risk
- **Rename Bifrost-containing file names** — `ApiKeyBifrostSync.ts`, `AppKeyBifrostSync.ts`, etc. Cosmetic, not blocking
- **Rename `BIFROST_*` environment variables** — Broad env-var rename across CI, docs, and config. Separate milestone
- **Full CONCERNS.md audit** — Review all 17 items for staleness. Separate effort

</deferred>

---

*Phase: 05-final-verification*
*Context gathered: 2026-04-10*
