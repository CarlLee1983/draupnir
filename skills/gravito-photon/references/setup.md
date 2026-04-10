# Photon Setup

Use Photon when the app needs Gravito-managed HTTP routing, middleware, and response helpers.

## What Photon owns

- HTTP server bootstrap
- Route registration and grouping
- Middleware pipeline
- Request context access
- Response helpers such as JSON, text, and redirects
- Core router integration
- FormRequest-aware route registration when passed through module adapters

## Bootstrap example

```typescript
import { defineConfig } from '@gravito/core'
import { PhotonOrbit } from '@gravito/photon'

export default defineConfig({
  orbits: [
    PhotonOrbit.configure({
      port: 3000,
      hostname: '0.0.0.0',
      rateLimit: {
        window: 60_000,
        max: 100,
      },
    }),
  ],
})
```

## Integration rules

- Keep bootstrap code thin.
- Put feature routes in module-specific route registrars.
- Put auth, logging, and throttling in middleware, not controllers.
- Keep request parsing near the edge and business logic in Application services.
- Use the module router adapter to preserve FormRequest overloads when the project routes through `IModuleRouter`.

## Common setup mistakes

- Forgetting to register the orbit before route registration.
- Hard-coding server settings in feature code instead of config.
- Putting response formatting logic in services.
- Using route names without a stable naming convention.
- Routing module code through a plain middleware pipeline when FormRequest support is required.
