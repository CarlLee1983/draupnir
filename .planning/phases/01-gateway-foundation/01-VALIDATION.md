---
phase: 1
slug: gateway-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| **Quick run command** | `bun test src/Foundation/Infrastructure/Services/LLMGateway` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test src/Foundation/Infrastructure/Services/LLMGateway`
- **After every plan wave:** Run `bun test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | IFACE-01, IFACE-02, IFACE-03, IFACE-04 | unit stub | `bun test src/Foundation/Infrastructure/Services/LLMGateway` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | IFACE-01 | unit | `bun test src/Foundation/Infrastructure/Services/LLMGateway/ILLMGatewayClient.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | ADAPT-01..06 | unit | `bun test src/Foundation/Infrastructure/Services/LLMGateway/implementations/BifrostGatewayAdapter.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 1 | ADAPT-01 | unit | `bun test src/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient.test.ts` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 2 | WIRE-01 | integration | `bun test src/Foundation` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/Foundation/Infrastructure/Services/LLMGateway/__tests__/BifrostGatewayAdapter.test.ts` — stubs for ADAPT-01..ADAPT-06
- [ ] `src/Foundation/Infrastructure/Services/LLMGateway/__tests__/MockGatewayClient.test.ts` — stubs for IFACE-01 (in-memory behavior)
- [ ] `src/Foundation/Infrastructure/Services/LLMGateway/__tests__/ILLMGatewayClient.test.ts` — type contract stubs for IFACE-02..IFACE-04

*Wave 0 installs test stubs before implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `llmGatewayClient` resolves from DI container | WIRE-01 | Requires running app bootstrap | `bun run src/index.ts` then inspect container resolution log |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
