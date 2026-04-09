# AGENTS.md

This file provides guidance for AI coding agents working in this repository (for example Cursor, Claude Code, and similar tools).

## Project Overview

Draupnir is an AI Service Management Platform built on top of the Bifrost AI Gateway. It handles authentication, API key management, usage tracking, credit system, and organization management. Built with the Gravito DDD framework running on Bun with TypeScript.

## Documentation

詳細文件索引：[`docs/draupnir/`](./docs/draupnir/) — 包含架構、設計規格、實作計畫、工程知識。快速導航見 [`docs/draupnir/README.md`](./docs/draupnir/README.md)。

| 位置 | 內容 |
|------|------|
| [`docs/draupnir/architecture/`](./docs/draupnir/architecture/) | 架構圖表：DDD 四層、模組依賴、ER、認證流程 |
| [`docs/draupnir/knowledge/`](./docs/draupnir/knowledge/) | DDD 模式、分層規則、Repository、Domain Events、測試策略 |
| [`docs/draupnir/specs/`](./docs/draupnir/specs/) | 功能規格、設計決策、架構評審 |
| [`docs/draupnir/plans/`](./docs/draupnir/plans/) | Phase 1-7 實作計畫 |
| [`docs/draupnir/ROADMAP.md`](./docs/draupnir/ROADMAP.md) | 進度與技術決策表 |

## Commands

See [`docs/draupnir/COMMANDS.md`](./docs/draupnir/COMMANDS.md) for full reference.

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

**Key points**: Framework-agnostic contracts in `src/Shared/`; ORM switchable via `ORM` env var; Repository pattern with `IDatabaseAccess`. Details: [`docs/draupnir/architecture/`](./docs/draupnir/architecture/)

## Testing

- CI runs with `ORM=memory` — no database required
- Feature tests (`tests/Feature/`) include OpenAPI spec validation
- E2E tests (Playwright) auto-start the app with `ORM=memory` on port 3001
- Test strategy: [`docs/draupnir/knowledge/`](./docs/draupnir/knowledge/)

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
