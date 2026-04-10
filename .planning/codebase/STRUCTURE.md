# Codebase Structure

**Analysis Date:** 2026-04-10

## Directory Layout

```
src/
├── index.ts                          # Entry point - starts server
├── app.ts                            # createApp() wrapper for bootstrap
├── bootstrap.ts                      # Full application initialization (DI, ORM, routes)
├── routes.ts                         # Route registration orchestrator
│
├── Foundation/                       # Cross-cutting infrastructure (external APIs, base clients)
│   └── Infrastructure/
│       ├── Providers/
│       │   └── FoundationServiceProvider.ts      # Registers bifrostClient singleton
│       └── Services/
│           └── BifrostClient/                    # LLM gateway client (Bifrost)
│               ├── BifrostClient.ts
│               ├── BifrostClientConfig.ts
│               ├── retry.ts
│               ├── types.ts
│               ├── errors.ts
│               └── index.ts
│
├── Modules/                          # 13 independent domain modules (zero circular deps)
│   ├── Health/                       # System health & dependency checks
│   ├── Auth/                         # User authentication (JWT, login, register)
│   ├── Profile/                      # User identity & personal info
│   ├── Organization/                 # Org management, members, roles, invitations
│   ├── ApiKey/                       # User-level API keys
│   ├── Credit/                       # Credit account, topup, deduction, transactions
│   ├── Dashboard/                    # Read-only aggregated metrics (no Domain layer)
│   ├── CliApi/                       # CLI command forwarding (device flow)
│   ├── SdkApi/                       # SDK API endpoints (App Key Bearer auth)
│   ├── AppModule/                    # App registration, module subscriptions
│   ├── AppApiKey/                    # Application-level API keys
│   ├── DevPortal/                    # Developer portal (app management, webhooks)
│   └── Contract/                     # Contract lifecycle (create, activate, renew, expire)
│
├── Shared/                           # Cross-module base classes & interfaces (framework-agnostic)
│   ├── Application/
│   │   ├── BaseDTO.ts                # Base class for all DTOs
│   │   ├── ApiResponse.ts            # Standard response wrapper `{ success, data?, error? }`
│   │   ├── AppException.ts           # Base exception for app-level errors
│   │   └── ErrorCodes.ts             # Centralized error code enum
│   │
│   ├── Domain/
│   │   ├── AggregateRoot.ts          # Base class for all Aggregates
│   │   ├── BaseEntity.ts             # Base class for Entities
│   │   ├── ValueObject.ts            # Base class for ValueObjects
│   │   ├── IRepository.ts            # Generic repository interface T => T
│   │   ├── DomainEvent.ts            # Base class for domain events
│   │   └── DomainEventDispatcher.ts  # Event bus (singleton, observer pattern)
│   │
│   ├── Infrastructure/
│   │   ├── IServiceProvider.ts       # DI container interface & ModuleServiceProvider base
│   │   ├── IDatabaseAccess.ts        # ORM-agnostic database operations interface
│   │   ├── IDatabaseConnectivityCheck.ts
│   │   ├── ICacheService.ts
│   │   ├── IRedisService.ts
│   │   ├── Middleware/
│   │   │   ├── AuthMiddleware.ts     # Extracts & validates JWT from request
│   │   │   └── ModuleAccessMiddleware.ts  # Checks if org has module subscription
│   │   └── Framework/
│   │       ├── GravitoServiceProviderAdapter.ts  # Wraps ModuleServiceProvider for Gravito
│   │       ├── GravitoModuleRouter.ts            # Wraps Gravito router to implement IModuleRouter
│   │       ├── GravitoHealthAdapter.ts           # Health check endpoint
│   │       ├── GravitoDocsAdapter.ts             # Swagger/OpenAPI docs
│   │       ├── GravitoRedisAdapter.ts
│   │       └── GravitoErrorAdapter.ts
│   │
│   └── Presentation/
│       ├── IHttpContext.ts           # Framework-agnostic HTTP request/response
│       ├── IModuleRouter.ts          # Framework-agnostic route registration
│       ├── IAuthRouter.ts
│       ├── ApiResponse.ts
│       └── routerHelpers.ts
│
├── wiring/                           # DI container, ORM switching, repository factories
│   ├── index.ts                      # 13 registerXxx(core) functions (route wiring)
│   ├── RepositoryRegistry.ts         # Maintains map of repository types
│   ├── RepositoryFactory.ts          # Selects ORM via getCurrentORM() env var
│   ├── RepositoryFactoryGenerator.ts # Code generator for repo factories
│   ├── DatabaseAccessBuilder.ts      # Builds IDatabaseAccess from ORM selection
│   └── CurrentDatabaseAccess.ts      # Global IDatabaseAccess instance (singleton pattern)
│
├── Pages/                            # SSR HTML pages (admin, member dashboards)
│   ├── Admin/
│   └── Member/
│
├── views/                            # HTML templates (Gravito)
│
└── __tests__/                        # Integration tests
    └── integration/

config/
├── index.ts                          # Configuration object builder

database/
├── migrations/                       # Database schema migrations

```

## Directory Purposes

**`src/`**
- Purpose: All TypeScript source code
- Contains: 13 modules, shared layer, foundation, DI wiring, configuration

**`src/Foundation/`**
- Purpose: Application-level infrastructure that doesn't fit in a domain module
- Contains: `BifrostClient` (external LLM gateway integration)
- Key files: 
  - `FoundationServiceProvider.ts` - registers `bifrostClient` singleton
  - `BifrostClient.ts` - HTTP client with retry logic, error handling, type definitions

**`src/Modules/*/`** (each module follows identical structure)
- Purpose: Domain-driven module with complete isolation
- Structure: `Application/`, `Domain/`, `Infrastructure/`, `Presentation/`, `__tests__/`
- Entry point: `index.ts` exports Controller, route registration function, ServiceProvider
- Example: `src/Modules/Credit/` has `CreditController`, `registerCreditRoutes()`, `CreditServiceProvider`

**`src/Modules/*/Domain/`**
- Purpose: Pure business rules, no I/O or framework dependencies
- Contains:
  - `Aggregates/` - Aggregate Root classes (e.g., `CreditAccount`) with invariant methods
  - `Entities/` - Entity classes (parts of aggregates)
  - `ValueObjects/` - Value classes with validation (e.g., `Balance`, `Email`)
  - `Services/` - Domain Services with pure business logic across aggregates
  - `Repositories/` - **Interfaces only** (implementations in Infrastructure)
  - `Events/` - Domain Event definitions

**`src/Modules/*/Application/`**
- Purpose: Use case orchestration, application logic
- Contains:
  - `Services/` - One service per use case (e.g., `TopUpCreditService`, `GetBalanceService`)
  - `DTOs/` - Data Transfer Objects for layer boundaries
- Pattern: Services are constructor-injected with repositories and domain services, one `execute()` method per service

**`src/Modules/*/Infrastructure/`**
- Purpose: Persistence, DI registration, external API integration
- Contains:
  - `Repositories/` - Repository implementations (e.g., `CreditAccountRepository` implements `ICreditAccountRepository`)
  - `Providers/` - `ModuleServiceProvider` subclass for DI registration
- Pattern: Repositories use `IDatabaseAccess`, ServiceProvider uses `IContainer.singleton()` and `IContainer.bind()`

**`src/Modules/*/Presentation/`**
- Purpose: HTTP interface
- Contains:
  - `Controllers/` - Controller classes (constructor-injected application services)
  - `Routes/` - Route registration function (e.g., `registerCreditRoutes(router, controller)`)
  - `Requests/` - Zod FormRequest classes for validation
  - `Middleware/` - Module-specific middleware
- Pattern: `controller.method(ctx)` receives `IHttpContext`, returns `Response`

**`src/Shared/`**
- Purpose: Framework-agnostic base classes and interfaces shared by all modules
- Contains: No business logic, only abstractions and base classes
- Organized by layer: `Domain/`, `Application/`, `Infrastructure/`, `Presentation/`
- Key exports: `IRepository`, `AggregateRoot`, `ValueObject`, `DomainEventDispatcher`, `IContainer`, `IDatabaseAccess`, `IHttpContext`, `IModuleRouter`

**`src/wiring/`**
- Purpose: Dependency injection wiring and ORM switching logic
- Key files:
  - `index.ts` - 13 `registerXxx(core)` functions that instantiate controllers and register routes
  - `RepositoryFactory.ts` - Selects ORM (`memory`/`drizzle`/`atlas`) from env var
  - `RepositoryRegistry.ts` - Maintains mapping of model types to repository implementations
  - `DatabaseAccessBuilder.ts` - Builds `IDatabaseAccess` instance from selected ORM
  - `CurrentDatabaseAccess.ts` - Global singleton holding active `IDatabaseAccess`

**`config/`**
- Purpose: Application configuration (database, environment, logging)
- Key file: `config/index.ts` - builds configuration object consumed by Gravito bootstrap

**`database/migrations/`**
- Purpose: Database schema migrations
- Files: SQL or ORM-specific migration files

**`src/__tests__/`**
- Purpose: Integration tests
- Location: `src/__tests__/integration/` contains test files

## Key File Locations

**Entry Points:**
- `src/index.ts` - Server startup, calls `createApp()` from HTTP server
- `src/app.ts` - `createApp()` function, calls `bootstrap()`
- `src/bootstrap.ts` - Full initialization (ORM, DI, modules, routes)
- `src/routes.ts` - Route registration orchestrator, calls 13 `registerXxx()` functions

**Configuration:**
- `config/index.ts` - Builds configuration object (database URL, port, etc.)
- `tsconfig.json` - Path aliases (e.g., `@/*` → `src/*`), strict mode enabled
- `package.json` - Dependencies, scripts

**Core Logic - Credit Module Example:**
- Domain Aggregate: `src/Modules/Credit/Domain/Aggregates/CreditAccount.ts`
- Domain Service: `src/Modules/Credit/Domain/Services/CreditDeductionService.ts`
- Repository Interface: `src/Modules/Credit/Domain/Repositories/ICreditAccountRepository.ts`
- Repository Implementation: `src/Modules/Credit/Infrastructure/Repositories/CreditAccountRepository.ts`
- Application Service: `src/Modules/Credit/Application/Services/TopUpCreditService.ts`
- Controller: `src/Modules/Credit/Presentation/Controllers/CreditController.ts`
- Routes: `src/Modules/Credit/Presentation/Routes/credit.routes.ts`
- ServiceProvider: `src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts`

**Shared Foundation:**
- Domain base classes: `src/Shared/Domain/` (AggregateRoot, Entity, ValueObject, DomainEventDispatcher)
- Framework adapters: `src/Shared/Infrastructure/Framework/` (GravitoServiceProviderAdapter, GravitoModuleRouter)
- DI interfaces: `src/Shared/Infrastructure/IServiceProvider.ts`, `src/Shared/Infrastructure/IDatabaseAccess.ts`

**Testing:**
- Integration tests: `src/__tests__/integration/`
- Module tests: `src/Modules/*//__tests__/` (co-located with implementation)
- Test configuration: `vitest.config.ts` (if present) or jest config

## Naming Conventions

**Files:**
- PascalCase for classes: `CreditAccount.ts`, `CreditController.ts`, `CreditServiceProvider.ts`
- camelCase for functions/utilities: `getCurrentDatabaseAccess.ts`, `createBifrostClient.ts`
- kebab-case for route files: `credit.routes.ts`, `auth.routes.ts`
- kebab-case for test files: `credit.test.ts`, `auth.spec.ts`

**Directories:**
- PascalCase for domain modules: `src/Modules/Credit/`, `src/Modules/Organization/`
- PascalCase for layer directories: `Domain/`, `Application/`, `Infrastructure/`, `Presentation/`
- camelCase for layer subdivisions: `Services/`, `Repositories/`, `Controllers/`, `Aggregates/`, `ValueObjects/`

**Classes:**
- Service: `TopUpCreditService`, `GetBalanceService` (XxxService naming)
- Controller: `CreditController`, `AuthController` (XxxController naming)
- Repository: `CreditAccountRepository`, `OrganizationRepository` (XxxRepository naming)
- Aggregate: `CreditAccount`, `Organization` (entity-like names)
- ValueObject: `Email`, `Balance`, `OrgSlug` (semantic names for domain concepts)
- DTO: `CreditAccountDTO`, `UserProfileDTO` (XxxDTO naming)
- FormRequest: `TopUpRequest`, `RefundRequest` (XxxRequest naming for Zod schemas)
- Event: `CreditDeductedEvent`, `CreditToppedUpEvent` (XxxEvent naming)
- Provider: `CreditServiceProvider`, `AuthServiceProvider` (XxxServiceProvider naming)
- Exception/Error: `AppException` base, domain-specific exceptions inherit from it

**Functions:**
- Service method: `execute()` (all services follow this convention)
- Route registration: `registerCreditRoutes()`, `registerAuthRoutes()` (registerXxxRoutes pattern)
- Route handler registration: `registerCredit()`, `registerAuth()` (registerXxx in wiring/index.ts)
- Middleware factory: `requireAuth()`, `createRoleMiddleware()`, `createModuleAccessMiddleware()`

**Constants/Enums:**
- Error codes: `INSUFFICIENT_BALANCE`, `UNAUTHORIZED`, `PERMISSION_DENIED` (SCREAMING_SNAKE_CASE)
- Event names: `'credit.topped_up'`, `'credit.balance_depleted'` (kebab-case in string)
- Module names: `'credit'`, `'auth'`, `'organization'` (kebab-case)

## Where to Add New Code

**New Feature (within existing module):**
- Primary code: `src/Modules/XxxModule/Application/Services/NewFeatureService.ts`
- Domain logic: `src/Modules/XxxModule/Domain/Aggregates/` or `Domain/Services/`
- Presentation: `src/Modules/XxxModule/Presentation/Controllers/XxxController.ts` (extend existing or new controller)
- Tests: `src/Modules/XxxModule/__tests__/` (co-located)
- Registration: Update `src/Modules/XxxModule/Infrastructure/Providers/XxxServiceProvider.ts` if new services added

**New Module:**
1. Create directory: `src/Modules/NewModule/`
2. Create layer structure:
   ```
   src/Modules/NewModule/
   ├── Domain/
   │   ├── Aggregates/NewAggregate.ts
   │   ├── Repositories/INewRepository.ts
   │   ├── ValueObjects/
   │   ├── Services/
   │   └── Events/
   ├── Application/
   │   ├── Services/CreateNewService.ts
   │   └── DTOs/
   ├── Infrastructure/
   │   ├── Repositories/NewRepository.ts
   │   └── Providers/NewServiceProvider.ts
   ├── Presentation/
   │   ├── Controllers/NewController.ts
   │   ├── Routes/new.routes.ts
   │   └── Requests/
   ├── index.ts (exports Controller, registerNewRoutes, NewServiceProvider)
   └── __tests__/
   ```
3. Create `src/Modules/NewModule/Infrastructure/Providers/NewServiceProvider.ts` extending `ModuleServiceProvider`
4. Create `src/Modules/NewModule/index.ts` with exports
5. Register in `src/bootstrap.ts`:
   ```typescript
   import { NewServiceProvider } from './Modules/NewModule'
   core.register(createGravitoServiceProvider(new NewServiceProvider()))
   ```
6. Register routes in `src/routes.ts`:
   ```typescript
   import { registerNewRoutes } from './wiring'
   registerNewRoutes(core)
   ```
7. Add wiring function in `src/wiring/index.ts`:
   ```typescript
   export const registerNewModule = (core: PlanetCore): void => {
     const router = createGravitoModuleRouter(core)
     const controller = new NewController(
       core.container.make('newService') as NewService,
     )
     registerNewRoutes(router, controller)
   }
   ```

**New Utility/Helper:**
- Shared utilities: `src/Shared/` (in appropriate layer directory)
- Module-specific utilities: `src/Modules/XxxModule/` (typically in Domain or Infrastructure)
- Export from `index.ts` if public

**New Middleware:**
- Global middleware: `src/Shared/Infrastructure/Middleware/`
- Module-specific middleware: `src/Modules/XxxModule/Presentation/Middleware/`
- Pattern: Function returning middleware, e.g., `createRoleMiddleware(role: string): Middleware`

## Special Directories

**`src/Pages/`:**
- Purpose: Server-side rendered HTML pages
- Generated: No
- Committed: Yes
- Contains: Admin and Member dashboard pages
- Pattern: Gravito template rendering (not React/Vue)

**`src/views/`:**
- Purpose: HTML/EJS templates for SSR
- Generated: No
- Committed: Yes
- Pattern: Template files for Gravito views

**`dist/`:**
- Purpose: Compiled JavaScript output
- Generated: Yes (via `bun run build`)
- Committed: No (in .gitignore)

**`.planning/codebase/`:**
- Purpose: GSD architecture documentation (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: No
- Committed: Yes
- Contents: Architecture analysis, structure reference, conventions, testing patterns

**`database/migrations/`:**
- Purpose: Database schema migrations
- Generated: No
- Committed: Yes
- Pattern: SQL or ORM-specific format

---

*Structure analysis: 2026-04-10*
