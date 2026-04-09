# PlanetCore — bootstrap & lifecycle

## Bootstrap sequence

```typescript
import { PlanetCore, defineConfig } from '@gravito/core'

// 1. Define config
const config = defineConfig({ config: { APP_NAME: 'MyApp', PORT: 3000 } })

// 2. Create core
const core = new PlanetCore(config)

// 3. Install orbits (infrastructure plugins — DB, cache, Redis, etc.)
await core.orbit(new MyDatabaseOrbit())

// 4. Register ServiceProviders (DI bindings)
core.register(new MyServiceProvider())

// 5. Bootstrap — calls register() then boot() on all providers
await core.bootstrap()

// 6. Register routes (after bootstrap so container is ready)
core.router.get('/ping', (c) => c.text('pong'))

// 7. Register global error handlers
core.registerGlobalErrorHandlers()

// 8. Liftoff — returns Bun.serve config
export default core.liftoff(port)
```

## PlanetCore constructor options

```typescript
new PlanetCore({
  logger?: Logger,          // default: ConsoleLogger
  config?: Record<string, unknown>,
  adapter?: HttpAdapter,    // default: BunNativeAdapter in Bun
  container?: Container,    // provide existing container to share
  observabilityProvider?: ObservabilityProvider,
})
```

## Core properties

```typescript
core.container  // Container — DI container
core.router     // Router — HTTP router
core.config     // ConfigManager — typed config access
core.logger     // Logger — application logger
core.events     // EventManager — event dispatch/listen
core.hooks      // HookManager — action/filter hooks
core.hasher     // BunHasher — password hashing
```

## Orbit interface

An Orbit is an infrastructure plugin (DB, cache, Redis, queues, etc.):

```typescript
interface GravitoOrbit {
  name?: string
  dependencies?: string[]
  install(core: PlanetCore): void | Promise<void>
}

// Register
await core.orbit(new OrbitPrism())
await core.orbit(OrbitCache)  // class or instance

// Lightweight plugin (no class needed)
await core.plugin({
  name: 'ping',
  install(core) {
    core.router.get('/ping', (c) => c.text('pong'))
  }
})
```

## Config access

```typescript
// After bootstrap:
const dbUrl = core.config.get('DB_URL')
const port  = core.config.get('PORT', 3000)  // with default
```

## Shutdown

```typescript
// Graceful shutdown (SIGTERM/SIGINT auto-registered via registerGlobalErrorHandlers)
await core.shutdown()  // calls onShutdown() on all providers in reverse order
```

## mountOrbit (micro-service composition)

```typescript
const blogOrbit = new PlanetCore()
// ... configure blogOrbit ...
core.mountOrbit('/blog', blogOrbit)
```
