# Setup

Register `IonOrbit` during app bootstrap and keep all page-shell configuration in one place.

```typescript
import { defineConfig } from '@gravito/core'
import { IonOrbit } from '@gravito/ion'

export default defineConfig({
  orbits: [
    IonOrbit.configure({
      rootView: 'layouts/spa',
      version: () => '1',
      ssr: {
        enabled: true,
        fallbackToCsr: true,
        serverUrl: 'http://localhost:13714',
      },
    }),
  ],
})
```

## What this config owns

- `rootView`: the HTML shell that receives the page payload
- `version`: the asset version sent to the client for cache-busting
- `ssr`: the server-rendering fallback policy

## Draupnir pattern

`Draupnir` currently builds the page shell in `src/Pages/page-routes.ts` and renders through
`src/Pages/InertiaService.ts`. Keep the shell and version logic there or in the orbit setup
layer, not scattered across individual pages.

Current shared-data flow:

1. middleware collects auth, org, and flash state
2. the request stores shared props in `ctx.set('inertia:shared', ...)`
3. `InertiaService.render()` merges shared props with page-specific props

Keep this flow stable so pages only describe page data, not transport concerns.
