---
phase: 9
slug: cached-sync-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-11
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test + vitest compatible (`describe`, `it`, `expect`, `beforeEach`) |
| **Config file** | None — `bun test src tests/Unit packages` |
| **Quick run command** | `bun test src/Modules/Dashboard/__tests__/ --timeout 10000` |
| **Full suite command** | `bun test src tests/Unit packages` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test src/Modules/Dashboard/__tests__/ --timeout 10000`
- **After every plan wave:** Run `bun test src tests/Unit packages`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | SC-1 | migration smoke | `bun test src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | SC-2 | unit | `bun test src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 1 | SC-2 | unit | `bun test src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` | ❌ W0 | ⬜ pending |
| 09-01-04 | 01 | 1 | SC-2 | unit | `bun test src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | SC-3 | unit | `bun test src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | SC-4 | unit | `bun test src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 1 | SC-2 | unit | `bun test src/Modules/ApiKey/__tests__/ApiKeyRepository.findByBifrostVirtualKeyId.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` — stubs for SC-1, SC-2, SC-4
- [ ] `src/Modules/Dashboard/__tests__/DrizzleUsageRepository.test.ts` — stubs for SC-3, SC-4 (empty table)
- [ ] `src/Modules/Dashboard/__tests__/DrizzleSyncCursorRepository.test.ts` — stubs for cursor advance/read
- [ ] `src/Modules/ApiKey/__tests__/ApiKeyRepository.findByBifrostVirtualKeyId.test.ts` — stubs for new method

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chart query <100ms | SC-3 | Performance timing varies by hardware | Run `bun test` with `--timeout 10000` and inspect timing output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
