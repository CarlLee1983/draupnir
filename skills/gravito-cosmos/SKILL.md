---
name: gravito-cosmos
description: Guidance for using @gravito/cosmos. Use when adding internationalization, locale detection, translation catalogs, pluralization, language switching, or localization-aware UI text in Gravito projects.
---

# @gravito/cosmos

`@gravito/cosmos` is Gravito's internationalization orbit. Use it when the project needs translated UI strings, locale-aware behavior, or a consistent place to resolve language and message catalogs.

## Quick Decision Tree

```text
Need a locale strategy?
  → references/locale.md

Need translation catalogs?
  → references/catalogs.md

Need pluralization or formatting rules?
  → references/formatting.md

Need integration rules with the web layer?
  → references/integration.md

Need project-specific locale patterns?
  → references/draupnir-patterns.md

Need catalog file shapes or client/server sync?
  → references/client-server.md

Need locale middleware or request setup?
  → references/middleware.md

Need validation and error-message translation?
  → references/validation.md

Need utility helpers for locale resolution?
  → references/helpers.md
```

## Minimal workflow

1. Decide the app's source of truth for locale.
2. Keep translations in catalogs, not in controllers or components.
3. Provide a fallback locale so missing strings do not break the page.
4. Make server and client locale behavior match.
5. Keep user-facing text out of business logic.

## Common pitfalls

- Do not hard-code translated copy in feature code.
- Do not let the active locale drift between server and client rendering.
- Do not mix language selection with authorization or domain decisions.
- Do not assume every string needs translation. Translate user-facing copy, not identifiers.

## References

- `references/locale.md`
- `references/catalogs.md`
- `references/formatting.md`
- `references/integration.md`
- `references/draupnir-patterns.md`
- `references/client-server.md`
- `references/middleware.md`
- `references/validation.md`
- `references/helpers.md`
