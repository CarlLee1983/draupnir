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

## Pulse CLI (gravito / orbit)

Used for app maintenance and orchestration.

```bash
# Run a CLI command
bunx @gravito/pulse create my-app

# Run development server
bun orbit dev

# List routes
bun orbit list:routes
```

## Quick Decision Tree

```
Scaffolding a new Gravito project?
  → Use `gravito-scaffold`

Running app-level tasks (migrate, seed)?
  → Use 'orbit' commands (part of Pulse/Core integration)
```

## References

- **CLI Usage**: `references/pulse.md`
