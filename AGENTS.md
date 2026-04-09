# AGENTS.md

This file provides guidance for AI coding agents working in this repository (for example Cursor, Claude Code, and similar tools).

## Project Overview

Draupnir is an AI Service Management Platform built on top of the Bifrost AI Gateway. It handles authentication, API key management, usage tracking, credit system, and organization management. Built with the Gravito DDD framework running on Bun with TypeScript.

## Documentation Map

完整的規劃文件、設計決策、工程知識、實作計畫皆收納在 [`docs/`](./docs) 目錄：

### 核心文件索引

| 位置 | 內容 | 適用情景 |
|------|------|--------|
| **[`docs/draupnir/`](./docs/draupnir/)** | 專案規劃、架構、知識、計畫 | **首選** — 設計決策、實作參考、架構理解 |
| **[`docs/draupnir/architecture/`](./docs/draupnir/architecture/)** | DDD 四層架構圖、模組依賴、ER 圖、認證流程 | 快速上手、架構設計、新模組規劃 |
| **[`docs/draupnir/knowledge/`](./docs/draupnir/knowledge/)** | DDD 戰術、Repository 模式、分層規則、Domain Events、測試策略 | 編寫程式碼、設計模組、疑難排解 |
| **[`docs/draupnir/specs/`](./docs/draupnir/specs/)** | 功能規格、設計決策、架構評審 | 理解功能需求、驗證設計 |
| **[`docs/draupnir/plans/`](./docs/draupnir/plans/)** | Phase 1-7 實作計畫（可執行、分步驟） | 代理執行任務、任務分解 |
| **[`docs/draupnir/reviews/`](./docs/draupnir/reviews/)** | 代碼審查紀錄、驗證清單 | 檢視審查結果、驗收標準 |
| **[`docs/draupnir/ROADMAP.md`](./docs/draupnir/ROADMAP.md)** | 7 階段產品路線、技術決策表 | 整體進度、技術棧選擇 |
| **[`docs/reference/`](./docs/reference/)** | Bifrost 上游 API 快照與轉出文件 | 外部 API 整合參考 |
| **[`openapi.yaml`](./openapi.yaml)** | Draupnir 本專案 HTTP API 規格（來源） | API 規格驗證、測試對照 |

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

### 🏛️ 架構文件完整索引

新成員快速上手建議順序：

1. **[`docs/draupnir/architecture/ddd-layered-architecture.md`](./docs/draupnir/architecture/ddd-layered-architecture.md)** — DDD 四層架構圖、13 模組評分表（**入門必讀**）
2. **[`docs/draupnir/architecture/module-dependency-map.md`](./docs/draupnir/architecture/module-dependency-map.md)** — 模組依賴圖、耦合度分析、無環形驗證
3. **[`docs/draupnir/architecture/entity-relationship-overview.md`](./docs/draupnir/architecture/entity-relationship-overview.md)** — ER 圖、Aggregate/Entity/VO 映射、資料庫索引
4. **[`docs/draupnir/architecture/auth-flow-diagrams.md`](./docs/draupnir/architecture/auth-flow-diagrams.md)** — JWT、API Key、App Key 認證流程
5. **[`docs/draupnir/knowledge/layer-decision-rules.md`](./docs/draupnir/knowledge/layer-decision-rules.md)** — 分層判斷規則（Domain / Application / Infrastructure 如何選擇）

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

### 📚 工程知識與測試策略

長期可重複引用的知識文件存於 [`docs/draupnir/knowledge/`](./docs/draupnir/knowledge/)：

| 文件 | 適用場景 |
|------|--------|
| [`ddd-testing-anti-patterns.md`](./docs/draupnir/knowledge/ddd-testing-anti-patterns.md) | 撰寫測試時的陷阱、Mock 策略、集成測試 vs 單位測試 |
| [`ddd-aggregate-entity-value-object.md`](./docs/draupnir/knowledge/ddd-aggregate-entity-value-object.md) | Aggregate Root、Entity、Value Object 的特性與測試方式 |
| [`ddd-repository-infrastructure.md`](./docs/draupnir/knowledge/ddd-repository-infrastructure.md) | Repository 模式的 Mock 與真實實現 |
| [`domain-events.md`](./docs/draupnir/knowledge/domain-events.md) | Domain Events 發佈、訂閱、測試 |

## 🚀 Phase 進度與路線圖

**V1 目標進度**：約 85% 完成（8/10 標準已達成）

| Phase | 狀態 | 完成度 | 內容 |
|-------|------|--------|------|
| **Phase 1** | ✅ 完成 | 100% | Foundation（專案初始化、Bifrost Client） |
| **Phase 2** | ✅ 完成 | 100% | Identity（Auth、User、Organization） |
| **Phase 3** | ✅ 完成 | 100% | Key Management（ApiKey、Dashboard） |
| **Phase 4** | ✅ 完成 | 100% | Credit System（額度、使用追蹤） |
| **Phase 5** | 🟡 幾乎 | 95% | Contract & Module（缺模組獨立追蹤） |
| **Phase 6** | 🟡 幾乎 | 90% | App Distribution（SDK/CLI 在獨立 Repo、Portal） |
| **Phase 7** | 🟢 可用 | 70% | Admin Portal（缺內建 Cron、通知通道） |

詳見 [`docs/draupnir/ROADMAP.md`](./docs/draupnir/ROADMAP.md) 與 [`docs/draupnir/VERIFICATION_CHECKLIST.md`](./docs/draupnir/VERIFICATION_CHECKLIST.md)

---

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
