---
phase: "02"
plan: "03"
subsystem: Credit
tags: [migration, llm-gateway, credit-module, gateway-error, retry]
dependency_graph:
  requires: [phase-01-gateway-foundation]
  provides: [credit-module-migrated]
  affects: [HandleBalanceDepletedService, HandleCreditToppedUpService, CreditServiceProvider]
tech_stack:
  added: []
  patterns: [GatewayError.retryable discrimination, ILLMGatewayClient injection, MockGatewayClient test double]
key_files:
  modified:
    - src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts
    - src/Modules/Credit/Application/Services/HandleCreditToppedUpService.ts
    - src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts
    - src/Modules/Credit/__tests__/HandleBalanceDepletedService.test.ts
    - src/Modules/Credit/__tests__/HandleCreditToppedUpService.test.ts
    - src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts
decisions:
  - "HandleCreditToppedUpService.retryPending 不存在，不需套用 D-P02（deferred per CONTEXT.md）"
  - "CreditEventFlow.integration.test.ts 同步更新為 MockGatewayClient（Rule 1 auto-fix：測試傳入錯誤型別導致 updateVirtualKey is not a function）"
metrics:
  duration_minutes: 12
  completed_date: "2026-04-10"
  tasks_completed: 2
  files_modified: 6
---

# Phase 02 Plan 03: Credit Module Migration Summary

Credit 模組從 BifrostClient 遷移至 ILLMGatewayClient 抽象介面，並為 HandleBalanceDepletedService 套用 D-P02 GatewayError.retryable 分辨邏輯。

## What Was Done

### Task 1 — HandleBalanceDepletedService 遷移 + D-P02

- 匯入改為 `ILLMGatewayClient` 和 `GatewayError`（來自 `@/Foundation/Infrastructure/Services/LLMGateway`）
- 建構子參數從 `BifrostClient bifrostClient` 改為 `ILLMGatewayClient gatewayClient`
- `execute()` Step 2: `bifrostClient.updateVirtualKey()` → `gatewayClient.updateKey()` 配合 camelCase `rateLimit` 物件
- `execute()` catch 套用 D-P02：區分 retryable（`console.log` 暫時性）vs 永久性（`console.error` 含 error.code）vs 未知錯誤
- `retryPending()`: 同樣套用 D-P02，retryable 時 `continue`，永久性記錄 error，未知錯誤記錄 error

### Task 2 — HandleCreditToppedUpService + CreditServiceProvider + 測試遷移

- `HandleCreditToppedUpService`: 匯入、建構子從 `BifrostClient` 改為 `ILLMGatewayClient`；updateVirtualKey 改為 updateKey 配合 camelCase `rateLimit`；`requestMaxLimit` 從 `?? null` 改為 spread 模式（`...(preFreeze.rpm != null && { requestMaxLimit, requestResetDuration })`）避免 null 型別衝突
- `CreditServiceProvider`: 兩個 bind 的 `c.make('bifrostClient') as BifrostClient` 改為 `c.make('llmGatewayClient') as ILLMGatewayClient`
- `HandleBalanceDepletedService.test.ts`: 以 `MockGatewayClient` 取代 `vi.fn()` BifrostClient mock；新增 seed createKey 讓 updateKey 不會拋 NOT_FOUND；新增 retryable / 永久性錯誤測試案例
- `HandleCreditToppedUpService.test.ts`: 同樣遷移至 `MockGatewayClient`；改用 `mock.calls.updateKey[0].request.rateLimit?.tokenMaxLimit` 驗證
- `CreditEventFlow.integration.test.ts`（Rule 1 auto-fix）: 同步遷移，見 Deviations

## Verification Results

```
bun test src/Modules/Credit
 45 pass
 0 fail
```

```
bun run typecheck | grep Credit
(zero matches — no Credit-module type errors)
```

```
grep -rn "BifrostClient|bifrostClient" src/Modules/Credit/ | grep -v "bifrostVirtualKeyId"
(zero matches)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CreditEventFlow.integration.test.ts 仍使用 BifrostClient mock**

- **Found during:** Task 2 執行後跑測試時
- **Issue:** `CreditEventFlow.integration.test.ts` 直接將 `BifrostClient` vi.fn() mock 傳給已更新的服務（現在接受 `ILLMGatewayClient`），導致執行期 `updateVirtualKey is not a function` 錯誤；另測試斷言 snake_case 舊欄位名稱（`rate_limit`、`token_max_limit`）
- **Fix:** 遷移整合測試至 `MockGatewayClient`，更新斷言為 `mock.calls.updateKey[0].request.rateLimit?.tokenMaxLimit`；mock.reset() 後重新 seed 供充值階段使用
- **Files modified:** `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts`
- **Commit:** 4a497ad（含於主要 task commit）

## Known Stubs

None — all data flows are wired. MockGatewayClient seed pattern correctly provides deterministic `mock_vk_000001` IDs.

## Self-Check: PASSED

Files exist:
- src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts — FOUND
- src/Modules/Credit/Application/Services/HandleCreditToppedUpService.ts — FOUND
- src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts — FOUND
- src/Modules/Credit/__tests__/HandleBalanceDepletedService.test.ts — FOUND
- src/Modules/Credit/__tests__/HandleCreditToppedUpService.test.ts — FOUND
- src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts — FOUND

Commit exists: 4a497ad — FOUND
