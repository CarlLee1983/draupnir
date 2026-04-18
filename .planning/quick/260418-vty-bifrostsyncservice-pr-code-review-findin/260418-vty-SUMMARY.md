---
quick_task: 260418-vty
status: complete
completed_at: 2026-04-18
commit: 8de9b87
---

# Summary

修正 5afacc5（Bifrost usage log 分頁）code review 提出的三個改進項目，提升分頁流程的
韌性與測試覆蓋率。

## Changes

- `BifrostSyncService` 將 `for (let offset = 0; ; )` 無限 for 改寫為 `while (true)`
  搭配顯式 `offset += logs.length` / `pageCount++`，提升可讀性。
- 新增 `MAX_SYNC_PAGES = 50` safety net（最多 25,000 筆）：當 upstream 異常造成分頁
  迴圈無法自然終止時主動 `console.warn` 並 break，不再只靠 30s timeout 救援。
- 三個新測試補齊覆蓋：
  1. `sync()` 非 backfill 路徑多頁分頁，確認 cursor 推進到 `windowEndTime` 與最後一筆
     logId（`log-501`），兩頁共用同一 `windowEndTime` 快照。
  2. 剛好 500 筆邊界：確認呼叫 2 次 gateway（第二次 offset=500 回傳 0 後 break）。
  3. 跨頁 quarantine：501 筆裡每 100 筆一個 unknown virtual key，synced=496、
     quarantined=5 正確累計，且第一頁含 quarantined log 不影響第二頁抓取。

## Verification

- `bun test src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts`：15 pass / 0 fail，
  `BifrostSyncService.ts` 100% line coverage。
- Biome lint：預先存在的格式問題（與本次修改無關）。

## Remaining Risks

- 30s timeout 對超大 backfill 仍可能過嚴（code review 原先 MEDIUM 項目），本次僅加
  safety net 不調整 timeout；若後續出現手動 backfill 常 timeout，再開 follow-up。
- `MAX_SYNC_PAGES=50` 為硬編碼，暫時滿足實務需求；若未來資料量成長可改為設定項。
