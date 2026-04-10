# Pulse CLI Usage

`@gravito/pulse` is the command-line interface for managing the Gravito ecosystem. It provides tools for scaffolding and interacts with `PlanetCore` via the `orbit` command.

For generated project and module structure, use `gravito-scaffold`.

## 1. Installation

```bash
bun add -g @gravito/pulse
```

## 2. Project Scaffolding

```bash
# Create a new project
gravito init my-app

# Options
# --architecture ddd (default)
# --architecture mvc
# --architecture clean
```

## 3. Orbit Commands

The `orbit` binary is the application-level entry point. It delegates to providers registered in your application.

### Development
```bash
# Start development server
bun orbit dev

# Start server in production mode
bun orbit start
```

### Routing
```bash
# List all registered routes
bun orbit list:routes
```

### Database (Integration with @gravito/atlas)
```bash
# Run migrations
bun orbit migrate

# Rollback last migration
bun orbit migrate:rollback

# Seed database
bun orbit db:seed
```

### Static Site Generation (Integration with @gravito/prism)
```bash
# Export static site
bun orbit export
```

## 4. Custom Commands

You can register custom CLI commands via `ServiceProvider`.

```typescript
class MyServiceProvider extends ServiceProvider {
  boot(core: PlanetCore) {
    core.commands.add('hello', (args) => {
      console.log('Hello from CLI!')
    })
  }
}
```
