# Phase 18: Uniform Background Jobs — Research

**Researched:** 2026-04-13
**Domain:** Scheduler abstraction (Port/Adapter) + retry semantics + ServiceProvider lifecycle extension
**Confidence:** HIGH (all findings verified against installed croner 10.0.1 types, existing source files, and Phase 17 canonical patterns)

## Summary

Phase 18 is a **pure internal architecture consolidation**. There are exactly two scheduling sites in the codebase today — `src/bootstrap.ts:80-87` (BifrostSync `setInterval`) and `src/Modules/Reports/Application/Services/ScheduleReportService.ts` (direct `new Cron()` with a `Map<string, Cron>`) — and both must route through a single `IScheduler` port. croner 10.0.1 is already installed and has the exact API surface needed (named jobs via `scheduledJobs`, `.stop()`, `timezone`, `protect`, `unref`, `catch`, `trigger()` for manual run, `isBusy()` for overlap detection). No new dependencies required.

The three non-trivial design decisions land on the planner's desk: (1) the precise TypeScript shape of `JobSpec` (settled below — small, non-fluent, matches D-09/D-14); (2) whether `registerJobs` is baked into `ModuleServiceProvider` or lives on a side-interface `IJobRegistrar` (recommendation: **side-interface** to keep `ModuleServiceProvider` stable and avoid forcing empty overrides across 16 existing providers); (3) how retry backoff coexists with the next natural cron tick (recommendation: **background `setTimeout` chain scoped to the attempt, reset on next scheduled tick** — aligns with D-11 "不阻塞下一 tick").

**Primary recommendation:** Implement in this order — (a) define `IScheduler` + `JobSpec` + `IJobRegistrar` in `src/Foundation/Infrastructure/Ports/Scheduler/`, (b) implement `CronerScheduler` in `src/Foundation/Infrastructure/Services/Scheduler/` wrapping croner with retry/backoff/logging, (c) bind as `'scheduler'` singleton in `FoundationServiceProvider`, (d) add `IJobRegistrar` check + forwarding to `GravitoServiceProviderAdapter`, (e) migrate BifrostSync (bootstrap.ts) via a new `DashboardServiceProvider.registerJobs()`, (f) migrate ScheduleReportService to delegate to `IScheduler` (public API unchanged, Controller wiring unchanged), (g) move `ReportsServiceProvider.boot()` content into `registerJobs()`, (h) ship a `FakeScheduler` test double in `tests/Unit/Scheduler/` and unit-test retry/backoff with `bun:test` fake timers.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Task runner selection**
- **D-01:** Create `IScheduler` port (Foundation layer) so the implementation can be swapped without touching call sites.
- **D-02:** First implementation is `CronerScheduler`, internally reusing the existing `croner` (`Cron`) dependency; preserve croner's timezone parsing (ScheduleReportService depends on it).
- **D-03:** Do **not** introduce `Bun.cron` (API incomplete — lacks full per-job timezone support). REQUIREMENTS.md JOBS-01 "Bun.cron or similar" means **unified abstraction**, not a forced Bun.cron implementation.
- **D-04:** Do not remove the `croner` dependency. It is the right underlying library; the abstraction layer only isolates it.

**Job registration pattern**
- **D-05:** Each module needing jobs adds `registerJobs(scheduler: IScheduler)` to its `ServiceProvider`.
- **D-06:** `bootstrap.ts` iterates providers and calls `registerJobs(scheduler)` after `core.bootstrap()` and after `registerRoutes()`.
- **D-07:** No central `JobRegistry` file (breaks module boundaries); no config-driven jobs (ScheduleReportService needs DB-driven dynamic schedule/unschedule, config cannot express that).
- **D-08:** `IServiceProvider` / `GravitoServiceProviderAdapter` gain an **optional** `registerJobs` surface; providers that don't implement it are skipped.

**Retry & failure recovery (JOBS-04)**
- **D-09:** `IScheduler.schedule()` accepts `{ maxRetries: number, backoffMs: number }` options (both optional; absent ⇒ no retry).
- **D-10:** Failure = handler throws exception OR returned Promise rejects.
- **D-11:** Exponential backoff `backoffMs * 2^attempt`; retries run in the background (do NOT block the next tick).
- **D-12:** Exhausted retries ⇒ `console.error` structured log (`[Scheduler] Job '{name}' exhausted {N} retries:`). Do NOT emit webhook alert (avoid circular dep before Phase 19).
- **D-13:** No persistence; process restart drops in-flight retries. Next cron tick re-runs at-most-once (handler must be idempotent — both current handlers are).
- **D-14:** Every scheduled job has a unique `name` string for logging and retry tracking.

**Existing job migration**
- **D-15:** BifrostSync migration:
  ```ts
  scheduler.schedule(
    { name: 'bifrost-sync', cron: '*/5 * * * *', runOnInit: true, maxRetries: 2, backoffMs: 2000 },
    () => syncService.sync()
  )
  ```
- **D-16:** `BIFROST_SYNC_INTERVAL_MS` env var replaced by `BIFROST_SYNC_CRON` (cron expression); default `*/5 * * * *`. Deprecation documented in release notes (non-breaking — internal env only).
- **D-17:** `bootstrap.ts:80-87` `setInterval` fully removed; `bootstrap.ts:75-77` initial `syncService.sync()` replaced by `runOnInit: true`.
- **D-18:** `ScheduleReportService` becomes a thin wrapper over `CronerScheduler`: remove internal `Map<string, Cron>`, hold an `IScheduler` and use dynamic schedule/unschedule.
- **D-19:** `ReportsServiceProvider.boot()`'s bootstrap-schedules call migrates to the new `registerJobs()` hook.
- **D-20:** Migration scope is ONLY those two sites (grep-confirmed). Any Alerts-module scheduling stays untouched until Phase 19.

**IScheduler minimum surface**
- `schedule(spec: JobSpec, handler: () => Promise<void>): void` — static cron job
- `unschedule(name: string): void` — dynamic removal (ScheduleReportService needs it)
- `has(name: string): boolean` — query
- Optional `JobSpec.runOnInit: boolean` — immediate first run (BifrostSync needs it)

### Claude's Discretion
- File-placement path for `IScheduler` (recommendation below: `src/Foundation/Infrastructure/Ports/Scheduler/IScheduler.ts`)
- Test strategy (FakeScheduler, manual-trigger interface) — design deferred to planner
- `BIFROST_SYNC_CRON` env parsing location (`config/index.ts` vs direct `process.env`) — recommendation below: `config/app.ts`
- Whether `runOnInit` failure counts toward retry budget / blocks subsequent ticks — recommendation below: **independent accounting, never blocks cron**
- `ReportsServiceProvider.boot()` vs `registerJobs()` split — recommendation: move entire schedule bootstrap into `registerJobs()`, leave `boot()` empty (or drop it, since default no-op exists)

### Deferred Ideas (OUT OF SCOPE)
- Dynamic schedule richer API (batch reschedule, diffing)
- Formal test-strategy doc (FakeScheduler, manual trigger) — planner designs
- Alert webhook on job failure — Phase 19 adds this
- Redis / BullMQ persistence — v2+
- Distributed task queuing / multi-instance coordination — v2+
- Unifying Alerts-module cooldown/throttle timers — Phase 19 scope
- Runtime gateway switching — explicitly out of REQUIREMENTS.md scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **JOBS-01** | All cron/scheduled tasks use a unified task runner (Bun.cron or similar) | §IScheduler Design, §Standard Stack (croner 10.0.1 retained as engine); CONTEXT.md D-01..D-04 |
| **JOBS-02** | `ScheduleReportService` migrates out of `boot()` into the unified manager | §ScheduleReportService Refactor Scope, §ServiceProvider Lifecycle Integration; CONTEXT.md D-18..D-19 |
| **JOBS-03** | Remove scattered timing logic from `boot()`; centralise job definitions | §ServiceProvider Lifecycle Integration (new `registerJobs` hook), §Bootstrap Integration Points; CONTEXT.md D-05..D-06, D-17 |
| **JOBS-04** | Task runner supports per-job retry & failure recovery | §Retry + Exponential Backoff Implementation Strategy; CONTEXT.md D-09..D-14 |
</phase_requirements>

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **Language:** 繁體中文 for commit messages, documentation, and inline commentary where natural. Code identifiers remain English (existing convention).
- **Immutability:** Value objects and aggregates must not mutate. `JobSpec` should be a `readonly` object; never mutate after registration (re-register instead).
- **File organisation:** Many small files. Target ≤ 400 lines per file, ≤ 50 lines per function.
- **Error handling:** Handlers that throw must be caught; the server MUST NOT crash on scheduler-handler failure (matches bootstrap.ts:76, 84 existing invariant).
- **DDD boundaries:** Port lives in Foundation layer; adapter in Infrastructure. (Phase 17 IQueryBuilder / IDatabaseAccess pattern.)
- **No new runtime deps:** croner already installed. Do not add `p-retry`, `bottleneck`, or similar.
- **GSD workflow:** Implementation phase will be tracked via `/gsd:execute-phase`; no direct edits outside that flow.
- **Tests:** Framework is Bun's built-in test runner for unit/integration (`bun test`); coverage target ≥ 80%.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| croner | **10.0.1** (installed) | Cron pattern parsing + timezone-aware trigger | Already used by `ScheduleReportService`; no-deps, ships full TS types, handles `timezone`, named jobs (`scheduledJobs` registry), `unref`, `protect`, `catch`. Proven in production code. |
| @gravito/core | ^3.0.1 (installed) | ServiceProvider lifecycle, DI container | Existing framework; `registerJobs` plugs into `GravitoServiceProviderAdapter`. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bun:test | built-in (Bun 1.1+) | Test runner with `setSystemTime`, fake timers | Required for retry/backoff unit tests; tick manipulation without wall-clock waits |

**Version verification (2026-04-13):**
- `croner` 10.0.1 confirmed installed at `node_modules/croner/package.json` line 72. Current npm latest is 10.x (stable since 2025-Q4). **HIGH confidence** — types read directly from `node_modules/croner/dist/croner.d.ts`.
- bun:test `setSystemTime` documented at <https://bun.com/docs/guides/test/mock-clock>. **HIGH confidence**.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| croner (retained) | `Bun.cron` | Rejected per D-03: incomplete API (timezone gaps), locks us to Bun runtime inside business logic. |
| Raw `setInterval` | croner | Rejected: no cron expressions, no timezone, no manual-trigger hook (the very status quo this phase removes). |
| `node-cron` | croner | Rejected: equivalent capability, no reason to swap; croner is already installed. |
| `p-retry` | In-house retry loop | Rejected: adds a dependency for ~20 lines of logic; exponential `backoffMs * 2^attempt` is trivial. Aligns with "No new runtime deps". |
| Adding `registerJobs()` to `ModuleServiceProvider` base class | Side-interface `IJobRegistrar` (duck-typed) | **Side-interface chosen.** Forcing all 16 providers to override an empty method adds noise. `if ('registerJobs' in provider) provider.registerJobs(scheduler)` keeps the default path clean (matches D-08 "未實作的 provider 忽略"). |

**Installation:** None required — `croner` already in `dependencies`.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── Foundation/
│   └── Infrastructure/
│       ├── Ports/
│       │   └── Scheduler/
│       │       ├── IScheduler.ts         # port: interface + JobSpec type
│       │       └── IJobRegistrar.ts      # side-interface for ServiceProviders
│       └── Services/
│           └── Scheduler/
│               └── CronerScheduler.ts    # adapter
├── Shared/
│   └── Infrastructure/
│       └── Framework/
│           └── GravitoServiceProviderAdapter.ts  # patched to forward registerJobs
└── Modules/
    ├── Dashboard/
    │   └── Infrastructure/
    │       └── Providers/
    │           └── DashboardServiceProvider.ts   # gains registerJobs (BifrostSync)
    └── Reports/
        ├── Application/
        │   └── Services/
        │       └── ScheduleReportService.ts      # now thin wrapper over IScheduler
        └── Infrastructure/
            └── Providers/
                └── ReportsServiceProvider.ts     # boot() schedules → registerJobs()

tests/
└── Unit/
    └── Scheduler/
        ├── CronerScheduler.test.ts               # retry, backoff, runOnInit semantics
        ├── FakeScheduler.ts                      # test double
        └── FakeScheduler.test.ts                 # sanity
```

### Pattern 1: Port + Adapter (Phase 17 convention)

**What:** Foundation layer exports the interface; Infrastructure layer exports the concrete. Consumers (bootstrap, services) type against the port, never the adapter.

**When to use:** Any cross-cutting infrastructure concern where the implementation may evolve (IMailer, IQueryBuilder, IDatabaseAccess all follow this).

**Example:**
```typescript
// src/Foundation/Infrastructure/Ports/Scheduler/IScheduler.ts
export interface JobSpec {
  readonly name: string
  readonly cron: string
  readonly timezone?: string
  readonly runOnInit?: boolean
  readonly maxRetries?: number
  readonly backoffMs?: number
}

export interface IScheduler {
  schedule(spec: JobSpec, handler: () => Promise<void>): void
  unschedule(name: string): void
  has(name: string): boolean
}
```

```typescript
// src/Foundation/Infrastructure/Ports/Scheduler/IJobRegistrar.ts
export interface IJobRegistrar {
  registerJobs(scheduler: IScheduler): void | Promise<void>
}
```

### Pattern 2: Named Cron Registry (croner built-in)

croner exposes `scheduledJobs: Cron<any>[]` globally. **Do NOT rely on it** — it's a process-global array that could collide across test runs. `CronerScheduler` must hold its own `Map<string, Cron>` (same shape as today's `ScheduleReportService.jobs`) keyed by `JobSpec.name`, so `unschedule()` / `has()` work against our own registry and tests get full isolation.

### Pattern 3: Optional Lifecycle Hook via Duck-Typing

Rather than forcing every `ModuleServiceProvider` to add an empty `registerJobs`, treat it as a structural contract. In `bootstrap.ts` after `core.bootstrap()`:

```typescript
// Pseudo — planner will formalise
const scheduler = core.container.make('scheduler') as IScheduler
for (const adapter of registeredAdapters) {
  const inner: unknown = adapter.getModuleProvider()  // adapter exposes inner
  if (inner && typeof (inner as IJobRegistrar).registerJobs === 'function') {
    await (inner as IJobRegistrar).registerJobs(scheduler)
  }
}
```

**Implementation note:** `GravitoServiceProviderAdapter` currently holds `private moduleProvider: ModuleServiceProvider`. Add a public accessor (`getModuleProvider(): ModuleServiceProvider`) OR hold the adapter list ourselves during `core.register(...)` calls. The second is cleaner — modify `bootstrap.ts` to push each `moduleProvider` into a local `const jobRegistrars: ModuleServiceProvider[] = []` array alongside `core.register(...)`.

### Anti-Patterns to Avoid

- **Timer in `boot()`:** Forbidden (restated from existing code comment `bootstrap.ts:70`). `boot()` runs before DI is fully warm and couples schedule lifecycle to DI lifecycle in the wrong direction.
- **Mutating `JobSpec` after registration:** JobSpec is immutable; to "re-schedule" call `unschedule(name)` then `schedule(newSpec, handler)`.
- **Swallowing retry-exhaustion silently:** D-12 requires a structured `console.error`. Do not `catch(() => {})`.
- **Blocking the next cron tick on a retry:** D-11 requires background timing. Never `await` a retry chain inside the croner callback.
- **Using croner's `scheduledJobs` global:** Use our own `Map` to avoid cross-test pollution and to keep the registry adapter-scoped.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Parsing cron expressions | A regex or custom parser | `croner` `new Cron(pattern, ...)` | Handles seconds-part, 5/6/7-part auto-detection, timezone, DST, L/W/# syntax. Already installed. |
| Timezone-aware firing | Manual `Date` math + `setTimeout` | `CronOptions.timezone` | croner handles IANA zone names, DST transitions, offsets. |
| "Don't overlap runs" | A boolean flag + manual guard | `CronOptions.protect: true` | Built in — skips tick if previous run still in flight (`isBusy()`). BifrostSync already has 30s timeout; `protect` is belt-and-braces. |
| Catching handler errors inside cron | try/catch in every handler | `CronOptions.catch: (err, job) => { ... }` + our retry wrapper | croner's `catch` fires on handler rejection; we layer retry on top. |
| Allowing process to exit with scheduled jobs | Manual `process.on('exit')` cleanup | `CronOptions.unref: true` | Standard Node/Bun timer unref so `bun test` processes can exit without calling `.stop()`. |
| Unique job names across a process | Hand-rolled collision check | Our own `Map<string, Cron>` in `CronerScheduler` | Clear error message on duplicate, testable in isolation. |
| Manual "trigger now for testing" | Exposing cron internals | croner `cron.trigger(): Promise<void>` | Built-in manual-fire; useful for `runOnInit` implementation and for FakeScheduler. |

**Key insight:** croner is already a near-perfect wrapper around the low-level cron concept. Phase 18's value is NOT re-implementing any of this — it is adding **(a) a uniform entry point, (b) a retry policy, (c) a registration lifecycle**. Nothing else.

## Runtime State Inventory

> N/A — Phase 18 is a code-level refactor of in-memory schedulers. No databases, OS-registered timers, secrets, or installed packages carry the current "BifrostSync interval" or "ScheduleReportService.Cron" identities. **Verified by grep** (search pattern `setInterval|new Cron\(` under `src/`): only two occurrences — `bootstrap.ts:80` and `ScheduleReportService.ts:31`. No persistent queue, no OS scheduler, no external service holds job state. Process restart legitimately drops all in-flight retries (per D-13).

## IScheduler Design Deep Dive (Research Focus #1)

### Final `JobSpec` shape (proposed — planner may refine)

```typescript
// src/Foundation/Infrastructure/Ports/Scheduler/IScheduler.ts

export interface JobSpec {
  /** Unique identifier for logging / unschedule / duplicate detection. */
  readonly name: string

  /** Croner-compatible pattern ('*/5 * * * *', '0 9 * * MON', etc.). */
  readonly cron: string

  /** IANA timezone (e.g. 'Asia/Taipei'). Forwarded to croner. */
  readonly timezone?: string

  /** If true, run handler once synchronously-after-register on next event-loop tick. */
  readonly runOnInit?: boolean

  /** Retry budget per tick. 0 or undefined ⇒ no retries (bare handler only). */
  readonly maxRetries?: number

  /** Initial backoff in ms; delay = backoffMs * 2^attempt (attempt: 0..maxRetries-1). */
  readonly backoffMs?: number
}

export interface IScheduler {
  /** Register a recurring job. Throws if `spec.name` is already registered. */
  schedule(spec: JobSpec, handler: () => Promise<void>): void

  /** Remove a job. In-flight retries for that name are cancelled. No-op if not found. */
  unschedule(name: string): void

  /** Query. */
  has(name: string): boolean
}
```

### Trade-off: `schedule()` returns `void` vs returning a handle

| Option | Pro | Con | Recommendation |
|--------|-----|-----|----------------|
| Return `void` (current CONTEXT.md minimum surface) | Minimal API; matches D-18 minimum surface | Callers who want to query "is this job running?" must use `has(name)` | **Choose this.** Name-based API is sufficient; ScheduleReportService already tracks by ID externally. |
| Return `{ name, stop, trigger }` handle | Avoids name-string lookups; supports fluent chaining | Larger surface; inconsistent with ScheduleReportService's "look up by id" pattern | Reject for Phase 18; reopen if a future phase needs `trigger` for ops tooling. |

### Why no `pause/resume`, `list()`, or `stats()`

Per D-07, no central registry. ScheduleReportService already proxies `isScheduled(id)` via `has(name)`. No current code path pauses without removing. Stats belong to a future observability phase (and Phase 19's alert-on-failure will want richer signals). **Keep the port small.**

## Croner API Research (Research Focus #2)

**Source:** `node_modules/croner/dist/croner.d.ts` (croner 10.0.1, read directly).

APIs `CronerScheduler` will wrap:

| croner surface | Used for | Notes |
|---|---|---|
| `new Cron(pattern, options, callback)` | Create job | Pattern string (5/6/7-part), options object, callback. |
| `CronOptions.name` | Correlation | We still keep our own `Map`; croner's name gives log-friendly identity. |
| `CronOptions.timezone` | TZ-aware firing | Passes IANA string (`'Asia/Taipei'`); ScheduleReportService already uses this. |
| `CronOptions.protect: true` | Overlap prevention | Skips tick if previous still running. Belt-and-braces against long syncs. |
| `CronOptions.catch: (err, job) => void` | Error capture from callback | We set this to funnel into our retry logic (plus still wrap `try/catch` in the callback for async errors; croner's `catch` only fires for thrown sync errors + unhandled rejection — **verify in implementation via a targeted test**). |
| `CronOptions.unref: true` | Test-safe timers | Important so `bun test` doesn't hang. |
| `CronOptions.maxRuns` | Not used | Unbounded jobs. |
| `CronOptions.paused` | Not used | We unschedule instead. |
| `cron.stop()` | `unschedule()` backend | Permanent stop; resume won't work. Fine for our "remove" semantics. |
| `cron.isBusy()` | Overlap detection for retry logic | When backing off, check if a fresh cron tick already started a new run — then abandon retry. |
| `cron.trigger()` | Manual fire | Perfect for `runOnInit: true` — invoke `.trigger()` once on registration. Returns `Promise<void>`. |
| `cron.nextRun()` | Diagnostic logging | Useful in `console.error` retry-exhaustion message. |
| `scheduledJobs` (global array) | **Do NOT use** | Cross-test pollution risk. |

### Per-cron options not needed this phase

`startAt`, `stopAt`, `utcOffset`, `dayOffset`, `interval`, `mode`, `alternativeWeekdays`, `sloppyRanges`, `context`, `legacyMode` — none are required by BifrostSync or existing ScheduleReportService usage. Do not expose them through `JobSpec`. Re-open when a concrete requirement emerges.

## Retry + Exponential Backoff Implementation Strategy (Research Focus #3)

### Algorithm (D-09..D-13)

```typescript
// Pseudo — planner will formalise in CronerScheduler.ts

private createHandler(spec: JobSpec, userHandler: () => Promise<void>): () => Promise<void> {
  const { name, maxRetries = 0, backoffMs = 0 } = spec
  return async () => {
    let attempt = 0
    while (true) {
      try {
        await userHandler()
        return
      } catch (err) {
        if (attempt >= maxRetries) {
          console.error(
            `[Scheduler] Job '${name}' exhausted ${maxRetries} retries:`,
            err
          )
          return  // swallow — do not rethrow, croner would otherwise emit via `catch`
        }
        const delay = backoffMs * 2 ** attempt
        attempt++
        // Check for unschedule between retries (see cancellation below)
        if (!this.registry.has(name)) return
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, delay)
          this.pendingRetryTimers.get(name)?.add(timer)
        })
      }
    }
  }
}
```

### Key design decisions

1. **Retry counter scope = one tick.** Each cron firing creates a fresh attempt counter. Next tick starts at 0. Matches D-13's "at-most-once per tick" model.
2. **Background `setTimeout` chain.** `await new Promise(...setTimeout...)` runs inside the callback; but the croner callback has already returned from the `_trigger` perspective once `await` hits the microtask boundary. **Crucial:** croner's `protect: true` will skip the next tick if our callback promise is still pending. **Decision:** Use `protect: true` so a long retry chain cannot pile up. This means a retry storm can cause a missed tick — acceptable per D-13 (at-most-once + idempotent handlers).
3. **Retry cancellation on `unschedule()`.** `CronerScheduler` holds `pendingRetryTimers: Map<string, Set<NodeJS.Timeout>>`. On `unschedule(name)`: `job.stop()` + clear all timers in the set + delete from registry. The `!this.registry.has(name)` check inside the retry loop short-circuits after the current backoff wake-up.
4. **No abort signal on the handler itself.** BifrostSync already has an internal 30-second timeout via `Promise.race`. ScheduleReportService's handler has no timeout but is idempotent (per-schedule PDF regeneration). Adding an `AbortSignal` parameter to handlers is out of scope — reopen when a handler needs cooperative cancellation.
5. **No webhook on exhaustion (D-12).** Literal `console.error`. Phase 19 can add a failure event bus.

### Industry pattern comparison (not dependencies, just design reference)

- **`p-retry` pattern:** `retries`, `factor`, `minTimeout`, `maxTimeout`. We implement a subset: `maxRetries` (= `retries`), `backoffMs` (= `minTimeout`), `factor=2` hard-coded. No `maxTimeout` cap — acceptable for small `maxRetries` (D-15 uses `maxRetries: 2`, so worst-case delay is `backoffMs * 4`).
- **`bottleneck`:** Concurrency limits — not needed; croner is single-instance per job.
- **AWS SDK v3 standard retry:** `backoffMs * 2^attempt + jitter`. **Consider jitter?** Probably unnecessary for two in-process jobs with different cron schedules. Flag as LOW-priority future enhancement.

## ServiceProvider Lifecycle Integration (Research Focus #4)

### Current state

- `ModuleServiceProvider` (src/Shared/Infrastructure/IServiceProvider.ts) has `register(container)` abstract + `boot(context)` with default no-op.
- `GravitoServiceProviderAdapter` (src/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter.ts) holds `private moduleProvider` and bridges to gravito `ServiceProvider`'s `register`/`boot`.
- `bootstrap.ts` calls `core.register(createGravitoServiceProvider(new XxxProvider()))` — the `moduleProvider` reference is **lost** after wrapping, because the adapter swallows it into a `private` field.

### Recommended integration (planner to finalise)

**Option A (recommended): collect module providers alongside registration in bootstrap.ts**

```typescript
// bootstrap.ts — pseudo
const modules: ModuleServiceProvider[] = [
  new HealthServiceProvider(),
  new FoundationServiceProvider(),
  // ... all 16 providers
]
for (const m of modules) core.register(createGravitoServiceProvider(m))

await core.bootstrap()
// ... warmInertia, ensureCoreAppModules, registerRoutes ...

const scheduler = core.container.make('scheduler') as IScheduler
for (const m of modules) {
  if (isJobRegistrar(m)) await m.registerJobs(scheduler)
}
```

with type guard:

```typescript
function isJobRegistrar(x: unknown): x is IJobRegistrar {
  return typeof x === 'object' && x !== null && typeof (x as any).registerJobs === 'function'
}
```

**Pros:** Zero change to `IServiceProvider.ts` / `GravitoServiceProviderAdapter.ts`. Matches D-08 "optional interface". Keeps 14 unaffected providers clean.

**Option B: expose accessor on adapter**

Add `public getModuleProvider(): ModuleServiceProvider` to `GravitoServiceProviderAdapter`. Iterate `core.providers` (if exposed by PlanetCore) — but `PlanetCore` does not publicly expose its provider list, so this requires framework-level digging. **Reject.**

**Precise bootstrap.ts line ranges affected (current file):**
- Lines 44-60: provider registrations → refactor to collect into local `modules` array, still calling `core.register(createGravitoServiceProvider(m))` for each.
- Lines 68-88: delete entire `setInterval` block (D-17).
- Insert new block after line 67 (`await registerRoutes(core)`) and before line 90 (`core.registerGlobalErrorHandlers()`): scheduler resolution + `registerJobs` loop.

## BifrostSync `runOnInit` Error Semantics (Research Focus #5)

### Current behaviour (bootstrap.ts:75-77)

```typescript
syncService.sync().catch((err) => {
  console.error('[BifrostSync] Initial sync failed (non-fatal):', err)
})
```

Initial sync failure → logged, non-fatal, server continues. Note: `BifrostSyncService.sync()` itself already catches internal errors and returns `{ synced: 0, quarantined: 0, ... }` — so the outer `.catch` only fires on truly unexpected top-level throws.

### Recommendation

**`runOnInit` goes through the same retry pipeline.** When `IScheduler.schedule(spec, handler)` is called with `runOnInit: true`:

1. Register the recurring cron job (via `new Cron(...)`).
2. Call the **same retry-wrapped handler** once via `queueMicrotask()` or `setImmediate()` — NOT synchronously (must not block bootstrap).
3. If runOnInit fails and exhausts retries, log via the same `[Scheduler] Job '{name}' exhausted ...` path. The recurring job remains registered and fires normally at the next cron tick.

**Rationale:**
- Same retry semantics everywhere = predictable for JOBS-04.
- Does NOT block bootstrap — the scheduler returns from `.schedule()` immediately.
- The cron tick continues independently; if runOnInit is mid-retry when the cron tick fires, `protect: true` skips that tick (acceptable — sync is idempotent).
- No special-casing, no separate code path.

**Edge case:** BifrostSync `maxRetries: 2, backoffMs: 2000` ⇒ worst-case runOnInit retry chain = 2000 + 4000 = 6000ms. Next cron tick (`*/5 * * * *`) is 5 minutes away, so no collision. Safe.

## ScheduleReportService Refactor Scope (Research Focus #6)

### Before (current state — `ScheduleReportService.ts`, 60 lines)

- Holds `private jobs: Map<string, Cron>`.
- `schedule(scheduleId)` reads DB, calls `new Cron(...)`, stores in map.
- `stop(scheduleId)` calls `.stop()` on map entry, removes.
- `isScheduled(scheduleId)` checks map.
- `bootstrap()` loads all enabled DB schedules and calls `schedule(id)` for each.

### After (proposed)

```typescript
export class ScheduleReportService {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly pdfService: GeneratePdfService,
    private readonly emailService: SendReportEmailService,
    private readonly scheduler: IScheduler,   // NEW injection
  ) {}

  /** Called from ReportsServiceProvider.registerJobs(). */
  async bootstrap(): Promise<void> {
    const schedules = await this.reportRepository.findAllEnabled()
    for (const s of schedules) await this.schedule(s.id)
  }

  async schedule(scheduleId: string): Promise<void> {
    const schedule = await this.reportRepository.findById(scheduleId)
    if (!schedule || !schedule.enabled) return

    const jobName = this.jobName(scheduleId)
    if (this.scheduler.has(jobName)) this.scheduler.unschedule(jobName)

    this.scheduler.schedule(
      {
        name: jobName,
        cron: schedule.cronString,
        timezone: schedule.timezone,
        // No retries at the scheduler level — existing handler swallows errors
        // and logs; matches current behaviour. Planner may add maxRetries: 1 if desired.
      },
      async () => {
        console.log(`[Reports] Generating scheduled report for schedule ${scheduleId}`)
        const pdfBuffer = await this.pdfService.generate(schedule.orgId)
        await this.emailService.send(schedule.recipients, pdfBuffer, schedule.type)
        console.log(`[Reports] Successfully sent scheduled report for schedule ${scheduleId}`)
      }
    )
  }

  stop(scheduleId: string): void {
    this.scheduler.unschedule(this.jobName(scheduleId))
  }

  isScheduled(scheduleId: string): boolean {
    return this.scheduler.has(this.jobName(scheduleId))
  }

  private jobName(scheduleId: string): string {
    return `report:${scheduleId}`  // namespacing avoids collision with bifrost-sync or future jobs
  }
}
```

### Key decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **(a) Public API (called by `ReportController`)** | Unchanged signatures: `schedule(id)`, `stop(id)`, `isScheduled(id)`, `bootstrap()` | ReportController lines 36, 68, 70, 87 keep working without edit. Zero risk to controller surface. |
| **(b) Job name convention** | Prefix with `report:` — e.g., `report:abc-uuid-123` | Prevents collision with `bifrost-sync` and any future jobs. Planner should document convention in `IScheduler.ts` comment. |
| **(c) In-flight unschedule mid-retry** | `unschedule(name)` immediately stops croner timer; in-flight handler runs to completion (no AbortSignal); in-flight retry wake-ups short-circuit via `!this.registry.has(name)` | Acceptable: PDF generation is idempotent-ish (duplicate email worst-case). Phase 18 does not add cooperative cancellation — deferred. |
| **DI wire-up** | `ReportsServiceProvider.register()` gains `c.make('scheduler') as IScheduler` in the `scheduleReportService` factory | Requires `FoundationServiceProvider` to bind `'scheduler'` first (already true — Foundation registers early per bootstrap.ts:45). |
| **Bootstrap call site** | Move `scheduleService.bootstrap()` from `boot()` to new `registerJobs(scheduler)` | D-19. Drop `boot()` override entirely (default no-op inherited). |

### Drop `boot()` in `ReportsServiceProvider`?

Yes — the existing `boot()` contains ONLY the schedule bootstrap. Removing it (and letting `ModuleServiceProvider`'s default no-op apply) cleanly satisfies JOBS-03 "移除 boot() 中的零散定時邏輯".

## Test Strategy (Research Focus #7)

### FakeScheduler test double

Planner designs, but shape should be:

```typescript
// tests/Unit/Scheduler/FakeScheduler.ts
export class FakeScheduler implements IScheduler {
  readonly scheduled = new Map<string, { spec: JobSpec; handler: () => Promise<void> }>()

  schedule(spec: JobSpec, handler: () => Promise<void>): void {
    if (this.scheduled.has(spec.name)) throw new Error(`duplicate: ${spec.name}`)
    this.scheduled.set(spec.name, { spec, handler })
  }
  unschedule(name: string): void { this.scheduled.delete(name) }
  has(name: string): boolean { return this.scheduled.has(name) }

  /** Test-only: fire the job handler synchronously. */
  async trigger(name: string): Promise<void> {
    const entry = this.scheduled.get(name)
    if (!entry) throw new Error(`not scheduled: ${name}`)
    await entry.handler()
  }
}
```

### Test matrix for `CronerScheduler` (real croner + fake timers)

| Test | Approach | Key API |
|------|----------|---------|
| `schedule()` registers a named job reachable via `has()` | Schedule, assert `.has(name)` true | — |
| `unschedule()` removes and `has()` returns false | Schedule + unschedule | — |
| Duplicate `schedule(name)` throws | Schedule twice | — |
| `runOnInit: true` fires handler once on registration | Await `queueMicrotask` drain via a resolved-promise flush | — |
| Retry: handler fails 1× then succeeds → no error log | Inject failing handler with `attempt++ < 1` | `bun:test` `spyOn(console, 'error')` |
| Retry exhaustion logs `[Scheduler] Job 'x' exhausted N retries:` | Always-failing handler + `maxRetries: 2` | spy console.error, `await` timer advance |
| Exponential backoff timing: delays match `backoffMs * 2^attempt` | Use fake timers (`setSystemTime` / `advanceTimersByTime`), count timers fired per window | <https://bun.com/docs/guides/test/mock-clock> |
| `unschedule()` during retry backoff cancels pending retry | Schedule → trigger first failure → unschedule → advance timers → handler not re-invoked | Timer + spy |
| Cron pattern invalid → throws immediately from `schedule()` | Bad pattern `'not-a-cron'` | croner throws in constructor |

### Timing-sensitive backoff test

**Yes, include at least one.** Use `bun:test`'s fake-timer APIs (`useFakeTimers`, `advanceTimersByTime`) per the Bun docs. This gives a deterministic backoff verification without ≥ 2 s wall-clock waits.

### What NOT to test

- croner's own behaviour (cron parsing, timezone, DST) — trust the library.
- Real HTTP/DB interactions from inside BifrostSync or Report generation — those are covered by their own unit/integration suites.

## BIFROST_SYNC_CRON Env Parsing (Research Focus #9)

### Current state

- `config/app.ts` exports `name, env, port, VIEW_DIR, debug, url`.
- `bootstrap.ts:72` reads `process.env.BIFROST_SYNC_INTERVAL_MS` directly — **violates the config-locality pattern**.

### Recommendation

Add to `config/app.ts`:

```typescript
export default {
  // ... existing ...
  bifrostSyncCron: process.env.BIFROST_SYNC_CRON ?? '*/5 * * * *',
} as const
```

Then `DashboardServiceProvider.registerJobs(scheduler)` reads `config.bifrostSyncCron` via DI container (`core.container.make('config')` or similar — check `@gravito/core` config access in `FoundationServiceProvider`).

**Alternative (also acceptable):** Keep env read in `registerJobs()` body — minimal, direct, but scatters env-var knowledge. **Recommendation: use `config/app.ts`** for consistency with `port`, `url`, etc.

### Deprecation handling (D-16)

- Document in release notes: `BIFROST_SYNC_INTERVAL_MS` (integer ms) → `BIFROST_SYNC_CRON` (cron expression). Default unchanged (5 min).
- **Do NOT add fallback code that converts INTERVAL_MS → cron.** D-16 says non-breaking because it's internal, but silently honouring both invites config drift. Clean break + release note.

## Known Risks & Edge Cases (Research Focus #10)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `runOnInit` fires before DI container finishes warming deep dependencies | Low (bootstrap already calls `core.bootstrap()` before `registerJobs`) | Would manifest as NPE inside handler | Order in bootstrap: `await core.bootstrap()` → `await registerRoutes(core)` → scheduler `registerJobs` loop. Confirmed sequence in recommendation above. |
| Duplicate job name across modules (e.g., two providers both register `'cleanup'`) | Low (only 2 jobs now) | Second `schedule()` throws on duplicate | Add explicit duplicate check in `CronerScheduler.schedule()`; throw `Error('[Scheduler] Duplicate job name: <name>')`. Document naming conventions (`'bifrost-sync'`, `'report:<id>'`). |
| Timezone misconfig in `JobSpec` | Medium (user-entered data via ScheduleReportService) | croner throws on invalid IANA name | croner already validates; `schedule(id)` in ScheduleReportService catches and logs per existing `console.error` pattern. |
| Graceful shutdown: in-flight handler when process receives SIGTERM | Medium | Current code: handler just ends mid-flight (no persistence). Same risk today. | Out of scope for Phase 18 (D-13 explicit: at-most-once + idempotent). Document as known limitation in phase SUMMARY. |
| `CronOptions.protect: true` skipping legitimate ticks during long retry chains | Low with `maxRetries: 2, backoffMs: 2000` (worst case 6s) | Missed tick (acceptable; idempotent) | Keep retries small; document trade-off. |
| Test isolation: croner's global `scheduledJobs` array | High if tests misconfigure | Tests bleed state across files | **Our `CronerScheduler` does not rely on croner's global.** Tests should `scheduler.unschedule()` in `afterEach`. Use `unref: true`. |
| croner 10 → 11 breaking change | Low (croner pins at 10.0.1; SemVer) | Would need to re-verify API surface | Pin major in `package.json`; add RESEARCH.md version verification ritual on upgrade. |
| Mixing `runOnInit` retry clock with first scheduled tick | Low with current cron intervals (5 min) | Theoretical pile-up on a sub-minute schedule | `protect: true` guards it; document that sub-minute schedules + runOnInit + retries may overlap. |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun built-in test runner (project standard; see `package.json` `test` script) + Vitest for existing non-Bun tests (kept for existing suites; new scheduler tests use `bun:test` for fake-timer support) |
| Config file | None separate; `package.json` scripts define suites |
| Quick run command | `bun test src/Foundation/Infrastructure/Services/Scheduler tests/Unit/Scheduler` |
| Full suite command | `bun run check` (typecheck + lint + test) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **JOBS-01** | `IScheduler` port exists in `src/Foundation/Infrastructure/Ports/Scheduler/IScheduler.ts` exporting `IScheduler` + `JobSpec` | static grep / ts-compile | `bun run typecheck` + `grep -q "export interface IScheduler" src/Foundation/Infrastructure/Ports/Scheduler/IScheduler.ts` | ❌ Wave 0 (new) |
| **JOBS-01** | `CronerScheduler` implements `IScheduler` correctly (schedule/unschedule/has) | unit | `bun test tests/Unit/Scheduler/CronerScheduler.test.ts -t "schedule/unschedule/has"` | ❌ Wave 0 (new) |
| **JOBS-01** | Only two `new Cron(` sites go through CronerScheduler; no lingering `setInterval` for scheduling | static grep | `! grep -rnE "setInterval\\(|new Cron\\(" src/ --include='*.ts' \| grep -v "CronerScheduler\\|setTimeout\\|BifrostSyncService.ts:28"` (accepted: BifrostSync's 30s timeout setTimeout) | Grep script inline |
| **JOBS-02** | `ScheduleReportService` no longer holds `Map<string, Cron>`; delegates to injected `IScheduler` | static grep + unit | `! grep -n "Map<string, Cron>" src/Modules/Reports/Application/Services/ScheduleReportService.ts` AND `bun test src/Modules/Reports/__tests__/ScheduleReportService.test.ts` | ❌ Wave 0 for unit test |
| **JOBS-02** | `ReportsServiceProvider.boot()` no longer calls schedule bootstrap | static grep | `! grep -A2 "override async boot" src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider.ts \| grep -q "scheduleService"` | Existing provider |
| **JOBS-02** | `ReportsServiceProvider.registerJobs()` triggers schedule bootstrap | unit / integration | `bun test src/Modules/Reports/__tests__/ReportsServiceProvider.registerJobs.test.ts` | ❌ Wave 0 (new) |
| **JOBS-03** | `bootstrap.ts` has no `setInterval` for job scheduling | static grep | `! grep -n "setInterval" src/bootstrap.ts` | Existing file |
| **JOBS-03** | `bootstrap.ts` calls `registerJobs(scheduler)` for every `IJobRegistrar`-shaped module provider | integration | `bun test tests/Feature/bootstrap-scheduler.test.ts` (new) — boots the app, asserts `scheduler.has('bifrost-sync')` and at least-attempted report schedules | ❌ Wave 0 (new) |
| **JOBS-03** | No `boot()` override in any module provider contains scheduler/timer logic | static grep | `! grep -rnE "setInterval\\(\|new Cron\\(" src/Modules/*/Infrastructure/Providers/*.ts` | Grep inline |
| **JOBS-04** | Retry fires `maxRetries` times then logs `[Scheduler] Job '{name}' exhausted {N} retries:` | unit with fake timers | `bun test tests/Unit/Scheduler/CronerScheduler.test.ts -t "exhausts retries"` | ❌ Wave 0 (new) |
| **JOBS-04** | Exponential backoff delays match `backoffMs * 2^attempt` | unit with fake timers | `bun test tests/Unit/Scheduler/CronerScheduler.test.ts -t "exponential backoff"` | ❌ Wave 0 (new) |
| **JOBS-04** | `unschedule()` during a backoff window cancels the pending retry | unit with fake timers | `bun test tests/Unit/Scheduler/CronerScheduler.test.ts -t "unschedule cancels retry"` | ❌ Wave 0 (new) |
| **JOBS-04** | Handler returning rejected Promise is treated as failure | unit | `bun test tests/Unit/Scheduler/CronerScheduler.test.ts -t "rejected promise triggers retry"` | ❌ Wave 0 (new) |
| **JOBS-04** | Retry exhaustion does NOT emit webhook/alert (Phase 19 guard) | static grep | `! grep -nE "webhook\|alert" src/Foundation/Infrastructure/Services/Scheduler/CronerScheduler.ts` | Grep inline |

### Sampling Rate
- **Per task commit:** `bun test src/Foundation/Infrastructure/Services/Scheduler tests/Unit/Scheduler src/Modules/Reports/__tests__`
- **Per wave merge:** `bun run typecheck && bun test src tests/Unit`
- **Phase gate:** `bun run check` (full suite green) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/Foundation/Infrastructure/Ports/Scheduler/IScheduler.ts` — port + `JobSpec` type (covers JOBS-01)
- [ ] `src/Foundation/Infrastructure/Ports/Scheduler/IJobRegistrar.ts` — side-interface for providers (covers JOBS-03)
- [ ] `src/Foundation/Infrastructure/Services/Scheduler/CronerScheduler.ts` — adapter (covers JOBS-01, JOBS-04)
- [ ] `tests/Unit/Scheduler/FakeScheduler.ts` — test double (shared fixture)
- [ ] `tests/Unit/Scheduler/CronerScheduler.test.ts` — unit tests (JOBS-01, JOBS-04)
- [ ] `tests/Unit/Scheduler/FakeScheduler.test.ts` — sanity
- [ ] `src/Modules/Reports/__tests__/ScheduleReportService.test.ts` — service delegates to scheduler (JOBS-02) — **check if existing; may already exist**
- [ ] `src/Modules/Reports/__tests__/ReportsServiceProvider.registerJobs.test.ts` — provider hook fires bootstrap (JOBS-02)
- [ ] `tests/Feature/bootstrap-scheduler.test.ts` — bootstrap integration: scheduler registered, both jobs present (JOBS-03)
- Framework install: none — `bun test` and `croner` already available.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun runtime | `bun test`, `bun run` | ✓ (assumed; project standard) | — | — |
| croner | `CronerScheduler` | ✓ (installed) | 10.0.1 | — |
| @gravito/core | Adapter lifecycle | ✓ (installed) | 3.0.1 | — |
| `bun:test` fake-timer APIs (`setSystemTime`, `advanceTimersByTime`) | CronerScheduler backoff tests | ✓ (built in) | Bun ≥ 1.1 | If older Bun, fall back to real timers with short `backoffMs: 10ms` (inject via spec), still deterministic. |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Code Examples

### IScheduler port (proposed final)

```typescript
// src/Foundation/Infrastructure/Ports/Scheduler/IScheduler.ts
export interface JobSpec {
  readonly name: string
  readonly cron: string
  readonly timezone?: string
  readonly runOnInit?: boolean
  readonly maxRetries?: number
  readonly backoffMs?: number
}

export interface IScheduler {
  schedule(spec: JobSpec, handler: () => Promise<void>): void
  unschedule(name: string): void
  has(name: string): boolean
}
```

### IJobRegistrar side-interface

```typescript
// src/Foundation/Infrastructure/Ports/Scheduler/IJobRegistrar.ts
import type { IScheduler } from './IScheduler'

export interface IJobRegistrar {
  registerJobs(scheduler: IScheduler): void | Promise<void>
}
```

### CronerScheduler skeleton (pseudo — planner formalises)

```typescript
// src/Foundation/Infrastructure/Services/Scheduler/CronerScheduler.ts
import { Cron } from 'croner'
import type { IScheduler, JobSpec } from '@/Foundation/Infrastructure/Ports/Scheduler/IScheduler'

export class CronerScheduler implements IScheduler {
  private readonly jobs = new Map<string, Cron>()
  private readonly pendingRetryTimers = new Map<string, Set<ReturnType<typeof setTimeout>>>()

  schedule(spec: JobSpec, handler: () => Promise<void>): void {
    if (this.jobs.has(spec.name)) {
      throw new Error(`[Scheduler] Duplicate job name: ${spec.name}`)
    }
    const wrapped = this.wrapWithRetry(spec, handler)
    const job = new Cron(
      spec.cron,
      {
        name: spec.name,
        timezone: spec.timezone,
        protect: true,
        unref: true,
        catch: (err) => console.error(`[Scheduler] Job '${spec.name}' cron-level error:`, err),
      },
      wrapped
    )
    this.jobs.set(spec.name, job)
    if (spec.runOnInit) {
      queueMicrotask(() => { void wrapped() })
    }
  }

  unschedule(name: string): void {
    const job = this.jobs.get(name)
    if (job) job.stop()
    this.jobs.delete(name)
    const timers = this.pendingRetryTimers.get(name)
    if (timers) { for (const t of timers) clearTimeout(t); timers.clear() }
    this.pendingRetryTimers.delete(name)
  }

  has(name: string): boolean {
    return this.jobs.has(name)
  }

  private wrapWithRetry(spec: JobSpec, userHandler: () => Promise<void>): () => Promise<void> {
    const { name, maxRetries = 0, backoffMs = 0 } = spec
    return async () => {
      let attempt = 0
      while (true) {
        try {
          await userHandler()
          return
        } catch (err) {
          if (attempt >= maxRetries) {
            console.error(`[Scheduler] Job '${name}' exhausted ${maxRetries} retries:`, err)
            return
          }
          const delay = backoffMs * 2 ** attempt
          attempt++
          if (!this.jobs.has(name)) return  // unscheduled mid-retry
          await this.sleep(name, delay)
          if (!this.jobs.has(name)) return
        }
      }
    }
  }

  private sleep(name: string, ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingRetryTimers.get(name)?.delete(timer)
        resolve()
      }, ms)
      let set = this.pendingRetryTimers.get(name)
      if (!set) { set = new Set(); this.pendingRetryTimers.set(name, set) }
      set.add(timer)
    })
  }
}
```

### DashboardServiceProvider registerJobs (new)

```typescript
// src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts
import type { IScheduler } from '@/Foundation/Infrastructure/Ports/Scheduler/IScheduler'
import type { IJobRegistrar } from '@/Foundation/Infrastructure/Ports/Scheduler/IJobRegistrar'

export class DashboardServiceProvider extends ModuleServiceProvider implements IJobRegistrar {
  private core!: PlanetCore  // captured in boot(context) or passed via registerJobs signature extension

  override register(container: IContainer): void {
    // ... existing ...
  }

  async registerJobs(scheduler: IScheduler): Promise<void> {
    const syncService = this.core.container.make('bifrostSyncService') as BifrostSyncService
    scheduler.schedule(
      {
        name: 'bifrost-sync',
        cron: process.env.BIFROST_SYNC_CRON ?? '*/5 * * * *',
        runOnInit: true,
        maxRetries: 2,
        backoffMs: 2000,
      },
      async () => {
        const result = await syncService.sync()
        console.log(`[BifrostSync] Synced ${result.synced} records, quarantined ${result.quarantined}`)
      }
    )
  }
}
```

**Note on `this.core`:** `ModuleServiceProvider.boot(context)` receives `PlanetCore`. Simplest wiring: capture it in `boot()`. Alternatively, change the `registerJobs` signature to `registerJobs(scheduler: IScheduler, container: IContainer)` — cleaner, no stateful capture. **Planner decides.**

## Open Questions

1. **Capturing `PlanetCore` / container for `registerJobs` handlers**
   - What we know: handlers need DI resolution (e.g., `bifrostSyncService`).
   - What's unclear: whether `IJobRegistrar.registerJobs` should take `(scheduler, container)` or `(scheduler)` + rely on `this.core` captured in `boot()`.
   - Recommendation: **Two-arg signature** `registerJobs(scheduler: IScheduler, container: IContainer): void | Promise<void>`. Avoids stateful capture, keeps providers purely-functional, matches existing `register(container)` shape. Planner to confirm.

2. **Where does `'scheduler'` get bound in DI?**
   - Recommendation: `FoundationServiceProvider.register()` binds `container.singleton('scheduler', () => new CronerScheduler())`. Foundation is already first in bootstrap.ts:45, so everyone downstream can `container.make('scheduler')`.

3. **`BIFROST_SYNC_CRON` default when env var is unset but malformed**
   - What we know: croner throws on invalid pattern.
   - What's unclear: whether to catch + fallback to `'*/5 * * * *'` or let startup fail loud.
   - Recommendation: **Fail loud.** Invalid cron expression is an operator error deserving visibility; matches 12-factor principle.

4. **Adding webhook alert on retry exhaustion (Phase 19 coupling)**
   - What we know: D-12 says no.
   - Design note: Phase 19 Alerts rework could publish a domain event on exhaustion, decoupling scheduler from webhook. Leave a code comment `// TODO(Phase-19): emit JobExhaustedEvent` in the exhaustion log site.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `setInterval(() => sync(), N)` in bootstrap | `IScheduler.schedule({ cron, runOnInit, maxRetries, backoffMs }, handler)` | Phase 18 | Cron expression replaces millisecond interval; retry policy standardised; same for all jobs. |
| `new Cron()` directly in `ScheduleReportService` with private `Map` | `IScheduler` proxy, same public API | Phase 18 | Service loses scheduling knowledge; becomes a domain-aware wrapper over generic scheduler. |
| `ReportsServiceProvider.boot()` hosts schedule bootstrap | `ReportsServiceProvider.registerJobs()` (new lifecycle hook) | Phase 18 | Job definitions co-located with scheduler lifecycle, not DI lifecycle. |

**Deprecated/outdated:**
- `BIFROST_SYNC_INTERVAL_MS` env var → replaced by `BIFROST_SYNC_CRON` (D-16).

## Sources

### Primary (HIGH confidence)
- `node_modules/croner/dist/croner.d.ts` (croner 10.0.1 API surface — full read)
- `src/bootstrap.ts` lines 68-88 (current setInterval site)
- `src/Modules/Reports/Application/Services/ScheduleReportService.ts` (current croner usage)
- `src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider.ts` (current boot)
- `src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts` (sync signature + internal timeout pattern)
- `src/Shared/Infrastructure/IServiceProvider.ts` (ModuleServiceProvider contract)
- `src/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter.ts` (adapter shape)
- `src/Modules/Reports/Presentation/Controllers/ReportController.ts` (ScheduleReportService call sites — API must stay stable)
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/TESTING.md` (project conventions)
- `.planning/phases/17-iquerybuilder-usagerepository-drizzle/17-RESEARCH.md` (port/adapter precedent)

### Secondary (MEDIUM confidence, verified with official docs)
- Bun test `setSystemTime` / fake timers — <https://bun.com/docs/guides/test/mock-clock>
- croner homepage / docs — <https://croner.56k.guru>

### Tertiary (LOW confidence — flagged for planner validation)
- croner's `CronOptions.catch` firing semantics for async handlers vs sync throws — **verify in first unit test** (design assumes it fires for both sync throws and unhandled promise rejections, but our wrapper's own try/catch supersedes this regardless, so behaviour is safe).

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — croner version + types read directly from `node_modules`
- Architecture: **HIGH** — Phase 17 precedent + existing `IServiceProvider`/Adapter inspected line-by-line
- Pitfalls: **HIGH** — rooted in current file state; no speculation
- `registerJobs` wiring choice (side-interface vs base class): **MEDIUM** — both work; recommendation is defensible but planner may prefer base-class override for discoverability

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days — internal architecture phase, no fast-moving externals; re-verify croner version only on upgrade)

---

## RESEARCH COMPLETE

**Phase:** 18 — Uniform Background Jobs
**Confidence:** HIGH

### Key Findings
- **No new dependencies required.** croner 10.0.1 already installed and has all needed APIs (`timezone`, `protect`, `unref`, `catch`, `trigger`, `stop`, `isBusy`).
- **Only two scheduling sites to migrate** — grep-confirmed: `bootstrap.ts:80` (`setInterval`) and `ScheduleReportService.ts:31` (`new Cron()`). No other `setInterval`/`new Cron(` usages anywhere in `src/`.
- **`IScheduler` final shape is small and locked by CONTEXT.md D-09/D-14**: `schedule(spec, handler)` / `unschedule(name)` / `has(name)` with a `JobSpec` carrying cron, timezone, runOnInit, maxRetries, backoffMs.
- **Recommended registration pattern: side-interface `IJobRegistrar` (duck-typed)** rather than extending `ModuleServiceProvider` base class — keeps 14 unaffected providers unchanged and matches D-08 "optional".
- **Retry mechanics lean on croner's `protect: true` + a per-job `Map<string, Set<Timer>>` for cancellation**; `runOnInit` shares the same retry pipeline (no special-case code path).

### File Created
`.planning/phases/18-uniform-background-jobs/18-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | croner types read directly; no version uncertainty |
| Architecture | HIGH | All target files inspected; Phase 17 precedent established |
| Pitfalls | HIGH | Rooted in current code behaviour, not hypotheticals |
| Lifecycle-hook integration | MEDIUM | Two viable shapes; researcher recommends side-interface but planner may revisit |

### Open Questions
1. `registerJobs(scheduler)` vs `registerJobs(scheduler, container)` signature — recommendation: **two-arg** (no stateful `this.core`); planner to confirm.
2. Where to bind `'scheduler'` in DI — recommendation: `FoundationServiceProvider.register()`.
3. Invalid `BIFROST_SYNC_CRON` handling — recommendation: fail loud (no fallback to default on malformed input).

### Ready for Planning
Research complete. Planner can now create PLAN.md files — suggested breakdown: **Plan 1** (ports + CronerScheduler + tests + DI binding), **Plan 2** (bootstrap integration + both job migrations + cleanup). Matches ROADMAP.md's "2 plans" estimate.

Sources:
- [croner package on npm](https://www.npmjs.com/package/croner)
- [croner docs — hexagon/croner](https://croner.56k.guru)
- [Bun test fake timers / setSystemTime guide](https://bun.com/docs/guides/test/mock-clock)
- [bun:test module API reference](https://bun.com/reference/bun/test)
