---
phase: 02-business-layer-migration
plan: "04"
subsystem: SdkApi
tags: [migration, llm-gateway, query-usage, dependency-inversion]
dependency_graph:
  requires:
    - 01-04 (ILLMGatewayClient, MockGatewayClient, llmGatewayClient singleton)
  provides:
    - SdkApi.QueryUsage 使用 ILLMGatewayClient
  affects:
    - src/Modules/SdkApi/Application/UseCases/QueryUsage.ts
    - src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts
    - src/Modules/SdkApi/__tests__/QueryUsage.test.ts
    - src/Modules/SdkApi/__tests__/SdkApiIntegration.test.ts
tech_stack:
  patterns:
    - ILLMGatewayClient dependency injection via DI container
    - MockGatewayClient with seedUsageStats for test isolation
key_files:
  modified:
    - src/Modules/SdkApi/Application/UseCases/QueryUsage.ts
    - src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts
    - src/Modules/SdkApi/__tests__/QueryUsage.test.ts
    - src/Modules/SdkApi/__tests__/SdkApiIntegration.test.ts
decisions:
  - SdkApiIntegration.test.ts 中的 BifrostClient mock 同步更新為 MockGatewayClient（Rule 1 auto-fix）
  - proxyModelCall binding 保持不變（使用 bifrostBaseUrl string，非 BifrostClient 型別）
metrics:
  duration: 約 5 分鐘
  completed: "2026-04-10T07:27:42Z"
  tasks: 2
  files_modified: 4
---

# Phase 02 Plan 04: SdkApi QueryUsage 遷移至 ILLMGatewayClient

**一句話摘要：** QueryUsage 從 BifrostClient.getLogsStats() 遷移至 ILLMGatewayClient.getUsageStats()，採用 array keyIds 形式及 camelCase stats 欄位，SdkApiServiceProvider 改從 llmGatewayClient DI binding 注入。

## 完成項目

### Task 1: 遷移 QueryUsage use case

`src/Modules/SdkApi/Application/UseCases/QueryUsage.ts`

- 移除 `BifrostClient` import，改用 `ILLMGatewayClient`
- 建構子參數從 `bifrostClient: BifrostClient` 改為 `gatewayClient: ILLMGatewayClient`
- `execute()` 方法：
  - 舊：`bifrostClient.getLogsStats({ virtual_key_ids: auth.bifrostVirtualKeyId, start_time, end_time })`（snake_case）
  - 新：`gatewayClient.getUsageStats([auth.bifrostVirtualKeyId], { startTime, endTime })`（array + camelCase）
  - stats 欄位：`total_requests` → `totalRequests`、`total_cost` → `totalCost` 等全面 camelCase

### Task 2: 更新 DI wiring + 測試遷移

`src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts`

- 移除 `BifrostClient` import，改用 `ILLMGatewayClient`
- `queryUsage` binding 從 `c.make('bifrostClient')` 改為 `c.make('llmGatewayClient')`
- `proxyModelCall` binding 完全不動（使用 bifrostBaseUrl string，不涉及 BifrostClient 型別）

`src/Modules/SdkApi/__tests__/QueryUsage.test.ts`

- 移除 `createMockBifrostClient()` 函數與 `BifrostClient` import
- 改用 `MockGatewayClient` + `seedUsageStats({ totalRequests: 100, ... })`
- 加入 `afterEach(() => mock.reset())` 確保測試隔離
- 驗證 `mock.calls.getUsageStats[0].keyIds` 及 `mock.calls.getUsageStats[0].query?.startTime`
- 錯誤測試改用 `mock.failNext(new GatewayError(...))` 注入失敗

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SdkApiIntegration.test.ts 仍使用舊 BifrostClient mock**

- **Found during:** Task 2 驗證（bun test 顯示整合測試 500 錯誤）
- **Issue:** `SdkApiIntegration.test.ts` 使用 `BifrostClient.getLogsStats` mock 建立 `QueryUsage`，但 `QueryUsage` 建構子已改為接受 `ILLMGatewayClient`，型別不符導致 `execute()` 呼叫失敗
- **Fix:** 替換整合測試中的 mock 為 `MockGatewayClient` + `seedUsageStats({ totalRequests: 50, ... })`，移除 `BifrostClient` import
- **Files modified:** `src/Modules/SdkApi/__tests__/SdkApiIntegration.test.ts`
- **Commit:** 8c9a991（包含在同一 commit）

## 驗證結果

```
bun test src/Modules/SdkApi
 34 pass
 0 fail
Ran 34 tests across 7 files.
```

```
grep -rn "BifrostClient|bifrostClient" src/Modules/SdkApi/ | grep -v "bifrostVirtualKeyId|bifrostBaseUrl"
（零輸出 — 無殘餘引用）
```

TypeScript typecheck：SdkApi 模組零 TS 錯誤（其他模組的錯誤屬於其他 Phase 2 計畫範疇）

## Commit

- `8c9a991`: feat: [ phase-02 ] migrate SdkApi QueryUsage to ILLMGatewayClient

## Self-Check: PASSED

- [x] `src/Modules/SdkApi/Application/UseCases/QueryUsage.ts` 存在且含 `ILLMGatewayClient`
- [x] `src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts` 存在且含 `llmGatewayClient`
- [x] `src/Modules/SdkApi/__tests__/QueryUsage.test.ts` 存在且含 `MockGatewayClient`
- [x] `src/Modules/SdkApi/__tests__/SdkApiIntegration.test.ts` 存在且含 `MockGatewayClient`
- [x] Commit 8c9a991 存在
- [x] 全部 34 個測試通過
