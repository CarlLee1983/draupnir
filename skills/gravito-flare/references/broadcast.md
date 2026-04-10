# Broadcast

## Goal

Flare broadcast delivers notification payloads to realtime subscribers.

## Channel naming

- Broadcast channel uses `notifications.{notifiable.id}`.
- Radiance event broadcasting should use `events.{eventName}`.
- Keep those namespaces separate.

## Duplicate broadcast rule

- If a domain event was already broadcast through Radiance, Flare should skip the broadcast channel.
- Use a source-event flag such as `broadcastedViaRadiance` to coordinate the deduplication.
- Non-broadcast channels such as mail, slack, and database should still run.

## Example flow

1. A domain event is dispatched.
2. Radiance broadcasts the event to realtime listeners.
3. The event is marked as already broadcasted.
4. Flare sends the same notification to other channels.
5. Flare skips the broadcast channel if the event already went through Radiance.

## Common mistakes

- Broadcasting the same payload twice through different systems.
- Using the same channel namespace for events and notifications.
- Letting broadcast deduplication suppress non-broadcast channels.
