# Translation Catalogs

Store translated messages in catalogs keyed by stable message identifiers.

Good catalog keys:

- `auth.login.title`
- `member.dashboard.welcome`
- `errors.validation.required`

Keep keys stable and descriptive. Do not encode whole sentences into code paths unless the package requires it.

## Recommended structure

```text
locales/
  zh-TW/
    auth.json
    member.json
    admin.json
  en/
    auth.json
    member.json
    admin.json
```

## Key rules

- Keep keys stable across languages.
- Prefer nested namespaces over flat sentence keys.
- Split catalogs by feature area when the project grows.
- Put UI copy in catalogs. Keep IDs, enums, and database values out of translation files.
