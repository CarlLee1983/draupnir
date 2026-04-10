---
name: gravito-flare
description: Guidance for using @gravito/flare. Use when implementing multi-channel notifications, Notification classes, Notifiable contracts, channel dispatch, broadcast delivery, or notification rate limiting in Gravito projects.
---

# @gravito/flare

`@gravito/flare` is Gravito's multi-channel notification package. Use it for notification orchestration across mail, Slack, database, push, SMS, and broadcast channels.

## Decision tree

```text
Need orbit/bootstrap or channel config?
  -> references/setup.md

Need Notification / Notifiable contracts?
  -> references/notification.md

Need built-in channel behavior or custom channels?
  -> references/channels.md

Need dispatch strategy or sendMany behavior?
  -> references/dispatch.md

Need per-channel rate limiting?
  -> references/rate-limiting.md

Need broadcast duplication rules?
  -> references/broadcast.md
```

## Core exports

```typescript
import { FlareOrbit, Notification } from '@gravito/flare'
import type { INotifier, Notifiable } from '@gravito/flare'
```

## Minimal workflow

1. Configure Flare once at bootstrap.
2. Put notification intent in a `Notification` class, not in controllers.
3. Decide channels in `via(notifiable)`.
4. Send through `INotifier`; keep transport details inside channels.
5. Use Signal for mail rendering/transport details; use Flare for multi-channel orchestration.

## Common pitfalls

- Do not put notification dispatch in Domain entities or Value Objects.
- Do not duplicate mail composition logic inside Flare if Signal already owns it.
- Do not assume broadcast and external realtime channels are interchangeable.
- Always align channel names across config, `via()`, and channel implementations.

## References

- `references/setup.md`
- `references/notification.md`
- `references/channels.md`
- `references/dispatch.md`
- `references/rate-limiting.md`
- `references/broadcast.md`
