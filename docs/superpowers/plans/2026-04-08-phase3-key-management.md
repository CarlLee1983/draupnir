# Phase 3: Key Management — API Key 管理 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 使用者透過 Draupnir 管理 API Key，每個 Key 對應一個 Bifrost Virtual Key，加上 Dashboard 用量聚合 API。

**Architecture:** 兩個新模組 — ApiKey（核心 CRUD + Bifrost 同步）和 Dashboard（用量聚合查詢）。ApiKey 模組遵循既有的 DDD 分層（Domain → Application → Infrastructure → Presentation），透過 BifrostClient 與 Bifrost Gateway 同步 Virtual Key。Dashboard 模組為唯讀聚合層，從 Bifrost 拉取用量 log 並組合本地 Key 統計。所有端點皆透過 `OrgAuthorizationHelper` 驗證呼叫者的組織成員資格，防止跨租戶存取。Key 生命週期採用 `pending → active` 狀態機搭配補償交易，確保 Bifrost 與本地資料庫不會出現不一致。

**Tech Stack:** Bun + TypeScript, Gravito DDD, Drizzle ORM (SQLite), BifrostClient, Vitest, uuid

---

## File Structure

### ApiKey 模組

```
src/Modules/ApiKey/
├── Domain/
│   ├── Aggregates/ApiKey.ts              — ApiKey 聚合根（核心不變性約束）
│   ├── ValueObjects/
│   │   ├── KeyHash.ts                    — API Key hash（SHA-256）
│   │   ├── KeyLabel.ts                   — Key 標籤（1-100 字元）
│   │   ├── KeyStatus.ts                  — Key 狀態（active/revoked）
│   │   └── KeyScope.ts                   — Key 權限範圍（模型白名單 + 速率限制）
│   └── Repositories/
│       └── IApiKeyRepository.ts          — Repository Port 介面
├── Application/
│   ├── DTOs/ApiKeyDTO.ts                 — 請求/回應 DTO
│   └── Services/
│       ├── CreateApiKeyService.ts        — 建立 Key + 同步 Bifrost
│       ├── ListApiKeysService.ts         — 列出 Org 下的 Keys
│       ├── RevokeApiKeyService.ts        — 撤銷 Key + 同步 Bifrost
│       ├── UpdateKeyLabelService.ts      — 更新 Key 標籤
│       └── SetKeyPermissionsService.ts   — 設定 Key 權限 + 同步 Bifrost
├── Infrastructure/
│   ├── Providers/ApiKeyServiceProvider.ts — DI 容器註冊
│   ├── Repositories/ApiKeyRepository.ts   — IDatabaseAccess 實作
│   └── Services/ApiKeyBifrostSync.ts      — Bifrost 同步邏輯封裝
├── Presentation/
│   ├── Controllers/ApiKeyController.ts    — HTTP 控制器
│   └── Routes/apikey.routes.ts            — 路由定義
├── __tests__/
│   ├── ApiKey.test.ts                     — 聚合根單元測試
│   ├── KeyHash.test.ts                    — Value Object 測試
│   ├── KeyLabel.test.ts                   — Value Object 測試
│   ├── KeyScope.test.ts                   — Value Object 測試
│   ├── CreateApiKeyService.test.ts        — 建立 Key 服務測試
│   ├── RevokeApiKeyService.test.ts        — 撤銷 Key 服務測試
│   ├── SetKeyPermissionsService.test.ts   — 權限設定服務測試
│   └── ApiKeyBifrostSync.test.ts          — Bifrost 同步測試
└── index.ts                               — 模組公開 API
```

### Dashboard 模組

```
src/Modules/Dashboard/
├── Application/
│   ├── DTOs/DashboardDTO.ts               — Dashboard 請求/回應 DTO
│   └── Services/
│       ├── GetDashboardSummaryService.ts  — Dashboard 主頁摘要
│       └── GetUsageChartService.ts        — 用量時序資料
├── Infrastructure/
│   ├── Providers/DashboardServiceProvider.ts — DI 容器註冊
│   └── Services/UsageAggregator.ts          — Bifrost 用量資料聚合
├── Presentation/
│   ├── Controllers/DashboardController.ts   — HTTP 控制器
│   └── Routes/dashboard.routes.ts           — 路由定義
├── __tests__/
│   ├── GetDashboardSummaryService.test.ts  — 摘要服務測試
│   ├── GetUsageChartService.test.ts        — 用量圖表服務測試
│   └── UsageAggregator.test.ts             — 聚合器測試
└── index.ts                                — 模組公開 API
```

### 共用變更

```
database/migrations/2026_04_08_000004_create_api_keys_table.ts  — Migration
src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts   — 新增 apiKeys 表
src/bootstrap.ts                                                 — 註冊新 ServiceProvider
src/routes.ts                                                    — 註冊新路由
src/wiring/index.ts                                              — 新增 registerApiKey / registerDashboard
```

---

## Task 1: ApiKey Value Objects

**Files:**
- Create: `src/Modules/ApiKey/Domain/ValueObjects/KeyHash.ts`
- Create: `src/Modules/ApiKey/Domain/ValueObjects/KeyLabel.ts`
- Create: `src/Modules/ApiKey/Domain/ValueObjects/KeyStatus.ts`
- Create: `src/Modules/ApiKey/Domain/ValueObjects/KeyScope.ts`
- Create: `src/Modules/ApiKey/__tests__/KeyHash.test.ts`
- Create: `src/Modules/ApiKey/__tests__/KeyLabel.test.ts`
- Create: `src/Modules/ApiKey/__tests__/KeyScope.test.ts`

### Step 1: Write KeyHash tests

- [ ] Create `src/Modules/ApiKey/__tests__/KeyHash.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { KeyHash } from '../Domain/ValueObjects/KeyHash'

describe('KeyHash', () => {
  it('應從原始 key 產生 SHA-256 hash', async () => {
    const result = await KeyHash.fromRawKey('drp_sk_test123')
    expect(result.getValue()).toMatch(/^[a-f0-9]{64}$/)
  })

  it('相同 key 應產生相同 hash', async () => {
    const h1 = await KeyHash.fromRawKey('drp_sk_abc')
    const h2 = await KeyHash.fromRawKey('drp_sk_abc')
    expect(h1.getValue()).toBe(h2.getValue())
  })

  it('不同 key 應產生不同 hash', async () => {
    const h1 = await KeyHash.fromRawKey('drp_sk_abc')
    const h2 = await KeyHash.fromRawKey('drp_sk_xyz')
    expect(h1.getValue()).not.toBe(h2.getValue())
  })

  it('應從已有 hash 重建', () => {
    const hash = 'a'.repeat(64)
    const kh = KeyHash.fromExisting(hash)
    expect(kh.getValue()).toBe(hash)
  })

  it('matches 應正確比對', async () => {
    const kh = await KeyHash.fromRawKey('drp_sk_test')
    expect(await kh.matches('drp_sk_test')).toBe(true)
    expect(await kh.matches('drp_sk_wrong')).toBe(false)
  })
})
```

### Step 2: Run test to verify it fails

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/KeyHash.test.ts`
- Expected: FAIL — module not found

### Step 3: Implement KeyHash

- [ ] Create `src/Modules/ApiKey/Domain/ValueObjects/KeyHash.ts`:

```typescript
export class KeyHash {
  private constructor(private readonly hash: string) {}

  static async fromRawKey(rawKey: string): Promise<KeyHash> {
    const encoder = new TextEncoder()
    const data = encoder.encode(rawKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return new KeyHash(hashHex)
  }

  static fromExisting(hash: string): KeyHash {
    return new KeyHash(hash)
  }

  async matches(rawKey: string): Promise<boolean> {
    const other = await KeyHash.fromRawKey(rawKey)
    return this.hash === other.getValue()
  }

  getValue(): string {
    return this.hash
  }
}
```

### Step 4: Run test to verify it passes

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/KeyHash.test.ts`
- Expected: PASS

### Step 5: Write KeyLabel tests

- [ ] Create `src/Modules/ApiKey/__tests__/KeyLabel.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { KeyLabel } from '../Domain/ValueObjects/KeyLabel'

describe('KeyLabel', () => {
  it('應接受合法標籤', () => {
    const label = new KeyLabel('My API Key')
    expect(label.getValue()).toBe('My API Key')
  })

  it('空字串應拋錯', () => {
    expect(() => new KeyLabel('')).toThrow()
  })

  it('僅空白應拋錯', () => {
    expect(() => new KeyLabel('   ')).toThrow()
  })

  it('超過 100 字元應拋錯', () => {
    expect(() => new KeyLabel('a'.repeat(101))).toThrow()
  })

  it('100 字元剛好應通過', () => {
    const label = new KeyLabel('a'.repeat(100))
    expect(label.getValue()).toBe('a'.repeat(100))
  })

  it('應 trim 前後空白', () => {
    const label = new KeyLabel('  My Key  ')
    expect(label.getValue()).toBe('My Key')
  })
})
```

### Step 6: Run test to verify it fails

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/KeyLabel.test.ts`
- Expected: FAIL

### Step 7: Implement KeyLabel

- [ ] Create `src/Modules/ApiKey/Domain/ValueObjects/KeyLabel.ts`:

```typescript
export class KeyLabel {
  private readonly value: string

  constructor(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) {
      throw new Error('Key label 不能為空')
    }
    if (trimmed.length > 100) {
      throw new Error('Key label 不能超過 100 字元')
    }
    this.value = trimmed
  }

  getValue(): string {
    return this.value
  }
}
```

### Step 8: Run test to verify it passes

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/KeyLabel.test.ts`
- Expected: PASS

### Step 9: Implement KeyStatus

- [ ] Create `src/Modules/ApiKey/Domain/ValueObjects/KeyStatus.ts`:

```typescript
export const KeyStatusValues = ['pending', 'active', 'revoked'] as const
export type KeyStatusType = typeof KeyStatusValues[number]

export class KeyStatus {
  private constructor(private readonly value: KeyStatusType) {}

  static pending(): KeyStatus {
    return new KeyStatus('pending')
  }

  static active(): KeyStatus {
    return new KeyStatus('active')
  }

  static revoked(): KeyStatus {
    return new KeyStatus('revoked')
  }

  static from(value: string): KeyStatus {
    if (!KeyStatusValues.includes(value as KeyStatusType)) {
      throw new Error(`無效的 Key 狀態: ${value}`)
    }
    return new KeyStatus(value as KeyStatusType)
  }

  isPending(): boolean {
    return this.value === 'pending'
  }

  isActive(): boolean {
    return this.value === 'active'
  }

  isRevoked(): boolean {
    return this.value === 'revoked'
  }

  getValue(): KeyStatusType {
    return this.value
  }
}
```

### Step 10: Write KeyScope tests

- [ ] Create `src/Modules/ApiKey/__tests__/KeyScope.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { KeyScope } from '../Domain/ValueObjects/KeyScope'

describe('KeyScope', () => {
  it('應建立預設 scope（無限制）', () => {
    const scope = KeyScope.unrestricted()
    expect(scope.getAllowedModels()).toBeNull()
    expect(scope.getRateLimitRpm()).toBeNull()
    expect(scope.getRateLimitTpm()).toBeNull()
  })

  it('應建立有模型白名單的 scope', () => {
    const scope = KeyScope.create({ allowedModels: ['gpt-4', 'claude-3'] })
    expect(scope.getAllowedModels()).toEqual(['gpt-4', 'claude-3'])
  })

  it('應建立有速率限制的 scope', () => {
    const scope = KeyScope.create({ rateLimitRpm: 100, rateLimitTpm: 50000 })
    expect(scope.getRateLimitRpm()).toBe(100)
    expect(scope.getRateLimitTpm()).toBe(50000)
  })

  it('空模型列表應視為無限制', () => {
    const scope = KeyScope.create({ allowedModels: [] })
    expect(scope.getAllowedModels()).toBeNull()
  })

  it('RPM 負值應拋錯', () => {
    expect(() => KeyScope.create({ rateLimitRpm: -1 })).toThrow()
  })

  it('TPM 負值應拋錯', () => {
    expect(() => KeyScope.create({ rateLimitTpm: -1 })).toThrow()
  })

  it('應正確序列化為 JSON', () => {
    const scope = KeyScope.create({ allowedModels: ['gpt-4'], rateLimitRpm: 60 })
    const json = scope.toJSON()
    expect(json.allowed_models).toEqual(['gpt-4'])
    expect(json.rate_limit_rpm).toBe(60)
  })

  it('應從 JSON 反序列化', () => {
    const scope = KeyScope.fromJSON({ allowed_models: ['gpt-4'], rate_limit_rpm: 60, rate_limit_tpm: null })
    expect(scope.getAllowedModels()).toEqual(['gpt-4'])
    expect(scope.getRateLimitRpm()).toBe(60)
  })
})
```

### Step 11: Run test to verify it fails

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/KeyScope.test.ts`
- Expected: FAIL

### Step 12: Implement KeyScope

- [ ] Create `src/Modules/ApiKey/Domain/ValueObjects/KeyScope.ts`:

```typescript
export interface KeyScopeProps {
  allowedModels?: readonly string[] | null
  rateLimitRpm?: number | null
  rateLimitTpm?: number | null
}

export interface KeyScopeJSON {
  allowed_models: readonly string[] | null
  rate_limit_rpm: number | null
  rate_limit_tpm: number | null
}

export class KeyScope {
  private constructor(
    private readonly allowedModels: readonly string[] | null,
    private readonly rateLimitRpm: number | null,
    private readonly rateLimitTpm: number | null,
  ) {}

  static unrestricted(): KeyScope {
    return new KeyScope(null, null, null)
  }

  static create(props: KeyScopeProps): KeyScope {
    const models = props.allowedModels && props.allowedModels.length > 0
      ? props.allowedModels
      : null

    if (props.rateLimitRpm != null && props.rateLimitRpm < 0) {
      throw new Error('RPM 限制不能為負數')
    }
    if (props.rateLimitTpm != null && props.rateLimitTpm < 0) {
      throw new Error('TPM 限制不能為負數')
    }

    return new KeyScope(
      models,
      props.rateLimitRpm ?? null,
      props.rateLimitTpm ?? null,
    )
  }

  static fromJSON(json: KeyScopeJSON): KeyScope {
    return new KeyScope(
      json.allowed_models,
      json.rate_limit_rpm,
      json.rate_limit_tpm,
    )
  }

  getAllowedModels(): readonly string[] | null {
    return this.allowedModels
  }

  getRateLimitRpm(): number | null {
    return this.rateLimitRpm
  }

  getRateLimitTpm(): number | null {
    return this.rateLimitTpm
  }

  toJSON(): KeyScopeJSON {
    return {
      allowed_models: this.allowedModels,
      rate_limit_rpm: this.rateLimitRpm,
      rate_limit_tpm: this.rateLimitTpm,
    }
  }
}
```

### Step 13: Run all Value Object tests

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/KeyHash.test.ts src/Modules/ApiKey/__tests__/KeyLabel.test.ts src/Modules/ApiKey/__tests__/KeyScope.test.ts`
- Expected: ALL PASS

### Step 14: Commit

- [ ] ```bash
git add src/Modules/ApiKey/Domain/ValueObjects/ src/Modules/ApiKey/__tests__/KeyHash.test.ts src/Modules/ApiKey/__tests__/KeyLabel.test.ts src/Modules/ApiKey/__tests__/KeyScope.test.ts
git commit -m "feat: [apikey] 新增 KeyHash、KeyLabel、KeyStatus、KeyScope Value Objects"
```

---

## Task 2: ApiKey 聚合根 + Repository Port

**Files:**
- Create: `src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts`
- Create: `src/Modules/ApiKey/Domain/Repositories/IApiKeyRepository.ts`
- Create: `src/Modules/ApiKey/__tests__/ApiKey.test.ts`

### Step 1: Write ApiKey aggregate tests

- [ ] Create `src/Modules/ApiKey/__tests__/ApiKey.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import { KeyScope } from '../Domain/ValueObjects/KeyScope'

describe('ApiKey', () => {
  it('應建立新的 ApiKey（初始為 pending 狀態）', async () => {
    const result = await ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'My Test Key',
      bifrostVirtualKeyId: 'bfr-vk-1',
      rawKey: 'drp_sk_test123',
    })
    expect(result.id).toBe('key-1')
    expect(result.orgId).toBe('org-1')
    expect(result.createdByUserId).toBe('user-1')
    expect(result.label).toBe('My Test Key')
    expect(result.bifrostVirtualKeyId).toBe('bfr-vk-1')
    expect(result.status).toBe('pending')
    expect(result.keyHashValue).toMatch(/^[a-f0-9]{64}$/)
    expect(result.scope.getAllowedModels()).toBeNull()
  })

  it('activate 應將 pending 轉為 active', async () => {
    const key = await ApiKey.create({
      id: 'key-1a',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Pending Key',
      bifrostVirtualKeyId: 'bfr-vk-1a',
      rawKey: 'drp_sk_pending',
    })
    expect(key.status).toBe('pending')
    const activated = key.activate()
    expect(activated.status).toBe('active')
  })

  it('已 active 的 key 不能再 activate', async () => {
    const key = await ApiKey.create({
      id: 'key-1b',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Active Key',
      bifrostVirtualKeyId: 'bfr-vk-1b',
      rawKey: 'drp_sk_act',
    })
    const activated = key.activate()
    expect(() => activated.activate()).toThrow()
  })

  it('應建立帶 scope 的 ApiKey', async () => {
    const result = await ApiKey.create({
      id: 'key-2',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Restricted Key',
      bifrostVirtualKeyId: 'bfr-vk-2',
      rawKey: 'drp_sk_restricted',
      scope: KeyScope.create({ allowedModels: ['gpt-4'], rateLimitRpm: 60 }),
    })
    expect(result.scope.getAllowedModels()).toEqual(['gpt-4'])
    expect(result.scope.getRateLimitRpm()).toBe(60)
  })

  it('撤銷後狀態應為 revoked', async () => {
    const key = await ApiKey.create({
      id: 'key-3',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'To Revoke',
      bifrostVirtualKeyId: 'bfr-vk-3',
      rawKey: 'drp_sk_revoke',
    })
    const active = key.activate()
    const revoked = active.revoke()
    expect(revoked.status).toBe('revoked')
    expect(revoked.revokedAt).toBeInstanceOf(Date)
  })

  it('已撤銷的 key 不能再撤銷', async () => {
    const key = await ApiKey.create({
      id: 'key-4',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Already Revoked',
      bifrostVirtualKeyId: 'bfr-vk-4',
      rawKey: 'drp_sk_already',
    })
    const revoked = key.activate().revoke()
    expect(() => revoked.revoke()).toThrow('已撤銷')
  })

  it('pending 狀態的 key 不能撤銷（需先 activate）', async () => {
    const key = await ApiKey.create({
      id: 'key-4b',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Pending No Revoke',
      bifrostVirtualKeyId: 'bfr-vk-4b',
      rawKey: 'drp_sk_pnr',
    })
    expect(() => key.revoke()).toThrow('pending')
  })

  it('應更新 label', async () => {
    const key = await ApiKey.create({
      id: 'key-5',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Old Label',
      bifrostVirtualKeyId: 'bfr-vk-5',
      rawKey: 'drp_sk_label',
    })
    const updated = key.updateLabel('New Label')
    expect(updated.label).toBe('New Label')
  })

  it('應更新 scope', async () => {
    const key = await ApiKey.create({
      id: 'key-6',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Scope Test',
      bifrostVirtualKeyId: 'bfr-vk-6',
      rawKey: 'drp_sk_scope',
    })
    const newScope = KeyScope.create({ rateLimitRpm: 120 })
    const updated = key.updateScope(newScope)
    expect(updated.scope.getRateLimitRpm()).toBe(120)
  })

  it('已撤銷的 key 不能更新 scope', async () => {
    const key = await ApiKey.create({
      id: 'key-7',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Revoked Scope',
      bifrostVirtualKeyId: 'bfr-vk-7',
      rawKey: 'drp_sk_rs',
    })
    const revoked = key.revoke()
    expect(() => revoked.updateScope(KeyScope.unrestricted())).toThrow('已撤銷')
  })

  it('toDatabaseRow 應正確轉換', async () => {
    const key = await ApiKey.create({
      id: 'key-8',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'DB Test',
      bifrostVirtualKeyId: 'bfr-vk-8',
      rawKey: 'drp_sk_db',
    })
    const row = key.toDatabaseRow()
    expect(row.id).toBe('key-8')
    expect(row.org_id).toBe('org-1')
    expect(row.created_by_user_id).toBe('user-1')
    expect(row.label).toBe('DB Test')
    expect(row.key_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(row.bifrost_virtual_key_id).toBe('bfr-vk-8')
    expect(row.status).toBe('pending')
    expect(row.scope).toBeTruthy()
  })

  it('fromDatabase 應正確重建', async () => {
    const key = await ApiKey.create({
      id: 'key-9',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Rebuild',
      bifrostVirtualKeyId: 'bfr-vk-9',
      rawKey: 'drp_sk_rebuild',
    })
    const row = key.toDatabaseRow()
    const rebuilt = ApiKey.fromDatabase(row)
    expect(rebuilt.id).toBe('key-9')
    expect(rebuilt.label).toBe('Rebuild')
    expect(rebuilt.status).toBe('active')
  })
})
```

### Step 2: Run test to verify it fails

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/ApiKey.test.ts`
- Expected: FAIL

### Step 3: Implement ApiKey aggregate

- [ ] Create `src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts`:

```typescript
import { KeyHash } from '../ValueObjects/KeyHash'
import { KeyLabel } from '../ValueObjects/KeyLabel'
import { KeyStatus } from '../ValueObjects/KeyStatus'
import { KeyScope, type KeyScopeJSON } from '../ValueObjects/KeyScope'

interface ApiKeyProps {
  readonly id: string
  readonly orgId: string
  readonly createdByUserId: string
  readonly label: KeyLabel
  readonly keyHash: KeyHash
  readonly bifrostVirtualKeyId: string
  readonly status: KeyStatus
  readonly scope: KeyScope
  readonly expiresAt: Date | null
  readonly revokedAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

interface CreateApiKeyParams {
  id: string
  orgId: string
  createdByUserId: string
  label: string
  bifrostVirtualKeyId: string
  rawKey: string
  scope?: KeyScope
  expiresAt?: Date | null
}

export class ApiKey {
  private readonly props: ApiKeyProps

  private constructor(props: ApiKeyProps) {
    this.props = props
  }

  static async create(params: CreateApiKeyParams): Promise<ApiKey> {
    const keyHash = await KeyHash.fromRawKey(params.rawKey)
    return new ApiKey({
      id: params.id,
      orgId: params.orgId,
      createdByUserId: params.createdByUserId,
      label: new KeyLabel(params.label),
      keyHash,
      bifrostVirtualKeyId: params.bifrostVirtualKeyId,
      status: KeyStatus.pending(),
      scope: params.scope ?? KeyScope.unrestricted(),
      expiresAt: params.expiresAt ?? null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): ApiKey {
    const scopeJson: KeyScopeJSON = typeof row.scope === 'string'
      ? JSON.parse(row.scope as string)
      : (row.scope as KeyScopeJSON)

    return new ApiKey({
      id: row.id as string,
      orgId: row.org_id as string,
      createdByUserId: row.created_by_user_id as string,
      label: new KeyLabel(row.label as string),
      keyHash: KeyHash.fromExisting(row.key_hash as string),
      bifrostVirtualKeyId: row.bifrost_virtual_key_id as string,
      status: KeyStatus.from(row.status as string),
      scope: KeyScope.fromJSON(scopeJson),
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
      revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    })
  }

  activate(): ApiKey {
    if (!this.props.status.isPending()) {
      throw new Error('只有 pending 狀態的 Key 可以 activate')
    }
    return new ApiKey({
      ...this.props,
      status: KeyStatus.active(),
      updatedAt: new Date(),
    })
  }

  revoke(): ApiKey {
    if (this.props.status.isRevoked()) {
      throw new Error('此 Key 已撤銷')
    }
    if (this.props.status.isPending()) {
      throw new Error('pending 狀態的 Key 不能撤銷，請先 activate 或直接刪除')
    }
    return new ApiKey({
      ...this.props,
      status: KeyStatus.revoked(),
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
  }

  updateLabel(newLabel: string): ApiKey {
    return new ApiKey({
      ...this.props,
      label: new KeyLabel(newLabel),
      updatedAt: new Date(),
    })
  }

  updateScope(newScope: KeyScope): ApiKey {
    if (this.props.status.isRevoked()) {
      throw new Error('已撤銷的 Key 不能更新權限')
    }
    return new ApiKey({
      ...this.props,
      scope: newScope,
      updatedAt: new Date(),
    })
  }

  get id(): string { return this.props.id }
  get orgId(): string { return this.props.orgId }
  get createdByUserId(): string { return this.props.createdByUserId }
  get label(): string { return this.props.label.getValue() }
  get keyHashValue(): string { return this.props.keyHash.getValue() }
  get bifrostVirtualKeyId(): string { return this.props.bifrostVirtualKeyId }
  get status(): string { return this.props.status.getValue() }
  get scope(): KeyScope { return this.props.scope }
  get expiresAt(): Date | null { return this.props.expiresAt }
  get revokedAt(): Date | null { return this.props.revokedAt }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      org_id: this.props.orgId,
      created_by_user_id: this.props.createdByUserId,
      label: this.props.label.getValue(),
      key_hash: this.props.keyHash.getValue(),
      bifrost_virtual_key_id: this.props.bifrostVirtualKeyId,
      status: this.props.status.getValue(),
      scope: JSON.stringify(this.props.scope.toJSON()),
      expires_at: this.props.expiresAt?.toISOString() ?? null,
      revoked_at: this.props.revokedAt?.toISOString() ?? null,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
    }
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.props.id,
      orgId: this.props.orgId,
      createdByUserId: this.props.createdByUserId,
      label: this.props.label.getValue(),
      keyPrefix: `drp_sk_...${this.props.keyHash.getValue().slice(-8)}`,
      bifrostVirtualKeyId: this.props.bifrostVirtualKeyId,
      status: this.props.status.getValue(),
      scope: this.props.scope.toJSON(),
      expiresAt: this.props.expiresAt?.toISOString() ?? null,
      revokedAt: this.props.revokedAt?.toISOString() ?? null,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    }
  }
}
```

### Step 4: Create Repository Port

- [ ] Create `src/Modules/ApiKey/Domain/Repositories/IApiKeyRepository.ts`:

```typescript
import type { ApiKey } from '../Aggregates/ApiKey'

export interface IApiKeyRepository {
  findById(id: string): Promise<ApiKey | null>
  findByOrgId(orgId: string, limit?: number, offset?: number): Promise<ApiKey[]>
  findByKeyHash(keyHash: string): Promise<ApiKey | null>
  save(apiKey: ApiKey): Promise<void>
  update(apiKey: ApiKey): Promise<void>
  delete(id: string): Promise<void>
  countByOrgId(orgId: string): Promise<number>
  countActiveByOrgId(orgId: string): Promise<number>
  withTransaction(tx: unknown): IApiKeyRepository
}
```

### Step 5: Run tests

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/ApiKey.test.ts`
- Expected: PASS

### Step 6: Commit

- [ ] ```bash
git add src/Modules/ApiKey/Domain/
git commit -m "feat: [apikey] 新增 ApiKey 聚合根與 Repository Port"
```

---

## Task 3: Database Schema + Migration + Repository

**Files:**
- Create: `database/migrations/2026_04_08_000004_create_api_keys_table.ts`
- Modify: `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts`
- Create: `src/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository.ts`

### Step 1: Create migration

- [ ] Create `database/migrations/2026_04_08_000004_create_api_keys_table.ts`:

```typescript
import { type Migration, Schema } from '@gravito/atlas'

export default class CreateApiKeysTable implements Migration {
  async up(): Promise<void> {
    await Schema.create('api_keys', (table) => {
      table.string('id').primary()
      table.string('org_id')
      table.string('created_by_user_id')
      table.string('label')
      table.string('key_hash').unique()
      table.string('bifrost_virtual_key_id')
      table.string('status').default('active')
      table.text('scope')
      table.timestamp('expires_at').nullable()
      table.timestamp('revoked_at').nullable()
      table.timestamps()
    })
  }

  async down(): Promise<void> {
    await Schema.dropIfExists('api_keys')
  }
}
```

### Step 2: Add Drizzle schema

- [ ] Modify `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` — append after the `healthChecks` table:

```typescript
/**
 * API Keys 表
 *
 * 儲存 Draupnir API Key，每個 Key 映射一個 Bifrost Virtual Key
 */
export const apiKeys = sqliteTable(
  'api_keys',
  {
    id: text('id').primaryKey(),
    org_id: text('org_id').notNull(),
    created_by_user_id: text('created_by_user_id').notNull(),
    label: text('label').notNull(),
    key_hash: text('key_hash').notNull().unique(),
    bifrost_virtual_key_id: text('bifrost_virtual_key_id').notNull(),
    status: text('status').notNull().default('active'),
    scope: text('scope').notNull(),
    expires_at: text('expires_at'),
    revoked_at: text('revoked_at'),
    created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('idx_api_keys_org_id').on(table.org_id),
    index('idx_api_keys_key_hash').on(table.key_hash),
  ]
)
```

### Step 3: Implement ApiKeyRepository

- [ ] Create `src/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository.ts`:

```typescript
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import { ApiKey } from '../../Domain/Aggregates/ApiKey'

export class ApiKeyRepository implements IApiKeyRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<ApiKey | null> {
    const row = await this.db.table('api_keys').where('id', '=', id).first()
    return row ? ApiKey.fromDatabase(row) : null
  }

  async findByOrgId(orgId: string, limit?: number, offset?: number): Promise<ApiKey[]> {
    let query = this.db.table('api_keys')
      .where('org_id', '=', orgId)
      .orderBy('created_at', 'DESC')
    if (offset != null && offset > 0) {
      query = query.offset(offset)
    }
    if (limit != null) {
      query = query.limit(limit)
    }
    const rows = await query.select()
    return rows.map((row) => ApiKey.fromDatabase(row))
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    const row = await this.db.table('api_keys').where('key_hash', '=', keyHash).first()
    return row ? ApiKey.fromDatabase(row) : null
  }

  async save(apiKey: ApiKey): Promise<void> {
    await this.db.table('api_keys').insert(apiKey.toDatabaseRow())
  }

  async update(apiKey: ApiKey): Promise<void> {
    await this.db.table('api_keys').where('id', '=', apiKey.id).update(apiKey.toDatabaseRow())
  }

  async countByOrgId(orgId: string): Promise<number> {
    return this.db.table('api_keys').where('org_id', '=', orgId).count()
  }

  async delete(id: string): Promise<void> {
    await this.db.table('api_keys').where('id', '=', id).delete()
  }

  async countActiveByOrgId(orgId: string): Promise<number> {
    return this.db.table('api_keys')
      .where('org_id', '=', orgId)
      .where('status', '=', 'active')
      .count()
  }

  withTransaction(tx: IDatabaseAccess): ApiKeyRepository {
    return new ApiKeyRepository(tx)
  }
}
```

### Step 4: Commit

- [ ] ```bash
git add database/migrations/2026_04_08_000004_create_api_keys_table.ts src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts src/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository.ts
git commit -m "feat: [apikey] 新增 api_keys 資料表 Migration、Drizzle schema、Repository"
```

---

## Task 4: ApiKeyBifrostSync 服務

**Files:**
- Create: `src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts`
- Create: `src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts`

### Step 1: Write ApiKeyBifrostSync tests

- [ ] Create `src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiKeyBifrostSync } from '../Infrastructure/Services/ApiKeyBifrostSync'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { BifrostVirtualKey } from '@/Foundation/Infrastructure/Services/BifrostClient/types'
import { KeyScope } from '../Domain/ValueObjects/KeyScope'

function createMockBifrostClient(): BifrostClient {
  return {
    createVirtualKey: vi.fn().mockResolvedValue({
      id: 'bfr-vk-new',
      name: 'test-key',
      value: 'vk_live_abc123',
      is_active: true,
      provider_configs: [],
    } satisfies BifrostVirtualKey),
    updateVirtualKey: vi.fn().mockResolvedValue({
      id: 'bfr-vk-1',
      name: 'updated',
      is_active: true,
      provider_configs: [],
    } satisfies BifrostVirtualKey),
    deleteVirtualKey: vi.fn().mockResolvedValue(undefined),
    listModels: vi.fn().mockResolvedValue([
      { id: 'gpt-4' },
      { id: 'claude-3-sonnet' },
    ]),
  } as unknown as BifrostClient
}

describe('ApiKeyBifrostSync', () => {
  let sync: ApiKeyBifrostSync
  let mockClient: BifrostClient

  beforeEach(() => {
    mockClient = createMockBifrostClient()
    sync = new ApiKeyBifrostSync(mockClient)
  })

  it('createVirtualKey 應呼叫 BifrostClient 並回傳 ID', async () => {
    const result = await sync.createVirtualKey('My Key', 'org-1')
    expect(result.bifrostVirtualKeyId).toBe('bfr-vk-new')
    expect(result.bifrostKeyValue).toBe('vk_live_abc123')
    expect(mockClient.createVirtualKey).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My Key', customer_id: 'org-1' }),
    )
  })

  it('syncPermissions 應將 scope 同步至 Bifrost', async () => {
    const scope = KeyScope.create({ allowedModels: ['gpt-4'], rateLimitRpm: 60, rateLimitTpm: 50000 })
    await sync.syncPermissions('bfr-vk-1', scope)
    expect(mockClient.updateVirtualKey).toHaveBeenCalledWith(
      'bfr-vk-1',
      expect.objectContaining({
        provider_configs: expect.arrayContaining([
          expect.objectContaining({ allowed_models: ['gpt-4'] }),
        ]),
        rate_limit: expect.objectContaining({
          request_max_limit: 60,
          token_max_limit: 50000,
        }),
      }),
    )
  })

  it('deactivateVirtualKey 應停用 Bifrost Virtual Key', async () => {
    await sync.deactivateVirtualKey('bfr-vk-1')
    expect(mockClient.updateVirtualKey).toHaveBeenCalledWith(
      'bfr-vk-1',
      expect.objectContaining({ is_active: false }),
    )
  })

  it('deleteVirtualKey 應刪除 Bifrost Virtual Key', async () => {
    await sync.deleteVirtualKey('bfr-vk-1')
    expect(mockClient.deleteVirtualKey).toHaveBeenCalledWith('bfr-vk-1')
  })
})
```

### Step 2: Run test to verify it fails

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts`
- Expected: FAIL

### Step 3: Implement ApiKeyBifrostSync

- [ ] Create `src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts`:

```typescript
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { KeyScope } from '../../Domain/ValueObjects/KeyScope'

interface CreateVirtualKeyResult {
  bifrostVirtualKeyId: string
  bifrostKeyValue: string
}

export class ApiKeyBifrostSync {
  constructor(private readonly bifrostClient: BifrostClient) {}

  async createVirtualKey(label: string, orgId: string): Promise<CreateVirtualKeyResult> {
    const vk = await this.bifrostClient.createVirtualKey({
      name: label,
      customer_id: orgId,
    })
    return {
      bifrostVirtualKeyId: vk.id,
      bifrostKeyValue: vk.value ?? '',
    }
  }

  async syncPermissions(bifrostVirtualKeyId: string, scope: KeyScope): Promise<void> {
    const allowedModels = scope.getAllowedModels()
    const rpm = scope.getRateLimitRpm()
    const tpm = scope.getRateLimitTpm()

    const providerConfigs = allowedModels
      ? [{ provider: '*', allowed_models: [...allowedModels] }]
      : undefined

    const rateLimit = (rpm != null || tpm != null)
      ? {
          token_max_limit: tpm ?? 0,
          token_reset_duration: '1m',
          ...(rpm != null && { request_max_limit: rpm, request_reset_duration: '1m' }),
        }
      : undefined

    await this.bifrostClient.updateVirtualKey(bifrostVirtualKeyId, {
      provider_configs: providerConfigs,
      rate_limit: rateLimit,
    })
  }

  async deactivateVirtualKey(bifrostVirtualKeyId: string): Promise<void> {
    await this.bifrostClient.updateVirtualKey(bifrostVirtualKeyId, { is_active: false })
  }

  async deleteVirtualKey(bifrostVirtualKeyId: string): Promise<void> {
    await this.bifrostClient.deleteVirtualKey(bifrostVirtualKeyId)
  }
}
```

### Step 4: Run tests

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts`
- Expected: PASS

### Step 5: Commit

- [ ] ```bash
git add src/Modules/ApiKey/Infrastructure/Services/ApiKeyBifrostSync.ts src/Modules/ApiKey/__tests__/ApiKeyBifrostSync.test.ts
git commit -m "feat: [apikey] 新增 ApiKeyBifrostSync 服務（Bifrost Virtual Key 同步）"
```

---

## Task 5: ApiKey Application Services — DTOs + CreateApiKeyService

**Files:**
- Create: `src/Modules/ApiKey/Application/DTOs/ApiKeyDTO.ts`
- Create: `src/Modules/ApiKey/Application/Services/CreateApiKeyService.ts`
- Create: `src/Modules/ApiKey/__tests__/CreateApiKeyService.test.ts`

### Step 1: Create DTOs

- [ ] Create `src/Modules/ApiKey/Application/DTOs/ApiKeyDTO.ts`:

```typescript
export interface CreateApiKeyRequest {
  orgId: string
  createdByUserId: string
  callerSystemRole: string
  label: string
  allowedModels?: string[]
  rateLimitRpm?: number
  rateLimitTpm?: number
  expiresAt?: string
}

export interface UpdateKeyLabelRequest {
  keyId: string
  callerUserId: string
  callerSystemRole: string
  label: string
}

export interface SetKeyPermissionsRequest {
  keyId: string
  callerUserId: string
  callerSystemRole: string
  allowedModels?: string[]
  rateLimitRpm?: number | null
  rateLimitTpm?: number | null
}

export interface RevokeApiKeyRequest {
  keyId: string
  callerUserId: string
  callerSystemRole: string
}

export interface ApiKeyResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

export interface ApiKeyCreatedResponse {
  success: boolean
  message: string
  data?: Record<string, unknown> & { rawKey?: string }
  error?: string
}

export interface ListApiKeysResponse {
  success: boolean
  message: string
  data?: {
    keys: Record<string, unknown>[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }
  error?: string
}
```

### Step 2: Write CreateApiKeyService tests

- [ ] Create `src/Modules/ApiKey/__tests__/CreateApiKeyService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { CreateApiKeyService } from '../Application/Services/CreateApiKeyService'
import { ApiKeyRepository } from '../Infrastructure/Repositories/ApiKeyRepository'
import { ApiKeyBifrostSync } from '../Infrastructure/Services/ApiKeyBifrostSync'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

function createMockSync(shouldFail = false): ApiKeyBifrostSync {
  const mockClient = {
    createVirtualKey: shouldFail
      ? vi.fn().mockRejectedValue(new Error('Bifrost 連線失敗'))
      : vi.fn().mockResolvedValue({
          id: 'bfr-vk-new', name: 'test', value: 'vk_live_abc', is_active: true, provider_configs: [],
        }),
    updateVirtualKey: vi.fn().mockResolvedValue({ id: 'bfr-vk-new', name: 'test', is_active: true, provider_configs: [] }),
    deleteVirtualKey: vi.fn(),
    listModels: vi.fn().mockResolvedValue([]),
  } as unknown as BifrostClient
  return new ApiKeyBifrostSync(mockClient)
}

describe('CreateApiKeyService', () => {
  let service: CreateApiKeyService
  let db: MemoryDatabaseAccess
  let apiKeyRepo: ApiKeyRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    apiKeyRepo = new ApiKeyRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const sync = createMockSync()
    service = new CreateApiKeyService(apiKeyRepo, orgAuth, sync, db)

    const org = Organization.create('org-1', 'Test Org', 'test')
    await orgRepo.save(org)
    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)
  })

  it('應成功建立 API Key 並回傳 rawKey（最終狀態為 active）', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      createdByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'My Production Key',
    })
    expect(result.success).toBe(true)
    expect(result.data?.rawKey).toBeTruthy()
    expect(result.data?.id).toBeTruthy()
    expect(result.data?.label).toBe('My Production Key')
    expect(result.data?.status).toBe('active')
  })

  it('非 Org 成員應回傳錯誤', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      createdByUserId: 'outsider',
      callerSystemRole: 'user',
      label: 'Key',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })

  it('空 label 應回傳錯誤', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      createdByUserId: 'user-1',
      callerSystemRole: 'user',
      label: '',
    })
    expect(result.success).toBe(false)
  })

  it('應支援帶權限的 Key 建立', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      createdByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'Restricted Key',
      allowedModels: ['gpt-4'],
      rateLimitRpm: 60,
    })
    expect(result.success).toBe(true)
    expect(result.data?.scope).toEqual(expect.objectContaining({ allowed_models: ['gpt-4'] }))
  })

  it('Bifrost 失敗時應清理本地 pending 記錄', async () => {
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const failSync = createMockSync(true)
    const failService = new CreateApiKeyService(apiKeyRepo, orgAuth, failSync, db)

    const result = await failService.execute({
      orgId: 'org-1',
      createdByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'Will Fail',
    })
    expect(result.success).toBe(false)
    // 確認 pending 記錄已被清理
    const keys = await apiKeyRepo.findByOrgId('org-1')
    expect(keys).toHaveLength(0)
  })
})
```

### Step 3: Run test to verify it fails

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/CreateApiKeyService.test.ts`
- Expected: FAIL

### Step 4: Implement CreateApiKeyService

- [ ] Create `src/Modules/ApiKey/Application/Services/CreateApiKeyService.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { ApiKeyBifrostSync } from '../../Infrastructure/Services/ApiKeyBifrostSync'
import { ApiKey } from '../../Domain/Aggregates/ApiKey'
import { KeyScope } from '../../Domain/ValueObjects/KeyScope'
import type { CreateApiKeyRequest, ApiKeyCreatedResponse } from '../DTOs/ApiKeyDTO'

export class CreateApiKeyService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: ApiKeyBifrostSync,
    private readonly db: IDatabaseAccess,
  ) {}

  async execute(request: CreateApiKeyRequest): Promise<ApiKeyCreatedResponse> {
    try {
      if (!request.label || !request.label.trim()) {
        return { success: false, message: 'Key 標籤不能為空', error: 'LABEL_REQUIRED' }
      }

      // 驗證呼叫者是否為此組織成員
      const authResult = await this.orgAuth.requireOrgMembership(
        request.orgId, request.createdByUserId, request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return { success: false, message: '你不是此組織的成員', error: authResult.error ?? 'NOT_ORG_MEMBER' }
      }

      const scope = KeyScope.create({
        allowedModels: request.allowedModels,
        rateLimitRpm: request.rateLimitRpm,
        rateLimitTpm: request.rateLimitTpm,
      })

      const keyId = uuidv4()
      const rawKey = `drp_sk_${uuidv4().replace(/-/g, '')}`

      // Step 1: 以 pending 狀態先存入本地 DB
      const pendingKey = await ApiKey.create({
        id: keyId,
        orgId: request.orgId,
        createdByUserId: request.createdByUserId,
        label: request.label,
        bifrostVirtualKeyId: '', // 尚未建立
        rawKey,
        scope,
        expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
      })
      await this.apiKeyRepository.save(pendingKey)

      try {
        // Step 2: 在 Bifrost 建立 Virtual Key
        const { bifrostVirtualKeyId } = await this.bifrostSync.createVirtualKey(
          request.label, request.orgId,
        )

        // Step 3: 更新本地記錄的 bifrostVirtualKeyId 並 activate
        const activatedKey = await ApiKey.create({
          id: keyId,
          orgId: request.orgId,
          createdByUserId: request.createdByUserId,
          label: request.label,
          bifrostVirtualKeyId,
          rawKey,
          scope,
          expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
        })
        const finalKey = activatedKey.activate()
        await this.apiKeyRepository.update(finalKey)

        // Step 4: 同步權限（如有設定）
        if (scope.getAllowedModels() || scope.getRateLimitRpm() || scope.getRateLimitTpm()) {
          await this.bifrostSync.syncPermissions(bifrostVirtualKeyId, scope)
        }

        return {
          success: true,
          message: 'API Key 建立成功（請立即記錄 rawKey，此後將無法再次取得）',
          data: { ...finalKey.toDTO(), rawKey },
        }
      } catch (bifrostError: unknown) {
        // 補償：Bifrost 失敗時清理本地 pending 記錄
        await this.apiKeyRepository.delete(keyId)
        throw bifrostError
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '建立失敗'
      return { success: false, message, error: message }
    }
  }
}
```

### Step 5: Run tests

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/CreateApiKeyService.test.ts`
- Expected: PASS

### Step 6: Commit

- [ ] ```bash
git add src/Modules/ApiKey/Application/
git commit -m "feat: [apikey] 新增 ApiKey DTOs 與 CreateApiKeyService"
```

---

## Task 6: ListApiKeysService + RevokeApiKeyService

**Files:**
- Create: `src/Modules/ApiKey/Application/Services/ListApiKeysService.ts`
- Create: `src/Modules/ApiKey/Application/Services/RevokeApiKeyService.ts`
- Create: `src/Modules/ApiKey/__tests__/RevokeApiKeyService.test.ts`

### Step 1: Implement ListApiKeysService

- [ ] Create `src/Modules/ApiKey/Application/Services/ListApiKeysService.ts`:

```typescript
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { ListApiKeysResponse } from '../DTOs/ApiKeyDTO'

export class ListApiKeysService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(orgId: string, callerUserId: string, callerSystemRole: string, page = 1, limit = 20): Promise<ListApiKeysResponse> {
    try {
      // 驗證呼叫者是否為此組織成員
      const authResult = await this.orgAuth.requireOrgMembership(orgId, callerUserId, callerSystemRole)
      if (!authResult.authorized) {
        return { success: false, message: '無權存取此組織的 Keys', error: authResult.error ?? 'NOT_ORG_MEMBER' }
      }

      const offset = (page - 1) * limit
      const [keys, total] = await Promise.all([
        this.apiKeyRepository.findByOrgId(orgId, limit, offset),
        this.apiKeyRepository.countByOrgId(orgId),
      ])

      return {
        success: true,
        message: '查詢成功',
        data: {
          keys: keys.map((k) => k.toDTO()),
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
```

### Step 2: Write RevokeApiKeyService tests

- [ ] Create `src/Modules/ApiKey/__tests__/RevokeApiKeyService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { RevokeApiKeyService } from '../Application/Services/RevokeApiKeyService'
import { ApiKeyRepository } from '../Infrastructure/Repositories/ApiKeyRepository'
import { ApiKeyBifrostSync } from '../Infrastructure/Services/ApiKeyBifrostSync'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

function createMockSync(): ApiKeyBifrostSync {
  const mockClient = {
    createVirtualKey: vi.fn(),
    updateVirtualKey: vi.fn().mockResolvedValue({ id: 'bfr-vk-1', name: 'test', is_active: false, provider_configs: [] }),
    deleteVirtualKey: vi.fn(),
    listModels: vi.fn(),
  } as unknown as BifrostClient
  return new ApiKeyBifrostSync(mockClient)
}

describe('RevokeApiKeyService', () => {
  let service: RevokeApiKeyService
  let db: MemoryDatabaseAccess
  let apiKeyRepo: ApiKeyRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    apiKeyRepo = new ApiKeyRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const sync = createMockSync()
    service = new RevokeApiKeyService(apiKeyRepo, orgAuth, sync)

    // 建立 org member
    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)

    // 建立 active key（先 create 再 activate）
    const key = await ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Active Key',
      bifrostVirtualKeyId: 'bfr-vk-1',
      rawKey: 'drp_sk_active',
    })
    await apiKeyRepo.save(key.activate())
  })

  it('應成功撤銷 Key 並停用 Bifrost Virtual Key', async () => {
    const result = await service.execute({ keyId: 'key-1', callerUserId: 'user-1', callerSystemRole: 'user' })
    expect(result.success).toBe(true)
    const revoked = await apiKeyRepo.findById('key-1')
    expect(revoked?.status).toBe('revoked')
  })

  it('不存在的 Key 應回傳錯誤', async () => {
    const result = await service.execute({ keyId: 'nonexistent', callerUserId: 'user-1', callerSystemRole: 'user' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('KEY_NOT_FOUND')
  })

  it('已撤銷的 Key 應回傳錯誤', async () => {
    await service.execute({ keyId: 'key-1', callerUserId: 'user-1', callerSystemRole: 'user' })
    const result = await service.execute({ keyId: 'key-1', callerUserId: 'user-1', callerSystemRole: 'user' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('ALREADY_REVOKED')
  })

  it('非 Org 成員不能撤銷其他 Org 的 Key', async () => {
    const result = await service.execute({ keyId: 'key-1', callerUserId: 'outsider', callerSystemRole: 'user' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })
})
```

### Step 3: Run test to verify it fails

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/RevokeApiKeyService.test.ts`
- Expected: FAIL

### Step 4: Implement RevokeApiKeyService

- [ ] Create `src/Modules/ApiKey/Application/Services/RevokeApiKeyService.ts`:

```typescript
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { ApiKeyBifrostSync } from '../../Infrastructure/Services/ApiKeyBifrostSync'
import type { RevokeApiKeyRequest, ApiKeyResponse } from '../DTOs/ApiKeyDTO'

export class RevokeApiKeyService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: ApiKeyBifrostSync,
  ) {}

  async execute(request: RevokeApiKeyRequest): Promise<ApiKeyResponse> {
    try {
      const apiKey = await this.apiKeyRepository.findById(request.keyId)
      if (!apiKey) {
        return { success: false, message: 'Key 不存在', error: 'KEY_NOT_FOUND' }
      }

      // 驗證呼叫者是否為此 Key 所屬 Org 的成員
      const authResult = await this.orgAuth.requireOrgMembership(
        apiKey.orgId, request.callerUserId, request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return { success: false, message: '無權操作此 Key', error: authResult.error ?? 'NOT_ORG_MEMBER' }
      }

      if (apiKey.status === 'revoked') {
        return { success: false, message: '此 Key 已撤銷', error: 'ALREADY_REVOKED' }
      }

      // 先停用 Bifrost 端（確保遠端先失效）
      await this.bifrostSync.deactivateVirtualKey(apiKey.bifrostVirtualKeyId)

      // 再更新本地狀態
      const revoked = apiKey.revoke()
      await this.apiKeyRepository.update(revoked)

      return { success: true, message: 'Key 已撤銷', data: revoked.toDTO() }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '撤銷失敗'
      return { success: false, message, error: message }
    }
  }
}
```

### Step 5: Run tests

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/RevokeApiKeyService.test.ts`
- Expected: PASS

### Step 6: Commit

- [ ] ```bash
git add src/Modules/ApiKey/Application/Services/ListApiKeysService.ts src/Modules/ApiKey/Application/Services/RevokeApiKeyService.ts src/Modules/ApiKey/__tests__/RevokeApiKeyService.test.ts
git commit -m "feat: [apikey] 新增 ListApiKeysService 與 RevokeApiKeyService"
```

---

## Task 7: UpdateKeyLabelService + SetKeyPermissionsService

**Files:**
- Create: `src/Modules/ApiKey/Application/Services/UpdateKeyLabelService.ts`
- Create: `src/Modules/ApiKey/Application/Services/SetKeyPermissionsService.ts`
- Create: `src/Modules/ApiKey/__tests__/SetKeyPermissionsService.test.ts`

### Step 1: Implement UpdateKeyLabelService

- [ ] Create `src/Modules/ApiKey/Application/Services/UpdateKeyLabelService.ts`:

```typescript
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { UpdateKeyLabelRequest, ApiKeyResponse } from '../DTOs/ApiKeyDTO'

export class UpdateKeyLabelService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(request: UpdateKeyLabelRequest): Promise<ApiKeyResponse> {
    try {
      const apiKey = await this.apiKeyRepository.findById(request.keyId)
      if (!apiKey) {
        return { success: false, message: 'Key 不存在', error: 'KEY_NOT_FOUND' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        apiKey.orgId, request.callerUserId, request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return { success: false, message: '無權操作此 Key', error: authResult.error ?? 'NOT_ORG_MEMBER' }
      }

      const updated = apiKey.updateLabel(request.label)
      await this.apiKeyRepository.update(updated)

      return { success: true, message: '標籤已更新', data: updated.toDTO() }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '更新失敗'
      return { success: false, message, error: message }
    }
  }
}
```

### Step 2: Write SetKeyPermissionsService tests

- [ ] Create `src/Modules/ApiKey/__tests__/SetKeyPermissionsService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { SetKeyPermissionsService } from '../Application/Services/SetKeyPermissionsService'
import { ApiKeyRepository } from '../Infrastructure/Repositories/ApiKeyRepository'
import { ApiKeyBifrostSync } from '../Infrastructure/Services/ApiKeyBifrostSync'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

function createMockSync(): ApiKeyBifrostSync {
  const mockClient = {
    createVirtualKey: vi.fn(),
    updateVirtualKey: vi.fn().mockResolvedValue({ id: 'bfr-vk-1', name: 'test', is_active: true, provider_configs: [] }),
    deleteVirtualKey: vi.fn(),
    listModels: vi.fn(),
  } as unknown as BifrostClient
  return new ApiKeyBifrostSync(mockClient)
}

describe('SetKeyPermissionsService', () => {
  let service: SetKeyPermissionsService
  let db: MemoryDatabaseAccess
  let apiKeyRepo: ApiKeyRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    apiKeyRepo = new ApiKeyRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const sync = createMockSync()
    service = new SetKeyPermissionsService(apiKeyRepo, orgAuth, sync)

    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)

    const key = await ApiKey.create({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'user-1',
      label: 'Test Key',
      bifrostVirtualKeyId: 'bfr-vk-1',
      rawKey: 'drp_sk_test',
    })
    await apiKeyRepo.save(key.activate())
  })

  it('應成功更新 Key 權限並同步 Bifrost', async () => {
    const result = await service.execute({
      keyId: 'key-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      allowedModels: ['gpt-4'],
      rateLimitRpm: 120,
    })
    expect(result.success).toBe(true)
    const updated = await apiKeyRepo.findById('key-1')
    expect(updated?.scope.getAllowedModels()).toEqual(['gpt-4'])
    expect(updated?.scope.getRateLimitRpm()).toBe(120)
  })

  it('不存在的 Key 應回傳錯誤', async () => {
    const result = await service.execute({ keyId: 'nonexistent', callerUserId: 'user-1', callerSystemRole: 'user' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('KEY_NOT_FOUND')
  })

  it('非 Org 成員不能修改權限', async () => {
    const result = await service.execute({ keyId: 'key-1', callerUserId: 'outsider', callerSystemRole: 'user', rateLimitRpm: 60 })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })

  it('已撤銷的 Key 應回傳錯誤', async () => {
    const key = await apiKeyRepo.findById('key-1')
    const revoked = key!.revoke()
    await apiKeyRepo.update(revoked)

    const result = await service.execute({ keyId: 'key-1', callerUserId: 'user-1', callerSystemRole: 'user', rateLimitRpm: 60 })
    expect(result.success).toBe(false)
  })
})
```

### Step 3: Run test to verify it fails

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/SetKeyPermissionsService.test.ts`
- Expected: FAIL

### Step 4: Implement SetKeyPermissionsService

- [ ] Create `src/Modules/ApiKey/Application/Services/SetKeyPermissionsService.ts`:

```typescript
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { ApiKeyBifrostSync } from '../../Infrastructure/Services/ApiKeyBifrostSync'
import { KeyScope } from '../../Domain/ValueObjects/KeyScope'
import type { SetKeyPermissionsRequest, ApiKeyResponse } from '../DTOs/ApiKeyDTO'

export class SetKeyPermissionsService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: ApiKeyBifrostSync,
  ) {}

  async execute(request: SetKeyPermissionsRequest): Promise<ApiKeyResponse> {
    try {
      const apiKey = await this.apiKeyRepository.findById(request.keyId)
      if (!apiKey) {
        return { success: false, message: 'Key 不存在', error: 'KEY_NOT_FOUND' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        apiKey.orgId, request.callerUserId, request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return { success: false, message: '無權操作此 Key', error: authResult.error ?? 'NOT_ORG_MEMBER' }
      }

      const newScope = KeyScope.create({
        allowedModels: request.allowedModels,
        rateLimitRpm: request.rateLimitRpm,
        rateLimitTpm: request.rateLimitTpm,
      })

      const updated = apiKey.updateScope(newScope)
      await this.apiKeyRepository.update(updated)
      await this.bifrostSync.syncPermissions(apiKey.bifrostVirtualKeyId, newScope)

      return { success: true, message: '權限已更新', data: updated.toDTO() }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '更新失敗'
      return { success: false, message, error: message }
    }
  }
}
```

### Step 5: Run tests

- [ ] Run: `bun test src/Modules/ApiKey/__tests__/SetKeyPermissionsService.test.ts`
- Expected: PASS

### Step 6: Commit

- [ ] ```bash
git add src/Modules/ApiKey/Application/Services/UpdateKeyLabelService.ts src/Modules/ApiKey/Application/Services/SetKeyPermissionsService.ts src/Modules/ApiKey/__tests__/SetKeyPermissionsService.test.ts
git commit -m "feat: [apikey] 新增 UpdateKeyLabelService 與 SetKeyPermissionsService"
```

---

## Task 8: ApiKey Controller + Routes + ServiceProvider + Wiring

**Files:**
- Create: `src/Modules/ApiKey/Presentation/Controllers/ApiKeyController.ts`
- Create: `src/Modules/ApiKey/Presentation/Routes/apikey.routes.ts`
- Create: `src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts`
- Create: `src/Modules/ApiKey/index.ts`
- Modify: `src/bootstrap.ts`
- Modify: `src/routes.ts`
- Modify: `src/wiring/index.ts`

### Step 1: Create ApiKeyController

- [ ] Create `src/Modules/ApiKey/Presentation/Controllers/ApiKeyController.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { CreateApiKeyService } from '../../Application/Services/CreateApiKeyService'
import type { ListApiKeysService } from '../../Application/Services/ListApiKeysService'
import type { RevokeApiKeyService } from '../../Application/Services/RevokeApiKeyService'
import type { UpdateKeyLabelService } from '../../Application/Services/UpdateKeyLabelService'
import type { SetKeyPermissionsService } from '../../Application/Services/SetKeyPermissionsService'

export class ApiKeyController {
  constructor(
    private readonly createService: CreateApiKeyService,
    private readonly listService: ListApiKeysService,
    private readonly revokeService: RevokeApiKeyService,
    private readonly updateLabelService: UpdateKeyLabelService,
    private readonly setPermissionsService: SetKeyPermissionsService,
  ) {}

  async create(ctx: IHttpContext) {
    const user = AuthMiddleware.getUser(ctx)
    const body = await ctx.req.json()
    const orgId = ctx.req.param('orgId')
    const result = await this.createService.execute({
      orgId,
      createdByUserId: user.id,
      callerSystemRole: user.role,
      label: body.label,
      allowedModels: body.allowedModels,
      rateLimitRpm: body.rateLimitRpm,
      rateLimitTpm: body.rateLimitTpm,
      expiresAt: body.expiresAt,
    })
    const status = result.success ? 201 : 400
    return ctx.json(result, status)
  }

  async list(ctx: IHttpContext) {
    const user = AuthMiddleware.getUser(ctx)
    const orgId = ctx.req.param('orgId')
    const url = new URL(ctx.req.url)
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '20', 10)
    const result = await this.listService.execute(orgId, user.id, user.role, page, limit)
    return ctx.json(result)
  }

  async revoke(ctx: IHttpContext) {
    const user = AuthMiddleware.getUser(ctx)
    const keyId = ctx.req.param('keyId')
    const result = await this.revokeService.execute({
      keyId, callerUserId: user.id, callerSystemRole: user.role,
    })
    const status = result.success ? 200 : (result.error === 'KEY_NOT_FOUND' ? 404 : 400)
    return ctx.json(result, status)
  }

  async updateLabel(ctx: IHttpContext) {
    const user = AuthMiddleware.getUser(ctx)
    const keyId = ctx.req.param('keyId')
    const body = await ctx.req.json()
    const result = await this.updateLabelService.execute({
      keyId, callerUserId: user.id, callerSystemRole: user.role, label: body.label,
    })
    const status = result.success ? 200 : (result.error === 'KEY_NOT_FOUND' ? 404 : 400)
    return ctx.json(result, status)
  }

  async setPermissions(ctx: IHttpContext) {
    const user = AuthMiddleware.getUser(ctx)
    const keyId = ctx.req.param('keyId')
    const body = await ctx.req.json()
    const result = await this.setPermissionsService.execute({
      keyId,
      callerUserId: user.id,
      callerSystemRole: user.role,
      allowedModels: body.allowedModels,
      rateLimitRpm: body.rateLimitRpm,
      rateLimitTpm: body.rateLimitTpm,
    })
    const status = result.success ? 200 : (result.error === 'KEY_NOT_FOUND' ? 404 : 400)
    return ctx.json(result, status)
  }
}
```

### Step 2: Create routes

- [ ] Create `src/Modules/ApiKey/Presentation/Routes/apikey.routes.ts`:

```typescript
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { ApiKeyController } from '../Controllers/ApiKeyController'
import { requireAuth } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'

export async function registerApiKeyRoutes(
  router: IModuleRouter,
  controller: ApiKeyController,
): Promise<void> {
  router.post('/api/organizations/:orgId/keys', [requireAuth()], (ctx) => controller.create(ctx))
  router.get('/api/organizations/:orgId/keys', [requireAuth()], (ctx) => controller.list(ctx))
  router.post('/api/keys/:keyId/revoke', [requireAuth()], (ctx) => controller.revoke(ctx))
  router.patch('/api/keys/:keyId/label', [requireAuth()], (ctx) => controller.updateLabel(ctx))
  router.put('/api/keys/:keyId/permissions', [requireAuth()], (ctx) => controller.setPermissions(ctx))
}
```

### Step 3: Create ServiceProvider

- [ ] Create `src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts`:

```typescript
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { ApiKeyRepository } from '../Repositories/ApiKeyRepository'
import { ApiKeyBifrostSync } from '../Services/ApiKeyBifrostSync'
import { CreateApiKeyService } from '../../Application/Services/CreateApiKeyService'
import { ListApiKeysService } from '../../Application/Services/ListApiKeysService'
import { RevokeApiKeyService } from '../../Application/Services/RevokeApiKeyService'
import { UpdateKeyLabelService } from '../../Application/Services/UpdateKeyLabelService'
import { SetKeyPermissionsService } from '../../Application/Services/SetKeyPermissionsService'

export class ApiKeyServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('apiKeyRepository', () => new ApiKeyRepository(db))

    container.singleton('apiKeyBifrostSync', (c: IContainer) => {
      return new ApiKeyBifrostSync(c.make('bifrostClient') as BifrostClient)
    })

    container.bind('createApiKeyService', (c: IContainer) => {
      return new CreateApiKeyService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('apiKeyBifrostSync') as ApiKeyBifrostSync,
        db as IDatabaseAccess,
      )
    })

    container.bind('listApiKeysService', (c: IContainer) => {
      return new ListApiKeysService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('revokeApiKeyService', (c: IContainer) => {
      return new RevokeApiKeyService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('apiKeyBifrostSync') as ApiKeyBifrostSync,
      )
    })

    container.bind('updateKeyLabelService', (c: IContainer) => {
      return new UpdateKeyLabelService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('setKeyPermissionsService', (c: IContainer) => {
      return new SetKeyPermissionsService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('apiKeyBifrostSync') as ApiKeyBifrostSync,
      )
    })
  }

  override boot(_context: unknown): void {
    console.log('🔑 [ApiKey] Module loaded')
  }
}
```

### Step 4: Create module index

- [ ] Create `src/Modules/ApiKey/index.ts`:

```typescript
export { ApiKey } from './Domain/Aggregates/ApiKey'
export { KeyHash } from './Domain/ValueObjects/KeyHash'
export { KeyLabel } from './Domain/ValueObjects/KeyLabel'
export { KeyStatus } from './Domain/ValueObjects/KeyStatus'
export { KeyScope } from './Domain/ValueObjects/KeyScope'
export type { IApiKeyRepository } from './Domain/Repositories/IApiKeyRepository'

export { CreateApiKeyService } from './Application/Services/CreateApiKeyService'
export { ListApiKeysService } from './Application/Services/ListApiKeysService'
export { RevokeApiKeyService } from './Application/Services/RevokeApiKeyService'
export { UpdateKeyLabelService } from './Application/Services/UpdateKeyLabelService'
export { SetKeyPermissionsService } from './Application/Services/SetKeyPermissionsService'

export { ApiKeyServiceProvider } from './Infrastructure/Providers/ApiKeyServiceProvider'
export { ApiKeyBifrostSync } from './Infrastructure/Services/ApiKeyBifrostSync'

export { ApiKeyController } from './Presentation/Controllers/ApiKeyController'
export { registerApiKeyRoutes } from './Presentation/Routes/apikey.routes'
```

### Step 5: Wire into bootstrap.ts

- [ ] Modify `src/bootstrap.ts` — add import and register call:

Import to add after existing imports:
```typescript
import { ApiKeyServiceProvider } from './Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider'
```

Register call to add after `OrganizationServiceProvider` registration:
```typescript
core.register(createGravitoServiceProvider(new ApiKeyServiceProvider()))
```

### Step 6: Wire into routes.ts

- [ ] Modify `src/routes.ts` — add import and call:

Import to add:
```typescript
import { registerApiKey } from './wiring'
```

Call to add after `registerOrganization(core)`:
```typescript
registerApiKey(core)
```

### Step 7: Wire into wiring/index.ts

- [ ] Modify `src/wiring/index.ts` — add at the bottom:

```typescript
import { ApiKeyController, registerApiKeyRoutes } from '@/Modules/ApiKey'

/**
 * 註冊 ApiKey 模組
 */
export const registerApiKey = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const controller = new ApiKeyController(
    core.container.make('createApiKeyService') as any,
    core.container.make('listApiKeysService') as any,
    core.container.make('revokeApiKeyService') as any,
    core.container.make('updateKeyLabelService') as any,
    core.container.make('setKeyPermissionsService') as any,
  )
  void registerApiKeyRoutes(router, controller)
}
```

### Step 8: Run all ApiKey tests

- [ ] Run: `bun test src/Modules/ApiKey/`
- Expected: ALL PASS

### Step 9: Commit

- [ ] ```bash
git add src/Modules/ApiKey/Presentation/ src/Modules/ApiKey/Infrastructure/Providers/ src/Modules/ApiKey/index.ts src/bootstrap.ts src/routes.ts src/wiring/index.ts
git commit -m "feat: [apikey] 新增 Controller、Routes、ServiceProvider、Wiring 完成模組整合"
```

---

## Task 9: Dashboard 模組 — UsageAggregator

**Files:**
- Create: `src/Modules/Dashboard/Infrastructure/Services/UsageAggregator.ts`
- Create: `src/Modules/Dashboard/__tests__/UsageAggregator.test.ts`

### Step 1: Write UsageAggregator tests

- [ ] Create `src/Modules/Dashboard/__tests__/UsageAggregator.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UsageAggregator } from '../Infrastructure/Services/UsageAggregator'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { BifrostLogEntry } from '@/Foundation/Infrastructure/Services/BifrostClient/types'

function createMockBifrostClient(logs: BifrostLogEntry[] = []): BifrostClient {
  return {
    getLogs: vi.fn().mockResolvedValue({ logs, total: logs.length }),
    getLogsStats: vi.fn().mockResolvedValue({
      total_requests: logs.length,
      total_cost: logs.reduce((s, l) => s + l.cost, 0),
      total_tokens: logs.reduce((s, l) => s + (l.total_tokens ?? 0), 0),
      avg_latency: 150,
    }),
    listModels: vi.fn().mockResolvedValue([]),
  } as unknown as BifrostClient
}

const sampleLogs: BifrostLogEntry[] = [
  {
    id: 'log-1', provider: 'openai', model: 'gpt-4', status: 'success',
    object: 'chat.completion', timestamp: '2026-04-08T10:00:00Z',
    latency: 200, cost: 0.03, virtual_key_id: 'bfr-vk-1',
    input_tokens: 100, output_tokens: 50, total_tokens: 150,
  },
  {
    id: 'log-2', provider: 'anthropic', model: 'claude-3-sonnet', status: 'success',
    object: 'chat.completion', timestamp: '2026-04-08T11:00:00Z',
    latency: 100, cost: 0.02, virtual_key_id: 'bfr-vk-1',
    input_tokens: 80, output_tokens: 40, total_tokens: 120,
  },
]

describe('UsageAggregator', () => {
  it('應取得 Bifrost 用量統計', async () => {
    const client = createMockBifrostClient(sampleLogs)
    const aggregator = new UsageAggregator(client)
    const stats = await aggregator.getStats(['bfr-vk-1'])
    expect(stats.totalRequests).toBe(2)
    expect(stats.totalCost).toBeCloseTo(0.05)
    expect(stats.totalTokens).toBe(270)
  })

  it('應取得用量 log 並按時間排序', async () => {
    const client = createMockBifrostClient(sampleLogs)
    const aggregator = new UsageAggregator(client)
    const logs = await aggregator.getLogs(['bfr-vk-1'])
    expect(logs).toHaveLength(2)
  })

  it('無 Virtual Key 時應回傳空結果', async () => {
    const client = createMockBifrostClient([])
    const aggregator = new UsageAggregator(client)
    const stats = await aggregator.getStats([])
    expect(stats.totalRequests).toBe(0)
    expect(stats.totalCost).toBe(0)
  })
})
```

### Step 2: Run test to verify it fails

- [ ] Run: `bun test src/Modules/Dashboard/__tests__/UsageAggregator.test.ts`
- Expected: FAIL

### Step 3: Implement UsageAggregator

- [ ] Create `src/Modules/Dashboard/Infrastructure/Services/UsageAggregator.ts`:

```typescript
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { BifrostLogEntry, BifrostLogsQuery } from '@/Foundation/Infrastructure/Services/BifrostClient/types'

export interface UsageStats {
  totalRequests: number
  totalCost: number
  totalTokens: number
  avgLatency: number
}

export class UsageAggregator {
  constructor(private readonly bifrostClient: BifrostClient) {}

  async getStats(virtualKeyIds: readonly string[], query?: Partial<BifrostLogsQuery>): Promise<UsageStats> {
    if (virtualKeyIds.length === 0) {
      return { totalRequests: 0, totalCost: 0, totalTokens: 0, avgLatency: 0 }
    }

    const stats = await this.bifrostClient.getLogsStats({
      virtual_key_ids: virtualKeyIds.join(','),
      ...query,
    })

    return {
      totalRequests: stats.total_requests,
      totalCost: stats.total_cost,
      totalTokens: stats.total_tokens,
      avgLatency: stats.avg_latency,
    }
  }

  async getLogs(
    virtualKeyIds: readonly string[],
    query?: Partial<BifrostLogsQuery>,
  ): Promise<readonly BifrostLogEntry[]> {
    if (virtualKeyIds.length === 0) {
      return []
    }

    const response = await this.bifrostClient.getLogs({
      virtual_key_ids: virtualKeyIds.join(','),
      ...query,
    })

    return response.logs
  }
}
```

### Step 4: Run tests

- [ ] Run: `bun test src/Modules/Dashboard/__tests__/UsageAggregator.test.ts`
- Expected: PASS

### Step 5: Commit

- [ ] ```bash
git add src/Modules/Dashboard/Infrastructure/Services/UsageAggregator.ts src/Modules/Dashboard/__tests__/UsageAggregator.test.ts
git commit -m "feat: [dashboard] 新增 UsageAggregator 服務（Bifrost 用量資料聚合）"
```

---

## Task 10: Dashboard Application Services

**Files:**
- Create: `src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts`
- Create: `src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts`
- Create: `src/Modules/Dashboard/Application/Services/GetUsageChartService.ts`
- Create: `src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts`
- Create: `src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts`

### Step 1: Create DTOs

- [ ] Create `src/Modules/Dashboard/Application/DTOs/DashboardDTO.ts`:

```typescript
export interface DashboardSummaryResponse {
  success: boolean
  message: string
  data?: {
    totalKeys: number
    activeKeys: number
    usage: {
      totalRequests: number
      totalCost: number
      totalTokens: number
      avgLatency: number
    }
  }
  error?: string
}

export interface UsageChartQuery {
  orgId: string
  callerUserId: string
  callerSystemRole: string
  startTime?: string
  endTime?: string
  providers?: string
  models?: string
  limit?: number
}

export interface UsageChartResponse {
  success: boolean
  message: string
  data?: {
    logs: Record<string, unknown>[]
    stats: {
      totalRequests: number
      totalCost: number
      totalTokens: number
      avgLatency: number
    }
  }
  error?: string
}
```

### Step 2: Write GetDashboardSummaryService tests

- [ ] Create `src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { GetDashboardSummaryService } from '../Application/Services/GetDashboardSummaryService'
import { ApiKeyRepository } from '@/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { UsageAggregator } from '../Infrastructure/Services/UsageAggregator'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

function createMockAggregator(): UsageAggregator {
  const mockClient = {
    getLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
    getLogsStats: vi.fn().mockResolvedValue({
      total_requests: 42, total_cost: 1.5, total_tokens: 10000, avg_latency: 200,
    }),
    listModels: vi.fn(),
  } as unknown as BifrostClient
  return new UsageAggregator(mockClient)
}

describe('GetDashboardSummaryService', () => {
  let service: GetDashboardSummaryService
  let db: MemoryDatabaseAccess

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    const apiKeyRepo = new ApiKeyRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const aggregator = createMockAggregator()
    service = new GetDashboardSummaryService(apiKeyRepo, orgAuth, aggregator)

    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)

    const key1 = await ApiKey.create({
      id: 'key-1', orgId: 'org-1', createdByUserId: 'user-1',
      label: 'Key 1', bifrostVirtualKeyId: 'bfr-vk-1', rawKey: 'drp_sk_1',
    })
    const key2 = await ApiKey.create({
      id: 'key-2', orgId: 'org-1', createdByUserId: 'user-1',
      label: 'Key 2', bifrostVirtualKeyId: 'bfr-vk-2', rawKey: 'drp_sk_2',
    })
    await apiKeyRepo.save(key1.activate())
    await apiKeyRepo.save(key2.activate())
  })

  it('應回傳 Dashboard 摘要資料', async () => {
    const result = await service.execute('org-1', 'user-1', 'user')
    expect(result.success).toBe(true)
    expect(result.data?.totalKeys).toBe(2)
    expect(result.data?.activeKeys).toBe(2)
    expect(result.data?.usage.totalRequests).toBe(42)
    expect(result.data?.usage.totalCost).toBeCloseTo(1.5)
  })

  it('非 Org 成員不能存取 Dashboard', async () => {
    const result = await service.execute('org-1', 'outsider', 'user')
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })

  it('admin 可存取任何 Org 的 Dashboard', async () => {
    const result = await service.execute('org-1', 'admin-user', 'admin')
    expect(result.success).toBe(true)
  })
})
```

### Step 3: Run test to verify it fails

- [ ] Run: `bun test src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts`
- Expected: FAIL

### Step 4: Implement GetDashboardSummaryService

- [ ] Create `src/Modules/Dashboard/Application/Services/GetDashboardSummaryService.ts`:

```typescript
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { UsageAggregator } from '../../Infrastructure/Services/UsageAggregator'
import type { DashboardSummaryResponse } from '../DTOs/DashboardDTO'

export class GetDashboardSummaryService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly usageAggregator: UsageAggregator,
  ) {}

  async execute(orgId: string, callerUserId: string, callerSystemRole: string): Promise<DashboardSummaryResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(orgId, callerUserId, callerSystemRole)
      if (!authResult.authorized) {
        return { success: false, message: '無權存取此組織的 Dashboard', error: authResult.error ?? 'NOT_ORG_MEMBER' }
      }

      const [keys, totalKeys, activeKeys] = await Promise.all([
        this.apiKeyRepository.findByOrgId(orgId),
        this.apiKeyRepository.countByOrgId(orgId),
        this.apiKeyRepository.countActiveByOrgId(orgId),
      ])

      const virtualKeyIds = keys
        .filter((k) => k.status === 'active')
        .map((k) => k.bifrostVirtualKeyId)

      const usage = await this.usageAggregator.getStats(virtualKeyIds)

      return {
        success: true,
        message: '查詢成功',
        data: { totalKeys, activeKeys, usage },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
```

### Step 5: Run test

- [ ] Run: `bun test src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts`
- Expected: PASS

### Step 6: Write GetUsageChartService tests

- [ ] Create `src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { GetUsageChartService } from '../Application/Services/GetUsageChartService'
import { ApiKeyRepository } from '@/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { UsageAggregator } from '../Infrastructure/Services/UsageAggregator'
import { ApiKey } from '@/Modules/ApiKey/Domain/Aggregates/ApiKey'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { BifrostLogEntry } from '@/Foundation/Infrastructure/Services/BifrostClient/types'

const sampleLog: BifrostLogEntry = {
  id: 'log-1', provider: 'openai', model: 'gpt-4', status: 'success',
  object: 'chat.completion', timestamp: '2026-04-08T10:00:00Z',
  latency: 200, cost: 0.03, virtual_key_id: 'bfr-vk-1',
  input_tokens: 100, output_tokens: 50, total_tokens: 150,
}

function createMockAggregator(): UsageAggregator {
  const mockClient = {
    getLogs: vi.fn().mockResolvedValue({ logs: [sampleLog], total: 1 }),
    getLogsStats: vi.fn().mockResolvedValue({
      total_requests: 1, total_cost: 0.03, total_tokens: 150, avg_latency: 200,
    }),
    listModels: vi.fn(),
  } as unknown as BifrostClient
  return new UsageAggregator(mockClient)
}

describe('GetUsageChartService', () => {
  let service: GetUsageChartService
  let db: MemoryDatabaseAccess

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    const apiKeyRepo = new ApiKeyRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const aggregator = createMockAggregator()
    service = new GetUsageChartService(apiKeyRepo, orgAuth, aggregator)

    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)

    const key = await ApiKey.create({
      id: 'key-1', orgId: 'org-1', createdByUserId: 'user-1',
      label: 'Key 1', bifrostVirtualKeyId: 'bfr-vk-1', rawKey: 'drp_sk_1',
    })
    await apiKeyRepo.save(key.activate())
  })

  it('應回傳用量 log 和統計', async () => {
    const result = await service.execute({ orgId: 'org-1', callerUserId: 'user-1', callerSystemRole: 'user' })
    expect(result.success).toBe(true)
    expect(result.data?.logs).toHaveLength(1)
    expect(result.data?.stats.totalRequests).toBe(1)
  })

  it('非 Org 成員不能存取用量資料', async () => {
    const result = await service.execute({ orgId: 'org-1', callerUserId: 'outsider', callerSystemRole: 'user' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })

  it('無 Key 的 Org 應回傳空結果', async () => {
    const result = await service.execute({ orgId: 'org-empty', callerUserId: 'user-1', callerSystemRole: 'admin' })
    expect(result.success).toBe(true)
    expect(result.data?.logs).toHaveLength(0)
  })
})
```

### Step 7: Run test to verify it fails

- [ ] Run: `bun test src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts`
- Expected: FAIL

### Step 8: Implement GetUsageChartService

- [ ] Create `src/Modules/Dashboard/Application/Services/GetUsageChartService.ts`:

```typescript
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { UsageAggregator } from '../../Infrastructure/Services/UsageAggregator'
import type { UsageChartQuery, UsageChartResponse } from '../DTOs/DashboardDTO'

export class GetUsageChartService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly usageAggregator: UsageAggregator,
  ) {}

  async execute(query: UsageChartQuery): Promise<UsageChartResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(
        query.orgId, query.callerUserId, query.callerSystemRole,
      )
      if (!authResult.authorized) {
        return { success: false, message: '無權存取此組織的用量資料', error: authResult.error ?? 'NOT_ORG_MEMBER' }
      }

      const keys = await this.apiKeyRepository.findByOrgId(query.orgId)
      const virtualKeyIds = keys
        .filter((k) => k.status === 'active')
        .map((k) => k.bifrostVirtualKeyId)

      if (virtualKeyIds.length === 0) {
        return {
          success: true,
          message: '查詢成功',
          data: {
            logs: [],
            stats: { totalRequests: 0, totalCost: 0, totalTokens: 0, avgLatency: 0 },
          },
        }
      }

      const bifrostQuery = {
        start_time: query.startTime,
        end_time: query.endTime,
        providers: query.providers,
        models: query.models,
        limit: query.limit,
      }

      const [logs, stats] = await Promise.all([
        this.usageAggregator.getLogs(virtualKeyIds, bifrostQuery),
        this.usageAggregator.getStats(virtualKeyIds, bifrostQuery),
      ])

      return {
        success: true,
        message: '查詢成功',
        data: {
          logs: logs.map((l) => ({ ...l })),
          stats,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
```

### Step 9: Run tests

- [ ] Run: `bun test src/Modules/Dashboard/__tests__/`
- Expected: ALL PASS

### Step 10: Commit

- [ ] ```bash
git add src/Modules/Dashboard/Application/ src/Modules/Dashboard/__tests__/GetDashboardSummaryService.test.ts src/Modules/Dashboard/__tests__/GetUsageChartService.test.ts
git commit -m "feat: [dashboard] 新增 Dashboard DTOs、GetDashboardSummaryService、GetUsageChartService"
```

---

## Task 11: Dashboard Controller + Routes + ServiceProvider + Wiring

**Files:**
- Create: `src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts`
- Create: `src/Modules/Dashboard/Presentation/Routes/dashboard.routes.ts`
- Create: `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts`
- Create: `src/Modules/Dashboard/index.ts`
- Modify: `src/bootstrap.ts`
- Modify: `src/routes.ts`
- Modify: `src/wiring/index.ts`

### Step 1: Create DashboardController

- [ ] Create `src/Modules/Dashboard/Presentation/Controllers/DashboardController.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { GetDashboardSummaryService } from '../../Application/Services/GetDashboardSummaryService'
import type { GetUsageChartService } from '../../Application/Services/GetUsageChartService'

export class DashboardController {
  constructor(
    private readonly summaryService: GetDashboardSummaryService,
    private readonly usageChartService: GetUsageChartService,
  ) {}

  async summary(ctx: IHttpContext) {
    const user = AuthMiddleware.getUser(ctx)
    const orgId = ctx.req.param('orgId')
    const result = await this.summaryService.execute(orgId, user.id, user.role)
    return ctx.json(result)
  }

  async usage(ctx: IHttpContext) {
    const user = AuthMiddleware.getUser(ctx)
    const orgId = ctx.req.param('orgId')
    const url = new URL(ctx.req.url)
    const result = await this.usageChartService.execute({
      orgId,
      callerUserId: user.id,
      callerSystemRole: user.role,
      startTime: url.searchParams.get('start_time') ?? undefined,
      endTime: url.searchParams.get('end_time') ?? undefined,
      providers: url.searchParams.get('providers') ?? undefined,
      models: url.searchParams.get('models') ?? undefined,
      limit: url.searchParams.has('limit')
        ? parseInt(url.searchParams.get('limit')!, 10)
        : undefined,
    })
    return ctx.json(result)
  }
}
```

### Step 2: Create routes

- [ ] Create `src/Modules/Dashboard/Presentation/Routes/dashboard.routes.ts`:

```typescript
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { DashboardController } from '../Controllers/DashboardController'
import { requireAuth } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'

export async function registerDashboardRoutes(
  router: IModuleRouter,
  controller: DashboardController,
): Promise<void> {
  router.get('/api/organizations/:orgId/dashboard', [requireAuth()], (ctx) => controller.summary(ctx))
  router.get('/api/organizations/:orgId/dashboard/usage', [requireAuth()], (ctx) => controller.usage(ctx))
}
```

### Step 3: Create ServiceProvider

- [ ] Create `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts`:

```typescript
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { UsageAggregator } from '../Services/UsageAggregator'
import { GetDashboardSummaryService } from '../../Application/Services/GetDashboardSummaryService'
import { GetUsageChartService } from '../../Application/Services/GetUsageChartService'

export class DashboardServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('usageAggregator', (c: IContainer) => {
      return new UsageAggregator(c.make('bifrostClient') as BifrostClient)
    })

    container.bind('getDashboardSummaryService', (c: IContainer) => {
      return new GetDashboardSummaryService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('usageAggregator') as UsageAggregator,
      )
    })

    container.bind('getUsageChartService', (c: IContainer) => {
      return new GetUsageChartService(
        c.make('apiKeyRepository') as IApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('usageAggregator') as UsageAggregator,
      )
    })
  }

  override boot(_context: unknown): void {
    console.log('📊 [Dashboard] Module loaded')
  }
}
```

### Step 4: Create module index

- [ ] Create `src/Modules/Dashboard/index.ts`:

```typescript
export { GetDashboardSummaryService } from './Application/Services/GetDashboardSummaryService'
export { GetUsageChartService } from './Application/Services/GetUsageChartService'
export { UsageAggregator } from './Infrastructure/Services/UsageAggregator'
export { DashboardServiceProvider } from './Infrastructure/Providers/DashboardServiceProvider'
export { DashboardController } from './Presentation/Controllers/DashboardController'
export { registerDashboardRoutes } from './Presentation/Routes/dashboard.routes'
```

### Step 5: Wire into bootstrap.ts

- [ ] Modify `src/bootstrap.ts` — add import and register:

Import:
```typescript
import { DashboardServiceProvider } from './Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider'
```

Register (after ApiKeyServiceProvider):
```typescript
core.register(createGravitoServiceProvider(new DashboardServiceProvider()))
```

### Step 6: Wire into routes.ts

- [ ] Modify `src/routes.ts` — add import and call:

Import:
```typescript
import { registerDashboard } from './wiring'
```

Call (after `registerApiKey(core)`):
```typescript
registerDashboard(core)
```

### Step 7: Wire into wiring/index.ts

- [ ] Modify `src/wiring/index.ts` — add at the bottom:

```typescript
import { DashboardController, registerDashboardRoutes } from '@/Modules/Dashboard'

/**
 * 註冊 Dashboard 模組
 */
export const registerDashboard = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const controller = new DashboardController(
    core.container.make('getDashboardSummaryService') as any,
    core.container.make('getUsageChartService') as any,
  )
  void registerDashboardRoutes(router, controller)
}
```

### Step 8: Run all tests

- [ ] Run: `bun test`
- Expected: ALL PASS

### Step 9: Commit

- [ ] ```bash
git add src/Modules/Dashboard/Presentation/ src/Modules/Dashboard/Infrastructure/Providers/ src/Modules/Dashboard/index.ts src/bootstrap.ts src/routes.ts src/wiring/index.ts
git commit -m "feat: [dashboard] 新增 Controller、Routes、ServiceProvider、Wiring 完成模組整合"
```

---

## Task 12: OrgMember Repository — 補充 findByOrgAndUser 方法

> **注意：** CreateApiKeyService 需要 `IOrganizationMemberRepository.findByOrgAndUser(orgId, userId)` 方法。若此方法在 Phase 2 尚未實作，需在此補上。

**Files:**
- Modify: `src/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository.ts`
- Modify: `src/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository.ts`

### Step 1: Check if findByOrgAndUser exists

- [ ] Search for `findByOrgAndUser` in the Organization module. If it already exists, skip this task entirely.

### Step 2: Add to Port interface (if missing)

- [ ] Modify `src/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository.ts` — add:

```typescript
findByOrgAndUser(orgId: string, userId: string): Promise<OrganizationMember | null>
```

### Step 3: Add implementation (if missing)

- [ ] Modify `src/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository.ts` — add:

```typescript
async findByOrgAndUser(orgId: string, userId: string): Promise<OrganizationMember | null> {
  const row = await this.db.table('organization_members')
    .where('organization_id', '=', orgId)
    .where('user_id', '=', userId)
    .first()
  return row ? OrganizationMember.fromDatabase(row) : null
}
```

### Step 4: Run existing Organization tests to ensure no breakage

- [ ] Run: `bun test src/Modules/Organization/`
- Expected: ALL PASS

### Step 5: Commit (if changes were made)

- [ ] ```bash
git add src/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository.ts src/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository.ts
git commit -m "feat: [org] 補充 findByOrgAndUser 方法（供 ApiKey 模組使用）"
```

---

## Task 13: Final Integration — 全測試 + Phase Gate

### Step 1: Run all tests

- [ ] Run: `bun test`
- Expected: ALL PASS

### Step 2: Check coverage

- [ ] Run: `bun test --coverage`
- Expected: ≥ 80% coverage for ApiKey and Dashboard modules

### Step 3: Verify API routes

- [ ] Run: `bun dev` and confirm the server starts without errors. Check for these log lines:
```
🔑 [ApiKey] Module loaded
📊 [Dashboard] Module loaded
```

### Step 4: Commit any final fixes

- [ ] If any fixes were needed, commit them:
```bash
git commit -m "fix: [phase3] 整合修正"
```

---

## API Endpoints Summary

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/organizations/:orgId/keys` | 建立 API Key | requireAuth |
| `GET` | `/api/organizations/:orgId/keys` | 列出 Org 的 API Keys | requireAuth |
| `POST` | `/api/keys/:keyId/revoke` | 撤銷 API Key | requireAuth |
| `PATCH` | `/api/keys/:keyId/label` | 更新 Key 標籤 | requireAuth |
| `PUT` | `/api/keys/:keyId/permissions` | 設定 Key 權限 | requireAuth |
| `GET` | `/api/organizations/:orgId/dashboard` | Dashboard 摘要 | requireAuth |
| `GET` | `/api/organizations/:orgId/dashboard/usage` | 用量時序資料 | requireAuth |

## Phase 3 完成標準對照

- [x] API Key 完整生命週期：建立 → 使用 → 停用 → 刪除 — Tasks 5-7
- [x] Draupnir Key 與 Bifrost Virtual Key 正確同步 — Task 4
- [x] Key 權限設定可限制模型與速率 — Task 7
- [x] Dashboard API 回傳正確的用量聚合資料 — Tasks 9-11
- [x] 測試覆蓋率 ≥ 80% — Task 13
