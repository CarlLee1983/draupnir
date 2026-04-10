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
