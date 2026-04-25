# AGENTS.md

Guidance for AI coding agents. All project documentation lives in [`docs/draupnir/`](./docs/draupnir/).

**See [`docs/draupnir/README.md`](./docs/draupnir/README.md) for** a full navigation index. Key documents:

| Topic | Location |
|-------|----------|
| Architecture overview & constraints (no new deps, stable routes, immutability, etc.) | [`ARCHITECTURE_SUMMARY.md`](./docs/draupnir/ARCHITECTURE_SUMMARY.md) |
| Design decisions | [`DESIGN_DECISIONS.md`](./docs/draupnir/DESIGN_DECISIONS.md) |
| Dev commands, environment variables, adding modules | [`DEVELOPMENT.md`](./docs/draupnir/DEVELOPMENT.md) |
| Coding conventions, TypeScript strict mode, error handling | [`knowledge/coding-conventions.md`](./docs/draupnir/knowledge/coding-conventions.md) |
| Tech stack versions & environment setup | [`knowledge/tech-stack.md`](./docs/draupnir/knowledge/tech-stack.md) |
| Visual & UI design system | [`DESIGN.md`](./DESIGN.md) |
| Acceptance-first TDD pattern | [`acceptance-first-tdd-pattern.md`](./docs/superpowers/specs/acceptance-first-tdd-pattern.md) |


## Development Method

Use Acceptance-First TDD for non-trivial features, bug fixes, and refactors. Keep AGENTS.md lightweight: apply the short rule here, then progressively disclose details from [`docs/superpowers/specs/acceptance-first-tdd-pattern.md`](./docs/superpowers/specs/acceptance-first-tdd-pattern.md) only when planning or implementing work.

## Design System

Always read [`DESIGN.md`](./DESIGN.md) before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match `DESIGN.md`.

## Custom Skills & Knowledge Guides

Project-specific guidance in [`skills/`](./skills/):
- Each directory contains a `SKILL.md` with detailed guidance on Gravito framework modules, Draupnir DDD module layout, and related patterns
- Read the `SKILL.md` in each `skills/<module>/` folder for usage examples and best practices

| Module | Purpose |
|--------|---------|
| [`ddd-module`](./skills/ddd-module/SKILL.md) | DDD four-layer modules (Domain / Application / Infrastructure / Presentation): aggregates, value objects, repository ports, application services, DI — use when adding or refactoring `src/Modules/*` |
| `gravito-atlas` | Database toolkit: Query Builder, ORM, migration DSL |
| `gravito-chromatic` | CLI output styling and terminal themes |
| `gravito-core` | Gravito micro-kernel: bootstrap, Container services |
| `gravito-cosmos` | Internationalization (i18n) and localization |
| `gravito-flare` | Multi-channel notifications and messaging |
| `gravito-impulse` | Form validation: Zod schemas, HTTP validation |
| `gravito-ion` | Inertia.js page integration (React / Vue SPA) |
| `gravito-photon` | HTTP layer: routes, middleware, request context |
| `gravito-plasma` | Redis caching and data operations |
| `gravito-prism` | Templating and image optimization |
| `gravito-pulse` | Gravito CLI: framework commands and project automation |
| `gravito-scaffold` | Generate Gravito project skeletons and boilerplate |
| `gravito-sentinel` | Authentication, JWT guards, RBAC |
| `gravito-signal` | Mail flows and email rendering |
| `gravito-stasis` | Cache management and distributed locks |

## Git worktree conventions

This project keeps all Git worktrees under the `.worktree/` directory:

```
.worktree/<branch-name>/   ← each worktree maps to its own branch
```

**Create a worktree:**
```bash
git worktree add .worktree/<branch-name> -b <branch-name>
```

**List worktrees:**
```bash
git worktree list
```

**Remove a worktree:**
```bash
git worktree remove .worktree/<branch-name>
```

**Notes:**
- `.worktree/` is in `.gitignore` and is not committed to the repository
- Worktrees share the same `.git` object store; switching between them is cheap
- For parallel work, use one worktree per task to avoid branch-switching conflicts
- Agent tooling with `isolation: "worktree"` defaults to this directory

## Developer Profile

> Profile not yet configured. You can use `/gsd:profile-user` to generate one, or manually describe your preferences here.

## Planning & Context (Optional)

This project contains a `.planning/` directory. While not strictly bound to the GSD workflow, you may refer to the plans and roadmap there when tackling complex architectural changes.
