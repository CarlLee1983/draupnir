# Migrations

Atlas uses a `Schema` + `Blueprint` DSL for migrations.

## Table of contents

- [File location & naming](#file-location--naming)
- [Migration template](#migration-template)
- [Blueprint column types](#blueprint-column-types)
- [Column modifiers](#column-modifiers)
- [Indexes](#indexes)
- [Foreign keys](#foreign-keys)
- [Modifying existing tables](#modifying-existing-tables)
- [Dropping tables](#dropping-tables)
- [Running migrations](#running-migrations)
- [Draupnir conventions](#draupnir-conventions)

## File location & naming

- Filename: `YYYY_MM_DD_NNNNNN_snake_case_description.ts`
  - Example: `2026_04_10_000010_create_applications_table.ts`
  - `NNNNNN` is a zero-padded sequence number within the day (ordering tie-breaker)
- Generate via CLI — do not hand-write the timestamp:

```bash
npx orbit make:migration create_widgets_table
# or: bun orbit make:migration create_widgets_table
```

## Migration template

Every migration class implements `Migration` and exports it as the default export:

```typescript
/**
 * Migration: 建立 widgets 表
 */
import { type Migration, Schema } from '@gravito/atlas'

export default class CreateWidgetsTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('widgets', (table) => {
      table.string('id').primary()
      table.string('name')
      table.text('description').nullable()
      table.string('status').default('active')
      table.timestamps()
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('widgets')
  }
}
```

**Best practices:**

- `down()` must reverse `up()` in the correct order (drop dependent tables first).
- Use `table.timestamps()` for `created_at` + `updated_at`. If only `created_at` is needed, declare it explicitly: `table.timestamp('created_at')`.
- Use snake_case for column names.

## Blueprint column types

`Schema.create('t', (table) => { ... })` gives a `Blueprint` with these column builders:

```typescript
// Identifiers
table.id()                   // bigint auto-increment PK
table.uuid('id')             // native UUID column
table.string('id').primary() // string PK (use with app-generated UUIDs)

// Numeric
table.integer('count')
table.smallInteger('score')
table.bigInteger('views')
table.decimal('amount', 18, 4)
table.float('rate')
table.boolean('active')

// Text
table.string('name', 255)    // VARCHAR, default length 255
table.text('description')    // unbounded TEXT
table.enum('type', ['a', 'b'])  // native ENUM where supported
table.set('tags', ['x', 'y'])   // MySQL only

// Dates / times
table.date('birthday')
table.time('opens_at')
table.dateTime('scheduled_at')
table.dateTimeTz('scheduled_at')
table.timestamp('created_at')
table.timestampTz('created_at')
table.timestamps()           // created_at + updated_at TIMESTAMP
table.timestampsTz()         // with time zone
table.softDeletes()          // deleted_at TIMESTAMP (nullable)
table.softDeletesTz()

// Binary / structured
table.binary('payload')      // BLOB
table.json('meta')
table.jsonb('meta')          // Postgres JSONB

// Network / special
table.macAddress('mac')
table.ipAddress('ip')
table.vector('embedding', 1536)  // Postgres pgvector
table.rememberToken()            // VARCHAR(100), auth helper
```

## Column modifiers

Every column builder returns a `ColumnDefinition` supporting chainable modifiers:

```typescript
table.string('email').unique()
table.string('slug').unique().nullable()
table.integer('count').default(0)
table.string('status').default('active')
table.string('role').default('member')
table.text('description').nullable()
table.boolean('is_admin').default(false)
table.timestamp('expires_at').nullable()
```

Common modifiers: `.nullable()`, `.default(value)`, `.unique()`, `.primary()`, `.index()`, `.unsigned()`, `.comment('…')`, `.after('other_column')` (MySQL).

## Indexes

```typescript
// On a column
table.string('email').unique()     // inline

// Standalone
table.index('email')
table.index(['org_id', 'status'])      // composite
table.unique(['user_id', 'org_id'])    // composite unique
table.fullText('content')              // FULLTEXT
table.spatialIndex('location')         // not in SQLite
table.primary(['org_id', 'user_id'])   // composite PK
```

Named indexes: `table.index('email', 'idx_users_email')`.

## Foreign keys

```typescript
// Shortcut: foreignId + constrained
table.foreignId('user_id').constrained().onDelete('cascade')
// → creates bigint column + FK referencing users.id

// Explicit form
table.string('organization_id')
table.foreign('organization_id').references('id').on('organizations').onDelete('cascade')
```

`onDelete` / `onUpdate` actions: `'cascade'`, `'set null'`, `'restrict'`, `'no action'`, `'set default'`.

## Modifying existing tables

```typescript
export default class AddPhoneToUsers implements Migration {
  async up(): Promise<void> {
    await Schema.table('users', (table) => {
      table.string('phone').nullable()
      table.index('phone')
    })
  }

  async down(): Promise<void> {
    await Schema.table('users', (table) => {
      table.dropIndex('users_phone_index')
      table.dropColumn('phone')
    })
  }
}
```

Schema-level helpers:

```typescript
await Schema.hasTable('users')              // boolean
await Schema.hasColumn('users', 'phone')    // boolean
await Schema.getTables()                    // string[]
await Schema.rename('old_name', 'new_name')
```

## Dropping tables

```typescript
await Schema.drop('widgets')           // errors if missing
await Schema.dropIfExists('widgets')   // safe — use this in down()
```

Inside a blueprint, to drop columns/indexes/FKs:

```typescript
table.dropColumn('legacy_field')
table.dropColumn(['a', 'b'])
table.dropIndex('users_email_index')
table.dropForeign(['organization_id'])
```

## Running migrations

```bash
npx orbit migrate              # apply all pending migrations
npx orbit migrate:rollback     # rollback the most recent batch
npx orbit migrate:fresh        # drop all tables + re-migrate (destructive)
npx orbit migrate:status       # show applied vs pending
npx orbit make:migration <name> # generate a new migration file
```

Migrations are tracked in a `migrations` table (`id`, `migration`, `batch`). Rollback runs the most recent batch in reverse.

## Draupnir conventions

1. **App-generated string IDs**: Use `table.string('id').primary()` instead of `table.id()` or `table.uuid()` to allow the application to control UUID generation (e.g., using `crypto.randomUUID()`).
2. **Timestamps**: Always include `table.timestamps()` to track `created_at` and `updated_at`.
3. **Soft Deletes**: Use `table.softDeletes()` for resources that should not be permanently deleted (like Organizations, Applications).
4. **Consistency**: Use snake_case for database columns, even if the application uses camelCase (Atlas handles the mapping).
5. **Nullability**: Use `.nullable()` explicitly for optional fields (like `webhook_url`, `description`).
6. **Unique Constraints**: Ensure email and slugs are unique at the database level using `.unique()`.
