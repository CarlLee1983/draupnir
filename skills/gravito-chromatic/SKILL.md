---
name: gravito-chromatic
description: Guidance for using @gravito/chromatic. Use when styling Gravito CLI output, building terminal themes, choosing semantic colors, or formatting diagnostic messages with Painter or Chromatic.
---

# @gravito/chromatic

`@gravito/chromatic` is Gravito's terminal styling library. Use it when the task is about readable CLI output, theme-aware colors, or semantic status styling.

## Quick Decision Tree

```text
Need simple ANSI styling?
  → references/style.md

Need semantic colors or theme switching?
  → references/themes.md

Need capability detection or custom builders?
  → references/capabilities.md
```

## Core exports

```typescript
import { Chromatic, Painter, ThemeManager } from '@gravito/chromatic'
```

## Minimal workflow

1. Use `Painter` for direct styling when you know the exact output you want.
2. Use `Chromatic` for semantic styles such as success, warning, and error.
3. Keep theme selection in one place instead of scattering color constants across commands.
4. Treat terminal output as presentation. Keep business logic separate.

## Common pitfalls

- Do not hard-code one-off color strings everywhere when a semantic helper exists.
- Do not assume the terminal supports full color depth.
- Do not mix presentation logic into domain or infrastructure code that does not print to the terminal.

## References

- `references/style.md`
- `references/themes.md`
- `references/capabilities.md`
