# AGENTS.md

This file provides guidance for AI coding agents working in this repository (for example Cursor, Claude Code, and similar tools).

## Project Overview

Draupnir is an AI Service Management Platform built on top of the Bifrost AI Gateway. It handles authentication, API key management, usage tracking, credit system, and organization management. Built with the Gravito DDD framework running on Bun with TypeScript.

## Documentation

Human-written specs, plans, and external API reference are indexed in [docs/README.md](docs/README.md) (`draupnir/`, `reference/`, root OpenAPI files).

## Commands

```bash
# Development
bun run dev                    # Hot-reload dev server (port 3000)
bun run build                  # Build to dist/

# Testing
bun test                       # Run all tests
bun test tests/Unit/           # Unit tests only
bun test tests/Feature/        # Feature (API) tests only
bun test --filter User         # Filter by name
bun test --watch               # Watch mode
bun test --coverage            # With coverage

# E2E (Playwright, auto-starts server on port 3001 with ORM=memory)
bun run test:e2e
bun run test:e2e:ui            # Interactive UI mode

# Quality
bun run typecheck              # TypeScript strict check
bun run lint                   # Biome lint
bun run format                 # Biome format (write)
bun run check                  # typecheck + lint + test
bun run verify                 # check + coverage report

# Database (Gravito Atlas / Orbit CLI)
bun run migrate                # Run migrations
bun run migrate:fresh          # Drop all + re-migrate
bun run db:fresh               # migrate:fresh + seed
bun run make:migration         # Create migration file

# Code generation (Gravito CLI)
bun run generate:module        # Scaffold new DDD module
bun run make:controller        # Generate controller
bun run route:list             # List all routes
bun run tinker                 # REPL
```

## Architecture

### DDD Module Structure

Each module in `src/Modules/` follows strict DDD layering:

```
src/Modules/{ModuleName}/
  Domain/
    Aggregates/       # Root entities with factory methods (createDefault, fromDatabase)
    ValueObjects/     # Immutable domain concepts
    Repositories/     # Interface contracts (I{Name}Repository)
  Application/
    DTOs/             # Data transfer objects
    Services/         # Business logic (one service per use case)
  Infrastructure/
    Repositories/     # Concrete implementations using IDatabaseAccess
    Providers/        # ServiceProvider for DI registration
  Presentation/
    Controllers/      # HTTP handlers
    Routes/           # Route definitions with middleware
    Validators/       # Zod schemas for input validation
  index.ts            # Barrel export (public API surface)
```

Active modules: Health, Auth, User, Organization, ApiKey, Dashboard, Credit.

### Framework Abstraction Layer

Modules never import Gravito directly. All framework coupling lives in `src/Shared/Infrastructure/Framework/`:
- `GravitoServiceProviderAdapter` — wraps module ServiceProviders for Gravito's DI container
- `GravitoModuleRouter` — adapts Gravito's router to the `IModuleRouter` interface (onion middleware pipeline)
- `IHttpContext`, `IModuleRouter`, `IServiceProvider` — framework-agnostic contracts in `src/Shared/`

### Wiring System

Module registration follows a specific flow in `src/wiring/index.ts`:
1. ServiceProvider registers services in Gravito container (via `bootstrap.ts`)
2. `register*()` functions resolve services from container → construct Controller → register routes
3. `routes.ts` calls all `register*()` functions during bootstrap

### ORM / Repository Strategy

The entire persistence layer is switchable via the `ORM` environment variable:
- `memory` — in-memory (used in tests and E2E)
- `drizzle` — Drizzle ORM
- `atlas` — Gravito Atlas ORM (default with DB)

Key components:
- `IDatabaseAccess` (`src/Shared/Infrastructure/`) — ORM-agnostic query interface
- `DatabaseAccessBuilder` — creates the right adapter based on ORM env var
- `RepositoryRegistry` — distributed pattern; each module self-registers its repository factory
- Repository implementations receive `IDatabaseAccess`, never import ORM libraries directly

### Shared Layer (`src/Shared/`)

- **Domain**: `IRepository`, `ValueObject`, `BaseEntity`, `AggregateRoot`, `DomainEvent`
- **Application**: `ApiResponse`, `AppException`, `ErrorCodes`, `BaseDTO`
- **Infrastructure**: `IDatabaseAccess`, ORM adapters, AuthMiddleware, framework adapters
- **Presentation**: `IHttpContext`, `IModuleRouter`, route helpers

### Foundation Layer (`src/Foundation/`)

Contains external service integrations (not domain modules). Currently: `BifrostClient` — HTTP client wrapping Bifrost AI Gateway API (virtual key CRUD, usage queries, model listing).

## Testing

- CI runs with `ORM=memory` — no database required
- Feature tests (`tests/Feature/`) use a test server helper and HTTP client (`tests/Feature/lib/`)
- Feature tests include OpenAPI spec validation (`api-spec.test.ts`, `api-parity.test.ts`)
- E2E tests (Playwright) auto-start the app with `ORM=memory` on port 3001

## Key Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `ORM` | Persistence backend (`memory`/`drizzle`/`atlas`) | `atlas` |
| `ENABLE_DB` | Enable database (`false` disables Atlas) | `true` |
| `DB_CONNECTION` | Database driver (`sqlite`/`postgres`/`mysql`) | `sqlite` |
| `BIFROST_API_URL` | Bifrost gateway endpoint | — |
| `BIFROST_MASTER_KEY` | Bifrost authentication key | — |
| `JWT_SECRET` | JWT signing secret | — |
| `PORT` | HTTP server port | `3000` |

## Adding a New Module

1. Generate scaffold: `bun run generate:module MyModule [--db]`
2. Follow the DDD layer structure (Domain → Application → Infrastructure → Presentation)
3. Create ServiceProvider, register in `src/bootstrap.ts`
4. Add `register*()` function in `src/wiring/index.ts`
5. Call it from `src/routes.ts`
6. Domain entities need: `createDefault()`, `fromDatabase()`, `toDTO()`, `toDatabaseRow()`
