# Architecture

**Analysis Date:** 2026-04-10

## Pattern Overview

**Overall:** Domain-Driven Design (DDD) Four-Layer Architecture

**Key Characteristics:**
- Strict layering: Presentation → Application → Domain → Infrastructure (dependency flows downward only)
- Framework-agnostic: All modules depend on interfaces (IContainer, IDatabaseAccess, IHttpContext) not concrete Gravito framework code
- Repository pattern: Domain layers define interfaces, Infrastructure implements them
- Module-based organization: 13 independent modules with zero circular dependencies (verified DAG)
- ValueObject-centric validation: Complex types (Email, Balance, TokenClaims) validate at creation time
- Domain Event bus: Cross-module decoupling via DomainEventDispatcher (observer pattern)
- Immutable aggregates: State changes return new instances, never mutate

## Layers

**Presentation Layer:**
- Purpose: HTTP request handling, input validation (Zod), authorization, response formatting
- Location: `src/Modules/*/Presentation/Controllers/`, `src/Modules/*/Presentation/Routes/`
- Contains: Controllers (e.g., `CreditController`), Route registration functions (e.g., `registerCreditRoutes`)
- Depends on: Application Services (e.g., `TopUpCreditService`), Middleware (Auth, ModuleAccess), Zod FormRequests
- Used by: HTTP router via `src/wiring/` registration functions
- Example: `src/Modules/Credit/Presentation/Controllers/CreditController.ts` - constructor-injected services, methods take `IHttpContext`, return `Response`

**Application Layer:**
- Purpose: Use case orchestration, transaction boundaries, authorization checks, Domain Event publishing
- Location: `src/Modules/*/Application/Services/`
- Contains: Service classes (one per use case), DTOs for inter-layer data transfer
- Depends on: Domain layer (Aggregates, Repository interfaces), Application Exception, other Application Services
- Used by: Controllers, Domain Event handlers, other modules' Application Services
- Example: `src/Modules/Credit/Application/Services/TopUpCreditService.ts` - constructor receives `ICreditAccountRepository`, calls `repository.findBy()`, then publishes domain event

**Domain Layer:**
- Purpose: Business rules, invariant validation, state transitions, pure calculations
- Location: `src/Modules/*/Domain/Aggregates/`, `src/Modules/*/Domain/Entities/`, `src/Modules/*/Domain/ValueObjects/`, `src/Modules/*/Domain/Services/`, `src/Modules/*/Domain/Repositories/` (interfaces only)
- Contains: Aggregate roots (e.g., `CreditAccount`), Entities, ValueObjects (e.g., `Balance`, `Email`), Domain Services (pure business rules), Repository interfaces
- Depends on: Shared domain base classes (AggregateRoot, Entity, ValueObject), Domain Events, nothing else
- Used by: Application Services (for aggregates), Infrastructure layer (implements repository interfaces)
- Example: `src/Modules/Credit/Domain/Aggregates/CreditAccount.ts` - methods like `applyDeduction(amount: string): CreditAccount` return new instance, no I/O

**Infrastructure Layer:**
- Purpose: Persistence (Repository implementations), external API clients, DI container registration, framework integration
- Location: `src/Modules/*/Infrastructure/Repositories/`, `src/Modules/*/Infrastructure/Providers/`
- Contains: Repository implementations, Service Provider (DI registration), optional middleware
- Depends on: Domain Repository interfaces, IDatabaseAccess, IContainer
- Used by: Application Services (via dependency injection), Framework (Gravito bootstrap)
- Example: `src/Modules/Credit/Infrastructure/Repositories/CreditAccountRepository.ts` - implements `ICreditAccountRepository`, uses `IDatabaseAccess` for queries

## Data Flow

**Typical HTTP Request Flow:**

1. **Request arrives at HTTP route** (registered in `src/wiring/index.ts` via `registerCredit(core)`)
2. **Router applies middleware** (e.g., `requireAuth()`, `createModuleAccessMiddleware('credit')`)
3. **Middleware validates** (e.g., `AuthMiddleware.getAuthContext(ctx)` extracts JWT claims)
4. **FormRequest validates body** (e.g., `TopUpRequest` validates amount field via Zod schema)
5. **Controller method called** (e.g., `CreditController.topUp(ctx)`)
6. **Controller gets validated data** from `ctx.get('validated')` and extracts auth context
7. **Application Service invoked** (e.g., `topUpCreditService.execute({ orgId, amount, ... })`)
8. **Application Service loads Aggregate** from Repository (e.g., `creditAccountRepository.findBy(orgId)`)
9. **Service calls Domain Aggregate method** (e.g., `account.topUp(balance)` returns new `CreditAccount`)
10. **Service saves updated Aggregate** (e.g., `repository.save(updatedAccount)`)
11. **Service publishes Domain Event** (e.g., `DomainEventDispatcher.getInstance().dispatch(new CreditToppedUpEvent(...))`)
12. **Service returns DTO response** (e.g., `{ success: true, data: { balance: "99.99" } }`)
13. **Controller returns HTTP Response** (e.g., `ctx.json(result, 200)`)
14. **Domain Event listeners react** (registered in ServiceProvider.boot(), e.g., `handleCreditToppedUpService.execute(orgId)`)

**State Management:**
- Aggregates are loaded from persistence, modified through domain methods, saved back as complete units
- No shared mutable state across requests
- Transaction boundaries managed by Application Services (via `IDatabaseAccess`)
- Domain Events provide asynchronous, decoupled reactions to state changes

## Key Abstractions

**IContainer (Dependency Injection):**
- Purpose: Framework-agnostic service resolution
- Examples: `src/Shared/Infrastructure/IServiceProvider.ts`
- Pattern: `container.singleton('serviceName', (c) => new Service(c.make('dependency')))` registers services; `core.container.make('serviceName')` resolves at runtime
- Used in: All ServiceProviders (e.g., `CreditServiceProvider.register(container)`)
- Lifecycle: `singleton()` for stateless services (repositories, domain services), `bind()` for stateful services (request handlers)

**IDatabaseAccess (Persistence Abstraction):**
- Purpose: ORM-agnostic database operations
- Examples: `src/Shared/Infrastructure/IDatabaseAccess.ts`
- Pattern: Repositories use `this.db.query()`, `this.db.insert()`, `this.db.update()`, `this.db.delete()` methods
- Switchable: Memory-based (tests), Drizzle, Atlas via `src/wiring/RepositoryFactory.ts` (controlled by `ORM` env var)
- Location: Set globally in `src/wiring/CurrentDatabaseAccess.ts`, accessed via `getCurrentDatabaseAccess()`

**IHttpContext (Presentation Abstraction):**
- Purpose: Framework-agnostic HTTP request/response handling
- Examples: `src/Shared/Presentation/IHttpContext.ts`
- Pattern: Controllers call `ctx.json(data)`, `ctx.getParam('orgId')`, `ctx.getQuery('page')`, `ctx.get('validated')`
- Implemented by: Gravito framework adapter (IHttpContext wraps Gravito Hono context)

**IModuleRouter (Routing Abstraction):**
- Purpose: Framework-agnostic route registration
- Examples: `src/Shared/Presentation/IModuleRouter.ts`, implemented in `src/Shared/Infrastructure/Framework/GravitoModuleRouter.ts`
- Pattern: Routes call `router.post('/path', [middleware], FormRequest, handler)` with flexible middleware/validation combos
- Used by: Each module's route registration function (e.g., `registerCreditRoutes(router, controller)`)

**DomainEventDispatcher (Event Bus):**
- Purpose: Decoupled cross-module communication
- Examples: `src/Shared/Domain/DomainEventDispatcher.ts`, published in Application Services, subscribed in ServiceProvider.boot()
- Pattern: `dispatcher.dispatch(new CreditToppedUpEvent(...))` in service, then `dispatcher.on('credit.topped_up', async (event) => { ... })` in provider boot
- Usage: Credit module publishes events → AppModule subscribes to sync API keys back to Bifrost

**ModuleServiceProvider (DI Registration):**
- Purpose: Module-scoped service registration
- Examples: `src/Modules/*/Infrastructure/Providers/*ServiceProvider.ts` (e.g., `CreditServiceProvider`)
- Pattern: Extends `ModuleServiceProvider` (from `src/Shared/Infrastructure/IServiceProvider.ts`), implements `register()` and optional `boot()`
- Registered in: `src/bootstrap.ts` via `core.register(createGravitoServiceProvider(new CreditServiceProvider()))`

## Entry Points

**Application Bootstrap:**
- Location: `src/index.ts` → calls `createApp()` from `src/app.ts` → calls `bootstrap()` from `src/bootstrap.ts`
- Triggers: Server startup (Bun HTTP server)
- Responsibilities: 
  1. Register Zod validators (`SchemaCache.registerValidators()`)
  2. Initialize ORM and database access layer
  3. Create Gravito PlanetCore instance
  4. Register all 13 module ServiceProviders with adapters
  5. Call all ServiceProvider.boot() methods
  6. Register HTTP routes via `registerRoutes(core)`
  7. Register global error handlers

**HTTP Route Registration:**
- Location: `src/routes.ts` → calls 13 `registerXxx(core)` functions from `src/wiring/index.ts`
- Example: `registerCredit(core)` instantiates `CreditController`, injects 4 services from container, calls `registerCreditRoutes(router, controller)`
- Pattern: Each module's registration function follows same template:
  ```typescript
  const controller = new ModuleController(
    core.container.make('service1') as Service1,
    core.container.make('service2') as Service2,
    ...
  )
  registerModuleRoutes(createGravitoModuleRouter(core), controller)
  ```

**Route Handler Entry:**
- Location: Module-specific route files, e.g., `src/Modules/Credit/Presentation/Routes/credit.routes.ts`
- Pattern: `router.post('/api/organizations/:orgId/credits/topup', [middlewares], FormRequest, (ctx) => controller.topUp(ctx))`
- Executes: Middleware chain → validation → controller method → service execution → response

## Error Handling

**Strategy:** Try-catch at Application Service layer, convert domain exceptions to HTTP responses

**Patterns:**
- Domain layer throws domain-specific exceptions (subclasses of `Error`)
- Application Services catch and convert to standardized `ApiResponse` objects (e.g., `{ success: false, error: 'INSUFFICIENT_BALANCE' }`)
- Controllers call `ctx.json(result, result.success ? 200 : 400)` to return HTTP status based on service result
- Global error handler in `src/bootstrap.ts` catches unhandled exceptions and returns 500 responses
- Error codes centralized in `src/Shared/Application/ErrorCodes.ts`

## Cross-Cutting Concerns

**Logging:** 
- Console-based via `console.log()` in ServiceProviders (boot phase) and services
- No dedicated logging framework (can be added via ILogger interface pattern)
- Example: `console.log('💰 [Credit] Module loaded')` in CreditServiceProvider.boot()

**Validation:** 
- Input validation: Zod FormRequest classes in presentation layer (e.g., `TopUpRequest` defines schema)
- Business validation: Domain layer (e.g., `Balance.fromString()` throws if negative)
- Authorization: Middleware (`requireAuth()`, `createRoleMiddleware()`, `createModuleAccessMiddleware()`) and Application Services

**Authentication:** 
- JWT-based: `AuthMiddleware.getAuthContext(ctx)` extracts and validates JWT from request header
- Registered routes require `requireAuth()` middleware
- Token claims decoded into `{ userId, orgId, role, ... }` and attached to context
- Scope checking: Application Services receive auth context, verify user has permission (e.g., `OrgAuthorizationHelper.checkOrgAccess()`)

---

*Architecture analysis: 2026-04-10*
