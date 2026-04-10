# Sentinel Auth Flows

This reference describes the end-to-end auth flow that combines login, refresh, logout, and revocation.

## Canonical flow

```text
register -> login -> access token issued
             -> refresh token issued
refresh  -> verify refresh token -> issue new access token
logout   -> revoke current token or session
```

## Login

Login handlers should validate credentials, authenticate via the active guard, and return the token payload expected by the client.

```typescript
router.post('/auth/login', async (ctx) => {
  const { email, password } = await ctx.body<{ email: string; password: string }>()
  const result = await auth.guard('jwt').attempt({ email, password })
  return ctx.json({
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: result.user,
  })
})
```

## Refresh

Refresh should accept the refresh token explicitly and reject anything that is not a refresh token.

```typescript
router.post('/auth/refresh', async (ctx) => {
  const { refreshToken } = await ctx.body<{ refreshToken: string }>()
  const result = await refreshTokenService.execute({ refreshToken })
  return ctx.json(result, result.success ? 200 : 401)
})
```

## Logout and revocation

Logout should extract the token from `Authorization: Bearer <token>` or the equivalent current context and revoke it.

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

## Token storage rules

- Store hashes, not raw tokens.
- Track token type explicitly (`access` vs `refresh`).
- Keep `revokedAt` and `expiresAt` so cleanup and audit are possible.
- Treat revocation lookup as part of the auth boundary, not business logic.

## Password reset

If the product includes password reset, keep it separate from the login flow.

- Send reset links without revealing whether the email exists.
- Validate reset tokens independently from login tokens.
- Use a dedicated broker or service rather than piggybacking on login.

## Common flow mistakes

- Returning a refresh token from login but not documenting its shape.
- Revoking access tokens while leaving refresh tokens alive without a clear policy.
- Expecting JWT logout to behave like session destroy without a blacklist or revocation store.
- Mixing registration, login, refresh, and logout into one handler.
