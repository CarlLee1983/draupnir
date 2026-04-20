# Phase 4：Credit System — 額度與計費 設計規格

> P4 完整設計規格，涵蓋 Credit 模組、用量同步（概念上原稱 UsageSync）、Dashboard 費用補完。  
> **實作對照與驗收狀態**見同目錄 [README.md](./README.md)；本文件在「目標模型」與「已落地程式」並列處會標註。

**最後更新**：2026-04-20

## 概述

**目標：** Credit 儲值、扣款、餘額管理，以及從 Bifrost（經 LLM Gateway）同步用量並轉換為 Credit 消耗。

### 架構決策（目標 vs 現行實作）

| 項目 | 目標／規格 | 現行實作摘要 |
|------|------------|--------------|
| **同步與扣款** | 用量入庫與扣款可強一致或分階段 | **分階段**：`BifrostSyncService` 寫入 `usage_records` 後派發 `bifrost.sync.completed` → `ApplyUsageChargesService` 對尚未入帳之紀錄扣款（`referenceType: usage_record`）；與網路拉取解耦 |
| **模組切分** | 獨立 `UsageSync` 目錄 | **未**建立 `src/Modules/UsageSync/`；拉取／游標／入庫在 **`Dashboard`**（`BifrostSyncService`、`DashboardServiceProvider`）；扣款與事件訂閱在 **`Credit`** |
| **定價規則** | DB `pricing_rules` + `UsagePricingCalculator` | 表結構已預留；**目前** `usage_records.credit_cost` 主要取自 Bifrost log 的 `cost`；依規則重算與管理 API 為後續工作 |
| **Credit 精度** | `decimal(20, 10)`，程式端字串運算 | Credit 帳本以十進位字串處理；`usage_records.credit_cost` 於 SQLite 為 `real`，與 Gateway 數值對齊 |
| **排程** | `@gravito/horizon` Cron | **`Foundation` 的 `IScheduler`**；`DashboardServiceProvider.registerJobs()` 註冊 `bifrost-sync`，cron 來自 `config/app` 的 `bifrostSyncCron`（預設 `*/5 * * * *`） |
| **分散式鎖** | Horizon + Stasis（Redis） | **現行**以排程 + job 設定為主；多實例互斥若需再補鎖 |
| **事件** | `@gravito/signal` / Domain Events | `DomainEventDispatcher`：`bifrost.sync.completed`、`credit.balance_depleted`、`credit.topped_up` 等 |
| **Dashboard** | 全部讀本地 DB | 與規格一致 |

---

## 1. Credit 模組

實作目錄：`src/Modules/Credit/`（與下列對照時以倉庫為準）。

### 1.1 目錄結構（目標／現行）

```
src/Modules/Credit/
├── Domain/
│   ├── Aggregates/CreditAccount.ts
│   ├── Entities/CreditTransaction.ts
│   ├── ValueObjects/
│   │   ├── Balance.ts
│   │   └── TransactionType.ts       # TOPUP | DEDUCTION | REFUND | EXPIRY | ADJUSTMENT
│   ├── Repositories/ICreditAccountRepository.ts
│   ├── Repositories/ICreditTransactionRepository.ts
│   ├── Events/BalanceLow.ts
│   ├── Events/BalanceDepleted.ts
│   ├── Events/CreditToppedUp.ts
│   └── （原規格 CreditDeductionService：概念由 CreditAccount + Application 扣款服務承接，見 1.4）
├── Application/
│   ├── Services/
│   │   ├── TopUpCreditService.ts
│   │   ├── DeductCreditService.ts          # 單筆扣款、寫入 Transaction、派發餘額事件
│   │   ├── ApplyUsageChargesService.ts     # 同步完成後對 usage_record 批次入帳扣款
│   │   ├── RefundCreditService.ts
│   │   ├── GetBalanceService.ts
│   │   ├── GetTransactionHistoryService.ts
│   │   ├── HandleBalanceDepletedService.ts
│   │   └── HandleCreditToppedUpService.ts
│   └── DTOs/ …
├── Infrastructure/
│   ├── Repositories/CreditAccountRepository.ts
│   ├── Repositories/CreditTransactionRepository.ts
│   └── Providers/CreditServiceProvider.ts  # 註冊服務 + 訂閱 bifrost.sync.completed 等
├── Presentation/
│   ├── Controllers/CreditController.ts
│   ├── Routes/credit.routes.ts
│   └── Requests/ …
└── __tests__/
```

> 原規格中的 `BifrostKeyBlocker.ts` 未獨立建檔；凍結／恢復由 `HandleBalanceDepletedService` / `HandleCreditToppedUpService` 與 `ILLMGatewayClient` 完成。

### 1.2 CreditAccount 聚合根

- 每個 Organization 一個 CreditAccount（個人用戶視為單人 Org）
- `balance` 以十進位字串於領域層運算，避免浮點誤差（持久層對應 `decimal`/字串欄位）
- Balance 只能透過 CreditTransaction 異動，禁止直接修改

**DB Schema — `credit_accounts`：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `orgId` | UUID | FK → Organization（UNIQUE） |
| `balance` | decimal(20,10) / 對應型別 | 當前餘額 |
| `lowBalanceThreshold` | decimal(20,10) | 低餘額告警閾值 |
| `status` | enum | `ACTIVE` / `FROZEN` |
| `createdAt` | timestamp | 建立時間 |
| `updatedAt` | timestamp | 更新時間 |

### 1.3 CreditTransaction（append-only）

**DB Schema — `credit_transactions`：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `creditAccountId` | UUID | FK → CreditAccount |
| `type` | enum | `TOPUP` / `DEDUCTION` / `REFUND` / `EXPIRY` / `ADJUSTMENT` |
| `amount` | decimal(20,10) | 異動金額（正數） |
| `balanceAfter` | decimal(20,10) | 異動後餘額（審計用快照） |
| `referenceType` | string | 關聯來源類型（如 `usage_record`、`manual`） |
| `referenceId` | string | 關聯來源 ID |
| `description` | string | 說明 |
| `createdAt` | timestamp | 建立時間 |

### 1.4 扣款語義：`DeductCreditService` + `CreditAccount`（對應原 CreditDeductionService）

核心扣款邏輯由 **Application 層 `DeductCreditService`** 與 **`CreditAccount.applyDeduction`**（聚合行為）完成：

1. 讀取 CreditAccount 當前 balance
2. 檢查餘額是否足夠（不足時仍扣至零，不拒絕）
3. 建立 DEDUCTION 類型的 CreditTransaction
4. 於 DB 交易內更新帳戶餘額並寫入交易（immutable 聚合更新）
5. 餘額低於 `lowBalanceThreshold` → 派發 `BalanceLow` 事件
6. 餘額 ≤ 0 → 派發 `BalanceDepleted` 事件

**用量入帳**：`ApplyUsageChargesService` 掃描尚未關聯扣款之 `usage_records`，對每筆呼叫 `DeductCreditService.execute`（`referenceType: usage_record`，`referenceId: usage_record.id`），並以 repository 查重避免重複扣款。

### 1.5 Domain Events

| 事件 | 觸發時機 | 消費者 |
|------|---------|--------|
| `BalanceLow` | 餘額低於可配置閾值 | 通知服務（未來擴充） |
| `BalanceDepleted` | 餘額 ≤ 0 | `HandleBalanceDepletedService` → 阻擋 Gateway Keys |
| `CreditToppedUp` | 充值完成 | `HandleCreditToppedUpService` → 恢復被阻擋的 Keys |

### 1.6 餘額阻擋 / 恢復流程

**Key 凍結快照（新增欄位於 ApiKey 表）：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `suspensionReason` | string (nullable) | 凍結原因：`CREDIT_DEPLETED` / `ADMIN_MANUAL` / `null` |
| `preFreezeRateLimit` | JSON (nullable) | 凍結前的 rate limit 快照 `{ rpm, tpm }` |
| `suspendedAt` | timestamp (nullable) | 凍結時間 |

**阻擋（BalanceDepleted）：**

```
HandleBalanceDepletedService:
  1. 從事件取得 orgId
  2. 查詢該 Org 所有「活躍」的 ApiKeys（實作：findActiveByOrgId）
  3. 對每個 Key：
     a. 讀取當前 rate limit 設定，寫入 preFreezeRateLimit 快照
     b. 設定 suspensionReason = 'CREDIT_DEPLETED'、suspendedAt = now()
     c. ILLMGatewayClient.updateKey(gatewayKeyId, { rateLimit: 全零… }) 阻擋流量
     d. 標記 Key 狀態為 suspended_no_credit（領域值物件：KeyStatus.suspendedNoCredit）
  4. 整個操作冪等：已因餘額凍結者跳過
```

**恢復（CreditToppedUp）：**

```
HandleCreditToppedUpService:
  1. 從事件取得 orgId
  2. 查詢該 Org 所有 suspensionReason = 'CREDIT_DEPLETED' 的 ApiKeys
     （精確篩選，不影響 ADMIN_MANUAL 等其他原因的凍結）
  3. 對每個 Key：
     a. 從 preFreezeRateLimit 讀取凍結前的 rate limit
     b. ILLMGatewayClient.updateKey(gatewayKeyId, …) 還原 rate limit
     c. 清除 suspensionReason / preFreezeRateLimit / suspendedAt
     d. 標記 Key 狀態恢復為 ACTIVE
  4. 整個操作冪等：已是 ACTIVE 的 Key 跳過
```

### 1.7 Credit API

**現行路由（org-scoped）：**

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| `GET` | `/api/organizations/:orgId/credits/balance` | 當前餘額 | member+（module `credit`） |
| `GET` | `/api/organizations/:orgId/credits/transactions` | 交易歷史（分頁） | member+ |
| `POST` | `/api/organizations/:orgId/credits/topup` | 充值 | admin |
| `POST` | `/api/organizations/:orgId/credits/refund` | 退款 | admin |

> 規格中的 `POST .../adjustment` 若尚未實作，仍以 [README](./README.md)「待補」為準。

---

## 2. 用量同步（概念模組 UsageSync；實作於 Dashboard + Credit）

### 2.1 實作位置（取代獨立 `src/Modules/UsageSync/`）

| 職責 | 位置 |
|------|------|
| 拉取 Bifrost／Gateway usage logs、寫入 `usage_records`、推進游標 | `src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts` |
| 排程註冊 | `DashboardServiceProvider.registerJobs()` |
| 同步完成事件 | `BifrostSyncCompletedEvent` → `bifrost.sync.completed` |
| 依用量扣款 | `CreditServiceProvider.boot()` 訂閱 → `ApplyUsageChargesService` |

**參考目錄（精簡）：**

```
src/Modules/Dashboard/
├── Infrastructure/Services/BifrostSyncService.ts
├── Infrastructure/Repositories/DrizzleUsageRepository.ts
├── Infrastructure/Repositories/DrizzleSyncCursorRepository.ts
├── Domain/Events/BifrostSyncCompletedEvent.ts
└── …

src/Modules/Credit/
├── Application/Services/ApplyUsageChargesService.ts
└── Infrastructure/Providers/CreditServiceProvider.ts  # 事件訂閱
```

### 2.2 排程設定（現行）

於 `DashboardServiceProvider` 向 `IScheduler` 註冊名為 `bifrost-sync` 的 job：`cron` 取自應用設定 `bifrostSyncCron`（預設每 5 分鐘），`handler` 內取得 `BifrostSyncService` 並執行 `sync()`。

```typescript
// DashboardServiceProvider.registerJobs() — 概念示意，實際以程式為準
scheduler.add({
  name: 'bifrost-sync',
  cron: appConfig.bifrostSyncCron,
  preventOverlapping: true,
  handler: async () => {
    await bifrostSyncService.sync()
  },
})
```

### 2.3 SyncCursor

**DB — `sync_cursors`：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `cursorType` | string | **現行主鍵值：`bifrost_logs`**（非早期草稿的 `bifrost_usage`） |
| `lastSyncedAt` | timestamp | 同步視窗／游標推進參考 |
| `lastBifrostLogId` | string | 最後處理之 log id |
| `updatedAt` | timestamp | 更新時間 |

**冪等與補償：**

- 以 `bifrost_log_id` **UNIQUE** 約束與 upsert 避免重複入庫；扣款側以 `usage_record` id 與交易 reference 去重。
- Bifrost 可能存在延遲產出的 log：可搭配時間視窗與 **backfill** API（見 2.8）補齊；原規格之重疊視窗策略仍可作為 Gateway 能力演進時的參考。

### 2.4 UsageRecord

**DB — `usage_records`（與 Drizzle schema 對齊）：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `bifrostLogId` | string | 冪等鍵（UNIQUE） |
| `apiKeyId` | UUID | FK → ApiKey |
| `orgId` | UUID | FK → Organization |
| `model` | string | 模型名稱 |
| `inputTokens` / `outputTokens` | integer | Token 數 |
| `creditCost` | number（SQLite `real`） | 消耗；**目前**來自 Gateway log 的 `cost` |
| `provider` | string | 可選 |
| `latencyMs` | integer | 可選 |
| `status` | string | 可選（如 success / error） |
| `occurredAt` | timestamp | 發生時間 |
| `createdAt` | timestamp | 寫入時間 |

無法對應本系 ApiKey 的 log 可進入 `quarantined_logs`（見 `BifrostSyncService.quarantineLog`），避免同步整批失敗。

### 2.5 同步與扣款流程（現行：兩階段）

```
BifrostSyncService.sync():
  1. 讀取 SyncCursor（cursor_type = bifrost_logs）
  2. 呼叫 ILLMGatewayClient.getUsageLogs(…) 分頁拉取
  3. 對每筆 log：解析 ApiKey → upsert usage_records（bifrost_log_id 冪等）
  4. 推進游標（若 advanceCursor）
  5. 若有新寫入 → dispatch BifrostSyncCompletedEvent（含 affected orgIds、時間範圍）

CreditServiceProvider（訂閱 bifrost.sync.completed）:
  → ApplyUsageChargesService.execute({ orgIds, startTime, endTime })
  → 對每筆尚未扣款之 usage_record 呼叫 DeductCreditService
```

此設計將「網路同步」與「扣款入帳」解耦：拉取失敗不直接影響已入庫紀錄之扣款重試策略。

### 2.6 PricingRule（目標模型）

**DB — `pricing_rules`：** 欄位含 `modelPattern`、`inputTokenPrice`、`outputTokenPrice`、`imagePrice`、`audioPrice`、`priority`、`isActive` 等（見 migration／schema）。

**UsagePricingCalculator（規格）：** 按 `priority` 降序，glob 匹配第一條規則；無匹配則應明確錯誤。**現行**仍以 Bifrost 回傳 `cost` 寫入為主；規則重算與管理 API 見 [README](./README.md)「待補」。

### 2.7 異常偵測（待補）

```
DetectUsageAnomalyService.execute():  # 規格／待實作
  1. 取得本次同步的用量總計（按 orgId 分組）
  2. 取得上一個同步週期的用量總計
  3. 若本次 > 上次 × 3 → raise UsageAnomalyDetected 事件
  4. 管理員收到通知，可手動暫停相關 Key
```

### 2.8 HTTP 介面（現行／規格）

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| `POST` | `/api/dashboard/bifrost-sync/backfill` | 依時間區間補同步（管理） | admin |
| `GET` | `/api/organizations/:orgId/dashboard/usage` | 用量匯總（儀表板） | member+ |

規格中的 `GET /api/usage-sync/status`、`POST .../trigger` 若產品仍需要，可於 Dashboard 模組擴充並與 `BifrostSyncService` 對接。

### 2.9 PricingRule 管理 API（待補）

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| `GET` | `/api/pricing-rules` | 列表 | admin |
| `POST` | `/api/pricing-rules` | 新增 | admin |
| `PUT` | `/api/pricing-rules/:id` | 更新 | admin |
| `DELETE` | `/api/pricing-rules/:id` | 刪除 | admin |

---

## 3. Dashboard 費用補完

資料全部來自本地 DB。**現行**儀表路徑為 org-scoped，例如：

| API | 用途 | 資料來源 |
|-----|------|----------|
| `GET /api/organizations/:orgId/dashboard` | KPI／摘要 | ApiKey、`usage_records`、CreditAccount 等 |
| `GET /api/organizations/:orgId/dashboard/usage` | 用量時序 | `usage_records` 聚合 |
| `GET /api/organizations/:orgId/dashboard/cost-trends` 等 | 費用／趨勢 | CreditTransaction + usage 聚合 |

（實際端點以 `dashboard.routes.ts` 為準。）

---

## 4. DB Migration 清單

核心表（與專案 migration 對齊）：

1. `credit_accounts` — CreditAccount 聚合
2. `credit_transactions` — append-only 交易紀錄
3. `usage_records` — 本地化用量資料（含 `bifrost_log_id` UNIQUE）
4. `sync_cursors` — 同步游標
5. `pricing_rules` — 定價規則
6. `quarantined_logs` — 無法關聯之 Gateway log（選用）

---

## 5. 模組間依賴圖（現行）

```
Dashboard (BifrostSyncService)
  ├── ILLMGatewayClient（拉取 usage logs）
  ├── IUsageRepository / sync_cursors
  ├── ApiKey（virtual key → org 映射）
  └── DomainEventDispatcher → bifrost.sync.completed

Credit
  ├── 訂閱 bifrost.sync.completed → ApplyUsageChargesService
  ├── Organization、CreditAccount、CreditTransaction
  ├── ApiKey（餘額阻擋／恢復）
  └── ILLMGatewayClient（updateKey）

Dashboard（讀取）
  ├── usage_records
  ├── CreditAccount／聚合指標
  └── CreditTransaction（成本視角）
```

---

## 6. 並行分工建議

| 工作包 | 內容 | 依賴 |
|--------|------|------|
| **WP-A** | Credit 模組（帳戶、Transaction、`DeductCreditService`、充值、事件處理） | Organization、ApiKey |
| **WP-B** | Dashboard 同步管線 + `ApplyUsageChargesService` 銜接 | Gateway、Credit |
| **WP-C** | 定價規則接軌、異常偵測、儀表成本 API 擴充 | usage_records、CreditTransaction |

---

## 7. 完成標準

與 [README](./README.md) 中「驗收標準」一節一致，摘要如下：

**已完成（核心）**

- [x] Credit 帳戶、充值、扣款、退款與交易歷史
- [x] Bifrost 用量拉取、`usage_records`／游標、排程
- [x] `bifrost.sync.completed` → `ApplyUsageChargesService` 依 `usage_record` 扣款（冪等）
- [x] 餘額耗盡凍結 Key、充值後恢復（事件驅動）
- [x] 低餘額告警（BalanceLow）

**待補或延伸**

- [ ] **定價規則**：與 `pricing_rules` 全面接軌、依模型重算 `credit_cost`、管理 API
- [ ] **用量異常偵測**
- [ ] **測試覆蓋率**：以 CI `unit-coverage`（`bun test --coverage`）與 `bunfig.toml` 門檻為準

---

## 8. 變更紀要（2026-04-20）

- 對齊實作：**無獨立 UsageSync 模組**；同步在 **Dashboard**，扣款在 **Credit** + 事件。
- 以 **`DeductCreditService` / `ApplyUsageChargesService`** 取代文件中的 **`CreditDeductionService`** 命名。
- 排程改為 **`IScheduler` + `DashboardServiceProvider`**，cron 可設定。
- **API 路徑**改為 **`/api/organizations/:orgId/...`** 前綴（Credit／Dashboard）。
- Gateway 操作以 **`ILLMGatewayClient.updateKey`** 為準；Key 狀態 **`suspended_no_credit`**。
- **Sync cursor** 類型 **`bifrost_logs`**；**usage_records** 欄位與 **quarantined_logs** 補齊說明。
