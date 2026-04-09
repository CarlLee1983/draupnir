# Safe Queries (SafeQueryBuilder)

Atlas's `SafeQueryBuilder` is a tagged-template literal API that guarantees SQL injection safety by separating SQL text from interpolated values. **Use it whenever raw SQL is necessary.**

## Why use it

```typescript
// ❌ UNSAFE: string concatenation
const sql = `SELECT * FROM users WHERE email = '${email}'`
await DB.raw(sql)

// ❌ UNSAFE: template string (same thing)
await DB.raw(`SELECT * FROM users WHERE email = '${email}'`)

// ✅ SAFE: positional parameters
await DB.raw('SELECT * FROM users WHERE email = ?', [email])

// ✅ SAFE and readable: tagged template
await DB.sql`SELECT * FROM users WHERE email = ${email}`.first()
```

Tagged templates compile to `SELECT ... WHERE email = $1` with `bindings=[email]`. The parser never interpolates values into the SQL string.

## Basic usage

```typescript
import { DB } from '@gravito/atlas'

const userId = 123

// all rows
const users = await DB.sql`SELECT * FROM users WHERE id = ${userId}`.all()

// first row or null
const user = await DB.sql`SELECT * FROM users WHERE id = ${userId}`.first()

// full result (includes rowCount, insertId, etc.)
const result = await DB.sql`UPDATE users SET active = ${false} WHERE id = ${userId}`.execute()
console.log(result.rowCount)
```

### Type safety

Pass a generic to type the result:

```typescript
interface User { id: number; email: string; name: string }

const user = await DB.sql<User>`SELECT * FROM users WHERE id = ${id}`.first()
// user: User | null
```

### Using a specific connection

```typescript
const conn = DB.connection('read_replica')
const rows = await conn.sql`SELECT * FROM users`.all()
```

## Dynamic identifiers (table / column names)

Tagged templates parameterize **values**, not identifiers. For dynamic table or column names use `identifier()`, which validates against a whitelist of safe characters.

```typescript
import { DB, identifier } from '@gravito/atlas'

const tableName = identifier('users')
const columnName = identifier('email')

const rows = await DB.sql`
  SELECT ${columnName} FROM ${tableName} WHERE active = ${true}
`.all()

// Rejects obvious injection attempts at construction time:
identifier("users'; DROP TABLE--")   // throws Error
identifier('db.users')               // ✓ schema.table form allowed
identifier('public.users.email')     // ✓ schema.table.column form allowed
```

**Rule of thumb:** if the name comes from user input, you must *also* check it against an application-level allowlist before passing to `identifier()`. `identifier()` only guards against syntactic injection; it does not enforce that the user is allowed to access the named resource.

## Complex queries

```typescript
const authorId = 123
const status = 'published'
const createdAfter = new Date('2024-01-01')

const posts = await DB.sql`
  SELECT p.*, u.name as author_name
  FROM posts p
  JOIN users u ON p.author_id = u.id
  WHERE p.author_id = ${authorId}
    AND p.status = ${status}
    AND p.created_at > ${createdAfter}
  ORDER BY p.created_at DESC
  LIMIT 10
`.all()
```

Interpolate JS values freely — they are all parameterized.

## Interop with Query Builder

Convert a SafeQueryBuilder into an `Expression` to embed as a subquery:

```typescript
const activeSub = DB.sql`SELECT id FROM users WHERE active = ${true}`

await DB.table('posts')
  .whereIn('user_id', activeSub.toExpression())
  .get()
```

## When is raw SQL actually necessary?

Reach for `` DB.sql`…` `` only when:

- The Query Builder lacks the feature (e.g. `RETURNING`, CTEs, window functions, dialect-specific operators).
- A complex SELECT with several joins becomes unreadable as a builder chain.
- Performance-critical hot-path query where the builder overhead matters.

In every other case, prefer the Query Builder — see `references/query-builder.md`.
