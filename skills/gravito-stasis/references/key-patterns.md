# Key Patterns

Use predictable cache keys so invalidation stays manageable.

## Suggested format

```text
{domain}:{entity}:{id}:{purpose}
```

Examples:

- `auth:user:123:profile`
- `member:org:456:dashboard`
- `rate:login:127.0.0.1`
- `health:cache:probe`

## Rules

- namespace by domain first
- keep keys short but readable
- include the purpose when the same entity appears in multiple cache flows
- match keys to invalidation boundaries
