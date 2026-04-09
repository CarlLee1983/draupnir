# Phase 4：Credit System — 額度與計費 設計規格

> P4 完整設計規格，涵蓋 Credit 模組、UsageSync 模組、Dashboard 費用補完

## 概述

**目標：** Credit 儲值、扣款、餘額管理，以及從 Bifrost 同步用量並轉換為 Credit 消耗

**架構決策：**
- **同步策略：** UsageSync 在單一 DB 交易內完成扣款（方案 A — 強一致性）
- **定價規則：** 存 DB，管理者可透過 API 動態調整
- **Credit 精度：** `decimal(20, 10)` 支援高精度小數定價
- **排程：** 使用 `@gravito/horizon` Cron Job
- **分散式鎖：** Horizon + Stasis（Redis）cache 後端
- **事件通訊：** `@gravito/signal` Domain Events
- **Dashboard 資料來源：** 全部讀本地 DB，不直接打 Bifrost

---

## 1. Credit 模組

### 1.1 目錄結構

```
src/Modules/Credit/
├── Domain/
│   ├── Aggregates/CreditAccount.ts
│   ├── Entities/CreditTransaction.ts
│   ├── ValueObjects/
│   │   ├── CreditAccountId.ts
│   │   ├── Balance.ts
│   │   └── TransactionType.ts       # TOPUP | DEDUCTION | REFUND | EXPIRY | ADJUSTMENT
│   ├── Repositories/ICreditAccountRepository.ts
│   ├── Repositories/ICreditTransactionRepository.ts
│   ├── Events/BalanceLow.ts
│   ├── Events/BalanceDepleted.ts
│   ├── Events/CreditToppedUp.ts
│   └── Services/CreditDeductionService.ts
├── Application/
│   ├── Services/
│   │   ├── TopUpCreditService.ts
│   │   ├── DeductCreditService.ts
│   │   ├── RefundCreditService.ts
│   │   ├── GetBalanceService.ts
│   │   ├── GetTransactionHistoryService.ts
│   │   ├── HandleBalanceDepletedService.ts
│   │   └── HandleCreditToppedUpService.ts
│   └── DTOs/TopUpDto.ts, DeductDto.ts
├── Infrastructure/
│   ├── Repositories/CreditAccountRepository.ts
│   ├── Repositories/CreditTransactionRepository.ts
│   ├── Providers/CreditServiceProvider.ts
│   └── Services/BifrostKeyBlocker.ts
├── Presentation/
│   ├── Controllers/CreditController.ts
│   ├── Routes/creditRoutes.ts
│   └── Validators/topUpValidator.ts, refundValidator.ts
└── __tests__/
```

### 1.2 CreditAccount 聚合根

- 每個 Organization 一個 CreditAccount（個人用戶視為單人 Org）
- `balance` 用 `decimal(20, 10)` 儲存，程式端以字串操作避免浮點誤差
- Balance 只能透過 CreditTransaction 異動，禁止直接修改

**DB Schema — `credit_accounts`：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `orgId` | UUID | FK → Organization（UNIQUE） |
| `balance` | decimal(20,10) | 當前餘額 |
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

### 1.4 CreditDeductionService（Domain Service）

核心扣款邏輯：

1. 讀取 CreditAccount 當前 balance
2. 檢查餘額是否足夠（不足時仍扣至零，不拒絕）
3. 建立 DEDUCTION 類型的 CreditTransaction
4. 更新 CreditAccount.balance（新物件，不 mutate）
5. 餘額低於 `lowBalanceThreshold` → raise `BalanceLow` 事件
6. 餘額 ≤ 0 → raise `BalanceDepleted` 事件

### 1.5 Domain Events

| 事件 | 觸發時機 | 消費者 |
|------|---------|--------|
| `BalanceLow` | 餘額低於可配置閾值 | 通知服務（未來擴充） |
| `BalanceDepleted` | 餘額 ≤ 0 | `HandleBalanceDepletedService` → 阻擋 Bifrost Keys |
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
  2. 查詢該 Org 所有 status = ACTIVE 的 ApiKeys
  3. 對每個 Key：
     a. 讀取當前 rate limit 設定，寫入 preFreezeRateLimit 快照
     b. 設定 suspensionReason = 'CREDIT_DEPLETED'、suspendedAt = now()
     c. BifrostClient.updateRateLimit(virtualKeyId, { rpm: 0, tpm: 0 })
     d. 標記 Key 狀態為 SUSPENDED_NO_CREDIT
  4. 整個操作冪等：已是 SUSPENDED_NO_CREDIT 的 Key 跳過
```

**恢復（CreditToppedUp）：**

```
HandleCreditToppedUpService:
  1. 從事件取得 orgId
  2. 查詢該 Org 所有 suspensionReason = 'CREDIT_DEPLETED' 的 ApiKeys
     （精確篩選，不影響 ADMIN_MANUAL 等其他原因的凍結）
  3. 對每個 Key：
     a. 從 preFreezeRateLimit 讀取凍結前的 rate limit
     b. BifrostClient.updateRateLimit(virtualKeyId, preFreezeRateLimit)
     c. 清除 suspensionReason / preFreezeRateLimit / suspendedAt
     d. 標記 Key 狀態恢復為 ACTIVE
  4. 整個操作冪等：已是 ACTIVE 的 Key 跳過
```

### 1.7 Credit API

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| `GET` | `/api/credits/balance` | 查詢當前餘額 | member+ |
| `GET` | `/api/credits/transactions` | 交易歷史（分頁） | member+ |
| `POST` | `/api/credits/topup` | 充值 | admin |
| `POST` | `/api/credits/refund` | 退款 | admin |
| `POST` | `/api/credits/adjustment` | 手動調整 | admin |

---

## 2. UsageSync 模組

### 2.1 目錄結構

```
src/Modules/UsageSync/
├── Domain/
│   ├── Entities/UsageRecord.ts
│   ├── Entities/SyncCursor.ts
│   ├── ValueObjects/UsageAmount.ts, PricingTier.ts
│   ├── Repositories/IUsageRecordRepository.ts
│   ├── Repositories/ISyncCursorRepository.ts
│   ├── Events/UsageAnomalyDetected.ts
│   └── Services/UsagePricingCalculator.ts
├── Application/
│   ├── Services/
│   │   ├── SyncBifrostUsageService.ts
│   │   ├── DetectUsageAnomalyService.ts
│   │   └── GetSyncStatusService.ts
│   └── DTOs/PricingRuleDto.ts, SyncStatusDto.ts
├── Infrastructure/
│   ├── Repositories/UsageRecordRepository.ts
│   ├── Repositories/SyncCursorRepository.ts
│   ├── Providers/UsageSyncServiceProvider.ts
│   └── Services/BifrostUsageFetcher.ts
├── Presentation/
│   ├── Controllers/UsageSyncController.ts
│   ├── Routes/usageSyncRoutes.ts
│   └── Validators/triggerSyncValidator.ts
└── __tests__/
```

### 2.2 Horizon 排程設定

```typescript
// UsageSyncServiceProvider.boot()
const schedule = core.make<ISchedule>('schedule')

schedule.add({
  name: 'sync-bifrost-usage',
  cron: '*/5 * * * *',
  preventOverlapping: true,
  timeout: 120_000,
  retries: 2,
  handler: async () => {
    const syncService = core.make<SyncBifrostUsageService>('usageSync.sync')
    await syncService.execute()
  },
  onError: async (error) => {
    console.error('UsageSync failed:', error)
    // 未來接告警通知
  },
})
```

### 2.3 SyncCursor

**DB Schema — `sync_cursors`：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `cursorType` | string | 固定值 `bifrost_usage` |
| `lastSyncedAt` | timestamp | 本次同步批次中最新一筆 log 的時間戳 |
| `lastBifrostLogId` | string | 本次同步批次中最後一筆 log ID |
| `updatedAt` | timestamp | cursor 更新時間 |

**重疊視窗策略：**

Bifrost 可能存在延遲產出的 log（時間戳早於 cursor 但尚未出現）。為防止永久遺漏：

- 每次拉取時回溯一個重疊視窗：`after: lastSyncedAt - OVERLAP_WINDOW`（預設 10 分鐘）
- 拉回的 log 透過 `bifrostLogId` UNIQUE 索引冪等去重：已存在則跳過，不重複扣款
- Cursor 只在交易提交時推進至本次批次中最新 log 的時間戳
- 若 Bifrost API 支援基於 log ID 的分頁（`after_id`），優先使用 ID-based cursor 作為主要推進方式，時間戳作為輔助回溯

### 2.4 UsageRecord

**DB Schema — `usage_records`：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `bifrostLogId` | string | 冪等鍵（UNIQUE 索引） |
| `apiKeyId` | UUID | FK → ApiKey |
| `orgId` | UUID | FK → Organization |
| `model` | string | 使用的模型名稱 |
| `inputTokens` | integer | 輸入 token 數 |
| `outputTokens` | integer | 輸出 token 數 |
| `creditCost` | decimal(20,10) | 計算後的 Credit 消耗 |
| `occurredAt` | timestamp | Bifrost 端的發生時間 |
| `createdAt` | timestamp | 寫入時間 |

### 2.5 同步流程（單一 DB 交易內）

```
SyncBifrostUsageService.execute():
  1. 讀取 SyncCursor → 取得 lastSyncedAt / lastBifrostLogId
  2. 計算回溯起點：fetchFrom = lastSyncedAt - OVERLAP_WINDOW（預設 10 分鐘）
  3. 呼叫 BifrostClient.getUsageLogs({ after: fetchFrom })
     （若支援 after_id，優先使用 lastBifrostLogId）
  4. 以 bifrostLogId 查詢 DB，過濾已存在的紀錄（冪等去重）
  5. 對剩餘新紀錄，開啟 DB 交易：
     a. 批次寫入 UsageRecord（bifrostLogId UNIQUE 約束兜底）
     b. 對每筆 record 透過 UsagePricingCalculator 計算 creditCost
     c. 按 orgId 分組，呼叫 CreditDeductionService.deduct() 扣款
     d. 推進 SyncCursor：lastSyncedAt = 本批次最新 log 時間戳，
        lastBifrostLogId = 本批次最後 log ID
  6. 交易提交
  7. 呼叫 DetectUsageAnomalyService 檢查異常
```

### 2.6 PricingRule

**DB Schema — `pricing_rules`：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | UUID | 主鍵 |
| `modelPattern` | string | 模型匹配模式，如 `gpt-4*`、`claude-3*` |
| `inputTokenPrice` | decimal(20,10) | 每 1K input tokens 的 Credit 單價 |
| `outputTokenPrice` | decimal(20,10) | 每 1K output tokens 的 Credit 單價 |
| `imagePrice` | decimal(20,10) | 每張圖片（nullable） |
| `audioPrice` | decimal(20,10) | 每分鐘音訊（nullable） |
| `priority` | integer | 匹配優先序（越高越優先） |
| `isActive` | boolean | 是否啟用 |
| `createdAt` | timestamp | 建立時間 |
| `updatedAt` | timestamp | 更新時間 |

**UsagePricingCalculator 匹配邏輯：**
按 `priority` 降序排列，第一個 `modelPattern` glob match 到的規則生效。無匹配則拋出錯誤（不靜默跳過）。

### 2.7 異常偵測

```
DetectUsageAnomalyService.execute():
  1. 取得本次同步的用量總計（按 orgId 分組）
  2. 取得上一個同步週期的用量總計
  3. 若本次 > 上次 × 3 → raise UsageAnomalyDetected 事件
  4. 管理員收到通知，可手動暫停相關 Key
```

### 2.8 UsageSync API

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| `GET` | `/api/usage-sync/status` | 同步狀態 | admin |
| `POST` | `/api/usage-sync/trigger` | 手動觸發同步 | admin |
| `GET` | `/api/usage/records` | 用量紀錄查詢（分頁、篩選） | member+ |

### 2.9 PricingRule 管理 API

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| `GET` | `/api/pricing-rules` | 列表 | admin |
| `POST` | `/api/pricing-rules` | 新增 | admin |
| `PUT` | `/api/pricing-rules/:id` | 更新 | admin |
| `DELETE` | `/api/pricing-rules/:id` | 刪除 | admin |

---

## 3. Dashboard 費用補完

P3 Dashboard 已有用量查詢，P4 補上費用欄位。資料全部來自本地 DB：

| API | 回傳 | 資料來源 |
|-----|------|----------|
| `GET /dashboard` | Key 總數、活躍數、本期用量、Credit 餘額 | ApiKey 表 + UsageRecord 聚合 + CreditAccount |
| `GET /dashboard/usage` | 用量時序資料（可依時間/模型/Provider 分組） | UsageRecord 聚合查詢 |
| `GET /dashboard/cost` | 本期淨消耗、上期淨消耗、趨勢、各類型明細 | CreditTransaction 全類型帳本視角（DEDUCTION - REFUND - ADJUSTMENT 等，帶方向符號） |

---

## 4. DB Migration 清單

新增 5 張表：

1. `credit_accounts` — CreditAccount 聚合
2. `credit_transactions` — append-only 交易紀錄
3. `usage_records` — 本地化用量資料（含 `bifrostLogId` UNIQUE 索引）
4. `sync_cursors` — 同步游標
5. `pricing_rules` — 定價規則

---

## 5. 模組間依賴圖

```
UsageSync
  ├── BifrostClient（拉取 Usage Logs）
  ├── Credit（扣款）
  ├── ApiKey（關聯 Key → Org 映射）
  └── PricingRule（計算費用）

Credit
  ├── Organization（帳戶歸屬）
  ├── ApiKey（餘額阻擋/恢復 Bifrost Key）
  └── BifrostClient（updateRateLimit）

Dashboard（補完）
  ├── UsageRecord（用量聚合）
  ├── CreditAccount（餘額）
  └── CreditTransaction（費用聚合）
```

---

## 6. 並行分工建議

| 工作包 | 內容 | 依賴 |
|--------|------|------|
| **WP-A** | Credit 模組（帳戶、Transaction、扣款、充值、API） | Organization, ApiKey |
| **WP-B** | UsageSync 模組（同步、定價計算、Horizon 排程） | BifrostClient, Credit, ApiKey |
| **WP-C** | 異常偵測 + Dashboard 費用補完 + PricingRule 管理 API | UsageRecord, CreditTransaction |

WP-A 先行，WP-B 依賴 WP-A 的 CreditDeductionService，WP-C 依賴 WP-A + WP-B 的資料表。

---

## 7. 完成標準

- [ ] Credit 充值、扣款、退款流程正確
- [ ] 餘額不足時自動阻擋 Bifrost Key，充值後自動恢復
- [ ] 用量同步 Cron Job（Horizon）穩定運行，冪等且交易安全
- [ ] 定價規則可配置，計算結果正確
- [ ] 用量異常偵測可觸發告警事件
- [ ] Dashboard 費用欄位正確顯示
- [ ] 測試覆蓋率 ≥ 80%
