# Development Guide

All-in-one reference for local development, architecture touchpoints, and common operations.  
**Command cheat sheet**: [`COMMANDS.md`](./COMMANDS.md) · **Design decisions**: [`DESIGN_DECISIONS.md`](./DESIGN_DECISIONS.md) · **Module boundaries**: [`knowledge/module-boundaries.md`](./knowledge/module-boundaries.md)

## Architecture

### Layout overview

- **`src/Foundation/`** — Cross-cutting infrastructure (Bifrost client, mail, webhooks, scheduler ports, etc.). Not a sibling “module” under `src/Modules`, but every feature module may depend on it via ports.
- **`src/Modules/*`** — Bounded contexts (DDD modules); see list below.
- **`src/Shared/`** — Framework-agnostic contracts, shared infra adapters, and utilities.

### Module structure

Each module under `src/Modules/` typically follows DDD layering (some read-only or gateway modules omit or slim down **Domain** — see [`DESIGN_DECISIONS.md`](./DESIGN_DECISIONS.md) and [`knowledge/module-boundaries.md`](./knowledge/module-boundaries.md)):

```
src/Modules/{ModuleName}/
  Domain/
    Aggregates/       # Aggregate roots (e.g. createDefault, fromDatabase)
    ValueObjects/     # Immutable domain concepts
    Repositories/     # Ports (I{Name}Repository)
  Application/
    DTOs/             # Data transfer objects
    Services/         # Use-case / application services
  Infrastructure/
    Repositories/     # IDatabaseAccess-backed implementations
    Providers/        # *ServiceProvider for DI registration
  Presentation/
    Controllers/      # HTTP handlers
    Routes/           # Routes + middleware
    Validators/       # Zod (or Impulse) input validation
  index.ts            # Public barrel exports
```

### Active modules (`src/Modules`)

`Alerts`, `ApiKey`, `AppApiKey`, `AppModule`, `Auth`, `CliApi`, `Contract`, `Credit`, `Dashboard`, `DevPortal`, `Health`, `Organization`, `Profile`, `Reports`, `SdkApi`.

**Key points**: Switch persistence with `ORM` (see below); repositories use `IDatabaseAccess` from the wiring layer. Layering diagrams: [`architecture/`](./architecture/) · dependency graph: [`architecture/module-dependency-map.md`](./architecture/module-dependency-map.md).

### Inertia pages (`src/Website`)

Server-driven Inertia routes, per-page DI bindings, and Vite assets live under `src/Website/`. When adding or changing a page, follow **[`architecture/website-inertia-layer.md`](./architecture/website-inertia-layer.md)** and [`knowledge/jsdoc-standards.md`](./knowledge/jsdoc-standards.md).

## Testing

- **CI unit job** runs `bun test --coverage` with `ORM=memory` (no Postgres required for that job).
- **CI** also runs Postgres-backed jobs (migration drift, E2E smoke) — see [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).
- `bun test` excludes `tests/Feature/` and runs source, unit, and package tests.
- Feature tests (`tests/Feature/`): `bun run test:feature` (reuses `API_BASE_URL` when set).
- Dedicated server for features: `bun run test:feature:server`.
- Against an already running API: `bun run test:feature:existing`.
- Feature tests include OpenAPI contract checks where applicable.
- **E2E (Playwright)**: `bun run test:e2e` (dev server on port **3001** with `ORM=memory` per script); smoke subset: `bun run test:e2e:smoke` (used in CI with Atlas + migrations).
- Deeper testing guidance: [`knowledge/`](./knowledge/) and [`VERIFICATION_CHECKLIST.md`](./VERIFICATION_CHECKLIST.md).

## Key environment variables

Defaults below match **runtime fallbacks** and [`.env.example`](../../.env.example). Adjust for staging/production (e.g. `ORM=atlas`, `DATABASE_URL`, `ENABLE_DB=true`).

| Variable | Purpose | Typical local / default |
|----------|---------|-------------------------|
| `ORM` | Persistence backend (`memory` / `atlas` / `prisma`) | `memory` if unset (`getCurrentORM()`) |
| `ENABLE_DB` | Atlas / DB-related toggles | `false` in `.env.example` |
| `DATABASE_URL` | Postgres (or other) when using Atlas-backed CI or prod | unset in example; set for real DB |
| `DB_CONNECTION` | Driver hint for shared config (`config/database.ts`) | `sqlite` if unset |
| `BIFROST_API_URL` | Bifrost gateway base URL | required for gateway sync paths |
| `BIFROST_MASTER_KEY` | Bifrost auth | required outside trivial local mocks |
| `JWT_SECRET` | JWT signing | required |
| `PORT` | HTTP port | `3000` |

## Adding a new module

1. **Scaffold**: `bun run generate:module MyModule [--db]` (Gravito Pulse).
2. **Layers**: Keep Domain → Application → Infrastructure → Presentation consistent with siblings; register repositories in the wiring/registry pattern used by existing modules.
3. **DI**: Add `MyModuleServiceProvider` and append it to the `modules` array in [`src/bootstrap.ts`](../../src/bootstrap.ts) (order may matter for dependencies).
4. **HTTP**: Add `registerMyModule(core)` in [`src/wiring/index.ts`](../../src/wiring/index.ts) (follow `registerProfile`, `registerApiKey`, …) and call it from [`src/routes.ts`](../../src/routes.ts).
5. **Aggregates** (when you have a rich domain): prefer factory + persistence mapping helpers (`createDefault`, `fromDatabase`, `toDTO`, `toDatabaseRow` or equivalent) for consistency with existing aggregates.

For **cross-module dependencies**, follow [`knowledge/context-dependency-map.md`](./knowledge/context-dependency-map.md) and avoid sharing ORM entities across modules.
