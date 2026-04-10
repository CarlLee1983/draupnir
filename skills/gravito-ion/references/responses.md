# Responses

Use `ctx.inertia()` to return an Inertia page response.

```typescript
router.get('/dashboard', async (ctx) => {
  const stats = await statsService.getSummary()
  return ctx.inertia('Dashboard', { stats })
})
```

The first request can return full HTML through the configured root view. Inertia navigations return JSON with the page component, props, URL, and version.

## Response contract

Typical page payload:

```typescript
{
  component: 'Dashboard',
  props: { ...sharedProps, ...pageProps },
  url: '/admin/dashboard',
  version: 'abc123',
}
```

## Header behavior

- Inertia requests send `X-Inertia: true`
- Version checks use `X-Inertia-Version`
- Stale clients should receive `409` plus `X-Inertia-Location`
- JSON responses should include `X-Inertia: true` and `Vary: X-Inertia`

## Draupnir pattern

`src/Pages/InertiaService.ts` already implements this split:

- non-Inertia requests render the HTML shell with embedded page JSON
- Inertia requests return JSON directly
- version mismatch returns `409` to force a full reload

Keep that boundary intact. Controllers should only decide which component and props to send.
