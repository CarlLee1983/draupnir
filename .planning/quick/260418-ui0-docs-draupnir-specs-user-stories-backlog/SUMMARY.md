---
quick_task: 260418-ui0
status: complete
completed_at: 2026-04-18
commit: null
---

# Summary

## Result

已完成 A3「逾期未扣款 Backfill（Credit + Dashboard）」實作改善。

## What Changed

- `BifrostSyncService` 新增 `backfill(startTime, endTime)`，可用指定時間區間重跑 Bifrost logs，同時保持增量 cursor 不前進。
- Credit 模組新增 `ApplyUsageChargesService`，以 `usage_record.id` 對 deduction 做應用層冪等去重，只補扣尚未入帳的 usage。
- `credit_transactions` 新增 partial unique index，將 `deduction + usage_record` 的唯一性下沉到資料層。
- `DeductCreditService` 對 usage deduction duplicate unique conflict 視為 no-op success，讓正常 sync、backfill 與重跑流程在競態下仍可安全收斂。
- 新增 admin-only `POST /api/dashboard/bifrost-sync/backfill` 手動補救入口。
- 同步更新 `user-stories.md`、`user-stories-index.md`、`user-stories-backlog.md`，新增 `US-CREDIT-007` 並關閉 backlog A3。

## Verification

- `bun test src/Modules/Credit/__tests__/CreditDeductionService.test.ts src/Modules/Credit/__tests__/ApplyUsageChargesService.test.ts src/Modules/Dashboard/__tests__/BifrostSyncService.test.ts`
- `bun x biome lint <changed files>` through targeted changed-file lint: pass
- `bun run typecheck`: blocked by pre-existing repo errors in `src/Website/**`
- `bun run lint`: blocked by pre-existing repo-wide diagnostics outside this change set
- `bun test` exits non-zero under repo `bunfig.toml` because coverage threshold is enforced globally; targeted assertions all pass

## Remaining Risks

- usage deduction 現在已有 DB partial unique index + service no-op 收斂，但 bulk backfill 仍可能受事件平行觸發影響到日誌噪音與額外重試次數。
- Bifrost log backfill 仍受 gateway `limit: 500` 上限影響；若單一時間窗超過 500 筆，需要後續再補 pagination/cursor 能力。
