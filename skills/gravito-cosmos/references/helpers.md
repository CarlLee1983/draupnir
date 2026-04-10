# Helpers

Use small helpers to avoid duplicating locale and message lookup logic.

## Suggested helpers

```typescript
export function loadMessages(locale: string): Record<string, string> {
  return locale === 'en'
    ? enMessages
    : locale === 'ja'
      ? jaMessages
      : locale === 'ko'
        ? koMessages
        : zhTwMessages
}

export function translate(
  messages: Record<string, string>,
  key: string,
  params: Record<string, string | number> = {},
): string {
  const template = messages[key] ?? key
  return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''))
}
```

## Rules

- keep helpers pure
- keep fallback behavior obvious
- do not hide locale resolution inside unrelated utility code
- avoid singleton state for translation data unless the package explicitly requires it
