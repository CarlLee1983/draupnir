# Common Operations

`@gravito/plasma` provides a fluent API for standard Redis operations, wrapping `Bun.redis`.

## 1. Strings

```typescript
const redis = ctx.get('redis')

// Set with expiration (seconds)
await redis.set('key', 'value', { ex: 3600 })

// Get
const val = await redis.get('key')

// Increment / Decrement
await redis.incr('counter')
await redis.decrby('counter', 5)
```

## 2. Hashes

```typescript
// Set multiple fields
await redis.hset('user:1', {
  name: 'John',
  role: 'admin'
})

// Get all fields
const user = await redis.hgetall('user:1')

// Get single field
const name = await redis.hget('user:1', 'name')
```

## 3. Lists

```typescript
await redis.lpush('queue', 'task1', 'task2')
const nextTask = await redis.rpop('queue')
```

## 4. Sets & Sorted Sets

```typescript
// Sets
await redis.sadd('tags', 'news', 'tech')
const tags = await redis.smembers('tags')

// Sorted Sets
await redis.zadd('leaderboard', { score: 100, member: 'player1' })
const topPlayers = await redis.zrange('leaderboard', 0, 10, { rev: true })
```

## 5. Key Management

```typescript
await redis.del('key1', 'key2')
await redis.exists('key')
await redis.expire('key', 60)
```
