---
phase: 18
slug: uniform-background-jobs
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-13
updated: 2026-04-13
---

# Phase 18 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Populated by gsd-planner from RESEARCH.md `## Validation Architecture` section.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test |
| **Config file** | (none — bun test auto-discovers under `tests/`) |
| **Quick run command** | `bun test tests/Unit/Scheduler/` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~5 seconds (Unit/Scheduler), ~TBD full |

---

## Sampling Rate

- **After every task commit:** Run `bun test tests/Unit/Scheduler/`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 18-01-T1 | 01 | 1 | JOBS-01 | Unit (TDD) | `bun test tests/Unit/Scheduler/FakeScheduler.test.ts` | tests/Unit/Scheduler/FakeScheduler.test.ts | ⬜ pending |
| 18-01-T2 | 01 | 1 | JOBS-04 | Unit (TDD) | `bun test tests/Unit/Scheduler/CronerScheduler.test.ts` | tests/Unit/Scheduler/CronerScheduler.test.ts | ⬜ pending |
| 18-01-T3 | 01 | 1 | JOBS-01 | Typecheck + regression | `bun test tests/Unit/Scheduler/ && bunx tsc --noEmit` | src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts | ⬜ pending |
| 18-02-T1 | 02 | 2 | JOBS-02 | Unit (TDD) | `bun test tests/Unit/Reports/ScheduleReportService.test.ts tests/Unit/Scheduler/` | tests/Unit/Reports/ScheduleReportService.test.ts | ⬜ pending |
| 18-02-T2 | 02 | 2 | JOBS-01, JOBS-03, JOBS-04 | Typecheck + grep | `bunx tsc --noEmit` + grep suite (see acceptance_criteria) | src/bootstrap.ts (modified) | ⬜ pending |
| 18-02-T3 | 02 | 2 | JOBS-01, JOBS-02, JOBS-03, JOBS-04 | Integration | `bun test tests/Integration/Bootstrap/registerJobs.test.ts` | tests/Integration/Bootstrap/registerJobs.test.ts | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

From RESEARCH.md — created in Plan 01 (Wave 1 of this phase serves as Wave 0 for downstream Wave 2):

- [ ] `src/Foundation/Infrastructure/Ports/Scheduler/IScheduler.ts` — port interface (18-01-T1)
- [ ] `src/Foundation/Infrastructure/Ports/Scheduler/IJobRegistrar.ts` — duck-typed side-interface (18-01-T1)
- [ ] `src/Foundation/Infrastructure/Services/Scheduler/CronerScheduler.ts` — croner adapter (18-01-T2)
- [ ] `tests/Unit/Scheduler/FakeScheduler.ts` — test fake (18-01-T1)
- [ ] `tests/Unit/Scheduler/CronerScheduler.test.ts` — retry/backoff/runOnInit coverage (18-01-T2)
- [ ] `tests/Unit/Scheduler/FakeScheduler.test.ts` — trigger() API coverage (18-01-T1)

Plan 02 Wave 0 dependency: Plan 01 must be green before any Plan 02 task runs.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `bootstrap.ts` contains no `setInterval` | JOBS-03 | grep-verifiable (automated in 18-02-T2 acceptance) | `grep -n "setInterval" src/bootstrap.ts` returns no match |
| Startup logs show `[Scheduler] registered 'bifrost-sync'` and `'report:*'` | JOBS-02 | runtime behavior; integration test (18-02-T3) covers registration state via FakeScheduler, but live log format is inspected manually once | `bun start` and inspect console output |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (all Wave 0 files created in Plan 01)
- [x] No watch-mode flags
- [x] Feedback latency < 10s (Unit/Scheduler ~5s)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved (planner, 2026-04-13)
