# Signal Preview

Use preview-related configuration when you need safe local development and deterministic test behavior.

## Dev mode

`devMode: true` should intercept outgoing mail and keep it local.

```typescript
await core.orbit(new SignalOrbit({
  devMode: process.env.NODE_ENV === 'development',
}))
```

Use dev mode when:

- developing locally
- validating template output
- avoiding accidental sends during manual testing

## Preview behavior

- Mail should be captured instead of sent.
- Preview output should include message metadata and rendered content.
- Previewing should not require changes to application code.

## Test behavior

- Use memory transport or equivalent test transport.
- Assert message composition separately from transport delivery.
- Keep snapshot tests stable by avoiding time-sensitive markup unless frozen.

## Common preview mistakes

- Using production credentials to inspect a template.
- Letting preview mode change business logic.
- Depending on the preview UI as the only place where email behavior is verified.
