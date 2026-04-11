---
phase: 12
slug: differentiators
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vite.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 0 | DASHBOARD-06 | unit | `npx vitest run GetKpiSummaryService` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | DASHBOARD-06 | unit | `npx vitest run GetKpiSummaryService` | ✅ | ⬜ pending |
| 12-01-03 | 01 | 1 | DASHBOARD-06 | unit | `npx vitest run DashboardController` | ✅ | ⬜ pending |
| 12-02-01 | 02 | 2 | DASHBOARD-06 | manual | Print preview in browser | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` — add tests: member prior-period scoping, zero prior-period zeroUsage, window duration mirroring

*Existing infrastructure covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF output contains cost total and trend chart | DASHBOARD-06 | window.print() is browser API, not unit-testable | Click Download Report, verify PDF in print preview |
| Sidebar/TopBar hidden in print | DASHBOARD-06 | CSS print media query not testable in vitest | Open print preview, confirm nav is hidden |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
