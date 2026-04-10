# Middleware

Use middleware to resolve locale once per request and make it available to the rest of the stack.

## Recommended shape

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { resolveLocale } from './helpers'

export function injectLocale(ctx: IHttpContext): void {
  const locale = resolveLocale({
    profileLocale: ctx.get<string>('profile:locale'),
    cookieLocale: ctx.getCookie('locale'),
    headerLocale: ctx.getHeader('accept-language'),
  })

  ctx.set('locale', locale)
}
```

## Responsibilities

- resolve locale once
- store the effective locale on the request
- avoid repeated parsing in controllers and page classes
- keep localization state alongside other request-scoped data

## Draupnir note

If the request already knows the authenticated user, read `UserProfile.locale` there and store the
effective value before Inertia shared data is assembled.
