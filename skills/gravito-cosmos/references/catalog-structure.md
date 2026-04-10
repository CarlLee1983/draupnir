# Catalog Structure

Use a predictable folder layout for translation catalogs.

## Example layout

```text
src/i18n/
  zh-TW/
    auth.json
    admin.json
    member.json
  en/
    auth.json
    admin.json
    member.json
```

## Suggested key families

- `auth.*`
- `admin.*`
- `member.*`
- `errors.*`
- `shared.*`

## Rules

- keep file names aligned across locales
- keep keys stable even when copy changes
- split large catalogs by feature instead of one monolithic file
- avoid putting dynamic runtime values into key names
