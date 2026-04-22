# 4. 信用與計費系統

> 餘額管理、充值扣款、使用量同步、定價規則

## 📄 文檔

### [Phase 4：Credit System — 額度與計費設計規格](./credit-system-design.md)

**核心目標**：完整的 Credit 儲值、扣款、餘額管理，以及從 Bifrost 同步用量並轉換為 Credit 消耗。

本文件以 **目標模型／現行實作** 對照撰寫（含 API 路徑、模組落點、`bifrost_logs` 游標等），結尾 **第 8 節（變更紀要）** 記錄與早期草稿的差異；驗收勾選與「待補」以本 README 為準。

### [使用者故事與驗收](./user-stories.md)

相關架構文件：
- [`architecture/bifrost-sync-data-flow.md`](../../architecture/bifrost-sync-data-flow.md)
- [`architecture/report-rendering-data-flow.md`](../../architecture/report-rendering-data-flow.md)

---

## 📊 系統架構決策

| 決策項目 | 選擇 | 理由 |
|---------|------|------|
| 同步策略 | Bifrost 用量寫入 `usage_records` 後，由 `ApplyUsageChargesService` 對尚未入帳之紀錄扣款（可與同步管線分階段） | 與網路拉取解耦；扣款以 `usage_record` 做參照與去重 |
| 定價規則 | DB 有 `pricing_rules` 表（schema）；**目前** `usage_records.credit_cost` 主要取自 Bifrost log 的 cost | 表結構預留；依模型規則重算與管理 API 為後續工作 |
| Credit 精度 | `decimal(20, 10)` 支援高精度小數 | 避免浮點誤差 |
| 排程系統 | `Foundation` 的 `IScheduler`；`DashboardServiceProvider.registerJobs()` 註冊 `bifrost-sync`（`runOnInit: true`、重試與 backoff 見程式），cron 來自 `config/app` 之 `bifrostSyncCron`（預設 `*/5 * * * *`） | 與應用 bootstrap 一致；可環境覆寫 |
| 分散式鎖 | 原規格為 Horizon + Stasis；**現行**同步以排程驅動為主（見程式） | 若需多實例互斥，可再補鎖 |
| 事件驅動 | `DomainEventDispatcher` 事件型別字串：`bifrost.sync.completed`（同步後）→ Credit 用量入帳；`credit.balance_low` / `credit.balance_depleted` / `credit.topped_up`（餘額與充值）；Alerts 亦訂閱 `bifrost.sync.completed` 做預算閾值評估（見下「Credit ↔ Alerts」） | 鬆耦合、可擴展 |
| 資料來源 | Dashboard 聚合讀本地 DB | 避免依賴 Bifrost 即時查詢，降低延遲 |

---

## 🏗️ 核心模組

### 1. Credit 模組（`src/Modules/Credit/`）

**職責**：Credit 帳戶管理、交易記錄、餘額扣款、用量入帳後扣款

#### Domain Layer

| 元件 | 說明 |
|------|------|
| **CreditAccount** | Aggregate Root，代表一個 Organization 的 Credit 帳戶 |
| **CreditTransaction** | Entity，記錄每筆信用異動（充值、扣款、退款、過期、調整） |
| **Balance VO** | 餘額，使用字串操作避免浮點誤差 |
| **TransactionType VO** | 交易類型列舉 |
| **Domain Events** | `credit.balance_low`、`credit.balance_depleted`、`credit.topped_up`（對應類別 `BalanceLow`、`BalanceDepleted`、`CreditToppedUp`） |

#### Application Services

| Service | 職責 |
|---------|------|
| **TopUpCreditService** | 用戶/管理員充值 Credit |
| **DeductCreditService** | 扣除 Credit（手動或對單筆用量）；餘額不足時扣至零（不拒絕）；領域內觸發 `credit.balance_low`／`credit.balance_depleted`；用量扣款與 DB 唯一鍵衝突時視為已入帳並回傳成功（冪等） |
| **ApplyUsageChargesService** | 同步完成後掃描 `usage_records`，對尚未建立對應 deduction 的紀錄呼叫扣款（`referenceType: usage_record`） |
| **RefundCreditService** | 退款（異常情況或取消訂單） |
| **GetBalanceService** | 查詢當前餘額 |
| **GetTransactionHistoryService** | 查詢交易歷史 |
| **HandleBalanceDepletedService** | 響應 `credit.balance_depleted`，凍結 Keys |
| **HandleCreditToppedUpService** | 響應 `credit.topped_up`，恢復 Keys |

### 2. 用量同步（現行實作於 Dashboard 的 BifrostSyncService）

**職責**：定時經 **LLM Gateway**（`ILLMGatewayClient`）拉取用量、寫入 `usage_records` 與游標；若有新筆數入庫則派發事件驅動 Credit 扣款與 Alerts 評估。

> **目錄說明**：倉庫**未**建立獨立 `src/Modules/UsageSync/`。拉取與入庫見 `src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts`；排程見 `DashboardServiceProvider.registerJobs()`。

#### 核心流程（與現行程式對齊）

```
排程 job「bifrost-sync」（cron 可設定，預設每 5 分鐘）
  ↓
BifrostSyncService：經 Gateway 拉取 usage logs → 寫入 usage_records（冪等鍵等）
  ↓
當本輪 synced > 0 時派發 bifrost.sync.completed（BifrostSyncCompletedEvent；附 orgIds 與時間窗）
  ↓
CreditServiceProvider：訂閱 → ApplyUsageChargesService
AlertsServiceProvider：訂閱 → EvaluateThresholdsService（月預算／用量閾值通知，與 Credit 餘額分屬不同管線）
  ↓
對尚未入帳之 usage 呼叫 DeductCreditService（單筆 DB 交易內寫 Transaction + 更新餘額）
  ↓
credit.balance_low / credit.balance_depleted / credit.topped_up → 事件處理器（凍結／恢復 Key 等）
```

#### 定價規則（目標模型 vs 現狀）

規格中的 **PricingRule** 聚合（模型／單價／生效區間等）仍為產品方向；資料庫已有 `pricing_rules` 表定義，但**尚未**全面接軌「依規則重算 `credit_cost`」與管理 API。目前寫入 `usage_records` 時之成本主要沿用 Bifrost 回傳之 `cost`（見 `BifrostSyncService` 實作）。

---

## 💳 核心資料模型

### CreditAccount （信用帳戶）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `orgId` | UUID | FK to Organization (UNIQUE) |
| `balance` | decimal(20,10) | 當前餘額 |
| `lowBalanceThreshold` | decimal(20,10) | 低餘額告警閾值（預設） |
| `status` | enum | ACTIVE / FROZEN（管理員凍結） |
| `createdAt` | timestamp | 建立時間 |
| `updatedAt` | timestamp | 更新時間 |

### CreditTransaction （信用交易，Append-only）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `creditAccountId` | UUID | FK to CreditAccount |
| `type` | enum | TOPUP / DEDUCTION / REFUND / EXPIRY / ADJUSTMENT |
| `amount` | decimal(20,10) | 異動金額（正數） |
| `balanceAfter` | decimal(20,10) | 異動後餘額（審計用快照） |
| `referenceType` | string | 關聯來源類型（usage_record, manual, order_cancel） |
| `referenceId` | string | 關聯來源 ID |
| `description` | string | 說明 |
| `createdAt` | timestamp | 建立時間 |

---

## 🔗 與其他模組的聯動

### Credit ↔ ApiKey 聯動

Gateway 呼叫經 **`ILLMGatewayClient.updateKey`**（非獨立 `BifrostClient` 類別名），將限流設為零以阻擋流量、恢復時寫回凍結前快照。

**餘額阻擋（`credit.balance_depleted`）：**
```
DeductCreditService 扣款後餘額 ≤ 0 → 派發 credit.balance_depleted
  ↓
HandleBalanceDepletedService
  ↓
遍歷該 Org 所有 ACTIVE 的 ApiKey
  ↓
對每個 Key:
  1. 記錄凍結前的 rate limit（rpm/tpm）
  2. 設定 suspensionReason = 'CREDIT_DEPLETED'
  3. gatewayClient.updateKey（rateLimit 設為零／最小允許值以阻擋請求）
  4. 持久化為 SUSPENDED（經 ApiKey 聚合 suspend）
```

**餘額恢復（`credit.topped_up`）：**
```
充值完成 → TopUpCreditService
  ↓
派發 credit.topped_up
  ↓
HandleCreditToppedUpService
  ↓
遍歷該 Org 所有 suspensionReason = 'CREDIT_DEPLETED' 的 Key
  ↓
對每個 Key:
  1. 讀取凍結前的 rate limit 快照（preFreezeRateLimit）
  2. gatewayClient.updateKey 還原限流
  3. unsuspend 清除 suspensionReason 等欄位
  4. 標記 Key 狀態恢復為 ACTIVE
```

### Credit ↔ Alerts 聯動

- **`bifrost.sync.completed`** 時，`AlertsServiceProvider` 會呼叫 **`EvaluateThresholdsService.evaluateOrgs`**，依各 Org 的 Alert 設定與**當月**用量／預算比對，觸發分級通知（與 Credit 帳本餘額無直接耦合）。
- **`credit.balance_low`** 目前由領域層派發，供測試與後續擴充；若產品上要「餘額過低」與「用量預算」雙軌通知，可再訂閱該事件或接入 `@gravito/signal` 等通道。

---

## 🧪 驗收標準

Phase 4 功能驗收（與 [工作計劃 Phase 4](../0-planning/draupnir-v1-workplan.md#phase-4credit-system--額度與計費) 一節內「Phase 4 驗收註記（2026-04-20）」對照表一致）：

**已完成（核心）**

- [x] Credit 帳戶建立與初始化
- [x] 充值、扣款、退款流程與交易歷史可追蹤
- [x] Bifrost 用量拉取、`usage_records` / 游標、排程註冊（Dashboard 模組）
- [x] `bifrost.sync.completed` → `ApplyUsageChargesService` → 依 `usage_record` 扣款（去重／冪等）
- [x] 餘額耗盡時凍結 Key、充值後恢復（事件驅動）
- [x] 低餘額領域事件（`credit.balance_low` 派發；對外通知可再接 Alerts／Signal）

**待補或延伸（原規格加值）**

- [ ] **定價規則**：`pricing_rules` 與依模型規則重算、管理 API 全面接軌
- [ ] **用量異常偵測**（突增告警等）
- [ ] **測試覆蓋率 ≥ 80%**：以 CI `unit-coverage`（`bun test --coverage`）與 `bunfig.toml` 門檻為準

---

## 📌 設計考量

### 為什麼 decimal(20, 10)？
- 支援高精度小數定價（如 0.000001 per token）
- 避免浮點誤差累積
- 適合國際化定價（支援多幣種）

### 為什麼 Append-only CreditTransaction？
- 完整審計記錄
- 交易不可修改，確保帳務正確性
- 便於對帳與糾紛解決

### 為什麼扣款與 Bifrost 拉取可分階段？
- 網路拉取失敗不直接影響已入庫之扣款重試策略
- `ApplyUsageChargesService` 可對單一 `usage_record` 做入帳冪等（與 `credit_transactions` 上 usage 扣款唯一性約束一致）

### 為什麼 `bifrost.sync.completed` 僅在 `synced > 0` 時派發？
- 本輪無新筆數入庫時不必驅動用量扣款與 Alerts 重算，避免空轉

### 為什麼記錄 preFreezeRateLimit？
- 當充值恢復 Key 時，能精確恢復原先的 rate limit 設定
- 避免簡單地設為預設值導致配置丟失

---

## 🚀 後續與擴展

### V1.1 計劃
- **定價規則**全面接軌 DB 與管理後台
- Credit 過期機制（預充值的 Credit 在一定期限後過期）
- 更詳細的成本分析（按 Model、按 Provider 分組）
- 用量異常告警（突增、異常消耗模式）

### V1.2+ 可能擴展
- 分級定價（使用量越多越便宜）
- 預付款折扣
- 訂閱計劃（月度額度包）
- 自動補充（餘額低於閾值時自動充值）
- 多幣種支援（CNY, USD, EUR）

---

## 🔍 相關文檔

- **工作計劃** → [0-planning/Phase 4](../0-planning/draupnir-v1-workplan.md#phase-4credit-system--額度與計費)
- **API Key 阻擋機制** → [3-api-keys](../3-api-keys/)
- **架構評審** → [6-architecture](../6-architecture/)

---

**狀態**：✅ Phase 4 核心（Credit + Bifrost 同步入庫 + 用量入帳扣款）已落地；定價規則接軌與異常偵測等見驗收「待補」  
**最後更新**：2026-04-20  
**測試覆蓋**：以 CI `unit-coverage` 為準（全專案門檻見 `bunfig.toml`）
