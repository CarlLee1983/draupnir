# Phase 20 Plan 01 Summary

## Outcome

- Built the Phase 20 guardrail toolchain: Bun coverage config, commitlint config, DI audit, migration drift, smoke tags, and routes runner note.
- `scripts/di-audit.ts` now performs runtime-first container enumeration by reading `core.container.bindings`, warms Inertia before resolving page bindings, and resolves all 186 discovered tokens.
- `scripts/migration-drift.ts` now imports `config/database.ts` directly, configures Atlas with the real repo config, applies migrations to a clean Postgres database, introspects the live schema, and diffs it against Drizzle schema definitions.

## Spike Notes

1. `@gravito/core` container enumeration
   - No public `listBindings()` / `getTokens()` / `keys()` API exists in `@gravito/core` v3.0.1.
   - Runtime enumeration is available through the private `core.container.bindings` map after boot.
   - Static regex discovery remains the fallback if runtime bindings are not exposed.
2. Bun `coverageThreshold`
   - Verified on Bun `1.3.10`.
   - `coverageThreshold = 0.8` behaves as an aggregate gate, not a per-file gate.
3. Orbit / Atlas config handling
   - Config auto-discovery can fall back to `DB_*` env vars in script contexts and lose `useNativeDriver`.
   - The drift script now bypasses auto-discovery and configures Atlas from `config/database.ts` directly.

## Smoke Journeys

- `e2e/admin-portal.e2e.ts`
- `e2e/member-portal.e2e.ts`
- `e2e/cli-device-flow.e2e.ts`

`bunx playwright test --grep @smoke --list` now reports 11 tests across those 3 files.

## Files Changed

- `bunfig.toml`
- `commitlint.config.cjs`
- `package.json`
- `config/database.ts`
- `scripts/di-audit.ts`
- `scripts/migration-drift.ts`
- `e2e/admin-dashboard.e2e.ts`
- `e2e/admin-portal.e2e.ts`
- `e2e/member-portal.e2e.ts`
- `e2e/cli-device-flow.e2e.ts`
- `tests/Feature/routes-existence.e2e.ts`
- `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts`
- `database/migrations/2026_04_09_000008_create_user_profiles_and_health_checks.ts`
- `database/migrations/2026_04_12_000003_create_alert_configs_and_alert_events.ts`
- `database/migrations/2026_04_13_000003_create_app_modules_table.ts`

## Verification

- `bun run di:audit` - pass
- `bun run migration:drift` against a fresh Postgres DB - pass
- `bunx playwright test --grep @smoke --list` - pass
- `bunx commitlint --config commitlint.config.cjs` with `feat: [ci] 測試` on stdin - pass
- `bun run typecheck` - pass
- `bun run lint` - reports pre-existing repo warnings unrelated to this phase
- `bun test --coverage` - ran; repo still has 9 unrelated failing tests, so the command exits non-zero
- `bun test ./tests/Feature/routes-existence.e2e.ts` - fails without `API_BASE_URL`, which is expected for the feature-test harness

## Residual Risks

- `bun test --coverage` still fails because of unrelated baseline test failures outside this phase.
- `bun run lint` still reports pre-existing warnings throughout the repo.
- The routes-existence Bun command needs the feature-test harness environment (`API_BASE_URL`) to run end-to-end.
