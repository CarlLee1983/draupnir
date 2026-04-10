# Notification Contract

## Core model

Flare's notification model is built from three pieces:

- `Notification` - what to send
- `Notifiable` - who receives it
- `NotificationChannel` - how it is delivered

## Notification shape

```typescript
abstract class Notification {
  abstract via(notifiable: Notifiable): string[]
  toMail?(notifiable: Notifiable): MailMessage
  toSlack?(notifiable: Notifiable): SlackMessage
  toDatabase?(notifiable: Notifiable): DatabaseMessage
  toBroadcast?(notifiable: Notifiable): BroadcastMessage
}
```

## Notifiable shape

```typescript
interface Notifiable {
  getNotifiableId(): string | number
  getNotificationPreferences?(): Promise<Record<string, unknown>>
}
```

## Authoring rules

- Keep `via()` deterministic for the same `notifiable` input unless preferences explicitly change.
- Put channel-specific payload in the matching `toXxx()` method.
- Keep notification classes in the Application layer or a dedicated notifications module.
- If a notification needs mail styling, delegate the mail part to Signal rather than embedding mail transport logic here.

## Example

```typescript
export class PaymentReceived extends Notification {
  constructor(private readonly payment: Payment) {
    super()
  }

  via(notifiable: Notifiable): string[] {
    return ['mail', 'slack', 'database']
  }

  toSlack(): SlackMessage {
    return { text: `Payment received: ${this.payment.amount}` }
  }
}
```

## Common mistakes

- Returning channel names that are not registered.
- Making `via()` depend on hidden global state.
- Putting ORM or HTTP logic inside notification classes.
- Letting the notification object reach across bounded contexts directly.
