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
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | ALRT-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | ALRT-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 13-02-01 | 02 | 1 | ALRT-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 13-02-02 | 02 | 1 | ALRT-04 | unit+integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 13-03-01 | 03 | 2 | ALRT-05 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |

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
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
