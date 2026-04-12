---
phase: 14
slug: per-key-cost-breakdown
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 (unit/integration) + Bun test (native) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `bun test src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` |
| **Full suite command** | `bun test src/Modules/Dashboard/` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts`
- **After every plan wave:** Run `bun test src/Modules/Dashboard/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | COST-01 | unit | `bun test src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | COST-01 | integration | `bun test src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` | ✅ extend | ⬜ pending |
| 14-01-03 | 01 | 1 | COST-02 | unit | `bun test src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` | ❌ W0 | ⬜ pending |
| 14-01-04 | 01 | 1 | COST-02 | unit | `bun test src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` | ❌ W0 | ⬜ pending |
| 14-01-05 | 01 | 1 | COST-03 | unit | `bun test src/Modules/Dashboard/__tests__/GetModelComparisonService.test.ts` | ✅ extend | ⬜ pending |
| 14-01-06 | 01 | 1 | COST-04 | unit | `bun test src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/Modules/Dashboard/__tests__/GetPerKeyCostService.test.ts` — stubs for COST-01, COST-02, COST-04
- [ ] Extend `src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` — add `queryPerKeyCost` test cases

*Frontend component tests are not required per project conventions — no `*.test.tsx` files exist for existing chart components.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Donut chart renders top-8 + Other | COST-03 | Visual rendering | Open `/member/cost-breakdown`, verify donut shows max 8 segments + Other |
| Expandable row lazy loads per-model data | COST-01/COST-02 | UI interaction | Click a key row, verify loading spinner then model breakdown appears |
| Print layout renders correctly | D-03 | Browser print preview | Click Download Report, verify print preview shows clean layout |
| Sidebar nav entry visible | D-01 | Visual verification | Navigate to member area, verify "Cost Breakdown" in sidebar |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
