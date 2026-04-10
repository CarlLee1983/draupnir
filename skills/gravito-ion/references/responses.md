# Responses

Use `ctx.inertia()` to return an Inertia page response.

```typescript
router.get('/dashboard', async (ctx) => {
  const stats = await statsService.getSummary()
  return ctx.inertia('Dashboard', { stats })
})
```

The first request can return full HTML through the configured root view. Inertia navigations return JSON with the page component, props, URL, and version.

Keep response shaping on the server and page rendering in the client component.
