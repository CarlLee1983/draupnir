---
phase: 11
slug: resilience-ux-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.0.18 |
| **Config file** | `vitest.config.*` (project root) |
| **Quick run command** | `bun vitest run src/Modules/Dashboard/__tests__/` |
| **Full suite command** | `bun run verify` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun vitest run src/Modules/Dashboard/__tests__/`
- **After every plan wave:** Run `bun run verify`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-?-01 | migration | 1 | composite index | smoke | `bun run migrate && bun vitest run src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` | ✅ existing | ⬜ pending |
| 11-?-02 | sync timeout | 1 | Timeout-D-04 | unit | `bun vitest run src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` | ✅ edit existing | ⬜ pending |
| 11-?-03 | cursor not advanced | 1 | Timeout-D-05 | unit | `bun vitest run src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` | ✅ new test case | ⬜ pending |
| 11-?-04 | KPI lastSyncedAt | 2 | DASHBOARD-01 | unit | `bun vitest run src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` | ✅ edit existing | ⬜ pending |
| 11-?-05 | lastSyncedAt null | 2 | DASHBOARD-01 | unit | `bun vitest run src/Modules/Dashboard/__tests__/GetKpiSummaryService.test.ts` | ✅ new test case | ⬜ pending |
| 11-?-06 | empty table smoke | 3 | empty state | smoke | `bun vitest run src/Pages/__tests__/Member/MemberDashboardPage.test.ts` | ✅ verify existing | ⬜ pending |
| 11-?-07 | StalenessLabel UI | 3 | Staleness-D-07 | unit | `bun vitest run resources/js/Pages/Member/Dashboard/__tests__/` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `resources/js/Pages/Member/Dashboard/__tests__/StalenessLabel.test.tsx` — stubs for Staleness-D-07 (optional — UI logic is simple; verify manually if test infra setup is costly)

*All backend phase requirements are covered by existing test infrastructure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Amber badge renders correctly (not grey) | Staleness-D-07 | Tailwind purge may strip `bg-amber-100` if not in safelist | Load dashboard, wait 10–30 min (or mock `Date.now`), verify badge is amber not grey |
| "Last updated N min ago" label visible in header | DASHBOARD-01 (UX) | Visual layout verification | Load dashboard, confirm label appears right-aligned next to `<WindowSelector />` |
| Sync timeout does not block page load | Timeout-D-04 | End-to-end network behaviour | Simulate slow Bifrost (e.g., `BIFROST_API_URL=http://localhost:9999`), confirm KPI loads with stale label not error |
| Empty `usage_records` shows no JS errors | SC-4 | Requires empty DB state | `bun db:fresh`, navigate to dashboard, confirm no console errors and charts show empty state |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
