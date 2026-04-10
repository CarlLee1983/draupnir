# Distributed Locks

Stasis provides a unified API for distributed locking to prevent race conditions across multiple instances.

## 1. Basic Usage

Locks are created via the `lock(key, seconds)` method.

```typescript
const cache = core.container.make('cache')
const lock = cache.lock('process-invoice:123', 10)

if (await lock.get()) {
  try {
    // Process the invoice...
  } finally {
    await lock.release()
  }
}
```

## 2. Block and Execute

A more convenient way to run code that requires a lock. It will attempt to acquire the lock, run the callback, and automatically release it.

```typescript
await cache.lock('sync-task', 60).block(5, async () => {
  // This code runs only if lock is acquired.
  // Wait up to 5 seconds to acquire the lock.
})
```

## 3. Atomic Locks with Callbacks

```typescript
const result = await cache.restoreLock('process-invoice:123', ownerToken).release()
```

## 4. Driver Support

| Driver | Support | Persistence |
|---|---|---|
| `redis` | ✅ Native (Atomic) | Distributed |
| `memory` | ✅ Map-based | Local instance only |
| `file` | ❌ Not recommended | N/A |

> **Warning**: Memory-based locks only work within a single process. For production "Galaxy" deployments with multiple Satellites, **always use the Redis driver** for locks.

## Draupnir uses

- serializing critical updates to shared counters
- protecting background sync jobs
- avoiding duplicate work when multiple workers try the same task

## Rules

- keep the locked section as small as possible
- always release the lock in `finally`
- avoid holding locks across slow network calls unless the flow really needs it
