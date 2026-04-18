---
quick_task: 260418-ui0
status: complete
title: A3 逾期未扣款 Backfill（Credit + Dashboard）
created_at: 2026-04-18
source: docs/draupnir/specs/user-stories-backlog.md
---

# Plan

## Goal

補上 Bifrost usage sync 的範圍 backfill 與遺漏扣款收斂，讓 admin 能手動指定時間區間重跑，
且同一批 usage 在正常 sync / backfill / 重跑之間都不會重複扣款。

## Constraints

- 不新增 dependencies。
- 沿用現有 Dashboard / Credit / DDD 模組邊界與 route pattern。
- 變更必須可重跑、可回滾、可由測試證明 idempotency。

## Implementation Outline

1. 先補測試，鎖定兩個行為：
   - Bifrost sync 支援指定 `startTime` / `endTime` 的 backfill，不推進增量 cursor。
   - 同一筆 usage 即使 sync/backfill 重跑，也只會建立一次 deduction。
2. 在 Credit 模組新增「套用未扣 usage」服務，按 org 掃描 `usage_records`，用 `referenceType=usage_record`
   與 `referenceId=usage_record.id` 做去重，再透過 `DeductCreditService` 補扣。
3. 在 Dashboard 模組擴充 `BifrostSyncService`：
   - 抽共用 range sync 路徑
   - 新增 `backfill(startTime, endTime)`
   - backfill 不推進 cursor，但會 dispatch `BifrostSyncCompletedEvent`
4. 新增 admin-only manual endpoint，驗證時間範圍並回傳 synced / quarantined / charged 統計。
5. 更新 backlog / user story 文件與 quick summary，跑 typecheck/lint/tests。

## Verification

- `bun test src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts`
- `bun test src/Modules/Credit/__tests__/ApplyUsageChargesService.test.ts`
- `bun run typecheck`
- `bun run lint`
