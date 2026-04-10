# Advanced Redis Features

Plasma provides support for advanced Redis features like Pipelines, Lua scripts, and Streams.

## 1. Pipelines

Pipelines allow you to group multiple commands into a single network round-trip for improved performance.

```typescript
const [val1, val2, count] = await redis.pipeline()
  .get('key1')
  .get('key2')
  .incr('counter')
  .exec()
```

## 2. Lua Scripts

Manage and execute Lua scripts with automatic SHA1 caching.

```typescript
// 1. Register script
redis.scripts().register('incr_by_two', `
  local val = redis.call('GET', KEYS[1]) or 0
  local new_val = tonumber(val) + 2
  redis.call('SET', KEYS[1], new_val)
  return new_val
`)

// 2. Execute script
const result = await redis.scripts().execute('incr_by_two', ['my-key'])
```

## 3. Redis Streams

Full support for the Redis Streams API.

```typescript
// Add to stream
const entryId = await redis.xadd('mystream', { 
  user_id: '123', 
  action: 'login' 
})

// Read from stream
const messages = await redis.xread({ mystream: '0' }, { count: 10 })

// Consumer Groups
await redis.xgroup('CREATE', 'mystream', 'workers', '$', true)
const groupMessages = await redis.xreadgroup('workers', 'consumer-1', { mystream: '>' })
```

## 4. Pub/Sub

```typescript
// Subscribe
await redis.subscribe('notifications', (msg) => {
  console.log('Received message:', msg)
})

// Publish
await redis.publish('notifications', 'Hello World!')
```
