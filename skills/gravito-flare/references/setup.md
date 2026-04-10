# Flare Setup

## What Flare owns

Flare orchestrates notifications across channels. It does not own domain rules or mail rendering.

Use Flare when a use case needs:

- one notification delivered to multiple channels
- channel selection based on `Notifiable`
- batch fan-out with `sendMany()`
- per-channel dispatch strategy
- broadcast deduplication

Use Signal when the task is mail-only.

## Bootstrap

```typescript
import { FlareOrbit } from '@gravito/flare'

await core.orbit(new FlareOrbit({
  channels: {
    mail: { driver: 'signal' },
    slack: { driver: 'slack', webhookUrl: process.env.SLACK_WEBHOOK_URL },
    database: { driver: 'database' },
    broadcast: { driver: 'broadcast' },
  },
  dispatchStrategy: 'parallel',
}))
```

## Configuration rules

- Register channels once during bootstrap.
- Keep channel names stable. `via()` must return names that exist in config.
- If a channel depends on another package, wire it through the orbit rather than feature code.
- If a project uses Redis or Plasma for shared state, prefer the distributed backend for shared rate limiting or broadcast coordination.

## Common setup mistakes

- Mixing mail-specific setup into Flare bootstrap.
- Registering a channel but never exposing it through `via()`.
- Using a channel name in `via()` that the container cannot resolve.
- Letting application code construct channel clients directly.
