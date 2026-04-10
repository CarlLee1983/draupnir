---
name: gravito-ion
description: Guidance for using @gravito/ion. Use when building Inertia.js pages, configuring IonOrbit, returning Inertia responses, using deferred or merged props, handling SSR fallback, or integrating Gravito with React/Vue SPA pages.
---

# @gravito/ion

`@gravito/ion` is Gravito's Inertia.js integration. Use it when the server owns routing and data loading, while the client owns page rendering and navigation.

## Quick Decision Tree

```text
Need to configure the Inertia orbit?
  → references/setup.md

Need to return an Inertia page response?
  → references/responses.md

Need deferred or merged props?
  → references/props.md

Need SSR configuration or fallback behavior?
  → references/ssr.md

Need project-specific integration patterns?
  → references/draupnir-patterns.md

Need client page conventions?
  → references/client-pages.md

Need shared-data or page-state rules?
  → references/shared-data.md
```

## Core exports

```typescript
import { IonOrbit } from '@gravito/ion'
```

## Minimal workflow

1. Register `IonOrbit` in `gravito.config.ts`.
2. Keep route selection and data loading on the server.
3. Return `ctx.inertia('Component/Name', props)` from controllers or route handlers.
4. Use `defer()` for heavy data and `merge()` for partial reload cases.
5. Treat SSR as optional and make fallback behavior explicit.

## Common pitfalls

- Do not move business logic into React page components just because Inertia is involved.
- Do not block first paint with heavy data that can be deferred.
- Do not forget version handling. Stale client assets should trigger a full reload path.
- Do not assume SSR is always available. Keep the CSR fallback path healthy.

## References

- `references/setup.md`
- `references/responses.md`
- `references/props.md`
- `references/ssr.md`
- `references/draupnir-patterns.md`
- `references/client-pages.md`
- `references/shared-data.md`
