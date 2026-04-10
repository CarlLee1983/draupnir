---
phase: 02-business-layer-migration
plan: "01"
subsystem: AppApiKey
tags: [migration, llm-gateway, app-api-key, dependency-inversion]
dependency_graph:
  requires:
    - 01-04 (ILLMGatewayClient, MockGatewayClient, llmGatewayClient singleton)
  provides:
    - AppApiKey.AppKeyBifrostSync 使用 ILLMGatewayClient
    - AppApiKey.GetAppKeyUsageService 使用 ILLMGatewayClient
  affects:
    - src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts
    - src/Modules/AppApiKey/Application/Services/GetAppKeyUsageService.ts
    - src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts
    - src/Modules/AppApiKey/__tests__/GetAppKeyUsageService.test.ts
    - src/Modules/AppApiKey/__tests__/IssueAppKeyService.test.ts
    - src/Modules/AppApiKey/__tests__/RevokeAppKeyService.test.ts
    - src/Modules/AppApiKey/__tests__/RotateAppKeyService.test.ts
tech_stack:
  patterns:
    - ILLMGatewayClient dependency injection via DI container
    - MockGatewayClient with seedUsageStats for test isolation
    - MockGatewayClient key store seeding for updateKey existence checks
key_files:
  modified:
    - src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts
    - src/Modules/AppApiKey/Application/Services/GetAppKeyUsageService.ts
    - src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts
    - src/Modules/AppApiKey/__tests__/GetAppKeyUsageService.test.ts
    - src/Modules/AppApiKey/__tests__/IssueAppKeyService.test.ts
    - src/Modules/AppApiKey/__tests__/RevokeAppKeyService.test.ts
    - src/Modules/AppApiKey/__tests__/RotateAppKeyService.test.ts
decisions:
  - RevokeAppKeyService/RotateAppKeyService 測試因建構子簽章變更同步遷移（Rule 1 auto-fix）
  - RevokeAppKeyService 測試須預先 seed mock store key，因為 MockGatewayClient.updateKey 要求 key 存在
metrics:
  duration: 約 10 分鐘
  completed: "2026-04-10T07:29:00Z"
  tasks: 2
  files_modified: 7
---

# Phase 02 Plan 01: AppApiKey 模組遷移至 ILLMGatewayClient

**一句話摘要：** AppKeyBifrostSync 和 GetAppKeyUsageService 從 BifrostClient 遷移至 ILLMGatewayClient，snake_case Bifrost 欄位全面改為 camelCase，AppApiKeyServiceProvider 改從 llmGatewayClient DI binding 注入，5 個測試檔案移除所有 vi.fn() BifrostClient mock，改用 MockGatewayClient。

## 完成項目

### Task 1: 遷移 AppKeyBifrostSync 和 GetAppKeyUsageService

`src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts`

- 移除 `BifrostClient` import，改用 `ILLMGatewayClient`
- 建構子參數從 `bifrostClient: BifrostClient` 改為 `gatewayClient: ILLMGatewayClient`
- `createVirtualKey()`: `bifrostClient.createVirtualKey({ name, customer_id })` → `gatewayClient.createKey({ name, customerId })`，回傳欄位 `vk.id` / `vk.value` 保持不變
- `deactivateVirtualKey()`: `bifrostClient.updateVirtualKey(id, { is_active: false })` → `gatewayClient.updateKey(id, { isActive: false })`
- `deleteVirtualKey()`: `bifrostClient.deleteVirtualKey(id)` → `gatewayClient.deleteKey(id)`

`src/Modules/AppApiKey/Application/Services/GetAppKeyUsageService.ts`

- 移除 `BifrostClient` import，改用 `ILLMGatewayClient`
- 建構子參數從 `bifrostClient` 改為 `gatewayClient`
- 查詢方法：`bifrostClient.getLogsStats({ virtual_key_ids, start_time, end_time })` → `gatewayClient.getUsageStats([key.bifrostVirtualKeyId], { startTime, endTime })`
- stats 欄位：`total_requests` → `totalRequests`、`total_tokens` → `totalTokens`、`total_cost` → `totalCost`

### Task 2: 更新 DI wiring + 測試遷移

`src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts`

- 移除 `BifrostClient` import，改用 `ILLMGatewayClient`
- `appKeyBifrostSync` singleton：`c.make('bifrostClient')` → `c.make('llmGatewayClient')`
- `getAppKeyUsageService` binding：`c.make('bifrostClient')` → `c.make('llmGatewayClient')`

`src/Modules/AppApiKey/__tests__/GetAppKeyUsageService.test.ts`

- 移除 `createMockBifrostClient()` 與 `BifrostClient` import
- 加入 `MockGatewayClient` + `seedUsageStats({ totalRequests: 42, totalCost: 0.56, totalTokens: 12345, avgLatency: 150 })`
- 加入 `afterEach(() => mock.reset())` 確保測試隔離
- 驗證 `mock.calls.getUsageStats[0].keyIds` 包含 `key.bifrostVirtualKeyId`

`src/Modules/AppApiKey/__tests__/IssueAppKeyService.test.ts`

- 移除 `BifrostClient` import 及 vi.fn() mock
- `createMockSync()` 改用 `new MockGatewayClient()`
- 失敗路徑改用 `gatewayMock.failNext(new GatewayError('Bifrost 連線失敗', 'NETWORK', 503, true))`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RevokeAppKeyService.test.ts 和 RotateAppKeyService.test.ts 因 AppKeyBifrostSync 建構子簽章變更而失效**

- **Found during:** Task 1 — bun test 顯示 3 個測試失敗（RevokeAppKeyService 1 個、RotateAppKeyService 2 個）
- **Issue:** 兩個測試檔案的 `createMockSync()` 建立了舊格式的 BifrostClient vi.fn() mock 並傳入 `new AppKeyBifrostSync(mockClient)`。修改後的 AppKeyBifrostSync 建構子接受 `ILLMGatewayClient`，型別不符導致 `deactivateVirtualKey()` 和 `createVirtualKey()` 失敗
- **Fix:** 兩個測試檔案均遷移為 `MockGatewayClient`；RevokeAppKeyService 測試須預先呼叫 `await gatewayMock.createKey(...)` 以在 mock store 建立對應 key，避免 `updateKey` 拋出 NOT_FOUND 錯誤
- **Files modified:** `src/Modules/AppApiKey/__tests__/RevokeAppKeyService.test.ts`、`src/Modules/AppApiKey/__tests__/RotateAppKeyService.test.ts`
- **Commit:** 459a605（包含在同一 commit）

## 驗證結果

```
bun test src/Modules/AppApiKey
 52 pass
 0 fail
Ran 52 tests across 9 files.
```

```
grep -rn "BifrostClient|bifrostClient" src/Modules/AppApiKey/ | grep -v "bifrostVirtualKeyId|bifrostKeyValue|previousBifrostVirtualKeyId"
（零輸出 — 無殘餘引用）
```

TypeScript typecheck：AppApiKey 模組零 TS 錯誤（其他模組錯誤屬於其他 Phase 2 計畫範疇）

## Commit

- `459a605`: docs(02-04): complete SdkApi QueryUsage migration plan summary（AppApiKey 遷移在此 commit 內包含）

## Self-Check: PASSED

- [x] `src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts` 含 `ILLMGatewayClient`，不含 `BifrostClient`
- [x] `src/Modules/AppApiKey/Application/Services/GetAppKeyUsageService.ts` 含 `getUsageStats` 和 `totalRequests`
- [x] `src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts` 含 `llmGatewayClient`
- [x] `src/Modules/AppApiKey/__tests__/GetAppKeyUsageService.test.ts` 含 `MockGatewayClient`，不含 `createMockBifrostClient`
- [x] `src/Modules/AppApiKey/__tests__/IssueAppKeyService.test.ts` 不含 `BifrostClient` import
- [x] 全部 52 個測試通過
