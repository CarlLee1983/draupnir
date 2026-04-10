---
name: gravito-photon
description: Guidance for using @gravito/photon, Gravito's HTTP layer. Use when defining routes, middleware, request context handling, rate limiting, SSE, named routes, or mounting sub-orbits/apps with Photon.
---

# @gravito/photon

`@gravito/photon` is the HTTP orbit for Gravito. Use it when the task involves request handling, routing, middleware composition, or context-aware response helpers.

## Decision tree

```text
Bootstrapping Photon?
  -> references/setup.md

Defining routes, middleware, or route groups?
  -> references/routing.md

Need FormRequest, controller adapters, or ctx bridging?
  -> references/context-bridge.md

Need SSE, rate limiting, or child app mounting?
  -> references/advanced.md
```

## Core exports

```typescript
import { PhotonOrbit, route } from '@gravito/photon'
import type { GravitoContext, NextFunction } from '@gravito/photon'
```

## Minimal workflow

1. Configure `PhotonOrbit` in `gravito.config.ts` or app bootstrap.
2. Keep HTTP logic at the edge. Move business logic into Application services.
3. Use `ctx.params`, `ctx.query`, `await ctx.body()`, and `ctx.json()` instead of ad hoc parsing.
4. Apply middleware at the smallest useful scope.

## Common pitfalls

- Do not put domain logic inside middleware.
- Use stable rate-limit keys; do not rely on raw IP headers without a fallback.
- For SSE, return the correct content type and keep the stream open deliberately.
- Keep named routes unique so `route()` stays predictable.

## References

- `references/setup.md`
- `references/routing.md`
- `references/context-bridge.md`
- `references/advanced.md`
