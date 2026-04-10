# Locale

Pick one canonical locale source for the request or session.

Typical inputs:

- request headers
- user profile preference
- cookie or session state
- explicit route prefix

Keep locale resolution deterministic so the same request yields the same language.

## Suggested precedence

1. explicit user preference stored on the profile
2. locale encoded in the route or tenant context
3. locale stored in cookie or session
4. `Accept-Language`
5. application default

## Draupnir pattern

`Draupnir` already stores locale on `UserProfile` with a default of `zh-TW`. Use that as the
long-lived preference, then expose the effective locale to the request so rendering and messages
stay aligned.

## Practical resolver

```typescript
import { Locale } from '@/Modules/Profile/Domain/ValueObjects/Locale'

export function resolveLocale(input: {
  profileLocale?: string
  routeLocale?: string
  cookieLocale?: string
  headerLocale?: string
}): string {
  const candidate =
    input.profileLocale ??
    input.routeLocale ??
    input.cookieLocale ??
    input.headerLocale ??
    Locale.default().toString()

  return new Locale(candidate).toString()
}
```

Keep the resolver in application or infrastructure code, not in the value object itself.
