---
phase: 18
slug: uniform-background-jobs
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
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

*Populated by planner from RESEARCH.md Validation Architecture + PLAN.md task IDs.*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD     | TBD  | TBD  | JOBS-01..04 | TBD       | TBD               | TBD         | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

From RESEARCH.md:

- [ ] `src/Foundation/Infrastructure/Ports/Scheduler/IScheduler.ts` — port interface
- [ ] `src/Foundation/Infrastructure/Ports/Scheduler/IJobRegistrar.ts` — duck-typed side-interface
- [ ] `src/Foundation/Infrastructure/Services/Scheduler/CronerScheduler.ts` — croner adapter
- [ ] `src/Foundation/Infrastructure/Services/Scheduler/FakeScheduler.ts` — test fake
- [ ] `tests/Unit/Scheduler/CronerScheduler.test.ts` — retry/backoff/runOnInit coverage
- [ ] `tests/Unit/Scheduler/FakeScheduler.test.ts` — trigger() API coverage

*Planner to confirm exact paths against CONVENTIONS.md.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `bootstrap.ts` contains no `setInterval` | JOBS-01 | grep verify | `grep -n "setInterval" src/bootstrap.ts` returns no match |
| Startup logs show `[Scheduler] registered 'bifrost-sync'` and `'report-*'` | JOBS-02 | runtime behavior | `bun start` and inspect console output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
