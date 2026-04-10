# Setup & Orbit

`@gravito/plasma` is designed to be registered as an Orbit in `PlanetCore`.

## 1. Installation

```bash
bun add @gravito/plasma
```

## 2. Registering the Orbit

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitPlasma } from '@gravito/plasma'

const core = new PlanetCore({
  config: {
    redis: {
      default: 'main',
      connections: {
        main: { host: 'localhost', port: 6379 },
        cache: { host: 'redis-cache', port: 6379, db: 1 },
      }
    }
  }
})

// Register orbit
await core.orbit(new OrbitPlasma())
```

### Configuration Options

| Option | Description |
|---|---|
| `connections` | Map of named Redis connection settings. |
| `default` | Name of the default connection to use. |
| `exposeAs` | Context variable name (default: `'redis'`). |

## 3. Accessing Redis

### From Context

```typescript
router.get('/ping', async (ctx) => {
  const redis = ctx.get('redis')
  await redis.set('ping', 'pong')
  return ctx.text(await redis.get('ping'))
})
```

### Via Facade (Global)

```typescript
import { Redis } from '@gravito/plasma'

// Uses the 'default' connection
await Redis.set('key', 'value')
```
