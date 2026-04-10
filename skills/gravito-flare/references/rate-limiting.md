# Rate Limiting

## Purpose

Flare rate limiting prevents a single channel from overwhelming downstream providers.

## Model

- Flare uses token bucket semantics.
- Rate limiting is configured per channel.
- A channel may have different limits from other channels.

## Example

```typescript
await core.orbit(new FlareOrbit({
  rateLimit: {
    email: { perSecond: 10, perMinute: 100, perHour: 1000 },
    slack: { perSecond: 1, perMinute: 20 },
  },
}))
```

## Store guidance

- Use memory-backed storage for local development.
- Use Redis-backed storage for multi-node deployments.
- Keep store implementation behind an interface so the middleware does not care about the backend.

## Selection rules

- Keep limits strictest on noisy channels like Slack or broadcast.
- Keep high-volume transactional email on a separate limit from user-facing alerts.
- Treat rate limits as infrastructure policy, not business logic.

## Common mistakes

- Assuming in-memory limits are shared across nodes.
- Using one global limit for all channels.
- Hardcoding provider throttling in feature code.
