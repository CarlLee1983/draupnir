# Query Builder

Atlas's fluent Query Builder is returned by `DB.table(name)`. This reference documents the Atlas API as of `@gravito/atlas` 2.x.

## Table of contents

- [Basic shape](#basic-shape)
- [WHERE clauses](#where-clauses)
- [Ordering, limit, offset](#ordering-limit-offset)
- [Joins](#joins)
- [Grouping & aggregates](#grouping--aggregates)
- [Mutations: insert / update / delete](#mutations)
- [Upsert, increment, decrement](#upsert-increment-decrement)
- [Pagination](#pagination)
- [Transactions](#transactions)
- [Raw SQL](#raw-sql)
- [Read replicas](#read-replicas)
- [Debugging](#debugging)

## Basic shape

```typescript
import { DB } from '@gravito/atlas'

// Fluent SELECT
const users = await DB.table<User>('users')
  .select('id', 'email')
  .where('status', 'active')
  .orderBy('created_at', 'desc')
  .limit(10)
  .get()

// First / findByKey
const user = await DB.table('users').where('id', 1).first()     // Record | null
const u2   = await DB.table('users').find(1)                    // Record | null
const u3   = await DB.table('users').findOrFail(1)              // throws RecordNotFoundError
```

**Return types by terminal method:**

| Method | Returns |
|---|---|
| `.get()` | `T[]` (hydrated if Model attached) |
| `.first()` | `T \| null` |
| `.firstOrFail()` | `T`, throws `RecordNotFoundError` |
| `.find(id)` / `.findOrFail(id)` | `T \| null` / `T` |
| `.value<V>(col)` | single column value or `null` |
| `.pluck<V>(col)` | `V[]` |
| `.exists()` / `.doesntExist()` | `boolean` |
| `.count(col?)` / `.sum()` / `.avg()` / `.min()` / `.max()` | `number` / `V \| null` |

## WHERE clauses

```typescript
// Operator form (Atlas allows 2 or 3 args)
q.where('age', '>', 18)
q.where('status', 'active')           // shorthand for (col, '=', val)

// Object form
q.where({ status: 'active', role: 'admin' })

// Nested closure
q.where(q => q.where('a', 1).orWhere('b', 2))

// IN / NOT IN
q.whereIn('role', ['admin', 'owner'])
q.whereNotIn('id', [1, 2, 3])

// NULL
q.whereNull('deleted_at')
q.whereNotNull('email_verified_at')

// BETWEEN
q.whereBetween('created_at', [start, end])
q.whereNotBetween('age', [0, 17])

// EXISTS subquery
q.whereExists(sub => sub.from('posts').whereColumn('posts.user_id', '=', 'users.id'))

// Raw
q.whereRaw('LOWER(email) = ?', [email.toLowerCase()])

// Column-to-column
q.whereColumn('updated_at', '>', 'created_at')

// JSON (dialect-dependent)
q.whereJson('meta->role', 'admin')
q.whereJsonContains('tags', 'urgent')

// OR variants
q.where(...).orWhere(...).orWhereIn(...).orWhereNull(...)
```

Operators accepted: `=`, `!=`, `<>`, `>`, `>=`, `<`, `<=`, `like`, `not like`, `ilike`, `in`, `not in`, `between`, `not between`, `is`, `is not`.

## Ordering, limit, offset

```typescript
q.orderBy('created_at', 'desc')
q.orderByDesc('created_at')
q.orderByRaw('LENGTH(name) DESC')
q.latest('created_at')    // shorthand: ORDER BY created_at DESC
q.oldest('created_at')    // shorthand: ORDER BY created_at ASC

q.limit(10)
q.offset(20)
q.take(10)                // alias for limit
q.skip(20)                // alias for offset

q.distinct()
```

For stable pagination: call `.ensureDeterministicOrder()` to ensure a tie-breaker on the primary key.

## Joins

```typescript
q.join('posts', 'users.id', '=', 'posts.user_id')
q.leftJoin('profiles', 'users.id', '=', 'profiles.user_id')
q.rightJoin('...')
q.crossJoin('tags')
```

Signature: `.join(table, firstCol, operator, secondCol)`.

## Grouping & aggregates

```typescript
await DB.table('orders')
  .select('status')
  .selectRaw('COUNT(*) as total')
  .groupBy('status')
  .having('total', '>', 10)
  .get()

// Direct aggregates (terminal)
await q.count()           // number
await q.count('email')    // COUNT(email)
await q.sum('amount')     // number
await q.avg('score')      // number | null
await q.min('created_at') // V | null
await q.max('created_at') // V | null
```

## Mutations

```typescript
// INSERT
await DB.table('users').insert({ name: 'Alice', email: 'a@x.com' })
await DB.table('users').insert([{...}, {...}])     // batch
const id = await DB.table('users').insertGetId({...}, 'id')

// UPDATE (requires where)
const affected = await DB.table('users')
  .where('id', 1)
  .update({ status: 'inactive' })

// DELETE (requires where)
const deleted = await DB.table('users').where('id', 1).delete()

// TRUNCATE (resets auto-increment)
await DB.table('sessions').truncate()
```

Atlas `insert()` automatically chunks large arrays to stay under driver binding limits.

## Upsert, increment, decrement

```typescript
// UPSERT — INSERT or UPDATE on conflict
await DB.table('user_stats').upsert(
  [{ user_id: 1, views: 10 }, { user_id: 2, views: 5 }],
  ['user_id'],          // uniqueBy
  ['views'],            // columns to update on conflict
)

// INCREMENT / DECREMENT (atomic)
await DB.table('posts').where('id', 1).increment('view_count')
await DB.table('posts').where('id', 1).increment('view_count', 5, { updated_at: new Date() })
await DB.table('credits').where('id', 1).decrement('balance', amount)
```

## Pagination

```typescript
// Offset pagination with metadata
const page = await DB.table('users').orderBy('id').paginate(20, 1)
// { data: T[], total, perPage, currentPage, lastPage }

// Cursor pagination (O(1), for large tables)
const page1 = await DB.table('users').orderBy('created_at').cursorPaginate(20)
const page2 = await DB.table('users').orderBy('created_at').cursorPaginate(20, page1.nextCursor)

// Chunk processing
await DB.table('users').orderBy('id').chunk(1000, async (rows) => {
  for (const row of rows) { /* process */ }
})

// Stream (async iterator)
for await (const row of DB.table('users').stream()) { /* ... */ }
```

## Transactions

```typescript
// Automatic commit/rollback
await DB.transaction(async (tx) => {
  await tx.table('accounts').where('id', 1).decrement('balance', 100)
  await tx.table('accounts').where('id', 2).increment('balance', 100)
})

// With retry on serialization errors
await DB.transactionWithRetry(async (tx, attempt) => {
  // MUST be idempotent — will re-run on failure
}, 'default', { maxRetries: 3 })

// Manual control (rare)
const tx = await DB.beginTransaction()
try {
  await tx.table('users').insert({...})
  await tx.commit()
} catch (e) {
  await tx.rollback()
  throw e
}
```

⚠️ `transactionWithRetry` callbacks must be idempotent — no external side effects (HTTP, email, Slack) inside.

## Raw SQL

Prefer `DB.sql\`…\`` (SafeQueryBuilder — see `references/safe-queries.md`) over `DB.raw` for user input.

```typescript
// Parameterized raw query
const result = await DB.raw('SELECT * FROM users WHERE active = ?', [true])
// QueryResult<T> with .rows, .rowCount, .insertId

// Raw SELECT column
q.selectRaw('CAST(amount AS DECIMAL) as amount_decimal')

// Raw WHERE
q.whereRaw('JSON_EXTRACT(meta, "$.role") = ?', ['admin'])

// Raw ORDER BY
q.orderByRaw('CASE status WHEN "urgent" THEN 0 ELSE 1 END')

// Expression / raw helper
import { raw, Expression } from '@gravito/atlas'
q.select('id', raw('COUNT(*) as total')).groupBy('id')
```

## Read replicas

```typescript
// Force read from replica (read-only hint)
DB.readConnection().table('users').get()

// Force write (primary) — useful right after a write to avoid replica lag
q.useWriteConnection()
```

Read replicas are configured in the connection options under `read` / `write` keys (when needed).

## Debugging

```typescript
// Dump SQL and bindings without executing
q.dump()                            // logs to console
q.toSql()                           // returns compiled SQL string
q.getBindings()                     // returns binding array

// Pretend mode — capture queries without running
const { queries } = await DB.pretend(async () => {
  await User.create({ name: 'Test' })
})

// Query log
DB.debug(true)
await DB.table('users').get()
console.log(DB.getQueryLog())
console.log(DB.getLastQuery())
```
