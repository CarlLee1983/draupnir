---
name: gravito-stasis
description: >
  Guidance for using @gravito/stasis — the Gravito cache and state management orbit. Use when
  working with OrbitStasis, CacheService, tiered caching (memory + redis), distributed locks,
  and rate limiting.
---

# @gravito/stasis

`@gravito/stasis` is the standard caching layer for Gravito. It supports multiple drivers (Memory, Redis, File), hybrid tiered caching, and distributed concurrency controls.

## Quick Decision Tree

```
Setting up cache stores during bootstrap?
  → See references/setup.md

Reading/Writing to cache (remember, pull)?
  → See references/operations.md

Using distributed locks for concurrency?
  → See references/locks.md

Implementing rate limiting?
  → See references/rate-limiting.md

Need project-specific cache patterns?
  → See references/draupnir-patterns.md

Need concurrency or cache key rules?
  → See references/key-patterns.md
```

## Minimal Example

```typescript
const cache = core.container.make('cache')

// The "Remember" pattern (Fetch if miss, store for 1 hour)
const data = await cache.remember('users:list', 3600, async () => {
  return await db.table('users').get()
})

// Atomic "Add" (Only set if not exists)
const success = await cache.add('lock:job:1', true, 60)
```

## Core exports

```typescript
import { OrbitStasis } from '@gravito/stasis'
// Access via container:
const cache = core.container.make('cache')
const localCache = cache.store('local')
```

## Common pitfalls

- Memory-based locks only work in single-process mode; use Redis driver for multi-instance production.
- `remember()` TTL is in seconds, not milliseconds.
- File driver is not recommended for distributed locks.

## References

- **Setup & Drivers**: `references/setup.md`
- **Cache Operations**: `references/operations.md`
- **Distributed Locks**: `references/locks.md`
- **Rate Limiting**: `references/rate-limiting.md`
- **Advanced (Tiered/Predictive)**: `references/advanced.md`
- **Draupnir patterns**: `references/draupnir-patterns.md`
- **Key patterns**: `references/key-patterns.md`
