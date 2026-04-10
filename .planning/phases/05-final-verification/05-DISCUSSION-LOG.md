# Phase 5: Final Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 05-final-verification
**Areas discussed:** 驗證排除規則, CONCERNS.md 更新範圍, 發現問題的處理策略

---

## 驗證排除規則

### Grep 範圍

| Option | Description | Selected |
|--------|-------------|----------|
| 嚴格：僅排除 SDK + Adapter (推薦) | grep 排除 packages/bifrost-sdk/ 和 BifrostGatewayAdapter.ts。其他所有在 src/Modules/ 和 src/Foundation/Application/ 中的 BifrostClient/bifrostClient 引用都算違規 | ✓ |
| 寬鬆：額外排除文件名、ErrorCodes、註解 | 除了上述，還排除檔名含 'Bifrost' 的 sync services、ErrorCodes 中的 BIFROST_ERROR/BIFROST_TIMEOUT、以及註解/文件中的 Bifrost 提及 | |
| 最嚴格：僅排除 SDK 包目錄 | 只排除 packages/bifrost-sdk/。連 BifrostGatewayAdapter 也必須通過 | |

**User's choice:** 嚴格：僅排除 SDK + Adapter (推薦)
**Notes:** 無額外說明

### 檔名分類

| Option | Description | Selected |
|--------|-------------|----------|
| 檔名不算違規 (推薦) | grep 只檢查 import 與型別引用，不檢查檔名。檔名重命名是另一個 milestone 的事 | ✓ |
| 檔名也算違規 | 檔名含 Bifrost 代表語義耦合。這個 phase 應該標記它們為待處理項目 | |

**User's choice:** 檔名不算違規 (推薦)
**Notes:** 無額外說明

### ErrorCodes 處理

| Option | Description | Selected |
|--------|-------------|----------|
| 本次不處理 (推薦) | ErrorCodes 位於 Shared 層而非 Module/Application 層。且重命名錯誤碼是破壞性變更 | ✓ |
| 標記為待處理 | 在 CONCERNS.md 中註記這個殘留項目，但不在本 phase 修改 | |
| 本次重命名 | 將 BIFROST_ERROR → GATEWAY_ERROR、BIFROST_TIMEOUT → GATEWAY_TIMEOUT | |

**User's choice:** 本次不處理 (推薦)
**Notes:** 無額外說明

---

## CONCERNS.md 更新範圍

### #1/#2/#3 更新方式

| Option | Description | Selected |
|--------|-------------|----------|
| 標記已解決 + 簡短摘要 (推薦) | 保留原始條目但加上 ✅ Resolved 標記、解決日期、和 1-2 行摘要說明如何解決的 | ✓ |
| 完全改寫為新狀態 | 不保留舊描述，將 #1/#2/#3 改寫為反映當前架構狀態的新文件 | |
| 刪除已解決條目 | 直接移除 #1/#2/#3，只保留未解決的條目 | |

**User's choice:** 標記已解決 + 簡短摘要 (推薦)
**Notes:** 無額外說明

### #6 處理

| Option | Description | Selected |
|--------|-------------|----------|
| 部分更新 (推薦) | 標記 #6 為「部分解決」— proxy URL 已移入 SDK，但 BIFROST_* 環境變數名和 ErrorCodes 仍然存在 | ✓ |
| 不處理 #6 | QUAL-05 只要求 #1/#2/#3。#6 不在本 phase 範圍內 | |
| 全部更新 | 順便檢查所有 17 個 concerns，更新任何被這個 milestone 影響的條目 | |

**User's choice:** 部分更新 (推薦)
**Notes:** 無額外說明

---

## 發現問題的處理策略

### 修復策略

| Option | Description | Selected |
|--------|-------------|----------|
| 直接修復 (推薦) | Phase 5 包含驗證 + 小修復。如果 grep 找到殘留引用或 lint/typecheck 有錯，直接修 | ✓ |
| 僅報告，不修復 | 生成完整的驗證報告。任何失敗項目標記為 blockers，但不自動修復 | |
| 分級處理 | 小問題直接修。大問題報告後等確認 | |

**User's choice:** 直接修復 (推薦)
**Notes:** 無額外說明

### any 審查方式

| Option | Description | Selected |
|--------|-------------|----------|
| Git diff 審查 (推薦) | 對比 master 分支的 diff，grep 新增行中的 'any' 和 '@ts-ignore'。只檢查本 milestone 引入的變更 | ✓ |
| 全局 grep | 在整個 src/ 和 packages/ 中 grep 'any' 和 '@ts-ignore'，報告所有出現 | |

**User's choice:** Git diff 審查 (推薦)
**Notes:** 無額外說明

---

## Claude's Discretion

- 驗證步驟的執行順序
- 修復的 commit 粒度
- CONCERNS.md 解決摘要的詳細程度

## Deferred Ideas

- ErrorCodes 常數重命名 (BIFROST_ERROR → GATEWAY_ERROR)
- Bifrost 相關檔名重命名 (ApiKeyBifrostSync.ts 等)
- BIFROST_* 環境變數重命名
- 完整 CONCERNS.md 審計
