# Phase 17: 擴充 IQueryBuilder 聚合原語並重構 UsageRepository 去除 Drizzle 直接依賴 — Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend `IQueryBuilder` (src/Shared/Infrastructure/IDatabaseAccess.ts) with aggregation primitives (SUM/COUNT/AVG/MIN/MAX, GROUP BY, dateTrunc, coalesce, add) so `DrizzleUsageRepository` can be refactored to stop importing `drizzle-orm` directly. Scope covers the ~5 aggregation methods in `src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts` plus the `MemoryDatabaseAccess` test adapter. Also bundles the `credit_cost` column migration from TEXT to REAL so aggregations no longer need CAST.

Out of scope: Alerts module repos (`DrizzleWebhookEndpointRepository`, `DrizzleAlertDeliveryRepository`, `DrizzleAlertEventRepository`) — they only use simple `eq/and` and can be cleaned up in a dedicated follow-up phase once the new primitives are proven.

</domain>

<decisions>
## Implementation Decisions

### API shape
- **D-01:** Aggregation is expressed as a single declarative method `aggregate<T>(spec)` on `IQueryBuilder`. Spec is an object: `{ select: { <alias>: <expr> }, groupBy?, orderBy?, limit? }`. No fluent `.sum().groupBy()` chain, no raw SQL escape hatch.
- **D-02:** `aggregate<T>()` is generic over the caller-supplied DTO (e.g., `DailyCostBucket`). Caller owns the shape; builder returns `Promise<readonly T[]>`. No spec-derived type inference (keeps generics simple).

### Expression primitives (closed set)
- **D-03:** Aggregators supported: `sum`, `count`, `avg`, `min`, `max`. Column expressions supported: `dateTrunc` (with `'day'` initially; adapter maps to SQLite `DATE()` or Postgres `date_trunc()`), `coalesce`, `add` (binary column arithmetic).
- **D-04:** No raw-SQL escape hatch in this phase. If a future query needs a primitive outside this closed set, extend the spec in a new phase rather than adding `.raw()`.

### Persistence
- **D-05:** Migrate `usage_records.credit_cost` from TEXT to REAL in this phase. Includes Drizzle migration + data backfill (`CAST(credit_cost AS REAL)`). After migration, `CAST` disappears from every aggregation query — so no `.cast()` primitive is needed on the builder.

### Scope
- **D-06:** Refactor only `DrizzleUsageRepository`. `schema.ts` remains the single module that imports `drizzle-orm` for table definitions (acceptable — it's the ORM binding layer). Alerts repos stay as-is; deferred to a follow-up phase.

### Test substitutability
- **D-07:** `MemoryDatabaseAccess` must implement `aggregate()` with full parity to the Drizzle adapter (all primitives in D-03). Unit tests for `GetKpiSummaryService`, `GetCostTrendsService`, `GetModelComparisonService`, `GetPerKeyCostService` must pass against the Memory adapter without touching SQLite.

### Implementation notes (Claude's Discretion)
- Exact TypeScript shape of the `spec` object (object literal vs. discriminated union vs. builder functions like `sum('col')`) — planner decides, as long as D-01/D-02/D-03 are satisfied and it's ergonomic for the existing UsageRepository call sites.
- Whether `dateTrunc` accepts additional units (`'hour'`, `'week'`, `'month'`) — only `'day'` is required today; add more only if trivial.
- How the Drizzle adapter renders `dateTrunc` on SQLite (`strftime('%Y-%m-%d', col)` vs. `DATE(col)`) — planner decides; must preserve current output format (`YYYY-MM-DD`).
- Migration strategy for `credit_cost` (single migration with backfill SQL vs. two-step rename) — planner decides; must preserve all existing rows' numeric values.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Abstraction contracts
- `src/Shared/Infrastructure/IDatabaseAccess.ts` — Current `IQueryBuilder` / `IDatabaseAccess` interface this phase extends
- `src/Shared/Domain/IDatabaseAccess.ts` — Domain-facing re-export (verify whether aggregate() belongs here too)
- `docs/ABSTRACTION_RULES.md` — Abstraction rules referenced from `IDatabaseAccess.ts` header (if present)

### Code to refactor
- `src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts` — Target of the refactor; contains all 5 aggregation queries and the sole non-schema `drizzle-orm` import in the Dashboard module
- `src/Modules/Dashboard/Application/Ports/IUsageRepository.ts` — Contract the repository must continue to satisfy (DTOs, method signatures)
- `src/Shared/Infrastructure/Database/Adapters/Drizzle/DrizzleQueryBuilder.ts` — Current fluent CRUD adapter; aggregate() adapter lives alongside
- `src/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess.ts` — Must gain aggregate() parity (D-07)
- `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` — `usageRecords` table definition; `credit_cost` column type must change REAL (D-05)
- `src/Shared/Infrastructure/Database/Adapters/Atlas/AtlasQueryBuilder.ts` — Reference sibling adapter; check whether it also needs aggregate() or is unused for this path

### Architecture
- `.planning/codebase/ARCHITECTURE.md` — DDD four-layer rules; Infrastructure depends on `IDatabaseAccess`, never on drizzle-orm (Application/Domain already comply)
- `.planning/codebase/CONVENTIONS.md` — Repository naming/method conventions

### Tests
- `src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` — Existing test coverage; must stay green after refactor and now also run against MemoryDatabaseAccess
- `tests/Unit/Adapters/AtlasDatabaseAdapter.test.ts` — Adapter test pattern reference

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `IQueryBuilder` already defines CRUD + where/whereBetween/orderBy/limit/offset/count — `aggregate()` slots in alongside without disturbing existing callers
- `DrizzleQueryBuilder` already wraps `getDrizzleInstance()` and table schema — aggregate() implementation reuses this plumbing
- Drizzle schema `usageRecords` is well-defined; only `credit_cost` needs a type change
- Migration infrastructure exists (Drizzle migrations folder) — D-05 follows the established pattern

### Established Patterns
- Repositories accept `IDatabaseAccess` via constructor; `DrizzleUsageRepository` currently violates this by taking `_db: any` and calling `getDrizzleInstance()` directly. Refactor should also fix that (accept `IDatabaseAccess` properly).
- Service-level tests use Memory adapter — `GetKpiSummaryService` etc. will benefit immediately from D-07
- Aggregation results are always mapped to DTOs (`DailyCostBucket`, `ModelUsageBucket`, etc.) in the repo — this maps cleanly onto `aggregate<T>()`

### Integration Points
- Five services consume `IUsageRepository`: `GetKpiSummaryService`, `GetCostTrendsService`, `GetModelComparisonService`, `GetPerKeyCostService`, `EvaluateThresholdsService` (Alerts)
- DI wiring at `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts` — must continue to register the refactored repository correctly
- `BifrostSyncService` writes via `upsert()` — unaffected by aggregation changes but must survive `credit_cost` type migration

</code_context>

<specifics>
## Specific Ideas

- The declarative spec should read naturally at call sites, e.g.:
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
  (Exact shape is planner's call; this illustrates the intent.)
- Output format of dateTrunc('day') must stay `YYYY-MM-DD` to preserve existing API responses
- After this phase, `grep "from 'drizzle-orm'" src/` should return only `schema.ts` and the two files under `src/Shared/Infrastructure/Database/Adapters/Drizzle/` (adapter internals are the sanctioned exception)

</specifics>

<deferred>
## Deferred Ideas

- **Alerts module refactor** — `DrizzleWebhookEndpointRepository`, `DrizzleAlertDeliveryRepository`, `DrizzleAlertEventRepository` still import `drizzle-orm` directly for `eq`/`and`. Low complexity (no aggregations), separate phase once Phase 17 lands.
- **Atlas adapter aggregate() parity** — Only required if Atlas is a supported production path for these queries; verify during planning and split out if scope grows.
- **Additional dateTrunc units** (`hour`, `week`, `month`) — add only when a feature needs them
- **Raw SQL escape hatch** — explicitly rejected here (D-04); reopen only if the closed set proves insufficient and a principled extension isn't possible
- **Pre-computed `total_tokens` stored column** — performance optimization if aggregation profiling shows `add` expression is hot

</deferred>

---

*Phase: 17-iquerybuilder-usagerepository-drizzle*
*Context gathered: 2026-04-12*
