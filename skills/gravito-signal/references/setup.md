# Signal Setup

Configure Signal once during application bootstrap.

## What Signal owns

- Mail transport selection
- Message composition
- Rendering support
- Dev-mode interception
- Mailer service registration

## Bootstrap example

```typescript
import { SignalOrbit } from '@gravito/signal'

await core.orbit(new SignalOrbit({
  default: 'smtp',
  devMode: process.env.NODE_ENV === 'development',
  transports: {
    smtp: { driver: 'smtp', host: 'localhost', port: 587, secure: false },
    ses: { driver: 'ses', region: 'us-east-1' },
  },
}))
```

## Integration rules

- Keep bootstrap settings in configuration, not in application handlers.
- Use dev mode or memory transport for local development.
- Send emails from Application services or event handlers, not directly from HTTP controllers when possible.
- Keep message construction in `Mailable` classes.
- If a notification system uses Signal as a channel, keep the notification orchestration outside Signal and only send mail here.

## Common setup mistakes

- Hard-coding SMTP credentials in feature code.
- Using the production transport in development.
- Coupling message composition with controller logic.
- Treating Signal as a general event bus instead of a mail package.
