# ServiceProvider — Lifecycle

## Lifecycle phases (in order)

1. **`register(container)`** — Bind services to the container. Never resolve from other providers here (they may not be registered yet). Sync or async.
2. **`boot(core)`** — Called after ALL providers have registered. Safe to resolve services and set up listeners.
3. **`onReady(core)`** — Called after ALL providers have booted. Final init before accepting traffic.
4. **`onShutdown(core)`** — Graceful shutdown. Providers called in LIFO order. Clean up connections, flush caches, etc.

## ServiceProvider

```typescript
import { ServiceProvider, type Container, type PlanetCore } from '@gravito/core'

class DatabaseServiceProvider extends ServiceProvider {
  // Required
  register(container: Container): void {
    container.singleton('db', () => new DatabaseManager())
  }

  // Optional
  boot(core: PlanetCore): void {
    const db = core.container.make<DatabaseManager>('db')
    db.connect()
  }

  onReady(core: PlanetCore): void {
    core.logger.info('Database ready')
  }

  onShutdown(core: PlanetCore): void {
    const db = core.container.make<DatabaseManager>('db')
    db.disconnect()
  }
}
```

## Deferred providers

A deferred provider is only registered when one of its provided services is first requested:

```typescript
class HeavyServiceProvider extends ServiceProvider {
  deferred = true

  provides(): string[] {
    return ['heavyService', 'heavyService.config']
  }

  register(container: Container): void {
    container.singleton('heavyService', () => new HeavyService())
  }
}
```

## mergeConfig helper

```typescript
class MyProvider extends ServiceProvider {
  register(container: Container): void {
    this.mergeConfig(container as any, 'my-module', {
      timeout: 30,
      retries: 3,
    })
  }
}
```
