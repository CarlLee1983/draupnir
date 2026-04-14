---
phase: 01-gateway-foundation
plan: "01-03"
subsystem: testing
tags: [typescript, mock, test-double, gateway, llm, tdd, unit-test]

# Dependency graph
requires:
  - phase: 01-gateway-foundation/01-01
    provides: ILLMGatewayClient interface, GatewayError class, MockGatewayClient in-memory implementation
provides:
  - MockGatewayClient with reset(), seedUsageStats(), seedUsageLogs() instance methods
  - 30 unit tests covering all MockGatewayClient behaviors (createKey, updateKey, deleteKey, getUsageStats, getUsageLogs, calls, failNext, reset)
  - Validated mock_raw_key_000001 value format for createKey responses
affects:
  - 01-02-BifrostGatewayAdapter (uses MockGatewayClient in unit tests)
  - 01-04-DI-Wiring (uses MockGatewayClient in unit tests)
  - 02-migrations (Phase 2 tests use MockGatewayClient instead of mocking BifrostClient)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - MockGatewayClient.reset() for clean test isolation without creating new instances
    - seedUsageStats()/seedUsageLogs() instance methods for configuring return values (not constructor params)
    - Direct import from implementations/ path in tests (not barrel) for test-only usage discipline
    - TDD RED-GREEN sequence for stateful test double development

key-files:
  created:
    - tests/Unit/Foundation/LLMGateway/MockGatewayClient.test.ts
  modified:
    - src/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient.ts

key-decisions:
  - "seedUsageStats()/seedUsageLogs() as instance methods (not constructor params) — allows reset() to restore to zero-defaults cleanly without reconstructing the mock"
  - "value format mock_raw_key_000001 (underscores, zero-padded) per D-14 spec — aligns with monotonic ID format mock_vk_000001"
  - "reset() clears failQueue via failQueue.length = 0 — avoids array replacement to preserve readonly modifier"

patterns-established:
  - "Tests import MockGatewayClient directly from implementations/MockGatewayClient — not via barrel index.ts"
  - "beforeEach calls mock = new MockGatewayClient() — new instance per test; reset() available when reusing"
  - "failNext FIFO queue enables multi-error retry-logic testing without extra mocking infrastructure"

requirements-completed: [ADAPT-04, ADAPT-06]

# Metrics
duration: 8min
completed: 2026-04-10
---

# Phase 01 Plan 03: MockGatewayClient 單元測試 Summary

**MockGatewayClient 完整測試套件：30 個單元測試覆蓋具狀態 in-memory 行為、呼叫追蹤、FIFO 失敗注入、reset 與 seed 方法，並更新實作以符合 D-14 規格**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-10T08:15:00Z
- **Completed:** 2026-04-10T08:23:00Z
- **Tasks:** 1
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- 建立 `tests/Unit/Foundation/LLMGateway/MockGatewayClient.test.ts`：30 個測試全覆蓋 createKey（自增 ID、isActive 預設、value 格式）、updateKey（合併語義、NOT_FOUND 錯誤）、deleteKey（狀態移除）、getUsageStats/getUsageLogs（種子資料）、calls getter（所有 5 個方法）、failNext（FIFO 隊列、drain-after-throw、多錯誤排隊）、reset（清除所有狀態）
- 更新 `MockGatewayClient.ts`：新增 `reset()` 方法、`seedUsageStats()` 與 `seedUsageLogs()` 實例方法、修正 `value` 欄位格式為 `mock_raw_key_000001`（原為 `mock-key-value-${id}`）
- 確認測試從 `implementations/MockGatewayClient` 直接匯入（非 barrel），符合 D-17 規範

## Task Commits

每個 task 都已原子提交：

1. **Task 1: MockGatewayClient 具狀態實作與單元測試 (TDD)** - `a41bfa4` (feat)

## Files Created/Modified

- `tests/Unit/Foundation/LLMGateway/MockGatewayClient.test.ts` — 30 個 Bun 測試，涵蓋 MockGatewayClient 所有行為
- `src/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient.ts` — 新增 reset()、seedUsageStats()、seedUsageLogs()；修正 value 格式

## Internal State Model

MockGatewayClient 的內部狀態由以下構成：

| 狀態 | 類型 | 說明 |
|------|------|------|
| `keys` | `Map<string, StoredKey>` | 已建立的虛擬鍵映射（以 ID 為鍵） |
| `idCounter` | `number` | 單調遞增 ID 計數器（1 → mock_vk_000001） |
| `failQueue` | `GatewayError[]` | FIFO 失敗注入佇列 |
| `seededStats` | `UsageStats` | getUsageStats() 的回傳值（預設零值） |
| `seededLogs` | `readonly LogEntry[]` | getUsageLogs() 的回傳值（預設空陣列） |
| `_calls` | Object of arrays | 每個方法的呼叫記錄 |

## calls Getter Structure

```typescript
mock.calls.createKey    // readonly CreateKeyRequest[]
mock.calls.updateKey    // readonly { keyId: string; request: UpdateKeyRequest }[]
mock.calls.deleteKey    // readonly string[]
mock.calls.getUsageStats // readonly { keyIds: readonly string[]; query?: UsageQuery }[]
mock.calls.getUsageLogs  // readonly { keyIds: readonly string[]; query?: UsageQuery }[]
```

## failNext API

```typescript
// 單次失敗注入
mock.failNext(new GatewayError('rate limited', 'RATE_LIMITED', 429, true))
const result = await mock.createKey(...)  // throws GatewayError
const ok = await mock.createKey(...)     // succeeds (queue drained)

// 多次 FIFO 排隊
mock.failNext(error1)
mock.failNext(error2)
await mock.anyMethod()  // throws error1
await mock.anyMethod()  // throws error2
await mock.anyMethod()  // succeeds
```

## Test Count

**30 個單元測試**，分佈：
- createKey: 6 個測試
- updateKey: 3 個測試
- deleteKey: 2 個測試
- getUsageStats: 3 個測試
- getUsageLogs: 3 個測試
- calls getter: 2 個測試
- failNext: 4 個測試
- reset: 7 個測試

## Barrel Export Confirmation (D-17)

`index.ts` 包含（已由 01-01 建立，本 plan 驗證）：
```typescript
export { MockGatewayClient } from './implementations/MockGatewayClient'
```

## Decisions Made

- **seedUsageStats/seedUsageLogs 為實例方法**：計畫原稿範例使用建構子參數，但實例方法允許 `reset()` 正確還原為零值預設，且在 `beforeEach` 使用同一實例時更具彈性
- **value 格式更正**：01-01 實作使用 `mock-key-value-${id}`（連字符），D-14 規格要求 `mock_raw_key_000001`（底線、零填補）— 統一格式提升測試可讀性

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 更新 MockGatewayClient 以符合 plan 01-03 規格**
- **Found during:** Task 1 (TDD RED phase)
- **Issue:** 01-01 中建立的 MockGatewayClient 缺少 `reset()` 方法、`seedUsageStats()` 與 `seedUsageLogs()` 實例方法，且 `value` 格式使用 `mock-key-value-${id}` 而非規格的 `mock_raw_key_000001`
- **Fix:** 更新 MockGatewayClient：新增 `reset()`、`seedUsageStats()`、`seedUsageLogs()` 方法；修正 value 格式
- **Files modified:** src/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient.ts
- **Verification:** 30/30 測試通過；typecheck 只剩預存在的 routes-connectivity.e2e.ts 錯誤（非本 plan 範疇）
- **Committed in:** a41bfa4 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix 必要以符合 01-03 的完整規格。01-01 建立了基礎實作但缺少部分方法。無 scope creep。

## Issues Encountered

工作樹 (worktree) 在 `worktree-agent-a279af67` 分支，缺少 01-01 的 LLMGateway 檔案。透過 `git rebase master` 取得 01-01 的產出後繼續執行。

## Known Stubs

None — MockGatewayClient 是完整的 in-memory 實作，所有方法均完全實現。測試覆蓋所有公開行為。

## Next Phase Readiness

- `MockGatewayClient` 完整實作（含 reset、seed 方法）可供 Phase 2 遷移測試使用
- Phase 2 消費者（ApiKeyBifrostSync、AppKeyBifrostSync、GetAppKeyUsageService、QueryUsage、UsageAggregator）可使用 MockGatewayClient 取代 BifrostClient mock
- 測試模式建立：`new MockGatewayClient()` + `mock.calls.*` + `mock.failNext()` + `mock.reset()`

---
*Phase: 01-gateway-foundation*
*Completed: 2026-04-10*
