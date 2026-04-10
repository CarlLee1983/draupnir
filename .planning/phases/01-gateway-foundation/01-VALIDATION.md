---
phase: 1
slug: gateway-foundation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-10
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (native) |
| **Config file** | `package.json` (test scripts) |
| **Quick run command** | `bun test tests/Unit/Foundation/LLMGateway` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test tests/Unit/Foundation/LLMGateway`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 1-01-01 | 01-01 | 1 | IFACE-01, IFACE-02, IFACE-03, IFACE-04 | grep + typecheck | `grep 'export interface ILLMGatewayClient' src/Foundation/Infrastructure/Services/LLMGateway/ILLMGatewayClient.ts && bun run typecheck` | ⬜ pending |
| 1-01-02 | 01-01 | 1 | IFACE-01, IFACE-04 | grep + typecheck | `grep 'export.*GatewayError' src/Foundation/Infrastructure/Services/LLMGateway/errors.ts && bun run typecheck` | ⬜ pending |
| 1-02-01 | 01-02 | 2 | ADAPT-01..05 | unit | `bun test tests/Unit/Foundation/LLMGateway/BifrostGatewayAdapter.test.ts` | ⬜ pending |
| 1-03-01 | 01-03 | 2 | ADAPT-04, ADAPT-06 | unit | `bun test tests/Unit/Foundation/LLMGateway/MockGatewayClient.test.ts` | ⬜ pending |
| 1-04-01 | 01-04 | 3 | WIRE-01 | grep + typecheck | `grep 'llmGatewayClient' src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts && bun run typecheck` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **Note:** Wave 0 separate test stubs are NOT required. Plans 01-02 and 01-03 use TDD-within-task (RED→GREEN cycles embedded in each task's action). This fully satisfies Nyquist sampling intent — each task creates its own test file before implementing the code under test. The verify commands in the plans reference actual test locations under `tests/Unit/Foundation/LLMGateway/`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `llmGatewayClient` resolves from DI container | WIRE-01 | Requires running app bootstrap | `bun run src/index.ts` then inspect container resolution log |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify commands (grep assertions + focused test commands)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 not needed — TDD-within-task pattern covers all new files
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending execution
