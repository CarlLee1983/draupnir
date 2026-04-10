# AGENTS.md

Guidance for AI coding agents. All project documentation lives in [`docs/draupnir/`](./docs/draupnir/).

**See [`docs/draupnir/README.md`](./docs/draupnir/README.md) for**:
- Project overview & current milestone
- Constraints (no new deps, routes unchanged, immutability, etc.)
- Architecture, DDD patterns, coding conventions
- Technology stack, environment variables
- Development commands and testing setup

## Custom Skills & Knowledge Guides

Project-specific guidance in [`skills/`](./skills/):
- Each directory contains a `SKILL.md` with detailed guidance on Gravito framework modules and patterns
- Examples: `gravito-impulse` (validation), `gravito-prism` (DI), `gravito-scaffold` (generators), `gravito-sentinel` (middleware)
- Read the `SKILL.md` in each `skills/<module>/` folder for usage examples and best practices

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
