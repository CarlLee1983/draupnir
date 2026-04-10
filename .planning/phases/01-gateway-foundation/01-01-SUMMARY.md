---
phase: 01-gateway-foundation
plan: "01-01"
subsystem: infra
tags: [typescript, interface, dto, gateway, llm, abstraction]

# Dependency graph
requires: []
provides:
  - ILLMGatewayClient interface with 5 method signatures (createKey, updateKey, deleteKey, getUsageStats, getUsageLogs)
  - Gateway-neutral DTO types: CreateKeyRequest, UpdateKeyRequest, RateLimitUpdate, ProviderConfigUpdate, KeyResponse, UsageQuery, UsageStats, LogEntry
  - GatewayError class with GatewayErrorCode discriminator (6 codes)
  - MockGatewayClient stateful in-memory implementation with calls tracking and failNext injection
  - Barrel export index.ts for the LLMGateway module
affects:
  - 01-02-BifrostGatewayAdapter (implements ILLMGatewayClient)
  - 01-03-MockGatewayClient (already provided here, tests use it)
  - 01-04-DI-Wiring (registers llmGatewayClient singleton)
  - 02-migrations (migrate consumers to use ILLMGatewayClient)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Gateway-neutral interface with camelCase DTOs (snake_case conversion exclusively in adapters)
    - Single GatewayError class with discriminator code field (not tagged union subclasses)
    - MockGatewayClient stateful in-memory implementation with calls getter + failNext queue

key-files:
  created:
    - src/Foundation/Infrastructure/Services/LLMGateway/ILLMGatewayClient.ts
    - src/Foundation/Infrastructure/Services/LLMGateway/types.ts
    - src/Foundation/Infrastructure/Services/LLMGateway/errors.ts
    - src/Foundation/Infrastructure/Services/LLMGateway/index.ts
    - src/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient.ts
  modified:
    - package.json (added check:no-mock-in-src CI script)

key-decisions:
  - "ILLMGatewayClient has 5 methods (createKey, updateKey, deleteKey, getUsageStats, getUsageLogs) — getUsageLogs added for UsageAggregator.getLogs coverage"
  - "UpdateKeyRequest is wide (isActive + rateLimit + providerConfigs) to cover HandleBalanceDepletedService, HandleCreditToppedUpService, and ApiKeyBifrostSync.syncPermissions"
  - "Single GatewayError class with GatewayErrorCode discriminator — not tagged union — to minimize call-site refactor burden"
  - "MockGatewayClient created in Plan 01-01 (not Plan 03) because index.ts barrel export requires the file to exist for tsc to pass"
  - "CI grep check uses grep -v LLMGateway to exclude the implementation directory itself from the runtime-import check"

patterns-established:
  - "All LLMGateway DTO fields use readonly modifier and camelCase naming — no snake_case anywhere in interface surface"
  - "Snake_case conversion happens exclusively inside BifrostGatewayAdapter (Plan 01-02)"
  - "MockGatewayClient.calls getter returns readonly arrays of all received calls per method for test assertions"
  - "MockGatewayClient.failNext(error) queues single-shot GatewayError injections (FIFO)"

requirements-completed: [IFACE-01, IFACE-02, IFACE-03, IFACE-04]

# Metrics
duration: 7min
completed: 2026-04-10
---

# Phase 01 Plan 01: ILLMGatewayClient 介面合約 Summary

**ILLMGatewayClient 介面合約層：5 個方法、8 個 readonly camelCase DTO 類型、GatewayError 判別碼類別、完整 barrel export，附 MockGatewayClient 具狀態 in-memory 實作**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-10T05:36:10Z
- **Completed:** 2026-04-10T05:43:00Z
- **Tasks:** 2
- **Files modified:** 5 created + 1 modified

## Accomplishments

- 定義 `ILLMGatewayClient` 介面：5 個精確指定的方法簽名，全部通過 TypeScript strict 驗證
- 建立 8 個 gateway-neutral DTO 類型（全 `readonly` camelCase），零 snake_case 欄位名稱
- 建立 `GatewayError` 類別：6 個 `GatewayErrorCode` 判別碼，含 `retryable` 旗標供 Credit 模組 retry 邏輯使用
- 建立 `MockGatewayClient`：具狀態 in-memory 實作，含 `calls` getter 與 `failNext` 單次失敗注入
- Barrel export `index.ts` 公開完整 API 表面（含 `MockGatewayClient`，per D-17）
- 新增 `check:no-mock-in-src` CI 腳本防止運行時誤用 MockGatewayClient

## Task Commits

每個 task 都已原子提交：

1. **Task 1: ILLMGatewayClient interface and DTO types** - `59e6cdf` (feat)
2. **Task 2: GatewayError, barrel export, MockGatewayClient** - `a96b9b3` (feat)

## Files Created/Modified

- `src/Foundation/Infrastructure/Services/LLMGateway/types.ts` — 8 個 DTO 介面（CreateKeyRequest, UpdateKeyRequest, RateLimitUpdate, ProviderConfigUpdate, KeyResponse, UsageQuery, UsageStats, LogEntry）
- `src/Foundation/Infrastructure/Services/LLMGateway/ILLMGatewayClient.ts` — 5 個方法簽名的介面合約
- `src/Foundation/Infrastructure/Services/LLMGateway/errors.ts` — GatewayError class + GatewayErrorCode type
- `src/Foundation/Infrastructure/Services/LLMGateway/index.ts` — Barrel export（含 MockGatewayClient，per D-17）
- `src/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient.ts` — 具狀態 in-memory 實作
- `package.json` — 新增 `check:no-mock-in-src` CI 腳本

## Interface Method Signatures

```typescript
interface ILLMGatewayClient {
  createKey(request: CreateKeyRequest): Promise<KeyResponse>
  updateKey(keyId: string, request: UpdateKeyRequest): Promise<KeyResponse>
  deleteKey(keyId: string): Promise<void>
  getUsageStats(keyIds: readonly string[], query?: UsageQuery): Promise<UsageStats>
  getUsageLogs(keyIds: readonly string[], query?: UsageQuery): Promise<readonly LogEntry[]>
}
```

## DTO Type List

| Type | Key Fields |
|------|-----------|
| `CreateKeyRequest` | name, customerId?, isActive?, rateLimit?, providerConfigs? |
| `UpdateKeyRequest` | isActive?, rateLimit?, providerConfigs? |
| `RateLimitUpdate` | tokenMaxLimit?, tokenResetDuration?, requestMaxLimit?, requestResetDuration? |
| `ProviderConfigUpdate` | provider, allowedModels? |
| `KeyResponse` | id, name, value?, isActive |
| `UsageQuery` | startTime?, endTime? |
| `UsageStats` | totalRequests, totalCost, totalTokens, avgLatency |
| `LogEntry` | timestamp, keyId, model, provider, inputTokens, outputTokens, totalTokens, latencyMs, cost, status |

## GatewayErrorCode Values

```typescript
type GatewayErrorCode = 'NOT_FOUND' | 'RATE_LIMITED' | 'VALIDATION' | 'NETWORK' | 'UNAUTHORIZED' | 'UNKNOWN'
```

## MockGatewayClient Barrel Export Confirmation (D-17)

`index.ts` 包含：
```typescript
export { MockGatewayClient } from './implementations/MockGatewayClient'
```

## CI Grep Enforcement

```bash
# 防止 MockGatewayClient 出現在運行時 src/ 代碼（測試以外）
# package.json script: check:no-mock-in-src
! grep -r 'MockGatewayClient' src/ --include='*.ts' -l | grep -v '__tests__' | grep -v 'LLMGateway'
```

## Decisions Made

- **UpdateKeyRequest wide DTO**：包含 `isActive`, `rateLimit`, `providerConfigs` 以覆蓋 HandleBalanceDepletedService, HandleCreditToppedUpService, ApiKeyBifrostSync.syncPermissions — 三個 Phase 2 消費者都需要不同的更新欄位組合
- **LogEntry.status = 'success' | 'error'**：排除 'processing' — 符合 BifrostLogEntry 的 status 轉換需求，已處理中的 logs 不應出現在完成統計中
- **latencyMs 欄位名稱**：使用 `latencyMs` 而非 `latency`（BifrostLogEntry 的名稱），明確表示單位為毫秒

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] MockGatewayClient 實作提前至本 Plan**
- **Found during:** Task 2 (index.ts barrel export creation)
- **Issue:** index.ts 要求 `export { MockGatewayClient } from './implementations/MockGatewayClient'`（per D-17），但該檔案不存在，導致 `tsc --noEmit` 失敗（TS2307: Cannot find module）
- **Fix:** 根據 D-14 至 D-17 的完整規格，在本 Plan 中建立 MockGatewayClient 實作。Plan 文件指定 MockGatewayClient 的完整行為（stateful in-memory, calls getter, failNext queue），屬 Plan 01-01 的輸出項目之一（見 must_haves.truths）。
- **Files modified:** src/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient.ts
- **Verification:** `bun run typecheck` 通過，`bun test tests/Unit/Foundation/` 26 個測試全通過
- **Committed in:** a96b9b3 (Task 2 commit)

**2. [Rule 2 - Missing Critical] CI 腳本排除 LLMGateway 目錄本身**
- **Found during:** Task 2 (CI check verification)
- **Issue:** 計畫規格的 grep 指令 `grep -v '__tests__'` 無法排除 LLMGateway 實作目錄本身（index.ts 和 MockGatewayClient.ts 都含有 'MockGatewayClient'），導致 CI 腳本恆失敗
- **Fix:** 在 grep 鏈中加入 `| grep -v 'LLMGateway'` 以排除合法的實作檔案，只檢測其他 src/ 目錄的誤用
- **Files modified:** package.json
- **Verification:** `bun run check:no-mock-in-src` 通過（exit code 0）
- **Committed in:** a96b9b3 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** 兩個 auto-fix 都是完成 Plan 所必需的。MockGatewayClient 提前建立讓 barrel export 合法；CI 腳本修正讓 enforcement 實際可用。無 scope creep。

## Issues Encountered

None — all blockers resolved via auto-fix deviation rules.

## Known Stubs

None — all exported types are complete interfaces with full field definitions. MockGatewayClient is a complete in-memory implementation, not a stub.

## Next Phase Readiness

- `ILLMGatewayClient` 介面合約穩定，Plan 01-02 可立即實作 `BifrostGatewayAdapter`
- `MockGatewayClient` 已可在 Phase 1 測試中使用（Plan 01-02, 01-03, 01-04 的 unit tests）
- `GatewayError` 映射邏輯（D-10 的 HTTP status → code + retryable）由 BifrostGatewayAdapter 實作（Plan 01-02）
- 無 blockers

---
*Phase: 01-gateway-foundation*
*Completed: 2026-04-10*
