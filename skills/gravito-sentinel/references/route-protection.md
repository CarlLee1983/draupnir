# Route Protection

Protect routes early, before controller work begins.

## Rules

- use `auth.guard('jwt')` for API routes
- use `auth.guard('session')` for browser flows
- apply route group protection instead of repeating checks in each handler
- return `401` when identity is missing
- return `403` when identity exists but permission is denied

## Example

```typescript
router.group({ prefix: '/api', middleware: ['auth:jwt'] }, () => {
  router.get('/profile', getProfile)
  router.put('/profile', updateProfile)
})
```

## Server-side check

```typescript
const user = ctx.get('user')
if (!user) {
  return ctx.status(401).json({ error: 'Unauthorized' })
}
```

## Common mistakes

- checking permissions after expensive work
- using 403 for missing identity
- mixing auth and authorization into one helper that does both jobs
