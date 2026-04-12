---
phase: 17
slug: iquerybuilder-usagerepository-drizzle
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (via `bun test`) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `bun test <path>` |
| **Full suite command** | `bun run check` (typecheck + lint + tests) |
| **Estimated runtime** | ~45–60 seconds full suite; ~5–10 seconds per targeted file |

---

## Sampling Rate

- **After every task commit:** Run `bun test <touched path>`
- **After every plan wave:** Run `bun run check`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-T1 | 01 | 1 | D-05 | integration (grep + typecheck) | `grep -q "credit_cost_new REAL NOT NULL DEFAULT 0" database/migrations/2026_04_12_000003_change_usage_records_credit_cost_to_real.ts && grep -q "CAST(credit_cost AS REAL)" database/migrations/2026_04_12_000003_change_usage_records_credit_cost_to_real.ts && grep -q "RENAME COLUMN credit_cost_new TO credit_cost" database/migrations/2026_04_12_000003_change_usage_records_credit_cost_to_real.ts && grep -q "from '@gravito/atlas'" database/migrations/2026_04_12_000003_change_usage_records_credit_cost_to_real.ts && bun run typecheck` | pending | ⬜ pending |
| 01-T2 | 01 | 1 | D-05, Pitfall-7 | deterministic grep + typecheck | `grep -q "real('credit_cost')" src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts && ! grep -q "text('credit_cost')" src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts && grep -q "creditCost: number" src/Modules/Dashboard/Application/Ports/IUsageRepository.ts && ! grep -q "creditCost: string" src/Modules/Dashboard/Application/Ports/IUsageRepository.ts && ! grep -qE "CAST\\([^)]*credit_cost[^)]*AS REAL\\)" src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts && bun run typecheck` | pending | ⬜ pending |
| 01-T3 | 01 | 1 | D-05, Pitfall-7 | full suite | `! grep -q "creditCost: '" src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts && ! grep -q "creditCost: '" src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts && bun run check` | pending | ⬜ pending |
| 02-T1 | 02 | 2 | D-01, D-02, D-03, D-04 | unit | `bun test src/Shared/Infrastructure/Database/__tests__/AggregateSpec.test.ts` | pending | ⬜ pending |
| 02-T2 | 02 | 2 | D-01 | deterministic grep | `grep -q "aggregate<T>(spec: AggregateSpec)" src/Shared/Infrastructure/IDatabaseAccess.ts && grep -q "from './Database/AggregateSpec'" src/Shared/Infrastructure/IDatabaseAccess.ts` | pending | ⬜ pending |
| 03-T1 | 03 | 3 | D-01, D-03 | unit (TDD RED) | `bun test src/Shared/Infrastructure/Database/Adapters/Drizzle/__tests__/DrizzleQueryBuilder.aggregate.test.ts 2>&1 \| grep -qE "(fail\|FAIL)"` | pending | ⬜ pending |
| 03-T2 | 03 | 3 | D-01, D-03, D-04 | integration (TDD GREEN) | `bun test src/Shared/Infrastructure/Database/Adapters/Drizzle/__tests__/DrizzleQueryBuilder.aggregate.test.ts` | pending | ⬜ pending |
| 04-T1 | 04 | 3 | D-03, D-07, Pitfall-2, Pitfall-3, Pitfall-5 | integration | `bun test src/Shared/Infrastructure/Database/Adapters/Memory/__tests__/MemoryQueryBuilder.aggregate.test.ts && bun run typecheck` | pending | ⬜ pending |
| 04-T2 | 04 | 3 | D-07 (parity) | integration (cross-adapter) | `bun test src/Shared/Infrastructure/Database/__tests__/AggregateParity.test.ts` | pending | ⬜ pending |
| 05-T1 | 05 | 4 | D-08a, D-08b (Pitfall-4) | integration | `bun test src/Shared/Infrastructure/Database && bun run typecheck` | pending | ⬜ pending |
| 05-T2 | 05 | 4 | D-06, D-07, Pitfall-1 | full suite + grep gate | `bun run check && ! grep -rq "from 'drizzle-orm'" src/Modules/Dashboard/` | pending | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Phase 17 does NOT need net-new test scaffolds — every task above defines its own tests or writes against existing infrastructure. The following pre-existing assets satisfy Wave 0:

- [x] `src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` — existing green test used as regression invariant (Plans 01, 05)
- [x] `src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` — existing green test (Plan 01 Task 3)
- [x] libsql `:memory:` test harness in `DrizzleUsageRepository.test.ts` (lines 17–38 `vi.mock`) — reused by Plans 03, 04, 05
- [x] vitest + `bun test` runner configured in `vitest.config.ts`

No `<automated>MISSING — Wave 0 must create ...` references exist in any plan — all verify commands run against files created within the same task or pre-existing assets.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `credit_cost` TEXT→REAL migration applied against dev DB | D-05 | Schema mutation on a running local DB; not part of test suite | Run `bun orbit migrate`, then verify column type via SQLite CLI: `sqlite3 <dev.db> ".schema usage_records"` should show `credit_cost REAL NOT NULL DEFAULT 0`. Spot-check a row with known pre-migration value: `SELECT typeof(credit_cost), credit_cost FROM usage_records LIMIT 1` returns `'real'` and the numeric value. |

*All other behaviors covered by automated tests above.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task has one)
- [x] Wave 0 covers all MISSING references (none exist)
- [x] No watch-mode flags
- [x] Feedback latency < 60s (per-task commands run 5–10s; full suite 45–60s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
