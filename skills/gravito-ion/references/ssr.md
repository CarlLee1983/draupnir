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

## Operational checklist

- Confirm the SSR server URL matches the environment.
- Confirm the root view can render without client-only globals.
- Confirm the page still renders when SSR is unavailable.
- Confirm the version string changes when frontend assets change.

## Failure behavior

If the client version is stale, the server should return a `409` and the browser should reload
the current location. If SSR is down, the app should still serve the CSR path.
