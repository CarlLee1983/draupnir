# Client Pages

Use the client page component as a pure rendering surface.

## Page contract

- page components read props from the Inertia page payload
- page components should not re-fetch the same page data
- page components should not decide auth or route policy

## React example

```tsx
import { usePage } from '@inertiajs/react'

type DashboardProps = {
  stats: {
    users: number
    requests: number
  }
}

export default function Dashboard() {
  const { stats } = usePage<DashboardProps>().props

  return (
    <section>
      <h1>Dashboard</h1>
      <p>Users: {stats.users}</p>
      <p>Requests: {stats.requests}</p>
    </section>
  )
}
```

## Rules

- keep components serializable
- keep page data shaped by the server
- keep navigation links simple and declarative
- keep client-side state local unless it must survive navigation

## Vue note

If the app uses Vue pages instead of React, the same rule applies: page components should render
the server-provided payload and avoid re-fetching the same page data.
