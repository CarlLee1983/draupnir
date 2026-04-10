---
name: gravito-prism
description: >
  Guidance for using @gravito/prism — the Gravito template engine and image optimization orbit.
  Use when writing .html templates (Blade-like syntax), rendering views from controllers,
  generating static sites (SSG), or using the optimized {{image}} helper.
---

# @gravito/prism

`@gravito/prism` is the standard view layer for Gravito. It combines a Blade-inspired template engine with automatic image optimization and Static Site Generation (SSG).

## Quick Decision Tree

```
Rendering a view from a controller?
  → See references/rendering.md

Writing template syntax (@if, @foreach, components)?
  → See references/syntax.md

Optimizing images (AVIF/WebP, LQIP)?
  → See references/images.md

Generating a static site (SSG)?
  → See references/ssg.md
```

## Minimal Example

### Template (`src/views/welcome.html`)
```handlebars
@extends('layouts/main')

@section('content')
  <h1>Welcome, {{ user.name }}</h1>
  {{image src="/avatar.jpg" width=100 alt="Avatar" placeholder="blur"}}
@endsection
```

### Controller
```typescript
router.get('/', (ctx) => {
  const view = ctx.get('view')
  return ctx.html(view.render('welcome', { user: { name: 'Carl' } }))
})
```

## Core exports

```typescript
import { OrbitPrism } from '@gravito/prism'
// Access via context: ctx.get('view')
// Or container: core.container.make('view')
```

## Common pitfalls

- `{{ }}` is HTML-escaped by default; use `{!! !!}` only for trusted content.
- Dot notation maps to subdirectories: `'admin.dashboard'` resolves to `VIEW_DIR/admin/dashboard.html`.
- Call `view.clearCache()` during HMR development to avoid stale templates.

## References

- **Rendering & Context**: `references/rendering.md`
- **Template Syntax**: `references/syntax.md`
- **Image Optimization**: `references/images.md`
- **Static Site Generation**: `references/ssg.md`
- **Security & Sanitization**: `references/security.md`
