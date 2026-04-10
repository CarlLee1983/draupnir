# Setup & Drivers

`@gravito/stasis` supports various storage backends and tiered configurations.

## 1. Installation

```bash
bun add @gravito/stasis
```

## 2. Configuration

Define your cache stores in `defineConfig`.

```typescript
import { defineConfig } from '@gravito/core'
import { OrbitStasis } from '@gravito/stasis'

export default defineConfig({
  config: {
    cache: {
      default: 'tiered',
      stores: {
        local: { driver: 'memory', maxItems: 1000 },
        remote: { driver: 'redis', connection: 'default' },
        tiered: { 
          driver: 'tiered', 
          local: 'local', 
          remote: 'remote' 
        },
        file: { driver: 'file', directory: './storage/cache' }
      }
    }
  },
  orbits: [new OrbitStasis()]
})
```

## 3. Storage Drivers

| Driver | Best For |
|---|---|
| `memory` | Local request-level hotspots (L1). |
| `redis` | Shared state across multiple instances (L2). |
| `tiered` | Hybrid caching (Local read fallback to Redis). |
| `file` | Simple persistence without infrastructure. |
| `null` | Testing or disabling cache. |

## 4. Usage

Access the cache via the container or context.

```typescript
// Via Container
const cache = core.container.make('cache')

// Switch store
const localCache = cache.store('local')
```
