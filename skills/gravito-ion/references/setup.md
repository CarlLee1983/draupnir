# Setup

Register `IonOrbit` during app bootstrap.

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

Keep this configuration in one place. Route handlers should only return page responses.
