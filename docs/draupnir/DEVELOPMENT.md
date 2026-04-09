# Development Guide

All-in-one reference for local development, architecture decisions, and common operations.

## Architecture

### Module Structure

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

**Key points**: Framework-agnostic contracts in `src/Shared/`; ORM switchable via `ORM` env var; Repository pattern with `IDatabaseAccess`. Details: [`architecture/`](./architecture/)

## Testing

- CI runs with `ORM=memory` — no database required
- Feature tests (`tests/Feature/`) include OpenAPI spec validation
- E2E tests (Playwright) auto-start the app with `ORM=memory` on port 3001
- Test strategy: [`knowledge/`](./knowledge/)

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
