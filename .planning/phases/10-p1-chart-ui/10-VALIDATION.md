---
phase: 10
slug: p1-chart-ui
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (built-in) + Vitest 4.0.18 |
| **Config file** | No standalone vitest.config.ts — runner is `bun test` |
| **Quick run command** | `bun test src/Modules/Dashboard` |
| **Full suite command** | `bun test src tests/Unit packages` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test src/Modules/Dashboard`
- **After every plan wave:** Run `bun test src tests/Unit packages`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-W0-01 | W0 | 0 | DASHBOARD-01 | unit stub | `bun test src/Modules/Dashboard --filter GetKpiSummaryService` | ❌ W0 | ⬜ pending |
| 10-W0-02 | W0 | 0 | DASHBOARD-02/04 | unit stub | `bun test src/Modules/Dashboard --filter GetCostTrendsService` | ❌ W0 | ⬜ pending |
| 10-W0-03 | W0 | 0 | DASHBOARD-03/05 | unit stub | `bun test src/Modules/Dashboard --filter GetModelComparisonService` | ❌ W0 | ⬜ pending |
| 10-W0-04 | W0 | 0 | DASHBOARD-03 | unit | `bun test src/Modules/Dashboard --filter DrizzleUsageRepository` | ✅ extend | ⬜ pending |
| 10-01-01 | 01 | 1 | DASHBOARD-01 | unit | `bun test src/Modules/Dashboard --filter GetKpiSummaryService` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 | 1 | DASHBOARD-02 | unit | `bun test src/Modules/Dashboard --filter GetCostTrendsService` | ❌ W0 | ⬜ pending |
| 10-01-03 | 01 | 1 | DASHBOARD-03 | unit | `bun test src/Modules/Dashboard --filter GetModelComparisonService` | ❌ W0 | ⬜ pending |
| 10-01-04 | 01 | 1 | DASHBOARD-04 | unit | `bun test src/Modules/Dashboard --filter GetCostTrendsService` | ❌ W0 | ⬜ pending |
| 10-01-05 | 01 | 1 | DASHBOARD-05 | unit | `bun test src/Modules/Dashboard --filter GetModelComparisonService` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` — stubs for DASHBOARD-01 (time-window KPI fetch with role scoping)
- [ ] `src/Modules/Dashboard/__tests__/GetCostTrendsService.test.ts` — stubs for DASHBOARD-02, DASHBOARD-04
- [ ] `src/Modules/Dashboard/__tests__/GetModelComparisonService.test.ts` — stubs for DASHBOARD-03, DASHBOARD-05
- [ ] Extend `src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` — assert `queryModelBreakdown` returns at most 10 results

*Existing infrastructure covers the test runner (bun test) — no framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Time-window selector updates KPI cards visually | DASHBOARD-01 | React UI interaction | Open dashboard, click 7d/30d/90d, verify card values change |
| Area chart renders daily cost correctly | DASHBOARD-02 | Chart rendering | Open dashboard, confirm area chart shows data points per day |
| Bar chart shows top 10 models sorted DESC | DASHBOARD-03 | Chart rendering | Open dashboard, confirm bar chart with ≤10 bars, highest first |
| Stacked area chart shows input vs output tokens | DASHBOARD-04 | Chart rendering | Open dashboard, confirm blue/orange stacked areas with non-zero values |
| Column sort on model comparison table | DASHBOARD-05 | UI interaction | Click column headers, verify rows re-sort |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
