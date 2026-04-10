# Signal Workflow

This reference covers where mail sending belongs and how to keep the behavior testable.

## Where to send mail

Prefer sending mail from:

- Application services
- Application event handlers
- background jobs

Avoid sending mail directly from controllers unless the endpoint's only job is
to initiate the mail flow.

## Workflow shape

```typescript
await mail.send(new OrderConfirmation(order))
```

Keep the mail orchestration close to the use case that owns the event. The
`Mailable` should describe the message, not decide whether the message should
exist.

## Error handling

- Treat mail sending as a side effect that can fail independently of the core use case.
- Decide at the application boundary whether a failure should abort the request,
  be retried, or be queued.
- Keep retry policy outside the `Mailable` class.

## Testing strategy

- Unit test the `Mailable` contents separately from delivery.
- Use memory transport or dev mode when testing full flows locally.
- Assert recipient, subject, body, and attachments explicitly for important mail types.
- Keep snapshot tests deterministic by freezing time or stripping volatile fields.

## Common workflow mistakes

- Building a `Mailable` but never passing it to a mailer.
- Retrying mail inside controller code.
- Treating mail failure as a domain rule instead of an infrastructure concern.
- Mixing business decisions into the message builder.
