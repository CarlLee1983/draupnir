---
phase: 2
slug: business-layer-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (native) |
| **Config file** | `package.json` (bun test script) |
| **Quick run command** | `bun test src/Modules/ApiKey src/Modules/AppApiKey src/Modules/Credit src/Modules/Dashboard src/Modules/SdkApi --timeout 10000` |
| **Full suite command** | `bun test --timeout 30000` |
| **Estimated runtime** | ~15 seconds (quick), ~45 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run quick module-scoped test command
- **After every plan wave:** Run `bun test --timeout 30000`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | MIGRATE-01 | unit | `bun test src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts` | ✅ | ⬜ pending |
| 2-01-02 | 01 | 1 | TEST-01 | unit | `bun test src/Modules/ApiKey/__tests__/` | ✅ | ⬜ pending |
| 2-02-01 | 02 | 1 | MIGRATE-02 | unit | `bun test src/Modules/AppApiKey/__tests__/` | ✅ | ⬜ pending |
| 2-02-02 | 02 | 1 | TEST-01 | unit | `bun test src/Modules/AppApiKey/__tests__/` | ✅ | ⬜ pending |
| 2-03-01 | 03 | 1 | MIGRATE-03,MIGRATE-04 | unit | `bun test src/Modules/Credit/__tests__/` | ✅ | ⬜ pending |
| 2-03-02 | 03 | 1 | TEST-01 | unit | `bun test src/Modules/Credit/__tests__/` | ✅ | ⬜ pending |
| 2-04-01 | 04 | 1 | MIGRATE-05,MIGRATE-06 | unit | `bun test src/Modules/Dashboard/__tests__/` | ✅ | ⬜ pending |
| 2-04-02 | 04 | 1 | TEST-01 | unit | `bun test src/Modules/Dashboard/__tests__/` | ✅ | ⬜ pending |
| 2-05-01 | 05 | 2 | WIRE-02,WIRE-03,WIRE-04,WIRE-05,WIRE-06 | integration | `bun test src/Foundation/__tests__/ --timeout 15000` | ✅ | ⬜ pending |
| 2-05-02 | 05 | 2 | TEST-03 | integration | `bun test --timeout 30000` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed — all test files already exist and need only mock migration from `BifrostClient` vi.fn() patterns to `MockGatewayClient`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `syncPermissions` preserves model-allowlist + rate-limit sync behavior end-to-end | MIGRATE-07 | Requires live Bifrost gateway connection | Run against dev Bifrost instance with a real virtual key; confirm `updateKey` call carries correct `providerConfigs` and `rateLimit` fields |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
