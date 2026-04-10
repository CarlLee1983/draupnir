# Photon Advanced

Photon advanced use cases include named routes, SSE, rate limiting, and mounting sub-orbits or child apps.

## Named routes

```typescript
router.get('/users/:id/profile', showProfile).name('user.profile')

const url = route('user.profile', { id: 42 })
```

Use named routes when a path is reused outside the route definition, such as redirects or generated links.

## SSE and streaming

Keep the response lifecycle explicit. Do not buffer the whole payload first.

```typescript
router.get('/events', async (ctx) => {
  ctx.header('content-type', 'text/event-stream')
  ctx.header('cache-control', 'no-cache')
  return ctx.stream(async (stream) => {
    stream.write('event: ready\ndata: ok\n\n')
  })
})
```

Use SSE when the client needs a long-lived event stream; prefer normal JSON responses for one-shot payloads.

## Rate limiting

Prefer stable keys such as user id, API key id, or a safe fallback chain.

Good fallback order:

1. Authenticated user id
2. API key id
3. Forwarded client IP
4. Anonymous bucket

Use the same key strategy everywhere a route can be retried or replayed.

## Mounting child apps

Use mounting when a module owns a full sub-router or sub-application.

```typescript
router.mount('/admin', adminApp)
```

## Common advanced mistakes

- Using SSE without explicit headers.
- Naming routes too late to be useful elsewhere.
- Rate limiting by an unstable header alone.
- Mounting child apps before route namespaces are decided.
- Keeping streams open without any completion or disconnect strategy.
