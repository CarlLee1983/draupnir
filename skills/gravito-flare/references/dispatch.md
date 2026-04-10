# Dispatch Strategy

## Send APIs

```typescript
import type { INotifier } from '@gravito/flare'

await notifier.send(user, new PaymentReceived(payment))
await notifier.sendMany(users, new NewFeatureAnnouncement())
```

## Strategy options

| Strategy | Behavior | Use case |
|---|---|---|
| `parallel` | Send channels concurrently | Default for independent channels |
| `sequential` | Send channels in order | When one channel must finish before the next |
| `concurrencyLimit` | Limit channel fan-out concurrency | Large batches or provider throttling |

## Selection rules

- Use `parallel` unless there is a concrete ordering dependency.
- Use `sequential` when the channel chain has observable side effects.
- Use `concurrencyLimit` when fan-out can overload providers or queue workers.

## Workflow placement

- Call `INotifier` from Application services, event handlers, or jobs.
- Do not call it from Domain entities.
- If the work is synchronous and user-facing, keep it small.
- If the fan-out is large or slow, move it to a job.

## Common mistakes

- Calling `sendMany()` with unbounded concurrency in a hot path.
- Depending on channel order without setting sequential dispatch.
- Mixing application orchestration with channel implementation details.
