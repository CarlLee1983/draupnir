# Domain Events（領域事件）

## 概述

Domain Events 是 DDD 中表示「已經發生的重要業務事件」的機制。在 Draupnir 中，使用事件來解耦模組間的耦合，實現非同步響應和審計追蹤。

## 核心概念

### 什麼是 Domain Event？

Domain Event 是一個不可變的記錄，表示在領域內發生了什麼。例如：

- `CreditDeductedEvent` — 用戶使用 API 時額度被扣除
- `CreditToppedUpEvent` — 用戶購買額度進行充值
- `LowBalanceAlertEvent` — 額度低於警告閾值
- `UserCreatedEvent` — 新用戶被建立

### Domain Event 的特點

1. **過去式名詞** — 使用過去式命名（Deducted, TopUp, Alert 都表示已發生）
2. **不可變** — 一旦建立，內容不能改變
3. **包含足夠資訊** — 其他模組可獨立處理，無需詢問原模組
4. **版本化** — 支援事件架構演進

## 架構

### 1. 基類：DomainEvent

```typescript
// src/Shared/Domain/DomainEvent.ts
export abstract class DomainEvent {
  readonly eventId: string              // UUID
  readonly aggregateId: string           // 觸發事件的 Aggregate
  readonly aggregateType?: string        // 資料型別
  readonly eventType: string             // 事件名稱
  readonly occurredAt: Date              // 發生時間
  readonly version: number               // 事件結構版本
  readonly data: Record<string, unknown> // 事件負載

  abstract toJSON(): Record<string, unknown>
}
```

### 2. 分發器：DomainEventDispatcher

```typescript
// src/Shared/Domain/DomainEventDispatcher.ts
export class DomainEventDispatcher {
  static getInstance(): DomainEventDispatcher
  
  on(eventType: string, handler: EventHandler): void
  async dispatch(event: DomainEvent): Promise<void>
  async dispatchAll(events: DomainEvent[]): Promise<void>
}
```

Singleton 模式，fire-and-forget 策略（若 handler 失敗只記錄日誌，不中斷流程）。

## 使用方式

### Step 1: 定義事件

在 Domain/Events 目錄定義事件類：

```typescript
// src/Modules/Credit/Domain/Events/CreditDeductedEvent.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class CreditDeductedEvent extends DomainEvent {
  readonly creditAccountId: string
  readonly orgId: string
  readonly amount: string
  readonly remainingBalance: string
  readonly reason: 'api_call' | 'manual_deduction' | 'refund_reversal'

  constructor(
    creditAccountId: string,
    orgId: string,
    amount: string,
    remainingBalance: string,
    reason: 'api_call' | 'manual_deduction' | 'refund_reversal' = 'api_call',
  ) {
    super(
      creditAccountId,
      'CreditDeductedEvent',
      { creditAccountId, orgId, amount, remainingBalance, reason },
      1,
    )
    this.creditAccountId = creditAccountId
    this.orgId = orgId
    this.amount = amount
    this.remainingBalance = remainingBalance
    this.reason = reason
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      version: this.version,
      data: {
        creditAccountId: this.creditAccountId,
        orgId: this.orgId,
        amount: this.amount,
        remainingBalance: this.remainingBalance,
        reason: this.reason,
      },
    }
  }
}
```

### Step 2: 在 Application Service 中發佈事件

```typescript
// src/Modules/Credit/Application/Services/DeductCreditService.ts
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { CreditDeductedEvent } from '../../Domain/Events/CreditDeductedEvent'

export class DeductCreditService {
  async execute(request: DeductRequest): Promise<DeductResponse> {
    // 1. 執行業務邏輯
    const updated = account.applyDeduction(request.amount)

    // 2. 持久化
    await this.db.transaction(async (tx) => {
      await this.accountRepo.update(updated)
      await this.transactionRepo.save(transaction)
    })

    // 3. 發佈事件（事務成功後）
    await DomainEventDispatcher.getInstance().dispatch(
      new CreditDeductedEvent(
        account.id,
        request.orgId,
        request.amount,
        updated.balance,
        'api_call',
      ),
    )

    return { success: true, newBalance: updated.balance }
  }
}
```

### Step 3: 訂閱事件（跨模組响應）

在 ServiceProvider 中註冊事件處理器：

```typescript
// src/Modules/Logging/Infrastructure/Providers/LoggingServiceProvider.ts
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { CreditDeductedEvent } from '@/Modules/Credit/Domain/Events/CreditDeductedEvent'

export class LoggingServiceProvider {
  static register(): void {
    const dispatcher = DomainEventDispatcher.getInstance()

    // 訂閱額度扣除事件
    dispatcher.on('CreditDeductedEvent', async (event) => {
      const creditEvent = event as CreditDeductedEvent
      await logger.info('Credit deducted', {
        accountId: creditEvent.creditAccountId,
        amount: creditEvent.amount,
        reason: creditEvent.reason,
      })
    })
  }
}
```

## 實踐指南

### 何時發佈事件

✅ **應該發佈**：
- 重要的業務狀態變化（額度扣除、用戶建立）
- 需要其他模組響應的動作（額度低於閾值 → 發送通知）
- 審計或合規要求的事件（所有額度交易）

❌ **不應該發佈**：
- 純讀操作（查詢、搜尋）
- 臨時狀態（請求處理中）
- 框架層面的事件（HTTP 記錄）

### 事件命名規範

- 使用 `{領域}{動作}Event` 格式
- 動作使用過去式：`Deducted`, `ToppedUp`, `Created`
- 範例：`CreditDeductedEvent`, `UserCreatedEvent`, `LowBalanceAlertEvent`

### 事件結構設計

事件應包含足夠資訊，使訂閱者無需查詢原 Aggregate：

```typescript
❌ 不夠詳細
{
  aggregateId: "credit-123",
  eventType: "CreditDeducted",
  data: { amount: "10" }  // 缺少 orgId、餘額等
}

✅ 足夠詳細
{
  aggregateId: "credit-123",
  eventType: "CreditDeductedEvent",
  data: {
    creditAccountId: "credit-123",
    orgId: "org-456",
    amount: "10",
    remainingBalance: "90",
    reason: "api_call"
  }
}
```

### 事件處理錯誤

DomainEventDispatcher 採用 fire-and-forget 策略：

```typescript
async dispatch(event: DomainEvent): Promise<void> {
  const handlers = this.handlers.get(event.eventType) ?? []
  for (const handler of handlers) {
    try {
      await handler(event)  // 若失敗只記錄，不中斷
    } catch (error: unknown) {
      console.error(`Event handler 執行失敗 [${event.eventType}]:`, error)
    }
  }
}
```

**重要**：若事件處理需要確保成功（如金融交易），應考慮使用消息佇列（RabbitMQ、Kafka）而非 DomainEventDispatcher。

## Credit 模組的事件

### CreditDeductedEvent

```typescript
{
  eventType: 'CreditDeductedEvent',
  creditAccountId: string
  orgId: string
  amount: string
  remainingBalance: string
  reason: 'api_call' | 'manual_deduction' | 'refund_reversal'
}
```

**訂閱場景**：
- 記錄交易歷史
- 更新使用統計
- 觸發低額度警告
- 審計日誌

### CreditToppedUpEvent

```typescript
{
  eventType: 'CreditToppedUpEvent',
  creditAccountId: string
  orgId: string
  amount: string
  newBalance: string
  source: 'purchase' | 'manual_topup' | 'promotion' | 'refund'
}
```

**訂閱場景**：
- 記錄充值訂單
- 清除低額度警告
- 發送充值確認
- 財務對帳

### LowBalanceAlertEvent

```typescript
{
  eventType: 'LowBalanceAlertEvent',
  creditAccountId: string
  orgId: string
  currentBalance: string
  threshold: string
  percentageRemaining: number
}
```

**訂閱場景**：
- 發送用戶通知
- 觸發自動充值流程
- 監控告警

## 測試

### 驗證事件發佈

```typescript
it('should dispatch CreditDeductedEvent after deduction', async () => {
  const dispatcher = DomainEventDispatcher.getInstance()
  const events: DomainEvent[] = []

  dispatcher.on('CreditDeductedEvent', async (event) => {
    events.push(event)
  })

  await service.deductCredit({ amount: '10' })

  expect(events).toHaveLength(1)
  expect(events[0]).toBeInstanceOf(CreditDeductedEvent)
  expect((events[0] as CreditDeductedEvent).amount).toBe('10')

  DomainEventDispatcher.resetForTesting()
})
```

### 隔離事件處理

測試時需要重置 dispatcher，避免事件污染：

```typescript
beforeEach(() => {
  DomainEventDispatcher.resetForTesting()
})

afterEach(() => {
  DomainEventDispatcher.resetForTesting()
})
```

## 演進與版本管理

### 事件版本

若事件結構改變，使用 `version` 欄位追蹤：

```typescript
export class CreditDeductedEvent extends DomainEvent {
  constructor(...) {
    super(
      creditAccountId,
      'CreditDeductedEvent',
      { ... },
      1,  // version = 1
    )
  }
}
```

### 演變場景

若未來需要添加新欄位（如 `source`）：

```typescript
// V2
export class CreditDeductedEvent extends DomainEvent {
  readonly source: string  // 新增欄位

  constructor(..., source: string = 'api_call') {
    super(..., { ..., source }, 2)  // version = 2
  }
}
```

訂閱者可根據 `version` 選擇如何處理。

## 常見反模式

❌ **不要在 Domain Service 中手動發佈事件**
```typescript
// 不好
class CreateUserService {
  execute() {
    const user = User.create(...)
    dispatcher.dispatch(new UserCreatedEvent(...))  // 應在 Application Service
  }
}
```

✅ **在 Application Service 發佈**
```typescript
// 好
class CreateUserApplicationService {
  async execute() {
    const user = await userService.create(...)
    await dispatcher.dispatch(new UserCreatedEvent(...))
  }
}
```

❌ **不要在事件處理器中修改 Aggregate**
```typescript
// 不好
dispatcher.on('CreditDeductedEvent', async (event) => {
  account.applyPenalty(...)  // 事件不應修改狀態
})
```

✅ **事件只應觸發副作用（讀操作、日誌、通知）**
```typescript
// 好
dispatcher.on('CreditDeductedEvent', async (event) => {
  await auditLog.record(event)
  await notification.alert(event.orgId, 'Credit deducted')
})
```

## 參考

- `src/Shared/Domain/DomainEvent.ts` — 基類
- `src/Shared/Domain/DomainEventDispatcher.ts` — 分發器
- `src/Modules/Credit/Domain/Events/` — 事件實現
- `src/Modules/Credit/Application/Services/` — 應用服務發佈事件
