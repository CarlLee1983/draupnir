# Phase 9: Cached Sync Infrastructure — Research

**Researched:** 2026-04-11
**Domain:** SQLite cursor-based sync · Drizzle ORM · Bun setInterval scheduler · DDD Infrastructure layer
**Confidence:** HIGH (all findings grounded in direct codebase inspection)

---

## Summary

Phase 9 builds the backend infrastructure that all Phase 10 chart services depend on. The goal is a `BifrostSyncService` that runs on a 5-minute timer, pulls incremental Bifrost logs using a cursor stored in `sync_cursors`, and upserts them into the local `usage_records` table. Dashboard chart queries then read from `usage_records` locally — sub-100ms instead of 500ms–5s Bifrost API calls.

The good news: the schema is already deployed and correct. `usage_records` and `sync_cursors` tables exist in the live database (migration `2026_04_09_000003` and `2026_04_09_000004`). No new DDL migration is required for the core sync path. Three optional columns (`provider`, `latency_ms`, `status`) are missing from `usage_records` but can be added in a thin migration — they are needed by Phase 10 chart queries and are best added now.

The sync service architecture is decided: cursor-based incremental fetch via `ILLMGatewayClient.getUsageLogs()`, write via the `IDatabaseAccess` repository pattern (matching every other infra repository in the project), and scheduling via `setInterval` registered in `bootstrap.ts` after `core.bootstrap()`. No new dependencies. No new framework. Fits exactly into the existing DI/provider structure.

**Primary recommendation:** Build `BifrostSyncService` + `DrizzleUsageRepository` + `SyncCursorRepository` as infrastructure services in the Dashboard module, register in `DashboardServiceProvider`, wire the scheduler in `bootstrap.ts`. Add a thin migration for the three missing columns. All new code follows the `CreditAccountRepository` / `UsageAggregator` patterns already established.

---

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **No new npm/bun dependencies** — Bun setInterval (built-in) is the scheduler; no cron library, no queue
- **No new framework dependencies** — Gravito DDD 2.0 patterns only
- **Immutability** — create new objects, never mutate; all DTO fields `readonly`
- **File size** — 200–400 lines typical; 800 lines max
- **Error handling** — always catch; log; never crash the server process
- **Input validation** — Zod at boundaries; validated before passing to services
- **No Bifrost-specific symbols in `src/Modules/`** — only `ILLMGatewayClient` and gateway-neutral types allowed; Bifrost types live in Infrastructure only
- **DDD layering** — Application ports in `Application/Ports/`; implementations in `Infrastructure/`; timer side-effects in `bootstrap.ts`, not in ServiceProvider.boot()
- **Git commit format** — `<type>: [ <scope> ] <subject>` in Traditional Chinese or English
- **Tests first (TDD)** — write tests before implementation; 80%+ coverage target

---

## Standard Stack

### Core (all already installed — zero new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bun runtime | 1.3.10 | setInterval scheduler | Native to project; no dep needed |
| Drizzle ORM (via `@gravito/atlas`) | existing | SQLite upsert / select queries | Already used by all repositories |
| `IDatabaseAccess` / `IQueryBuilder` | project-internal | Database abstraction | Required by all repository implementations |
| `ILLMGatewayClient` | project-internal | Fetch Bifrost logs | The only allowed gateway interface in Application/Infrastructure |
| `crypto.randomUUID()` | Bun built-in | Generate `usage_records.id` | Already used across the codebase |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `MemoryDatabaseAccess` | project-internal | In-memory DB for unit tests | All sync service unit tests |
| `MockGatewayClient` | project-internal | Mock Bifrost for tests | `BifrostSyncService` unit tests |
| `@gravito/atlas` Schema | existing | Migration authoring | Adding `provider`, `latency_ms`, `status` columns |

### No Alternatives to Consider

The decision to use `IDatabaseAccess` + `ILLMGatewayClient` + `setInterval` is locked. The existing codebase has no precedent for alternative patterns (Redis pub/sub, worker threads, message queues). All are out of scope per "no new dependencies."

---

## Architecture Patterns

### Recommended Project Structure

```
src/Modules/Dashboard/
├── Application/
│   ├── DTOs/
│   │   ├── DashboardDTO.ts           # existing — extend with IUsageRepository result shapes
│   │   └── UsageLogDTO.ts            # new: typed DTO for LogEntry → DB row mapping
│   └── Ports/
│       ├── IUsageAggregator.ts       # existing — keep for live-data fallback
│       ├── IUsageRepository.ts       # NEW: local-read port for dashboard chart queries
│       └── ISyncCursorRepository.ts  # NEW: cursor read/write port
└── Infrastructure/
    ├── Providers/
    │   └── DashboardServiceProvider.ts    # existing — extend with new registrations
    ├── Repositories/
    │   ├── DrizzleUsageRepository.ts      # NEW: implements IUsageRepository
    │   └── DrizzleSyncCursorRepository.ts # NEW: implements ISyncCursorRepository
    └── Services/
        ├── UsageAggregator.ts             # existing — unchanged (live fallback)
        └── BifrostSyncService.ts          # NEW: cursor-based incremental sync

database/migrations/
└── 2026_04_11_000002_add_columns_to_usage_records.ts  # NEW: provider, latency_ms, status
```

### Pattern 1: Cursor-Based Incremental Sync

**What:** On each sync cycle, read `sync_cursors.last_synced_at` (the cursor). Fetch only Bifrost logs newer than that timestamp via `ILLMGatewayClient.getUsageLogs([], { startTime: cursor })`. Insert new rows into `usage_records`. Advance the cursor.

**The UNIQUE constraint on `bifrost_log_id`** provides idempotency — if a row was already inserted, the upsert skips it without error.

**The virtual_key_id → api_key_id mapping problem:** `BifrostLogEntry.virtual_key_id` is a Bifrost ID. `usage_records.api_key_id` must be a local Draupnir `api_keys.id`. The sync service must resolve this mapping using `ApiKeyRepository.findByGatewayKeyId()` (or equivalent lookup). If the virtual key cannot be resolved (key was deleted from local DB, or log references a key not in this org), the row goes into `quarantined_logs` — the table already exists for this purpose.

**Key finding:** `BifrostGatewayAdapter.getUsageLogs` returns `LogEntry[]` where `keyId = entry.virtual_key_id ?? ''`. This is the Bifrost virtual key ID, not the local `api_key_id`. `BifrostSyncService` must query `api_keys` by `bifrost_virtual_key_id` to resolve the local ID. `ApiKeyRepository` currently has no `findByBifrostVirtualKeyId` method — this must be added.

**Example:**
```typescript
// src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts
export class BifrostSyncService {
  constructor(
    private readonly gatewayClient: ILLMGatewayClient,
    private readonly usageRepo: IUsageRepository,
    private readonly cursorRepo: ISyncCursorRepository,
    private readonly apiKeyRepo: IApiKeyRepository,
    private readonly db: IDatabaseAccess,
  ) {}

  async sync(): Promise<SyncResult> {
    const cursor = await this.cursorRepo.get('bifrost_logs')
    const since = cursor?.lastSyncedAt ?? new Date(0).toISOString()

    const logs = await this.gatewayClient.getUsageLogs([], {
      startTime: since,
      limit: 500,
    })

    let synced = 0
    let quarantined = 0

    for (const log of logs) {
      const apiKey = await this.apiKeyRepo.findByBifrostVirtualKeyId(log.keyId)
      if (!apiKey) {
        await this.quarantineLog(log, 'virtual_key_not_found')
        quarantined++
        continue
      }

      await this.usageRepo.upsert({
        id: crypto.randomUUID(),
        bifrostLogId: log.timestamp + ':' + log.keyId, // stable composite key if no log.id
        apiKeyId: apiKey.id,
        orgId: apiKey.orgId,
        model: log.model,
        provider: log.provider,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        creditCost: String(log.cost),
        latencyMs: log.latencyMs,
        status: log.status,
        occurredAt: log.timestamp,
        createdAt: new Date().toISOString(),
      })
      synced++
    }

    await this.cursorRepo.advance('bifrost_logs', {
      lastSyncedAt: new Date().toISOString(),
      lastBifrostLogId: logs.at(-1)?.keyId ?? cursor?.lastBifrostLogId,
    })

    return { synced, quarantined }
  }
}
```

**Critical gap identified:** `ILLMGatewayClient.getUsageLogs(keyIds, query)` currently requires a `keyIds` array. Passing an empty array `[]` may return zero results depending on the adapter implementation. Inspect `BifrostGatewayAdapter.getUsageLogs` — it passes `keyIds.join(',')` as `virtual_key_ids`. An empty string `virtual_key_ids=` likely means "no filter" on Bifrost (returns all logs), but this must be verified. The sync service should pass `[]` for keyIds when doing a global org-wide sync, and verify the behavior. If Bifrost requires at least one key ID, the sync service must first fetch all active key IDs from `api_keys` and pass them.

### Pattern 2: IUsageRepository as Dashboard Read Model

**What:** Define `IUsageRepository` port in Application layer. The port exposes query methods shaped for dashboard use cases. Phase 9 creates this port and its `DrizzleUsageRepository` implementation. Phase 10 chart services consume it.

**Example:**
```typescript
// src/Modules/Dashboard/Application/Ports/IUsageRepository.ts
export interface DateRange {
  readonly startDate: string  // ISO 8601
  readonly endDate: string    // ISO 8601
}

export interface DailyCostBucket {
  readonly date: string        // YYYY-MM-DD
  readonly totalCost: number
  readonly totalRequests: number
  readonly totalInputTokens: number
  readonly totalOutputTokens: number
}

export interface ModelUsageBucket {
  readonly model: string
  readonly provider: string
  readonly totalCost: number
  readonly totalRequests: number
  readonly avgLatencyMs: number
}

export interface IUsageRepository {
  upsert(record: UsageRecordInsert): Promise<void>
  queryDailyCostByOrg(orgId: string, range: DateRange): Promise<readonly DailyCostBucket[]>
  queryModelBreakdown(orgId: string, range: DateRange): Promise<readonly ModelUsageBucket[]>
  queryStatsByOrg(orgId: string, range: DateRange): Promise<UsageStats>
  queryStatsByKey(apiKeyId: string, range: DateRange): Promise<UsageStats>
}
```

### Pattern 3: Bun setInterval in bootstrap.ts

**What:** After `core.bootstrap()` completes, retrieve `bifrostSyncService` from the container and start a `setInterval`. The sync runs in the same Bun event loop — no threads, no new processes, no new deps.

**Example:**
```typescript
// src/bootstrap.ts — after core.bootstrap()
const syncService = core.container.make('bifrostSyncService') as BifrostSyncService
const SYNC_INTERVAL_MS = Number(process.env.BIFROST_SYNC_INTERVAL_MS ?? 5 * 60 * 1000)

// Run once at startup to populate initial data
syncService.sync().catch((err) => {
  console.error('[BifrostSync] Initial sync failed:', err)
})

// Then on interval
setInterval(async () => {
  try {
    const result = await syncService.sync()
    console.log(`[BifrostSync] Synced ${result.synced} records, quarantined ${result.quarantined}`)
  } catch (err) {
    console.error('[BifrostSync] Sync error (dashboard will serve stale data):', err)
    // DO NOT rethrow — server must not crash
  }
}, SYNC_INTERVAL_MS)
```

### Pattern 4: DashboardServiceProvider Registration

The `DashboardServiceProvider.register()` must be extended with three new singletons. Follow the identical pattern to `CreditAccountRepository` registration.

```typescript
// src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts
import { DrizzleSyncCursorRepository } from '../Repositories/DrizzleSyncCursorRepository'
import { DrizzleUsageRepository } from '../Repositories/DrizzleUsageRepository'
import { BifrostSyncService } from '../Services/BifrostSyncService'

override register(container: IContainer): void {
  // existing registrations...

  container.singleton('syncCursorRepository', (c: IContainer) => {
    return new DrizzleSyncCursorRepository(c.make('database') as IDatabaseAccess)
  })

  container.singleton('drizzleUsageRepository', (c: IContainer) => {
    return new DrizzleUsageRepository(c.make('database') as IDatabaseAccess)
  })

  container.singleton('bifrostSyncService', (c: IContainer) => {
    return new BifrostSyncService(
      c.make('llmGatewayClient') as ILLMGatewayClient,
      c.make('drizzleUsageRepository') as IUsageRepository,
      c.make('syncCursorRepository') as ISyncCursorRepository,
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('database') as IDatabaseAccess,
    )
  })
}
```

**Key finding on DI container key for DB:** Other ServiceProviders use `c.make('database')` — verify the exact key name by checking `FoundationServiceProvider.ts`. The `DatabaseAccessBuilder` in bootstrap creates the instance; the key it registers under must match.

### Pattern 5: Migration for Missing Columns

`usage_records` is missing `provider`, `latency_ms`, and `status` columns needed for Phase 10 chart queries. Add a Gravito Atlas migration now — cheaper than adding it mid-Phase 10.

```typescript
// database/migrations/2026_04_11_000002_add_columns_to_usage_records.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class AddColumnsToUsageRecords implements Migration {
  async up(): Promise<void> {
    await Schema.table('usage_records', (table) => {
      table.string('provider').nullable()
      table.integer('latency_ms').nullable()
      table.string('status').nullable()  // 'success' | 'error'
      table.index(['api_key_id'])        // add if not already indexed
    })
  }

  async down(): Promise<void> {
    // Atlas may not support column drops on SQLite — document as irreversible
    // SQLite cannot drop columns without recreating the table
  }
}
```

**Also update `schema.ts`** to match: add `provider`, `latency_ms`, `status` columns to the `usageRecords` table definition. The schema must stay in sync with migrations.

### Anti-Patterns to Avoid

- **Timer in ServiceProvider.boot():** Boot runs during container init, before HTTP server ready. Side effects like `setInterval` break the startup sequence. Always put timer in `bootstrap.ts` after `core.bootstrap()`.
- **Passing Bifrost types through Application layer:** `BifrostLogEntry` (snake_case) must never appear in `BifrostSyncService`'s public API. Use `ILLMGatewayClient.getUsageLogs()` which returns `LogEntry[]` (camelCase, gateway-neutral). The adapter already handles the translation.
- **Upsert without UNIQUE constraint:** The UNIQUE constraint on `usage_records.bifrost_log_id` is already defined in the schema and migration. Do not skip it — it is the idempotency mechanism.
- **Empty keyIds causing full-history re-fetch:** If `getUsageLogs([], { startTime: since })` returns all logs from the cursor (correct), the sync is efficient. If empty `keyIds` returns zero results (wrong), the dashboard will never populate. Must be tested with an integration test.
- **Crashing on sync error:** Any exception inside the `setInterval` callback must be caught and logged. Uncaught async exceptions in Bun's event loop do not crash the process by default, but `await syncService.sync()` throwing will produce unhandled rejection warnings. Always wrap in try/catch.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deduplication of log rows | Custom hash comparison | `bifrost_log_id` UNIQUE constraint + upsert | DB handles it atomically; no in-memory state needed |
| Pagination of Bifrost logs | Custom cursor pagination | `BifrostLogsQuery.offset` + `limit: 500` loop | Bifrost API already supports pagination; the adapter handles it |
| Concurrency lock for multi-instance | Application-level mutex | `sync_cursors` UPDATE as soft lock | SQLite WAL mode handles single-writer; if concurrent writes attempted, WAL serializes them |
| Scheduling (cron) | Third-party cron library | `setInterval` (Bun built-in) | Zero dep; proven pattern for single-process Bun services |
| In-memory aggregation of logs | Reduce/groupBy in TypeScript | SQL `GROUP BY model, DATE(occurred_at)` | SQL is 10–100x faster for aggregate queries on large tables; correct at any scale |

---

## Common Pitfalls

### Pitfall 1: virtual_key_id → api_key_id Resolution Gap

**What goes wrong:** `BifrostLogEntry.virtual_key_id` is a Bifrost ID string. `usage_records.api_key_id` must be a local Draupnir `api_keys.id` UUID. If the sync service inserts `virtual_key_id` directly as `api_key_id`, every query joining `usage_records` to `api_keys` will fail silently (no matching rows, foreign key violation if enforced).

**Why it happens:** The adapter maps `virtual_key_id` → `LogEntry.keyId` (see `BifrostGatewayAdapter.getUsageLogs` line 145: `keyId: entry.virtual_key_id ?? ''`). This is a gateway key ID, not a local DB ID. The two ID spaces are separate.

**How to avoid:** `BifrostSyncService` must look up `ApiKeyRepository.findByBifrostVirtualKeyId(log.keyId)` for each log entry. This requires adding `findByBifrostVirtualKeyId` to `ApiKeyRepository` (query: `WHERE bifrost_virtual_key_id = ?`). If not found → quarantine the log.

**Warning signs:** `usage_records` rows exist but dashboard queries return 0 results because `api_key_id` doesn't match any `api_keys.id`.

### Pitfall 2: Missing `bifrost_log_id` — No Stable Unique Key from LogEntry

**What goes wrong:** `LogEntry` (the gateway-neutral DTO) has no `id` field. Only `BifrostLogEntry` has `id`. The UNIQUE constraint on `usage_records.bifrost_log_id` requires a stable, unique value per log entry. Using `log.timestamp + ':' + log.keyId` as a composite key is fragile (two logs for the same key at the same millisecond would collide).

**Root cause:** `BifrostGatewayAdapter.getUsageLogs` maps `BifrostLogEntry` to `LogEntry` but drops the `id` field (not included in `LogEntry` interface).

**How to avoid:** Two options:
1. Add `readonly id?: string` to the `LogEntry` interface and populate it in `BifrostGatewayAdapter` from `entry.id`. (Preferred — minimal change, keeps the gateway neutral interface.)
2. Alternatively, use `BifrostSyncService` at the Infrastructure layer where it can directly use `BifrostClient.getLogs()` instead of `ILLMGatewayClient.getUsageLogs()` — but this breaks the v1.0 constraint of no Bifrost-specific imports in `src/Modules/`.

**Recommended:** Option 1 — add optional `logId?: string` to `LogEntry` in `types.ts` and populate it in `BifrostGatewayAdapter`. `BifrostSyncService` uses it as `bifrost_log_id`. Fall back to timestamp+keyId composite only if `logId` is absent.

**Warning signs:** Duplicate key constraint violations during sync; or `bifrost_log_id` values that are not globally unique.

### Pitfall 3: Empty `keyIds` Array Behavior

**What goes wrong:** `ILLMGatewayClient.getUsageLogs([], { startTime: since })` — passing empty array. `UsageAggregator.getLogs` has an early return for empty keyIds (returns `[]`). But `BifrostSyncService` needs to sync all logs (org-wide or all-org), not per-key. If the call returns `[]` early, no data is ever synced.

**How to avoid:** `BifrostSyncService` must NOT use `IUsageAggregator.getLogs()` — it must call `ILLMGatewayClient.getUsageLogs()` directly with empty `keyIds` (or all active key IDs). Verify that `BifrostGatewayAdapter.getUsageLogs([], ...)` passes `virtual_key_ids=` (empty string) to Bifrost, which Bifrost treats as "no filter" (all logs). If Bifrost rejects an empty `virtual_key_ids` param, the adapter must omit the param entirely when keyIds is empty.

**Warning signs:** Sync reports `synced: 0` on every cycle; `usage_records` table remains empty.

### Pitfall 4: SQLite Column Drop Limitation

**What goes wrong:** If a migration adds a column that needs to be removed later, SQLite does not support `ALTER TABLE ... DROP COLUMN` without recreating the table. The `down()` migration for adding `provider`, `latency_ms`, `status` cannot cleanly undo.

**How to avoid:** Only add columns that are needed. The three proposed columns (`provider`, `latency_ms`, `status`) are all required for Phase 10 chart queries — add them now. Do not add speculative columns.

**Warning signs:** Rollback attempt fails with "SQLite does not support DROP COLUMN."

### Pitfall 5: Sync Timer Registered Before Container is Booted

**What goes wrong:** If `setInterval` is registered before `core.bootstrap()` completes, `core.container.make('bifrostSyncService')` will throw "binding not found." The service provider may not yet have run its `register()` method.

**How to avoid:** Always register the timer AFTER `await core.bootstrap()` returns. The existing `bootstrap.ts` already has a clear "after boot" section where `registerRoutes` and `ensureCoreAppModulesService.execute()` run. Add the sync timer there.

### Pitfall 6: DrizzleQueryBuilder Doesn't Support Raw SQL GROUP BY

**What goes wrong:** `DrizzleQueryBuilder` (the `IQueryBuilder` abstraction) supports basic `where`, `select`, `orderBy`, `limit`, `offset`, and `count`. It does NOT expose `groupBy`, `sum`, `avg`, or raw SQL. Dashboard chart queries require `SELECT DATE(occurred_at), SUM(credit_cost), COUNT(*) FROM usage_records GROUP BY DATE(occurred_at)`.

**How to avoid:** `DrizzleUsageRepository` must bypass `IDatabaseAccess.table()` for aggregate queries and use the raw Drizzle instance directly via `getDrizzleInstance()`. This is acceptable — Infrastructure implementations are allowed to use Drizzle directly. The `IQueryBuilder` abstraction is for simple CRUD; complex analytics queries need raw Drizzle.

**Pattern:**
```typescript
// src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts
import { getDrizzleInstance } from '@/Shared/Infrastructure/Database/Adapters/Drizzle/config'
import { usageRecords } from '@/Shared/Infrastructure/Database/Adapters/Drizzle/schema'
import { sql, and, gte, lte, eq } from 'drizzle-orm'

async queryDailyCostByOrg(orgId: string, range: DateRange): Promise<readonly DailyCostBucket[]> {
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
    .where(
      and(
        eq(usageRecords.org_id, orgId),
        gte(usageRecords.occurred_at, range.startDate),
        lte(usageRecords.occurred_at, range.endDate),
      )
    )
    .groupBy(sql`DATE(${usageRecords.occurred_at})`)
    .orderBy(sql`DATE(${usageRecords.occurred_at})`)
  return rows
}
```

**Warning signs:** Runtime error "groupBy is not a function on IQueryBuilder"; or queries returning unordered/ungrouped results.

### Pitfall 7: credit_cost Stored as TEXT Decimal String

**What goes wrong:** `usage_records.credit_cost` is stored as `TEXT` (not `REAL`/`NUMERIC`). SQL `SUM(credit_cost)` on a text column returns 0 or garbage. SQLite has no DECIMAL type — this was a deliberate precision choice (avoiding float rounding).

**How to avoid:** All aggregate queries on `credit_cost` must use `CAST(credit_cost AS REAL)` or `CAST(credit_cost AS NUMERIC)`. This is shown in the Drizzle example above. The pattern is identical to how `creditAccounts.balance` (also TEXT) must be handled.

---

## Code Examples

### SyncCursorRepository

```typescript
// src/Modules/Dashboard/Infrastructure/Repositories/DrizzleSyncCursorRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ISyncCursorRepository, SyncCursor } from '../../Application/Ports/ISyncCursorRepository'

export class DrizzleSyncCursorRepository implements ISyncCursorRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async get(cursorType: string): Promise<SyncCursor | null> {
    const row = await this.db.table('sync_cursors').where('cursor_type', '=', cursorType).first()
    if (!row) return null
    return {
      cursorType: row.cursor_type as string,
      lastSyncedAt: row.last_synced_at as string | null,
      lastBifrostLogId: row.last_bifrost_log_id as string | null,
    }
  }

  async advance(cursorType: string, update: { lastSyncedAt: string; lastBifrostLogId?: string }): Promise<void> {
    const existing = await this.get(cursorType)
    if (existing) {
      await this.db.table('sync_cursors')
        .where('cursor_type', '=', cursorType)
        .update({ last_synced_at: update.lastSyncedAt, last_bifrost_log_id: update.lastBifrostLogId ?? null, updated_at: new Date().toISOString() })
    } else {
      await this.db.table('sync_cursors').insert({
        id: crypto.randomUUID(),
        cursor_type: cursorType,
        last_synced_at: update.lastSyncedAt,
        last_bifrost_log_id: update.lastBifrostLogId ?? null,
        updated_at: new Date().toISOString(),
      })
    }
  }
}
```

### ApiKeyRepository Extension

```typescript
// Add to src/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository.ts
async findByBifrostVirtualKeyId(bifrostVirtualKeyId: string): Promise<ApiKey | null> {
  const row = await this.db.table('api_keys')
    .where('bifrost_virtual_key_id', '=', bifrostVirtualKeyId)
    .first()
  return row ? ApiKey.fromDatabase(row) : null
}
```

### Quarantine Log Helper

```typescript
// Inside BifrostSyncService
private async quarantineLog(log: LogEntry, reason: string): Promise<void> {
  try {
    await this.db.table('quarantined_logs').insert({
      id: crypto.randomUUID(),
      bifrost_log_id: log.logId ?? `${log.timestamp}:${log.keyId}`,
      reason,
      raw_data: JSON.stringify(log),
      created_at: new Date().toISOString(),
    })
  } catch {
    // Quarantine failure must not crash the sync
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Real-time Bifrost query per chart | Local SQLite reads (5-50ms) | Phase 9 decision | 10–100x faster dashboard loads |
| No sync infrastructure | BifrostSyncService + cursor | Phase 9 | Enables DASHBOARD-01 through DASHBOARD-05 |
| usage_records empty (schema only) | Populated by sync job | Phase 9 | Schema already deployed; data population is the new work |

**Deprecated/outdated:**
- Direct `IUsageAggregator.getLogs()` calls for dashboard chart data: acceptable before Phase 9; replaced by `IUsageRepository` reads after Phase 9

---

## Open Questions

1. **Empty keyIds array behavior in BifrostGatewayAdapter**
   - What we know: `UsageAggregator.getLogs([])` returns `[]` early. `BifrostGatewayAdapter.getUsageLogs([], ...)` passes `virtual_key_ids=` (empty string) to Bifrost.
   - What's unclear: Does Bifrost treat `virtual_key_ids=` (empty) as "no filter" (return all logs) or "filter by empty list" (return nothing)?
   - Recommendation: Test with an integration test against a real or mocked Bifrost. If empty means "no filter," the sync service can pass `[]`. If empty means "nothing," the sync service must first query all active `bifrost_virtual_key_id` values from `api_keys` and pass them.

2. **`LogEntry.logId` extension**
   - What we know: `BifrostLogEntry.id` exists. `LogEntry` doesn't expose it. `bifrost_log_id` UNIQUE constraint needs a stable value.
   - What's unclear: Is there a policy concern about extending the `ILLMGatewayClient` types?
   - Recommendation: Add optional `logId?: string` to `LogEntry` in `types.ts` and populate it in `BifrostGatewayAdapter`. This is a non-breaking additive change.

3. **Container key for `IDatabaseAccess`**
   - What we know: `bootstrap.ts` builds `DatabaseAccessBuilder` but registers it via `setCurrentDatabaseAccess`. The container key used by ServiceProviders is not confirmed in this research.
   - Recommendation: Inspect `FoundationServiceProvider.ts` before writing `DashboardServiceProvider` registration. The key is likely `'database'` or `'databaseAccess'` — confirm before coding.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun runtime | setInterval scheduler | ✓ | 1.3.10 | — |
| SQLite (via Bun) | usage_records reads/writes | ✓ | bundled with Bun | — |
| `database/database.sqlite` | Drizzle DB file | ✓ | exists | — |
| Bifrost API | BifrostSyncService.sync() | unknown (runtime) | — | stale data served from empty table |

**Missing dependencies with no fallback:** None identified.

**Missing dependencies with fallback:** Bifrost API unavailability → sync fails → dashboard serves stale data (empty on first boot). This is the designed failure mode per success criterion 4.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun test + vitest compatible (`describe`, `it`, `expect`, `beforeEach`) |
| Config file | None — `bun test src tests/Unit packages` |
| Quick run command | `bun test src/Modules/Dashboard/__tests__/ --timeout 10000` |
| Full suite command | `bun test src tests/Unit packages` |

### Phase Requirements → Test Map

Phase 9 is an infrastructure phase. Requirements map to success criteria:

| Success Criterion | Behavior | Test Type | Automated Command | File Exists? |
|-------------------|----------|-----------|-------------------|-------------|
| SC-1: usage_records schema correct | Table has all required columns including new ones | Migration smoke test | `bun test src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` | ❌ Wave 0 |
| SC-2: BifrostSyncService fetches and upserts on schedule | Cursor read → getLogs → upsert → cursor advance | Unit | `bun test src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` | ❌ Wave 0 |
| SC-2: Incremental fetch (cursor used) | Second sync only fetches new logs | Unit | Same file | ❌ Wave 0 |
| SC-2: Quarantine for unresolvable key | Log with unknown virtual_key_id goes to quarantined_logs | Unit | Same file | ❌ Wave 0 |
| SC-3: Chart query returns in <100ms | IUsageRepository.queryDailyCostByOrg with indexed query | Performance (manual) | `bun test src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` | ❌ Wave 0 |
| SC-4: Sync failure logged, no crash | syncService.sync() throws; server continues | Unit | Same BifrostSyncService.test.ts | ❌ Wave 0 |
| SC-4: Empty table graceful | queryDailyCostByOrg returns [] on empty table | Unit | DrizzleUsageRepository.test.ts | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `bun test src/Modules/Dashboard/__tests__/ --timeout 10000`
- **Per wave merge:** `bun test src tests/Unit packages`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` — covers SC-2, SC-4
- [ ] `src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` — covers SC-3, SC-4 (empty table)
- [ ] `src/Modules/Dashboard/__tests__/DrizzleSyncCursorRepository.test.ts` — covers cursor advance/read
- [ ] `src/Modules/ApiKey/__tests__/ApiKeyRepository.findByBifrostVirtualKeyId.test.ts` — covers new method

---

## Sources

### Primary (HIGH confidence)

- `/Users/carl/Dev/CMG/Draupnir/src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` — confirmed `usage_records` and `sync_cursors` tables, existing columns, indexes
- `/Users/carl/Dev/CMG/Draupnir/database/migrations/2026_04_09_000003_create_usage_records_table.ts` — confirmed deployed migration; `provider`, `latency_ms`, `status` absent
- `/Users/carl/Dev/CMG/Draupnir/database/migrations/2026_04_09_000004_create_sync_cursors_table.ts` — confirmed `sync_cursors` deployed
- `/Users/carl/Dev/CMG/Draupnir/packages/bifrost-sdk/src/BifrostClient.ts` — confirmed `getLogs(query)` API; `start_time`, `virtual_key_ids` params
- `/Users/carl/Dev/CMG/Draupnir/packages/bifrost-sdk/src/types.ts` — confirmed `BifrostLogEntry.id`, `virtual_key_id` fields (snake_case)
- `/Users/carl/Dev/CMG/Draupnir/src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.ts` — confirmed `keyId = entry.virtual_key_id ?? ''`; `LogEntry` drops `id`
- `/Users/carl/Dev/CMG/Draupnir/src/Foundation/Infrastructure/Services/LLMGateway/types.ts` — confirmed `LogEntry` interface has no `id` / `logId` field
- `/Users/carl/Dev/CMG/Draupnir/src/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository.ts` — confirmed `findByBifrostVirtualKeyId` does not exist yet
- `/Users/carl/Dev/CMG/Draupnir/src/bootstrap.ts` — confirmed timer placement point (after `core.bootstrap()`)
- `/Users/carl/Dev/CMG/Draupnir/src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts` — confirmed existing DI pattern
- `/Users/carl/Dev/CMG/Draupnir/src/Modules/Credit/Infrastructure/Repositories/CreditAccountRepository.ts` — confirmed `IDatabaseAccess` repository pattern to follow
- `.planning/research/ARCHITECTURE.md` — prior v1.2 research; cursor-based sync architecture decision
- `.planning/research/PITFALLS.md` — prior pitfall research

### Secondary (MEDIUM confidence)

- Bun 1.3.10 runtime documentation — `setInterval`, `AbortSignal.timeout`, `crypto.randomUUID()` all confirmed available
- Drizzle ORM raw SQL via `sql\`\`` template tag — established pattern in drizzle-orm for GROUP BY on SQLite

---

## Metadata

**Confidence breakdown:**
- Schema/migration status: HIGH — direct file inspection
- BifrostSyncService design: HIGH — grounded in adapter code, existing patterns
- IUsageRepository aggregate queries: HIGH — Drizzle sql`` tag pattern is standard
- Empty keyIds behavior: LOW — untested assumption; must be verified with integration test
- LogEntry.id gap: HIGH — confirmed by reading BifrostGatewayAdapter line 145

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable domain; Bifrost API changes are the main invalidation risk)
