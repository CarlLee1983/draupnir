---
phase: 13
slug: alert-foundation-email-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-12
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bun:test |
| **Config file** | `bunfig.toml` |
| **Quick run command** | `bun test src/Modules/Alerts/` |
| **Full suite command** | `bun test src/Modules/Alerts/` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test src/Modules/Alerts/`
- **After every plan wave:** Run `bun test src/Modules/Alerts/`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-T1 | 01 | 1 | ALRT-01, ALRT-05 | unit | `bun test src/Modules/Alerts/__tests__/ThresholdTier.test.ts src/Modules/Alerts/__tests__/BudgetAmount.test.ts` | ❌ W0 | ⬜ pending |
| 13-01-T2 | 01 | 1 | ALRT-01, ALRT-04 | unit | `bun test src/Modules/Alerts/__tests__/AlertConfig.test.ts` | ❌ W0 | ⬜ pending |
| 13-02-T1 | 02 | 2 | ALRT-02, ALRT-03, ALRT-04 | unit+integration | `bun test src/Modules/Alerts/__tests__/EvaluateThresholdsService.test.ts` | ❌ W0 | ⬜ pending |
| 13-02-T2a | 02 | 2 | ALRT-01 | type-check | `npx tsc --noEmit` | N/A | ⬜ pending |
| 13-02-T2b | 02 | 2 | ALRT-03 | build | `bun run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/Modules/Alerts/` — test directory structure for Alerts module
- [ ] Test stubs for threshold configuration (ALRT-01, ALRT-02)
- [ ] Test stubs for alert evaluation pipeline (ALRT-03)
- [ ] Test stubs for deduplication logic (ALRT-04)
- [ ] Test stubs for email template rendering (ALRT-05)

*Existing vitest infrastructure covers framework needs. Only test files for new Alerts module needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Email delivery via Upyo | ALRT-03 | External SMTP service | Send test alert, verify email received in test inbox |
| Email visual rendering | ALRT-05 | HTML template appearance | Open rendered HTML in browser, verify warning vs critical styling |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
