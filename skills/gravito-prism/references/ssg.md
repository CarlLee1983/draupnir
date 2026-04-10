# Static Site Generation (SSG)

Prism can crawl your routes and generate a fully static version of your site.

## 1. Full Export

```typescript
const ssg = core.container.make('ssg')

// export(outputDir, baseUrl)
await ssg.export('./dist', 'https://example.com')
```

## 2. Incremental Builds

Optimizes rebuild times by only regenerating pages that have changed (tracked via content hashes).

```typescript
await ssg.export('./dist', 'https://example.com', {
  incremental: true,
  manifestPath: './dist/.build-manifest.json'
})
```

## 3. Dynamic Route Resolution

For routes with parameters (e.g., `/blog/[slug]`), you must provide paths.

```typescript
await ssg.exportDynamic([
  {
    pattern: '/blog/[slug]',
    getPaths: async () => {
      const posts = await db.table('posts').get()
      return posts.map(p => ({ params: { slug: p.slug } }))
    }
  }
], './dist')
```

## 4. CLI Usage

If using `@gravito/pulse`, you can run SSG via commands:

```bash
# General export
bun orbit export

# Incremental build
bun orbit export --incremental
```
