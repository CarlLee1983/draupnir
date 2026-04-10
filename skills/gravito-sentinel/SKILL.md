---
name: gravito-sentinel
description: Guidance for using @gravito/sentinel. Use when implementing authentication, JWT or session guards, login/logout flows, route protection, gates, policies, or RBAC in Gravito projects.
---

# @gravito/sentinel

`@gravito/sentinel` is Gravito's authentication and authorization package. Use it for identity, access control, and route protection.

## Decision tree

```text
Need to bootstrap guards/providers?
  -> references/setup.md

Need login/logout or guard selection?
  -> references/auth.md

Need Gate / Policy / RBAC rules?
  -> references/authorization.md

Need the full login -> refresh -> logout flow?
  -> references/flows.md
```

## Core exports

```typescript
import { SentinelOrbit, auth, gate, Policy } from '@gravito/sentinel'
```

## Minimal workflow

1. Configure guards and providers once during bootstrap.
2. Use `auth.guard('jwt')` for stateless APIs and `auth.guard('session')` for browser flows.
3. Protect route groups early, before controller execution.
4. Put permission checks in `gate` or `Policy`, not in controllers.

## Common pitfalls

- Do not treat JWT logout like session logout; stateless auth needs token invalidation or blacklist support.
- Keep authentication and authorization separate.
- Do not duplicate permission logic across controllers.
- Always match guard names in config, middleware, and calls to `auth.guard(...)`.

## References

- `references/setup.md`
- `references/auth.md`
- `references/authorization.md`
- `references/flows.md`
