---
quick_task: 260418-vty
status: complete
description: 修正 BifrostSyncService 分頁 PR 的 code review findings
---

# Quick Task 260418-vty: BifrostSyncService 分頁 PR Code Review 修正

## 背景

5afacc5 commit 引入 BifrostSyncService limit+offset 分頁，但 code review 提出三個改進：
1. 測試只覆蓋 backfill 501 筆場景；缺 sync 路徑、剛好 500 筆邊界、跨頁 quarantine。
2. 沒有 MAX_PAGES safety net，若上游有 bug 無限回傳相同頁會跑到 30s timeout 才掛掉。
3. `for (let offset = 0; ; )` 寫法不直覺，改用 `while (true)` + 顯式 `offset += logs.length`。

## Scope

**檔案**：
- `src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts`
- `src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts`

## Tasks

### Task 1: Refactor BifrostSyncService pagination loop

- **檔案**: `src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts`
- **動作**:
  1. 新增常數 `const MAX_SYNC_PAGES = 50`（25,000 筆上限，對齊 30s timeout 實務範圍）。
  2. 將 `for (let offset = 0; ; )` 改為 `let offset = 0; let pageCount = 0; while (true) { ... }`。
  3. 每輪檢查 `pageCount >= MAX_SYNC_PAGES` 時 `console.warn` 並 break，避免上游異常造成失控迴圈。
  4. `offset += logs.length` 與 `pageCount++` 放在迴圈底。
- **Verify**: `bun test src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` 全綠。
- **Done**: 無限 for 消除、MAX_PAGES 安全網到位。

### Task 2: Add test coverage

- **檔案**: `src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts`
- **動作**: 新增以下測試：
  1. **sync-path 分頁**：`sync()`（非 backfill）在 501 筆時也正確分頁，並在多頁後正確推進 cursor 到 windowEndTime 與最後一筆 logId。
  2. **剛好 500 筆邊界**：驗證當 seededLogs 恰好 500 筆時，gateway 被呼叫 2 次（第 2 次 offset=500 回傳 0 後 break），usage_records 寫入 500 筆。
  3. **跨頁 quarantine**：在 501 筆混雜其中部分 virtual key 不存在（如每第 100 筆）時，quarantined 正確累加、synced 也正確累加。
- **Verify**: 三個新測試皆通過。
- **Done**: 測試覆蓋率擴充完成。

### Task 3: Biome lint

- **動作**: 執行 `bun biome check --write` 對兩個變更檔，清理任何格式問題。
- **Verify**: `bun biome check src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts` 無 error。
- **Done**: 無 lint 問題。

## Non-scope

- 不改動 backfill API 契約 / endTime 預設值策略 / timeout 30s（review 的 MEDIUM 項目 "timeout risk for large backfill" 留到後續 follow-up，本次只加 safety net 不改 timeout）。
- 不改動 event endTime 語意（已在 commit 中變更為 windowEndTime，沒有下游破壞）。
