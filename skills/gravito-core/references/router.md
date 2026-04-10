# Router — HTTP Routing

## Router API

```typescript
// Basic verbs
core.router.get('/users', (c) => c.json(users))
core.router.post('/users', handler)
core.router.put('/users/:id', handler)
core.router.delete('/users/:id', handler)
core.router.patch('/users/:id', handler)

// Groups
core.router.prefix('/api').group((r) => {
  r.get('/users', handler)
  r.post('/users', handler)
})

core.router.middleware(authMiddleware).group((r) => {
  r.get('/profile', handler)
})

core.router.domain('api.example.com').group((r) => {
  r.get('/v1/data', handler)
})

// Chaining group options
core.router
  .prefix('/api/v1')
  .middleware(authMiddleware, rateLimitMiddleware)
  .group((r) => { ... })

// Named routes
core.router.get('/users/:id', handler).name('users.show')

// URL generation
const url = core.router.url('users.show', { id: '42' })  // '/users/42'
const searchUrl = core.router.url('users.index', { query: 'john' }) // '/users?query=john'

// Route constraints
core.router.get('/users/:id', handler).where('id', /[0-9]+/)
core.router.get('/users/:id', handler).whereUuid('id')
```

## Route object

The `Route` object returned from registration allows you to add constraints and metadata.

```typescript
const route = core.router.get('/profile', handler)

route.name('profile')
route.middleware(auth)
route.domain('admin.gravito.dev')
```

## FormRequest validation

Gravito supports class-based request validation (typically using `@gravito/impulse` for the implementation).

```typescript
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

class StoreUserRequest extends FormRequest {
  authorize() { return true }
  rules() {
    return {
      email: z.string().email(),
      password: z.string().min(8),
    }
  }
}

// Register with validation
core.router.post('/users', StoreUserRequest, [UserController, 'store'])
```

## Handler shapes

```typescript
// Inline handler
core.router.get('/ping', (c) => c.text('pong'))

// Controller method — constructor receives PlanetCore
core.router.get('/users', [UserController, 'index'])

// With FormRequest validation (from @gravito/impulse)
core.router.post('/users', StoreUserRequest, [UserController, 'store'])
```

## Middleware

```typescript
// Inline middleware
const authMiddleware: GravitoMiddleware = async (c, next) => {
  const token = c.req.header('Authorization')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  await next()
}

core.router.get('/protected', authMiddleware, handler)
```

## Route params & query strings

Inside a handler (`GravitoContext`):

```typescript
const id = c.req.param('id')
const page = c.req.query('page') ?? '1'
const params = c.req.params()  // all route params
```
