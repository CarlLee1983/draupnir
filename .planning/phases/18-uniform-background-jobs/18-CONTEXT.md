# Phase 18: Uniform Background Jobs - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

建立統一的 background job 運行器抽象層（IScheduler），並將現有兩個散佈定時邏輯遷入：
1. `src/bootstrap.ts` 中驅動 `BifrostSyncService.sync()` 的 `setInterval`
2. `ScheduleReportService`（croner-based）從 `ReportsServiceProvider.boot()` 遷出

本階段交付：
- `IScheduler` port + `CronerScheduler` 實作（包裝既有 croner 依賴）
- ServiceProvider 生命週期新增 `registerJobs(scheduler)` hook
- 支援 per-job 重試上限 + exponential backoff
- BifrostSync 與 Reports 兩個現有任務完全遷移，`bootstrap.ts` 中無 `setInterval`

**不涵蓋：** Redis 持久化、BullMQ、分散式排隊、Alerts 模組重構（Phase 19）、新增任務類型。

</domain>

<decisions>
## Implementation Decisions

### Task Runner 選型
- **D-01:** 建立 `IScheduler` port（Foundation 層），以便未來可切換實作而不改動呼叫端
- **D-02:** 第一個實作為 `CronerScheduler`，內部沿用既有 `croner` (`Cron`) 依賴；保留 croner 的 timezone 解析能力（ScheduleReportService 依賴）
- **D-03:** 不引入 Bun.cron（API 不完整，尤其缺乏 per-job timezone 完整支援）。REQUIREMENTS.md JOBS-01 所謂 "Bun.cron or similar" 以「統一抽象」為實質目標，而非強制 Bun.cron 實作
- **D-04:** 不移除 `croner` 依賴。它是合適的底層，抽象層只是隔離它

### Job 註冊模式
- **D-05:** 每個需排程的模組在其 `ServiceProvider` 新增 `registerJobs(scheduler: IScheduler)` 方法
- **D-06:** `bootstrap.ts` 在 `core.bootstrap()` 之後、`registerRoutes()` 之後，以一個集中循環呼叫所有 provider 的 `registerJobs(scheduler)`
- **D-07:** 不做中央 `JobRegistry` 檔案（打破模組邊界）；不做 config-driven jobs（ScheduleReportService 需從 DB 動態建/刪 schedule，config 無法表達）
- **D-08:** `IServiceProvider`/`GravitoServiceProviderAdapter` 需同步新增選用的 `registerJobs` 介面；未實作的 provider 忽略

### Retry & 失敗恢復語意 (JOBS-04)
- **D-09:** `IScheduler.schedule()` 接受 `{ maxRetries: number, backoffMs: number }` 選項（可選，不設則不重試）
- **D-10:** 失敗定義：handler 拋出 exception 或 returned Promise rejected
- **D-11:** 重試策略：exponential backoff，`backoffMs * 2^attempt`；背景計時執行重試（不阻塞下一 tick）
- **D-12:** 窮盡重試後：以 `console.error` 寫入 structured log（`[Scheduler] Job '{name}' exhausted {N} retries:`）。不發 alert webhook（避免 Phase 19 前循環依賴）
- **D-13:** 無持久化；進程重啟後任務下次 cron tick 時重新執行（at-most-once per tick，配合冪等 handler）
- **D-14:** 每個 scheduled job 需有唯一 `name` 字串，用於 logging 與重試追蹤

### 現有任務遷移
- **D-15:** BifrostSync 遷移：`IScheduler.schedule({ name: 'bifrost-sync', cron: '*/5 * * * *', runOnInit: true, maxRetries: 2, backoffMs: 2000 }, () => syncService.sync())`
- **D-16:** `BIFROST_SYNC_INTERVAL_MS` env var 以 `BIFROST_SYNC_CRON`（cron expression）取代；預設 `*/5 * * * *`。deprecation 以 release note 說明（non-breaking，僅 internal env）
- **D-17:** 目前 `bootstrap.ts:80-87` 的 `setInterval` 完全移除；`bootstrap.ts:75-77` 的 initial `syncService.sync()` 以 `runOnInit: true` 取代
- **D-18:** ScheduleReportService 改為 `CronerScheduler` 的薄包裝：移除內部 `jobs: Map<string, Cron>`，改持有 `IScheduler` 並用動態 schedule/unschedule API
- **D-19:** `ReportsServiceProvider.boot()` 中的 bootstrap schedules 呼叫移到新的 `registerJobs()` hook
- **D-20:** 遷移範圍僅此兩處（已 grep 確認）；Alerts 模組中任何 scheduling 保留給 Phase 19

### IScheduler 介面最小面

必須包含的方法（planner 可細化）：
- `schedule(spec: JobSpec, handler: () => Promise<void>): void` — 固定 cron job
- `unschedule(name: string): void` — 動態移除（ScheduleReportService 需）
- `has(name: string): boolean` — 查詢
- 可選 `JobSpec.runOnInit: boolean` — 註冊時立即跑一次（BifrostSync 需）

### Claude's Discretion
- IScheduler 檔案放置路徑（建議 `src/Foundation/Infrastructure/Ports/Scheduler/` 或 `src/Shared/Infrastructure/Scheduling/`），交由 researcher 依 CONVENTIONS.md 決定
- 測試策略（Mock/Fake IScheduler 實作、測試中是否啟用真實 cron）交由 planner 設計 task
- BIFROST_SYNC_CRON env var 解析位置（config/index.ts vs 直接 `process.env`）交由 planner
- `runOnInit` 失敗時是否算進 retry 次數、是否阻塞後續 tick — 交由 planner 定義（建議：獨立計算，不阻塞 cron）
- ReportsServiceProvider 同時保有 `boot()` 與 `registerJobs()` 的分工（`boot()` 留給非 cron 的初始化 — 目前只有 schedule bootstrap，可全部搬走）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 現有實作（必讀，模式來源）
- `src/bootstrap.ts` — 現有 setInterval 註冊點（lines 68-88），以及 ServiceProvider 註冊順序
- `src/Modules/Reports/Application/Services/ScheduleReportService.ts` — 現行 croner 使用模式、dynamic schedule/unschedule、timezone 處理
- `src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider.ts` — 現行 `boot()` 如何取得 service 並 bootstrap schedules
- `src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts` — sync() 方法簽名與錯誤語意

### 框架生命週期（registerJobs hook 要接在哪）
- `src/Shared/Infrastructure/IServiceProvider.ts` — ServiceProvider 介面定義
- `src/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter.ts` — adapter pattern，`registerJobs` 需由此轉發

### 規格與需求
- `.planning/REQUIREMENTS.md` §背景任務統一化 — JOBS-01..04 驗收條件
- `.planning/PROJECT.md` — Phase 18 概述（ScheduleReportService 遷至統一任務運行器）
- `.planning/codebase/CONVENTIONS.md` — 專案 DDD 命名與檔案佈局慣例
- `.planning/codebase/STACK.md` — 確認 croner 已在 dependencies
- `skills/gravito-prism/SKILL.md` — DI 容器綁定慣例（`container.singleton` 模式）

### 相關 Phase 決策（歷史脈絡）
- `.planning/phases/17-iquerybuilder-usagerepository-drizzle/` — Phase 17 的 port/adapter 抽象模式（Alerts Phase 19 將沿用；Phase 18 scheduler 抽象採同樣形狀）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `croner` package — 已在 dependencies，Cron class 支援 timezone、manual stop、scheduled run detection
- DI 容器（`container.singleton(name, factory)`）— scheduler 可作為單例綁定，`name: 'scheduler'`
- ServiceProvider lifecycle（`register` / `boot`）— 新增 `registerJobs` 屬於第三階段，在 boot 之後
- `PlanetCore.container.make(name)` — 用於在 bootstrap 階段解析 scheduler 並傳給各 provider

### Established Patterns
- Foundation 層 port interface + Infrastructure 層 adapter（Phase 17 IQueryBuilder/IDatabaseAccess 模式）
- 錯誤非 fatal：sync/schedule 錯誤必須 catch，避免整個 server crash（參考 bootstrap.ts:76, 84 註解 "server must not crash on sync failure"）
- 所有 Controller/Service 的 logging 以 `[ModuleName]` prefix（`[BifrostSync]`, `[Reports]`）— Scheduler 用 `[Scheduler]`

### Integration Points
- `src/bootstrap.ts:42-67` — 在 `core.bootstrap()` 後插入 scheduler 建立 + `registerJobs(scheduler)` 迴圈
- `src/bootstrap.ts:68-88` — 現有 BifrostSync 區塊整段刪除
- `src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider.ts:42-49` — `boot()` 邏輯遷至 `registerJobs()`
- `ReportController`（動態建/刪 schedule 的呼叫端）— 從注入 `ScheduleReportService` 改為透過 service 代理 IScheduler（API 不變）

</code_context>

<specifics>
## Specific Ideas

- **保留 croner 的價值**：它已在用、stable、解析 cron expression 準確、timezone 支援完整。抽象層不是為了切換實作，是為了統一進入點與加 retry/logging。
- **runOnInit 必要**：BifrostSync 需在啟動當下立即同步一次以填充 dashboard，若等 5 分鐘後首次 tick 會造成 UX 退化。
- **At-most-once 可接受**：兩個任務都具冪等性（sync 覆寫、report 按 schedule 記錄）。進程重啟遺失一次 tick 可接受，無需持久化。
- **IScheduler 小而美**：只需 schedule / unschedule / has / runOnInit，不過度工程化。未來有需要再擴（pause、stats、manual trigger）。

</specifics>

<deferred>
## Deferred Ideas

- **Dynamic schedule 的更完整 API 設計**（batch reschedule、schedule diffing）— ScheduleReportService 目前透過 DB 驅動，現有 schedule/unschedule 已足夠，等真正需求出現再擴充
- **測試策略正式文件**（FakeScheduler、手動 trigger 介面）— planner 於 plan 階段設計，不需現在決定
- **Alert webhook on job failure** — Phase 19 Alerts 模組重構後可接上；Phase 18 僅 console.error
- **Redis/BullMQ 持久化** — 明確 out-of-scope（REQUIREMENTS.md），v2+
- **分散式任務排隊 / 多 instance coordination** — 同上，v2+
- **Alerts 模組中 cooldown/throttle 定時邏輯統一** — 若存在，Phase 19 重構時處理
- **Runtime 網關切換** — 明確 out-of-scope（REQUIREMENTS.md）

</deferred>

---

*Phase: 18-uniform-background-jobs*
*Context gathered: 2026-04-13*
