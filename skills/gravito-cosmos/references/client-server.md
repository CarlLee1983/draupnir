# Client / Server Sync

Keep the same locale on the server and client.

## Flow

1. resolve the effective locale on the server
2. send the locale in shared page data or request context
3. initialize the client i18n runtime with that locale
4. render flash messages and labels with the same message keys

## Inertia example

```typescript
// shared data
ctx.set('inertia:shared', {
  ...shared,
  locale: effectiveLocale,
  messages: loadMessages(effectiveLocale),
})
```

```tsx
import { usePage } from '@inertiajs/react'

// client page
const { locale, messages } = usePage<{ locale: string; messages: Record<string, string> }>().props
```

## Example shape

```typescript
{
  locale: 'zh-TW',
  messages: {
    'member.dashboard.title': '會員儀表板',
    'member.dashboard.welcome': '歡迎回來',
  },
}
```

## Rules

- do not let the client guess a different locale than the server
- do not format server-rendered copy and client-rendered copy with different rules
- do not let flash messages bypass the same translation path as normal UI text
- do not hydrate the client with a locale different from the one used to render the HTML shell
