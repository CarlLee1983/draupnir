# Signal Transports

Choose the transport by environment.

## Transport selection

```typescript
await mail.transport('ses').send(new WelcomeEmail())
await mail.transport('smtp').send(new WelcomeEmail())
```

Choose transport based on delivery requirements, credentials, and environment.

## Transport responsibilities

- SMTP: simple self-managed delivery
- SES: AWS delivery and scaling
- Memory: local preview and test interception
- Custom transports: only when the product needs an unsupported provider or adapter

## Local development

Local development should use dev mode or an in-memory transport so real emails are not sent.

Typical setup:

- `devMode: true` for local preview
- memory transport for tests
- production SMTP/SES only in production config

## Delivery rules

- Keep retry and failure handling at the application boundary, not inside the message class.
- Treat transport selection as configuration, not business logic.
- If a transport cannot support a renderer's output shape, pick a different transport or renderer instead of forcing it.

## Renderer guidance

If a message supports multiple renderers, keep the renderer choice inside the `Mailable` implementation.

## Common transport mistakes

- Sending real mail from tests.
- Branching transport selection inside business logic.
- Assuming one transport behaves like another for retries or attachments.
- Embedding environment checks in the `Mailable` class.
