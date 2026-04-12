# Phase 18: Uniform Background Jobs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 18-uniform-background-jobs
**Areas discussed:** Task runner 選型, Job 註冊模式, 重試與失敗恢復語意, 遷移範圍與行為保留

---

## Task Runner 選型

| Option | Description | Selected |
|--------|-------------|----------|
| IScheduler 抽象 + 包裝 croner | 建立 IScheduler port，沿用 croner 底層；加重試/觀測/可測試性 | ✓ |
| IScheduler 抽象 + 包裝 Bun.cron | 移除 croner 依賴，但 Bun.cron per-job timezone 支援不全 | |
| 直接用 croner 無抽象層 | 最少變更但不滿足 "Bun.cron or similar" 的可替換暗示 | |

**User's choice:** IScheduler 抽象 + 包裝 croner
**Notes:** 保留 croner timezone 能力，抽象層用於統一進入點與未來可切換

---

## Job 註冊模式

| Option | Description | Selected |
|--------|-------------|----------|
| ServiceProvider.registerJobs(scheduler) hook | 每模組在自己的 provider 宣告 jobs，bootstrap 遍歷呼叫 | ✓ |
| 集中 JobRegistry file | 所有任務集中，但破壞模組邊界 | |
| config-driven jobs.config.ts | 過度工程化，無法表達動態 schedule（Reports 模組需要） | |

**User's choice:** ServiceProvider.registerJobs hook
**Notes:** 符合 DDD 模組解耦原則，Phase 19 Alerts 可沿用

---

## 重試與失敗恢復語意 (JOBS-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Per-job maxRetries + exponential backoff | 每 job 可配置 {maxRetries, backoffMs}，背景重試，窮盡則 error log | ✓ |
| 全域預設 (3 retries, 2→4→8s) + opt-out | 類似方案但以全域預設為主 | |
| 僅 try/catch + log | 最簡但可能不滿足 JOBS-04 驗收 | |

**User's choice:** Per-job 配置上限重試 + exponential backoff
**Notes:** 無持久化，進程重啟後下次 tick 重跑；配合冪等 handler

---

## 遷移範圍與行為保留

### Q1: BifrostSync 行為保留
| Option | Description | Selected |
|--------|-------------|----------|
| runOnInit: true + cron "*/5 * * * *" | 保留啟動時立即同步行為，但用 cron 取代 setInterval ms | ✓ |
| 保留 setInterval 風格間隔 API | scheduler 同時支援兩種模式，複雜度高 | |
| 僅用 cron，移除 runOnInit | 啟動後最多 5 分鐘內 dashboard 無資料 | |

**User's choice:** runOnInit: true + cron
**Notes:** BIFROST_SYNC_INTERVAL_MS 以 BIFROST_SYNC_CRON 取代

### Q2: 遷移範圍
| Option | Description | Selected |
|--------|-------------|----------|
| 僅 BifrostSync + ScheduleReportService | grep 確認這是全部定時邏輯 | ✓ |
| 包含 Alerts 相關定時邏輯 | 與 Phase 19 衝突 | |
| 深度掃查再決定 | researcher 先確認 | |

**User's choice:** 僅這兩個
**Notes:** 已在本次 discussion 中 grep 確認

---

## Claude's Discretion

- IScheduler 檔案放置路徑（Foundation vs Shared）
- 測試策略細節（Fake/Mock、手動 trigger）
- BIFROST_SYNC_CRON env var 解析位置
- runOnInit 失敗是否阻塞 cron
- ReportsServiceProvider `boot()` / `registerJobs()` 的最終分工

## Deferred Ideas

- Dynamic schedule 更完整 API（batch reschedule）
- 正式測試策略文件
- Alert webhook on job failure（Phase 19 後）
- Redis/BullMQ 持久化（v2+）
- 分散式任務排隊（v2+）
- Alerts 模組 cooldown 定時邏輯統一（Phase 19）
