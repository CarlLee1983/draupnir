# Sentinel Authentication

Use `auth.guard(...)` to work with the active guard.

## Guard selection

```typescript
const jwtAuth = auth.guard('jwt')
const sessionAuth = auth.guard('session')
```

- Use JWT for stateless APIs.
- Use session guards for browser or form-based flows.
- Keep the guard name consistent across config, middleware, and business code.

## Login and identity flow

```typescript
const token = await auth.guard('jwt').attempt({ email, password })

const user = auth.guard('jwt').user()
const requiredUser = auth.guard('jwt').userOrFail()
```

Use `attempt()` for credential-based login, `user()` for best-effort access, and `userOrFail()` when the route must be authenticated.

### Output expectations

- `attempt()` returns the authenticated token or session payload.
- `user()` returns the current identity when available, otherwise `null` or an equivalent empty value.
- `userOrFail()` should be used before expensive business logic.

## Request context

When a request passes through the auth middleware, the current identity should be available through the HTTP context.

```typescript
const auth = ctx.get('auth')
const user = ctx.get('user')
const authError = ctx.get('authError')
```

Use the context payload for downstream services and controllers, but do not duplicate the verification logic there.

## Route protection

Protect route groups instead of repeating checks in each handler.

```typescript
router.group({ prefix: '/api', middleware: ['auth:jwt'] }, () => {
  router.get('/profile', getProfile)
  router.put('/profile', updateProfile)
})
```

## Logout expectations

- Session guards usually support normal logout semantics.
- JWT flows usually need token invalidation or blacklist support.
- Do not assume a stateless token disappears after client-side delete.
- Logout handlers should treat missing or already-revoked tokens as idempotent success when the product expects "logout once" semantics.

## Refresh expectations

- Refresh endpoints should accept the refresh token explicitly in the request body.
- Refresh should verify token type before issuing a new access token.
- Refresh rotation, if enabled, should be documented separately from normal login.
- A revoked refresh token must not be accepted even if the signature is valid.

## Common authentication mistakes

- Mixing login concerns into authorization code.
- Calling `userOrFail()` after expensive work instead of at the start of the handler.
- Forgetting to align config provider names with guard definitions.
- Parsing the `Authorization` header with a case-sensitive `Bearer ` replace instead of a lower-cased split/fallback.
