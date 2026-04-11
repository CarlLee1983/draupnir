# Phase 11: Resilience & UX Polish - Research

**Researched:** 2026-04-12
**Domain:** Backend resilience (Promise.race timeout), Drizzle schema migration, React UX (staleness label)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** `lastSyncedAt` bundled into existing KPI summary response. `DashboardController.kpiSummary` reads from `ISyncCursorRepository` and adds `lastSyncedAt: string | null` to the response payload. No new endpoint.
- **D-02:** Staleness label lives in the header area, next to the 7d | 30d | 90d time window selector — same row, right-aligned muted text.
- **D-03:** Label always shows, even immediately after sync ("just now" / "< 1 min ago"). No hide-on-fresh behaviour.
- **D-04:** Timeout enforced inside `BifrostSyncService.sync()` using `Promise.race` against a 30-second timeout promise.
- **D-05:** On timeout or any unhandled error: log the failure, do NOT advance the cursor, return `{ synced: 0, quarantined: 0 }`.
- **D-06:** No error banner for sync failures. User-facing signal is the staleness label aging only.
- **D-07:** Progressive staleness colouring: ≤10 min = muted grey; 10–30 min = amber badge; >30 min = red badge.
- **D-08:** Always show the label — never hide when fresh.
- **Composite index:** Add `(org_id, occurred_at)` index to `usage_records` via a new Drizzle migration.
- **Sync timeout:** 30 seconds, `Promise.race` inside `BifrostSyncService.sync()`.
- **Cursor NOT advanced on timeout** — `lastSyncedAt` reflects last *successful* sync only.

### Claude's Discretion

- Exact migration filename (follow project convention).
- Exact label wording: "just now", "< 1 min ago", "N min ago", "N hrs ago" — consistent with existing UI copy style.
- Loading placeholder: "Syncing…" text while KPI is in flight.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.

</user_constraints>

---

## Summary

Phase 11 is a focused hardening phase with four discrete changes: (1) a `Promise.race` timeout wrapper in `BifrostSyncService.sync()`, (2) surfacing `lastSyncedAt` from the KPI summary endpoint, (3) a staleness label component in the dashboard header, and (4) a composite index migration on `usage_records(org_id, occurred_at)`.

All four changes are independently testable and have no dependencies on each other at runtime. The backend changes are small surgical edits to existing files. The frontend change is additive: a new component (or inline JSX) added to the header row next to `<WindowSelector />`. The migration follows the established `@gravito/atlas` `Schema.table()` pattern already used in `2026_04_11_000002_add_columns_to_usage_records.ts`.

**Primary recommendation:** Implement in dependency order — migration first (no code dependency), then sync timeout (self-contained), then KPI response extension (backend), then staleness label (frontend consuming the new field).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@gravito/atlas` | project-installed | Schema migrations (`Schema.table`, `Schema.create`) | All existing migrations use this — same pattern |
| `drizzle-orm` | ^0.45.1 | Query builder for `DrizzleUsageRepository` | Already the ORM for all `usage_records` queries |
| `date-fns` or native `Date` | native | Staleness delta calculation (`Date.now() - lastSyncedAt`) | No new dependency needed; simple arithmetic |
| `Badge` (shadcn/ui) | project-installed | Amber/red staleness badge | Already imported in `Member/Dashboard/Index.tsx` (line 7) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest `vi.useFakeTimers()` | ^4.0.18 | Testing `Promise.race` timeout | For BifrostSyncService timeout test only |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `Promise.race` with `setTimeout` | `AbortController` + `signal` | AbortController is cleaner for fetch cancellation, but `BifrostSyncService.sync()` doesn't use `fetch` directly — `Promise.race` is simpler here |
| Native `Date` arithmetic for staleness | `date-fns` `formatDistanceToNow` | `date-fns` produces natural language ("3 minutes ago") but is an additional import; native arithmetic is sufficient given the project's zero-new-deps constraint |

**Installation:** No new packages needed. All required libraries are already project dependencies.

---

## Architecture Patterns

### Recommended Project Structure

No new directories or files are created except one migration file and one test file. All changes are edits to existing files plus additions in their natural locations:

```
database/migrations/
└── 2026_04_12_000001_add_composite_index_to_usage_records.ts  [NEW]

src/Modules/Dashboard/
├── Application/
│   ├── DTOs/DashboardDTO.ts                    [EDIT: extend KpiSummaryResponse]
│   └── Services/GetKpiSummaryService.ts        [EDIT: accept + return lastSyncedAt]
├── Infrastructure/
│   ├── Providers/DashboardServiceProvider.ts   [EDIT: inject ISyncCursorRepository into kpiSummaryService]
│   └── Services/BifrostSyncService.ts          [EDIT: Promise.race timeout wrapper]
├── Presentation/
│   └── Controllers/DashboardController.ts      [EDIT: inject ISyncCursorRepository, pass to service]
└── __tests__/
    ├── BifrostSyncService.test.ts              [EDIT: add timeout test cases]
    └── GetKpiSummaryService.test.ts            [EDIT: add lastSyncedAt assertion]

resources/js/Pages/Member/Dashboard/
└── Index.tsx                                   [EDIT: KpiPayload type + StalenessLabel component]
```

### Pattern 1: Promise.race Timeout in BifrostSyncService

**What:** Wrap the entire sync body in `Promise.race` between the sync logic and a timeout promise. On timeout, catch the rejection, log it, and return `{ synced: 0, quarantined: 0 }` without advancing the cursor.

**When to use:** Any async operation where hanging indefinitely is worse than returning stale/empty data.

**Example:**
```typescript
// Source: direct codebase inspection — existing BifrostSyncService.ts pattern
async sync(): Promise<SyncResult> {
  const timeoutMs = 30_000

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('BifrostSyncService: sync timed out after 30s')), timeoutMs)
  )

  try {
    return await Promise.race([this.syncInternal(), timeoutPromise])
  } catch (error: unknown) {
    console.error('[BifrostSyncService] Sync failed:', error)
    return { synced: 0, quarantined: 0 }
  }
}

private async syncInternal(): Promise<SyncResult> {
  // ... existing sync() body moved here, verbatim
}
```

**Key constraint (D-05):** The cursor `advance()` call is inside `syncInternal()`. Because the outer `catch` intercepts the timeout before `advance()` is reached, `lastSyncedAt` is naturally preserved from the last successful sync. No conditional logic needed.

### Pattern 2: Extending KpiSummaryResponse with lastSyncedAt

**What:** The KPI service needs access to `ISyncCursorRepository` to read `lastSyncedAt`. The controller already has the cursor repo available via `DashboardServiceProvider` (registered as `syncCursorRepository`). Two valid approaches:

**Approach A — inject into service (preferred):** `GetKpiSummaryService` receives `ISyncCursorRepository` as a constructor parameter, calls `cursorRepo.get('bifrost_logs')` and includes `lastSyncedAt` in the response.

**Approach B — read in controller:** `DashboardController.kpiSummary` reads from cursor repo directly after calling `kpiSummaryService.execute()`, merges `lastSyncedAt` into the response before `ctx.json(...)`.

The CONTEXT.md D-01 says "DashboardController.kpiSummary reads from ISyncCursorRepository" — this supports Approach B as the literal interpretation. However, Approach A is cleaner for testability. Both are consistent with D-01. **Use Approach A** (inject into service) so the controller stays thin and the service is self-contained and testable without a controller stub.

**DTO extension:**
```typescript
// Source: src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts (existing)
export interface KpiSummaryResponse {
  success: boolean
  message: string
  data?: {
    usage: UsageStats
    lastSyncedAt: string | null   // ADD THIS
  }
  error?: string
}
```

### Pattern 3: Staleness Label in Index.tsx Header

**What:** A new functional component `StalenessLabel` that accepts `lastSyncedAt: string | null` and `isLoading: boolean`, renders:
- `"Syncing…"` when `isLoading === true`
- `"just now"` / `"< 1 min ago"` / `"N min ago"` / `"N hrs ago"` based on delta
- Badge variant: no badge (plain muted text) ≤10 min, amber `<Badge variant="secondary">` 10–30 min, red `<Badge variant="destructive">` >30 min

**Placement:** Header row, right column alongside `<WindowSelector />`. The existing layout is `flex flex-col gap-3 md:flex-row md:items-end md:justify-between`. The right column currently contains only `<WindowSelector />`. Wrap both in a `<div className="flex flex-col items-end gap-1">` or `<div className="flex items-center gap-3">` depending on visual alignment.

**State threading:** `KpiPayload` in `Index.tsx` must be extended to include `lastSyncedAt: string | null`. The `bundle.kpi` object already flows from the fetch into render — just add the field to the type and pass it through.

**Example component:**
```typescript
// Source: direct analysis of Index.tsx lines 129-139 and Badge usage line 7
function StalenessLabel({
  lastSyncedAt,
  isLoading,
}: {
  lastSyncedAt: string | null
  isLoading: boolean
}) {
  if (isLoading) {
    return <span className="text-xs text-muted-foreground">Syncing…</span>
  }
  if (!lastSyncedAt) {
    return <span className="text-xs text-muted-foreground">Not yet synced</span>
  }

  const deltaMins = Math.floor((Date.now() - new Date(lastSyncedAt).getTime()) / 60_000)
  const label = formatStaleness(deltaMins)

  if (deltaMins > 30) {
    return <Badge variant="destructive" className="text-xs">{label}</Badge>
  }
  if (deltaMins > 10) {
    return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">{label}</Badge>
  }
  return <span className="text-xs text-muted-foreground">{label}</span>
}

function formatStaleness(deltaMins: number): string {
  if (deltaMins < 1) return 'just now'
  if (deltaMins === 1) return '< 1 min ago'
  if (deltaMins < 60) return `${deltaMins} min ago`
  const hrs = Math.floor(deltaMins / 60)
  return hrs === 1 ? '1 hr ago' : `${hrs} hrs ago`
}
```

### Pattern 4: Composite Index Migration

**What:** New migration file adding `(org_id, occurred_at)` index to `usage_records`.

**Migration filename convention (from directory listing):** `YYYY_MM_DD_NNNNNN_descriptive_name.ts` — use `2026_04_12_000001_add_composite_index_to_usage_records.ts`.

**Example:**
```typescript
// Source: database/migrations/2026_04_11_000002_add_columns_to_usage_records.ts (existing pattern)
import { type Migration, Schema } from '@gravito/atlas'

export default class AddCompositeIndexToUsageRecords implements Migration {
  async up(): Promise<void> {
    await Schema.table('usage_records', (table) => {
      table.index(['org_id', 'occurred_at'])
    })
  }

  async down(): Promise<void> {
    // SQLite does not support DROP INDEX via Schema helper without table recreation.
    // Intentionally a no-op — the index is additive and harmless if left.
  }
}
```

**Note on `down()`:** The existing `2026_04_11_000002` migration explicitly documents that SQLite does not support `DROP COLUMN`. The same caveat applies to `DROP INDEX` — the down migration is a safe no-op.

### Anti-Patterns to Avoid

- **Advancing cursor on timeout:** The timeout throw must propagate past the `cursorRepo.advance()` call — never catch-and-continue inside `syncInternal`.
- **Hiding the staleness label when `lastSyncedAt === null`:** D-03 says always show the label. Show "Not yet synced" or "Syncing…" when null rather than rendering nothing.
- **Adding `lastSyncedAt` to the Inertia SSR props:** `MemberDashboardPage.ts` already does not SSR chart data (Phase 10 D-05). The KPI summary is fetched client-side — `lastSyncedAt` arrives with the KPI JSON. Do not add it to the SSR bundle.
- **Amber badge via `variant="warning"`:** `Badge` in this project uses shadcn/ui which does not have a `warning` variant out of the box. Use `variant="secondary"` with explicit Tailwind class overrides (`bg-amber-100 text-amber-800 border-amber-200`) rather than inventing a new variant.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Staleness time delta | Custom `humanizeDate()` utility | Inline arithmetic (`Date.now() - new Date(lastSyncedAt).getTime()`) | Only 3 thresholds; no library needed |
| Migration runner | Custom SQL migration | `@gravito/atlas` `Schema.table()` | Established project pattern; handles SQLite quirks |
| Timeout detection in tests | Manual `setTimeout` in test body | `vi.useFakeTimers()` + `vi.advanceTimersByTimeAsync(30001)` | Keeps tests fast and deterministic |

**Key insight:** Every component of this phase reuses existing primitives. No new architectural pattern is introduced — this is surgical hardening of existing code.

---

## Common Pitfalls

### Pitfall 1: Cursor Advanced Before Timeout Fires

**What goes wrong:** If the `Promise.race` timeout promise and the `syncInternal` body are not structured correctly, the internal body may advance the cursor before the timeout exception propagates, resulting in `lastSyncedAt` being updated even on a timed-out sync.

**Why it happens:** The timeout and the sync body both run; the sync body calls `cursorRepo.advance()` partway through; then the timeout fires. If the timeout is a rejection and the caller catches it, but `advance()` was already called, the cursor is stale.

**How to avoid:** `cursorRepo.advance()` must only be called at the very end of `syncInternal()` after all records have been processed. The timeout rejection interrupts `syncInternal()` at the `await` boundary — any code after the first `await` that hasn't run yet will never run. In the current `sync()` body, `advance()` is the last `await` call, so this is safe as long as the refactor keeps that ordering.

**Warning signs:** Test where `Promise.race` fires at 30s still shows `getCursorState()?.lastSyncedAt` updated.

### Pitfall 2: `KpiPayload` Frontend Type Not Extended

**What goes wrong:** The backend now returns `lastSyncedAt` in `data`, but `KpiPayload` in `Index.tsx` (line 36-38) only declares `usage`. The field is silently ignored by TypeScript and `StalenessLabel` always receives `undefined`.

**Why it happens:** TypeScript structural typing: extra fields in a JSON response are not errors. The field exists at runtime but is typed away.

**How to avoid:** Update `KpiPayload` in `Index.tsx` to include `lastSyncedAt: string | null`. Also update the `DashboardBundle` type if `kpi` is stored there. Check that the `fetchJson<KpiPayload>()` call propagates it correctly.

**Warning signs:** `StalenessLabel` receives `undefined` for `lastSyncedAt` even when the API returns the field.

### Pitfall 3: Badge Amber Variant Not Available

**What goes wrong:** `<Badge variant="amber">` does not exist in this project's shadcn/ui setup. Using it compiles fine (TypeScript may not strictly type variant strings) but renders with the default/fallback style — no amber colour.

**Why it happens:** shadcn/ui `Badge` only ships `default`, `secondary`, `destructive`, and `outline` variants out of the box.

**How to avoid:** Use `<Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">` for the amber state. Confirm by checking `resources/js/components/ui/badge.tsx` for available variants before writing the component.

**Warning signs:** 10–30 min staleness badge renders with same colour as the `secondary` badge (grey).

### Pitfall 4: Migration Index Name Collision

**What goes wrong:** SQLite silently accepts duplicate index names within a migration run if the index already exists (behaviour depends on driver). In CI, if `migrate:fresh` is run, the `CREATE INDEX` from the migration will succeed. But if migrations are applied incrementally to an existing DB with a manually-created index of the same name, it may fail.

**How to avoid:** Name the index explicitly in the migration: `idx_usage_records_org_occurred`. Verify this name does not already exist by checking existing migration files and `schema.ts`. The current `schema.ts` only has `idx_usage_records_org_id` and `idx_usage_records_bifrost_log_id` — the composite index name is new and safe.

**Warning signs:** `bun migrate` fails with "index already exists" on a non-fresh database.

### Pitfall 5: `formatStaleness` Off-by-One for "< 1 min ago"

**What goes wrong:** `deltaMins` is `Math.floor(...)` — a delta of 59 seconds returns `deltaMins = 0`. The label for `deltaMins === 0` should be "just now" not "< 1 min ago". The "< 1 min ago" bucket is for deltas ≥ 60s and < 120s (`deltaMins === 1`).

**Why it happens:** Natural language "less than 1 minute" means between 1 and 60 seconds — the `Math.floor(59s / 60000ms)` = 0 case is "just now", and `Math.floor(61s / 60000ms)` = 1 is "< 1 min ago" only if we mean "it's been 1 minute". The example in the CONTEXT.md lists both "just now" and "< 1 min ago" — treat them as two distinct labels to avoid confusion.

**How to avoid:** Use `deltaMins < 1` → "just now", `deltaMins === 1` → "1 min ago" (or "< 2 min ago"), and keep "< 1 min ago" for the sub-60-second case if desired (use `deltaMs < 60_000` check before `Math.floor`).

---

## Code Examples

### BifrostSyncService Timeout Refactor

```typescript
// Source: src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts
// Move current sync() body to syncInternal(), wrap with Promise.race in sync()

async sync(): Promise<SyncResult> {
  const TIMEOUT_MS = 30_000
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('[BifrostSyncService] sync timed out after 30s')),
      TIMEOUT_MS,
    ),
  )

  try {
    return await Promise.race([this.syncInternal(), timeoutPromise])
  } catch (error: unknown) {
    console.error('[BifrostSyncService] Sync failed:', error)
    return { synced: 0, quarantined: 0 }
  }
}
```

### Testing BifrostSyncService Timeout (Vitest)

```typescript
// Source: src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts (existing test pattern)
it('does not advance cursor when sync times out', async () => {
  vi.useFakeTimers()
  class SlowGateway extends MockGatewayClient {
    override async getUsageLogs(): Promise<readonly LogEntry[]> {
      await new Promise((resolve) => setTimeout(resolve, 60_000)) // never resolves within timeout
      return []
    }
  }
  service = new BifrostSyncService(new SlowGateway(), usageRepo, cursorRepo, apiKeyRepo, db)
  const syncPromise = service.sync()
  await vi.advanceTimersByTimeAsync(30_001)
  const result = await syncPromise
  expect(result).toEqual({ synced: 0, quarantined: 0 })
  expect(getCursorState()).toBeNull()  // cursor NOT advanced
  vi.useRealTimers()
})
```

### ISyncCursorRepository Injection into GetKpiSummaryService

```typescript
// Source: existing service pattern in GetKpiSummaryService.ts
// Add ISyncCursorRepository to constructor
constructor(
  private readonly apiKeyRepository: IApiKeyRepository,
  private readonly orgAuth: OrgAuthorizationHelper,
  private readonly usageRepository: IUsageRepository,
  private readonly cursorRepo: ISyncCursorRepository,  // ADD
) {}

// In execute(), after successful auth + stats query:
const cursor = await this.cursorRepo.get('bifrost_logs')
return {
  success: true,
  message: 'Query successful',
  data: {
    usage,
    lastSyncedAt: cursor?.lastSyncedAt ?? null,
  },
}
```

### DashboardServiceProvider — inject cursorRepo into kpiSummaryService

```typescript
// Source: src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts
container.bind('getKpiSummaryService', (c: IContainer) => {
  return new GetKpiSummaryService(
    c.make('apiKeyRepository') as IApiKeyRepository,
    c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    c.make('drizzleUsageRepository') as IUsageRepository,
    c.make('syncCursorRepository') as ISyncCursorRepository,  // ADD
  )
})
```

### @gravito/atlas Migration — Composite Index

```typescript
// Source: database/migrations/2026_04_11_000002_add_columns_to_usage_records.ts (pattern)
import { type Migration, Schema } from '@gravito/atlas'

export default class AddCompositeIndexToUsageRecords implements Migration {
  async up(): Promise<void> {
    await Schema.table('usage_records', (table) => {
      table.index(['org_id', 'occurred_at'])
    })
  }

  async down(): Promise<void> {
    // SQLite does not support DROP INDEX via Schema helper without full table recreation.
    // No-op intentionally.
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No sync timeout | `Promise.race` 30s timeout | Phase 11 | Prevents dashboard reads from hanging if Bifrost is slow |
| KPI endpoint has no freshness signal | `lastSyncedAt` in KPI response | Phase 11 | Frontend can display when data was last refreshed |
| No index on `(org_id, occurred_at)` | Composite index in migration | Phase 11 | 90-day window queries avoid full-table-scan on `usage_records` |

---

## Open Questions

1. **Does `@gravito/atlas` `Schema.table()` support named composite indexes?**
   - What we know: existing migration `create_usage_records_table.ts` uses `table.index(['org_id'])` (single-column, no explicit name). `add_columns_to_usage_records.ts` only adds columns, not indexes.
   - What's unclear: Whether `table.index(['org_id', 'occurred_at'])` syntax is supported and whether an explicit name parameter is available (e.g., `table.index(['org_id', 'occurred_at'], 'idx_usage_records_org_occurred')`).
   - Recommendation: Check `@gravito/atlas` docs or source before writing the migration. If named parameter is unavailable, the auto-generated name is acceptable — just document it in the migration comment.

2. **Amber Badge Tailwind classes: will `bg-amber-100 text-amber-800` be present in the compiled CSS?**
   - What we know: Tailwind is configured via `postcss.config.js`. If these classes are not used elsewhere in the project, they may be purged from the production build.
   - What's unclear: Whether the Tailwind `content` config glob covers `resources/js/**` (it should).
   - Recommendation: Use the Tailwind classes directly in the component — Tailwind's content scanning should pick them up. If purging is a concern, add them to a `safelist` in `tailwind.config.*`.

---

## Environment Availability

Step 2.6: SKIPPED (no external tool dependencies; phase is code and migration changes only)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | `vitest.config.*` (project root) |
| Quick run command | `bun vitest run src/Modules/Dashboard/__tests__/` |
| Full suite command | `bun run verify` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DASHBOARD-01 | KPI response includes `lastSyncedAt` | unit | `bun vitest run src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` | ✅ (edit existing) |
| DASHBOARD-01 | `lastSyncedAt` is null when cursor not yet set | unit | same file | ✅ (new test case) |
| Timeout-D-04 | Sync returns `{synced:0,quarantined:0}` after 30s | unit | `bun vitest run src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` | ✅ (edit existing) |
| Timeout-D-05 | Cursor NOT advanced on timeout | unit | same file | ✅ (new test case) |
| Staleness-D-07 | `StalenessLabel` renders grey text ≤10 min | unit | frontend component test (if applicable) | ❌ Wave 0 gap (optional — UI is low risk) |
| Empty table | No JS errors when `usage_records` empty | smoke | `bun vitest run src/Pages/__tests__/Member/MemberDashboardPage.test.ts` | ✅ (verify existing passes) |

### Sampling Rate

- **Per task commit:** `bun vitest run src/Modules/Dashboard/__tests__/`
- **Per wave merge:** `bun run verify`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `StalenessLabel` unit test — low priority; logic is simple enough to verify manually. If added: `resources/js/Pages/Member/Dashboard/__tests__/StalenessLabel.test.tsx`

*(Existing test infrastructure covers all backend phase requirements)*

---

## Project Constraints (from CLAUDE.md)

| Directive | Source | Impact on Phase 11 |
|-----------|--------|-------------------|
| Zero new dependencies | `docs/draupnir/README.md` (referenced in STATE.md) | Confirmed: no new npm packages; `Promise.race`, `Date`, `Badge` are all existing |
| Routes unchanged | `docs/draupnir/README.md` | Confirmed: no new routes; `lastSyncedAt` piggybacks on existing `/kpi-summary` endpoint |
| Immutable patterns | `~/.claude/rules/coding-style.md` | `StalenessLabel` must not mutate props; `KpiSummaryResponse` extension must use new interface, not mutation |
| Zod validation for all user input | `~/.claude/rules/coding-style.md` | `lastSyncedAt` is an ISO string from our own DB — no user input. No Zod needed here. |
| Small files (<800 lines) | `~/.claude/rules/coding-style.md` | `Index.tsx` is currently ~425 lines; adding `StalenessLabel` will stay well under 800 |
| No console.log | `~/.claude/rules/hooks.md` | `BifrostSyncService` uses `console.error` for failures — acceptable for error paths; do not add `console.log` |
| TDD: write tests first | `~/.claude/rules/testing.md` | BifrostSyncService timeout tests and KPI `lastSyncedAt` tests must be written before implementation |
| i18n via Message Service | `~/.claude/rules/agents.md` (gravito-ddd) | Dashboard does not currently use the i18n message service pattern. The staleness label uses hardcoded English strings consistent with the existing `EmptyStateCard` and other UI strings in `Index.tsx`. No i18n change needed for this phase. |

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts` — full sync body and existing error handling pattern
- Direct inspection of `src/Modules/Dashboard/Application/Ports/ISyncCursorRepository.ts` — `lastSyncedAt: string | null` confirmed in `SyncCursor`
- Direct inspection of `src/Modules/Dashboard/Application/Services/GetKpiSummaryService.ts` — existing constructor signature and return shape
- Direct inspection of `resources/js/Pages/Member/Dashboard/Index.tsx` — header layout (line 129–139), `Badge` import (line 7), `KpiPayload` type (lines 31–38), `loading` state (line 63)
- Direct inspection of `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` — confirmed existing indexes: `idx_usage_records_org_id`, `idx_usage_records_bifrost_log_id`; confirmed no `(org_id, occurred_at)` index exists
- Direct inspection of `database/migrations/` — confirmed `@gravito/atlas` `Schema.table()` pattern and migration filename convention
- Direct inspection of `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts` — `syncCursorRepository` already registered as singleton; injection into `getKpiSummaryService` is additive
- Direct inspection of `src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` — existing test patterns for adding timeout tests

### Secondary (MEDIUM confidence)
- `database/migrations/2026_04_09_000003_create_usage_records_table.ts` — `table.index(['org_id'])` syntax (infers composite index syntax `table.index(['org_id', 'occurred_at'])` should work, but @gravito/atlas named-index parameter is unverified)
- `.planning/research/PITFALLS.md` — Performance Traps section (missing index as full-table-scan risk)

### Tertiary (LOW confidence)
- Amber badge Tailwind purging behaviour — inferred from Tailwind defaults; not verified against project's specific `tailwind.config.*` content globs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in existing codebase
- Architecture patterns: HIGH — all patterns directly observed in existing code
- Pitfalls: HIGH — derived from direct code inspection; one LOW item (badge purging)
- Migration syntax: MEDIUM — `table.index(array)` single-column form verified; composite form is a reasonable inference

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable domain; no external API changes expected)
