# Formatting

Use locale-aware formatting for numbers, dates, and plural-sensitive strings.

Rules:

- format at the edge, close to presentation
- keep business calculations locale-neutral
- prefer plural-aware message forms for counts

If a string changes based on count, use a translation form that handles singular and plural explicitly.

## Practical rules

- format dates near the UI layer, not in domain objects
- format numbers with the active locale before display
- do not stringify timestamps in database or domain layers
- keep plural rules inside the message layer, not in ad hoc `if count === 1` branches

## Example boundary

```typescript
// good: domain returns data, UI formats it
return {
  balance: account.balance,
  lastUpdatedAt: account.updatedAt,
}
```

The UI can then format `balance` and `lastUpdatedAt` using the active locale.
