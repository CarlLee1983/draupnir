# CLAUDE.md

Project guidance for this repository lives in **[AGENTS.md](./AGENTS.md)**. Read that file for commands, architecture, testing, and conventions.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Draupnir — LLM Gateway Abstraction**

Draupnir is an existing TypeScript + Bun + DDD service that currently speaks directly to Bifrost API Gateway for LLM virtual-key management, usage tracking, and chat-completion proxying. This project introduces an `ILLMGatewayClient` abstraction so business logic no longer imports Bifrost types, and extracts the `BifrostClient` into a standalone `packages/bifrost-sdk/` workspace package so future gateway backends (OpenRouter, Gemini, mocks) can be swapped in at build time without touching the application layer.

**Core Value:** **No file under `src/Modules/` or `src/Foundation/Application/` may import a Bifrost-specific symbol after this milestone ships.** Gateway choice is a compile-time wiring decision made in ServiceProviders, not a runtime concern, and never a domain concern.

### Constraints

- **Tech stack**: Bun runtime, TypeScript strict, Biome for lint/format, Zod for validation. No new framework dependencies; stay within the existing stack.
- **Compatibility**: All existing HTTP routes, request/response shapes, and DB schemas must remain unchanged. Only internal wiring changes. Clients of Draupnir should notice nothing.
- **Test baseline**: The full Bun test suite + Playwright E2E suite must pass at every phase boundary. No skipped or `todo` tests introduced.
- **Immutability**: Per project coding rules (`~/.claude/rules/coding-style.md`), new types use `readonly` fields. No mutation; always return new objects.
- **Language**: Commit messages, docs, and PROJECT artifacts in Traditional Chinese (Taiwan) per user global policy. Code and identifiers in English.
- **Commit format**: `<type>: [ <scope> ] <subject>` per user global git policy.
- **No DB migration**: The `bifrost_virtual_key_id` column name stays. TS-only rename.
- **Gateway decided at wire time, not runtime**: ServiceProvider binds `llmGatewayClient` once. No env-var factory, no conditional adapter selection at call sites.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.3.0 - Backend application, domain logic, services, controllers
- JavaScript/JSX - Frontend React components (React 19.2.5)
- YAML 2.6.0 - Configuration files
- SQL - Database schema and migrations
## Runtime
- Bun (runtime and package manager, latest) - Primary runtime for backend services, build toolchain, and test runner
- Node.js compatible (ES2020 target)
- Bun - Primary dependency manager and task runner
- Lockfile: `bun.lock` (present, committed)
## Frameworks
- Gravito DDD Framework (@gravito/core 3.0.1) - Application framework implementing Domain-Driven Design pattern
- React 19.2.5 - UI framework
- Inertia.js 3.0.3 (@inertiajs/react) - Server-side rendering bridge
- Vite 8.0.8 - Build tool and dev server for frontend
- Bun test - Native Bun testing framework (preferred for unit/integration)
- Vitest 4.0.18 - Alternative test runner compatibility
- Playwright 1.48.0 (@playwright/test) - End-to-end testing
- Biome 2.4.11 - Linter and formatter (replaces ESLint + Prettier)
- TypeScript 5.3.0 (tsc) - Type checking
- Drizzle Kit 0.31.9 - Database migration tooling
## Key Dependencies
- fetch (native Bun/Browser API) - HTTP client for Bifrost API calls
- @libsql/client 0.17.0 - SQLite client (Turso/LibSQL compatible)
- drizzle-orm 0.45.1 - Type-safe ORM layer
- Schema location: `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts`
- jsonwebtoken 9.0.0 (@types/jsonwebtoken 9.0.7) - JWT token generation and verification
- zod 4.3.6 - Schema validation and type inference
- @hookform/resolvers 5.2.2 - Form validation integration
- react-hook-form 7.72.1 - React form management
- ajv 8.18.0, ajv-formats 3.0.1 - JSON Schema validation
- @radix-ui/* (various) - Headless UI component library (avatar, dialog, dropdown, label, separator, slot, toast)
- lucide-react 1.8.0 - Icon library
- recharts 3.8.1 - Charting library
- tailwindcss 3 - CSS utility framework
- tailwind-merge 3.5.0 - Tailwind class merging
- class-variance-authority 0.7.1 - Component variant management
- @tanstack/react-table 8.21.3 - Headless table component (for dashboard displays)
- @types/bun 1.3.10 - Bun type definitions
- @types/react 19.2.14, @types/react-dom 19.2.3 - React type definitions
- mongodb 7.1.1 - MongoDB driver (dev/testing only)
- autoprefixer 10.4.27, postcss 8.5.9 - CSS processing pipeline
- @vitejs/plugin-react 6.0.1 - Vite React plugin
- yaml 2.6.0 - YAML parsing for config
## Configuration Files
- `tsconfig.json` - Main backend config (ES2020 target, strict mode enabled)
- `tsconfig.frontend.json` - Frontend React config
- Path aliases: `@/*` → `./src/*`
- `vite.config.ts` - Frontend build config
- `biome.json` - Linter and formatter settings
- `playwright.config.ts` - E2E test configuration
- `config/app.ts` - App name, environment, port, debug settings
- `src/bootstrap.ts` - DDD application bootstrap sequence
- `src/app.ts` - Application factory function
## Environment Configuration
- `BIFROST_API_URL` - Bifrost AI Gateway base URL (required for BifrostClient initialization)
- `BIFROST_MASTER_KEY` - Bifrost API master key for governance operations (required)
- `DATABASE_URL` - LibSQL/SQLite connection string (default: `file:local.db`)
- `APP_ENV` - Application environment (development/production)
- `PORT` - HTTP server port (default: 3000)
- `APP_NAME` - Application identifier (default: draupnir)
- `APP_URL` - Public application URL
- `APP_DEBUG` - Debug mode flag
- `ENABLE_DB` - Enable/disable database (default: enabled)
- `CACHE_DRIVER` - Cache backend selection (memory/redis/other)
- `ENABLE_FRONTEND` - Frontend dev server toggle
## Platform Requirements
- Bun 1.0+ runtime
- TypeScript 5.3+
- Node.js compatible environment (for CLI compatibility)
- POSIX shell (for scripts in `scripts/`)
- Bun 1.0+ runtime
- SQLite-compatible database (LibSQL/Turso for remote)
- Bifrost AI Gateway 1.0+ (API Gateway dependency)
- Network access to Bifrost API endpoints
- Backend: `dist/index.js` (ESM format, Bun target)
- Frontend: `public/build/` (Vite bundle)
## Build & Startup
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Service files: PascalCase ending in `Service` (e.g., `CreateOrganizationService.ts`, `CreditDeductionService.ts`)
- Domain files: PascalCase by domain concept (e.g., `Organization.ts`, `User.ts`, `CreditAccount.ts`)
- DTO files: PascalCase ending in `DTO` (e.g., `OrganizationDTO.ts`, `RegisterUserDTO.ts`)
- Request validators: PascalCase ending in `Request` (e.g., `CreateOrganizationRequest.ts`, `InviteMemberRequest.ts`)
- Repository interfaces: PascalCase starting with `I`, ending in `Repository` (e.g., `IOrganizationRepository.ts`)
- Repository implementations: PascalCase ending in `Repository` (e.g., `OrganizationRepository.ts`)
- Value objects: PascalCase domain name (e.g., `OrgSlug.ts`, `Email.ts`, `Password.ts`)
- Test files: Mimic source file name with `.test.ts` or `.integration.test.ts` suffix
- camelCase for all functions and methods
- Event handlers: `handle` prefix (e.g., `handleBalanceDepletedService`)
- Service execute methods: always named `execute()` (not `run`, `perform`, etc.)
- Getter methods: `get` prefix (e.g., `getId()`, `getBalance()`, `getTokenHash()`)
- Boolean checks: `is` or `can` prefix (e.g., `isValid()`, `isExpired()`, `canActivate()`)
- Repository methods: `findById()`, `findBySlug()`, `findAll()`, `save()`, `delete()`, `withTransaction()`
- camelCase for all variables and properties
- Constants in modules: UPPER_SNAKE_CASE (e.g., `DEFAULT_OPTIONS`, `RETRYABLE_STATUS_CODES`)
- Private fields in classes: `private readonly` or `private` prefix (e.g., `private config`, `private props`)
- Aggregate root props: stored in private `props` object (see Organization.ts pattern)
- Interface names start with `I` prefix for contract/repository interfaces (e.g., `IOrganizationRepository`, `IContainer`, `IDatabaseAccess`)
- Type names are PascalCase without prefix (e.g., `CreateOrganizationRequest`, `OrganizationProps`)
- Enum-like objects use `as const` pattern (e.g., `ErrorCodes`)
- Generic types use single letter or descriptive names (e.g., `<T>`, `<Request>`, `<Response>`)
## Code Style
- Tool: Biome v2.4.11
- Indent: 2 spaces
- Line width: 100 characters
- Quote style: single quotes for JavaScript (`'use-single-quotes'`)
- Tool: Biome with recommended rules enabled
- Exception: `noConsole` is disabled, but `console.log` is allowed (see biome.json)
- No unused variables: `noUnusedLocals` and `noUnusedParameters` enforced via TypeScript
- No unused imports automatically removed by Biome
- `strict: true` - all strict checks enabled
- `noImplicitAny: true` - all types must be explicit
- `strictNullChecks: true` - null/undefined must be handled explicitly
- `strictFunctionTypes: true` - function parameter/return types strictly checked
- `noUnusedLocals: true` - no unused variables allowed
- `noUnusedParameters: true` - no unused function parameters allowed
- `noImplicitReturns: true` - all code paths must return a value
- `noFallthroughCasesInSwitch: true` - switch statements must have break/return
## Import Organization
- `@/*` maps to `./src/*` (primary alias for cross-module imports)
- `@gravito/prism`, `@gravito/signal`, `@gravito/stasis` mapped in tsconfig.json
## Error Handling
- `NotFoundException` (404) - resource not found
- `ValidationException` (422) - input validation failed
- `ConflictException` (409) - business logic conflict
- `InternalException` (500) - server error
## Validation
- Value objects validate in constructor and throw on invalid state
- Example: `new OrgSlug(slug)` validates format, throws if invalid
- Never return validation errors from value object constructors; throw immediately
- Services validate business rules (not input format—that's Presentation layer)
- Return `{ success: false, error: 'CODE' }` for business logic violations
- Throw exceptions only for unexpected/system errors
## Comments
- Complex algorithms or non-obvious business logic
- DDD patterns: aggregate roots, domain events, value objects
- Critical invariants (e.g., immutability guarantees, transaction boundaries)
- Integration points with external systems (Bifrost API, database transactions)
- Use JSDoc for public service methods
- Include `@param`, `@returns` tags
- Document exceptions that may be thrown
## Function Design
- Use objects for multiple parameters (not positional args)
- Make parameters `readonly` when possible
- Example: `request(operation: { method: string; path: string }, options: { body?: unknown; auth?: string })`
- Services return `Response` objects with typed payload
- Domain objects never return null; throw or use Optional pattern
- Use discriminated unions for complex responses
## Module Design
- Each module exports public API from index files
- Example: `src/Foundation/index.ts` exports `BifrostClient`, service provider, types
- Domain layer types exported from module root, not from deep paths
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Strict layering: Presentation → Application → Domain → Infrastructure (dependency flows downward only)
- Framework-agnostic: All modules depend on interfaces (IContainer, IDatabaseAccess, IHttpContext) not concrete Gravito framework code
- Repository pattern: Domain layers define interfaces, Infrastructure implements them
- Module-based organization: 13 independent modules with zero circular dependencies (verified DAG)
- ValueObject-centric validation: Complex types (Email, Balance, TokenClaims) validate at creation time
- Domain Event bus: Cross-module decoupling via DomainEventDispatcher (observer pattern)
- Immutable aggregates: State changes return new instances, never mutate
## Layers
- Purpose: HTTP request handling, input validation (Zod), authorization, response formatting
- Location: `src/Modules/*/Presentation/Controllers/`, `src/Modules/*/Presentation/Routes/`
- Contains: Controllers (e.g., `CreditController`), Route registration functions (e.g., `registerCreditRoutes`)
- Depends on: Application Services (e.g., `TopUpCreditService`), Middleware (Auth, ModuleAccess), Zod FormRequests
- Used by: HTTP router via `src/wiring/` registration functions
- Example: `src/Modules/Credit/Presentation/Controllers/CreditController.ts` - constructor-injected services, methods take `IHttpContext`, return `Response`
- Purpose: Use case orchestration, transaction boundaries, authorization checks, Domain Event publishing
- Location: `src/Modules/*/Application/Services/`
- Contains: Service classes (one per use case), DTOs for inter-layer data transfer
- Depends on: Domain layer (Aggregates, Repository interfaces), Application Exception, other Application Services
- Used by: Controllers, Domain Event handlers, other modules' Application Services
- Example: `src/Modules/Credit/Application/Services/TopUpCreditService.ts` - constructor receives `ICreditAccountRepository`, calls `repository.findBy()`, then publishes domain event
- Purpose: Business rules, invariant validation, state transitions, pure calculations
- Location: `src/Modules/*/Domain/Aggregates/`, `src/Modules/*/Domain/Entities/`, `src/Modules/*/Domain/ValueObjects/`, `src/Modules/*/Domain/Services/`, `src/Modules/*/Domain/Repositories/` (interfaces only)
- Contains: Aggregate roots (e.g., `CreditAccount`), Entities, ValueObjects (e.g., `Balance`, `Email`), Domain Services (pure business rules), Repository interfaces
- Depends on: Shared domain base classes (AggregateRoot, Entity, ValueObject), Domain Events, nothing else
- Used by: Application Services (for aggregates), Infrastructure layer (implements repository interfaces)
- Example: `src/Modules/Credit/Domain/Aggregates/CreditAccount.ts` - methods like `applyDeduction(amount: string): CreditAccount` return new instance, no I/O
- Purpose: Persistence (Repository implementations), external API clients, DI container registration, framework integration
- Location: `src/Modules/*/Infrastructure/Repositories/`, `src/Modules/*/Infrastructure/Providers/`
- Contains: Repository implementations, Service Provider (DI registration), optional middleware
- Depends on: Domain Repository interfaces, IDatabaseAccess, IContainer
- Used by: Application Services (via dependency injection), Framework (Gravito bootstrap)
- Example: `src/Modules/Credit/Infrastructure/Repositories/CreditAccountRepository.ts` - implements `ICreditAccountRepository`, uses `IDatabaseAccess` for queries
## Data Flow
- Aggregates are loaded from persistence, modified through domain methods, saved back as complete units
- No shared mutable state across requests
- Transaction boundaries managed by Application Services (via `IDatabaseAccess`)
- Domain Events provide asynchronous, decoupled reactions to state changes
## Key Abstractions
- Purpose: Framework-agnostic service resolution
- Examples: `src/Shared/Infrastructure/IServiceProvider.ts`
- Pattern: `container.singleton('serviceName', (c) => new Service(c.make('dependency')))` registers services; `core.container.make('serviceName')` resolves at runtime
- Used in: All ServiceProviders (e.g., `CreditServiceProvider.register(container)`)
- Lifecycle: `singleton()` for stateless services (repositories, domain services), `bind()` for stateful services (request handlers)
- Purpose: ORM-agnostic database operations
- Examples: `src/Shared/Infrastructure/IDatabaseAccess.ts`
- Pattern: Repositories use `this.db.query()`, `this.db.insert()`, `this.db.update()`, `this.db.delete()` methods
- Switchable: Memory-based (tests), Drizzle, Atlas via `src/wiring/RepositoryFactory.ts` (controlled by `ORM` env var)
- Location: Set globally in `src/wiring/CurrentDatabaseAccess.ts`, accessed via `getCurrentDatabaseAccess()`
- Purpose: Framework-agnostic HTTP request/response handling
- Examples: `src/Shared/Presentation/IHttpContext.ts`
- Pattern: Controllers call `ctx.json(data)`, `ctx.getParam('orgId')`, `ctx.getQuery('page')`, `ctx.get('validated')`
- Implemented by: Gravito framework adapter (IHttpContext wraps Gravito Hono context)
- Purpose: Framework-agnostic route registration
- Examples: `src/Shared/Presentation/IModuleRouter.ts`, implemented in `src/Shared/Infrastructure/Framework/GravitoModuleRouter.ts`
- Pattern: Routes call `router.post('/path', [middleware], FormRequest, handler)` with flexible middleware/validation combos
- Used by: Each module's route registration function (e.g., `registerCreditRoutes(router, controller)`)
- Purpose: Decoupled cross-module communication
- Examples: `src/Shared/Domain/DomainEventDispatcher.ts`, published in Application Services, subscribed in ServiceProvider.boot()
- Pattern: `dispatcher.dispatch(new CreditToppedUpEvent(...))` in service, then `dispatcher.on('credit.topped_up', async (event) => { ... })` in provider boot
- Usage: Credit module publishes events → AppModule subscribes to sync API keys back to Bifrost
- Purpose: Module-scoped service registration
- Examples: `src/Modules/*/Infrastructure/Providers/*ServiceProvider.ts` (e.g., `CreditServiceProvider`)
- Pattern: Extends `ModuleServiceProvider` (from `src/Shared/Infrastructure/IServiceProvider.ts`), implements `register()` and optional `boot()`
- Registered in: `src/bootstrap.ts` via `core.register(createGravitoServiceProvider(new CreditServiceProvider()))`
## Entry Points
- Location: `src/index.ts` → calls `createApp()` from `src/app.ts` → calls `bootstrap()` from `src/bootstrap.ts`
- Triggers: Server startup (Bun HTTP server)
- Responsibilities: 
- Location: `src/routes.ts` → calls 13 `registerXxx(core)` functions from `src/wiring/index.ts`
- Example: `registerCredit(core)` instantiates `CreditController`, injects 4 services from container, calls `registerCreditRoutes(router, controller)`
- Pattern: Each module's registration function follows same template:
- Location: Module-specific route files, e.g., `src/Modules/Credit/Presentation/Routes/credit.routes.ts`
- Pattern: `router.post('/api/organizations/:orgId/credits/topup', [middlewares], FormRequest, (ctx) => controller.topUp(ctx))`
- Executes: Middleware chain → validation → controller method → service execution → response
## Error Handling
- Domain layer throws domain-specific exceptions (subclasses of `Error`)
- Application Services catch and convert to standardized `ApiResponse` objects (e.g., `{ success: false, error: 'INSUFFICIENT_BALANCE' }`)
- Controllers call `ctx.json(result, result.success ? 200 : 400)` to return HTTP status based on service result
- Global error handler in `src/bootstrap.ts` catches unhandled exceptions and returns 500 responses
- Error codes centralized in `src/Shared/Application/ErrorCodes.ts`
## Cross-Cutting Concerns
- Console-based via `console.log()` in ServiceProviders (boot phase) and services
- No dedicated logging framework (can be added via ILogger interface pattern)
- Example: `console.log('💰 [Credit] Module loaded')` in CreditServiceProvider.boot()
- Input validation: Zod FormRequest classes in presentation layer (e.g., `TopUpRequest` defines schema)
- Business validation: Domain layer (e.g., `Balance.fromString()` throws if negative)
- Authorization: Middleware (`requireAuth()`, `createRoleMiddleware()`, `createModuleAccessMiddleware()`) and Application Services
- JWT-based: `AuthMiddleware.getAuthContext(ctx)` extracts and validates JWT from request header
- Registered routes require `requireAuth()` middleware
- Token claims decoded into `{ userId, orgId, role, ... }` and attached to context
- Scope checking: Application Services receive auth context, verify user has permission (e.g., `OrgAuthorizationHelper.checkOrgAccess()`)
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
