# Cache Operations

The `CacheService` provides a fluent API for interacting with cached data.

## 1. Basic Get & Set

```typescript
const cache = core.container.make('cache')

// Set with TTL (in seconds)
await cache.set('key', { foo: 'bar' }, 3600)

// Get (with generic type)
const value = await cache.get<{ foo: string }>('key')

// Check existence
if (await cache.has('key')) { ... }

// Delete
await cache.delete('key')
```

## 2. The "Remember" Pattern (Read-Through)

This is the most common pattern: get the item if it exists, otherwise fetch it from the source, store it, and return it.

```typescript
// remember(key, ttl, callback)
const user = await cache.remember('user:1', 3600, async () => {
  return await db.table('users').where('id', 1).first()
})

// rememberForever(key, callback)
const config = await cache.rememberForever('app:config', async () => {
  return await loadConfigFromDisk()
})
```

## 3. Atomic Operations

```typescript
// add: Only sets the value if it doesn't already exist
const success = await cache.add('unique:task', true, 60)

// pull: Gets the value and immediately deletes it from cache
const token = await cache.pull('verification:token')
```

## 4. Increment & Decrement

Available if the underlying driver supports it (e.g., Redis).

```typescript
await cache.increment('page_views')
await cache.decrement('stock_count', 5)
```

## 5. Tags (Grouping)

Allows you to invalidate groups of cache keys at once.

```typescript
// Store tagged items
await cache.tags(['users', 'profiles']).set('user:1', data, 3600)

// Invalidate all items with the 'users' tag
await cache.tags('users').flush()
```
