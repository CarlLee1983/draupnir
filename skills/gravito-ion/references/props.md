# Deferred and Merged Props

Use deferred props for data that should not block the initial page render.

```typescript
router.get('/products', async (ctx) => {
  return ctx.inertia('Products/Index', {
    categories: await categoryRepo.findAll(),
    products: ctx.inertia.defer(async () => {
      return productRepo.paginate({ page: 1, limit: 20 })
    }),
  })
})
```

Use merged props when a partial reload should combine new data with existing page state.

```typescript
router.get('/products', async (ctx) => {
  return ctx.inertia('Products/Index', {
    products: ctx.inertia.merge(async () => {
      return productRepo.paginate({ page: ctx.query.page })
    }),
  })
})
```

Use these helpers intentionally. They exist to improve perceived performance and reduce manual page-state wiring.

## Shared props

Shared props are page-wide values that should be available on every Inertia page.

In `Draupnir`, shared state currently includes:

- `auth.user`
- `currentOrgId`
- `flash.success`
- `flash.error`

That belongs in middleware or request setup, not repeated in every route.

## Prop rules

- Keep props serializable.
- Keep expensive data deferred unless the page needs it immediately.
- Keep shared props small. Pages should not inherit large blobs by default.
- Use stable prop names so React page components stay simple.

## Draupnir example

The current middleware flow is:

1. collect shared request state
2. store it in `ctx.set('inertia:shared', ...)`
3. let the Inertia renderer merge it with route-specific props

This is the right place for global UI state like auth and flash messages. It is not the right place
for business data that only one page uses.
