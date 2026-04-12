---
phase: 15
slug: webhook-alerts
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-12
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (built-in; project uses `bun test`) |
| **Config file** | none — `bun test` auto-discovers `__tests__/*.test.ts` |
| **Quick run command** | `bun test src/Modules/Alerts/__tests__/ src/Foundation/__tests__/` |
| **Full suite command** | `bun test && bun run typecheck && bun run build` |
| **Estimated runtime** | ~10-15 seconds (quick), ~60-90 seconds (full with build) |

---

## Sampling Rate

- **After every task commit:** Run quick command scoped to the task's test file(s)
- **After every plan wave:** Run `bun test && bun run typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green (`bun test && bun run typecheck && bun run build`)
- **Max feedback latency:** 15 seconds for per-task checks

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | ALRT-07 | unit (foundation) | `bun test src/Foundation/__tests__/WebhookDispatcher.test.ts src/Foundation/__tests__/WebhookSecret.test.ts && bun run typecheck` | ✅ (moved from DevPortal) | ✅ green |
| 15-01-02 | 01 | 1 | ALRT-06 | unit (domain) | `bun test src/Modules/Alerts/__tests__/WebhookUrl.test.ts src/Modules/Alerts/__tests__/WebhookEndpoint.test.ts && bun run typecheck` | ✅ (created) | ✅ green |
| 15-02-01 | 02 | 2 | ALRT-06 | unit (services + DTO) | `bun test src/Modules/Alerts/__tests__/RegisterWebhookEndpointService.test.ts src/Modules/Alerts/__tests__/WebhookEndpointDTO.test.ts && bun run typecheck` | ✅ (created) | ✅ green |
| 15-02-02 | 02 | 2 | ALRT-07, ALRT-08 | unit (services) | `bun test src/Modules/Alerts/__tests__/DispatchAlertWebhooksService.test.ts src/Modules/Alerts/__tests__/GetAlertHistoryService.test.ts src/Modules/Alerts/__tests__/ResendDeliveryService.test.ts && bun run typecheck` | ✅ (created) | ✅ green |
| 15-02-03 | 02 | 2 | ALRT-07 (D-17) | unit (integration) | `bun test src/Modules/Alerts/__tests__/SendAlertService.test.ts && bun run typecheck` | ✅ (existing, extended) | ✅ green |
| 15-03-01 | 03 | 3 | ALRT-06, ALRT-07, ALRT-08 | static + module suite | `bun run typecheck && bun test src/Modules/Alerts/__tests__/` | ✅ | ✅ green |
| 15-03-02 | 03 | 3 | ALRT-06, ALRT-07, ALRT-08 | full backend | `bun test src/Modules/Alerts/__tests__/ && bun run typecheck && bun run build` | ✅ | ✅ green |
| 15-04-01 | 04 | 4 | ALRT-06, ALRT-08 | frontend static | `bun run typecheck && bun run build` | N/A (Vite bundles) | ✅ green |
| 15-04-02 | 04 | 4 | ALRT-06, ALRT-07 | frontend static | `bun run typecheck && bun run build` | N/A | ✅ green |
| 15-04-03 | 04 | 4 | ALRT-08 | frontend static | `bun run typecheck && bun run build` | N/A | ✅ green |
| 15-04-04 | 04 | 4 | ALRT-06, ALRT-07, ALRT-08 | human (E2E) | manual checklist (14 items) | N/A | ✅ human |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Bun test is already present (no framework install required). All new test files are created as part of the tasks that own them (TDD — RED first). Enumerated new test files:

- [ ] `src/Foundation/__tests__/WebhookDispatcher.test.ts` — relocated from DevPortal via `git mv` (Task 15-01-01)
- [ ] `src/Foundation/__tests__/WebhookSecret.test.ts` — relocated from DevPortal via `git mv` (Task 15-01-01)
- [ ] `src/Modules/Alerts/__tests__/WebhookUrl.test.ts` — new (Task 15-01-02); covers HTTPS, SSRF (localhost/127/10.x/192.168/169.254/IPv6), DNS-failure, DNS-rebinding (mocked)
- [ ] `src/Modules/Alerts/__tests__/WebhookEndpoint.test.ts` — new (Task 15-01-02); covers immutability, rotateSecret, withDescription, `whsec_` secret format
- [ ] `src/Modules/Alerts/__tests__/RegisterWebhookEndpointService.test.ts` — new (Task 15-02-01); max-5, SSRF propagation, plaintext-secret return
- [ ] `src/Modules/Alerts/__tests__/WebhookEndpointDTO.test.ts` — new (Task 15-02-01); toListDTO has NO `secret` key, toCreatedDTO includes plaintext `secret`
- [ ] `src/Modules/Alerts/__tests__/DispatchAlertWebhooksService.test.ts` — new (Task 15-02-02); dedup skip, Promise.allSettled isolation, never-throws safety net
- [ ] `src/Modules/Alerts/__tests__/GetAlertHistoryService.test.ts` — new (Task 15-02-02); ordering, deliveries join
- [ ] `src/Modules/Alerts/__tests__/ResendDeliveryService.test.ts` — new (Task 15-02-02); failed-only, WebhookEndpointGoneError, new-row creation
- [ ] `src/Modules/Alerts/__tests__/SendAlertService.test.ts` — extend existing (Task 15-02-03); per-recipient email dedup + delivery rows, D-17 fire-and-forget (send resolves before dispatch completes), rejected-dispatch does not reject send()

No separate Wave 0 plan is required: each test file is created inside the task that implements the code under test (TDD), and the relocated Foundation tests travel with Task 15-01-01's `git mv`. All subsequent tasks inherit the test infrastructure transparently.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `/alerts` renders three tabs (Budgets / Webhooks / History) in a real browser | ALRT-06, ALRT-08 | Visual rendering + navigation | 15-04 Task 4 checkpoint step 1 |
| SecretRevealModal shows plaintext exactly once + copy-to-clipboard UX | ALRT-06 | Clipboard API + one-time UX contract | 15-04 Task 4 checkpoint step 3 + 14 |
| HMAC signature on real outbound POST verifies via `openssl dgst -sha256 -hmac` | ALRT-07 | External webhook receiver (webhook.site) required | 15-04 Task 4 checkpoint step 7–8 |
| Real budget-breach end-to-end (BifrostSync → SendAlertService → email + webhook) | ALRT-07, ALRT-08 | Requires live sync pipeline + external webhook receiver | 15-04 Task 4 checkpoint step 11 |
| Failed-delivery "Resend" button regenerates a new `alert_deliveries` row while preserving the old one | ALRT-08 | Requires inducing a real 5xx response | 15-04 Task 4 checkpoint step 12 |
| Dedup prevents duplicate dispatch on repeated sync with unchanged state | ALRT-08 | Requires triggering multiple syncs | 15-04 Task 4 checkpoint step 13 |

All other phase behaviors are covered by the automated commands above.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (frontend tasks share `bun run typecheck && bun run build`; last task is the intentional human checkpoint)
- [x] Wave 0 covers all MISSING references (all new test files enumerated above)
- [x] No watch-mode flags (all commands are one-shot)
- [x] Feedback latency < 15s for quick-scope runs
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-12
