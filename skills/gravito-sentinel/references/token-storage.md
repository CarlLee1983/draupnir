# Token Storage

Token storage should support verification, revocation, and audit.

## Rules

- store token hashes, not raw token strings
- track token type explicitly (`access` / `refresh`)
- include `revokedAt` and `expiresAt`
- make revocation lookup part of the auth boundary

## Draupnir note

`AuthMiddleware` already hashes the bearer token before revocation lookup. Keep that pattern if
you need a revocation repository for JWT logout.

## Logout shape

```typescript
router.post('/auth/logout', async (ctx) => {
  const authHeader = ctx.getHeader('authorization') ?? ctx.getHeader('Authorization')
  if (!authHeader) return ctx.json({ success: false, error: 'MISSING_TOKEN' }, 400)

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return ctx.json({ success: false, error: 'INVALID_AUTH_HEADER' }, 400)
  }

  return ctx.json(await logoutUserService.execute({ token: parts[1] }))
})
```

## Common mistakes

- revoking only access tokens but leaving refresh tokens active without a policy
- assuming client-side token deletion is enough
- accepting malformed bearer headers with brittle string replacement
