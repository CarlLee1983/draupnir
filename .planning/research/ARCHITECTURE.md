# Architecture Research

**Domain:** Dashboard Analytics — Data Freshness Architecture
**Researched:** 2026-04-11
**Confidence:** HIGH

## Decision Context

The question is whether to query Bifrost logs on every page load (real-time) or to
pre-aggregate into local SQLite tables and sync periodically (cached aggregation).

**Verdict: Cached Aggregation is the right choice for v1.2, starting immediately.**

The schema already has `usage_records`, `sync_cursors`, `pricing_rules`, and
`quarantined_logs` tables in `schema.ts`. This is not a new direction — it is the
direction the codebase already committed to. Real-time querying is the fallback, not
the design target.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     Inertia Page Request                       │
│  (Dashboard controller — GET /dashboard, /dashboard/analytics) │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│               Application Layer (Dashboard Module)            │
│  GetDashboardSummaryService  │  GetUsageChartService           │
│  + new: GetCostTrendsService │  GetModelComparisonService      │
└───────────┬────────────────────────────────────┬─────────────┘
            │                                    │
            ▼                                    ▼
┌───────────────────────┐          ┌─────────────────────────────┐
│  IUsageAggregator     │          │  IUsageRepository (new)      │
│  (today: calls        │          │  Reads pre-aggregated rows   │
│   Bifrost on request) │          │  from local SQLite           │
└───────────┬───────────┘          └──────────────┬──────────────┘
            │ (migration path)                     │ (target path)
            │                                      ▼
            │                        ┌─────────────────────────┐
            │                        │  usage_records (SQLite) │
            │                        │  usage_daily_agg        │
            │                        │  sync_cursors           │
            │                        └─────────────────────────┘
            │                                      ▲
            ▼                                      │ sync
┌───────────────────────┐          ┌───────────────┴──────────────┐
│  ILLMGatewayClient    │          │  BifrostSyncService (new)     │
│  .getUsageLogs()      │──────────│  Reads Bifrost logs           │
│  .getUsageStats()     │          │  Writes to usage_records      │
└───────────────────────┘          │  Updates sync_cursors         │
            │                      │  Runs on: cron or Bun.serve   │
            ▼                      │  startup hook                 │
┌───────────────────────┐          └──────────────────────────────┘
│  Bifrost Gateway API  │
│  GET /api/logs        │
│  GET /api/logs/stats  │
└───────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `BifrostSyncService` | Fetch new Bifrost logs since last cursor; write to `usage_records`; update `sync_cursors` | New infra service in `Dashboard/Infrastructure/Services/` |
| `IUsageRepository` | Read pre-aggregated usage data for dashboard queries; keyed by org, key, time range, model, provider | New port + Drizzle implementation |
| `UsageDailyAggregator` | Roll up `usage_records` rows into `usage_daily_agg` (optional, add if queries become slow) | Optional optimization; skip in v1.2 |
| `SyncCursorRepository` | Read/write `sync_cursors` row per cursor type | Thin Drizzle repo, already has schema |
| `GetCostTrendsService` | Query `IUsageRepository` for time-series cost data by day/week | New application service |
| `GetModelComparisonService` | Query `IUsageRepository` grouped by model + provider | New application service |
| `DashboardSyncJob` | Scheduler that calls `BifrostSyncService` on an interval | Bun `setInterval` in bootstrap or a minimal cron |

---

## Recommended Project Structure

```
src/Modules/Dashboard/
├── Application/
│   ├── DTOs/
│   │   ├── DashboardDTO.ts           # existing — extend for trends/comparison
│   │   └── AnalyticsDTO.ts           # new: CostTrendResponse, ModelComparisonResponse
│   ├── Ports/
│   │   ├── IUsageAggregator.ts       # existing — keep for live fallback
│   │   └── IUsageRepository.ts       # new: local-read port
│   └── Services/
│       ├── GetDashboardSummaryService.ts  # existing
│       ├── GetUsageChartService.ts        # existing — refactor to use IUsageRepository
│       ├── GetCostTrendsService.ts        # new
│       └── GetModelComparisonService.ts   # new
└── Infrastructure/
    ├── Providers/
    │   └── DashboardServiceProvider.ts    # existing — register new services
    ├── Repositories/
    │   └── DrizzleUsageRepository.ts      # new: implements IUsageRepository
    └── Services/
        ├── UsageAggregator.ts             # existing — keep as live fallback
        └── BifrostSyncService.ts          # new: cursor-based sync

src/Shared/Infrastructure/Database/Adapters/Drizzle/
└── schema.ts                              # existing — already has usage_records, sync_cursors
```

### Structure Rationale

- **Ports stay in Application:** `IUsageRepository` is an application port (domain query), not
  an infrastructure detail. This matches the existing `IUsageAggregator` placement.
- **Drizzle repository in Infrastructure:** Implementation detail; only registered via DI.
- **BifrostSyncService in Infrastructure:** It talks to two external/infra concerns (Bifrost API
  and local DB). Application layer never imports it directly.
- **No new top-level module:** Dashboard analytics is a feature of the existing Dashboard module,
  not a bounded context of its own.

---

## Architectural Patterns

### Pattern 1: Cursor-Based Incremental Sync

**What:** Persist the last-synced Bifrost log timestamp (and optionally the last log ID) in
`sync_cursors`. Each sync pass fetches only logs newer than the cursor, appends to
`usage_records`, then advances the cursor. Never re-fetch the full history.

**When to use:** Always. Full re-fetch is O(total logs), cursor sync is O(new logs since
last run). With BifrostClient's default 30s timeout and 3 retries, a full re-fetch will
time out the moment history grows beyond ~2,000 rows.

**Trade-offs:**
- Pro: Bounded per-sync latency; safe to run every 5–15 minutes.
- Pro: Idempotent if `bifrost_log_id` has a UNIQUE constraint (already in schema).
- Con: If Bifrost logs can be back-filled (delayed writes), a pure timestamp cursor misses
  them. Mitigate with a small lookback window (re-fetch last 30 minutes on each sync).

**Example:**
```typescript
// BifrostSyncService.ts (Infrastructure)
async sync(): Promise<SyncResult> {
  const cursor = await this.cursorRepo.get('bifrost_logs')
  const since = cursor?.lastSyncedAt ?? new Date(0).toISOString()

  const response = await this.gatewayClient.getUsageLogs([], {
    startTime: since,
    limit: 500,
  })

  const newRecords = response.filter(
    (log) => log.timestamp > (cursor?.lastBifrostLogId ?? '')
  )

  await this.usageRepo.insertMany(newRecords)
  await this.cursorRepo.advance('bifrost_logs', {
    lastSyncedAt: new Date().toISOString(),
    lastBifrostLogId: newRecords.at(-1)?.id ?? cursor?.lastBifrostLogId,
  })

  return { synced: newRecords.length }
}
```

### Pattern 2: IUsageRepository as the Dashboard's Read Model

**What:** Define `IUsageRepository` as a port in the Application layer. The port exposes
query methods shaped for dashboard use cases (by org, by key, by model, time-bucketed).
The Drizzle implementation queries `usage_records` directly. `IUsageAggregator` (live
Bifrost queries) stays registered for API-layer endpoints that need real-time numbers.

**When to use:** All new dashboard page services (cost trends, model comparison, multi-key
comparison) use `IUsageRepository`. Existing `GetUsageChartService` migrates to it once
sync is proven. Leave `IUsageAggregator` for live-data API endpoints only.

**Trade-offs:**
- Pro: Dashboard pages load from local SQLite — sub-10ms vs 2-5s Bifrost call.
- Pro: Complex GROUP BY queries (by day × model × provider) are SQL, not in-memory aggregation.
- Pro: Matches existing repository pattern exactly; DI wiring is identical.
- Con: Data is 5–15 minutes stale. Acceptable for a cost trends chart; not for a live
  request counter.

**Example:**
```typescript
// IUsageRepository.ts (Application/Ports)
export interface IUsageRepository {
  queryByOrg(orgId: string, range: DateRange): Promise<readonly UsageRecord[]>
  queryByKey(keyId: string, range: DateRange): Promise<readonly UsageRecord[]>
  queryDailyCostByOrg(orgId: string, range: DateRange): Promise<readonly DailyCostBucket[]>
  queryModelBreakdown(orgId: string, range: DateRange): Promise<readonly ModelUsageBucket[]>
}
```

### Pattern 3: Bun setInterval Sync Scheduler

**What:** Register a `setInterval` in `bootstrap.ts` (or the application's `boot()` lifecycle)
that calls `BifrostSyncService.sync()` every 5–15 minutes. No external cron daemon, no
message queue, no worker threads. Bun's event loop handles it.

**When to use:** For Draupnir's current scale. A dedicated cron or worker becomes worthwhile
only if sync duration routinely exceeds 60 seconds (which requires >500 new logs per 5
minutes, i.e., 100 requests/minute through Bifrost).

**Trade-offs:**
- Pro: Zero new dependencies. Matches "no new framework dependencies" constraint.
- Pro: The sync runs in the same process — shares the DI container and Drizzle connection.
- Pro: Easy to test by calling `BifrostSyncService.sync()` directly.
- Con: If the server restarts, there is a gap until the next interval fires. The cursor
  architecture guarantees no data loss — it just syncs on the next wake.
- Con: Not distributed-safe. If two Draupnir instances run simultaneously, both try to sync.
  Mitigate with a `sync_cursors` UPDATE ... WHERE condition as a soft lock.

```typescript
// bootstrap.ts
const syncService = container.make('bifrostSyncService') as BifrostSyncService
const SYNC_INTERVAL_MS = Number(process.env.BIFROST_SYNC_INTERVAL_MS ?? 5 * 60 * 1000)

setInterval(async () => {
  try {
    await syncService.sync()
  } catch (err) {
    // log, do not crash the server
  }
}, SYNC_INTERVAL_MS)
```

---

## Data Flow

### Dashboard Page Load (Target State)

```
Browser → GET /dashboard/analytics
    ↓
Inertia Controller (DashboardController)
    ↓
GetCostTrendsService.execute({ orgId, range })
    ↓
IUsageRepository.queryDailyCostByOrg(orgId, range)
    ↓
DrizzleUsageRepository → SELECT + GROUP BY on usage_records (SQLite, local)
    ↓
DailyCostBucket[] returned in < 10ms
    ↓
Inertia.render('Dashboard/Analytics', { trends: [...] })
```

### Background Sync Flow

```
setInterval fires (every 5-15 min)
    ↓
BifrostSyncService.sync()
    ↓
SyncCursorRepository.get('bifrost_logs') → last cursor timestamp
    ↓
ILLMGatewayClient.getUsageLogs([], { startTime: cursor, limit: 500 })
    ↓
BifrostGatewayAdapter → GET /api/logs?start_time=...&limit=500
    ↓
Bifrost API responds (500ms - 3s depending on result set)
    ↓
Filter: skip rows already in usage_records (UNIQUE on bifrost_log_id)
    ↓
DrizzleUsageRepository.insertMany(newRows)
    ↓
SyncCursorRepository.advance({ lastSyncedAt: now })
```

### Key Data Flows

1. **Initial backfill:** First sync has no cursor — fetches with limit=500 repeatedly until
   no more results. The `quarantined_logs` table catches any row where `virtual_key_id` cannot
   be resolved to a known `api_key_id`.
2. **Org-scoped reads:** `usage_records.org_id` is indexed. Dashboard queries add `WHERE org_id = ?`
   — no cross-tenant leakage possible at the SQL layer.
3. **Real-time API endpoints:** `GetUsageChartService` continues to call `IUsageAggregator`
   (live Bifrost) for API consumers that explicitly need sub-minute freshness. The two paths
   coexist without conflict.

---

## Tradeoff Quantification

### Latency

| Approach | Page load latency | Source |
|----------|-------------------|--------|
| Real-time (Bifrost) | 500ms – 5,000ms | BifrostClient: 30s timeout, 3 retries, network RTT |
| Cached (SQLite local) | 5ms – 50ms | Drizzle + SQLite on same host, indexed query |
| Delta | 10x – 100x slower for real-time | Measured from config defaults |

The BifrostClient defaults expose the real-time path's worst case: 30s timeout × 3 retries
= up to 90s before the page fails. For a dashboard with 4 chart widgets, that is 4 parallel
calls, each with that failure envelope.

### Freshness

| Approach | Data age | Acceptable for |
|----------|----------|----------------|
| Real-time | 0s (live) | Live request counter, budget alerts |
| 5-min sync | < 5 min | Cost trends (hourly/daily buckets), model comparison |
| 15-min sync | < 15 min | Weekly cost summary, historical charts |

Cost trend charts are inherently backward-looking (last 7/30 days). A 5-minute lag on a
7-day chart is invisible to users. The only genuinely real-time need is a "requests in the
last minute" counter — keep that on the live path via `IUsageAggregator`.

### Complexity

| Concern | Real-time | Cached |
|---------|-----------|--------|
| New code | 0 lines | ~300 lines (BifrostSyncService + DrizzleUsageRepository) |
| Schema migration | None | `usage_daily_agg` table (optional); `usage_records` already exists |
| Failure modes | Bifrost API down = dashboard down | Bifrost API down = dashboard shows stale data |
| Multi-key GROUP BY | In-memory after fetch | SQL GROUP BY, indexed |
| Time-series queries | Fetch all logs, aggregate in TS | SELECT + GROUP BY timestamp bucket |

---

## Recommended Schema for Cached Aggregation

The existing schema already has the right tables. No new tables are required for v1.2.
The existing `usage_records` table covers all fields needed:

```
usage_records
  id              TEXT  PK
  bifrost_log_id  TEXT  UNIQUE NOT NULL   -- deduplication key
  api_key_id      TEXT  NOT NULL          -- joins to api_keys for org_id
  org_id          TEXT  NOT NULL          -- indexed, for org-scoped queries
  model           TEXT  NOT NULL          -- for model comparison
  input_tokens    INT
  output_tokens   INT
  credit_cost     TEXT                    -- stored as string (decimal precision)
  occurred_at     TEXT  NOT NULL          -- ISO 8601, used in time-range queries
  created_at      TEXT  NOT NULL

sync_cursors
  id              TEXT  PK
  cursor_type     TEXT  UNIQUE NOT NULL   -- e.g. 'bifrost_logs'
  last_synced_at  TEXT
  last_bifrost_log_id TEXT
  updated_at      TEXT  NOT NULL
```

What is missing from `usage_records` for dashboard analytics:
- `provider` column — needed for model × provider breakdown. Add in a Drizzle migration.
- `latency_ms` column — needed for latency trend charts. Optional for v1.2.
- `status` column — needed for error-rate charts. Optional for v1.2.

**Minimum addition for v1.2:**
```typescript
// Add to usage_records in schema.ts migration
provider: text('provider'),          // nullable for backwards compat
latency_ms: integer('latency_ms'),   // nullable
status: text('status'),              // 'success' | 'error' | null
```

**Optional `usage_daily_agg` table (add only if query latency becomes a problem):**
```
usage_daily_agg
  id            TEXT  PK
  org_id        TEXT  NOT NULL
  api_key_id    TEXT  NOT NULL
  model         TEXT  NOT NULL
  provider      TEXT  NOT NULL
  date          TEXT  NOT NULL   -- YYYY-MM-DD
  total_requests INT
  total_tokens   INT
  total_cost     TEXT           -- decimal string
  PRIMARY KEY (org_id, api_key_id, model, provider, date)
```

Skip this table in v1.2. Raw `usage_records` with a composite index on
`(org_id, occurred_at)` handles up to ~500k rows without needing pre-aggregation.

---

## Integration Points with Existing DI Pattern

### Registering the Sync Service

```typescript
// DashboardServiceProvider.ts (Infrastructure/Providers)
override register(container: IContainer): void {
  // existing registrations...

  container.singleton('syncCursorRepository', (c: IContainer) => {
    // follows exact same pattern as other Drizzle repos
    const db = c.make('drizzleDb')
    return new DrizzleSyncCursorRepository(db)
  })

  container.singleton('drizzleUsageRepository', (c: IContainer) => {
    const db = c.make('drizzleDb')
    return new DrizzleUsageRepository(db)
  })

  container.singleton('bifrostSyncService', (c: IContainer) => {
    return new BifrostSyncService(
      c.make('llmGatewayClient') as ILLMGatewayClient,
      c.make('drizzleUsageRepository') as IUsageRepository,
      c.make('syncCursorRepository') as ISyncCursorRepository,
    )
  })

  container.bind('getCostTrendsService', (c: IContainer) => {
    return new GetCostTrendsService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('drizzleUsageRepository') as IUsageRepository,
    )
  })
}
```

The `setInterval` scheduler is wired in `bootstrap.ts` after providers are booted,
not inside a ServiceProvider. ServiceProviders are for binding, not for starting timers.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-50k logs total | Raw `usage_records` + indexed queries. No aggregation table needed. |
| 50k-500k logs | Add `(org_id, occurred_at)` composite index. Dashboard queries stay fast. |
| 500k+ logs | Add `usage_daily_agg` pre-aggregation table. Roll up nightly. |
| Multiple Draupnir instances | Add advisory lock on `sync_cursors` UPDATE (SQLite WAL handles this; PostgreSQL uses `SELECT FOR UPDATE SKIP LOCKED`). |

### Scaling Priorities

1. **First bottleneck:** Sync job fetches too many logs per pass. Fix: lower limit to 200,
   run every 2 minutes. Alternatively, paginate with multiple requests per sync cycle.
2. **Second bottleneck:** `usage_records` table grows large, `SELECT GROUP BY` slows down.
   Fix: add `usage_daily_agg` materialized table, re-roll nightly.

---

## Anti-Patterns

### Anti-Pattern 1: Real-Time Bifrost Query per Dashboard Widget

**What people do:** Call `ILLMGatewayClient.getUsageLogs()` inside each dashboard service
(`GetCostTrendsService`, `GetModelComparisonService`, etc.) on every page render.

**Why it's wrong:** Four dashboard widgets = four Bifrost API calls per page load. With
BifrostClient's 30s timeout and retry logic, a degraded Bifrost instance holds the user's
browser for up to 90 seconds per call. Bifrost is the source of truth, not a low-latency
query engine. The `/api/logs` endpoint is designed for audit and debugging, not for OLAP.
Additionally, the `BifrostLogsQuery.limit` field has no documented upper bound — large time
windows silently return incomplete data.

**Do this instead:** Sync logs to local `usage_records` via `BifrostSyncService`. Dashboard
services read from SQLite. Accept 5-minute staleness.

### Anti-Pattern 2: Polling Bifrost on a Short Interval Without a Cursor

**What people do:** Run `getUsageLogs({ startTime: sevenDaysAgo })` every 5 minutes to
"refresh" the cache.

**Why it's wrong:** Fetches the same 7 days of logs on every cycle. Costs N × log_count
reads on Bifrost. Bifrost may rate-limit repeated full-history fetches. The UNIQUE constraint
on `bifrost_log_id` prevents duplicates locally, but the network cost is still paid.

**Do this instead:** Use `sync_cursors.last_synced_at` to fetch only logs since the last
run. Include a 30-minute lookback to catch any delayed-write logs.

### Anti-Pattern 3: Embedding Provider-Specific Aggregation Logic in Application Services

**What people do:** Import `BifrostLogsQuery` or Bifrost-specific fields into
`GetCostTrendsService` or `GetModelComparisonService` to build filter parameters.

**Why it's wrong:** Violates the gateway abstraction completed in v1.0. Post-v1.0, no
file under `src/Modules/` may import a Bifrost-specific symbol. The application layer
must use `IUsageRepository` (local reads) or `ILLMGatewayClient` (gateway-neutral interface),
never Bifrost types.

**Do this instead:** `IUsageRepository` exposes query methods shaped for dashboard use
cases. All Bifrost-specific query construction stays inside `BifrostSyncService` (Infrastructure).

### Anti-Pattern 4: Putting the Sync Timer in a ServiceProvider

**What people do:** Call `setInterval(syncService.sync, interval)` inside
`DashboardServiceProvider.boot()`.

**Why it's wrong:** ServiceProvider `boot()` is called during container initialization,
before the HTTP server is ready. Side effects like timers belong in `bootstrap.ts` after
the full application lifecycle is initialized.

**Do this instead:** Register `bifrostSyncService` as a singleton in the ServiceProvider.
Retrieve it in `bootstrap.ts` after `app.boot()` and start the interval there.

---

## Sources

- Schema analysis: `/Users/carl/Dev/CMG/Draupnir/src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts`
  (existing `usage_records`, `sync_cursors`, `quarantined_logs` tables confirm cached path was already planned)
- BifrostClient defaults: `packages/bifrost-sdk/src/BifrostClientConfig.ts` (30s timeout, 3 retries)
- Existing IUsageAggregator port: `src/Modules/Dashboard/Application/Ports/IUsageAggregator.ts`
- Existing DashboardServiceProvider pattern: `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts`
- ILLMGatewayClient interface: `src/Foundation/Infrastructure/Services/LLMGateway/ILLMGatewayClient.ts`
- Design decisions (Credit sync strategy): `docs/draupnir/DESIGN_DECISIONS.md` § 3.1 — "從 Bifrost 同步用量 → 折算 Credit; 異步 + 定時同步"
- PROJECT.md constraints: no new framework dependencies; all routes/schemas unchanged

---
*Architecture research for: Draupnir v1.2 Dashboard Analytics — Data Freshness Decision*
*Researched: 2026-04-11*
