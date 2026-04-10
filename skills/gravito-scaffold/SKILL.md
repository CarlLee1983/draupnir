---
name: gravito-scaffold
description: Guidance for using @gravito/scaffold. Use when generating Gravito projects, satellites, modules, boilerplate files, templates, or starter layouts, including output created through `gravito create` or `bunx @gravito/pulse create`.
---

# @gravito/scaffold

`@gravito/scaffold` is Gravito's code generation package. Use it for repeatable project and module scaffolding so generated files stay consistent with framework conventions.

If the user is starting from the CLI, this skill owns the generated structure even when the entry point is `gravito create`.

## Quick Decision Tree

```text
Need a new Gravito app or satellite?
  → references/projects.md

Need a new module, controller, or provider skeleton?
  → references/module-scaffolds.md

Need to customize generated files or templates?
  → references/templates.md
```

## Core exports

```typescript
import { Scaffold } from '@gravito/scaffold'
```

## Minimal workflow

1. Pick the smallest scaffold that matches the target structure.
2. Generate from a template instead of copying files by hand.
3. Review the output before wiring it into the app.
4. Keep customizations in templates or follow-up edits, not in ad hoc generator forks.

## Common pitfalls

- Do not use scaffold output as a reason to ignore existing architecture rules.
- Do not let generators bypass module boundaries or naming conventions.
- Do not assume generated code is final. Treat it as a starting point.

## References

- `references/projects.md`
- `references/module-scaffolds.md`
- `references/templates.md`
