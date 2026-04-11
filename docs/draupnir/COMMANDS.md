# Commands Reference

All available bun commands for Draupnir development.

## Development

```bash
bun run dev                    # Hot-reload dev server (port 3000)
bun run build                  # Build to dist/
```

## Testing

```bash
bun test                       # Run source/unit/package tests (excludes tests/Feature)
bun test tests/Unit/           # Unit tests only
bun run test:feature           # Auto mode: reuse API_BASE_URL if set, otherwise start a server
bun run test:feature:server    # Feature tests with a dedicated app server
bun run test:feature:existing  # Feature tests against an existing API_BASE_URL
bun test --filter User         # Filter by name
bun test --watch               # Watch mode
bun test --coverage            # With coverage

# E2E (Playwright, auto-starts server on port 3001 with ORM=memory)
bun run test:e2e
bun run test:e2e:ui            # Interactive UI mode
```

## Quality

```bash
bun run typecheck              # TypeScript strict check
bun run lint                   # Biome lint
bun run format                 # Biome format (write)
bun run check                  # typecheck + lint + test
bun run verify                 # check + coverage report
```

## Database

```bash
# Gravito Atlas / Orbit CLI
bun run migrate                # Run migrations
bun run migrate:fresh          # Drop all + re-migrate
bun run db:fresh               # migrate:fresh + seed
bun run make:migration         # Create migration file
```

## Code Generation

```bash
# Gravito CLI
bun run generate:module        # Scaffold new DDD module
bun run make:controller        # Generate controller
bun run route:list             # List all routes
bun run tinker                 # REPL
```
