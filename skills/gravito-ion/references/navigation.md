# Navigation

Inertia navigation should feel like normal link navigation, even when it is handled over XHR.

## Rules

- use links for navigation, not manual fetch calls
- keep route names stable when the UI depends on them
- let Inertia manage history and scroll state where possible

## Example

```tsx
import { Link } from '@inertiajs/react'

export function Sidebar() {
  return (
    <nav>
      <Link href="/admin/dashboard">Dashboard</Link>
      <Link href="/admin/users">Users</Link>
    </nav>
  )
}
```

## Avoid

- manual window.location changes for normal intra-app navigation
- mixing auth redirects into client-only navigation code
- duplicating route logic in many components
