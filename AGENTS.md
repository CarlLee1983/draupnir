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

## Custom Skills & Knowledge Guides

Project-specific guidance in [`skills/`](./skills/):
- Each directory contains a `SKILL.md` with detailed guidance on Gravito framework modules and patterns
- Read the `SKILL.md` in each `skills/<module>/` folder for usage examples and best practices

| Module | Purpose |
|--------|---------|
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

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
