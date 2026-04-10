# Signal Mailable

`Mailable` packages the full message payload.

## Message builder shape

```typescript
import { Mailable } from '@gravito/signal'

class WelcomeEmail extends Mailable {
  build(): this {
    return this
      .to('user@example.com', 'User')
      .subject('Welcome')
      .html('<h1>Welcome</h1>')
  }
}
```

## Common message pieces

- `to()` recipient
- `cc()` carbon copy
- `bcc()` blind carbon copy
- `from()` sender override
- `subject()` subject line
- `replyTo()` reply address
- `attach()` attachment
- `html()` raw HTML body
- `template()` rendered template body
- `react()` or other renderer-specific helpers when enabled

## Composition rules

- Build the message in `build()` and return `this` for chaining.
- Keep recipient selection explicit. Do not hide business logic inside rendering code.
- Prefer one message class per domain event or email type.
- Keep template data minimal and serializable.

## Design rules

- Use one class per message type.
- Keep templates, subjects, and metadata reusable.
- Keep the payload deterministic so it is easy to test.
- Prefer descriptive class names such as `OrderConfirmationEmail`.

## Common mistakes

- Building the same email payload inline in many callers.
- Mixing transport concerns into the message class.
- Using dynamic data without clear fallback behavior for optional fields.
- Letting the Mailable mutate application state or reach into repositories.
