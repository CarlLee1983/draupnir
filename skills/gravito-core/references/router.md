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
const url = core.router.url('users.show', { id: 42 })  // '/users/42'

// RESTful resource (index/create/store/show/edit/update/destroy)
core.router.resource('photos', PhotoController)
core.router.resource('photos', PhotoController, {
  only: ['index', 'show', 'store', 'destroy']
})

// Proxy / gateway forward
core.router.forward('get', '/external', 'https://api.partner.com/data')
core.router.forward('all', '/proxy/:path*', 'https://upstream.svc')

// Route model binding
core.router.bind('user', async (id) => await userRepo.findById(id))
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
