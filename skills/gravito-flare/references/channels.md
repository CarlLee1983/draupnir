# Channels

## Built-in channels

### `mail`

- Mail delivery channel.
- Usually delegates to Signal for rendering and transport.
- Keep mail composition logic in Signal mailables when the message is email-first.

### `slack`

- Webhook-style Slack delivery.
- Best for short operational messages.

### `database`

- Persists a notification record for later display.
- Use for in-app notification centers.

### `broadcast`

- Sends realtime notifications to subscribed clients.
- Use with care when Radiance is already broadcasting the same event.

### `sms` / `push`

- Channel-specific adapters for mobile or telecom delivery.
- Treat them like external I/O and keep feature code unaware of provider APIs.

## Custom channel contract

```typescript
interface NotificationChannel {
  send(notification: Notification, notifiable: Notifiable): Promise<void>
}
```

## Custom channel rules

- Resolve all provider dependencies in infrastructure.
- Keep retry, timeout, and serialization concerns inside the channel.
- A channel should only translate a `Notification` into one delivery mechanism.
- Do not let a custom channel decide business policy; that belongs in `via()`.

## Common mistakes

- Duplicating provider API calls in application services.
- Returning a payload shape that the channel cannot serialize.
- Letting mail-only formatting leak into non-mail channels.
