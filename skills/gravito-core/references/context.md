# GravitoContext — Request & Response

## GravitoContext API

```typescript
// Request
ctx.req.url                          // full URL string
ctx.req.method                       // 'GET' | 'POST' | ...
ctx.req.header('Authorization')      // single header
ctx.req.headers                      // all headers object
ctx.req.param('id')                  // route param
ctx.req.params()                     // all route params Record<string, string>
ctx.req.query('page')                // query string param
await ctx.req.json<MyType>()         // parsed JSON body
await ctx.req.text()                 // raw body string
await ctx.req.formData()             // form data
await ctx.req.arrayBuffer()          // binary body

// Response helpers
ctx.json(data, statusCode?)          // JSON response (200 by default)
ctx.text(content, statusCode?)       // text/plain response
ctx.html(content, statusCode?)       // text/html response
ctx.redirect(url, statusCode?)       // redirect (302 by default)

// Per-request state (typed via GravitoVariables)
ctx.set('user', userObj)
ctx.get<User>('user')

// Pass to next middleware
await next()
```

## Cookies

```typescript
import { getCookie, setCookie, deleteCookie } from '@gravito/core'

setCookie(ctx, 'session', token, { httpOnly: true, sameSite: 'Strict' })
const session = getCookie(ctx, 'session')
deleteCookie(ctx, 'session')
```

## Type augmentation for custom context variables

```typescript
// Extend GravitoVariables anywhere in your codebase:
declare module '@gravito/core' {
  interface GravitoVariables {
    jwtPayload: JwtPayload
    orgId: string
  }
}

// Then inside a handler:
const payload = ctx.get<JwtPayload>('jwtPayload')
```
