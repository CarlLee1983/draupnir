# Advanced Caching

Stasis provides advanced strategies for performance and reliability in high-scale environments.

## 1. Tiered Caching (Hybrid L1/L2)

Tiered caching combines multiple stores (e.g., local Memory and remote Redis) to maximize performance while ensuring distributed consistency.

### Configuration
```typescript
{
  default: 'hybrid',
  stores: {
    l1: { driver: 'memory', maxItems: 1000 },
    l2: { driver: 'redis', connection: 'default' },
    hybrid: { driver: 'tiered', local: 'l1', remote: 'l2' }
  }
}
```

### How it works:
1. **Reads**: Checks `local` first. If miss, checks `remote`. If found in `remote`, it's written back to `local` for subsequent reads.
2. **Writes**: Updates both `local` and `remote` simultaneously.
3. **Invalidation**: `delete()` removes the key from both layers.

## 2. Predictive State Warming

Uses historical access patterns to pre-fetch data before it is requested.

```typescript
{
  stores: {
    base: { driver: 'redis' },
    smart: { driver: 'predictive', inner: 'base', maxNodes: 5000 }
  }
}
```

## 3. Circuit Breaker Store

Wraps a cache store to prevent application failure if the caching infrastructure (e.g., Redis) becomes unavailable.

```typescript
{
  stores: {
    unstable: { driver: 'redis', host: '...' },
    safe: { 
      driver: 'circuit-breaker', 
      inner: 'unstable',
      fallback: 'memory' // optional fallback
    }
  }
}
```

## 4. Custom Storage Providers

You can implement the `CacheStorageProvider` interface to create your own drivers.

```typescript
import { type CacheStorageProvider } from '@gravito/stasis'

class MyDbProvider implements CacheStorageProvider {
  async get(key) { ... }
  async set(key, value, ttl) { ... }
  async delete(key) { ... }
  async clear() { ... }
}
```

## Draupnir guidance

Prefer the built-in Redis-backed path for shared production state. Use custom providers only when
you need a test double or a very specific storage backend that the project already depends on.

## Common mistakes

- promoting predictive caching before the cache keys and invalidation rules are stable
- using a circuit breaker as a substitute for fixing Redis connectivity
- treating tiered caching as free consistency
