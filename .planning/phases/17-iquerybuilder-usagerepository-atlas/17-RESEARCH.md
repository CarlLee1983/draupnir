# Phase 17: 擴充 IQueryBuilder 聚合原語並重構 UsageRepository 去除 Drizzle 直接依賴 — Research

**Researched:** 2026-04-12
**Domain:** Abstraction layer extension (IQueryBuilder + aggregate API) + Drizzle→ORM-agnostic refactor + schema migration (TEXT→REAL)
**Confidence:** HIGH (all findings from direct code inspection of the target repository)

## Summary

Phase 17 is a **pure internal architecture hardening** phase. The goal is three stacked changes:

1. **Extend `IQueryBuilder`** (in `src/Shared/Infrastructure/IDatabaseAccess.ts`) with a single declarative `aggregate<T>(spec)` method that expresses SUM / COUNT / AVG / MIN / MAX, GROUP BY, and a small closed set of column expressions (`dateTrunc`, `coalesce`, `add`).
2. **Implement `aggregate()`** on both the Drizzle adapter (`DrizzleQueryBuilder`) and the Memory adapter (`MemoryQueryBuilder` inside `MemoryDatabaseAccess`), reaching full parity so service-level unit tests can run against Memory without SQLite.
3. **Refactor `DrizzleUsageRepository`** to call `this.db.table('usage_records').aggregate(...)` instead of importing `drizzle-orm` symbols (`and/eq/gte/lte/inArray/sql/desc`) and calling `getDrizzleInstance()` directly. Bundle the `usage_records.credit_cost` migration from TEXT→REAL so `CAST(... AS REAL)` drops out of every aggregation.

Everything the planner needs exists in the codebase today. This is **not** a research-heavy phase — no external library choices, no framework selection, no unknowns. The planner's job is sequencing and TDD breakdown.

**Primary recommendation:** Plan in this order to minimize risk — (a) ship the `credit_cost` REAL migration with backfill first (independent, reversible at data level), (b) design + implement `aggregate()` spec type + Drizzle adapter behind existing Drizzle tests, (c) mirror it in Memory adapter with parity tests, (d) refactor `DrizzleUsageRepository` method-by-method reusing existing `DrizzleUsageRepository.test.ts` as the green-bar invariant, (e) delete the `DrizzleQueryBuilder` subset imports that become unused. Constructor signature `constructor(_db: any)` is broken today (doesn't actually use the injected db) — fix it to `constructor(private db: IDatabaseAccess)` as part of the refactor.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**API shape**
- **D-01:** Aggregation is expressed as a single declarative method `aggregate<T>(spec)` on `IQueryBuilder`. Spec is an object: `{ select: { <alias>: <expr> }, groupBy?, orderBy?, limit? }`. No fluent `.sum().groupBy()` chain, no raw SQL escape hatch.
- **D-02:** `aggregate<T>()` is generic over the caller-supplied DTO (e.g., `DailyCostBucket`). Caller owns the shape; builder returns `Promise<readonly T[]>`. No spec-derived type inference (keeps generics simple).

**Expression primitives (closed set)**
- **D-03:** Aggregators supported: `sum`, `count`, `avg`, `min`, `max`. Column expressions supported: `dateTrunc` (with `'day'` initially; adapter maps to SQLite `DATE()` or Postgres `date_trunc()`), `coalesce`, `add` (binary column arithmetic).
- **D-04:** No raw-SQL escape hatch in this phase. If a future query needs a primitive outside this closed set, extend the spec in a new phase rather than adding `.raw()`.

**Persistence**
- **D-05:** Migrate `usage_records.credit_cost` from TEXT to REAL in this phase. Includes Drizzle migration + data backfill (`CAST(credit_cost AS REAL)`). After migration, `CAST` disappears from every aggregation query — so no `.cast()` primitive is needed on the builder.

**Scope**
- **D-06:** Refactor only `DrizzleUsageRepository`. `schema.ts` remains the single module that imports `drizzle-orm` for table definitions (acceptable — it's the ORM binding layer). Alerts repos stay as-is; deferred to a follow-up phase.

**Test substitutability**
- **D-07:** `MemoryDatabaseAccess` must implement `aggregate()` with full parity to the Drizzle adapter (all primitives in D-03). Unit tests for `GetKpiSummaryService`, `GetCostTrendsService`, `GetModelComparisonService`, `GetPerKeyCostService` must pass against the Memory adapter without touching SQLite.

### Claude's Discretion
- Exact TypeScript shape of the `spec` object (object literal vs. discriminated union vs. builder functions like `sum('col')`) — planner decides, as long as D-01/D-02/D-03 are satisfied and it's ergonomic for the existing UsageRepository call sites.
- Whether `dateTrunc` accepts additional units (`'hour'`, `'week'`, `'month'`) — only `'day'` is required today; add more only if trivial.
- How the Drizzle adapter renders `dateTrunc` on SQLite (`strftime('%Y-%m-%d', col)` vs. `DATE(col)`) — planner decides; must preserve current output format (`YYYY-MM-DD`).
- Migration strategy for `credit_cost` (single migration with backfill SQL vs. two-step rename) — planner decides; must preserve all existing rows' numeric values.

### Deferred Ideas (OUT OF SCOPE)
- **Alerts module refactor** — `DrizzleWebhookEndpointRepository`, `DrizzleAlertDeliveryRepository`, `DrizzleAlertEventRepository` still import `drizzle-orm` directly for `eq`/`and`. Low complexity (no aggregations), separate phase once Phase 17 lands.
- **Atlas adapter aggregate() parity** — Only required if Atlas is a supported production path for these queries; verify during planning and split out if scope grows.
- **Additional dateTrunc units** (`hour`, `week`, `month`) — add only when a feature needs them.
- **Raw SQL escape hatch** — explicitly rejected here (D-04); reopen only if the closed set proves insufficient and a principled extension isn't possible.
- **Pre-computed `total_tokens` stored column** — performance optimization if aggregation profiling shows `add` expression is hot.
</user_constraints>

<phase_requirements>
## Phase Requirements

No v1.3 feature REQ-IDs map to this phase — it's an internal architecture phase that unlocks clean code for future repos and improves testability for already-shipped phases (14, 15). Requirements are derived from CONTEXT decisions:

| Derived ID | Description | Research Support |
|------------|-------------|------------------|
| D-01/D-02 | Ship `aggregate<T>(spec)` method on `IQueryBuilder` with caller-supplied generic DTO | Current interface at `src/Shared/Infrastructure/IDatabaseAccess.ts` has no aggregate hook; fluent CRUD surface already exists and can be extended without breaking existing callers |
| D-03 | Support sum/count/avg/min/max + dateTrunc/coalesce/add in spec | All five aggregate queries in `DrizzleUsageRepository` use exactly this closed set today (see "Current Aggregation Query Inventory" below) |
| D-05 | Migrate `usage_records.credit_cost` TEXT → REAL with backfill | Current column definition: `credit_cost: text('credit_cost').notNull().default('0')` (schema.ts:133); all 5 aggregates currently wrap it in `CAST(... AS REAL)` |
| D-06 | Refactor only `DrizzleUsageRepository`; leave Alerts repos for later | Verified via `grep "from 'drizzle-orm'" src/` — 6 files match; 2 adapter internals + schema.ts are sanctioned, 3 Alerts repos are out of scope, only `DrizzleUsageRepository.ts` is in scope |
| D-07 | Memory adapter gains `aggregate()` parity so service tests drop SQLite dep | Current `MemoryQueryBuilder` has no aggregate method; adding one is well-defined because the in-memory store is an array of rows that JS can group/reduce natively |
</phase_requirements>

## Standard Stack

No new dependencies. This phase is **100% internal refactor** inside existing abstractions. The table below shows the libraries already in play that the plan will touch:

| Library | Version | Purpose | Role In This Phase |
|---------|---------|---------|--------------------|
| `drizzle-orm` | (existing, pinned in package.json) | ORM used by `DrizzleQueryBuilder`, `schema.ts`, `DrizzleUsageRepository` | Stays in adapter internals + schema; **removed** from `DrizzleUsageRepository` |
| `@libsql/client` | ^0.17.0 | SQLite driver used by `getDrizzleInstance()` | Unchanged |
| `@gravito/atlas` | ^2.0.0 | Migration framework (this project uses Atlas migrations in `database/migrations/`, **not** `drizzle-kit`) | Used to author the `credit_cost` TEXT→REAL migration |
| `vitest` | (test framework) | Used by `src/Modules/**/__tests__/*.test.ts` | Existing tests (`DrizzleUsageRepository.test.ts`) serve as green-bar invariants for the refactor; new tests needed for Memory parity |
| `bun test` | (runner) | `package.json` scripts run tests via `bun test src ...` | No change |

**CRITICAL — Migration Framework**: Despite the package being named Drizzle, **migrations in this repo are authored using `@gravito/atlas`** (`import { type Migration, Schema } from '@gravito/atlas'`). Filenames live in `database/migrations/YYYY_MM_DD_NNNNNN_description.ts` and are run via `bun orbit migrate`. There is no `drizzle.config.*`, no `drizzle/migrations/` folder, and `drizzle-kit` is not used. The planner **must author the `credit_cost` migration as an Atlas migration**, not a Drizzle migration.

SQLite constraint to remember: **SQLite does not support altering column types in place.** Every production approach on SQLite is effectively "create new table, copy data, drop old, rename." Atlas `Schema.table(...)` likely cannot do this directly — the migration may need raw SQL via the Atlas connection or a table-recreation dance. Planner must verify Atlas's capabilities or fall back to raw SQL statements inside the migration's `up()`.

## Architecture Patterns

### Recommended Task Structure (for the planner)

This phase decomposes naturally into **four independent work chunks** that can be sequenced but not easily parallelized (each builds on the previous):

```
Wave 0 (prerequisites)
└── Verify Memory adapter parity tests can run; snapshot current DrizzleUsageRepository.test.ts as regression guard

Wave 1: credit_cost TEXT → REAL
├── Atlas migration with table-recreation dance (preserves data)
├── Update schema.ts: credit_cost: real('credit_cost').notNull().default(0)
├── Update IUsageRepository: creditCost: string → number (breaking change for upsert callers)
├── Update BifrostSyncService / UsageRecordInsert producers to pass number
└── Verify all existing Dashboard tests green (they already compute via Number() — low-risk)

Wave 2: IQueryBuilder aggregate() surface
├── Define AggregateSpec<T> type in IDatabaseAccess.ts (select/groupBy/orderBy/limit + where integration)
├── Decide where 'where' lives: reuse existing .where()/.whereBetween() chain, or fold into spec
├── Add aggregate<T>(spec): Promise<readonly T[]> to IQueryBuilder interface
└── No implementations yet — just the contract

Wave 3: Drizzle adapter implementation
├── DrizzleQueryBuilder.aggregate<T>(spec): build drizzle select/groupBy/orderBy AST from spec
├── dateTrunc on SQLite → strftime('%Y-%m-%d', col) (matches existing DATE() output format)
├── Integration tests against :memory: libsql (mirror DrizzleUsageRepository.test.ts style)
└── Verify aggregate() produces bytewise-identical output to current hand-rolled queries

Wave 4: Memory adapter implementation (D-07)
├── MemoryQueryBuilder.aggregate<T>(spec): group in JS using a Map keyed by groupBy column tuples
├── Implement primitives: sum/count/avg/min/max as reducers; dateTrunc('day') via String(date).slice(0,10); coalesce via ??; add via +
├── Honor existing where/whereBetween filters already attached
└── Cross-adapter tests: same spec → same output on both adapters

Wave 5: DrizzleUsageRepository refactor
├── Fix constructor: (_db: any) → (private db: IDatabaseAccess)
├── Rewrite queryDailyCost, queryModelBreakdownInternal, queryPerKeyCostInternal, queryStats, upsert using this.db.table('usage_records')
├── Remove all drizzle-orm imports
├── Re-point DrizzleUsageRepository.test.ts to use a real IDatabaseAccess seam (test currently mocks table() poorly)
└── Add parallel test suite wired to MemoryDatabaseAccess to satisfy D-07

Wave 6: Verification
├── grep "from 'drizzle-orm'" src/Modules/Dashboard → zero hits
├── Run GetKpiSummaryService / GetCostTrendsService / GetModelComparisonService / GetPerKeyCostService tests against Memory adapter (no libsql)
├── Typecheck + lint clean
└── Existing DrizzleUsageRepository.test.ts still green against Drizzle adapter
```

### Current Aggregation Query Inventory

All five aggregation queries in `DrizzleUsageRepository` — the complete list the `aggregate()` spec must express:

| # | Method | Primitives Used | GROUP BY | ORDER BY | LIMIT |
|---|--------|-----------------|----------|----------|-------|
| 1 | `queryDailyCost` | `DATE()` (dateTrunc), `SUM(CAST AS REAL)`, `COUNT(*)`, `SUM()` (tokens) | `DATE(occurred_at)` | `DATE(occurred_at)` ASC | — |
| 2 | `queryModelBreakdownInternal` | `SUM(CAST AS REAL)`, `COUNT(*)`, `AVG(COALESCE(latency_ms, 0))` | `(model, provider)` | `SUM(CAST AS REAL)` DESC | 10 |
| 3 | `queryPerKeyCostInternal` | `SUM(CAST AS REAL)`, `COUNT(*)`, `SUM(input_tokens + output_tokens)` — **uses `add`** | `api_key_id` | `SUM(CAST AS REAL)` DESC | — |
| 4 | `queryStats` | `COUNT(*)`, `SUM(CAST AS REAL)`, `SUM(input_tokens + output_tokens)` — **uses `add`**, `AVG(COALESCE(latency_ms, 0))` | — (single-row aggregate) | — | — |
| 5 | `upsert` | N/A (insert with `onConflictDoNothing`) | — | — | — |

**Key observations:**
- After TEXT→REAL migration: `CAST(... AS REAL)` drops out of all 4 aggregates; spec shape simplifies.
- `add` primitive is only needed for the `input_tokens + output_tokens` pattern (used by queries 3 and 4).
- `coalesce` is only needed for `AVG(COALESCE(latency_ms, 0))` (queries 2 and 4).
- `dateTrunc('day')` only needed for query 1.
- ORDER BY sometimes references the aliased aggregate column (e.g., `totalCost DESC`) — spec's `orderBy` should accept either a raw column or an `alias` that references the `select` keys.
- `upsert` uses `onConflictDoNothing({ target: usageRecords.bifrost_log_id })` — this is a **Drizzle-specific** API not exposed by current `IQueryBuilder.insert()`. Planner must decide: (a) extend `IQueryBuilder` with an `onConflict` primitive, (b) keep `upsert` as a targeted Drizzle call with a clean boundary (but D-06 implies full removal), or (c) use a pre-check "SELECT then INSERT" pattern through the abstraction (costs an extra roundtrip). This is the **only genuine design decision** outside CONTEXT's scope. **Recommendation:** Extend `IQueryBuilder` with an `insertOrIgnore(data, { conflictTarget: 'col' })` method — it's a well-known primitive with equivalents in all major ORMs (SQLite `INSERT OR IGNORE`, Postgres `ON CONFLICT DO NOTHING`, MySQL `INSERT IGNORE`).

### Pattern: Declarative Spec Shape

CONTEXT provides an illustrative call site:

```ts
db.table('usage_records').aggregate<DailyCostBucket>({
  where: { orgId, occurredAt: { between: [range.startDate, range.endDate] } },
  select: {
    date: { dateTrunc: { unit: 'day', column: 'occurred_at' } },
    totalCost: { sum: 'credit_cost' },
    totalRequests: { count: '*' },
    totalInputTokens: { sum: 'input_tokens' },
    totalOutputTokens: { sum: 'output_tokens' },
  },
  groupBy: ['date'],
  orderBy: [{ column: 'date', direction: 'ASC' }],
})
```

**Three implementation shape alternatives the planner should weigh** (all satisfy D-01 to D-04):

**Option A — Discriminated-union object literals (matches CONTEXT example exactly):**
```ts
type AggregateExpr =
  | { sum: string } | { count: string | '*' } | { avg: string } | { min: string } | { max: string }
  | { dateTrunc: { unit: 'day'; column: string } }
  | { coalesce: [AggregateExpr | string, number | string] }
  | { add: [string, string] }
  | string // plain column reference for groupBy pass-through
```
Pros: reads exactly like the CONTEXT example; easy to parse in adapters. Cons: deep nesting is verbose.

**Option B — Builder functions (e.g., `sum('col')` returns `{ kind: 'sum', column: 'col' }`):**
```ts
select: { totalCost: sum('credit_cost'), date: dateTrunc('day', 'occurred_at') }
```
Pros: ergonomic; IDE auto-complete; less noise. Cons: extra import burden at every call site; slightly more indirection.

**Option C — SQL-string-ish tagged enum:**
```ts
select: { totalCost: { op: 'sum', col: 'credit_cost' }, date: { op: 'dateTrunc', unit: 'day', col: 'occurred_at' } }
```
Pros: flat uniform shape. Cons: loses type safety around which fields are valid per op.

**Planner recommendation:** **Option B** — it reads cleanest at call sites and gives strong type inference on each expression node. The CONTEXT example is purely illustrative of semantics, not of syntax.

### Pattern: Where-clause Integration

Existing `IQueryBuilder` already has `.where()`, `.whereBetween()`. Two options:

1. **Chain before aggregate():** `db.table('x').where(...).whereBetween(...).aggregate({...})` — reuses existing infrastructure; spec only owns select/groupBy/orderBy/limit.
2. **Fold where into spec:** `db.table('x').aggregate({ where: {...}, select: {...}, ... })` — self-contained, but duplicates where logic.

**Planner recommendation:** **Option 1** (chain). Existing `.where(col, op, val)` already supports `=`, `in`, `>=`, `<=`; existing `.whereBetween()` already handles ranges. The refactored `DrizzleUsageRepository` would read:

```ts
async queryDailyCostByOrg(orgId: string, range: DateRange) {
  return this.db.table('usage_records')
    .where('org_id', '=', orgId)
    .whereBetween('occurred_at', [range.startDate, range.endDate])  // note: strings, not Date — see pitfall below
    .aggregate<DailyCostBucket>({
      select: {
        date: dateTrunc('day', 'occurred_at'),
        totalCost: sum('credit_cost'),
        totalRequests: count('*'),
        totalInputTokens: sum('input_tokens'),
        totalOutputTokens: sum('output_tokens'),
      },
      groupBy: ['date'],
      orderBy: [{ column: 'date', direction: 'ASC' }],
    })
}
```

Note: current `whereBetween` signature is `(column, [Date, Date])` but `DateRange` uses `string` — see Pitfall 4.

### Anti-patterns to Avoid

- **Don't add a `.raw(sql\`...\`)` escape hatch.** D-04 explicitly rejects this. If a future query needs a new primitive, extend the spec.
- **Don't let the aggregate spec leak Drizzle's `SQL` type.** The spec must be pure TS objects. Adapters translate at the boundary.
- **Don't break `DrizzleUsageRepository.test.ts` during Wave 5.** It's the refactor's green-bar invariant; it validates SQLite-level correctness (`DATE()` output format, numeric rounding, etc.) that unit mocks can't catch.
- **Don't forget `onConflictDoNothing` in `upsert`.** Removing drizzle-orm must not break idempotent sync — the existing test at line 90 explicitly verifies duplicate `bifrostLogId` does not error.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date-string bucketing on SQLite | JS-side grouping after fetching rows | `strftime('%Y-%m-%d', col)` / `DATE(col)` in adapter | Pushdown is O(buckets) network roundtrip; JS grouping pulls all rows |
| Idempotent insert | SELECT-then-INSERT pre-check | `INSERT OR IGNORE` (SQLite) / `ON CONFLICT DO NOTHING` (Postgres) | Atomic; no TOCTOU race |
| Aggregate reducers in Memory adapter | Inlined switch statements scattered across methods | Single `reduceAggregate(rows, exprs)` helper dispatching on expression kind | DRY; easier to keep Drizzle/Memory semantics in sync |
| Migration SQL for TEXT→REAL on SQLite | `ALTER COLUMN` (doesn't exist in SQLite) | Table-recreation dance OR in-place `UPDATE` after changing column affinity | SQLite has dynamic typing; column types are advisory |

**Key insight:** SQLite's type system is **affinity-based**, not strict. A TEXT column can hold numbers; a REAL column silently coerces. This means the "migration" is mostly about (a) updating schema.ts declaration, (b) coercing existing TEXT strings to proper numeric values via a one-shot `UPDATE usage_records SET credit_cost = CAST(credit_cost AS REAL)`, and (c) updating the Drizzle column type. A full table-recreation dance may not be necessary — planner should verify by running against a test DB. **The Atlas adapter may already provide a clean path for this**; check `@gravito/atlas` docs during planning.

## Common Pitfalls

### Pitfall 1: `DrizzleUsageRepository.test.ts` uses a weak IDatabaseAccess seam

**What goes wrong:** The test at lines 17–38 constructs a fake `IQueryBuilder` whose methods mostly no-op; the only working path is `insert` which writes directly to the `testDb` via `testDb.insert(usageRecords).values(data)`. All query methods (`queryDailyCost*`, `queryModelBreakdown*`, etc.) are tested against the **real libsql `:memory:` DB** through the `vi.mock` of `getDrizzleInstance`, not through the abstraction.

**Why it happens:** The current repo calls `getDrizzleInstance()` directly, ignoring its injected `_db: any` parameter. The fake `dbAccess` is only used for `upsert` because that's the only method that would use an abstracted insert.

**How to avoid:** In Wave 5 of the refactor:
1. Fix the test to use a real `MemoryDatabaseAccess` seeded with the same rows, OR
2. Use a real `DrizzleDatabaseAccess` adapter wrapping the `:memory:` libsql instance.

Preferred: option 2 for the Drizzle-adapter test file (keeps it end-to-end against real SQLite), and add a **separate** test file using option 1 for D-07 parity. Do not delete the existing test — its expected outputs (e.g., `totalCost: 4` on line 151) are the contract.

### Pitfall 2: `avgLatencyMs` uses `AVG(COALESCE(latency_ms, 0))`, not `AVG(latency_ms)`

**What goes wrong:** Naive Memory implementation of `avg` would skip NULLs (matching SQL `AVG` default). Drizzle version explicitly COALESCEs NULLs to 0, meaning NULL-latency rows count in the denominator but contribute 0 to the numerator. Output differs.

**Why it happens:** Schema allows `latency_ms INTEGER NULL`; coalescing to 0 gives a conservative "at least these many measured-zero" stat.

**How to avoid:** Memory adapter's `avg` primitive must treat NULLs per the expression semantics. If the spec says `avg({ coalesce: ['latency_ms', 0] })`, Memory must substitute 0 before averaging, meaning NULLs count in `n`. Add test: insert row with `latencyMs: null`, verify `avgLatencyMs` matches Drizzle output exactly.

### Pitfall 3: `dateTrunc('day')` output format

**What goes wrong:** Current Drizzle uses `DATE(occurred_at)` which on libsql yields `'2026-04-11'`. If Memory adapter uses `new Date(s).toISOString().slice(0, 10)` without care, timezone offsets shift the bucket boundary.

**Why it happens:** `occurred_at` stored as ISO string (e.g., `'2026-04-11T23:30:00Z'`). SQLite's `DATE()` treats the text as UTC date. JS `new Date(...).toISOString().slice(0,10)` also yields UTC date. ✅ These match — but only if the adapter uses `.toISOString()`, not `.toLocaleDateString()` or template strings involving `getDate()`.

**How to avoid:** Memory `dateTrunc('day', col)` implementation: `String(row[col]).slice(0, 10)` (since stored strings are already ISO-prefixed with `YYYY-MM-DD`). Simplest and timezone-proof. Document this in a code comment.

### Pitfall 4: `whereBetween` signature mismatch — `[Date, Date]` vs `DateRange` strings

**What goes wrong:** `IQueryBuilder.whereBetween(column, range: [Date, Date])` is typed for `Date` objects; `DateRange` in `IUsageRepository` uses ISO strings. Current repo sidesteps this by calling `gte/lte` with strings directly on drizzle-orm, bypassing the abstraction.

**Why it happens:** Original `IQueryBuilder.whereBetween` was designed for a different use case. `occurred_at` is stored as TEXT, so string comparison works correctly in SQLite.

**How to avoid:** Either (a) loosen `whereBetween` to `[Date | string, Date | string]`, or (b) plan a second `.where('col', '>=', str).where('col', '<=', str)` pair in the refactor. Option (a) is cleaner and backward-compatible (Date values still work via `.toISOString()` coercion at the adapter). Update both Drizzle and Memory adapters to coerce.

### Pitfall 5: `MemoryQueryBuilder.where()` operator casing

**What goes wrong:** `MemoryQueryBuilder.matchRow` (line 60–80) uses `case 'LIKE'` (uppercase) while `DrizzleQueryBuilder.where()` accepts `case 'like'` (lowercase). A silent incompatibility exists today for LIKE; new aggregate() work should not inherit it.

**Why it happens:** Historical drift between adapters.

**How to avoid:** During Wave 4, normalize operator casing to lowercase across both adapters. Add a regression test.

### Pitfall 6: The Atlas migration path for SQLite column type change

**What goes wrong:** Atlas's `Schema.table(..., table.decimal/real(...))` may not rewrite existing column types on SQLite. The column "change" is declarative and may only affect new tables.

**Why it happens:** SQLite doesn't support `ALTER COLUMN`. All ORMs either (a) do a table-recreation dance, (b) leave the affinity "wrong" but coerce at read time, or (c) require raw SQL.

**How to avoid:** Plan to verify against Atlas source/docs during migration work. Fallback: write raw SQL inside the migration's `up()`:
```ts
await DB.raw(`ALTER TABLE usage_records ADD COLUMN credit_cost_new REAL NOT NULL DEFAULT 0;`)
await DB.raw(`UPDATE usage_records SET credit_cost_new = CAST(credit_cost AS REAL);`)
await DB.raw(`ALTER TABLE usage_records DROP COLUMN credit_cost;`)
await DB.raw(`ALTER TABLE usage_records RENAME COLUMN credit_cost_new TO credit_cost;`)
```
Caveat: `DROP COLUMN` was added in SQLite 3.35 (2021); `RENAME COLUMN` in 3.25 (2018). libsql is recent enough that both should work.

### Pitfall 7: `UsageRecordInsert.creditCost: string` contract break

**What goes wrong:** After TEXT→REAL, `schema.ts` column type becomes `real()` returning `number`. If `UsageRecordInsert.creditCost` stays `string`, either Drizzle complains at insert or the insert coerces silently. Downstream producers (`BifrostSyncService`, `UsageAggregator`) pass strings today.

**How to avoid:** In Wave 1, change `UsageRecordInsert.creditCost` to `number` and update all producers. Low risk — values originate from pricing calculation and are already numeric internally; they were only stringified for the TEXT column. Check `src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts` and `UsageAggregator.ts` for the coercion points.

## Code Examples

### Current query (to be replaced) — `queryDailyCost`
Source: `src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts:128-150`

```ts
private async queryDailyCost(condition: any): Promise<readonly DailyCostBucket[]> {
  const db = getDrizzleInstance()
  const rows = await db
    .select({
      date: sql<string>`DATE(${usageRecords.occurred_at})`,
      totalCost: sql<number>`SUM(CAST(${usageRecords.credit_cost} AS REAL))`,
      totalRequests: sql<number>`COUNT(*)`,
      totalInputTokens: sql<number>`SUM(${usageRecords.input_tokens})`,
      totalOutputTokens: sql<number>`SUM(${usageRecords.output_tokens})`,
    })
    .from(usageRecords)
    .where(condition)
    .groupBy(sql`DATE(${usageRecords.occurred_at})`)
    .orderBy(sql`DATE(${usageRecords.occurred_at})`)
  return rows.map(/* ... */)
}
```

### Target refactored shape (planner-recommended Option B syntax)

```ts
async queryDailyCostByOrg(orgId: string, range: DateRange): Promise<readonly DailyCostBucket[]> {
  const rows = await this.db
    .table('usage_records')
    .where('org_id', '=', orgId)
    .whereBetween('occurred_at', [range.startDate, range.endDate])
    .aggregate<DailyCostBucket>({
      select: {
        date: dateTrunc('day', 'occurred_at'),
        totalCost: sum('credit_cost'),
        totalRequests: count('*'),
        totalInputTokens: sum('input_tokens'),
        totalOutputTokens: sum('output_tokens'),
      },
      groupBy: ['date'],
      orderBy: [{ column: 'date', direction: 'ASC' }],
    })
  return rows // typed as readonly DailyCostBucket[] — repo's Number() coercion may still be needed for null-safety
}
```

### Memory adapter `aggregate()` core algorithm (sketch)

```ts
async aggregate<T>(spec: AggregateSpec): Promise<readonly T[]> {
  const rows = this.filterRows(this.getTableRows(), { skipLimitOffset: true })
  // 1. Compute groupBy key for each row
  const groups = new Map<string, Record<string, unknown>[]>()
  for (const row of rows) {
    const key = (spec.groupBy ?? []).map(col => String(evalExpr(row, col))).join('\x1f') || '_all'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }
  // 2. For each group, evaluate each select expression
  let result: T[] = []
  for (const [, groupRows] of groups) {
    const out: Record<string, unknown> = {}
    for (const [alias, expr] of Object.entries(spec.select)) {
      out[alias] = evalAggregateExpr(groupRows, expr) // dispatches sum/count/avg/min/max/dateTrunc/coalesce/add
    }
    result.push(out as T)
  }
  // 3. orderBy, limit
  if (spec.orderBy) result.sort(compareByOrderBy(spec.orderBy))
  if (spec.limit) result = result.slice(0, spec.limit)
  return result
}
```

## Runtime State Inventory

This phase includes a **schema migration** that alters stored data — the inventory is required.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `usage_records.credit_cost` TEXT column holds numeric strings (e.g., `'1.25'`). All existing rows must be preserved as REAL values. | Atlas migration `up()` copies values via `CAST(credit_cost AS REAL)` before column type flip. Verify row count and sample values pre/post migration. |
| Live service config | None — migrations run in-process at deploy; no external service holds Drizzle-specific config for this column. | None. |
| OS-registered state | None. | None. |
| Secrets/env vars | `DATABASE_URL` (at `src/Shared/Infrastructure/Database/Adapters/Drizzle/config.ts:23`) — unchanged. | None. |
| Build artifacts | `@gravito/atlas` migration ledger table (`migrations` table inside SQLite DB) must record the new migration. Standard Atlas behavior — no manual cleanup. `dist/` rebuild needed after code changes (standard). | Standard `bun orbit migrate` run; no special handling. |

**Downstream data consumers of `usage_records.credit_cost`:**
- `DrizzleUsageRepository.queryDailyCost/queryModelBreakdownInternal/queryPerKeyCostInternal/queryStats` — all currently wrap in `CAST(... AS REAL)`; after migration this wrapper is redundant and should be removed.
- `UsageRecordInsert.creditCost: string` — type must change to `number`. Producers: `BifrostSyncService.execute()`, `UsageAggregator` (verify during planning which services write to the column).
- Alert evaluation (`EvaluateThresholdsService` in Alerts module) reads org cost aggregates via `IUsageRepository` — it receives `number` already (reply DTO type is `UsageStats.totalCost: number`), so no change needed at the consumer.

## Environment Availability

This phase is code-and-schema-only — no new external tools, services, or runtimes introduced. Verifying existing toolchain:

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun runtime | All scripts incl. `bun orbit migrate`, `bun test` | ✓ (assumed — already the project runtime) | pinned in project | — |
| `@libsql/client` | Drizzle adapter, tests | ✓ | ^0.17.0 | — |
| `drizzle-orm` | Schema + adapter | ✓ | existing | — |
| `@gravito/atlas` migrations | New migration file | ✓ | ^2.0.0 | Raw SQL via libsql client |
| `vitest` | Test suites | ✓ | existing | — |

**Missing dependencies:** None.

## Validation Architecture

> `workflow.nyquist_validation` key is absent from `.planning/config.json` — treating as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + Bun test runner |
| Config file | None dedicated for vitest (uses Bun's built-in `bun test`); test files use `describe/it/expect/vi` from `vitest` |
| Quick run command | `bun test src/Modules/Dashboard` |
| Full suite command | `bun run check` (typecheck + lint + all tests) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-01/D-02 | `IQueryBuilder.aggregate<T>()` type-checks with caller DTOs | unit (type-level) | `bun run typecheck` | ✅ (tsc) |
| D-03 | Each primitive (sum/count/avg/min/max/dateTrunc/coalesce/add) produces correct SQL + result | unit | `bun test src/Shared/Infrastructure/Database/Adapters/Drizzle/DrizzleQueryBuilder.aggregate.test.ts` | ❌ Wave 0 |
| D-05 | `credit_cost` REAL migration preserves numeric values across all existing rows | integration | `bun test src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` (existing — should stay green with updated schema) | ✅ existing |
| D-05 | `UsageRecordInsert.creditCost: number` type change is ABI-compatible with producers | compile | `bun run typecheck` | ✅ tsc |
| D-06 | No `drizzle-orm` imports in `DrizzleUsageRepository.ts` | smoke | `! grep -q "from 'drizzle-orm'" src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts` | ✅ shell |
| D-07 | All 5 Dashboard service tests run against Memory adapter with identical output | integration | `bun test src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts src/Modules/Dashboard/__tests__/GetCostTrendsService.test.ts src/Modules/Dashboard/__tests__/GetModelComparisonService.test.ts src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` | ✅ existing (currently mock IUsageRepository — planner decides whether to swap to real MemoryDatabaseAccess-backed repo for parity verification, or add a new integration test) |
| Cross-adapter parity | Same spec against Drizzle+libsql and Memory yields identical rows | integration | `bun test src/Shared/Infrastructure/Database/__tests__/AggregateParity.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test src/Modules/Dashboard src/Shared/Infrastructure/Database`
- **Per wave merge:** `bun run check`
- **Phase gate:** Full `bun run check` green + grep verification that `drizzle-orm` imports in `src/` are reduced to only `schema.ts`, `DrizzleQueryBuilder.ts`, and the 3 Alerts repos deferred by D-06

### Wave 0 Gaps
- [ ] `src/Shared/Infrastructure/Database/Adapters/Drizzle/__tests__/DrizzleQueryBuilder.aggregate.test.ts` — primitive-level tests for the Drizzle `aggregate()` implementation
- [ ] `src/Shared/Infrastructure/Database/Adapters/Memory/__tests__/MemoryQueryBuilder.aggregate.test.ts` — primitive-level tests for the Memory `aggregate()` implementation
- [ ] `src/Shared/Infrastructure/Database/__tests__/AggregateParity.test.ts` — shared test suite run against both adapters verifying identical output for representative specs (one per primitive combo, plus the 4 real UsageRepository queries)
- [ ] (Wave 1 gap) Migration tests via `bun orbit migrate:fresh` then seed + verify — not currently a test file, just an ad-hoc verification step. Consider adding `tests/Integration/migrations/CreditCostRealMigration.test.ts` if the team wants automated migration regression coverage.
- [ ] (Wave 5 gap) Memory-adapter-backed test file mirroring `DrizzleUsageRepository.test.ts` to fulfill D-07 — e.g., `src/Modules/Dashboard/__tests__/DrizzleUsageRepository.memory.test.ts` that instantiates the repo against `new MemoryDatabaseAccess()` and runs the same assertions

## Sources

### Primary (HIGH confidence) — direct code inspection

- `src/Shared/Infrastructure/IDatabaseAccess.ts` — current `IQueryBuilder` / `IDatabaseAccess` contracts (verified lines 28–102)
- `src/Shared/Domain/IDatabaseAccess.ts` — domain-facing re-export (pure passthrough, line 9)
- `src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts` — 5 aggregate queries + upsert with `onConflictDoNothing` (lines 1–224)
- `src/Modules/Dashboard/Application/Ports/IUsageRepository.ts` — repo contract, DTOs, `UsageRecordInsert.creditCost: string` (line 61)
- `src/Shared/Infrastructure/Database/Adapters/Drizzle/DrizzleQueryBuilder.ts` — where/whereBetween/count plumbing (lines 32–277)
- `src/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess.ts` — store structure, `filterRows` helper to reuse (lines 14–171)
- `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` — `usageRecords.credit_cost: text('credit_cost').notNull().default('0')` (line 133)
- `src/Shared/Infrastructure/Database/Adapters/Atlas/AtlasQueryBuilder.ts` — sibling adapter pattern (verified no aggregate support today either; D-06 scope exclusion confirmed)
- `src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` — green-bar invariants for refactor (lines 40–471); identifies Pitfall 1 directly
- `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts` — DI wiring (line 29–31 binds `drizzleUsageRepository` to `IDatabaseAccess` which proves the abstraction path is already plumbed — the repo constructor just ignores the injection today)
- `src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` — service-level tests currently mock `IUsageRepository` entirely; satisfying D-07 requires a new test file, not changes to existing ones
- `database/migrations/2026_04_09_000003_create_usage_records_table.ts` + `2026_04_11_000002_add_columns_to_usage_records.ts` + `2026_04_12_000001_add_composite_index_to_usage_records.ts` — migration style reference (Atlas `import { type Migration, Schema } from '@gravito/atlas'`)
- `package.json` — test scripts (`bun test src tests/Unit packages`), migration scripts (`bun orbit migrate`), verify that `drizzle-kit` is NOT a dependency (confirms Atlas is sole migration framework)
- `.planning/codebase/ARCHITECTURE.md` — confirms `IDatabaseAccess` is the sole sanctioned ORM abstraction across the DDD four-layer architecture

### Secondary (MEDIUM confidence)

- SQLite docs — `DROP COLUMN` (3.35+), `RENAME COLUMN` (3.25+), `DATE()` function behavior — well-known SQL semantics; cross-checked against libsql changelog notes.
- Drizzle ORM `onConflictDoNothing` semantics — maps to SQLite `INSERT ... ON CONFLICT(target) DO NOTHING` (or equivalent `INSERT OR IGNORE`); documented behavior, verified by the repo's existing passing test at DrizzleUsageRepository.test.ts:90.

### Tertiary (LOW confidence) — none

All findings in this research are grounded in the repository code; no WebSearch or Context7 queries were needed.

## Metadata

**Confidence breakdown:**
- Standard stack & scope: HIGH — verified via direct grep + file reads
- Architecture (aggregate spec shape + where-chain integration): MEDIUM-HIGH — three syntactic options presented; semantics are unambiguous
- Pitfalls: HIGH — each pitfall is tied to a specific code line or file
- Migration strategy (SQLite TEXT→REAL): MEDIUM — Atlas's capabilities not verified; raw-SQL fallback identified as safe path
- Test strategy: HIGH — existing tests serve as the regression harness

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (30 days — target code is stable, only expect change from this phase itself)
