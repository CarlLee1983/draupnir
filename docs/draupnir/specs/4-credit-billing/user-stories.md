# 合約 / 額度 / 監控 / 告警 使用者故事（Contract + Credit + Dashboard + Reports + Alerts）

> 本文件對標代碼日期：2026-04-18（commit `2f0e58f`，Task 4 追加時）。
> 若你看到的代碼與此文件明顯不一致，請提 issue 或直接 PR 修正。

## 範圍

- 本檔覆蓋：**Contract 模組** + **Credit 模組** + **Dashboard 模組** + **Reports 模組** + **Alerts 模組**
- 計畫刻意把這五個模組放同一份檔——它們共同構成「額度發放 → 使用 → 監控 → 告警」的商業閉環

## 相關 personas

閱讀前請先看 [../personas.md](../personas.md)：
- **Cloud Admin** — 建合約、調 quota、手動加值 / 退款
- **Org Manager / Org Member** — 只能讀自己 org 的餘額 / 交易歷史
- **System（自動化）** — 扣款、凍結 / 解凍 key、處理合約到期

---

## Contract

### US-CONTRACT-001 | Cloud Admin 建立新 Contract

**As** a Cloud Admin
**I want to** create a new contract with a quota cap, validity window, and target binding
**so that** an org has a formal spending envelope before they can allocate budgets to API keys.

**Related**
- Module: `src/Modules/Contract`
- Entry: `CreateContractService.execute()` → `src/Modules/Contract/Application/Services/CreateContractService.ts`
- Controller: `ContractController.create()` → `src/Modules/Contract/Presentation/Controllers/ContractController.ts`
- Routes：`POST /api/contracts`（REST admin）、`POST /admin/contracts`（Admin Portal Inertia）

**Key rules**
- 只有 Cloud Admin 可建立 Contract（route 強制 `createRoleMiddleware('admin')`）
- Contract 有 `target_type / target_id`（目前主要綁 `org`）、`quota_cap`、生效期間；建立時為 `pending` 狀態，需另外 activate
- Quota cap 即 org 所有 API key 的 `quotaAllocated` 總和上限，硬擋（見 US-CONTRACT-004）

---

### US-CONTRACT-002 | Cloud Admin 啟用 / 修改 / 續約 / 終止 Contract

**As** a Cloud Admin
**I want to** activate, update, renew, and terminate a contract through its lifecycle
**so that** I can reflect the customer's billing changes without creating new contracts for every tweak.

**Related**
- Module: `src/Modules/Contract`
- Entries：
  - `ActivateContractService.execute()` → `src/Modules/Contract/Application/Services/ActivateContractService.ts`
  - `UpdateContractService.execute()` → 同目錄
  - `RenewContractService.execute()` → 同目錄
  - `TerminateContractService.execute()` → 同目錄
  - `GetContractDetailService.execute()`（讀取詳細） → 同目錄
- Controller: `ContractController.activate()` / `update()` / `renew()` / `terminate()` / `getDetail()`
- Routes：
  - REST（全部 admin）：`POST /api/contracts/:contractId/activate`、`PUT /api/contracts/:contractId`、`POST /api/contracts/:contractId/renew`、`POST /api/contracts/:contractId/terminate`、`GET /api/contracts/:contractId`
  - Admin Portal：`GET /admin/contracts/:id`（詳細頁）、`POST /admin/contracts/:id/action`（lifecycle 動作）

**Key rules**
- Activate：將 `pending` contract 轉為 `active`；同一 org 同一時間允許多張 active contract 的規則在合約設計中已定義（見 [credit-system-design.md](./credit-system-design.md)）
- Renew：延長 `end_date`，可選更新 `quota_cap`；舊 contract 不會消失——保留做歷史
- Terminate：提前結束合約；發 `ContractTerminated` 領域事件供下游清理
- Update：一般欄位（描述、metadata）；變更 `quota_cap` 的專用路徑走 US-CONTRACT-004

---

### US-CONTRACT-003 | Cloud Admin 將 Contract 指派給 Org

**As** a Cloud Admin
**I want to** bind an existing contract to a specific organization (or re-target it if created without a target)
**so that** the quota and validity apply to the right customer.

**Related**
- Module: `src/Modules/Contract`
- Entry: `AssignContractService.execute()` → `src/Modules/Contract/Application/Services/AssignContractService.ts`
- Controller: `ContractController.assign()`
- Route: `POST /api/contracts/:contractId/assign`

**Key rules**
- 僅 admin 可指派；指派後 contract 的 `target_type = 'org'`、`target_id = orgId`
- 已指派的 contract 再指派會視規則允許或拒絕（避免 org 之間額度錯置）

---

### US-CONTRACT-004 | Cloud Admin 調整 Contract 的 Quota Cap（含按比例縮減）

**As** a Cloud Admin
**I want to** raise or lower a contract's `quota_cap` with a safe reshuffle of downstream key budgets
**so that** if I lower the cap below the current total allocation, keys shrink proportionally instead of blocking the change.

**Related**
- Module: `src/Modules/Contract`
- Entry: `AdjustContractQuotaService.execute()` → `src/Modules/Contract/Application/Services/AdjustContractQuotaService.ts`
- Admin Portal Page: `AdminContractDetailPage` → `src/Website/Admin/Pages/AdminContractDetailPage.ts`
- Route：`POST /admin/contracts/:id/quota`（Admin Portal Inertia）
- 延伸設計：[contract-quota-allocation-spec.md](../2026-04-16-contract-quota-allocation-spec.md) §5.3

**Key rules**
- `newCap >= sumAllocated`：只改 contract 上限、不動 key
- `newCap < sumAllocated`：按比例縮各 key 的 `quotaAllocated`，最後一把 key 補尾差確保 Σ = newCap
- 縮減中觸及底限（key quota = 0）的視為「硬擋」——該 key 會回報在 `hardBlockedKeyIds`、之後發的請求額度耗盡
- 呼叫者必須是 admin，非 admin 直接回 `FORBIDDEN`

---

### US-CONTRACT-005 | 系統定期處理 Contract 到期 / 即將到期

**As** the Draupnir system (cron job)
**I want to** notify orgs whose contracts expire within 7 days and mark contracts that have already expired
**so that** customers get advance warning and expired contracts stop granting quota.

**Related**
- Module: `src/Modules/Contract`
- Entry: `HandleContractExpiryService.execute()` → `src/Modules/Contract/Application/Services/HandleContractExpiryService.ts`
- Controller: `ContractController.handleExpiry()`
- Route: `POST /api/contracts/handle-expiry`（REST admin；由外部 scheduler 呼叫）

**Key rules**
- 一次掃兩類：7 天內到期的 `ContractExpiring`，與已到期的 `ContractExpired`
- 對前者只 dispatch 事件（交給 Alerts 模組發通知），不改 contract 狀態
- 對後者把 contract 標成 `expired` 並 dispatch 事件；下游（Credit / ApiKey）可消費事件做清理
- 手動觸發 `POST /api/contracts/handle-expiry` 主要用於測試或補救；production 由 scheduler 執行

---

### US-CONTRACT-006 | Cloud Admin / Manager 查看 Contract 列表與詳細

**As** a Cloud Admin (or Org Manager reading own orgs)
**I want to** list contracts (all orgs for admin, own org for manager) and drill into contract details
**so that** I can audit quota usage and customer billing state.

**Related**
- Module: `src/Modules/Contract`
- Entries：
  - `ListAdminContractsService.execute()`（admin：跨 org）→ `src/Modules/Contract/Application/Services/ListAdminContractsService.ts`
  - `ListContractsService.execute()`（org 面：自己的 contract）→ 同目錄
  - `GetContractDetailService.execute()` → 同目錄（US-CONTRACT-002 也會呼叫，共用）
- Controller: `ContractController.list()` / `getDetail()`
- Routes：
  - REST：`GET /api/contracts`（admin）、`GET /api/contracts/:contractId`（admin）
  - Admin Portal：`GET /admin/contracts`、`GET /admin/contracts/:id`
  - Manager Portal 的 contract 入口目前透過 `/member/contracts` 共用 Member 視圖（見下段 "已知缺口"）

**Key rules**
- ListAdmin：回所有 contract；ListContracts（org-scope）回該 org 擁有或指派到的
- `GetActiveOrgContractQuotaService`（內部 helper）：被 ManagerApiKeyCreatePage 等呼叫以取得「當前 active contract 的 quota_cap」，用於額度預檢（見 US-APIKEY-001 Key rules）

---

## Credit

### US-CREDIT-001 | Cloud Admin 手動為 Org 加值 / 退款 Credit

**As** a Cloud Admin
**I want to** top up an org's credit balance or record a refund (both increase the balance)
**so that** I can handle customer payments, promotional credits, and billing corrections.

**Related**
- Module: `src/Modules/Credit`
- Entries：
  - `TopUpCreditService.execute()` → `src/Modules/Credit/Application/Services/TopUpCreditService.ts`
  - `RefundCreditService.execute()` → 同目錄
- Controller: `CreditController.topUp()` / `refund()`
- Routes：
  - REST：`POST /api/organizations/:orgId/credits/topup`、`POST /api/organizations/:orgId/credits/refund`（皆 `createRoleMiddleware('admin')`）

**Key rules**
- TopUp 與 Refund 都會**增加**餘額，差異在交易類型（`TransactionType`）——用於稽核與報表分類
- 所有變動建立對應的 `CreditTransaction` 紀錄；若 `CreditAccount` 不存在會自動建立
- TopUp 成功後 dispatch `CreditToppedUp` 事件；若之前有 key 因餘額不足被凍結，`HandleCreditToppedUpService` 會自動解凍（見 US-CREDIT-006）

---

### US-CREDIT-002 | Manager / Member 查看 Org Credit 餘額

**As** an Org Manager or Member
**I want to** see my org's current credit balance
**so that** I know whether the org still has room to spend and when to request a top-up.

**Related**
- Module: `src/Modules/Credit`
- Entry: `GetBalanceService.execute()` → `src/Modules/Credit/Application/Services/GetBalanceService.ts`
- Controller: `CreditController.getBalance()`
- Route: `GET /api/organizations/:orgId/credits/balance`（`requireAuth` + `createModuleAccessMiddleware('credit')`）

**Key rules**
- 呼叫者須是該 org 的 member（透過 module access middleware 檢查 org 成員身份）
- 若 org 還沒有 `CreditAccount`，回預設 `balance = 0`
- 回傳的餘額字串保留精度（Balance value object 以字串表達避免浮點精度丟失）

---

### US-CREDIT-003 | Manager / Member 查看 Credit 交易歷史

**As** an Org Manager or Member
**I want to** list the recent credit transactions (top-ups, refunds, deductions)
**so that** I can reconcile spending, audit deductions, and answer colleagues' questions about changes.

**Related**
- Module: `src/Modules/Credit`
- Entry: `GetTransactionHistoryService.execute()` → `src/Modules/Credit/Application/Services/GetTransactionHistoryService.ts`
- Controller: `CreditController.getTransactions()`
- Route: `GET /api/organizations/:orgId/credits/transactions`

**Key rules**
- 同樣需 org 成員身份；非成員拒
- 支援 pagination（page、limit）；預設由新到舊排序
- 同一筆交易可透過 `referenceType / referenceId` 串回 ApiKey、Bifrost sync log 等來源

---

### US-CREDIT-004 | 系統依 Bifrost Sync 結果扣款

**As** the Draupnir system (on behalf of incoming usage records)
**I want to** deduct credit from an org's balance whenever a usage record is ingested
**so that** the org's remaining balance always reflects actual spending on AI calls.

**Related**
- Module: `src/Modules/Credit`
- Entry: `DeductCreditService.execute()` → `src/Modules/Credit/Application/Services/DeductCreditService.ts`
- 呼叫端：Dashboard 模組（Bifrost Sync 路徑）——詳細交接屬 Task 4 的 US-DASHBOARD-xxx
- Route: 無獨立 REST 入口；純事件觸發 / 內部呼叫

**Key rules**
- 扣款必扣足量（`applyDeduction`）；若扣到 0 或負值，dispatch `BalanceDepleted` 事件觸發 key 凍結（見 US-CREDIT-005）
- 扣款同樣建 `CreditTransaction`，`referenceType = usage_record`、`referenceId = usage_record.id`，作為補扣 / 重跑時的冪等去重鍵
- 連續扣款必須保持交易原子性（DB transaction）——避免半扣款狀態

---

### US-CREDIT-005 | 系統在餘額用完時自動凍結 Org 的 Active Keys

**As** the Draupnir system (reacting to `BalanceDepleted` event)
**I want to** immediately reduce every active API key's rate limit to 0 via Bifrost
**so that** no further spending happens once the org runs out of credit.

**Related**
- Module: `src/Modules/Credit`
- Entry: `HandleBalanceDepletedService.execute(orgId)` → `src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts`
- 觸發：`BalanceDepleted` domain event
- 下游：`ILLMGatewayClient.updateKey()`（把 Bifrost virtual key rate limit 設為 0）

**Key rules**
- 找出 org 下所有 `active` 狀態的 key，逐一 suspend（標註原因 `CREDIT_DEPLETED`，保存 pre-freeze rate limit 以便解凍時還原）
- 單把 key 失敗（Bifrost 不回、更新失敗）不中斷流程，計入 `failed`、繼續其他 key
- 回傳 `{ processed, failed }` 供 caller / 運維觀察整體成功率

---

### US-CREDIT-006 | 系統在充值後自動解凍被凍結的 Keys

**As** the Draupnir system (reacting to `CreditToppedUp` event)
**I want to** restore rate limits on keys that were previously frozen due to depleted credit
**so that** once the org tops up, their keys immediately regain service without manual re-enable.

**Related**
- Module: `src/Modules/Credit`
- Entry: `HandleCreditToppedUpService.execute(orgId)` → `src/Modules/Credit/Application/Services/HandleCreditToppedUpService.ts`
- 觸發：`CreditToppedUp` domain event（由 TopUpCreditService 發出）
- 下游：`ILLMGatewayClient.updateKey()`（恢復 rate limit 到凍結前值）

**Key rules**
- 只解凍 `status = suspended` 且 `suspendReason = CREDIT_DEPLETED` 的 key；其他 suspend 原因（人工 revoke 等）不碰
- 還原時使用凍結前記錄的 `preFreezeRateLimit`；若 pre-freeze 為 `null`（之前沒設限），用預設值補
- Suspend 與 resume 是對稱動作，中間 pre-freeze 狀態存在 key entity 上

---

### US-CREDIT-007 | Cloud Admin 手動回填逾期未扣款

**As** a Cloud Admin
**I want to** manually trigger a ranged Bifrost backfill for overdue usage and missing deductions
**so that** a long sync outage can be repaired without editing org balances or ledger rows by hand.

**Related**
- Module: `src/Modules/Credit`
- Entry: `ApplyUsageChargesService.execute()` → `src/Modules/Credit/Application/Services/ApplyUsageChargesService.ts`
- Trigger: `POST /api/dashboard/bifrost-sync/backfill` → `src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts`

**Key rules**
- 呼叫者必須是 Cloud Admin，且必須提供明確的 `startTime` / `endTime`；系統只回填該時間區間內的 usage
- backfill 會重抓 Bifrost logs、補寫缺失的 `usage_records`，再只對尚未建立 deduction 的 `usage_record.id` 補扣
- backfill 不推進增量 `sync_cursors`；scheduler 的正常同步位置與手動補救分開管理
- backfill 會在固定 `startTime/endTime` 視窗內以 `limit + offset` 分頁取完所有 logs，不因單頁 500 筆上限漏資料

---

## Dashboard

### US-DASHBOARD-001 | Manager / Member 查看 Dashboard 摘要

**As** an Org Manager or Member
**I want to** see an at-a-glance summary card for my org (total spend, active keys, balance)
**so that** I immediately know the org's current operating state when I log in.

**Related**
- Module: `src/Modules/Dashboard`
- Entry: `GetDashboardSummaryService.execute()` → `src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts`
- Controller: `DashboardController.summary()` → `src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts`
- Route: `GET /api/organizations/:orgId/dashboard`（`requireAuth` + `createModuleAccessMiddleware('dashboard')`）

**Key rules**
- 呼叫者必須是該 org 的成員（透過 module access middleware 確認）
- Summary 是 org 層級聚合數字——不會洩漏個別 member 或 key 的隱私細節
- Member 視圖的 Dashboard 透過 `DashboardKeyScopeResolver` 將 org-wide query 收斂成「只看到指派給自己的 key 貢獻」

---

### US-DASHBOARD-002 | Manager / Member 查看 KPI 卡片

**As** an Org Manager or Member
**I want to** see KPI cards (e.g. total requests, total tokens, cost this period)
**so that** I get headline metrics without having to dig into charts.

**Related**
- Module: `src/Modules/Dashboard`
- Entry: `GetKpiSummaryService.execute()` → `src/Modules/Dashboard/Application/Services/GetKpiSummaryService.ts`
- Controller: `DashboardController.kpiSummary()`
- Route: `GET /api/organizations/:orgId/dashboard/kpi-summary`

**Key rules**
- KPI 值由 `usage_records`（Bifrost Sync 產生，見 US-DASHBOARD-007）聚合算出
- 支援時間範圍 query（例：最近 7 / 30 天）
- Member 視圖自動套用 key scope filter——只看到自己 key 的貢獻

---

### US-DASHBOARD-003 | Manager / Member 查看使用量趨勢圖（時間序列）

**As** an Org Manager or Member
**I want to** see a time-series chart of request count and token usage over time
**so that** I can spot spikes, drops, or day-of-week patterns.

**Related**
- Module: `src/Modules/Dashboard`
- Entry: `GetUsageChartService.execute()` → `src/Modules/Dashboard/Application/Services/GetUsageChartService.ts`
- Controller: `DashboardController.usage()`
- Route: `GET /api/organizations/:orgId/dashboard/usage`

**Key rules**
- 時間粒度（hour / day / week）可透過 query 參數指定
- 時區一律以 UTC 回傳；前端負責轉本地時區顯示
- 空值時段（無 usage record）不插 0——讓前端決定如何呈現缺口

---

### US-DASHBOARD-004 | Manager / Member 查看 Per-Key 成本拆解

**As** an Org Manager or Member
**I want to** see how the total cost breaks down by individual API key
**so that** I can identify which keys consume the most and follow up with the owner.

**Related**
- Module: `src/Modules/Dashboard`
- Entry: `GetPerKeyCostService.execute()` → `src/Modules/Dashboard/Application/Services/GetPerKeyCostService.ts`
- Controller: `DashboardController.perKeyCost()`
- Route: `GET /api/organizations/:orgId/dashboard/per-key-cost`

**Key rules**
- Manager 視圖：回所有 key；Member 視圖：只回指派給自己的 key（`DashboardKeyScopeResolver`）
- 成本數字以 `Balance` value object 精度表達（字串、保留小數位）
- 已撤銷的 key 若在區間內有 usage，仍會出現在清單（標註 revoked 狀態）

---

### US-DASHBOARD-005 | Manager / Member 查看模型比較

**As** an Org Manager or Member
**I want to** compare usage and cost across different AI models (GPT-4o, Claude, etc.) in one chart
**so that** I can evaluate model choice trade-offs (quality vs cost) with data.

**Related**
- Module: `src/Modules/Dashboard`
- Entry: `GetModelComparisonService.execute()` → `src/Modules/Dashboard/Application/Services/GetModelComparisonService.ts`
- Controller: `DashboardController.modelComparison()`
- Route: `GET /api/organizations/:orgId/dashboard/model-comparison`

**Key rules**
- 以 `model_id` 聚合 usage_records；回傳每個 model 的 request count、token in/out、總成本
- 模型清單取決於該 org 合約涵蓋的模型（依 `allowedModels` 與實際 usage 交集）
- 若 org 只有單一模型的 usage，仍回單元素陣列（前端決定是否顯示圖表）

---

### US-DASHBOARD-006 | Manager / Member 查看 Cost Trends

**As** an Org Manager or Member
**I want to** see cost trends over longer windows (month-over-month, quarter)
**so that** I can spot cost inflation, predict next invoice, or plan capacity changes.

**Related**
- Module: `src/Modules/Dashboard`
- Entry: `GetCostTrendsService.execute()` → `src/Modules/Dashboard/Application/Services/GetCostTrendsService.ts`
- Controller: `DashboardController.costTrends()`
- Route: `GET /api/organizations/:orgId/dashboard/cost-trends`

**Key rules**
- 與 US-DASHBOARD-003 的差別：usage chart 關注「單位時間量」；cost trends 關注「跨長區間的成本走勢」
- 資料來源皆為 `usage_records`，差別只在聚合粒度與回傳欄位
- Member 視圖同樣受 key scope filter 影響

---

### US-DASHBOARD-007 | Bifrost Sync Job：定期拉 Logs、寫 usage_records、隔離失敗 Logs

**As** the Bifrost Sync cron job (system actor)
**I want to** pull new usage logs from Bifrost Gateway, write them into `usage_records`, advance `sync_cursors`, and quarantine logs that can't be mapped to a known key
**so that** downstream dashboards, billing, and alerts all see a consistent, timely picture of actual usage.

**Related**
- Module: `src/Modules/Dashboard`
- Entry: `BifrostSyncService.sync()` → `src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts`
- Schedule: 由 `DashboardServiceProvider.registerJobs()` 註冊到 `IScheduler`，cron 由 `appConfig.bifrostSyncCron`（預設 `*/5 * * * *`）驅動
- Downstream：dispatch `BifrostSyncCompletedEvent`；`affectedOrgIds` 觸發 Credit 扣款（見 US-CREDIT-004）
- 30s timeout：`BifrostSyncService.sync` 內建 `Promise.race` 與 timeout，避免單次卡住整個 scheduler

**Key rules**
- 一個 sync round 內：拉 log → 找不到對應 key → 寫入 `quarantined_logs`（原因 `virtual_key_not_found`）、不影響 cursor
- Cursor 只在成功寫入 usage_records 後推進；失敗 log 不會讓 cursor 回退
- Sync 完成後 dispatch `BifrostSyncCompletedEvent(affectedOrgIds)`；Credit 模組依此對每個 org 計算扣款量
- Admin 可用 `POST /api/dashboard/bifrost-sync/backfill` 指定時間區間重跑同一條流程；backfill 會 dispatch 同一事件但不推進 cursor
- sync/backfill 會先固定查詢上界，再用 `limit + offset` 分頁掃完整個時間窗，避免超過單頁 500 筆時漏 ingest
- Timeout 或 Gateway network 錯誤回 `{ synced: 0, quarantined: 0, affectedOrgIds: [] }`——不 throw，讓 scheduler 繼續下一輪

---

## Reports

### US-REPORTS-001 | Manager 管理排程 Report（建立 / 列出 / 修改 / 刪除）

**As** an Org Manager
**I want to** create, list, update, or delete scheduled PDF report jobs for my org
**so that** stakeholders receive regular cost and usage digests without me preparing them manually.

**Related**
- Module: `src/Modules/Reports`
- Entry: `ScheduleReportService.schedule()` / `unschedule()` / `bootstrap()` → `src/Modules/Reports/Application/Services/ScheduleReportService.ts`
- Controller: `ReportController.index()` / `store()` / `update()` / `destroy()` → `src/Modules/Reports/Presentation/Controllers/ReportController.ts`
- Routes：
  - `GET /v1/org/:orgId/reports`（`requireOrganizationContext`）：列出
  - `POST /v1/org/:orgId/reports`（`requireOrganizationManager`）：建立
  - `PUT /v1/org/:orgId/reports/:reportId`（`requireOrganizationManager`）：修改
  - `DELETE /v1/org/:orgId/reports/:reportId`（`requireOrganizationManager`）：刪除

**Key rules**
- Index 讓任何 org member 讀得到目前的排程設定；create / update / delete 限 Manager
- 變更排程後 `ScheduleReportService.schedule(id)` 會重新向 `IScheduler` 註冊 job；若 `enabled=false` 會取消註冊
- 啟動時 `bootstrap()` 重新掃 `findAllEnabled()` 重新註冊所有啟用的排程——服務重啟後不會漏
- 未來若新增「一次性手動觸發」或「報表 snapshot 查歷史」，需要新 story

---

### US-REPORTS-002 | 系統依排程送出 PDF Report Email

**As** the Draupnir system (on behalf of an enabled scheduled report)
**I want to** render a PDF for the target org and email it to the configured recipient list on the cron schedule
**so that** stakeholders get the regular digest without manual intervention.

**Related**
- Module: `src/Modules/Reports`
- Entries：
  - `ScheduleReportService.execute(scheduleId)`（cron 觸發）→ `src/Modules/Reports/Application/Services/ScheduleReportService.ts`
  - `GeneratePdfService.generate(orgId, scheduleId)` → `src/Modules/Reports/Application/Services/GeneratePdfService.ts`
  - `SendReportEmailService.send(recipients, pdfBuffer, type)` → 同目錄
- 外部依賴：Playwright（chromium）渲染 PDF、`IMailer` 寄信

**Key rules**
- Cron 觸發時依序跑：render PDF → 寄 email；任一步失敗整次 skip，不部分寄
- PDF 以 A4 格式渲染 `/admin/reports/template?token=...`（見 US-REPORTS-003）；template render 會用 `scheduleId` live lookup schedule，再讀本地 usage read model
- Email 主旨含 `type`（weekly / monthly / 等）與日期；附件檔名統一為 `Draupnir-Report-{type}-{date}.pdf`

---

### US-REPORTS-003 | PDF 渲染以 Token 保護的 Template Endpoint

**As** the report PDF rendering process (headless browser, runs in the server)
**I want to** access the admin report template via a short-lived token that identifies the org
**so that** the Playwright browser can load the correct data without impersonating a real admin session.

**Related**
- Module: `src/Modules/Reports`
- Entry: `ReportController.verifyTemplate()` → `src/Modules/Reports/Presentation/Controllers/ReportController.ts`
- Value Object: `ReportToken.generate(orgId, scheduleId, expiresAt)` → `src/Modules/Reports/Domain/ValueObjects/ReportToken.ts`
- Route: `GET /v1/reports/verify-template`（無一般 auth middleware；靠 token 驗證）

**Key rules**
- Token 是 server-side 簽發、30 分鐘有效；超時 verify-template 拒絕
- 此 route 刻意沒有一般 user auth——用 token 代替；方便 Playwright headless browser 以 URL 載入模板
- Token 綁定 org + scheduleId——同一 token 只能拉該 org、該排程的資料

---

## Alerts

### US-ALERTS-001 | Manager 設定 / 查看 Org 的 Budget 閾值

**As** an Org Manager
**I want to** set a monthly budget amount for my org and read the current value
**so that** Draupnir can evaluate usage against it and notify us when we approach or exceed the cap.

**Related**
- Module: `src/Modules/Alerts`
- Entries：
  - `SetBudgetService.execute(orgId, budgetUsd)` → `src/Modules/Alerts/Application/Services/SetBudgetService.ts`
  - `GetBudgetService.execute(orgId)` → 同目錄
- Controller: `AlertController.setBudget()` / `getBudget()` → `src/Modules/Alerts/Presentation/Controllers/AlertController.ts`
- Routes：
  - `PUT /api/organizations/:orgId/alerts/budget`（`requireOrganizationManager`）
  - `GET /api/organizations/:orgId/alerts/budget`（`requireOrganizationContext`——同 org 成員皆可讀）

**Key rules**
- `budgetUsd` 走 `BudgetAmount` value object 驗證（必須為正的 decimal 字串，保留精度）
- 設定會 upsert `AlertConfig` 聚合；同一 org 同時只有一筆 config
- 讀取路徑放給全體 org member（Manager + Member 都能看到目前閾值），但只有 Manager 能改

---

### US-ALERTS-002 | Manager 管理 Webhook Endpoints（CRUD + Rotate Secret）

**As** an Org Manager
**I want to** register, list, update, delete, and rotate secrets for webhook endpoints that should receive alerts
**so that** our ops tooling (Slack, PagerDuty, internal webhook) can react to Draupnir alerts automatically.

**Related**
- Module: `src/Modules/Alerts`
- Entries：
  - `RegisterWebhookEndpointService.register(orgId, url, description)` → `src/Modules/Alerts/Application/Services/RegisterWebhookEndpointService.ts`
  - `ListWebhookEndpointsService.execute(orgId)` → 同目錄
  - `UpdateWebhookEndpointService.execute(...)` → 同目錄
  - `DeleteWebhookEndpointService.execute(endpointId)` → 同目錄
  - `RotateWebhookSecretService.execute(endpointId)` → 同目錄
- Controller: `WebhookEndpointController.list()` / `create()` / `update()` / `rotateSecret()` / `delete()` → `src/Modules/Alerts/Presentation/Controllers/WebhookEndpointController.ts`
- Routes（全部 `requireOrganizationManager`）：
  - `GET /api/organizations/:orgId/alerts/webhooks`
  - `POST /api/organizations/:orgId/alerts/webhooks`
  - `PATCH /api/organizations/:orgId/alerts/webhooks/:endpointId`
  - `DELETE /api/organizations/:orgId/alerts/webhooks/:endpointId`
  - `POST /api/organizations/:orgId/alerts/webhooks/:endpointId/rotate-secret`

**Key rules**
- 每個 org 最多 **5 組 webhook endpoint**（`RegisterWebhookEndpointService` 硬限制）
- URL 走 `WebhookUrl.create`；預設只允許 https，本地開發可由 `allowHttp` 放行
- 建立時回傳的 `plaintextSecret` **只回一次**；之後只能 rotate，不能查原始值
- Rotate secret 會產生新 secret 並作廢舊 secret；已在途的 alert delivery 還是以當下的 secret 簽章

---

### US-ALERTS-003 | Manager 測試 Webhook 連線

**As** an Org Manager
**I want to** send a test payload to a registered webhook endpoint
**so that** I can verify the URL and secret work before relying on it for real alerts.

**Related**
- Module: `src/Modules/Alerts`
- Entry: `TestWebhookEndpointService.execute(endpointId)` → `src/Modules/Alerts/Application/Services/TestWebhookEndpointService.ts`
- Controller: `WebhookEndpointController.test()`
- Route: `POST /api/organizations/:orgId/alerts/webhooks/:endpointId/test`（Manager）

**Key rules**
- Test payload 會走與真實 alert 相同的簽章流程，讓接收端的驗證邏輯能同時被驗證
- 回傳 HTTP 響應摘要（狀態碼、時間、錯誤訊息）——讓 Manager 能直接判斷是否通
- Test 呼叫**不**寫入 alert event / delivery 歷史——避免污染真實紀錄

---

### US-ALERTS-004 | 系統定期評估閾值並觸發 Alert（Email + Webhook）

**As** the Draupnir system (on behalf of monthly budget evaluation)
**I want to** compare each org's accumulated usage cost against its configured budget and, when the current month crosses a threshold tier, send alert notifications via email and webhook
**so that** Manager / key stakeholders know to act before spend runs away.

**Related**
- Module: `src/Modules/Alerts`
- Entries：
  - `EvaluateThresholdsService.evaluateOrgs(orgIds)` → `src/Modules/Alerts/Application/Services/EvaluateThresholdsService.ts`
  - `SendAlertService.send(params)` → `src/Modules/Alerts/Application/Services/SendAlertService.ts`
- 觸發源：Dashboard 的 `BifrostSyncCompletedEvent` 會帶 `affectedOrgIds`，讓 Evaluator 知道要評估哪幾個 org
- 領域互動：`AlertConfig`（閾值）、`MonthlyPeriod`（月份切割）、`ThresholdTier`（warning / critical 兩階）、`AlertEvent`（寫入歷史）
- 遞送：多 `IAlertNotifier` 策略——目前包含 email 與 webhook

**Key rules**
- 評估單位為「月」：`MonthlyPeriod` 以 org 時區 / UTC 月界劃分，跨月後計數歸零
- 每個 tier（warning / critical）一個月只通知一次——避免 spam；同月已發過該 tier 不再觸發
- 通知失敗（email bounce / webhook 5xx）不中斷整體流程，相關 delivery 記錄為失敗、供後續 resend（見 US-ALERTS-005）
- Recipient 解析：email 走 `IAlertRecipientResolver.resolveByOrg(orgId)`——通常是 org 的 Managers

---

### US-ALERTS-005 | Manager 查看 Alert 歷史、補發未達 Delivery

**As** an Org Manager
**I want to** see the history of alert events and individual deliveries (email / webhook) and optionally resend a failed delivery
**so that** I can audit what was triggered, confirm stakeholders got it, and retry after fixing a webhook URL or email address.

**Related**
- Module: `src/Modules/Alerts`
- Entries：
  - `GetAlertHistoryService.execute(orgId, ...)` → `src/Modules/Alerts/Application/Services/GetAlertHistoryService.ts`
  - `ResendDeliveryService.execute(deliveryId)` → 同目錄
- Controller: `AlertHistoryController.list()` / `resend()` → `src/Modules/Alerts/Presentation/Controllers/AlertHistoryController.ts`
- Routes（皆 Manager）：
  - `GET /api/organizations/:orgId/alerts/history`
  - `POST /api/organizations/:orgId/alerts/deliveries/:deliveryId/resend`

**Key rules**
- History 回傳 `AlertEvent` + 其關聯的 deliveries（每個 channel 一筆 delivery，含 status）
- 支援 pagination（時間倒序）
- Resend 只針對「失敗狀態」的 delivery；成功的 delivery 不允許重發避免重覆通知
- Resend 會建立新的 delivery 紀錄（不覆蓋舊的），讓歷史留下 audit trail

---

## Coverage map

### Contract 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `CreateContractService.execute` | US-CONTRACT-001 | 建立 |
| `UpdateContractService.execute` | US-CONTRACT-002 | 修改欄位 |
| `ActivateContractService.execute` | US-CONTRACT-002 | 啟用 |
| `TerminateContractService.execute` | US-CONTRACT-002 | 終止 |
| `RenewContractService.execute` | US-CONTRACT-002 | 續約 |
| `AssignContractService.execute` | US-CONTRACT-003 | 指派給 org |
| `AdjustContractQuotaService.execute` | US-CONTRACT-004 | 調整 quota_cap（含按比例縮減）|
| `HandleContractExpiryService.execute` | US-CONTRACT-005 | 到期處理（cron）|
| `ListAdminContractsService.execute` | US-CONTRACT-006 | Admin 列所有 |
| `ListContractsService.execute` | US-CONTRACT-006 | Org 列自己的 |
| `GetContractDetailService.execute` | US-CONTRACT-002, US-CONTRACT-006 | 詳細 |
| `GetActiveOrgContractQuotaService.execute` | — | 內部 helper：被 ApiKey 建立流程（ManagerApiKeyCreatePage）與相關 dashboard 呼叫，無獨立 user 旅程 |

### Credit 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `TopUpCreditService.execute` | US-CREDIT-001 | Admin 加值 |
| `RefundCreditService.execute` | US-CREDIT-001 | Admin 退款（亦為加回）|
| `DeductCreditService.execute` | US-CREDIT-004 | 系統扣款 |
| `ApplyUsageChargesService.execute` | US-CREDIT-007 | 掃描 usage_records、只補扣未建立 deduction 的 usage |
| `GetBalanceService.execute` | US-CREDIT-002 | 讀餘額 |
| `GetTransactionHistoryService.execute` | US-CREDIT-003 | 交易歷史 |
| `HandleBalanceDepletedService.execute` | US-CREDIT-005 | 餘額用盡 → 凍結 key |
| `HandleCreditToppedUpService.execute` | US-CREDIT-006 | 充值 → 解凍 key |

### Dashboard 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `GetDashboardSummaryService.execute` | US-DASHBOARD-001 | Summary |
| `GetKpiSummaryService.execute` | US-DASHBOARD-002 | KPI 卡片 |
| `GetUsageChartService.execute` | US-DASHBOARD-003 | Usage 時間序列 |
| `GetPerKeyCostService.execute` | US-DASHBOARD-004 | 成本分解到 key |
| `GetModelComparisonService.execute` | US-DASHBOARD-005 | 模型比較 |
| `GetCostTrendsService.execute` | US-DASHBOARD-006 | Cost trends（長區間）|
| `DashboardKeyScopeResolver.*` | — | 內部 helper：Manager / Member 兩種視圖的 key scope 計算，被所有 Dashboard service 呼叫 |

### Dashboard 模組 Infrastructure Services

| Service method | Story ID | 備註 |
|---|---|---|
| `BifrostSyncService.sync` | US-DASHBOARD-007 | Cron 驅動的 usage 拉取 + 隔離 log + 推進 cursor |
| `BifrostSyncService.backfill` | US-CREDIT-007 | Admin 指定時間區間重跑 usage sync；不推進 cursor |

### Reports 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `ScheduleReportService.schedule` / `unschedule` / `bootstrap` | US-REPORTS-001, US-REPORTS-002 | CRUD 後重註冊 cron；bootstrap 啟動時還原 |
| `ScheduleReportService.execute`（cron tick） | US-REPORTS-002 | 一次性 render + send 流程 |
| `GeneratePdfService.generate` | US-REPORTS-002, US-REPORTS-003 | Playwright 渲染 PDF；依賴 verify-template |
| `SendReportEmailService.send` | US-REPORTS-002 | 寄 email 帶 PDF 附件 |

### Alerts 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `SetBudgetService.execute` | US-ALERTS-001 | 設定 budget 閾值 |
| `GetBudgetService.execute` | US-ALERTS-001 | 讀取目前閾值 |
| `RegisterWebhookEndpointService.register` | US-ALERTS-002 | 新增 webhook |
| `ListWebhookEndpointsService.execute` | US-ALERTS-002 | 列 webhook |
| `UpdateWebhookEndpointService.execute` | US-ALERTS-002 | 改 webhook |
| `DeleteWebhookEndpointService.execute` | US-ALERTS-002 | 刪 webhook |
| `RotateWebhookSecretService.execute` | US-ALERTS-002 | 輪替 webhook secret |
| `TestWebhookEndpointService.execute` | US-ALERTS-003 | 測試 webhook 連線 |
| `EvaluateThresholdsService.evaluateOrgs` | US-ALERTS-004 | 背景評估閾值 |
| `SendAlertService.send` | US-ALERTS-004 | 實際送 email + webhook |
| `GetAlertHistoryService.execute` | US-ALERTS-005 | 查歷史 |
| `ResendDeliveryService.execute` | US-ALERTS-005 | 補發失敗的 delivery |

### Presentation 入口

| Entry | Story ID | 備註 |
|---|---|---|
| `ContractController.create` | US-CONTRACT-001 | REST admin |
| `ContractController.activate` | US-CONTRACT-002 | REST admin |
| `ContractController.update` | US-CONTRACT-002 | REST admin |
| `ContractController.renew` | US-CONTRACT-002 | REST admin |
| `ContractController.terminate` | US-CONTRACT-002 | REST admin |
| `ContractController.getDetail` | US-CONTRACT-002, US-CONTRACT-006 | REST admin |
| `ContractController.list` | US-CONTRACT-006 | REST admin |
| `ContractController.assign` | US-CONTRACT-003 | REST admin |
| `ContractController.handleExpiry` | US-CONTRACT-005 | REST admin（cron 入口）|
| `CreditController.getBalance` | US-CREDIT-002 | REST |
| `CreditController.getTransactions` | US-CREDIT-003 | REST |
| `CreditController.topUp` | US-CREDIT-001 | REST admin |
| `CreditController.refund` | US-CREDIT-001 | REST admin |
| Admin Portal：`/admin/contracts`、`/admin/contracts/create`、`/admin/contracts/:id`、`/admin/contracts/:id/action`、`/admin/contracts/:id/quota` | US-CONTRACT-001~006 | Inertia，為 Cloud Admin 日常入口 |
| `DashboardController.summary` | US-DASHBOARD-001 | REST |
| `DashboardController.usage` | US-DASHBOARD-003 | REST |
| `DashboardController.kpiSummary` | US-DASHBOARD-002 | REST |
| `DashboardController.costTrends` | US-DASHBOARD-006 | REST |
| `DashboardController.modelComparison` | US-DASHBOARD-005 | REST |
| `DashboardController.perKeyCost` | US-DASHBOARD-004 | REST |
| `DashboardController.backfillSync` | US-CREDIT-007 | REST admin |
| `ReportController.index` | US-REPORTS-001 | REST |
| `ReportController.store` | US-REPORTS-001 | REST（Manager only）|
| `ReportController.update` | US-REPORTS-001 | REST（Manager only）|
| `ReportController.destroy` | US-REPORTS-001 | REST（Manager only）|
| `ReportController.verifyTemplate` | US-REPORTS-003 | Public-ish，靠 ReportToken 驗證 |
| `BifrostSyncService`（registered via `DashboardServiceProvider.registerJobs`） | US-DASHBOARD-007, US-CREDIT-007 | Scheduler-driven + admin backfill hook |
| `ScheduleReportService`（registered via scheduler） | US-REPORTS-002 | Scheduler-driven，無 HTTP 入口 |
| Member / Manager Portal 的 Dashboard / Usage / Cost 頁面 | US-DASHBOARD-001~006 | Inertia，各 portal 各自 binding |
| `AlertController.setBudget` | US-ALERTS-001 | REST（Manager only）|
| `AlertController.getBudget` | US-ALERTS-001 | REST（org member）|
| `WebhookEndpointController.list` | US-ALERTS-002 | REST（Manager only）|
| `WebhookEndpointController.create` | US-ALERTS-002 | REST（Manager only）|
| `WebhookEndpointController.update` | US-ALERTS-002 | REST（Manager only）|
| `WebhookEndpointController.delete` | US-ALERTS-002 | REST（Manager only）|
| `WebhookEndpointController.rotateSecret` | US-ALERTS-002 | REST（Manager only）|
| `WebhookEndpointController.test` | US-ALERTS-003 | REST（Manager only）|
| `AlertHistoryController.list` | US-ALERTS-005 | REST（Manager only）|
| `AlertHistoryController.resend` | US-ALERTS-005 | REST（Manager only）|
| `EvaluateThresholdsService`（由 `BifrostSyncCompletedEvent` 消費） | US-ALERTS-004 | Event-driven，無 HTTP 入口 |

### 已知覆蓋缺口

- **Manager 依 slack 重配 key 額度（slack-based reallocation）**：計畫提到的這個使用情境需要 `UpdateApiKeyBudgetService` 接上 Presentation（見 [ApiKey Coverage map](../3-api-keys/user-stories.md#coverage-map)）；目前只能刪 key 重發。Task 6 會檢視是否能擴充 ApiKey story
- **Manager 查看 org 自己的 contract 詳細**：目前 `/member/contracts` 共用 Member 視圖，沒有獨立 Manager Contract 詳細頁；待後續補強
- **手動扣除 credit（非自動、非退款）**：Admin 目前無法直接扣款餘額，只能透過重算 refund 的負向——v1 視為刻意限制
- **已寄送 Report 的歷史記錄**：Reports 模組只管 "schedule configs"，不保留歷次 render 的 PDF 歷史；若後續要查 "之前寄過什麼" 需新 story
- **Reports 排程失敗的重試**：若 cron tick 發 email 失敗（mailer 錯誤），目前無獨立重試機制；依賴 scheduler 下次 tick
- **多通道同時 off（僅剩 webhook 失敗）情境**：若 email 送出但 webhook 全失敗，目前僅記錄 delivery 失敗、不自動升級——依賴 Manager 看 history 主動處理
- **Alert Tier 的自訂閾值百分比**：v1 以 warning / critical 兩階為主，`ThresholdTier` 若未來支援自訂百分比需新 story
