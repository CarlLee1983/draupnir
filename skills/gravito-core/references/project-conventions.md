# Project Conventions — Draupnir

This project wraps `@gravito/core` behind framework-agnostic abstractions so module code is never coupled to Gravito.

## Abstraction map

| @gravito/core type | Project abstraction | Location |
|--------------------|---------------------|----------|
| `Container` | `IContainer` | `src/Shared/Infrastructure/IServiceProvider.ts` |
| `ServiceProvider` | `ModuleServiceProvider` | same |
| `GravitoContext` | `IHttpContext` | `src/Shared/Presentation/IHttpContext.ts` |
| `Router` | `IModuleRouter` | `src/Shared/Presentation/IModuleRouter.ts` |

## Rules

1. **Module code (Domain / Application / Infrastructure / Presentation layers) MUST NOT import `@gravito/core`.**
   Use `IContainer`, `IHttpContext`, `IModuleRouter`, and `ModuleServiceProvider` instead.
2. Only `src/Shared/Infrastructure/Framework/**` adapts Gravito types to the abstractions above.
3. `bootstrap.ts` is the only place that calls `new PlanetCore(...)`, `core.register(...)`, `core.orbit(...)`, `core.bootstrap()`.
4. `src/wiring/index.ts` is the only place that calls `core.container.make(...)` to wire Controllers and register routes.

## ServiceProvider pattern

Module providers extend `ModuleServiceProvider`, then are wrapped with `GravitoServiceProviderAdapter`:

```typescript
// src/Modules/MyModule/Infrastructure/Providers/MyServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'

export class MyServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('myRepository', (c) =>
      new MyRepository(getCurrentDatabaseAccess())
    )
    container.bind('myService', (c) =>
      new MyService(c.make('myRepository') as IMyRepository)
    )
  }
  override boot(_context: any): void {
    console.log('✅ [MyModule] loaded')
  }
}

// src/bootstrap.ts
core.register(createGravitoServiceProvider(new MyServiceProvider()))
```

## Router pattern

Route files receive `IModuleRouter`, not Gravito's `Router`:

```typescript
// src/Modules/MyModule/Presentation/Routes/my.routes.ts
export function registerMyRoutes(router: IModuleRouter, controller: MyController): void {
  router.get('/my-resource', (ctx) => controller.list(ctx))
  router.post('/my-resource', (ctx) => controller.create(ctx))
}

// src/wiring/index.ts
const router = createGravitoModuleRouter(core)
registerMyRoutes(router, controller)
```

## Context adaptation

`fromGravitoContext(ctx)` (in `src/Shared/Presentation/IHttpContext.ts`) converts `GravitoContext` → `IHttpContext`:

```typescript
// In wiring/route registration:
core.router.get('/users', (ctx) => controller.list(fromGravitoContext(ctx)))
```

Controllers only see `IHttpContext`:

```typescript
export class UserController {
  constructor(private service: GetUserService) {}

  async show(ctx: IHttpContext): Promise<Response> {
    const id = ctx.getParam('id')!
    const user = await this.service.execute(id)
    return ctx.json({ success: true, data: user.toDTO() })
  }
}
```
