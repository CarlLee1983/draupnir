---
name: gravito-pulse
description: >
  Guidance for Gravito CLI (Pulse). Use when running `gravito` or `orbit` commands and
  automating framework-level project maintenance. For project and module generation, use
  `gravito-scaffold`.
---

# @gravito/pulse

`@gravito/pulse` is the official CLI for the Gravito framework. Use it for app-level
maintenance commands and command-line orchestration.

## Quick Decision Tree

```
Scaffolding a new Gravito project?
  → Use `gravito-scaffold`

Running app-level tasks (migrate, seed)?
  → Use 'orbit' commands (part of Pulse/Core integration)

Need terminal styling (colors, themes)?
  → references/chromatic.md
```

## Minimal example

```bash
# Create a new project
bunx @gravito/pulse create my-app

# Development server (HMR)
bun orbit dev

# List all registered routes
bun orbit list:routes

# Run migrations
bun orbit migrate
```

## Common pitfalls

- Use `gravito-scaffold` for project/module generation, not Pulse directly.
- Custom commands register via `core.commands.add()` in ServiceProvider boot.
- `bun orbit dev` is for development (HMR); `bun orbit start` is for production.

## References

- **CLI Usage**: `references/pulse.md`
- **Terminal Styling**: `references/chromatic.md`
