---
name: gravito-pulse
description: >
  Guidance for Gravito CLI (Pulse) and terminal styling (Chromatic). Use when scaffolding
  new projects, running 'orbit' commands, or styling terminal output with colors and themes.
---

# @gravito/pulse & chromatic ⚡🎨

`@gravito/pulse` is the official CLI for the Gravito framework, while `@gravito/chromatic` provides advanced terminal styling and semantic coloring.

## Pulse CLI (gravito / orbit)

Used for scaffolding and project maintenance.

```bash
# Scaffold new project
bunx @gravito/pulse create my-app

# Run development server
bun orbit dev

# List routes
bun orbit list:routes
```

## Chromatic (Terminal Styling)

A high-performance library for terminal colors, themes, and semantic UI.

```typescript
import { Chromatic, Painter } from '@gravito/chromatic'

// 1. Simple coloring
console.log(Painter.green('Success!'))
console.log(Painter.bold().red('Critical Error'))

// 2. Semantic colors (respects themes)
console.log(Chromatic.success('Operation completed'))
console.log(Chromatic.error('Failed to connect'))

// 3. Style Builder (chaining)
const styled = Painter.create('Custom Text')
  .bold()
  .fg('#ff0000')
  .bg('white')
  .build()
```

## Quick Decision Tree

```
Scaffolding a new Gravito project?
  → Use 'gravito create' via @gravito/pulse

Running app-level tasks (migrate, seed)?
  → Use 'orbit' commands (part of Pulse/Core integration)

Adding colors or UI to a CLI tool?
  → See references/chromatic.md
```

## References

- **CLI Usage**: `references/pulse.md`
- **Terminal UI & Themes**: `references/chromatic.md`
