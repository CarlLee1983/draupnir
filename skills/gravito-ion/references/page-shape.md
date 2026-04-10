# Page Shape

Keep each page component focused on one route-level responsibility.

## Recommended structure

- derive props from `usePage()` or route props
- compose local view components for layout and sections
- keep formatting logic in the page or helper layer, not deep child components

## React example

```tsx
type Props = {
  locale: string
  stats: {
    activeUsers: number
  }
}

export default function AdminDashboard() {
  const { locale, stats } = usePage<Props>().props

  return (
    <main>
      <h1>{locale === 'zh-TW' ? '管理儀表板' : 'Admin Dashboard'}</h1>
      <p>{stats.activeUsers}</p>
    </main>
  )
}
```

## Rules

- keep page-level props small and explicit
- keep server-provided data as the source of truth
- keep layout wrappers separate from page data fetching
