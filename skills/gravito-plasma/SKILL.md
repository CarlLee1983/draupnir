---
name: gravito-plasma
description: >
  Guidance for using @gravito/plasma — the Gravito Redis integration. Use when working with
  OrbitPlasma, Redis facade, RedisManager, multi-connection setups, pipelines, Lua scripts,
  and Redis streams.
---

# @gravito/plasma 🪐

`@gravito/plasma` is the high-performance Redis integration for Gravito, built on **Bun.redis**. It provides a Laravel-style fluent API for distributed state, locks, and messaging.

## Quick Decision Tree

```
Registering the orbit during bootstrap?
  → See references/setup.md

Basic operations (get, set, hashes, lists)?
  → See references/operations.md

Using multiple Redis connections?
  → See references/connections.md

Advanced features (Pipeline, Lua, Streams)?
  → See references/advanced.md
```

## Minimal Example

```typescript
import { Redis } from '@gravito/plasma'

// Simple string operations
await Redis.set('user:1:status', 'online', { ex: 3600 })
const status = await Redis.get('user:1:status')

// Multi-connection
const sessionRedis = Redis.connection('session')
await sessionRedis.set('sid:abc', userData)

// Pipeline
const [val1, val2] = await Redis.pipeline()
  .get('key1')
  .get('key2')
  .exec()
```

## References

- **Setup & Orbit**: `references/setup.md`
- **Common Operations**: `references/operations.md`
- **Multi-Connection**: `references/connections.md`
- **Advanced (Lua/Streams)**: `references/advanced.md`
