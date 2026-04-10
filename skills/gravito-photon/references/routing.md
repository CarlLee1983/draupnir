# Photon Routing

Photon routes should stay declarative and close to the module they serve.

## Route shapes

```typescript
import type { GravitoContext, NextFunction } from '@gravito/photon'

router.get('/users', async (ctx: GravitoContext) => ctx.json({ data: [] }))

router.post('/users', async (ctx: GravitoContext) => {
  const body = await ctx.body<{ name: string }>()
  return ctx.status(201).json({ data: body })
})

router.put('/users/:id', async (ctx: GravitoContext) => {
  const { id } = ctx.params
  const body = await ctx.body<{ name: string }>()
  return ctx.json({ data: { id, ...body } })
})
```

## Route groups

```typescript
router.group(
  {
    prefix: '/api/v1',
    middleware: ['auth:jwt', 'throttle:60,100'],
  },
  () => {
    router.get('/users', listUsers)
    router.post('/users', createUser)
    router.get('/users/:id', showUser)
  }
)
```

## FormRequest routes

Photon supports class-based request validation when the router receives a `FormRequest` class instead of middleware.

```typescript
router.post('/auth/login', LoginRequest, (ctx) => controller.login(ctx))
router.post('/auth/register', [requireAuth()], CreateUserRequest, (ctx) => controller.create(ctx))
```

Guidance:

- Use `FormRequest` for body and query validation.
- Keep route parameter validation in dedicated helpers or parameter schemas.
- When middleware and `FormRequest` are both needed, preserve middleware order and let the framework validate after middleware passes.

## Middleware

Use middleware for cross-cutting concerns such as auth, throttling, and logging.

```typescript
const loggingMiddleware = async (ctx: GravitoContext, next: NextFunction) => {
  const start = Date.now()
  await next()
  console.log(`${ctx.method} ${ctx.pathname} -> ${ctx.status} (${Date.now() - start}ms)`)
}

router.use(loggingMiddleware)
```

## Context access

- `ctx.params` for route parameters
- `ctx.query` for query string values
- `await ctx.body<T>()` for request body parsing
- `ctx.json()` / `ctx.text()` / `ctx.status()` for responses

## Common routing mistakes

- Parsing the same body multiple times.
- Letting middleware mutate domain state.
- Duplicating route prefixes across many files instead of using groups.
- Returning raw objects without a consistent response shape.
- Forgetting that `FormRequest` validation should remain visible to the router, not be hidden behind an opaque wrapper.
