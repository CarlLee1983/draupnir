---
phase: 7
slug: framework-capability-docs-and-improvement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `bun test --reporter=verbose 2>&1 | tail -20` |
| **Full suite command** | `bun test 2>&1 | tail -30` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test --reporter=verbose 2>&1 | tail -20`
- **After every plan wave:** Run `bun test 2>&1 | tail -30`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 7-01-01 | 01 | 1 | i18n wiring | unit | `bun test src/Shared` | ✅ | ⬜ pending |
| 7-01-02 | 01 | 1 | page handler i18n | unit | `bun test tests/Feature/pages` | ✅ | ⬜ pending |
| 7-02-01 | 02 | 2 | API English-only | unit | `bun test tests/Feature/routes` | ✅ | ⬜ pending |
| 7-02-02 | 02 | 2 | test suite green | integration | `bun test 2>&1 | tail -10` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Fix `HandleCreditToppedUpService.test.ts` async/GatewayError throws (3 process-level errors)
- [ ] Verify `SharedDataMiddleware` injects `locale`/`messages` into Inertia shared data

*Wave 0 must complete before i18n wiring tasks begin.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Browser locale switching | i18n page layer | Requires browser interaction | Load page with Accept-Language header; verify translated strings render |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
