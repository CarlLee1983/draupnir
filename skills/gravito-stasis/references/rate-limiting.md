# Rate Limiting

Stasis includes a built-in rate limiter built on top of your cache infrastructure.

## 1. Basic Rate Limiting

```typescript
const limiter = core.container.make('rate-limiter')

// attempt(key, maxAttempts, decaySeconds)
const success = await limiter.attempt('api:login:127.0.0.1', 5, 60)

if (!success) {
  return ctx.json({ error: 'Too many attempts' }, 429)
}
```

## Draupnir usage

Rate limiting is useful around:

- login endpoints
- invitation endpoints
- API-key creation / rotation flows
- expensive admin actions

## Key design

- include the actor in the key when the action is user-scoped
- include the IP address when the action is anonymous
- use a separate key family per route or feature

## Failure handling

- return `429` when the quota is exhausted
- keep the response short and deterministic
- do not leak internal counters or store identifiers in the message

## 2. Checking Status

You can check how many attempts are remaining without incrementing the counter.

```typescript
const remaining = await limiter.remaining('user:1', 10)
const retriesAt = await limiter.availableIn('user:1') // Seconds until next attempt allowed
```

## 3. Manually Clearing

```typescript
await limiter.clear('api:login:127.0.0.1')
```

## 4. Integration with @gravito/core

Rate limiting is often used within middleware to protect routes.

```typescript
const rateLimitMiddleware: GravitoMiddleware = async (ctx, next) => {
  const limiter = ctx.container.make('rate-limiter')
  const key = `limit:${ctx.req.header('cf-connecting-ip')}`
  
  if (await limiter.tooManyAttempts(key, 100, 3600)) {
    return ctx.json({ error: 'Rate limit exceeded' }, 429)
  }
  
  await limiter.hit(key, 3600)
  await next()
}
```
