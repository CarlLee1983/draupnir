# Phase 4: Credit System 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作 Credit 儲值/扣款/餘額管理、Bifrost 用量同步、定價規則系統、餘額阻擋/恢復流程，以及 Dashboard 費用補完。

**Architecture:** Credit 模組管理帳戶與交易帳本（append-only），UsageSync 模組透過 Horizon Cron Job 每 5 分鐘從 Bifrost 拉取用量，在單一 DB 交易內完成寫入 + 扣款 + cursor 推進。Domain Events 透過 `@gravito/signal` 觸發跨模組副作用（餘額阻擋/恢復）。

**Tech Stack:** Bun, TypeScript, Gravito DDD (`@gravito/core`, `@gravito/atlas`, `@gravito/horizon`, `@gravito/signal`), Drizzle ORM (SQLite), Vitest

**Spec:** `docs/superpowers/specs/2026-04-08-p4-credit-system-design.md`

---

## File Structure

### Credit 模組 — `src/Modules/Credit/`

| 路徑 | 職責 |
|------|------|
| `Domain/Aggregates/CreditAccount.ts` | 聚合根：餘額、閾值、狀態 |
| `Domain/Entities/CreditTransaction.ts` | append-only 交易紀錄 |
| `Domain/ValueObjects/TransactionType.ts` | 交易類型列舉 |
| `Domain/ValueObjects/Balance.ts` | 餘額 Value Object（字串運算） |
| `Domain/Repositories/ICreditAccountRepository.ts` | 帳戶 Repository Port |
| `Domain/Repositories/ICreditTransactionRepository.ts` | 交易 Repository Port |
| `Domain/Services/CreditDeductionService.ts` | 扣款 Domain Service |
| `Domain/Events/BalanceLow.ts` | 低餘額事件 |
| `Domain/Events/BalanceDepleted.ts` | 餘額耗盡事件 |
| `Domain/Events/CreditToppedUp.ts` | 充值事件 |
| `Application/Services/TopUpCreditService.ts` | 充值用例 |
| `Application/Services/GetBalanceService.ts` | 查詢餘額 |
| `Application/Services/GetTransactionHistoryService.ts` | 交易歷史 |
| `Application/Services/HandleBalanceDepletedService.ts` | 阻擋 Key |
| `Application/Services/HandleCreditToppedUpService.ts` | 恢復 Key |
| `Application/DTOs/CreditDTO.ts` | 請求/回應 DTO |
| `Infrastructure/Repositories/CreditAccountRepository.ts` | 帳戶 Repo 實作 |
| `Infrastructure/Repositories/CreditTransactionRepository.ts` | 交易 Repo 實作 |
| `Infrastructure/Providers/CreditServiceProvider.ts` | IoC 註冊 |
| `Presentation/Controllers/CreditController.ts` | HTTP Controller |
| `Presentation/Routes/credit.routes.ts` | 路由定義 |
| `Presentation/Validators/credit.validator.ts` | Zod 驗證 |
| `index.ts` | 模組導出 |

### UsageSync 模組 — `src/Modules/UsageSync/`

| 路徑 | 職責 |
|------|------|
| `Domain/Entities/UsageRecord.ts` | 用量紀錄 Entity |
| `Domain/Entities/SyncCursor.ts` | 同步游標 Entity |
| `Domain/Entities/PricingRule.ts` | 定價規則 Entity |
| `Domain/Repositories/IUsageRecordRepository.ts` | 用量 Repo Port |
| `Domain/Repositories/ISyncCursorRepository.ts` | 游標 Repo Port |
| `Domain/Repositories/IPricingRuleRepository.ts` | 定價 Repo Port |
| `Domain/Services/UsagePricingCalculator.ts` | 定價計算 |
| `Domain/Events/UsageAnomalyDetected.ts` | 異常事件 |
| `Application/Services/SyncBifrostUsageService.ts` | 同步用例 |
| `Application/Services/DetectUsageAnomalyService.ts` | 異常偵測 |
| `Application/Services/GetSyncStatusService.ts` | 同步狀態查詢 |
| `Application/Services/ManagePricingRuleService.ts` | 定價規則 CRUD |
| `Application/DTOs/UsageSyncDTO.ts` | DTO |
| `Infrastructure/Repositories/UsageRecordRepository.ts` | 用量 Repo 實作 |
| `Infrastructure/Repositories/SyncCursorRepository.ts` | 游標 Repo 實作 |
| `Infrastructure/Repositories/PricingRuleRepository.ts` | 定價 Repo 實作 |
| `Infrastructure/Providers/UsageSyncServiceProvider.ts` | IoC + Horizon 排程 |
| `Presentation/Controllers/UsageSyncController.ts` | HTTP Controller |
| `Presentation/Controllers/PricingRuleController.ts` | 定價 Controller |
| `Presentation/Routes/usagesync.routes.ts` | 路由定義 |
| `Presentation/Validators/pricingrule.validator.ts` | Zod 驗證 |
| `index.ts` | 模組導出 |

### 修改的既有檔案

| 路徑 | 變更 |
|------|------|
| `src/Modules/ApiKey/Domain/ValueObjects/KeyStatus.ts` | 新增 `suspended_no_credit` 狀態 |
| `src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts` | 新增 `suspend` / `unsuspend` 方法 + 凍結快照欄位 |
| `src/Modules/ApiKey/Domain/Repositories/IApiKeyRepository.ts` | 新增 `findActiveByOrgId` / `findSuspendedByOrgId` |
| `src/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository.ts` | 實作新查詢 |
| `src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts` | 新增費用欄位 |
| `src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts` | 注入 Credit 資料 |
| `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts` | 註冊新依賴 |
| `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` | 新增 5 張表 |
| `src/bootstrap.ts` | 註冊 Credit + UsageSync ServiceProvider |
| `src/routes.ts` | 註冊 Credit + UsageSync 路由 |
| `src/wiring/index.ts` | 新增 registerCredit + registerUsageSync |
| `database/migrations/` | 新增 5 個 migration 檔案 |

---

## Task 1: DB Migrations — 建立 5 張新表

**Files:**
- Create: `database/migrations/2026_04_09_000001_create_credit_accounts_table.ts`
- Create: `database/migrations/2026_04_09_000002_create_credit_transactions_table.ts`
- Create: `database/migrations/2026_04_09_000003_create_usage_records_table.ts`
- Create: `database/migrations/2026_04_09_000004_create_sync_cursors_table.ts`
- Create: `database/migrations/2026_04_09_000005_create_pricing_rules_table.ts`
- Modify: `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts`

- [ ] **Step 1: 建立 credit_accounts migration**

```typescript
// database/migrations/2026_04_09_000001_create_credit_accounts_table.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class CreateCreditAccountsTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('credit_accounts', (table) => {
      table.string('id').primary()
      table.string('org_id').unique()
      table.string('balance').default('0')
      table.string('low_balance_threshold').default('100')
      table.string('status').default('active')
      table.timestamps()
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('credit_accounts')
  }
}
```

- [ ] **Step 2: 建立 credit_transactions migration**

```typescript
// database/migrations/2026_04_09_000002_create_credit_transactions_table.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class CreateCreditTransactionsTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('credit_transactions', (table) => {
      table.string('id').primary()
      table.string('credit_account_id')
      table.string('type')
      table.string('amount')
      table.string('balance_after')
      table.string('reference_type').nullable()
      table.string('reference_id').nullable()
      table.text('description').nullable()
      table.timestamp('created_at')
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('credit_transactions')
  }
}
```

- [ ] **Step 3: 建立 usage_records migration**

```typescript
// database/migrations/2026_04_09_000003_create_usage_records_table.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class CreateUsageRecordsTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('usage_records', (table) => {
      table.string('id').primary()
      table.string('bifrost_log_id').unique()
      table.string('api_key_id')
      table.string('org_id')
      table.string('model')
      table.integer('input_tokens').default(0)
      table.integer('output_tokens').default(0)
      table.string('credit_cost').default('0')
      table.timestamp('occurred_at')
      table.timestamp('created_at')
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('usage_records')
  }
}
```

- [ ] **Step 4: 建立 sync_cursors migration**

```typescript
// database/migrations/2026_04_09_000004_create_sync_cursors_table.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class CreateSyncCursorsTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('sync_cursors', (table) => {
      table.string('id').primary()
      table.string('cursor_type').unique()
      table.timestamp('last_synced_at').nullable()
      table.string('last_bifrost_log_id').nullable()
      table.timestamp('updated_at')
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('sync_cursors')
  }
}
```

- [ ] **Step 5: 建立 pricing_rules migration**

```typescript
// database/migrations/2026_04_09_000005_create_pricing_rules_table.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class CreatePricingRulesTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('pricing_rules', (table) => {
      table.string('id').primary()
      table.string('model_pattern')
      table.string('input_token_price')
      table.string('output_token_price')
      table.string('image_price').nullable()
      table.string('audio_price').nullable()
      table.integer('priority').default(0)
      table.boolean('is_active').default(true)
      table.timestamps()
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('pricing_rules')
  }
}
```

- [ ] **Step 6: 建立 quarantined_logs migration（隔離無法映射的 Bifrost log）**

```typescript
// database/migrations/2026_04_09_000006_create_quarantined_logs_table.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class CreateQuarantinedLogsTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('quarantined_logs', (table) => {
      table.string('id').primary()
      table.string('bifrost_log_id').unique()
      table.string('reason')
      table.text('raw_data')
      table.timestamp('created_at')
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('quarantined_logs')
  }
}
```

- [ ] **Step 7: 更新 Drizzle schema**

在 `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` 末尾新增：

```typescript
/**
 * Credit Accounts 表
 */
export const creditAccounts = sqliteTable('credit_accounts', {
  id: text('id').primaryKey(),
  org_id: text('org_id').notNull().unique(),
  balance: text('balance').notNull().default('0'),
  low_balance_threshold: text('low_balance_threshold').notNull().default('100'),
  status: text('status').notNull().default('active'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

/**
 * Credit Transactions 表（append-only 帳本）
 */
export const creditTransactions = sqliteTable(
  'credit_transactions',
  {
    id: text('id').primaryKey(),
    credit_account_id: text('credit_account_id').notNull(),
    type: text('type').notNull(),
    amount: text('amount').notNull(),
    balance_after: text('balance_after').notNull(),
    reference_type: text('reference_type'),
    reference_id: text('reference_id'),
    description: text('description'),
    created_at: text('created_at').notNull(),
  },
  (table) => [
    index('idx_credit_transactions_account_id').on(table.credit_account_id),
  ],
)

/**
 * Usage Records 表
 */
export const usageRecords = sqliteTable(
  'usage_records',
  {
    id: text('id').primaryKey(),
    bifrost_log_id: text('bifrost_log_id').notNull().unique(),
    api_key_id: text('api_key_id').notNull(),
    org_id: text('org_id').notNull(),
    model: text('model').notNull(),
    input_tokens: text('input_tokens').notNull().default('0'),
    output_tokens: text('output_tokens').notNull().default('0'),
    credit_cost: text('credit_cost').notNull().default('0'),
    occurred_at: text('occurred_at').notNull(),
    created_at: text('created_at').notNull(),
  },
  (table) => [
    index('idx_usage_records_org_id').on(table.org_id),
    index('idx_usage_records_bifrost_log_id').on(table.bifrost_log_id),
  ],
)

/**
 * Sync Cursors 表
 */
export const syncCursors = sqliteTable('sync_cursors', {
  id: text('id').primaryKey(),
  cursor_type: text('cursor_type').notNull().unique(),
  last_synced_at: text('last_synced_at'),
  last_bifrost_log_id: text('last_bifrost_log_id'),
  updated_at: text('updated_at').notNull(),
})

/**
 * Pricing Rules 表
 */
export const pricingRules = sqliteTable('pricing_rules', {
  id: text('id').primaryKey(),
  model_pattern: text('model_pattern').notNull(),
  input_token_price: text('input_token_price').notNull(),
  output_token_price: text('output_token_price').notNull(),
  image_price: text('image_price'),
  audio_price: text('audio_price'),
  priority: text('priority').notNull().default('0'),
  is_active: text('is_active').notNull().default('true'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})
```

Add quarantined_logs to schema:

```typescript
/**
 * Quarantined Logs 表（無法映射的 Bifrost log 隔離區）
 */
export const quarantinedLogs = sqliteTable('quarantined_logs', {
  id: text('id').primaryKey(),
  bifrost_log_id: text('bifrost_log_id').notNull().unique(),
  reason: text('reason').notNull(),
  raw_data: text('raw_data').notNull(),
  created_at: text('created_at').notNull(),
})
```

- [ ] **Step 8: 執行 migration 並驗證**

Run: `bun migrate`
Expected: 6 new tables created, no errors

- [ ] **Step 9: Commit**

```bash
git add database/migrations/2026_04_09_*.ts src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts
git commit -m "feat: [p4] 建立 Credit System 所需的 6 張資料表（含 quarantined_logs）"
```

---

## Task 2: Credit 模組 — Domain Layer

**Files:**
- Create: `src/Modules/Credit/Domain/ValueObjects/TransactionType.ts`
- Create: `src/Modules/Credit/Domain/ValueObjects/Balance.ts`
- Create: `src/Modules/Credit/Domain/Aggregates/CreditAccount.ts`
- Create: `src/Modules/Credit/Domain/Entities/CreditTransaction.ts`
- Create: `src/Modules/Credit/Domain/Repositories/ICreditAccountRepository.ts`
- Create: `src/Modules/Credit/Domain/Repositories/ICreditTransactionRepository.ts`
- Create: `src/Modules/Credit/Domain/Events/BalanceLow.ts`
- Create: `src/Modules/Credit/Domain/Events/BalanceDepleted.ts`
- Create: `src/Modules/Credit/Domain/Events/CreditToppedUp.ts`
- Create: `src/Modules/Credit/Domain/Services/CreditDeductionService.ts`
- Test: `src/Modules/Credit/__tests__/Balance.test.ts`
- Test: `src/Modules/Credit/__tests__/TransactionType.test.ts`
- Test: `src/Modules/Credit/__tests__/CreditAccount.test.ts`
- Test: `src/Modules/Credit/__tests__/CreditDeductionService.test.ts`

- [ ] **Step 1: 寫 TransactionType 的 failing test**

```typescript
// src/Modules/Credit/__tests__/TransactionType.test.ts
import { describe, it, expect } from 'vitest'
import { TransactionType } from '../Domain/ValueObjects/TransactionType'

describe('TransactionType', () => {
  it('應建立所有有效的交易類型', () => {
    expect(TransactionType.topup().getValue()).toBe('topup')
    expect(TransactionType.deduction().getValue()).toBe('deduction')
    expect(TransactionType.refund().getValue()).toBe('refund')
    expect(TransactionType.expiry().getValue()).toBe('expiry')
    expect(TransactionType.adjustment().getValue()).toBe('adjustment')
  })

  it('從字串重建應正確', () => {
    const t = TransactionType.from('topup')
    expect(t.getValue()).toBe('topup')
  })

  it('無效類型應拋出錯誤', () => {
    expect(() => TransactionType.from('invalid')).toThrow('無效的交易類型')
  })

  it('isCredit 應正確判斷入帳類型', () => {
    expect(TransactionType.topup().isCredit()).toBe(true)
    expect(TransactionType.refund().isCredit()).toBe(true)
    expect(TransactionType.deduction().isCredit()).toBe(false)
  })

  it('isDebit 應正確判斷出帳類型', () => {
    expect(TransactionType.deduction().isDebit()).toBe(true)
    expect(TransactionType.expiry().isDebit()).toBe(true)
    expect(TransactionType.topup().isDebit()).toBe(false)
  })
})
```

- [ ] **Step 2: 執行 test 確認 FAIL**

Run: `bun test src/Modules/Credit/__tests__/TransactionType.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 實作 TransactionType**

```typescript
// src/Modules/Credit/Domain/ValueObjects/TransactionType.ts
export const TransactionTypeValues = ['topup', 'deduction', 'refund', 'expiry', 'adjustment'] as const
export type TransactionTypeValue = (typeof TransactionTypeValues)[number]

const CREDIT_TYPES: ReadonlySet<TransactionTypeValue> = new Set(['topup', 'refund'])
const DEBIT_TYPES: ReadonlySet<TransactionTypeValue> = new Set(['deduction', 'expiry', 'adjustment'])

export class TransactionType {
  private constructor(private readonly value: TransactionTypeValue) {}

  static topup(): TransactionType { return new TransactionType('topup') }
  static deduction(): TransactionType { return new TransactionType('deduction') }
  static refund(): TransactionType { return new TransactionType('refund') }
  static expiry(): TransactionType { return new TransactionType('expiry') }
  static adjustment(): TransactionType { return new TransactionType('adjustment') }

  static from(value: string): TransactionType {
    if (!TransactionTypeValues.includes(value as TransactionTypeValue)) {
      throw new Error(`無效的交易類型: ${value}`)
    }
    return new TransactionType(value as TransactionTypeValue)
  }

  isCredit(): boolean { return CREDIT_TYPES.has(this.value) }
  isDebit(): boolean { return DEBIT_TYPES.has(this.value) }
  getValue(): TransactionTypeValue { return this.value }
}
```

- [ ] **Step 4: 執行 test 確認 PASS**

Run: `bun test src/Modules/Credit/__tests__/TransactionType.test.ts`
Expected: PASS

- [ ] **Step 5: 寫 Balance 的 failing test**

```typescript
// src/Modules/Credit/__tests__/Balance.test.ts
import { describe, it, expect } from 'vitest'
import { Balance } from '../Domain/ValueObjects/Balance'

describe('Balance', () => {
  it('應正確建立餘額', () => {
    const b = Balance.fromString('100.5')
    expect(b.toString()).toBe('100.5')
  })

  it('zero 應為 0', () => {
    expect(Balance.zero().toString()).toBe('0')
  })

  it('add 應正確加總', () => {
    const b = Balance.fromString('100.123456789')
    const result = b.add('50.000000001')
    expect(result.toString()).toBe('150.12345679')
  })

  it('subtract 應正確扣減', () => {
    const b = Balance.fromString('100')
    const result = b.subtract('30.5')
    expect(result.toString()).toBe('69.5')
  })

  it('isLessThanOrEqual 應正確比較', () => {
    expect(Balance.fromString('0').isLessThanOrEqual('0')).toBe(true)
    expect(Balance.fromString('5').isLessThanOrEqual('10')).toBe(true)
    expect(Balance.fromString('10').isLessThanOrEqual('5')).toBe(false)
  })

  it('isNegativeOrZero 應正確判斷', () => {
    expect(Balance.zero().isNegativeOrZero()).toBe(true)
    expect(Balance.fromString('-1').isNegativeOrZero()).toBe(true)
    expect(Balance.fromString('1').isNegativeOrZero()).toBe(false)
  })

  it('負數應允許（扣至零以下仍記錄）', () => {
    const b = Balance.fromString('10')
    const result = b.subtract('15')
    expect(result.isNegativeOrZero()).toBe(true)
  })
})
```

- [ ] **Step 6: 執行 test 確認 FAIL**

Run: `bun test src/Modules/Credit/__tests__/Balance.test.ts`
Expected: FAIL

- [ ] **Step 7: 實作 Balance**

```typescript
// src/Modules/Credit/Domain/ValueObjects/Balance.ts

/**
 * Balance Value Object
 *
 * 使用整數運算避免浮點誤差。
 * 內部以 bigint 儲存（乘以 10^PRECISION），對外以字串表示。
 */
const PRECISION = 10
const SCALE = BigInt(10 ** PRECISION)

export class Balance {
  private constructor(private readonly value: bigint) {}

  static zero(): Balance {
    return new Balance(0n)
  }

  static fromString(s: string): Balance {
    const cleaned = s.trim()
    if (cleaned === '0' || cleaned === '') return new Balance(0n)

    const [intPart, decPart = ''] = cleaned.split('.')
    const sign = intPart.startsWith('-') ? -1n : 1n
    const absInt = intPart.replace('-', '')
    const paddedDec = decPart.padEnd(PRECISION, '0').slice(0, PRECISION)
    const raw = BigInt(absInt) * SCALE + BigInt(paddedDec)
    return new Balance(sign * raw)
  }

  add(amount: string): Balance {
    return new Balance(this.value + Balance.fromString(amount).value)
  }

  subtract(amount: string): Balance {
    return new Balance(this.value - Balance.fromString(amount).value)
  }

  isLessThanOrEqual(other: string): boolean {
    return this.value <= Balance.fromString(other).value
  }

  isNegativeOrZero(): boolean {
    return this.value <= 0n
  }

  toString(): string {
    const sign = this.value < 0n ? '-' : ''
    const abs = this.value < 0n ? -this.value : this.value
    const intPart = abs / SCALE
    const decPart = abs % SCALE
    if (decPart === 0n) return `${sign}${intPart}`
    const decStr = decPart.toString().padStart(PRECISION, '0').replace(/0+$/, '')
    return `${sign}${intPart}.${decStr}`
  }

  toBigInt(): bigint {
    return this.value
  }
}
```

- [ ] **Step 8: 執行 test 確認 PASS**

Run: `bun test src/Modules/Credit/__tests__/Balance.test.ts`
Expected: PASS

- [ ] **Step 9: 寫 CreditAccount 的 failing test**

```typescript
// src/Modules/Credit/__tests__/CreditAccount.test.ts
import { describe, it, expect } from 'vitest'
import { CreditAccount } from '../Domain/Aggregates/CreditAccount'

describe('CreditAccount', () => {
  it('應建立新帳戶（餘額為 0）', () => {
    const account = CreditAccount.create('acc-1', 'org-1')
    expect(account.id).toBe('acc-1')
    expect(account.orgId).toBe('org-1')
    expect(account.balance).toBe('0')
    expect(account.status).toBe('active')
  })

  it('從 DB 重建應正確', () => {
    const account = CreditAccount.fromDatabase({
      id: 'acc-1',
      org_id: 'org-1',
      balance: '500.123',
      low_balance_threshold: '50',
      status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    expect(account.balance).toBe('500.123')
    expect(account.lowBalanceThreshold).toBe('50')
  })

  it('applyTopUp 應增加餘額', () => {
    const account = CreditAccount.create('acc-1', 'org-1')
    const updated = account.applyTopUp('100.5')
    expect(updated.balance).toBe('100.5')
  })

  it('applyDeduction 應減少餘額', () => {
    const account = CreditAccount.fromDatabase({
      id: 'acc-1', org_id: 'org-1', balance: '100',
      low_balance_threshold: '10', status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    const updated = account.applyDeduction('30')
    expect(updated.balance).toBe('70')
  })

  it('isBalanceLow 應依閾值判斷', () => {
    const account = CreditAccount.fromDatabase({
      id: 'acc-1', org_id: 'org-1', balance: '5',
      low_balance_threshold: '10', status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    expect(account.isBalanceLow()).toBe(true)
  })

  it('isBalanceDepleted 應正確判斷', () => {
    const account = CreditAccount.fromDatabase({
      id: 'acc-1', org_id: 'org-1', balance: '0',
      low_balance_threshold: '10', status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    })
    expect(account.isBalanceDepleted()).toBe(true)
  })

  it('toDatabaseRow 應正確映射', () => {
    const account = CreditAccount.create('acc-1', 'org-1')
    const row = account.toDatabaseRow()
    expect(row.id).toBe('acc-1')
    expect(row.org_id).toBe('org-1')
    expect(row.balance).toBe('0')
  })
})
```

- [ ] **Step 10: 執行 test 確認 FAIL**

Run: `bun test src/Modules/Credit/__tests__/CreditAccount.test.ts`
Expected: FAIL

- [ ] **Step 11: 實作 CreditAccount**

```typescript
// src/Modules/Credit/Domain/Aggregates/CreditAccount.ts
import { Balance } from '../ValueObjects/Balance'

interface CreditAccountProps {
  readonly id: string
  readonly orgId: string
  readonly balance: Balance
  readonly lowBalanceThreshold: Balance
  readonly status: 'active' | 'frozen'
  readonly createdAt: Date
  readonly updatedAt: Date
}

export class CreditAccount {
  private readonly props: CreditAccountProps

  private constructor(props: CreditAccountProps) {
    this.props = props
  }

  static create(id: string, orgId: string): CreditAccount {
    return new CreditAccount({
      id,
      orgId,
      balance: Balance.zero(),
      lowBalanceThreshold: Balance.fromString('100'),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): CreditAccount {
    return new CreditAccount({
      id: row.id as string,
      orgId: row.org_id as string,
      balance: Balance.fromString(row.balance as string),
      lowBalanceThreshold: Balance.fromString(row.low_balance_threshold as string),
      status: row.status as 'active' | 'frozen',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    })
  }

  applyTopUp(amount: string): CreditAccount {
    return new CreditAccount({
      ...this.props,
      balance: this.props.balance.add(amount),
      updatedAt: new Date(),
    })
  }

  applyDeduction(amount: string): CreditAccount {
    return new CreditAccount({
      ...this.props,
      balance: this.props.balance.subtract(amount),
      updatedAt: new Date(),
    })
  }

  isBalanceLow(): boolean {
    return this.props.balance.isLessThanOrEqual(this.props.lowBalanceThreshold.toString())
  }

  isBalanceDepleted(): boolean {
    return this.props.balance.isNegativeOrZero()
  }

  get id(): string { return this.props.id }
  get orgId(): string { return this.props.orgId }
  get balance(): string { return this.props.balance.toString() }
  get lowBalanceThreshold(): string { return this.props.lowBalanceThreshold.toString() }
  get status(): string { return this.props.status }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      org_id: this.props.orgId,
      balance: this.props.balance.toString(),
      low_balance_threshold: this.props.lowBalanceThreshold.toString(),
      status: this.props.status,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
    }
  }
}
```

- [ ] **Step 12: 執行 test 確認 PASS**

Run: `bun test src/Modules/Credit/__tests__/CreditAccount.test.ts`
Expected: PASS

- [ ] **Step 13: 實作 CreditTransaction Entity**

```typescript
// src/Modules/Credit/Domain/Entities/CreditTransaction.ts
import { TransactionType } from '../ValueObjects/TransactionType'

interface CreditTransactionProps {
  readonly id: string
  readonly creditAccountId: string
  readonly type: TransactionType
  readonly amount: string
  readonly balanceAfter: string
  readonly referenceType: string | null
  readonly referenceId: string | null
  readonly description: string | null
  readonly createdAt: Date
}

export class CreditTransaction {
  private readonly props: CreditTransactionProps

  private constructor(props: CreditTransactionProps) {
    this.props = props
  }

  static create(params: {
    id: string
    creditAccountId: string
    type: TransactionType
    amount: string
    balanceAfter: string
    referenceType?: string
    referenceId?: string
    description?: string
  }): CreditTransaction {
    return new CreditTransaction({
      id: params.id,
      creditAccountId: params.creditAccountId,
      type: params.type,
      amount: params.amount,
      balanceAfter: params.balanceAfter,
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
      description: params.description ?? null,
      createdAt: new Date(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): CreditTransaction {
    return new CreditTransaction({
      id: row.id as string,
      creditAccountId: row.credit_account_id as string,
      type: TransactionType.from(row.type as string),
      amount: row.amount as string,
      balanceAfter: row.balance_after as string,
      referenceType: (row.reference_type as string) ?? null,
      referenceId: (row.reference_id as string) ?? null,
      description: (row.description as string) ?? null,
      createdAt: new Date(row.created_at as string),
    })
  }

  get id(): string { return this.props.id }
  get creditAccountId(): string { return this.props.creditAccountId }
  get type(): string { return this.props.type.getValue() }
  get amount(): string { return this.props.amount }
  get balanceAfter(): string { return this.props.balanceAfter }
  get referenceType(): string | null { return this.props.referenceType }
  get referenceId(): string | null { return this.props.referenceId }
  get description(): string | null { return this.props.description }
  get createdAt(): Date { return this.props.createdAt }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      credit_account_id: this.props.creditAccountId,
      type: this.props.type.getValue(),
      amount: this.props.amount,
      balance_after: this.props.balanceAfter,
      reference_type: this.props.referenceType,
      reference_id: this.props.referenceId,
      description: this.props.description,
      created_at: this.props.createdAt.toISOString(),
    }
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.props.id,
      creditAccountId: this.props.creditAccountId,
      type: this.props.type.getValue(),
      amount: this.props.amount,
      balanceAfter: this.props.balanceAfter,
      referenceType: this.props.referenceType,
      referenceId: this.props.referenceId,
      description: this.props.description,
      createdAt: this.props.createdAt.toISOString(),
    }
  }
}
```

- [ ] **Step 14: 實作 Domain Events**

```typescript
// src/Modules/Credit/Domain/Events/BalanceLow.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class BalanceLow extends DomainEvent {
  constructor(accountId: string, orgId: string, currentBalance: string) {
    super(accountId, 'credit.balance_low', { orgId, currentBalance })
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      data: this.data,
    }
  }
}
```

```typescript
// src/Modules/Credit/Domain/Events/BalanceDepleted.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class BalanceDepleted extends DomainEvent {
  constructor(accountId: string, orgId: string) {
    super(accountId, 'credit.balance_depleted', { orgId })
  }

  get orgId(): string { return this.data.orgId as string }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      data: this.data,
    }
  }
}
```

```typescript
// src/Modules/Credit/Domain/Events/CreditToppedUp.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class CreditToppedUp extends DomainEvent {
  constructor(accountId: string, orgId: string, amount: string) {
    super(accountId, 'credit.topped_up', { orgId, amount })
  }

  get orgId(): string { return this.data.orgId as string }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      data: this.data,
    }
  }
}
```

- [ ] **Step 15: 實作 Repository 介面**

```typescript
// src/Modules/Credit/Domain/Repositories/ICreditAccountRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { CreditAccount } from '../Aggregates/CreditAccount'

export interface ICreditAccountRepository {
  findById(id: string): Promise<CreditAccount | null>
  findByOrgId(orgId: string): Promise<CreditAccount | null>
  save(account: CreditAccount): Promise<void>
  update(account: CreditAccount): Promise<void>
  withTransaction(tx: IDatabaseAccess): ICreditAccountRepository
}
```

```typescript
// src/Modules/Credit/Domain/Repositories/ICreditTransactionRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { CreditTransaction } from '../Entities/CreditTransaction'

export interface ICreditTransactionRepository {
  save(transaction: CreditTransaction): Promise<void>
  findByAccountId(
    accountId: string,
    limit?: number,
    offset?: number,
  ): Promise<CreditTransaction[]>
  countByAccountId(accountId: string): Promise<number>
  findByAccountIdAndTypes(
    accountId: string,
    types: string[],
    startDate?: Date,
    endDate?: Date,
  ): Promise<CreditTransaction[]>
  withTransaction(tx: IDatabaseAccess): ICreditTransactionRepository
}
```

- [ ] **Step 16: 寫 CreditDeductionService 的 failing test**

```typescript
// src/Modules/Credit/__tests__/CreditDeductionService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { CreditDeductionService } from '../Domain/Services/CreditDeductionService'
import { CreditAccountRepository } from '../Infrastructure/Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Infrastructure/Repositories/CreditTransactionRepository'
import { CreditAccount } from '../Domain/Aggregates/CreditAccount'

describe('CreditDeductionService', () => {
  let db: MemoryDatabaseAccess
  let accountRepo: CreditAccountRepository
  let txRepo: CreditTransactionRepository
  let service: CreditDeductionService

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    accountRepo = new CreditAccountRepository(db)
    txRepo = new CreditTransactionRepository(db)
    service = new CreditDeductionService()

    const account = CreditAccount.fromDatabase({
      id: 'acc-1', org_id: 'org-1', balance: '1000',
      low_balance_threshold: '100', status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    await accountRepo.save(account)
  })

  it('應正確扣款並建立交易紀錄', async () => {
    const result = await service.deduct({
      accountRepo,
      transactionRepo: txRepo,
      orgId: 'org-1',
      amount: '50',
      referenceType: 'usage_record',
      referenceId: 'ur-1',
    })

    expect(result.success).toBe(true)
    expect(result.newBalance).toBe('950')
    expect(result.events).toHaveLength(0)
  })

  it('餘額低於閾值應產生 BalanceLow 事件', async () => {
    const result = await service.deduct({
      accountRepo,
      transactionRepo: txRepo,
      orgId: 'org-1',
      amount: '950',
      referenceType: 'usage_record',
      referenceId: 'ur-2',
    })

    expect(result.success).toBe(true)
    expect(result.newBalance).toBe('50')
    const lowEvent = result.events.find((e) => e.eventType === 'credit.balance_low')
    expect(lowEvent).toBeDefined()
  })

  it('餘額耗盡應產生 BalanceDepleted 事件', async () => {
    const result = await service.deduct({
      accountRepo,
      transactionRepo: txRepo,
      orgId: 'org-1',
      amount: '1000',
      referenceType: 'usage_record',
      referenceId: 'ur-3',
    })

    expect(result.success).toBe(true)
    expect(result.newBalance).toBe('0')
    const depletedEvent = result.events.find((e) => e.eventType === 'credit.balance_depleted')
    expect(depletedEvent).toBeDefined()
  })

  it('帳戶不存在應回傳失敗', async () => {
    const result = await service.deduct({
      accountRepo,
      transactionRepo: txRepo,
      orgId: 'nonexistent',
      amount: '10',
    })

    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 17: 執行 test 確認 FAIL**

Run: `bun test src/Modules/Credit/__tests__/CreditDeductionService.test.ts`
Expected: FAIL

- [ ] **Step 18: 實作 CreditDeductionService**

```typescript
// src/Modules/Credit/Domain/Services/CreditDeductionService.ts
import type { ICreditAccountRepository } from '../Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../Repositories/ICreditTransactionRepository'
import { CreditTransaction } from '../Entities/CreditTransaction'
import { TransactionType } from '../ValueObjects/TransactionType'
import { BalanceLow } from '../Events/BalanceLow'
import { BalanceDepleted } from '../Events/BalanceDepleted'
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'

interface DeductParams {
  accountRepo: ICreditAccountRepository
  transactionRepo: ICreditTransactionRepository
  orgId: string
  amount: string
  referenceType?: string
  referenceId?: string
  description?: string
}

interface DeductResult {
  success: boolean
  newBalance?: string
  events: DomainEvent[]
  error?: string
}

export class CreditDeductionService {
  async deduct(params: DeductParams): Promise<DeductResult> {
    const account = await params.accountRepo.findByOrgId(params.orgId)
    if (!account) {
      return { success: false, events: [], error: 'ACCOUNT_NOT_FOUND' }
    }

    const updated = account.applyDeduction(params.amount)

    const transaction = CreditTransaction.create({
      id: crypto.randomUUID(),
      creditAccountId: account.id,
      type: TransactionType.deduction(),
      amount: params.amount,
      balanceAfter: updated.balance,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      description: params.description,
    })

    await params.accountRepo.update(updated)
    await params.transactionRepo.save(transaction)

    const events: DomainEvent[] = []

    if (updated.isBalanceDepleted()) {
      events.push(new BalanceDepleted(account.id, account.orgId))
    } else if (updated.isBalanceLow()) {
      events.push(new BalanceLow(account.id, account.orgId, updated.balance))
    }

    return { success: true, newBalance: updated.balance, events }
  }
}
```

- [ ] **Step 19: 實作 Repository 實作（先建立才能通過測試）**

```typescript
// src/Modules/Credit/Infrastructure/Repositories/CreditAccountRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import { CreditAccount } from '../../Domain/Aggregates/CreditAccount'

export class CreditAccountRepository implements ICreditAccountRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<CreditAccount | null> {
    const row = await this.db.table('credit_accounts').where('id', '=', id).first()
    return row ? CreditAccount.fromDatabase(row) : null
  }

  async findByOrgId(orgId: string): Promise<CreditAccount | null> {
    const row = await this.db.table('credit_accounts').where('org_id', '=', orgId).first()
    return row ? CreditAccount.fromDatabase(row) : null
  }

  async save(account: CreditAccount): Promise<void> {
    await this.db.table('credit_accounts').insert(account.toDatabaseRow())
  }

  async update(account: CreditAccount): Promise<void> {
    await this.db.table('credit_accounts').where('id', '=', account.id).update(account.toDatabaseRow())
  }

  withTransaction(tx: IDatabaseAccess): CreditAccountRepository {
    return new CreditAccountRepository(tx)
  }
}
```

```typescript
// src/Modules/Credit/Infrastructure/Repositories/CreditTransactionRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ICreditTransactionRepository } from '../../Domain/Repositories/ICreditTransactionRepository'
import { CreditTransaction } from '../../Domain/Entities/CreditTransaction'

export class CreditTransactionRepository implements ICreditTransactionRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async save(transaction: CreditTransaction): Promise<void> {
    await this.db.table('credit_transactions').insert(transaction.toDatabaseRow())
  }

  async findByAccountId(
    accountId: string,
    limit?: number,
    offset?: number,
  ): Promise<CreditTransaction[]> {
    let query = this.db
      .table('credit_transactions')
      .where('credit_account_id', '=', accountId)
      .orderBy('created_at', 'DESC')
    if (offset != null && offset > 0) query = query.offset(offset)
    if (limit != null) query = query.limit(limit)
    const rows = await query.select()
    return rows.map((r) => CreditTransaction.fromDatabase(r))
  }

  async countByAccountId(accountId: string): Promise<number> {
    return this.db.table('credit_transactions').where('credit_account_id', '=', accountId).count()
  }

  async findByAccountIdAndTypes(
    accountId: string,
    types: string[],
    startDate?: Date,
    endDate?: Date,
  ): Promise<CreditTransaction[]> {
    let query = this.db
      .table('credit_transactions')
      .where('credit_account_id', '=', accountId)
    if (startDate && endDate) {
      query = query.whereBetween('created_at', [startDate, endDate])
    }
    const rows = await query.orderBy('created_at', 'DESC').select()
    return rows
      .filter((r) => types.includes(r.type as string))
      .map((r) => CreditTransaction.fromDatabase(r))
  }

  withTransaction(tx: IDatabaseAccess): CreditTransactionRepository {
    return new CreditTransactionRepository(tx)
  }
}
```

- [ ] **Step 20: 執行所有 Credit 測試確認 PASS**

Run: `bun test src/Modules/Credit/`
Expected: ALL PASS

- [ ] **Step 21: Commit**

```bash
git add src/Modules/Credit/Domain/ src/Modules/Credit/Infrastructure/Repositories/ src/Modules/Credit/__tests__/
git commit -m "feat: [p4] Credit 模組 Domain Layer — 帳戶、交易、扣款服務、事件"
```

---

## Task 3: Credit 模組 — Application + Presentation Layer

**Files:**
- Create: `src/Modules/Credit/Application/DTOs/CreditDTO.ts`
- Create: `src/Modules/Credit/Application/Services/TopUpCreditService.ts`
- Create: `src/Modules/Credit/Application/Services/GetBalanceService.ts`
- Create: `src/Modules/Credit/Application/Services/GetTransactionHistoryService.ts`
- Create: `src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts`
- Create: `src/Modules/Credit/Presentation/Controllers/CreditController.ts`
- Create: `src/Modules/Credit/Presentation/Routes/credit.routes.ts`
- Create: `src/Modules/Credit/Presentation/Validators/credit.validator.ts`
- Create: `src/Modules/Credit/index.ts`
- Test: `src/Modules/Credit/__tests__/TopUpCreditService.test.ts`
- Test: `src/Modules/Credit/__tests__/GetBalanceService.test.ts`

- [ ] **Step 1: 建立 DTO**

```typescript
// src/Modules/Credit/Application/DTOs/CreditDTO.ts
export interface TopUpRequest {
  orgId: string
  amount: string
  description?: string
  callerUserId: string
  callerSystemRole: string
}

export interface CreditResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

export interface BalanceResponse {
  success: boolean
  message: string
  data?: {
    balance: string
    lowBalanceThreshold: string
    status: string
  }
  error?: string
}

export interface TransactionHistoryResponse {
  success: boolean
  message: string
  data?: {
    transactions: Record<string, unknown>[]
    total: number
    page: number
    limit: number
  }
  error?: string
}
```

- [ ] **Step 2: 寫 TopUpCreditService 的 failing test**

```typescript
// src/Modules/Credit/__tests__/TopUpCreditService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { TopUpCreditService } from '../Application/Services/TopUpCreditService'
import { CreditAccountRepository } from '../Infrastructure/Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Infrastructure/Repositories/CreditTransactionRepository'
import { CreditAccount } from '../Domain/Aggregates/CreditAccount'

describe('TopUpCreditService', () => {
  let db: MemoryDatabaseAccess
  let service: TopUpCreditService

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    const accountRepo = new CreditAccountRepository(db)
    const txRepo = new CreditTransactionRepository(db)
    service = new TopUpCreditService(accountRepo, txRepo)

    const account = CreditAccount.create('acc-1', 'org-1')
    await accountRepo.save(account)
  })

  it('應成功充值', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      amount: '500',
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })
    expect(result.success).toBe(true)
    expect(result.data?.balance).toBe('500')
  })

  it('充值金額為 0 或負數應拒絕', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      amount: '0',
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })
    expect(result.success).toBe(false)
  })

  it('帳戶不存在應自動建立', async () => {
    const result = await service.execute({
      orgId: 'org-new',
      amount: '100',
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })
    expect(result.success).toBe(true)
    expect(result.data?.balance).toBe('100')
  })
})
```

- [ ] **Step 3: 執行 test 確認 FAIL**

Run: `bun test src/Modules/Credit/__tests__/TopUpCreditService.test.ts`
Expected: FAIL

- [ ] **Step 4: 實作 TopUpCreditService**

```typescript
// src/Modules/Credit/Application/Services/TopUpCreditService.ts
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../../Domain/Repositories/ICreditTransactionRepository'
import { CreditAccount } from '../../Domain/Aggregates/CreditAccount'
import { CreditTransaction } from '../../Domain/Entities/CreditTransaction'
import { TransactionType } from '../../Domain/ValueObjects/TransactionType'
import { Balance } from '../../Domain/ValueObjects/Balance'
import type { TopUpRequest, CreditResponse } from '../DTOs/CreditDTO'

export class TopUpCreditService {
  constructor(
    private readonly accountRepo: ICreditAccountRepository,
    private readonly txRepo: ICreditTransactionRepository,
  ) {}

  async execute(request: TopUpRequest): Promise<CreditResponse> {
    try {
      const amount = Balance.fromString(request.amount)
      if (amount.isNegativeOrZero()) {
        return { success: false, message: '充值金額必須為正數', error: 'INVALID_AMOUNT' }
      }

      let account = await this.accountRepo.findByOrgId(request.orgId)
      if (!account) {
        account = CreditAccount.create(crypto.randomUUID(), request.orgId)
        await this.accountRepo.save(account)
      }

      const updated = account.applyTopUp(request.amount)
      const transaction = CreditTransaction.create({
        id: crypto.randomUUID(),
        creditAccountId: account.id,
        type: TransactionType.topup(),
        amount: request.amount,
        balanceAfter: updated.balance,
        description: request.description ?? `管理者 ${request.callerUserId} 充值`,
      })

      await this.accountRepo.update(updated)
      await this.txRepo.save(transaction)

      return {
        success: true,
        message: '充值成功',
        data: {
          balance: updated.balance,
          transactionId: transaction.id,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '充值失敗'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 5: 執行 test 確認 PASS**

Run: `bun test src/Modules/Credit/__tests__/TopUpCreditService.test.ts`
Expected: PASS

- [ ] **Step 6: 實作 GetBalanceService + GetTransactionHistoryService**

```typescript
// src/Modules/Credit/Application/Services/GetBalanceService.ts
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { BalanceResponse } from '../DTOs/CreditDTO'

export class GetBalanceService {
  constructor(
    private readonly accountRepo: ICreditAccountRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(orgId: string, callerUserId: string, callerSystemRole: string): Promise<BalanceResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(orgId, callerUserId, callerSystemRole)
      if (!authResult.authorized) {
        return { success: false, message: '無權存取此組織', error: 'NOT_ORG_MEMBER' }
      }

      const account = await this.accountRepo.findByOrgId(orgId)
      if (!account) {
        return {
          success: true,
          message: '查詢成功',
          data: { balance: '0', lowBalanceThreshold: '100', status: 'active' },
        }
      }

      return {
        success: true,
        message: '查詢成功',
        data: {
          balance: account.balance,
          lowBalanceThreshold: account.lowBalanceThreshold,
          status: account.status,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
```

```typescript
// src/Modules/Credit/Application/Services/GetTransactionHistoryService.ts
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../../Domain/Repositories/ICreditTransactionRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { TransactionHistoryResponse } from '../DTOs/CreditDTO'

export class GetTransactionHistoryService {
  constructor(
    private readonly accountRepo: ICreditAccountRepository,
    private readonly txRepo: ICreditTransactionRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
    page = 1,
    limit = 20,
  ): Promise<TransactionHistoryResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(orgId, callerUserId, callerSystemRole)
      if (!authResult.authorized) {
        return { success: false, message: '無權存取', error: 'NOT_ORG_MEMBER' }
      }

      const account = await this.accountRepo.findByOrgId(orgId)
      if (!account) {
        return {
          success: true,
          message: '查詢成功',
          data: { transactions: [], total: 0, page, limit },
        }
      }

      const offset = (page - 1) * limit
      const [transactions, total] = await Promise.all([
        this.txRepo.findByAccountId(account.id, limit, offset),
        this.txRepo.countByAccountId(account.id),
      ])

      return {
        success: true,
        message: '查詢成功',
        data: {
          transactions: transactions.map((t) => t.toDTO()),
          total,
          page,
          limit,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 7: 建立 Validators**

```typescript
// src/Modules/Credit/Presentation/Validators/credit.validator.ts
import { z } from 'zod'

export const TopUpSchema = z.object({
  amount: z.string().refine(
    (val) => { const n = parseFloat(val); return !isNaN(n) && n > 0 },
    { message: '金額必須為正數' },
  ),
  description: z.string().optional(),
})

export const AdjustmentSchema = z.object({
  amount: z.string().refine(
    (val) => { const n = parseFloat(val); return !isNaN(n) && n !== 0 },
    { message: '調整金額不能為零' },
  ),
  description: z.string().min(1, '調整原因為必填'),
})

export type TopUpParams = z.infer<typeof TopUpSchema>
export type AdjustmentParams = z.infer<typeof AdjustmentSchema>
```

- [ ] **Step 8: 建立 Controller**

```typescript
// src/Modules/Credit/Presentation/Controllers/CreditController.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { TopUpCreditService } from '../../Application/Services/TopUpCreditService'
import type { GetBalanceService } from '../../Application/Services/GetBalanceService'
import type { GetTransactionHistoryService } from '../../Application/Services/GetTransactionHistoryService'

export class CreditController {
  constructor(
    private readonly topUpService: TopUpCreditService,
    private readonly getBalanceService: GetBalanceService,
    private readonly getTransactionHistoryService: GetTransactionHistoryService,
  ) {}

  async getBalance(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 400)
    const result = await this.getBalanceService.execute(orgId, auth.userId, auth.role)
    return ctx.json(result)
  }

  async getTransactions(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 400)
    const page = ctx.getQuery('page') ? parseInt(ctx.getQuery('page')!, 10) : 1
    const limit = ctx.getQuery('limit') ? parseInt(ctx.getQuery('limit')!, 10) : 20
    const result = await this.getTransactionHistoryService.execute(orgId, auth.userId, auth.role, page, limit)
    return ctx.json(result)
  }

  async topUp(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 400)
    const body = await ctx.getJsonBody<{ amount?: string; description?: string }>()
    const result = await this.topUpService.execute({
      orgId,
      amount: body.amount ?? '0',
      description: body.description,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    const status = result.success ? 200 : 400
    return ctx.json(result, status)
  }
}
```

- [ ] **Step 9: 建立 Routes**

```typescript
// src/Modules/Credit/Presentation/Routes/credit.routes.ts
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { CreditController } from '../Controllers/CreditController'
import { requireAuth, createRoleMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'

export function registerCreditRoutes(router: IModuleRouter, controller: CreditController): void {
  router.get('/api/organizations/:orgId/credits/balance', [requireAuth()], (ctx) => controller.getBalance(ctx))
  router.get('/api/organizations/:orgId/credits/transactions', [requireAuth()], (ctx) => controller.getTransactions(ctx))
  router.post('/api/organizations/:orgId/credits/topup', [requireAuth(), createRoleMiddleware('admin')], (ctx) => controller.topUp(ctx))
}
```

- [ ] **Step 10: 建立 ServiceProvider**

```typescript
// src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { CreditAccountRepository } from '../Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Repositories/CreditTransactionRepository'
import { CreditDeductionService } from '../../Domain/Services/CreditDeductionService'
import { TopUpCreditService } from '../../Application/Services/TopUpCreditService'
import { GetBalanceService } from '../../Application/Services/GetBalanceService'
import { GetTransactionHistoryService } from '../../Application/Services/GetTransactionHistoryService'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'

export class CreditServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('creditAccountRepository', () => new CreditAccountRepository(db))
    container.singleton('creditTransactionRepository', () => new CreditTransactionRepository(db))
    container.singleton('creditDeductionService', () => new CreditDeductionService())

    container.bind('topUpCreditService', (c: IContainer) => {
      return new TopUpCreditService(
        c.make('creditAccountRepository') as CreditAccountRepository,
        c.make('creditTransactionRepository') as CreditTransactionRepository,
      )
    })

    container.bind('getBalanceService', (c: IContainer) => {
      return new GetBalanceService(
        c.make('creditAccountRepository') as CreditAccountRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('getTransactionHistoryService', (c: IContainer) => {
      return new GetTransactionHistoryService(
        c.make('creditAccountRepository') as CreditAccountRepository,
        c.make('creditTransactionRepository') as CreditTransactionRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })
  }

  override boot(_context: unknown): void {
    console.log('💰 [Credit] Module loaded')
  }
}
```

- [ ] **Step 11: 建立 index.ts**

```typescript
// src/Modules/Credit/index.ts
export { CreditController } from './Presentation/Controllers/CreditController'
export { registerCreditRoutes } from './Presentation/Routes/credit.routes'
```

- [ ] **Step 12: 執行所有 Credit 測試**

Run: `bun test src/Modules/Credit/`
Expected: ALL PASS

- [ ] **Step 13: Commit**

```bash
git add src/Modules/Credit/
git commit -m "feat: [p4] Credit 模組 Application + Presentation Layer"
```

---

## Task 4: ApiKey 模組擴充 — 凍結/恢復支援

**Files:**
- Modify: `src/Modules/ApiKey/Domain/ValueObjects/KeyStatus.ts`
- Modify: `src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts`
- Modify: `src/Modules/ApiKey/Domain/Repositories/IApiKeyRepository.ts`
- Modify: `src/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository.ts`
- Test: `src/Modules/Credit/__tests__/HandleBalanceDepletedService.test.ts`

- [ ] **Step 1: 擴充 KeyStatus — 新增 `suspended_no_credit`**

在 `src/Modules/ApiKey/Domain/ValueObjects/KeyStatus.ts` 中：

將 `KeyStatusValues` 改為：

```typescript
export const KeyStatusValues = ['pending', 'active', 'revoked', 'suspended_no_credit'] as const
```

新增方法：

```typescript
static suspendedNoCredit(): KeyStatus {
  return new KeyStatus('suspended_no_credit')
}

isSuspendedNoCredit(): boolean {
  return this.value === 'suspended_no_credit'
}
```

- [ ] **Step 2: 擴充 ApiKey 聚合 — 新增凍結快照欄位與方法**

在 `ApiKeyProps` 介面新增：

```typescript
readonly suspensionReason: string | null
readonly preFreezeRateLimit: string | null   // JSON string
readonly suspendedAt: Date | null
```

在 `ApiKey` class 新增方法：

```typescript
suspend(reason: string, currentRateLimit: { rpm: number | null; tpm: number | null }): ApiKey {
  if (this.props.status.getValue() === 'suspended_no_credit') return this
  return new ApiKey({
    ...this.props,
    status: KeyStatus.suspendedNoCredit(),
    suspensionReason: reason,
    preFreezeRateLimit: JSON.stringify(currentRateLimit),
    suspendedAt: new Date(),
    updatedAt: new Date(),
  })
}

unsuspend(): ApiKey {
  if (this.props.status.getValue() !== 'suspended_no_credit') return this
  return new ApiKey({
    ...this.props,
    status: KeyStatus.active(),
    suspensionReason: null,
    preFreezeRateLimit: null,
    suspendedAt: null,
    updatedAt: new Date(),
  })
}

get preFreezeRateLimit(): { rpm: number | null; tpm: number | null } | null {
  if (!this.props.preFreezeRateLimit) return null
  return JSON.parse(this.props.preFreezeRateLimit)
}

get suspensionReason(): string | null { return this.props.suspensionReason }
```

更新 `fromDatabase`、`toDatabaseRow`、`create` 以處理新欄位（預設 null）。

- [ ] **Step 3: 擴充 IApiKeyRepository — 新增查詢方法**

```typescript
// 新增至 IApiKeyRepository
findActiveByOrgId(orgId: string): Promise<ApiKey[]>
findSuspendedByOrgId(orgId: string, reason: string): Promise<ApiKey[]>
```

- [ ] **Step 4: 擴充 ApiKeyRepository 實作**

```typescript
async findActiveByOrgId(orgId: string): Promise<ApiKey[]> {
  const rows = await this.db
    .table('api_keys')
    .where('org_id', '=', orgId)
    .where('status', '=', 'active')
    .select()
  return rows.map((row) => ApiKey.fromDatabase(row))
}

async findSuspendedByOrgId(orgId: string, reason: string): Promise<ApiKey[]> {
  const rows = await this.db
    .table('api_keys')
    .where('org_id', '=', orgId)
    .where('status', '=', 'suspended_no_credit')
    .select()
  return rows
    .map((row) => ApiKey.fromDatabase(row))
    .filter((key) => key.suspensionReason === reason)
}
```

- [ ] **Step 5: 建立 api_keys 表 migration 更新（新增欄位）**

```typescript
// database/migrations/2026_04_09_000007_add_suspension_fields_to_api_keys.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class AddSuspensionFieldsToApiKeys implements Migration {
  async up(): Promise<void> {
    await Schema.table('api_keys', (table) => {
      table.string('suspension_reason').nullable()
      table.text('pre_freeze_rate_limit').nullable()
      table.timestamp('suspended_at').nullable()
    })
  }

  async down(): Promise<void> {
    await Schema.table('api_keys', (table) => {
      table.dropColumn('suspension_reason')
      table.dropColumn('pre_freeze_rate_limit')
      table.dropColumn('suspended_at')
    })
  }
}
```

- [ ] **Step 6: 實作 HandleBalanceDepletedService + HandleCreditToppedUpService**

```typescript
// src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

/**
 * 餘額耗盡阻擋服務 — 補償式狀態轉換
 *
 * 策略：先持久化本地意圖（PENDING_SUSPEND），再操作遠端（Bifrost），
 * 最後確認本地狀態（SUSPENDED_NO_CREDIT）。
 * 若遠端失敗，本地保持 PENDING_SUSPEND，由排程重試。
 * 若本地確認失敗，遠端已阻擋但本地可由重試修復。
 */
export class HandleBalanceDepletedService {
  constructor(
    private readonly apiKeyRepo: IApiKeyRepository,
    private readonly bifrostClient: BifrostClient,
  ) {}

  async execute(orgId: string): Promise<{ processed: number; failed: number }> {
    const activeKeys = await this.apiKeyRepo.findActiveByOrgId(orgId)
    let processed = 0
    let failed = 0

    for (const key of activeKeys) {
      try {
        // Step 1: 本地先標記為 PENDING_SUSPEND + 快照 rate limit
        const currentRateLimit = { rpm: key.scope.getRateLimitRpm(), tpm: key.scope.getRateLimitTpm() }
        const pendingSuspend = key.suspend('CREDIT_DEPLETED', currentRateLimit)
        await this.apiKeyRepo.update(pendingSuspend)

        // Step 2: 遠端 Bifrost 阻擋
        await this.bifrostClient.updateVirtualKey(key.bifrostVirtualKeyId, {
          rate_limit: {
            token_max_limit: 0,
            token_reset_duration: '1h',
            request_max_limit: 0,
            request_reset_duration: '1h',
          },
        })

        // Step 3: 本地確認完成（狀態已在 step 1 設好，此處可加 confirmed_at）
        processed++
      } catch (error: unknown) {
        // 遠端失敗：本地已標記 PENDING_SUSPEND，排程重試時會重新嘗試
        // 不 rollback 本地狀態 — 寧可本地多阻擋也不漏阻擋
        console.error(`Key ${key.id} 阻擋失敗，將由排程重試:`, error)
        failed++
      }
    }

    return { processed, failed }
  }

  /**
   * 重試失敗的阻擋（由排程呼叫）
   * 查找 SUSPENDED_NO_CREDIT 但可能未同步到 Bifrost 的 key
   */
  async retryPending(orgId: string): Promise<void> {
    const suspendedKeys = await this.apiKeyRepo.findSuspendedByOrgId(orgId, 'CREDIT_DEPLETED')
    for (const key of suspendedKeys) {
      try {
        await this.bifrostClient.updateVirtualKey(key.bifrostVirtualKeyId, {
          rate_limit: {
            token_max_limit: 0,
            token_reset_duration: '1h',
            request_max_limit: 0,
            request_reset_duration: '1h',
          },
        })
      } catch {
        // 下次重試
      }
    }
  }
}
```

```typescript
// src/Modules/Credit/Application/Services/HandleCreditToppedUpService.ts
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

/**
 * 充值恢復服務 — 補償式狀態轉換
 *
 * 策略：先操作遠端恢復（Bifrost），成功後再清除本地凍結狀態。
 * 若遠端失敗，本地保持 SUSPENDED_NO_CREDIT 不變，由重試修復。
 * 若本地清除失敗，遠端已恢復但本地可由重試修復。
 */
export class HandleCreditToppedUpService {
  constructor(
    private readonly apiKeyRepo: IApiKeyRepository,
    private readonly bifrostClient: BifrostClient,
  ) {}

  async execute(orgId: string): Promise<{ processed: number; failed: number }> {
    const suspendedKeys = await this.apiKeyRepo.findSuspendedByOrgId(orgId, 'CREDIT_DEPLETED')
    let processed = 0
    let failed = 0

    for (const key of suspendedKeys) {
      try {
        const preFreeze = key.preFreezeRateLimit

        // Step 1: 先恢復遠端 Bifrost rate limit
        if (preFreeze && (preFreeze.rpm != null || preFreeze.tpm != null)) {
          await this.bifrostClient.updateVirtualKey(key.bifrostVirtualKeyId, {
            rate_limit: {
              token_max_limit: preFreeze.tpm ?? 100000,
              token_reset_duration: '1h',
              request_max_limit: preFreeze.rpm ?? null,
              request_reset_duration: preFreeze.rpm ? '1m' : null,
            },
          })
        }

        // Step 2: 遠端成功後，清除本地凍結狀態
        const restored = key.unsuspend()
        await this.apiKeyRepo.update(restored)
        processed++
      } catch (error: unknown) {
        // 遠端失敗：本地保持 SUSPENDED_NO_CREDIT，不恢復
        // 排程重試會再次嘗試
        console.error(`Key ${key.id} 恢復失敗，將由排程重試:`, error)
        failed++
      }
    }

    return { processed, failed }
  }
}
```

- [ ] **Step 7: 執行 test 確認 PASS**

Run: `bun test src/Modules/ApiKey/ src/Modules/Credit/`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add src/Modules/ApiKey/ src/Modules/Credit/Application/Services/Handle* database/migrations/2026_04_09_000006_*
git commit -m "feat: [p4] ApiKey 擴充凍結/恢復支援 + 餘額阻擋/恢復服務"
```

---

## Task 5: UsageSync 模組 — Domain + Infrastructure Layer

**Files:**
- Create: `src/Modules/UsageSync/Domain/Entities/UsageRecord.ts`
- Create: `src/Modules/UsageSync/Domain/Entities/SyncCursor.ts`
- Create: `src/Modules/UsageSync/Domain/Entities/PricingRule.ts`
- Create: `src/Modules/UsageSync/Domain/Repositories/IUsageRecordRepository.ts`
- Create: `src/Modules/UsageSync/Domain/Repositories/ISyncCursorRepository.ts`
- Create: `src/Modules/UsageSync/Domain/Repositories/IPricingRuleRepository.ts`
- Create: `src/Modules/UsageSync/Domain/Services/UsagePricingCalculator.ts`
- Create: `src/Modules/UsageSync/Domain/Events/UsageAnomalyDetected.ts`
- Create: `src/Modules/UsageSync/Infrastructure/Repositories/UsageRecordRepository.ts`
- Create: `src/Modules/UsageSync/Infrastructure/Repositories/SyncCursorRepository.ts`
- Create: `src/Modules/UsageSync/Infrastructure/Repositories/PricingRuleRepository.ts`
- Test: `src/Modules/UsageSync/__tests__/UsagePricingCalculator.test.ts`
- Test: `src/Modules/UsageSync/__tests__/UsageRecord.test.ts`
- Test: `src/Modules/UsageSync/__tests__/PricingRule.test.ts`

- [ ] **Step 1: 寫 PricingRule Entity**

```typescript
// src/Modules/UsageSync/Domain/Entities/PricingRule.ts
interface PricingRuleProps {
  readonly id: string
  readonly modelPattern: string
  readonly inputTokenPrice: string
  readonly outputTokenPrice: string
  readonly imagePrice: string | null
  readonly audioPrice: string | null
  readonly priority: number
  readonly isActive: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

export class PricingRule {
  private readonly props: PricingRuleProps

  private constructor(props: PricingRuleProps) {
    this.props = props
  }

  static create(params: {
    id: string
    modelPattern: string
    inputTokenPrice: string
    outputTokenPrice: string
    imagePrice?: string
    audioPrice?: string
    priority?: number
  }): PricingRule {
    return new PricingRule({
      id: params.id,
      modelPattern: params.modelPattern,
      inputTokenPrice: params.inputTokenPrice,
      outputTokenPrice: params.outputTokenPrice,
      imagePrice: params.imagePrice ?? null,
      audioPrice: params.audioPrice ?? null,
      priority: params.priority ?? 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): PricingRule {
    return new PricingRule({
      id: row.id as string,
      modelPattern: row.model_pattern as string,
      inputTokenPrice: row.input_token_price as string,
      outputTokenPrice: row.output_token_price as string,
      imagePrice: (row.image_price as string) ?? null,
      audioPrice: (row.audio_price as string) ?? null,
      priority: parseInt(row.priority as string, 10),
      isActive: row.is_active === 'true' || row.is_active === true,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    })
  }

  matchesModel(model: string): boolean {
    const pattern = this.props.modelPattern
    if (pattern === '*') return true
    if (pattern.endsWith('*')) {
      return model.startsWith(pattern.slice(0, -1))
    }
    return model === pattern
  }

  get id(): string { return this.props.id }
  get modelPattern(): string { return this.props.modelPattern }
  get inputTokenPrice(): string { return this.props.inputTokenPrice }
  get outputTokenPrice(): string { return this.props.outputTokenPrice }
  get imagePrice(): string | null { return this.props.imagePrice }
  get audioPrice(): string | null { return this.props.audioPrice }
  get priority(): number { return this.props.priority }
  get isActive(): boolean { return this.props.isActive }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      model_pattern: this.props.modelPattern,
      input_token_price: this.props.inputTokenPrice,
      output_token_price: this.props.outputTokenPrice,
      image_price: this.props.imagePrice,
      audio_price: this.props.audioPrice,
      priority: String(this.props.priority),
      is_active: String(this.props.isActive),
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
    }
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.props.id,
      modelPattern: this.props.modelPattern,
      inputTokenPrice: this.props.inputTokenPrice,
      outputTokenPrice: this.props.outputTokenPrice,
      imagePrice: this.props.imagePrice,
      audioPrice: this.props.audioPrice,
      priority: this.props.priority,
      isActive: this.props.isActive,
    }
  }
}
```

- [ ] **Step 2: 寫 UsagePricingCalculator 的 failing test**

```typescript
// src/Modules/UsageSync/__tests__/UsagePricingCalculator.test.ts
import { describe, it, expect } from 'vitest'
import { UsagePricingCalculator } from '../Domain/Services/UsagePricingCalculator'
import { PricingRule } from '../Domain/Entities/PricingRule'

describe('UsagePricingCalculator', () => {
  const rules = [
    PricingRule.create({
      id: 'r1', modelPattern: 'gpt-4*',
      inputTokenPrice: '0.03', outputTokenPrice: '0.06', priority: 10,
    }),
    PricingRule.create({
      id: 'r2', modelPattern: 'claude-3*',
      inputTokenPrice: '0.015', outputTokenPrice: '0.075', priority: 10,
    }),
    PricingRule.create({
      id: 'r3', modelPattern: '*',
      inputTokenPrice: '0.01', outputTokenPrice: '0.03', priority: 0,
    }),
  ]

  const calculator = new UsagePricingCalculator(rules)

  it('應匹配 gpt-4 前綴規則', () => {
    const cost = calculator.calculate('gpt-4-turbo', 1000, 500)
    // input: 1000/1000 * 0.03 = 0.03
    // output: 500/1000 * 0.06 = 0.03
    // total: 0.06
    expect(cost).toBe('0.06')
  })

  it('應匹配 claude-3 前綴規則', () => {
    const cost = calculator.calculate('claude-3-opus', 2000, 1000)
    // input: 2000/1000 * 0.015 = 0.03
    // output: 1000/1000 * 0.075 = 0.075
    // total: 0.105
    expect(cost).toBe('0.105')
  })

  it('未知模型應匹配 fallback 規則', () => {
    const cost = calculator.calculate('unknown-model', 1000, 1000)
    // input: 1 * 0.01 = 0.01
    // output: 1 * 0.03 = 0.03
    // total: 0.04
    expect(cost).toBe('0.04')
  })

  it('無匹配規則應拋出錯誤', () => {
    const calc = new UsagePricingCalculator([
      PricingRule.create({
        id: 'r1', modelPattern: 'gpt-4*',
        inputTokenPrice: '0.03', outputTokenPrice: '0.06',
      }),
    ])
    expect(() => calc.calculate('claude-3-opus', 1000, 500)).toThrow('找不到匹配的定價規則')
  })
})
```

- [ ] **Step 3: 執行 test 確認 FAIL**

Run: `bun test src/Modules/UsageSync/__tests__/UsagePricingCalculator.test.ts`
Expected: FAIL

- [ ] **Step 4: 實作 UsagePricingCalculator**

```typescript
// src/Modules/UsageSync/Domain/Services/UsagePricingCalculator.ts
import type { PricingRule } from '../Entities/PricingRule'
import { Balance } from '@/Modules/Credit/Domain/ValueObjects/Balance'

export class UsagePricingCalculator {
  private readonly sortedRules: PricingRule[]

  constructor(rules: PricingRule[]) {
    this.sortedRules = [...rules]
      .filter((r) => r.isActive)
      .sort((a, b) => b.priority - a.priority)
  }

  calculate(model: string, inputTokens: number, outputTokens: number): string {
    const rule = this.sortedRules.find((r) => r.matchesModel(model))
    if (!rule) {
      throw new Error(`找不到匹配的定價規則: model=${model}`)
    }

    const inputCost = Balance.fromString(rule.inputTokenPrice)
      .toString()
    const outputCost = Balance.fromString(rule.outputTokenPrice)
      .toString()

    // cost = (inputTokens / 1000) * inputTokenPrice + (outputTokens / 1000) * outputTokenPrice
    const inputTotal = this.multiply(inputCost, inputTokens / 1000)
    const outputTotal = this.multiply(outputCost, outputTokens / 1000)

    return Balance.fromString(inputTotal).add(outputTotal).toString()
  }

  private multiply(price: string, factor: number): string {
    // 使用 bigint 精確計算
    const PRECISION = 10
    const SCALE = BigInt(10 ** PRECISION)
    const priceBig = Balance.fromString(price).toBigInt()
    const factorBig = BigInt(Math.round(factor * Number(SCALE)))
    const result = (priceBig * factorBig) / SCALE
    // 還原為字串
    const sign = result < 0n ? '-' : ''
    const abs = result < 0n ? -result : result
    const intPart = abs / SCALE
    const decPart = abs % SCALE
    if (decPart === 0n) return `${sign}${intPart}`
    const decStr = decPart.toString().padStart(PRECISION, '0').replace(/0+$/, '')
    return `${sign}${intPart}.${decStr}`
  }
}
```

- [ ] **Step 5: 執行 test 確認 PASS**

Run: `bun test src/Modules/UsageSync/__tests__/UsagePricingCalculator.test.ts`
Expected: PASS

- [ ] **Step 6: 實作 UsageRecord / SyncCursor Entities + Repositories（完整程式碼省略，遵循 CreditAccount/CreditTransaction 相同模式）**

UsageRecord Entity 欄位：`id`, `bifrostLogId`, `apiKeyId`, `orgId`, `model`, `inputTokens`, `outputTokens`, `creditCost`, `occurredAt`, `createdAt`

SyncCursor Entity 欄位：`id`, `cursorType`, `lastSyncedAt`, `lastBifrostLogId`, `updatedAt`

Repository 介面遵循已建立的模式：`findById`, `save`, `update`, `withTransaction`。
UsageRecordRepository 額外需要：`existsByBifrostLogId(id: string): Promise<boolean>`, `findByOrgId(orgId, limit, offset)`, `sumCreditCostByOrgId(orgId, startDate, endDate)`。

- [ ] **Step 7: 實作 UsageAnomalyDetected Event**

```typescript
// src/Modules/UsageSync/Domain/Events/UsageAnomalyDetected.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class UsageAnomalyDetected extends DomainEvent {
  constructor(orgId: string, currentUsage: string, previousUsage: string) {
    super(orgId, 'usage.anomaly_detected', { orgId, currentUsage, previousUsage })
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      data: this.data,
    }
  }
}
```

- [ ] **Step 8: 執行全部 UsageSync 測試**

Run: `bun test src/Modules/UsageSync/`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add src/Modules/UsageSync/Domain/ src/Modules/UsageSync/Infrastructure/Repositories/ src/Modules/UsageSync/__tests__/
git commit -m "feat: [p4] UsageSync 模組 Domain + Infrastructure Layer"
```

---

## Task 6: UsageSync 模組 — SyncBifrostUsageService + Horizon 排程

**Files:**
- Create: `src/Modules/UsageSync/Application/Services/SyncBifrostUsageService.ts`
- Create: `src/Modules/UsageSync/Application/Services/DetectUsageAnomalyService.ts`
- Create: `src/Modules/UsageSync/Application/Services/GetSyncStatusService.ts`
- Create: `src/Modules/UsageSync/Application/Services/ManagePricingRuleService.ts`
- Create: `src/Modules/UsageSync/Application/DTOs/UsageSyncDTO.ts`
- Create: `src/Modules/UsageSync/Infrastructure/Providers/UsageSyncServiceProvider.ts`
- Test: `src/Modules/UsageSync/__tests__/SyncBifrostUsageService.test.ts`

- [ ] **Step 1: 寫 SyncBifrostUsageService 的 failing test**

```typescript
// src/Modules/UsageSync/__tests__/SyncBifrostUsageService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { SyncBifrostUsageService } from '../Application/Services/SyncBifrostUsageService'
import { UsageRecordRepository } from '../Infrastructure/Repositories/UsageRecordRepository'
import { SyncCursorRepository } from '../Infrastructure/Repositories/SyncCursorRepository'
import { PricingRuleRepository } from '../Infrastructure/Repositories/PricingRuleRepository'
import { CreditAccountRepository } from '@/Modules/Credit/Infrastructure/Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '@/Modules/Credit/Infrastructure/Repositories/CreditTransactionRepository'
import { CreditDeductionService } from '@/Modules/Credit/Domain/Services/CreditDeductionService'
import { CreditAccount } from '@/Modules/Credit/Domain/Aggregates/CreditAccount'
import { PricingRule } from '../Domain/Entities/PricingRule'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { BifrostLogEntry } from '@/Foundation/Infrastructure/Services/BifrostClient/types'

const mockLogs: BifrostLogEntry[] = [
  {
    id: 'log-1', provider: 'openai', model: 'gpt-4-turbo',
    status: 'success', object: 'chat.completion', timestamp: '2026-04-09T00:00:00Z',
    latency: 500, cost: 0.05, virtual_key_id: 'vk-1',
    input_tokens: 1000, output_tokens: 500, total_tokens: 1500,
  },
]

describe('SyncBifrostUsageService', () => {
  let db: MemoryDatabaseAccess
  let service: SyncBifrostUsageService

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    const usageRepo = new UsageRecordRepository(db)
    const cursorRepo = new SyncCursorRepository(db)
    const pricingRepo = new PricingRuleRepository(db)
    const accountRepo = new CreditAccountRepository(db)
    const txRepo = new CreditTransactionRepository(db)
    const deductionService = new CreditDeductionService()

    const mockBifrost = {
      getLogs: vi.fn().mockResolvedValue({ logs: mockLogs }),
    } as unknown as BifrostClient

    // 建立測試 API Key 映射（在 api_keys 表中需有 vk-1 → org-1 的映射）
    await db.table('api_keys').insert({
      id: 'key-1', org_id: 'org-1', created_by_user_id: 'user-1',
      label: 'test', key_hash: 'hash', bifrost_virtual_key_id: 'vk-1',
      status: 'active', scope: '{}',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })

    // 建立 Credit 帳戶
    const account = CreditAccount.fromDatabase({
      id: 'acc-1', org_id: 'org-1', balance: '1000',
      low_balance_threshold: '100', status: 'active',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
    await accountRepo.save(account)

    // 建立定價規則
    const rule = PricingRule.create({
      id: 'r-1', modelPattern: 'gpt-4*',
      inputTokenPrice: '0.03', outputTokenPrice: '0.06',
    })
    await pricingRepo.save(rule)

    service = new SyncBifrostUsageService(
      mockBifrost, usageRepo, cursorRepo, pricingRepo,
      accountRepo, txRepo, deductionService, db,
    )
  })

  it('應同步 Bifrost logs 並建立 UsageRecord + 扣款', async () => {
    const result = await service.execute()
    expect(result.processedCount).toBe(1)
    expect(result.skippedCount).toBe(0)
  })

  it('重複 log 應被跳過（冪等）', async () => {
    await service.execute()
    const result = await service.execute()
    expect(result.processedCount).toBe(0)
    expect(result.skippedCount).toBe(1)
  })
})
```

- [ ] **Step 2: 執行 test 確認 FAIL**

Run: `bun test src/Modules/UsageSync/__tests__/SyncBifrostUsageService.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 SyncBifrostUsageService**

```typescript
// src/Modules/UsageSync/Application/Services/SyncBifrostUsageService.ts
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { IUsageRecordRepository } from '../../Domain/Repositories/IUsageRecordRepository'
import type { ISyncCursorRepository } from '../../Domain/Repositories/ISyncCursorRepository'
import type { IPricingRuleRepository } from '../../Domain/Repositories/IPricingRuleRepository'
import type { ICreditAccountRepository } from '@/Modules/Credit/Domain/Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '@/Modules/Credit/Domain/Repositories/ICreditTransactionRepository'
import type { CreditDeductionService } from '@/Modules/Credit/Domain/Services/CreditDeductionService'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { UsageRecord } from '../../Domain/Entities/UsageRecord'
import { SyncCursor } from '../../Domain/Entities/SyncCursor'
import { UsagePricingCalculator } from '../../Domain/Services/UsagePricingCalculator'

const OVERLAP_WINDOW_MS = 10 * 60 * 1000 // 10 分鐘

interface SyncResult {
  processedCount: number
  skippedCount: number
  quarantinedCount: number
  events: unknown[]
}

export class SyncBifrostUsageService {
  constructor(
    private readonly bifrostClient: BifrostClient,
    private readonly usageRecordRepo: IUsageRecordRepository,
    private readonly syncCursorRepo: ISyncCursorRepository,
    private readonly pricingRuleRepo: IPricingRuleRepository,
    private readonly creditAccountRepo: ICreditAccountRepository,
    private readonly creditTxRepo: ICreditTransactionRepository,
    private readonly creditDeductionService: CreditDeductionService,
    private readonly db: IDatabaseAccess,
  ) {}

  async execute(): Promise<SyncResult> {
    // 1. 取得 DB 層級的同步鎖（防止手動觸發與 cron 並行）
    const lockAcquired = await this.acquireSyncLock()
    if (!lockAcquired) {
      return { processedCount: 0, skippedCount: 0, quarantinedCount: 0, events: [] }
    }

    try {
      const cursor = await this.syncCursorRepo.findByType('bifrost_usage')
      const fetchFrom = cursor?.lastSyncedAt
        ? new Date(cursor.lastSyncedAt.getTime() - OVERLAP_WINDOW_MS).toISOString()
        : undefined

      const response = await this.bifrostClient.getLogs({
        start_time: fetchFrom,
        sort_by: 'timestamp',
        order: 'asc',
        limit: 500,
      })

      const allLogs = response.logs
      if (allLogs.length === 0) {
        return { processedCount: 0, skippedCount: 0, quarantinedCount: 0, events: [] }
      }

      // 載入定價規則（交易外，唯讀快取）
      const rules = await this.pricingRuleRepo.findAllActive()
      const calculator = new UsagePricingCalculator(rules)

      // 所有核心邏輯在單一 DB 交易內執行
      const allEvents: unknown[] = []
      let processedCount = 0
      let skippedCount = 0
      let quarantinedCount = 0

      await this.db.transaction(async (tx) => {
        const txUsageRepo = this.usageRecordRepo.withTransaction(tx)
        const txCursorRepo = this.syncCursorRepo.withTransaction(tx)
        const txAccountRepo = this.creditAccountRepo.withTransaction(tx)
        const txCreditTxRepo = this.creditTxRepo.withTransaction(tx)

        // 按 orgId 分組扣款
        const orgDeductions = new Map<string, string>()

        for (const log of allLogs) {
          // 交易內冪等檢查（防止並行 race condition）
          if (await txUsageRepo.existsByBifrostLogId(log.id)) {
            skippedCount++
            continue
          }

          // 查詢 apiKey → orgId 映射（必須存在，否則隔離）
          const apiKeyRow = await tx
            .table('api_keys')
            .where('bifrost_virtual_key_id', '=', log.virtual_key_id ?? '')
            .first()

          if (!apiKeyRow) {
            // 無法映射的 log 不寫入 usage_records，記錄到隔離表
            await tx.table('quarantined_logs').insert({
              id: crypto.randomUUID(),
              bifrost_log_id: log.id,
              reason: 'UNMAPPED_VIRTUAL_KEY',
              raw_data: JSON.stringify(log),
              created_at: new Date().toISOString(),
            })
            quarantinedCount++
            continue
          }

          const orgId = apiKeyRow.org_id as string
          const apiKeyId = apiKeyRow.id as string

          const creditCost = calculator.calculate(
            log.model,
            log.input_tokens ?? 0,
            log.output_tokens ?? 0,
          )

          const record = UsageRecord.create({
            id: crypto.randomUUID(),
            bifrostLogId: log.id,
            apiKeyId,
            orgId,
            model: log.model,
            inputTokens: log.input_tokens ?? 0,
            outputTokens: log.output_tokens ?? 0,
            creditCost,
            occurredAt: new Date(log.timestamp),
          })

          await txUsageRepo.save(record)
          processedCount++

          // 累計 orgId 扣款
          const current = orgDeductions.get(orgId) ?? '0'
          const { Balance } = await import('@/Modules/Credit/Domain/ValueObjects/Balance')
          orgDeductions.set(orgId, Balance.fromString(current).add(creditCost).toString())
        }

        // 執行扣款（必須全部成功，否則整個交易 rollback）
        for (const [orgId, totalAmount] of orgDeductions) {
          const result = await this.creditDeductionService.deduct({
            accountRepo: txAccountRepo,
            transactionRepo: txCreditTxRepo,
            orgId,
            amount: totalAmount,
            referenceType: 'usage_sync',
            referenceId: `sync-${new Date().toISOString()}`,
          })
          if (!result.success) {
            throw new Error(`扣款失敗: orgId=${orgId}, error=${result.error}`)
          }
          if (result.events.length > 0) {
            allEvents.push(...result.events)
          }
        }

        // 推進 cursor（只有全部成功才推進）
        if (processedCount > 0 || skippedCount > 0) {
          const lastLog = allLogs[allLogs.length - 1]
          const newCursor = cursor
            ? cursor.advance(new Date(lastLog.timestamp), lastLog.id)
            : SyncCursor.create('bifrost_usage', new Date(lastLog.timestamp), lastLog.id)

          if (cursor) {
            await txCursorRepo.update(newCursor)
          } else {
            await txCursorRepo.save(newCursor)
          }
        }
      })

      return { processedCount, skippedCount, quarantinedCount, events: allEvents }
    } finally {
      await this.releaseSyncLock()
    }
  }

  /**
   * DB 層級同步鎖 — 使用 sync_cursors 表的行鎖
   * 嘗試 INSERT 一個 lock row，若已存在且未過期則搶鎖失敗
   */
  private async acquireSyncLock(): Promise<boolean> {
    try {
      const existing = await this.db.table('sync_cursors')
        .where('cursor_type', '=', 'bifrost_usage_lock')
        .first()

      if (existing) {
        const lockedAt = new Date(existing.updated_at as string)
        const lockAge = Date.now() - lockedAt.getTime()
        // 鎖超過 5 分鐘視為過期（可能是 crash 殘留）
        if (lockAge < 5 * 60 * 1000) return false
      }

      // 搶鎖（upsert）
      if (existing) {
        await this.db.table('sync_cursors')
          .where('cursor_type', '=', 'bifrost_usage_lock')
          .update({ updated_at: new Date().toISOString() })
      } else {
        await this.db.table('sync_cursors').insert({
          id: crypto.randomUUID(),
          cursor_type: 'bifrost_usage_lock',
          updated_at: new Date().toISOString(),
        })
      }
      return true
    } catch {
      return false
    }
  }

  private async releaseSyncLock(): Promise<void> {
    await this.db.table('sync_cursors')
      .where('cursor_type', '=', 'bifrost_usage_lock')
      .delete()
  }
}
```

- [ ] **Step 4: 執行 test 確認 PASS**

Run: `bun test src/Modules/UsageSync/__tests__/SyncBifrostUsageService.test.ts`
Expected: PASS

- [ ] **Step 5: 實作 UsageSyncServiceProvider（含 Horizon 排程）**

```typescript
// src/Modules/UsageSync/Infrastructure/Providers/UsageSyncServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { UsageRecordRepository } from '../Repositories/UsageRecordRepository'
import { SyncCursorRepository } from '../Repositories/SyncCursorRepository'
import { PricingRuleRepository } from '../Repositories/PricingRuleRepository'
import { SyncBifrostUsageService } from '../../Application/Services/SyncBifrostUsageService'
import { DetectUsageAnomalyService } from '../../Application/Services/DetectUsageAnomalyService'
import { GetSyncStatusService } from '../../Application/Services/GetSyncStatusService'
import { ManagePricingRuleService } from '../../Application/Services/ManagePricingRuleService'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { CreditDeductionService } from '@/Modules/Credit/Domain/Services/CreditDeductionService'
import type { CreditAccountRepository } from '@/Modules/Credit/Infrastructure/Repositories/CreditAccountRepository'
import type { CreditTransactionRepository } from '@/Modules/Credit/Infrastructure/Repositories/CreditTransactionRepository'

export class UsageSyncServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('usageRecordRepository', () => new UsageRecordRepository(db))
    container.singleton('syncCursorRepository', () => new SyncCursorRepository(db))
    container.singleton('pricingRuleRepository', () => new PricingRuleRepository(db))

    container.bind('syncBifrostUsageService', (c: IContainer) => {
      return new SyncBifrostUsageService(
        c.make('bifrostClient') as BifrostClient,
        c.make('usageRecordRepository') as UsageRecordRepository,
        c.make('syncCursorRepository') as SyncCursorRepository,
        c.make('pricingRuleRepository') as PricingRuleRepository,
        c.make('creditAccountRepository') as CreditAccountRepository,
        c.make('creditTransactionRepository') as CreditTransactionRepository,
        c.make('creditDeductionService') as CreditDeductionService,
        db,
      )
    })

    container.bind('detectUsageAnomalyService', (c: IContainer) => {
      return new DetectUsageAnomalyService(c.make('usageRecordRepository') as UsageRecordRepository)
    })

    container.bind('getSyncStatusService', (c: IContainer) => {
      return new GetSyncStatusService(c.make('syncCursorRepository') as SyncCursorRepository)
    })

    container.bind('managePricingRuleService', (c: IContainer) => {
      return new ManagePricingRuleService(c.make('pricingRuleRepository') as PricingRuleRepository)
    })
  }

  override boot(context: any): void {
    console.log('📊 [UsageSync] Module loaded')

    // Horizon 排程（如果 schedule 服務可用）
    try {
      const schedule = context?.make?.('schedule')
      if (schedule) {
        schedule.add({
          name: 'sync-bifrost-usage',
          cron: '*/5 * * * *',
          preventOverlapping: true,
          timeout: 120_000,
          retries: 2,
          handler: async () => {
            const syncService = context.make('syncBifrostUsageService') as SyncBifrostUsageService
            await syncService.execute()
          },
          onError: async (error: unknown) => {
            console.error('UsageSync failed:', error)
          },
        })
      }
    } catch {
      console.warn('⚠️ [UsageSync] Horizon schedule not available, skipping cron setup')
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/Modules/UsageSync/
git commit -m "feat: [p4] UsageSync 模組 — 同步服務 + Horizon 排程"
```

---

## Task 7: UsageSync Presentation Layer + PricingRule 管理 API

**Files:**
- Create: `src/Modules/UsageSync/Presentation/Controllers/UsageSyncController.ts`
- Create: `src/Modules/UsageSync/Presentation/Controllers/PricingRuleController.ts`
- Create: `src/Modules/UsageSync/Presentation/Routes/usagesync.routes.ts`
- Create: `src/Modules/UsageSync/Presentation/Validators/pricingrule.validator.ts`
- Create: `src/Modules/UsageSync/index.ts`

- [ ] **Step 1: 建立 PricingRule Validator**

```typescript
// src/Modules/UsageSync/Presentation/Validators/pricingrule.validator.ts
import { z } from 'zod'

export const CreatePricingRuleSchema = z.object({
  modelPattern: z.string().min(1, '模型匹配模式為必填'),
  inputTokenPrice: z.string().refine(
    (val) => { const n = parseFloat(val); return !isNaN(n) && n >= 0 },
    { message: '輸入 token 單價必須為非負數' },
  ),
  outputTokenPrice: z.string().refine(
    (val) => { const n = parseFloat(val); return !isNaN(n) && n >= 0 },
    { message: '輸出 token 單價必須為非負數' },
  ),
  imagePrice: z.string().optional(),
  audioPrice: z.string().optional(),
  priority: z.number().int().optional(),
})

export type CreatePricingRuleParams = z.infer<typeof CreatePricingRuleSchema>
```

- [ ] **Step 2: 建立 Controllers（遵循 ApiKeyController 模式）**

UsageSyncController：`getSyncStatus`, `triggerSync` 方法。
PricingRuleController：`list`, `create`, `update`, `remove` 方法。
全部使用 `AuthMiddleware.getAuthContext(ctx)` 取得認證，admin 權限檢查。

- [ ] **Step 3: 建立 Routes**

```typescript
// src/Modules/UsageSync/Presentation/Routes/usagesync.routes.ts
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { UsageSyncController } from '../Controllers/UsageSyncController'
import type { PricingRuleController } from '../Controllers/PricingRuleController'
import { requireAuth, createRoleMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'

export function registerUsageSyncRoutes(
  router: IModuleRouter,
  syncController: UsageSyncController,
  pricingController: PricingRuleController,
): void {
  router.get('/api/usage-sync/status', [requireAuth(), createRoleMiddleware('admin')], (ctx) => syncController.getSyncStatus(ctx))
  router.post('/api/usage-sync/trigger', [requireAuth(), createRoleMiddleware('admin')], (ctx) => syncController.triggerSync(ctx))
  router.get('/api/organizations/:orgId/usage/records', [requireAuth()], (ctx) => syncController.getUsageRecords(ctx))

  router.get('/api/pricing-rules', [requireAuth(), createRoleMiddleware('admin')], (ctx) => pricingController.list(ctx))
  router.post('/api/pricing-rules', [requireAuth(), createRoleMiddleware('admin')], (ctx) => pricingController.create(ctx))
  router.put('/api/pricing-rules/:ruleId', [requireAuth(), createRoleMiddleware('admin')], (ctx) => pricingController.update(ctx))
  router.delete('/api/pricing-rules/:ruleId', [requireAuth(), createRoleMiddleware('admin')], (ctx) => pricingController.remove(ctx))
}
```

- [ ] **Step 4: 建立 index.ts**

```typescript
// src/Modules/UsageSync/index.ts
export { UsageSyncController } from './Presentation/Controllers/UsageSyncController'
export { PricingRuleController } from './Presentation/Controllers/PricingRuleController'
export { registerUsageSyncRoutes } from './Presentation/Routes/usagesync.routes'
```

- [ ] **Step 5: Commit**

```bash
git add src/Modules/UsageSync/Presentation/ src/Modules/UsageSync/index.ts
git commit -m "feat: [p4] UsageSync Presentation Layer + PricingRule 管理 API"
```

---

## Task 8: Wiring — 註冊模組到 Bootstrap + Routes

**Files:**
- Modify: `src/bootstrap.ts`
- Modify: `src/routes.ts`
- Modify: `src/wiring/index.ts`

- [ ] **Step 1: 更新 bootstrap.ts — 註冊 ServiceProvider**

在 `import` 區新增：

```typescript
import { CreditServiceProvider } from './Modules/Credit/Infrastructure/Providers/CreditServiceProvider'
import { UsageSyncServiceProvider } from './Modules/UsageSync/Infrastructure/Providers/UsageSyncServiceProvider'
```

在 `core.register(...)` 區段新增（在 DashboardServiceProvider 之前）：

```typescript
core.register(createGravitoServiceProvider(new CreditServiceProvider()))
core.register(createGravitoServiceProvider(new UsageSyncServiceProvider()))
```

- [ ] **Step 2: 更新 wiring/index.ts — 新增 registerCredit + registerUsageSync**

```typescript
import { CreditController, registerCreditRoutes } from '@/Modules/Credit'

export const registerCredit = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const controller = new CreditController(
    core.container.make('topUpCreditService') as any,
    core.container.make('getBalanceService') as any,
    core.container.make('getTransactionHistoryService') as any,
  )
  registerCreditRoutes(router, controller)
}

import { UsageSyncController, PricingRuleController, registerUsageSyncRoutes } from '@/Modules/UsageSync'

export const registerUsageSync = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const syncController = new UsageSyncController(
    core.container.make('getSyncStatusService') as any,
    core.container.make('syncBifrostUsageService') as any,
    core.container.make('usageRecordRepository') as any,
    core.container.make('orgAuthorizationHelper') as any,
  )
  const pricingController = new PricingRuleController(
    core.container.make('managePricingRuleService') as any,
  )
  registerUsageSyncRoutes(router, syncController, pricingController)
}
```

- [ ] **Step 3: 更新 routes.ts — 呼叫 registerCredit + registerUsageSync**

在 import 新增 `registerCredit, registerUsageSync`，在 `registerRoutes` 函數中呼叫：

```typescript
registerCredit(core)
registerUsageSync(core)
```

- [ ] **Step 4: 執行 typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/bootstrap.ts src/routes.ts src/wiring/index.ts
git commit -m "feat: [p4] Wiring — 註冊 Credit + UsageSync 模組到 Bootstrap"
```

---

## Task 9: Dashboard 費用補完

**Files:**
- Modify: `src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts`
- Modify: `src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts`
- Modify: `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts`
- Create: `src/Modules/Dashboard/Application/Services/GetCostSummaryService.ts`
- Modify: `src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts`
- Modify: `src/Modules/Dashboard/Presentation/Routes/dashboard.routes.ts`

- [ ] **Step 1: 更新 DashboardDTO — 新增費用欄位**

在 `DashboardSummaryResponse` 的 `data` 新增：

```typescript
creditBalance?: string
```

新增 DTO：

```typescript
export interface CostSummaryResponse {
  success: boolean
  message: string
  data?: {
    currentPeriodNet: string
    previousPeriodNet: string
    trend: 'up' | 'down' | 'flat'
    breakdown: {
      deductions: string
      refunds: string
      adjustments: string
    }
  }
  error?: string
}
```

- [ ] **Step 2: 建立 GetCostSummaryService**

查詢 CreditTransaction 全類型帳本，計算淨消耗：deductions - refunds - adjustments。比較本期與上期趨勢。

- [ ] **Step 3: 更新 GetDashboardSummaryService — 注入 Credit 餘額**

注入 `ICreditAccountRepository`，在 execute 中查詢餘額並加入回應。

- [ ] **Step 4: 新增 `/dashboard/cost` 路由**

- [ ] **Step 5: 更新 DashboardServiceProvider 註冊新依賴**

- [ ] **Step 6: 執行 Dashboard 測試**

Run: `bun test src/Modules/Dashboard/`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add src/Modules/Dashboard/
git commit -m "feat: [p4] Dashboard 費用補完 — Credit 餘額 + Cost Summary API"
```

---

## Task 10: 整合測試 + 最終驗證

**Files:**
- Test: `src/Modules/Credit/__tests__/CreditFlow.integration.test.ts`
- Test: `src/Modules/UsageSync/__tests__/UsageSyncFlow.integration.test.ts`

- [ ] **Step 1: 寫 Credit 整合測試**

完整測試充值 → 扣款 → 餘額查詢 → 交易歷史的流程。

- [ ] **Step 2: 寫 UsageSync 整合測試**

測試 Bifrost log 同步 → UsageRecord 寫入 → Credit 扣款 → 重複 log 冪等跳過的端到端流程。

- [ ] **Step 3: 執行全部測試**

Run: `bun test`
Expected: ALL PASS

- [ ] **Step 4: 執行 typecheck + lint**

Run: `bun run check`
Expected: PASS

- [ ] **Step 5: 執行 migration 確認**

Run: `bun migrate:fresh && bun test`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/Modules/Credit/__tests__/ src/Modules/UsageSync/__tests__/
git commit -m "test: [p4] Credit + UsageSync 整合測試"
```

---

## 依賴順序總結

```
Task 1 (Migrations) → Task 2 (Credit Domain) → Task 3 (Credit App/Presentation)
                                                      ↓
Task 4 (ApiKey 擴充) ← Task 2 ─────────────→ Task 5 (UsageSync Domain)
                                                      ↓
                                              Task 6 (UsageSync Service + Horizon)
                                                      ↓
                                              Task 7 (UsageSync Presentation)
                                                      ↓
Task 8 (Wiring) ← Task 3 + Task 7
                                                      ↓
Task 9 (Dashboard 補完) ← Task 2 + Task 5
                                                      ↓
Task 10 (整合測試) ← All
```
