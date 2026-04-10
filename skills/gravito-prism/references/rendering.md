# Rendering & Context

`@gravito/prism` provides the `TemplateEngine` accessible via the service container or request context.

## 1. Registration

Register the orbit during bootstrap.

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitPrism } from '@gravito/prism'

const core = new PlanetCore({
  config: { 
    VIEW_DIR: 'src/views' // Required: path to templates
  }
})

await core.orbit(new OrbitPrism({
  cache: { maxSize: 1000, enabled: true }
}))
```

## 2. Rendering from Controllers

Prism automatically injects the `view` variable into the `GravitoContext`.

```typescript
router.get('/profile', async (ctx) => {
  const view = ctx.get('view')
  
  const html = view.render('user/profile', {
    user: await db.table('users').first(),
    title: 'My Profile'
  })

  return ctx.html(html)
})
```

## 3. View Resolution

- Templates are resolved relative to `VIEW_DIR`.
- The `.html` extension is optional in the `render()` call.
- Dot notation can be used for subdirectories: `render('admin.dashboard')` looks for `VIEW_DIR/admin/dashboard.html`.

## 4. Cache Management

In development, you may want to clear the cache during HMR:

```typescript
const view = core.container.make('view')
view.clearCache()
```
