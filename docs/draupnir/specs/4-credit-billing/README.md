# 4. 信用與計費系統

> 餘額管理、充值扣款、使用量同步、定價規則

## 📄 文檔

### [Phase 4：Credit System — 額度與計費設計規格](./credit-system-design.md)

**核心目標**：完整的 Credit 儲值、扣款、餘額管理，以及從 Bifrost 同步用量並轉換為 Credit 消耗

---

## 📊 系統架構決策

| 決策項目 | 選擇 | 理由 |
|---------|------|------|
| 同步策略 | UsageSync 在單一 DB 交易內完成扣款 | 強一致性，無分散式事務開銷 |
| 定價規則 | 存 DB，管理者動態調整 | 靈活，便於實驗與優化 |
| Credit 精度 | `decimal(20, 10)` 支援高精度小數 | 避免浮點誤差 |
| 排程系統 | `@gravito/horizon` Cron Job | 統一任務排程 |
| 分散式鎖 | Horizon + Stasis（Redis） | 防止併發同步衝突 |
| 事件驅動 | `@gravito/signal` Domain Events | 鬆耦合、可擴展 |
| 資料來源 | Dashboard 全部讀本地 DB | 避免依賴 Bifrost，降低延遲 |

---

## 🏗️ 核心模組

### 1. Credit 模組

**職責**：Credit 帳戶管理、交易記錄、餘額扣款

#### Domain Layer

| 元件 | 說明 |
|------|------|
| **CreditAccount** | Aggregate Root，代表一個 Organization 的 Credit 帳戶 |
| **CreditTransaction** | Entity，記錄每筆信用異動（充值、扣款、退款、過期、調整） |
| **Balance VO** | 餘額，使用字串操作避免浮點誤差 |
| **TransactionType VO** | 交易類型列舉 |
| **Domain Events** | BalanceLow、BalanceDepleted、CreditToppedUp |

#### Application Services

| Service | 職責 |
|---------|------|
| **TopUpCreditService** | 用戶/管理員充值 Credit |
| **DeductCreditService** | 扣除 Credit（通常由 UsageSync 調用） |
| **RefundCreditService** | 退款（異常情況或取消訂單） |
| **GetBalanceService** | 查詢當前餘額 |
| **GetTransactionHistoryService** | 查詢交易歷史 |
| **HandleBalanceDepletedService** | 響應 BalanceDepleted 事件，凍結 Keys |
| **HandleCreditToppedUpService** | 響應 CreditToppedUp 事件，恢復 Keys |

### 2. UsageSync 模組

**職責**：定時同步 Bifrost 用量，轉換為 Credit 消耗

#### 核心流程

```
定時任務 (每小時)
  ↓
讀取 PricingRules (來自 DB)
  ↓
[分散式鎖] 防止併發同步
  ↓
查詢 Bifrost 新增用量日誌
  ↓
計算 Credit 消耗 (用量 * 單價)
  ↓
DB 交易：
  1. 建立 CreditTransaction 記錄
  2. 更新 CreditAccount balance
  3. 發送 Domain Events (BalanceLow / BalanceDepleted)
  ↓
事件驅動：
  - BalanceDepleted → HandleBalanceDepletedService
    → 凍結該 Org 的所有 ACTIVE Keys
  - 其他事件 → 通知/審計服務
```

#### 定價規則架構

```
PricingRule Aggregate
├── id (UUID)
├── model (string) — 模型名稱（gpt-4, claude-3 等）
├── provider (string) — 提供商（OpenAI, Anthropic 等）
├── unitType (enum) — 計費單位（TOKEN, REQUEST）
├── inputPrice (decimal) — 輸入單價（per 1K token 或 per request）
├── outputPrice (decimal) — 輸出單價
├── effectiveFrom (timestamp) — 生效日期
├── status (enum: ACTIVE | ARCHIVED)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

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

**餘額阻擋（BalanceDepleted）：**
```
CreditDeductionService 檢測餘額 ≤ 0
  ↓
發送 BalanceDepleted 事件
  ↓
HandleBalanceDepletedService
  ↓
遍歷該 Org 所有 ACTIVE 的 ApiKey
  ↓
對每個 Key:
  1. 記錄凍結前的 rate limit
  2. 設定 suspensionReason = 'CREDIT_DEPLETED'
  3. BifrostClient.updateRateLimit(key, { rpm: 0, tpm: 0 })
  4. 標記 Key 狀態為 SUSPENDED
```

**餘額恢復（CreditToppedUp）：**
```
充值完成 → TopUpCreditService
  ↓
發送 CreditToppedUp 事件
  ↓
HandleCreditToppedUpService
  ↓
遍歷該 Org 所有 suspensionReason = 'CREDIT_DEPLETED' 的 Key
  ↓
對每個 Key:
  1. 讀取凍結前的 rate limit 快照
  2. BifrostClient.updateRateLimit(key, preFreezeRateLimit)
  3. 清除 suspensionReason 等欄位
  4. 標記 Key 狀態恢復為 ACTIVE
```

---

## 🧪 驗收標準

Phase 4 完成的功能驗收：

- [x] Credit 帳戶建立與初始化 ✅
- [x] 充值功能正常，餘額更新準確 ✅
- [x] 扣款功能正常，支援多筆交易 ✅
- [x] 交易歷史記錄完整可追蹤 ✅
- [x] UsageSync 定時運行，用量計算準確 ✅
- [x] 定價規則生效，Price 計算正確 ✅
- [x] 餘額不足時自動凍結 Key ✅
- [x] 充值後自動恢復 Key ✅
- [x] 低餘額告警事件發送 ✅
- [x] 測試覆蓋率 ≥80% ✅

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

### 為什麼單一 DB 交易而不用分散式交易？
- 所有操作在單一資料庫，無網路延遲
- 強一致性，無部分失敗風險
- 簡化設計，避免分散式系統複雜性

### 為什麼記錄 preFreezeRateLimit？
- 當充值恢復 Key 時，能精確恢復原先的 rate limit 設定
- 避免簡單地設為預設值導致配置丟失

---

## 🚀 後續與擴展

### V1.1 計劃
- Credit 過期機制（預充值的 Credit 在一定期限後過期）
- 更詳細的成本分析（按 Model、按 Provider 分組）
- Credit 異常告警（突增、異常消耗模式）

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

**狀態**：✅ Phase 4 完成  
**最後更新**：2026-04-10  
**實現覆蓋率**：100% 功能完成，81-85% 測試覆蓋
