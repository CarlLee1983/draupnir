# Draupnir 狀態圖（State Diagrams）

**文檔版本**: v1.0  
**更新日期**: 2026-04-17  
**目的**: 展現關鍵聚合根的生命週期與狀態轉移

---

## 概述

狀態圖展現 Draupnir 中複雜聚合根的狀態機制。每個聚合根都應遵循確定的狀態轉移規則，以確保業務邏輯的一致性與可維護性。

---

## 1. User 聚合根生命週期

### 狀態轉移圖

```mermaid
stateDiagram-v2
    [*] --> None: 用戶未註冊

    None --> PendingEmail: 提交註冊申請
    
    PendingEmail --> Active: 驗證郵箱
    PendingEmail --> None: 驗證過期<br/>(24 小時)
    
    Active --> Deactivated: Admin 停用<br/>或用戶主動刪除
    Active --> Active: 更新檔案/設定
    
    Deactivated --> Active: Admin 重新啟用
    Deactivated --> Deleted: 永久刪除
    
    Deleted --> [*]: 隔離 90 天後清除

    note right of PendingEmail
        郵箱驗證 Token 有效期：24 小時
        未驗證時無法登錄
    end note

    note right of Active
        可訪問所有功能
        可創建組織、邀請、API Key 等
    end note

    note right of Deactivated
        不可登錄
        相關 API Key 失效
        組織權限暫停
    end note

    note right of Deleted
        軟刪除（soft delete）
        保留審計日誌 90 天
        90 天後硬刪除
    end note
```

### 狀態定義表

| 狀態 | 業務含義 | 操作權限 | 轉移條件 | 對應代碼 |
|------|--------|--------|--------|---------|
| **None** | 未註冊 | ❌ 無 | - | `User.status = null` |
| **PendingEmail** | 郵箱待驗證 | ⚠️ 僅登錄 | 提交註冊、驗證郵箱 Token | `User.status = 'pending_email'` |
| **Active** | 已激活 | ✅ 全部 | 驗證郵箱、重新啟用 | `User.status = 'active'` |
| **Deactivated** | 已停用 | ❌ 無 | Admin 停用、用戶刪除請求 | `User.status = 'deactivated'` |
| **Deleted** | 已刪除 | ❌ 無（保留 90 天） | Deactivated 60 天後自動進入 | `User.status = 'deleted'` |

### Domain Event

```typescript
// 狀態轉移時發佈的事件
UserCreatedEvent          // None → PendingEmail
UserEmailVerifiedEvent    // PendingEmail → Active
UserDeactivatedEvent      // Active → Deactivated
UserReactivatedEvent      // Deactivated → Active
UserDeletedEvent          // Active/Deactivated → Deleted
```

### 驗證規則

- **郵箱唯一性** — 每個狀態（除 Deleted）的 User 郵箱必須唯一
- **Active 狀態掃描** — 每日掃描 PendingEmail 狀態超過 24 小時的用戶，轉移至 None（清除）
- **軟刪除保留期** — Deleted 狀態保留 90 天審計日誌，之後硬刪除

---

## 2. Contract 聚合根生命週期

### 狀態轉移圖

```mermaid
stateDiagram-v2
    [*] --> Draft: 創建合約

    Draft --> Active: 簽署生效
    Draft --> Cancelled: 取消

    Active --> Expiring: 距離到期 ≤ 7 天
    Active --> Expired: 到期日期已過
    Active --> Renewed: 續約

    Expiring --> Active: 續約
    Expiring --> Expired: 未續約、到期日期已過

    Expired --> Renewed: 續約
    Expired --> Archived: 超過 1 年未續約

    Renewed --> Active: 新合約生效
    Renewed --> Expiring: 新合約即將到期

    Cancelled --> [*]
    Archived --> [*]

    note right of Draft
        初始狀態，待管理員確認
        無 Credit 額度限制
    end note

    note right of Active
        生效合約
        Credit 額度檢查以此合約為準
        監控額度、到期日期
    end note

    note right of Expiring
        距離到期 ≤ 7 天
        系統發送續約提醒郵件
        可仍處理請求（直至 Expired）
    end note

    note right of Expired
        到期日期已過
        API 請求返回 402 Payment Required
        用戶無法調用 API
    end note

    note right of Renewed
        續約成功
        新合約信息已寫入，待激活
    end note
```

### 狀態轉移表

| 當前 | 目標 | 觸發條件 | 影響範圍 |
|------|------|--------|--------|
| Draft | Active | Admin 簽署 | Credit 額度生效、SdkApi 開放 |
| Draft | Cancelled | Admin 取消 | 交易終止 |
| Active | Expiring | 系統掃描：`expiry_date - today ≤ 7` | 發送郵件提醒 |
| Active | Expired | 系統掃描：`expiry_date < today` | API 返回 402、禁止請求 |
| Active | Renewed | Admin 續約 | 新 expiry_date、新額度（可選） |
| Expiring | Expired | 系統掃描：`expiry_date < today` | 同上 |
| Expiring | Active | 續約、更新 expiry_date | 回到 Active，重新計時 |
| Expired | Renewed | Admin 續約 | 重新激活 |
| Renewed | Active | 自動轉移（續約日期到達） | 新合約生效 |

### Domain Event

```typescript
ContractCreatedEvent       // None → Draft
ContractSignedEvent        // Draft → Active
ContractExpiringEvent      // Active → Expiring（定時發佈）
ContractExpiredEvent       // Active/Expiring → Expired
ContractRenewedEvent       // Active/Expired → Renewed
ContractCancelledEvent     // Draft → Cancelled
```

### 關鍵檢查點

```typescript
// Application Service 中的狀態驗證
async deductCredit(apiKey: ApiKey): Promise<void> {
  const contract = await findActiveContract(apiKey.organizationId)
  
  if (!contract) {
    throw new Error('No active contract found')
  }
  
  // ✅ 只有 Active 或 Expiring 狀態可扣費
  if (!['active', 'expiring'].includes(contract.status)) {
    throw new Error(`Contract status ${contract.status} not allowed for deduction`)
  }
  
  // ✅ Expired 狀態拒絕扣費
  const balance = await getBalance(contract.id)
  if (balance.amount <= 0) {
    throw new Error('Insufficient credit')
  }
}
```

---

## 3. CreditAccount 聚合根狀態

### 狀態轉移圖

```mermaid
stateDiagram-v2
    [*] --> Normal: 創建組織

    Normal --> LowBalance: 餘額 < 警告門檻（如 20%）
    Normal --> Normal: Deduction / Top-up

    LowBalance --> Normal: Top-up 充值
    LowBalance --> Depleted: 餘額 = 0

    Depleted --> Normal: Top-up 充值
    Depleted --> Locked: 連續 30 天未充值

    Locked --> Normal: Top-up 充值
    Locked --> Suspended: 連續 90 天未充值

    Suspended --> [*]: 組織刪除

    note right of Normal
        健康狀態
        可正常扣費
        監控告警
    end note

    note right of LowBalance
        餘額 < 警告門檻
        發送 Email 告警
        建議用戶充值
    end note

    note right of Depleted
        餘額 = 0
        API 返回 402 Insufficient Credit
        禁止所有請求
    end note

    note right of Locked
        連續 30 天無充值
        發送多次催促郵件
        組織功能受限
    end note

    note right of Suspended
        連續 90 天無充值
        所有組織資源凍結
        Admin 無法訪問 Portal
    end note
```

### 餘額變化時序

```
Time ───────────────────────────────────────→

Balance  
   100 │  ●─────●──────●─────────●──────●
       │  │     │      │         │      │
    80 │  │  ┌──┘      │         │      │
       │  │  │         │    ┌────┘      │
    20 │  │  │      ┌──┘    │           │
       │  │  │      │       │           │
     0 │  │  │      └───────┴───────────┴
       │  │  │
       ↓  ↓  ↓
       Top-up Deduction  Depleted Charged
       
    Events: 
    ● LowBalance Alert (80→20)
    ● Depleted Alert (0)
    ● Normal Recovery (20→100)
```

### 金額計算（ValueObject：Balance）

```typescript
class Balance {
  // 使用 BigInt 避免浮點誤差
  private amount: bigint  // 單位：分（Cent）
  
  static fromString(value: string): Balance {
    // '100.50' → 10050n (分)
    const parts = value.split('.')
    const dollars = BigInt(parts[0])
    const cents = BigInt(parts[1] || '0')
    return new Balance(dollars * 100n + cents)
  }
  
  add(other: Balance): Balance {
    // 返回新實例，不可變
    return new Balance(this.amount + other.amount)
  }
  
  deduct(other: Balance): Balance {
    if (this.amount < other.amount) {
      throw new InsufficientBalanceError()
    }
    return new Balance(this.amount - other.amount)
  }
  
  toDecimal(): string {
    // 10050n → '100.50'
    const cents = this.amount % 100n
    const dollars = this.amount / 100n
    return `${dollars}.${String(cents).padStart(2, '0')}`
  }
}
```

---

## 4. AlertConfig 聚合根狀態

### 狀態轉移圖

```mermaid
stateDiagram-v2
    [*] --> Created: Admin 創建告警

    Created --> Active: 啟用告警
    Created --> Deleted: 刪除

    Active --> Active: 告警觸發 & 發送通知
    Active --> Paused: Admin 暫停
    Active --> Deleted: 刪除

    Paused --> Active: Admin 恢復
    Paused --> Deleted: 刪除

    Deleted --> [*]

    note right of Created
        初始狀態
        配置尚未生效
        無監控邏輯
    end note

    note right of Active
        生效狀態
        系統持續監控
        觸發時發送通知
    end note

    note right of Paused
        暫停狀態
        系統不再監控
        保留配置，可恢復
    end note

    note right of Deleted
        已刪除
        配置不再有效
        無法恢復
    end note
```

### 告警類型與觸發條件

| 告警類型 | 觸發事件 | 條件示例 | 通知接收方 |
|--------|--------|--------|----------|
| **Balance Low** | Bifrost Sync | `balance < 80% of monthly_limit` | Email/Webhook |
| **Balance Depleted** | Credit Deduction | `balance = 0` | Email/Webhook |
| **Contract Expiring** | Daily Scan | `days_until_expiry ≤ 7` | Email |
| **Monthly Limit Reached** | Bifrost Sync | `monthly_usage > limit` | Email/Webhook |
| **API Rate Exceeded** | API Request | `requests/min > threshold` | Email/Webhook |

### 告警觸發與去重邏輯

```mermaid
sequenceDiagram
    participant BifrostEvent as Bifrost Event
    participant AlertEngine as Alert Engine
    participant Dedup as Deduplication Logic
    participant Notifier as Notifier

    BifrostEvent->>AlertEngine: BifrostSyncCompletedEvent
    
    loop For Each AlertConfig
        AlertEngine->>AlertEngine: Evaluate Threshold
        
        alt Threshold Met
            AlertEngine->>Dedup: Check Last Trigger Time
            
            alt 距離上次觸發 > cooldown_period
                Dedup->>Notifier: Send Notification
                Dedup->>AlertEngine: Update Last Trigger
            else 在冷卻期內
                Dedup->>AlertEngine: Skip (Deduplicated)
            end
        end
    end
```

### 冷卻期設置

```
告警類型                 冷卻期（Cooldown）
─────────────────────────────────────
Balance Low              6 小時
Balance Depleted         24 小時
Contract Expiring        24 小時
Monthly Limit Reached    1 小時
API Rate Exceeded        5 分鐘
```

---

## 5. Application 聚合根狀態（DevPortal）

### 狀態轉移圖

```mermaid
stateDiagram-v2
    [*] --> Registered: Developer 註冊應用

    Registered --> Active: 生成 API Key
    Registered --> Draft: 編輯配置

    Draft --> Active: 確認配置
    Draft --> Registered: 取消編輯

    Active --> Active: 調用 API、更新配置
    Active --> Suspended: Admin 暫停<br/>或用量超限
    Active --> Archived: Developer 歸檔

    Suspended --> Active: Admin 解除暫停
    Suspended --> Archived: Developer 歸檔

    Archived --> [*]

    note right of Registered
        初始狀態
        已建立應用記錄
        無法調用 API
    end note

    note right of Draft
        編輯狀態
        配置變更未生效
    end note

    note right of Active
        運行狀態
        可調用 API
        監控用量與告警
    end note

    note right of Suspended
        暫停狀態
        API 返回 403 Forbidden
        可恢復
    end note

    note right of Archived
        歸檔狀態
        歷史應用
        無法恢復
    end note
```

---

## 6. Organization 聚合根狀態

### 狀態轉移圖

```mermaid
stateDiagram-v2
    [*] --> Active: Admin 創建組織

    Active --> Active: 更新設定、邀請成員

    Active --> Suspended: Admin 暫停
    Active --> Archived: Admin 歸檔

    Suspended --> Active: Admin 恢復
    Suspended --> Archived: Admin 歸檔

    Archived --> [*]

    note right of Active
        正常運行狀態
        成員可訪問
        API 可調用
    end note

    note right of Suspended
        暫停狀態
        成員無法訪問
        API 返回 403
        可恢復
    end note

    note right of Archived
        歸檔狀態
        完全禁用
        無法恢復
    end note
```

---

## 7. 狀態圖使用指南

### 何時使用狀態圖
- ✅ 設計新的聚合根或複雜業務邏輯
- ✅ 驗證狀態轉移的合法性
- ✅ 處理邊界情況（Edge Case）
- ✅ 編寫狀態轉移的測試用例

### 實現模式

#### Pattern 1: Enum 狀態

```typescript
enum UserStatus {
  NONE = 'none',
  PENDING_EMAIL = 'pending_email',
  ACTIVE = 'active',
  DEACTIVATED = 'deactivated',
  DELETED = 'deleted'
}

class User {
  status: UserStatus
  
  verifyEmail(): User {
    if (this.status !== UserStatus.PENDING_EMAIL) {
      throw new InvalidStateTransitionError(
        `Cannot verify email from status: ${this.status}`
      )
    }
    return new User({ ...this, status: UserStatus.ACTIVE })
  }
}
```

#### Pattern 2: State Machine（高級）

```typescript
type UserStateMachine = {
  [key in UserStatus]: {
    canTransitionTo: UserStatus[]
    onEnter?: () => void
    onExit?: () => void
  }
}

const userStateMachine: UserStateMachine = {
  [UserStatus.NONE]: {
    canTransitionTo: [UserStatus.PENDING_EMAIL]
  },
  [UserStatus.PENDING_EMAIL]: {
    canTransitionTo: [UserStatus.ACTIVE, UserStatus.NONE],
    onEnter: () => console.log('Sending verification email')
  },
  [UserStatus.ACTIVE]: {
    canTransitionTo: [UserStatus.DEACTIVATED, UserStatus.ACTIVE],
    onExit: () => console.log('User leaving active state')
  },
  // ...
}
```

### 測試策略

```typescript
describe('User State Transitions', () => {
  it('should transition from PendingEmail to Active on email verification', () => {
    const user = User.create({ email: 'test@example.com' })
    expect(user.status).toBe(UserStatus.PENDING_EMAIL)
    
    const verified = user.verifyEmail()
    expect(verified.status).toBe(UserStatus.ACTIVE)
  })
  
  it('should reject invalid transitions', () => {
    const user = User.create({ status: UserStatus.ACTIVE })
    
    expect(() => {
      user.verifyEmail() // 不能從 ACTIVE 重新驗證
    }).toThrow(InvalidStateTransitionError)
  })
})
```

---

## 相關文檔

- [`entity-relationship-overview.md`](./entity-relationship-overview.md) — 聚合根字段定義
- [`domain-events.md`](../knowledge/domain-events.md) — 狀態轉移時發佈的事件
- [`sequence-diagrams.md`](./sequence-diagrams.md) — 狀態轉移的業務流程
- [`layer-decision-rules.md`](../knowledge/layer-decision-rules.md) — Domain 層設計原則
