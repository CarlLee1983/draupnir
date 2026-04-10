# SSR

Ion supports SSR as an optional configuration layer.

```typescript
IonOrbit.configure({
  ssr: {
    enabled: true,
    fallbackToCsr: true,
    serverUrl: 'http://localhost:13714',
  },
})
```

Rules:

- Keep fallback-to-CSR enabled unless you have a strong operational reason not to.
- Treat SSR as a progressive enhancement, not a hard dependency.
- Make version checking explicit so stale clients can recover cleanly.
