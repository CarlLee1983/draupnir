# Sentinel Setup

Sentinel should be registered once at application bootstrap.

## What Sentinel owns

- Identity guards
- Provider resolution
- Auth context injection
- Authorization primitives
- Token revocation integration when a blacklist repository is available

```typescript
import { defineConfig } from '@gravito/core'
import { SentinelOrbit } from '@gravito/sentinel'

export default defineConfig({
  orbits: [
    SentinelOrbit.configure({
      guards: {
        jwt: { driver: 'jwt', secret: process.env.JWT_SECRET!, provider: 'users' },
        session: { driver: 'session', provider: 'users' },
      },
      providers: {
        users: { model: 'App.Models.User' },
      },
    }),
  ],
})
```

## Runtime contracts

- Guard names are public contracts. Keep them stable.
- Provider names must match the names used by routes, middleware, and services.
- JWT auth should cooperate with a token repository or blacklist when logout or revocation is required.
- Session flows should use the app's session store or equivalent persistent state.

## Integration rules

- Register auth middleware once during module bootstrap when the framework requires it.
- Treat authentication storage as infrastructure, not business logic.

Keep guard names stable. They are part of the public API for middleware and code.

## Common setup mistakes

- Forgetting to register the orbit before route registration.
- Hard-coding server settings in feature code instead of config.
- Putting response formatting logic in services.
- Using route names without a stable naming convention.
- Configuring a JWT guard without a revocation strategy when logout is part of the product.
