---
phase: 19
slug: alerts-module-decoupling
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (per project STACK.md) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm vitest run src/Modules/Alerts` |
| **Full suite command** | `pnpm vitest run` |
| **Estimated runtime** | ~60 seconds (full) / ~10 seconds (Alerts scope) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm vitest run src/Modules/Alerts` (scoped)
- **After every plan wave:** Run `pnpm vitest run` (full suite)
- **Before `/gsd:verify-work`:** Full suite must be green + `pnpm tsc --noEmit`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

*To be filled by gsd-planner — one row per task across plans 19-01 / 19-02 / 19-03.*

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-XX | 01 | 1 | ALERTS-01 | unit | `pnpm vitest run src/Modules/Alerts/__tests__/Infrastructure/Repositories` | ❌ W0 | ⬜ pending |
| 19-02-XX | 02 | 1 | ALERTS-02 | unit | `pnpm vitest run src/Modules/Alerts/__tests__/Application/Services/SendAlertService` | ❌ W0 | ⬜ pending |
| 19-03-XX | 03 | 1 | ALERTS-04 | unit | `pnpm vitest run src/Modules/Alerts/__tests__/Infrastructure/Notifiers` | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `src/Modules/Alerts/__tests__/fakes/` directory with InMemoryAlertConfigRepository / InMemoryAlertEventRepository / InMemoryAlertDeliveryRepository / InMemoryWebhookEndpointRepository / InMemoryAlertRecipientResolver / FakeAlertNotifier
- [ ] Baseline: existing 13 test files must remain green before Plan 1 begins
- [ ] `pnpm tsc --noEmit` green baseline confirmed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MODULE.md cross-module dependency contract is readable and accurate | ALERTS-02 | Documentation artifact — cannot assert structure via grep alone | Human reviews `src/Modules/Alerts/MODULE.md` for completeness; cross-check against actual imports via `grep -r "from '@/Modules/(Organization\|Auth\|Dashboard\|ApiKey)'" src/Modules/Alerts` |
| Fire-and-forget webhook latency preserved (SendAlertService) | N/A (research pitfall) | Timing behavior not trivially asserted in unit tests | Smoke: run SendAlertService manually, confirm caller returns before webhook dispatch resolves |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (`__tests__/fakes/` scaffold)
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
