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

## Example catalog

```json
{
  "member.dashboard.title": "會員儀表板",
  "member.dashboard.welcome": "歡迎回來，{name}",
  "member.dashboard.requests": "你今天有 {count} 個請求"
}
```

```json
{
  "member.dashboard.title": "Member Dashboard",
  "member.dashboard.welcome": "Welcome back, {name}",
  "member.dashboard.requests": "You have {count} requests today"
}
```
