# Configuration — ConfigManager

`ConfigManager` handles environment variables, manual configuration, and validation.

## Loading Configuration

Use `defineConfig` to structure configuration during bootstrap. It automatically loads corresponding environment variables.

```typescript
import { defineConfig } from '@gravito/core'
import { z } from 'zod'

const config = defineConfig({
  config: {
    APP_NAME: 'Draupnir',
    PORT: 3000,
    DB: {
      HOST: 'localhost',
      PORT: 5432,
    }
  }
})
```

## Accessing Configuration

Configuration values are accessed via `core.config.get()`. It supports dot notation for nested objects.

```typescript
// Get values
const appName = core.config.get<string>('APP_NAME')
const dbHost  = core.config.get<string>('DB.HOST', 'localhost')  // with default

// Check existence
if (core.config.has('DB.PASSWORD')) { ... }

// Set value at runtime
core.config.set('RUNTIME_VALUE', true)
```

## Environment Variables

`ConfigManager` automatically loads all environment variables. Environment variables take precedence over initial configuration.

| Env Var | Config Key |
|---------|------------|
| `APP_NAME` | `APP_NAME` |
| `DB_HOST` | `DB_HOST` (or `DB.HOST` if mapped manually) |

## Validation with Zod

You can define a Zod schema to validate your configuration during bootstrap.

```typescript
import { z } from 'zod'

const schema = z.object({
  APP_NAME: z.string(),
  PORT: z.number().default(3000),
  DB_URL: z.string().url(),
})

core.config.defineSchema(schema)

// Validate (throws error if invalid)
core.config.validate()
```

---

## Global configuration pattern

In Gravito, it's common to have a `config/` directory with separate files (app.ts, database.ts, etc.) and an `index.ts` that bundles them.

```typescript
// config/index.ts
export function buildConfig() {
  return {
    app: require('./app').default,
    db:  require('./database').default,
  }
}

// bootstrap.ts
const core = new PlanetCore(defineConfig({ config: buildConfig() }))
```
