---
phase: 19
slug: alerts-module-decoupling
status: planned
nyquist_compliant: true
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

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-T1 | 01 | 1 | ALERTS-01, ALERTS-05 | type+schema | `pnpm tsc --noEmit` | ✅ schema.ts exists | ⬜ pending |
| 19-01-T2 | 01 | 1 | ALERTS-01 | type+grep | `test -z "$(grep -rln \"from 'drizzle-orm'\" src/Modules/Alerts/Infrastructure/Repositories/AlertConfigRepository.ts src/Modules/Alerts/Infrastructure/Repositories/AlertEventRepository.ts src/Modules/Alerts/Infrastructure/Repositories/AlertDeliveryRepository.ts src/Modules/Alerts/Infrastructure/Repositories/WebhookEndpointRepository.ts)" && pnpm tsc --noEmit` | ❌ W0 (created in task) | ⬜ pending |
| 19-01-T3 | 01 | 1 | ALERTS-01 | unit | `pnpm vitest run src/Modules/Alerts && pnpm tsc --noEmit` | ✅ AlertsServiceProvider.ts exists | ⬜ pending |
| 19-02-T1 | 02 | 2 | ALERTS-02 | type | `pnpm tsc --noEmit` | ❌ W0 (created in task) | ⬜ pending |
| 19-02-T2 | 02 | 2 | ALERTS-02 | unit | `pnpm vitest run src/Modules/Alerts/__tests__/SendAlertService.test.ts src/Modules/Alerts/__tests__/EvaluateThresholdsService.test.ts && pnpm tsc --noEmit` | ✅ SendAlertService.test.ts exists | ⬜ pending |
| 19-02-T3 | 02 | 2 | ALERTS-02 | unit+doc | `pnpm vitest run src/Modules/Alerts && pnpm tsc --noEmit` | ✅ AlertsServiceProvider.ts exists | ⬜ pending |
| 19-03-T1 | 03 | 3 | ALERTS-03, ALERTS-04 | type | `pnpm tsc --noEmit` | ❌ W0 (created in task) | ⬜ pending |
| 19-03-T2 | 03 | 3 | ALERTS-04 | unit | `pnpm vitest run src/Modules/Alerts/__tests__/WebhookAlertNotifier.test.ts src/Modules/Alerts/__tests__/EmailAlertNotifier.test.ts && pnpm tsc --noEmit` | ❌ W0 (tests created in task) | ⬜ pending |
| 19-03-T3 | 03 | 3 | ALERTS-03, ALERTS-04, ALERTS-05 | unit+integration | `pnpm vitest run src/Modules/Alerts && pnpm vitest run && pnpm tsc --noEmit` | ✅ SendAlertService.ts / ResendDeliveryService.ts exist | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `src/Modules/Alerts/__tests__/fakes/` directory with InMemoryAlertConfigRepository / InMemoryAlertEventRepository / InMemoryAlertDeliveryRepository / InMemoryWebhookEndpointRepository / InMemoryAlertRecipientResolver / FakeAlertNotifier (populated across Plans 2 Task 1 + Plan 3 Task 1)
- [ ] Baseline: existing 13 test files must remain green before Plan 1 begins
- [ ] `pnpm tsc --noEmit` green baseline confirmed
- [ ] `drizzle/migrations/2026_04_13_add_alert_deliveries_denorm.sql` runnable against dev DB before Plan 1 Task 2 (Task 1 produces it)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| MODULE.md cross-module dependency contract is readable and accurate | ALERTS-02 | Documentation artifact — cannot assert structure via grep alone | Human reviews `src/Modules/Alerts/MODULE.md` for completeness; cross-check against actual imports via `grep -rn "from '@/Modules/(Organization\|Auth\|Dashboard\|ApiKey)'" src/Modules/Alerts` |
| Fire-and-forget webhook latency preserved (SendAlertService) | ALERTS-04 / research pitfall | Timing behavior not trivially asserted in unit tests | Smoke: run SendAlertService manually with a slow webhook endpoint fake; confirm caller returns before webhook dispatch resolves (Plan 3 Task 3) |
| Denormalization backfill correct on production-shaped data | ALERTS-01 / ALERTS-05 | Requires running migration against representative dataset | After Plan 1 Task 1 migration is applied, run: `SELECT COUNT(*) FROM alert_deliveries WHERE org_id IS NULL OR month IS NULL OR tier IS NULL` — expected 0 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (`__tests__/fakes/` scaffold — split across Plan 2 T1 and Plan 3 T1)
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — ready for execution
