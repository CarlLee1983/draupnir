# Commands Reference

Bun scripts for Draupnir development. **Source of truth**: root [`package.json`](../../package.json).  
Broader context: [`DEVELOPMENT.md`](./DEVELOPMENT.md) · CI steps: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

## Development

```bash
bun run dev                    # Hot reload (default PORT=3000)
bun run dev:debug              # Start with Node inspector (--inspect-brk)
bun run build                  # Backend bundle → dist/ (ESM, Bun target)
bun run start                  # Run compiled dist/index.js

# Frontend (Vite + React under src/Pages)
bun run dev:frontend           # Vite dev server
bun run build:frontend         # Production build → public/build
bun run preview:frontend       # Preview production frontend build
bun run dev:all                # Backend + frontend dev (both processes)
```

## Testing

Default unit scope matches CI-style runs: `src`, `tests/Unit`, and `packages/` (see `package.json` `"test"` script). **`tests/Feature/`** is excluded from `bun run test`; use feature scripts below.

```bash
bun run test                   # Test scope: src + tests/Unit + packages
bun run test:unit              # tests/Unit only
bun run test:sdk               # packages/bifrost-sdk/
bun run test:integration       # src tests tagged/filtered as integration
bun run test:user              # tests/ filtered by User
bun run test:watch             # Same scope as test, watch mode
bun run test:coverage          # Same scope + coverage (also used in CI)

# Feature / HTTP (tests/Feature/)
bun run test:feature           # Reuse API_BASE_URL if set, else start a server
bun run test:feature:server    # Dedicated app server + feature tests
bun run test:feature:existing  # Point at existing API_BASE_URL

# E2E (Playwright; config in playwright.config — often port 3001 + ORM=memory)
bun run test:e2e               # Full Playwright suite
bun run test:e2e:smoke         # Only tests tagged @smoke (CI E2E job)
bun run test:e2e:ui           # Interactive UI mode
bun run test:e2e:debug        # Playwright debug
```

## Quality

```bash
bun run typecheck              # tsc --noEmit (backend tsconfig)
bun run typecheck:frontend     # tsc --project tsconfig.frontend.json --noEmit
bun run lint                   # Biome lint (src, tests, packages)
bun run lint:fix               # Biome lint --fix
bun run format                 # Biome format --write
bun run format:check           # Biome check (CI uses this + lint)
bun run check                  # typecheck + lint + test
bun run verify                 # Same as check, then success message (does not run coverage)

# CI-style extras
bun run di:audit               # DI container audit (sets ORM=memory + CI-like env)
bun run migration:drift        # Schema vs migrations (needs DATABASE_URL + ORM=drizzle)
bun run lint:commits           # commitlint HEAD~1..HEAD (local quick check)
bun run check:no-mock-in-src   # Fail if forbidden mock client leaks into src
```

## Database (Gravito Orbit / Atlas)

```bash
bun run migrate                # Apply migrations
bun run migrate:rollback       # Roll back last batch
bun run migrate:fresh          # Drop all + migrate
bun run migrate:status         # Migration status
bun run seed                   # Run seeders
bun run db:fresh               # migrate:fresh + seed
bun run db:doctor              # Orbit doctor
bun run make:migration         # Scaffold migration
bun run generate:types         # Generate types from schema (Orbit)
```

## Code generation

```bash
bun run generate:module        # Scaffold DDD module (see DEVELOPMENT.md)
bun run make:controller        # gravito make:controller
bun run make:middleware        # gravito make:middleware
bun run make:command           # gravito make:command
bun run make:model             # orbit make:model
bun run route:list             # List HTTP routes (gravito CLI)
bun run tinker                 # Gravito REPL
```

## Tooling & maintenance

```bash
bun run setup                  # install + git hooks + verify
bun run setup:hooks            # scripts/setup-hooks.sh only
bun run check:commit           # single commit-check entrypoint (imports + i18n)
bun run check:i18n             # verify i18n locale registry and catalog fallback
bun run troubleshoot           # scripts/troubleshoot.sh
bun run backfill:alert-deliveries   # One-off Alerts script (see module path in package.json)
```
