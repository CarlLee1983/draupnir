---
name: gravito-core
description: >
  API reference for `@gravito/core` — the Gravito micro-kernel. Use when working with
  PlanetCore (bootstrap, orbit, register, liftoff), Container (bind/singleton/scoped/make),
  Router (get/post/prefix/middleware/group/resource), ServiceProvider (register/boot/onReady/onShutdown),
  GravitoContext (req, json, text, redirect, get/set), defineConfig, GravitoOrbit, HookManager,
  EventManager, or any other export from `@gravito/core`.
---

# @gravito/core

`@gravito/core` is the Gravito HTTP micro-kernel. `PlanetCore` is the central orchestrator: it manages routing, a DI container, middleware, orbits (plugins), hooks, events, and configuration.

## Decision tree

```
Bootstrapping the app / installing orbits?
  → references/planet-core.md

Registering or resolving services (DI)?
  → references/container.md

Defining HTTP routes or middleware?
  → references/router.md

Writing a ServiceProvider?
  → references/service-provider.md

Handling requests / cookies / session?
  → references/context.md

Decoupling logic with hooks or events?
  → references/hooks-and-events.md

Managing app configuration or env vars?
  → references/config.md
```

## Key exports

```typescript
import {
  PlanetCore, defineConfig,
  type GravitoConfig, type GravitoOrbit,
  ServiceProvider, type Container,
  type GravitoContext, type GravitoMiddleware,
  Router, Route,
  HookManager, EventManager, ConfigManager,
  getCookie, setCookie, deleteCookie,
  type Hasher, BunHasher,
} from '@gravito/core'
```

## Common pitfalls

- Do not confuse `singleton()` (created once), `bind()` (new per call), `scoped()` (per request), and `instance()` (pre-built).
- Bootstrap order matters: register services before `core.bootstrap()`, register routes after.
- Use ServiceMap augmentation to get typed `make()` resolution.

## References

- **PlanetCore bootstrap & lifecycle**: `references/planet-core.md`
- **Container DI patterns**: `references/container.md`
- **Router & routing**: `references/router.md`
- **ServiceProvider lifecycle**: `references/service-provider.md`
- **GravitoContext (request/response)**: `references/context.md`
- **Hooks & Events**: `references/hooks-and-events.md`
- **Configuration (ConfigManager)**: `references/config.md`
- **Project-specific conventions**: `references/project-conventions.md`
