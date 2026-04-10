# Multi-Connection

Plasma allows managing multiple named Redis connections within a single application.

## 1. Configuration

Define multiple connections in your application config.

```typescript
{
  redis: {
    default: 'main',
    connections: {
      main: { host: 'localhost', port: 6379 },
      session: { host: 'redis-session', port: 6379, db: 1 },
      stats: { host: 'redis-stats', port: 6379, db: 2 }
    }
  }
}
```

## 2. Switching Connections

Use the `connection()` method to switch between configured backends.

```typescript
const redis = ctx.get('redis')

// Use default connection
await redis.set('foo', 'bar')

// Switch to 'session'
const sessionRedis = redis.connection('session')
await sessionRedis.set('sid:123', sessionData)

// Switch to 'stats'
await redis.connection('stats').incr('api_calls')
```

## 3. Global Usage (Facade)

The `Redis` facade also supports connection switching.

```typescript
import { Redis } from '@gravito/plasma'

await Redis.connection('cache').set('key', 'value')
```

## 4. On-demand Connections

You can create a connection on the fly without pre-configuration.

```typescript
const tempRedis = redis.connect({ host: 'custom-host', port: 6379 })
```
