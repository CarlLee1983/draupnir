---
phase: 8
slug: data-correctness-permission-foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-11
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test + vitest |
| **Config file** | `bunfig.toml` / `vitest.config.ts` |
| **Quick run command** | `bun test src/Modules/Dashboard src/Pages/__tests__/Admin src/Pages/__tests__/Member tests/Unit/Foundation/LLMGateway` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test src/Modules/Dashboard src/Pages/__tests__/Admin src/Pages/__tests__/Member tests/Unit/Foundation/LLMGateway`
- **After every plan wave:** Run `bun test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-T1 | 01 | 1 | DASHBOARD-P2, DASHBOARD-P3 | unit | `bun test src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts` | ✅ | ⬜ pending |
| 08-01-T2 | 01 | 1 | DASHBOARD-P1, DASHBOARD-P2 | unit | `bun test src/Pages/__tests__/Admin/AdminDashboardPage.test.ts src/Pages/__tests__/Member/MemberDashboardPage.test.ts tests/Unit/Foundation/LLMGateway/BifrostGatewayAdapter.test.ts src/Modules/Dashboard/__tests__/UsageAggregator.test.ts src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing dashboard, gateway, and page tests cover the required surface; no new test stubs are required before execution. `wave_0_complete: true` is set because all referenced test files already exist and no MISSING scaffold entries are present in the task verify blocks.*

---

## Manual-Only Verifications

*None — phase 8 behaviors are covered by automated service/page tests.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none required)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
