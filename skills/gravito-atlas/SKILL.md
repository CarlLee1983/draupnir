---
name: gravito-atlas
description: Guidance for using @gravito/atlas — a database toolkit with a fluent Query Builder, Active Record ORM, Safe Query tagged templates, Schema/Blueprint migration DSL, and the `orbit` CLI. Use when writing migrations, queries, transactions, seeders, or debugging DB-related code that imports `@gravito/atlas`, `DB`, `Schema`, `Model`, or uses `orbit` commands.
---

# Gravito Atlas

`@gravito/atlas` is a database toolkit for TypeScript/Node.js. Driver support: PostgreSQL, MySQL, SQLite.

## API surfaces

| Surface | Entry point | When to use |
|---|---|---|
| **DB facade** | `import { DB } from '@gravito/atlas'` | Static entry point for all query/transaction operations |
| **Query Builder** | `DB.table('name')` | Fluent, chainable SELECT/INSERT/UPDATE/DELETE |
| **Safe Query Builder** | `` DB.sql`…` `` | SQL-injection-proof tagged templates for raw SQL |
| **Schema + Blueprint** | `import { Schema } from '@gravito/atlas'` | Migration DSL — create/alter/drop tables |
| **Active Record ORM** | `import { Model } from '@gravito/atlas'` | Decorator-driven ORM with relationships, soft deletes |
| **orbit CLI** | `npx orbit` / `bun orbit` | Migrations, seeders, type generation, REPL |

## Quick decision tree

```
Writing a migration (new table / alter / drop)?
  → See references/migrations.md

Querying the database with a fluent builder?
  → See references/query-builder.md

Need safe raw SQL / complex query?
  → See references/safe-queries.md

Using the Active Record ORM (class extends Model)?
  → See references/orm.md

Running CLI tasks (migrate, seed, make:migration)?
  → See references/cli.md
```

## Setup

For standalone projects:

```typescript
import { DB } from '@gravito/atlas'

DB.configure({
  client: 'sqlite',               // 'sqlite' | 'pg' | 'mysql2'
  connection: { filename: './db.sqlite' },
})
```

### Gravito Core Integration (`OrbitAtlas`)

In Gravito-based projects like Draupnir, use the `OrbitAtlas` class. This orbit automatically reads the `database` configuration and registers the `DB` singleton with the core container.

```typescript
// config/orbits.ts
import { OrbitAtlas } from '@gravito/atlas'

export function getOrbits() {
  return [
    OrbitAtlas, // Automatically configured
  ]
}
```

**MySQL Driver Tip:** When using MySQL, it is recommended to set `useNativeDriver: false` in the configuration to use the `mysql2` driver instead of the Bun-native driver, ensuring compatibility with complex `.unsafe` queries.

## Minimal examples

```typescript
import { DB } from '@gravito/atlas'

// SELECT
const users = await DB.table('users').where('active', true).get()

// INSERT
await DB.table('users').insert({ name: 'Alice', email: 'a@x.com' })

// UPDATE
await DB.table('users').where('id', 1).update({ name: 'Bob' })

// DELETE
await DB.table('users').where('id', 1).delete()

// Transaction
await DB.transaction(async (tx) => {
  await tx.table('accounts').where('id', 1).decrement('balance', 100)
  await tx.table('accounts').where('id', 2).increment('balance', 100)
})

// Safe raw SQL
const row = await DB.sql`SELECT * FROM users WHERE email = ${email}`.first()
```

## Common pitfalls

- ❌ String-interpolating user input into raw SQL — always use `` DB.sql`…` `` or parameterized builder methods.
- ❌ Calling `DB.transaction` and forgetting that nested operations must use the `tx` argument, not `DB`, to stay in-transaction.
- ❌ Hand-writing migration filenames with the wrong timestamp format — use `orbit make:migration <name>` instead.
- ❌ Editing an already-applied migration in a shared environment — create a new migration instead.
- ❌ Forgetting `.nullable()` — columns are NOT NULL by default.
- ❌ Using `DB.table('t').delete()` without a `.where()` — this truncates the table. Atlas does NOT add a safety guard.

## Reference files

Load only the reference relevant to the task:

- **`references/query-builder.md`** — Full chainable Query Builder API: WHERE clauses, joins, aggregates, pagination, upsert, increment/decrement, transactions, raw SQL, read replicas, debugging.
- **`references/safe-queries.md`** — Tagged-template SafeQueryBuilder, `identifier()` for dynamic table/column names, interop with Query Builder.
- **`references/migrations.md`** — `Schema` + `Blueprint` DSL: column types, modifiers, indexes, foreign keys, up/down template, running migrations.
- **`references/orm.md`** — Active Record `Model`, column/relationship decorators, lifecycle hooks, soft deletes, sharding, seeders/factories.
- **`references/cli.md`** — `orbit` CLI commands: migrate, rollback, fresh, status, seed, make:migration, generate:types, db:doctor.
