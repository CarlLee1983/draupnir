# Orbit CLI

Atlas ships an `orbit` CLI binary. Invoke it via `npx orbit` or (with Bun) `bun orbit`.

## Commands

| Command | What it does |
|---|---|
| `orbit migrate` | Apply all pending migrations (new batch). |
| `orbit migrate:rollback` | Roll back the most recent batch. |
| `orbit migrate:fresh` | Drop all tables, then re-run every migration. **Destructive.** |
| `orbit migrate:status` | Print applied vs pending migrations. |
| `orbit seed` | Run all seeders under `database/seeders/`. |
| `orbit make:migration <name>` | Generate a new migration file with a correct timestamp. |
| `orbit make:model <Name>` | Generate an Active Record Model class scaffold. |
| `orbit generate:types` | Emit TypeScript types from the live DB schema. |
| `orbit doctor` | Sanity checks: connection, schema drift, N+1 warnings, missing indexes. |

## Common workflows

**Adding a new table or column:**
```bash
npx orbit make:migration create_widgets_table
# edit the generated migration file
npx orbit migrate
```

**Resetting local DB during development:**
```bash
npx orbit migrate:fresh
# then seed if needed:
npx orbit seed
```

**Checking what's pending before a deploy:**
```bash
npx orbit migrate:status
```

**Undoing the last migration batch (local only):**
```bash
npx orbit migrate:rollback
```

**Debugging connectivity / schema issues:**
```bash
npx orbit doctor
```

## Environment variables

| Var | Purpose | Default |
|---|---|---|
| `DB_CONNECTION` | `sqlite` / `postgres` / `mysql` | `sqlite` |
| `DB_DATABASE` | File path (sqlite) or database name | `database/database.sqlite` |
| `DB_HOST` / `DB_PORT` | Network host/port for postgres/mysql | — |
| `DB_USERNAME` / `DB_PASSWORD` | Credentials | — |
| `DB_SSLMODE` | Postgres SSL mode | `prefer` |

## Common failure modes

- **"No migration found"** — check filename format `YYYY_MM_DD_NNNNNN_snake_case.ts`. The CLI globs strictly.
- **"Table already exists"** during `migrate` — a previous partial run may have left the table. Fix: check the `migrations` table, manually remove the offending row, or run `migrate:fresh` locally.
- **"Driver not installed"** — `better-sqlite3` / `pg` / `mysql2` are peer dependencies. Install the one matching `DB_CONNECTION`.
- **Non-deterministic order between same-day migrations** — use the 6-digit sequence number (`000001`, `000002`, …) to break ties.
