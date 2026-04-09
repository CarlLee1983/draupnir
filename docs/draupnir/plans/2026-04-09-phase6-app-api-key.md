# Phase 6.1: AppApiKey 模組實作計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作應用層級 API Key（`drp_app_xxxx`）的配發、輪換、撤銷、Scope 管理，支援 SDK/CLI/第三方開發者使用 Draupnir 服務

**Architecture:** 遵循現有 DDD 模組模式（與 ApiKey 模組平行），新增 AppApiKey 模組於 `src/Modules/AppApiKey/`。AppApiKey 有獨立的 Scope 系統（READ | WRITE | ADMIN）、模組綁定（BoundModules）、Key 輪換機制（grace period）。透過 BifrostClient 同步 Virtual Key，獨立追蹤用量並可歸屬至不同 Org。

**Tech Stack:** Bun + TypeScript, Vitest, Gravito DDD Framework, MemoryDatabaseAccess (tests), IDatabaseAccess (ORM-agnostic)

**Related Plans (Phase 6):**
- `2026-04-09-phase6-sdk-api.md` — SDK Backend API（依賴本計劃）
- `2026-04-09-phase6-cli-api.md` — CLI Backend API（依賴本計劃）
- `2026-04-09-phase6-dev-portal.md` — Developer Portal API（依賴本計劃）

---

## File Structure

```
src/Modules/AppApiKey/
├── Domain/
│   ├── Aggregates/
│   │   └── AppApiKey.ts                    # 應用 Key 聚合根
│   ├── ValueObjects/
│   │   ├── AppKeyScope.ts                  # READ | WRITE | ADMIN scope
│   │   ├── KeyRotationPolicy.ts            # 輪換策略（自動到期 + 寬限期）
│   │   └── BoundModules.ts                 # 綁定的 AppModule 列表
│   ├── Repositories/
│   │   └── IAppApiKeyRepository.ts         # Repository 介面
│   └── Events/
│       └── AppApiKeyEvents.ts              # Domain events
├── Application/
│   ├── DTOs/
│   │   └── AppApiKeyDTO.ts                 # Request/Response DTOs
│   └── Services/
│       ├── IssueAppKeyService.ts           # 配發新 App Key
│       ├── RotateAppKeyService.ts          # Key 輪換（新舊並存 grace period）
│       ├── RevokeAppKeyService.ts          # 撤銷 App Key
│       ├── SetAppKeyScopeService.ts        # 更新 Scope + 綁定模組
│       └── GetAppKeyUsageService.ts        # 查詢 App Key 用量
├── Infrastructure/
│   ├── Repositories/
│   │   └── AppApiKeyRepository.ts          # IDatabaseAccess 實作
│   ├── Services/
│   │   └── AppKeyBifrostSync.ts            # Bifrost Virtual Key 同步
│   └── Providers/
│       └── AppApiKeyServiceProvider.ts     # DI 註冊
├── Presentation/
│   ├── Controllers/
│   │   └── AppApiKeyController.ts          # HTTP handlers
│   └── Routes/
│       └── appApiKey.routes.ts             # 路由定義
├── __tests__/
│   ├── AppApiKey.test.ts                   # Aggregate 單元測試
│   ├── AppKeyScope.test.ts                 # ValueObject 測試
│   ├── KeyRotationPolicy.test.ts           # ValueObject 測試
│   ├── BoundModules.test.ts                # ValueObject 測試
│   ├── IssueAppKeyService.test.ts          # Service 測試
│   ├── RotateAppKeyService.test.ts         # Service 測試
│   ├── RevokeAppKeyService.test.ts         # Service 測試
│   ├── SetAppKeyScopeService.test.ts       # Service 測試
│   └── GetAppKeyUsageService.test.ts       # Service 測試
└── index.ts                                # Barrel exports

database/migrations/
└── 2026_04_10_000001_create_app_api_keys_table.ts

src/wiring/index.ts                         # 新增 registerAppApiKey
src/bootstrap.ts                            # 新增 AppApiKeyServiceProvider
src/routes.ts                               # 新增 registerAppApiKey 呼叫
```

---

### Task 1: AppKeyScope ValueObject

**Files:**
- Create: `src/Modules/AppApiKey/Domain/ValueObjects/AppKeyScope.ts`
- Test: `src/Modules/AppApiKey/__tests__/AppKeyScope.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/AppApiKey/__tests__/AppKeyScope.test.ts
import { describe, it, expect } from 'vitest'
import { AppKeyScope } from '../Domain/ValueObjects/AppKeyScope'

describe('AppKeyScope', () => {
  it('應建立 READ scope', () => {
    const scope = AppKeyScope.read()
    expect(scope.getValue()).toBe('read')
    expect(scope.canRead()).toBe(true)
    expect(scope.canWrite()).toBe(false)
    expect(scope.isAdmin()).toBe(false)
  })

  it('應建立 WRITE scope', () => {
    const scope = AppKeyScope.write()
    expect(scope.getValue()).toBe('write')
    expect(scope.canRead()).toBe(true)
    expect(scope.canWrite()).toBe(true)
    expect(scope.isAdmin()).toBe(false)
  })

  it('應建立 ADMIN scope', () => {
    const scope = AppKeyScope.admin()
    expect(scope.getValue()).toBe('admin')
    expect(scope.canRead()).toBe(true)
    expect(scope.canWrite()).toBe(true)
    expect(scope.isAdmin()).toBe(true)
  })

  it('應從字串建立 scope', () => {
    const scope = AppKeyScope.from('write')
    expect(scope.getValue()).toBe('write')
  })

  it('無效值應拋出錯誤', () => {
    expect(() => AppKeyScope.from('invalid')).toThrow('無效的 App Key Scope')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/AppApiKey/__tests__/AppKeyScope.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/AppApiKey/Domain/ValueObjects/AppKeyScope.ts
export const AppKeyScopeValues = ['read', 'write', 'admin'] as const
export type AppKeyScopeType = (typeof AppKeyScopeValues)[number]

export class AppKeyScope {
  private constructor(private readonly value: AppKeyScopeType) {}

  static read(): AppKeyScope {
    return new AppKeyScope('read')
  }

  static write(): AppKeyScope {
    return new AppKeyScope('write')
  }

  static admin(): AppKeyScope {
    return new AppKeyScope('admin')
  }

  static from(value: string): AppKeyScope {
    if (!AppKeyScopeValues.includes(value as AppKeyScopeType)) {
      throw new Error(`無效的 App Key Scope: ${value}`)
    }
    return new AppKeyScope(value as AppKeyScopeType)
  }

  canRead(): boolean {
    return true // all scopes can read
  }

  canWrite(): boolean {
    return this.value === 'write' || this.value === 'admin'
  }

  isAdmin(): boolean {
    return this.value === 'admin'
  }

  getValue(): AppKeyScopeType {
    return this.value
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/AppApiKey/__tests__/AppKeyScope.test.ts`
Expected: PASS — all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/AppApiKey/Domain/ValueObjects/AppKeyScope.ts src/Modules/AppApiKey/__tests__/AppKeyScope.test.ts
git commit -m "feat: [AppApiKey] 新增 AppKeyScope ValueObject（READ/WRITE/ADMIN）"
```

---

### Task 2: KeyRotationPolicy ValueObject

**Files:**
- Create: `src/Modules/AppApiKey/Domain/ValueObjects/KeyRotationPolicy.ts`
- Test: `src/Modules/AppApiKey/__tests__/KeyRotationPolicy.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/AppApiKey/__tests__/KeyRotationPolicy.test.ts
import { describe, it, expect } from 'vitest'
import { KeyRotationPolicy } from '../Domain/ValueObjects/KeyRotationPolicy'

describe('KeyRotationPolicy', () => {
  it('應建立預設策略（手動輪換，24h 寬限期）', () => {
    const policy = KeyRotationPolicy.manual()
    expect(policy.isAutoRotate()).toBe(false)
    expect(policy.getGracePeriodHours()).toBe(24)
  })

  it('應建立自動輪換策略', () => {
    const policy = KeyRotationPolicy.auto(90, 48)
    expect(policy.isAutoRotate()).toBe(true)
    expect(policy.getRotationIntervalDays()).toBe(90)
    expect(policy.getGracePeriodHours()).toBe(48)
  })

  it('輪換天數不能為零或負數', () => {
    expect(() => KeyRotationPolicy.auto(0, 24)).toThrow('輪換間隔天數必須大於 0')
    expect(() => KeyRotationPolicy.auto(-1, 24)).toThrow('輪換間隔天數必須大於 0')
  })

  it('寬限期不能為負數', () => {
    expect(() => KeyRotationPolicy.auto(90, -1)).toThrow('寬限期時數不能為負數')
  })

  it('應正確序列化/反序列化 JSON', () => {
    const policy = KeyRotationPolicy.auto(90, 48)
    const json = policy.toJSON()
    expect(json).toEqual({
      auto_rotate: true,
      rotation_interval_days: 90,
      grace_period_hours: 48,
    })
    const restored = KeyRotationPolicy.fromJSON(json)
    expect(restored.isAutoRotate()).toBe(true)
    expect(restored.getRotationIntervalDays()).toBe(90)
    expect(restored.getGracePeriodHours()).toBe(48)
  })

  it('手動策略序列化不含 rotation_interval_days', () => {
    const policy = KeyRotationPolicy.manual(12)
    const json = policy.toJSON()
    expect(json).toEqual({
      auto_rotate: false,
      rotation_interval_days: null,
      grace_period_hours: 12,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/AppApiKey/__tests__/KeyRotationPolicy.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/AppApiKey/Domain/ValueObjects/KeyRotationPolicy.ts
export interface KeyRotationPolicyJSON {
  auto_rotate: boolean
  rotation_interval_days: number | null
  grace_period_hours: number
}

export class KeyRotationPolicy {
  private constructor(
    private readonly autoRotate: boolean,
    private readonly rotationIntervalDays: number | null,
    private readonly gracePeriodHours: number,
  ) {}

  static manual(gracePeriodHours = 24): KeyRotationPolicy {
    if (gracePeriodHours < 0) {
      throw new Error('寬限期時數不能為負數')
    }
    return new KeyRotationPolicy(false, null, gracePeriodHours)
  }

  static auto(rotationIntervalDays: number, gracePeriodHours = 24): KeyRotationPolicy {
    if (rotationIntervalDays <= 0) {
      throw new Error('輪換間隔天數必須大於 0')
    }
    if (gracePeriodHours < 0) {
      throw new Error('寬限期時數不能為負數')
    }
    return new KeyRotationPolicy(true, rotationIntervalDays, gracePeriodHours)
  }

  static fromJSON(json: KeyRotationPolicyJSON): KeyRotationPolicy {
    return new KeyRotationPolicy(
      json.auto_rotate,
      json.rotation_interval_days,
      json.grace_period_hours,
    )
  }

  isAutoRotate(): boolean {
    return this.autoRotate
  }

  getRotationIntervalDays(): number | null {
    return this.rotationIntervalDays
  }

  getGracePeriodHours(): number {
    return this.gracePeriodHours
  }

  toJSON(): KeyRotationPolicyJSON {
    return {
      auto_rotate: this.autoRotate,
      rotation_interval_days: this.rotationIntervalDays,
      grace_period_hours: this.gracePeriodHours,
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/AppApiKey/__tests__/KeyRotationPolicy.test.ts`
Expected: PASS — all 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/AppApiKey/Domain/ValueObjects/KeyRotationPolicy.ts src/Modules/AppApiKey/__tests__/KeyRotationPolicy.test.ts
git commit -m "feat: [AppApiKey] 新增 KeyRotationPolicy ValueObject（手動/自動輪換 + 寬限期）"
```

---

### Task 3: BoundModules ValueObject

**Files:**
- Create: `src/Modules/AppApiKey/Domain/ValueObjects/BoundModules.ts`
- Test: `src/Modules/AppApiKey/__tests__/BoundModules.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/AppApiKey/__tests__/BoundModules.test.ts
import { describe, it, expect } from 'vitest'
import { BoundModules } from '../Domain/ValueObjects/BoundModules'

describe('BoundModules', () => {
  it('應建立空的模組綁定', () => {
    const bound = BoundModules.empty()
    expect(bound.getModuleIds()).toEqual([])
    expect(bound.isEmpty()).toBe(true)
  })

  it('應從模組 ID 列表建立', () => {
    const bound = BoundModules.from(['mod-1', 'mod-2'])
    expect(bound.getModuleIds()).toEqual(['mod-1', 'mod-2'])
    expect(bound.isEmpty()).toBe(false)
  })

  it('應去除重複的模組 ID', () => {
    const bound = BoundModules.from(['mod-1', 'mod-1', 'mod-2'])
    expect(bound.getModuleIds()).toEqual(['mod-1', 'mod-2'])
  })

  it('應檢查是否包含特定模組', () => {
    const bound = BoundModules.from(['mod-1', 'mod-2'])
    expect(bound.includes('mod-1')).toBe(true)
    expect(bound.includes('mod-3')).toBe(false)
  })

  it('空綁定應對任何模組回傳 true（不限制）', () => {
    const bound = BoundModules.empty()
    expect(bound.allowsAccess('any-module')).toBe(true)
  })

  it('非空綁定只允許已綁定的模組', () => {
    const bound = BoundModules.from(['mod-1'])
    expect(bound.allowsAccess('mod-1')).toBe(true)
    expect(bound.allowsAccess('mod-2')).toBe(false)
  })

  it('應正確序列化為 JSON', () => {
    const bound = BoundModules.from(['mod-1', 'mod-2'])
    const json = bound.toJSON()
    expect(json).toEqual(['mod-1', 'mod-2'])
  })

  it('應從 JSON 反序列化', () => {
    const bound = BoundModules.fromJSON(['mod-1', 'mod-2'])
    expect(bound.getModuleIds()).toEqual(['mod-1', 'mod-2'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/AppApiKey/__tests__/BoundModules.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/AppApiKey/Domain/ValueObjects/BoundModules.ts
export class BoundModules {
  private constructor(private readonly moduleIds: readonly string[]) {}

  static empty(): BoundModules {
    return new BoundModules([])
  }

  static from(moduleIds: string[]): BoundModules {
    const unique = [...new Set(moduleIds)]
    return new BoundModules(unique)
  }

  static fromJSON(json: string[]): BoundModules {
    return BoundModules.from(json)
  }

  getModuleIds(): readonly string[] {
    return this.moduleIds
  }

  isEmpty(): boolean {
    return this.moduleIds.length === 0
  }

  includes(moduleId: string): boolean {
    return this.moduleIds.includes(moduleId)
  }

  allowsAccess(moduleId: string): boolean {
    if (this.isEmpty()) return true
    return this.includes(moduleId)
  }

  toJSON(): string[] {
    return [...this.moduleIds]
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/AppApiKey/__tests__/BoundModules.test.ts`
Expected: PASS — all 8 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/AppApiKey/Domain/ValueObjects/BoundModules.ts src/Modules/AppApiKey/__tests__/BoundModules.test.ts
git commit -m "feat: [AppApiKey] 新增 BoundModules ValueObject（模組綁定與存取控制）"
```

---

### Task 4: AppApiKey Aggregate Root

**Files:**
- Create: `src/Modules/AppApiKey/Domain/Aggregates/AppApiKey.ts`
- Test: `src/Modules/AppApiKey/__tests__/AppApiKey.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/AppApiKey/__tests__/AppApiKey.test.ts
import { describe, it, expect } from 'vitest'
import { AppApiKey } from '../Domain/Aggregates/AppApiKey'
import { AppKeyScope } from '../Domain/ValueObjects/AppKeyScope'
import { KeyRotationPolicy } from '../Domain/ValueObjects/KeyRotationPolicy'
import { BoundModules } from '../Domain/ValueObjects/BoundModules'

describe('AppApiKey', () => {
  const defaultParams = {
    id: 'appkey-1',
    orgId: 'org-1',
    issuedByUserId: 'user-1',
    label: 'My SDK Key',
    bifrostVirtualKeyId: 'bfr-vk-app-1',
    rawKey: 'drp_app_test123abc',
  }

  it('應建立新的 AppApiKey（初始為 pending 狀態）', async () => {
    const key = await AppApiKey.create(defaultParams)
    expect(key.id).toBe('appkey-1')
    expect(key.orgId).toBe('org-1')
    expect(key.issuedByUserId).toBe('user-1')
    expect(key.label).toBe('My SDK Key')
    expect(key.status).toBe('pending')
    expect(key.keyHashValue).toMatch(/^[a-f0-9]{64}$/)
    expect(key.appKeyScope.getValue()).toBe('read')
    expect(key.rotationPolicy.isAutoRotate()).toBe(false)
    expect(key.boundModules.isEmpty()).toBe(true)
    expect(key.previousKeyHash).toBeNull()
    expect(key.gracePeriodEndsAt).toBeNull()
  })

  it('應建立帶自訂 scope 和綁定模組的 Key', async () => {
    const key = await AppApiKey.create({
      ...defaultParams,
      id: 'appkey-2',
      rawKey: 'drp_app_custom',
      scope: AppKeyScope.admin(),
      rotationPolicy: KeyRotationPolicy.auto(90, 48),
      boundModules: BoundModules.from(['mod-1', 'mod-2']),
    })
    expect(key.appKeyScope.getValue()).toBe('admin')
    expect(key.rotationPolicy.isAutoRotate()).toBe(true)
    expect(key.rotationPolicy.getRotationIntervalDays()).toBe(90)
    expect(key.boundModules.getModuleIds()).toEqual(['mod-1', 'mod-2'])
  })

  it('activate 應將 pending 轉為 active', async () => {
    const key = await AppApiKey.create(defaultParams)
    const activated = key.activate()
    expect(activated.status).toBe('active')
  })

  it('已 active 的 key 不能再 activate', async () => {
    const key = await AppApiKey.create(defaultParams)
    const activated = key.activate()
    expect(() => activated.activate()).toThrow()
  })

  it('revoke 應將 active 轉為 revoked', async () => {
    const key = await AppApiKey.create(defaultParams)
    const revoked = key.activate().revoke()
    expect(revoked.status).toBe('revoked')
    expect(revoked.revokedAt).toBeInstanceOf(Date)
  })

  it('rotate 應設定 previousKeyHash 和 gracePeriodEndsAt', async () => {
    const key = await AppApiKey.create(defaultParams)
    const active = key.activate()
    const rotated = await active.rotate('drp_app_newkey123', 'bfr-vk-new-1')
    expect(rotated.status).toBe('active')
    expect(rotated.previousKeyHash).toBeTruthy()
    expect(rotated.previousKeyHash).toMatch(/^[a-f0-9]{64}$/)
    expect(rotated.gracePeriodEndsAt).toBeInstanceOf(Date)
    expect(rotated.keyHashValue).not.toBe(active.keyHashValue)
    expect(rotated.bifrostVirtualKeyId).toBe('bfr-vk-new-1')
  })

  it('非 active 狀態不能輪換', async () => {
    const key = await AppApiKey.create(defaultParams)
    await expect(key.rotate('drp_app_new', 'bfr-vk-new')).rejects.toThrow('只有 active 狀態的 Key 可以輪換')
  })

  it('completeRotation 應清除 previousKeyHash 和 gracePeriodEndsAt', async () => {
    const key = await AppApiKey.create(defaultParams)
    const active = key.activate()
    const rotated = await active.rotate('drp_app_newkey123', 'bfr-vk-new-1')
    const completed = rotated.completeRotation()
    expect(completed.previousKeyHash).toBeNull()
    expect(completed.gracePeriodEndsAt).toBeNull()
  })

  it('updateScope 應更新 scope', async () => {
    const key = await AppApiKey.create(defaultParams)
    const updated = key.activate().updateScope(AppKeyScope.write())
    expect(updated.appKeyScope.getValue()).toBe('write')
  })

  it('updateBoundModules 應更新綁定模組', async () => {
    const key = await AppApiKey.create(defaultParams)
    const updated = key.activate().updateBoundModules(BoundModules.from(['mod-3']))
    expect(updated.boundModules.getModuleIds()).toEqual(['mod-3'])
  })

  it('已撤銷的 Key 不能更新 scope', async () => {
    const key = await AppApiKey.create(defaultParams)
    const revoked = key.activate().revoke()
    expect(() => revoked.updateScope(AppKeyScope.admin())).toThrow('已撤銷')
  })

  it('toDatabaseRow 應正確轉換為 snake_case', async () => {
    const key = await AppApiKey.create({
      ...defaultParams,
      scope: AppKeyScope.write(),
      boundModules: BoundModules.from(['mod-1']),
    })
    const row = key.toDatabaseRow()
    expect(row.id).toBe('appkey-1')
    expect(row.org_id).toBe('org-1')
    expect(row.issued_by_user_id).toBe('user-1')
    expect(row.label).toBe('My SDK Key')
    expect(row.key_hash).toMatch(/^[a-f0-9]{64}$/)
    expect(row.status).toBe('pending')
    expect(row.scope).toBe('write')
    expect(row.bound_modules).toBe('["mod-1"]')
    expect(row.previous_key_hash).toBeNull()
    expect(row.grace_period_ends_at).toBeNull()
  })

  it('fromDatabase 應正確重建', async () => {
    const key = await AppApiKey.create(defaultParams)
    const row = key.toDatabaseRow()
    const rebuilt = AppApiKey.fromDatabase(row)
    expect(rebuilt.id).toBe('appkey-1')
    expect(rebuilt.label).toBe('My SDK Key')
    expect(rebuilt.status).toBe('pending')
    expect(rebuilt.appKeyScope.getValue()).toBe('read')
  })

  it('toDTO 應使用 camelCase 且隱藏 hash', async () => {
    const key = await AppApiKey.create(defaultParams)
    const dto = key.toDTO()
    expect(dto.id).toBe('appkey-1')
    expect(dto.orgId).toBe('org-1')
    expect(dto.keyPrefix).toMatch(/^drp_app_\.\.\./)
    expect(dto.scope).toBe('read')
    expect(dto).not.toHaveProperty('keyHash')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/AppApiKey/__tests__/AppApiKey.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/AppApiKey/Domain/Aggregates/AppApiKey.ts
import { KeyHash } from '@/Modules/ApiKey/Domain/ValueObjects/KeyHash'
import { KeyLabel } from '@/Modules/ApiKey/Domain/ValueObjects/KeyLabel'
import { KeyStatus } from '@/Modules/ApiKey/Domain/ValueObjects/KeyStatus'
import { AppKeyScope } from '../ValueObjects/AppKeyScope'
import { KeyRotationPolicy, type KeyRotationPolicyJSON } from '../ValueObjects/KeyRotationPolicy'
import { BoundModules } from '../ValueObjects/BoundModules'

interface AppApiKeyProps {
  readonly id: string
  readonly orgId: string
  readonly issuedByUserId: string
  readonly label: KeyLabel
  readonly keyHash: KeyHash
  readonly bifrostVirtualKeyId: string
  readonly status: KeyStatus
  readonly scope: AppKeyScope
  readonly rotationPolicy: KeyRotationPolicy
  readonly boundModules: BoundModules
  readonly previousKeyHash: string | null
  readonly previousBifrostVirtualKeyId: string | null
  readonly gracePeriodEndsAt: Date | null
  readonly expiresAt: Date | null
  readonly revokedAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

interface CreateAppApiKeyParams {
  id: string
  orgId: string
  issuedByUserId: string
  label: string
  bifrostVirtualKeyId: string
  rawKey: string
  scope?: AppKeyScope
  rotationPolicy?: KeyRotationPolicy
  boundModules?: BoundModules
  expiresAt?: Date | null
}

export class AppApiKey {
  private readonly props: AppApiKeyProps

  private constructor(props: AppApiKeyProps) {
    this.props = props
  }

  static async create(params: CreateAppApiKeyParams): Promise<AppApiKey> {
    const keyHash = await KeyHash.fromRawKey(params.rawKey)
    return new AppApiKey({
      id: params.id,
      orgId: params.orgId,
      issuedByUserId: params.issuedByUserId,
      label: new KeyLabel(params.label),
      keyHash,
      bifrostVirtualKeyId: params.bifrostVirtualKeyId,
      status: KeyStatus.pending(),
      scope: params.scope ?? AppKeyScope.read(),
      rotationPolicy: params.rotationPolicy ?? KeyRotationPolicy.manual(),
      boundModules: params.boundModules ?? BoundModules.empty(),
      previousKeyHash: null,
      previousBifrostVirtualKeyId: null,
      gracePeriodEndsAt: null,
      expiresAt: params.expiresAt ?? null,
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): AppApiKey {
    const rotationPolicyJson: KeyRotationPolicyJSON =
      typeof row.rotation_policy === 'string'
        ? JSON.parse(row.rotation_policy as string)
        : (row.rotation_policy as KeyRotationPolicyJSON)

    const boundModulesJson: string[] =
      typeof row.bound_modules === 'string'
        ? JSON.parse(row.bound_modules as string)
        : ((row.bound_modules as string[]) ?? [])

    return new AppApiKey({
      id: row.id as string,
      orgId: row.org_id as string,
      issuedByUserId: row.issued_by_user_id as string,
      label: new KeyLabel(row.label as string),
      keyHash: KeyHash.fromExisting(row.key_hash as string),
      bifrostVirtualKeyId: row.bifrost_virtual_key_id as string,
      status: KeyStatus.from(row.status as string),
      scope: AppKeyScope.from(row.scope as string),
      rotationPolicy: KeyRotationPolicy.fromJSON(rotationPolicyJson),
      boundModules: BoundModules.fromJSON(boundModulesJson),
      previousKeyHash: (row.previous_key_hash as string) ?? null,
      previousBifrostVirtualKeyId: (row.previous_bifrost_virtual_key_id as string) ?? null,
      gracePeriodEndsAt: row.grace_period_ends_at
        ? new Date(row.grace_period_ends_at as string)
        : null,
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
      revokedAt: row.revoked_at ? new Date(row.revoked_at as string) : null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    })
  }

  activate(): AppApiKey {
    if (!this.props.status.isPending()) {
      throw new Error('只有 pending 狀態的 Key 可以 activate')
    }
    return new AppApiKey({
      ...this.props,
      status: KeyStatus.active(),
      updatedAt: new Date(),
    })
  }

  revoke(): AppApiKey {
    if (this.props.status.isRevoked()) {
      throw new Error('此 Key 已撤銷')
    }
    if (this.props.status.isPending()) {
      throw new Error('pending 狀態的 Key 不能撤銷，請先 activate 或直接刪除')
    }
    return new AppApiKey({
      ...this.props,
      status: KeyStatus.revoked(),
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
  }

  async rotate(newRawKey: string, newBifrostVirtualKeyId: string): Promise<AppApiKey> {
    if (!this.props.status.isActive()) {
      throw new Error('只有 active 狀態的 Key 可以輪換')
    }
    const newKeyHash = await KeyHash.fromRawKey(newRawKey)
    const gracePeriodHours = this.props.rotationPolicy.getGracePeriodHours()
    const gracePeriodEndsAt = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000)

    return new AppApiKey({
      ...this.props,
      keyHash: newKeyHash,
      bifrostVirtualKeyId: newBifrostVirtualKeyId,
      previousKeyHash: this.props.keyHash.getValue(),
      previousBifrostVirtualKeyId: this.props.bifrostVirtualKeyId,
      gracePeriodEndsAt,
      updatedAt: new Date(),
    })
  }

  completeRotation(): AppApiKey {
    return new AppApiKey({
      ...this.props,
      previousKeyHash: null,
      previousBifrostVirtualKeyId: null,
      gracePeriodEndsAt: null,
      updatedAt: new Date(),
    })
  }

  updateScope(newScope: AppKeyScope): AppApiKey {
    if (this.props.status.isRevoked()) {
      throw new Error('已撤銷的 Key 不能更新 scope')
    }
    return new AppApiKey({
      ...this.props,
      scope: newScope,
      updatedAt: new Date(),
    })
  }

  updateBoundModules(newModules: BoundModules): AppApiKey {
    if (this.props.status.isRevoked()) {
      throw new Error('已撤銷的 Key 不能更新綁定模組')
    }
    return new AppApiKey({
      ...this.props,
      boundModules: newModules,
      updatedAt: new Date(),
    })
  }

  get id(): string { return this.props.id }
  get orgId(): string { return this.props.orgId }
  get issuedByUserId(): string { return this.props.issuedByUserId }
  get label(): string { return this.props.label.getValue() }
  get keyHashValue(): string { return this.props.keyHash.getValue() }
  get bifrostVirtualKeyId(): string { return this.props.bifrostVirtualKeyId }
  get status(): string { return this.props.status.getValue() }
  get appKeyScope(): AppKeyScope { return this.props.scope }
  get rotationPolicy(): KeyRotationPolicy { return this.props.rotationPolicy }
  get boundModules(): BoundModules { return this.props.boundModules }
  get previousKeyHash(): string | null { return this.props.previousKeyHash }
  get previousBifrostVirtualKeyId(): string | null { return this.props.previousBifrostVirtualKeyId }
  get gracePeriodEndsAt(): Date | null { return this.props.gracePeriodEndsAt }
  get expiresAt(): Date | null { return this.props.expiresAt }
  get revokedAt(): Date | null { return this.props.revokedAt }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      org_id: this.props.orgId,
      issued_by_user_id: this.props.issuedByUserId,
      label: this.props.label.getValue(),
      key_hash: this.props.keyHash.getValue(),
      bifrost_virtual_key_id: this.props.bifrostVirtualKeyId,
      status: this.props.status.getValue(),
      scope: this.props.scope.getValue(),
      rotation_policy: JSON.stringify(this.props.rotationPolicy.toJSON()),
      bound_modules: JSON.stringify(this.props.boundModules.toJSON()),
      previous_key_hash: this.props.previousKeyHash,
      previous_bifrost_virtual_key_id: this.props.previousBifrostVirtualKeyId,
      grace_period_ends_at: this.props.gracePeriodEndsAt?.toISOString() ?? null,
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
      issuedByUserId: this.props.issuedByUserId,
      label: this.props.label.getValue(),
      keyPrefix: `drp_app_...${this.props.keyHash.getValue().slice(-8)}`,
      bifrostVirtualKeyId: this.props.bifrostVirtualKeyId,
      status: this.props.status.getValue(),
      scope: this.props.scope.getValue(),
      rotationPolicy: this.props.rotationPolicy.toJSON(),
      boundModules: this.props.boundModules.toJSON(),
      isInGracePeriod: this.props.gracePeriodEndsAt != null,
      gracePeriodEndsAt: this.props.gracePeriodEndsAt?.toISOString() ?? null,
      expiresAt: this.props.expiresAt?.toISOString() ?? null,
      revokedAt: this.props.revokedAt?.toISOString() ?? null,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/AppApiKey/__tests__/AppApiKey.test.ts`
Expected: PASS — all 14 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/AppApiKey/Domain/Aggregates/AppApiKey.ts src/Modules/AppApiKey/__tests__/AppApiKey.test.ts
git commit -m "feat: [AppApiKey] 新增 AppApiKey Aggregate Root（配發、輪換、撤銷、Scope 管理）"
```

---

### Task 5: Domain Events

**Files:**
- Create: `src/Modules/AppApiKey/Domain/Events/AppApiKeyEvents.ts`

- [ ] **Step 1: Create domain events file**

```typescript
// src/Modules/AppApiKey/Domain/Events/AppApiKeyEvents.ts
export interface AppKeyCreatedEvent {
  readonly type: 'app_key.created'
  readonly data: {
    readonly keyId: string
    readonly orgId: string
    readonly issuedByUserId: string
    readonly scope: string
  }
  readonly occurredAt: Date
}

export interface AppKeyRotatedEvent {
  readonly type: 'app_key.rotated'
  readonly data: {
    readonly keyId: string
    readonly orgId: string
    readonly previousBifrostVirtualKeyId: string
    readonly newBifrostVirtualKeyId: string
    readonly gracePeriodEndsAt: string
  }
  readonly occurredAt: Date
}

export interface AppKeyRevokedEvent {
  readonly type: 'app_key.revoked'
  readonly data: {
    readonly keyId: string
    readonly orgId: string
    readonly bifrostVirtualKeyId: string
    readonly previousBifrostVirtualKeyId: string | null
  }
  readonly occurredAt: Date
}

export type AppApiKeyEvent = AppKeyCreatedEvent | AppKeyRotatedEvent | AppKeyRevokedEvent
```

- [ ] **Step 2: Commit**

```bash
git add src/Modules/AppApiKey/Domain/Events/AppApiKeyEvents.ts
git commit -m "feat: [AppApiKey] 新增 Domain Events（created/rotated/revoked）"
```

---

### Task 6: Repository Interface + Implementation

**Files:**
- Create: `src/Modules/AppApiKey/Domain/Repositories/IAppApiKeyRepository.ts`
- Create: `src/Modules/AppApiKey/Infrastructure/Repositories/AppApiKeyRepository.ts`

- [ ] **Step 1: Create repository interface**

```typescript
// src/Modules/AppApiKey/Domain/Repositories/IAppApiKeyRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { AppApiKey } from '../Aggregates/AppApiKey'

export interface IAppApiKeyRepository {
  findById(id: string): Promise<AppApiKey | null>
  findByOrgId(orgId: string, limit?: number, offset?: number): Promise<AppApiKey[]>
  findActiveByOrgId(orgId: string): Promise<AppApiKey[]>
  findByKeyHash(keyHash: string): Promise<AppApiKey | null>
  findByPreviousKeyHash(keyHash: string): Promise<AppApiKey | null>
  findWithExpiredGracePeriod(): Promise<AppApiKey[]>
  save(appApiKey: AppApiKey): Promise<void>
  update(appApiKey: AppApiKey): Promise<void>
  delete(id: string): Promise<void>
  countByOrgId(orgId: string): Promise<number>
  withTransaction(tx: IDatabaseAccess): IAppApiKeyRepository
}
```

- [ ] **Step 2: Create repository implementation**

```typescript
// src/Modules/AppApiKey/Infrastructure/Repositories/AppApiKeyRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import { AppApiKey } from '../../Domain/Aggregates/AppApiKey'

export class AppApiKeyRepository implements IAppApiKeyRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findById(id: string): Promise<AppApiKey | null> {
    const row = await this.db.table('app_api_keys').where('id', '=', id).first()
    return row ? AppApiKey.fromDatabase(row) : null
  }

  async findByOrgId(orgId: string, limit?: number, offset?: number): Promise<AppApiKey[]> {
    let query = this.db.table('app_api_keys').where('org_id', '=', orgId).orderBy('created_at', 'DESC')
    if (offset != null && offset > 0) {
      query = query.offset(offset)
    }
    if (limit != null) {
      query = query.limit(limit)
    }
    const rows = await query.select()
    return rows.map((row) => AppApiKey.fromDatabase(row))
  }

  async findActiveByOrgId(orgId: string): Promise<AppApiKey[]> {
    const rows = await this.db
      .table('app_api_keys')
      .where('org_id', '=', orgId)
      .where('status', '=', 'active')
      .select()
    return rows.map((row) => AppApiKey.fromDatabase(row))
  }

  async findByKeyHash(keyHash: string): Promise<AppApiKey | null> {
    const row = await this.db.table('app_api_keys').where('key_hash', '=', keyHash).first()
    return row ? AppApiKey.fromDatabase(row) : null
  }

  async findByPreviousKeyHash(keyHash: string): Promise<AppApiKey | null> {
    const row = await this.db
      .table('app_api_keys')
      .where('previous_key_hash', '=', keyHash)
      .first()
    return row ? AppApiKey.fromDatabase(row) : null
  }

  async findWithExpiredGracePeriod(): Promise<AppApiKey[]> {
    const now = new Date().toISOString()
    const rows = await this.db
      .table('app_api_keys')
      .where('status', '=', 'active')
      .where('grace_period_ends_at', '<', now)
      .select()
    return rows.map((row) => AppApiKey.fromDatabase(row))
  }

  async save(appApiKey: AppApiKey): Promise<void> {
    await this.db.table('app_api_keys').insert(appApiKey.toDatabaseRow())
  }

  async update(appApiKey: AppApiKey): Promise<void> {
    await this.db.table('app_api_keys').where('id', '=', appApiKey.id).update(appApiKey.toDatabaseRow())
  }

  async delete(id: string): Promise<void> {
    await this.db.table('app_api_keys').where('id', '=', id).delete()
  }

  async countByOrgId(orgId: string): Promise<number> {
    return this.db.table('app_api_keys').where('org_id', '=', orgId).count()
  }

  withTransaction(tx: IDatabaseAccess): AppApiKeyRepository {
    return new AppApiKeyRepository(tx)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/AppApiKey/Domain/Repositories/IAppApiKeyRepository.ts src/Modules/AppApiKey/Infrastructure/Repositories/AppApiKeyRepository.ts
git commit -m "feat: [AppApiKey] 新增 Repository 介面與 IDatabaseAccess 實作"
```

---

### Task 7: AppKeyBifrostSync Service

**Files:**
- Create: `src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts`

- [ ] **Step 1: Create Bifrost sync service**

This follows the same pattern as `ApiKeyBifrostSync` but handles dual-key (grace period) scenarios.

```typescript
// src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

interface CreateVirtualKeyResult {
  bifrostVirtualKeyId: string
  bifrostKeyValue: string
}

export class AppKeyBifrostSync {
  constructor(private readonly bifrostClient: BifrostClient) {}

  async createVirtualKey(label: string, orgId: string): Promise<CreateVirtualKeyResult> {
    const vk = await this.bifrostClient.createVirtualKey({
      name: `[App] ${label}`,
      customer_id: orgId,
    })
    return {
      bifrostVirtualKeyId: vk.id,
      bifrostKeyValue: vk.value ?? '',
    }
  }

  async deactivateVirtualKey(bifrostVirtualKeyId: string): Promise<void> {
    await this.bifrostClient.updateVirtualKey(bifrostVirtualKeyId, { is_active: false })
  }

  async deleteVirtualKey(bifrostVirtualKeyId: string): Promise<void> {
    await this.bifrostClient.deleteVirtualKey(bifrostVirtualKeyId)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Modules/AppApiKey/Infrastructure/Services/AppKeyBifrostSync.ts
git commit -m "feat: [AppApiKey] 新增 AppKeyBifrostSync（Bifrost Virtual Key 同步）"
```

---

### Task 8: DTOs

**Files:**
- Create: `src/Modules/AppApiKey/Application/DTOs/AppApiKeyDTO.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// src/Modules/AppApiKey/Application/DTOs/AppApiKeyDTO.ts
export interface IssueAppKeyRequest {
  orgId: string
  issuedByUserId: string
  callerSystemRole: string
  label: string
  scope?: string // 'read' | 'write' | 'admin'
  rotationPolicy?: {
    autoRotate: boolean
    rotationIntervalDays?: number
    gracePeriodHours?: number
  }
  boundModuleIds?: string[]
  expiresAt?: string
}

export interface RotateAppKeyRequest {
  keyId: string
  callerUserId: string
  callerSystemRole: string
}

export interface RevokeAppKeyRequest {
  keyId: string
  callerUserId: string
  callerSystemRole: string
}

export interface SetAppKeyScopeRequest {
  keyId: string
  callerUserId: string
  callerSystemRole: string
  scope?: string
  boundModuleIds?: string[]
}

export interface GetAppKeyUsageRequest {
  keyId: string
  callerUserId: string
  callerSystemRole: string
  startDate?: string
  endDate?: string
}

export interface AppApiKeyResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

export interface AppApiKeyCreatedResponse {
  success: boolean
  message: string
  data?: Record<string, unknown> & { rawKey?: string }
  error?: string
}

export interface ListAppApiKeysResponse {
  success: boolean
  message: string
  data?: {
    keys: Record<string, unknown>[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }
  error?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Modules/AppApiKey/Application/DTOs/AppApiKeyDTO.ts
git commit -m "feat: [AppApiKey] 新增 Request/Response DTOs"
```

---

### Task 9: IssueAppKeyService

**Files:**
- Create: `src/Modules/AppApiKey/Application/Services/IssueAppKeyService.ts`
- Test: `src/Modules/AppApiKey/__tests__/IssueAppKeyService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/AppApiKey/__tests__/IssueAppKeyService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { IssueAppKeyService } from '../Application/Services/IssueAppKeyService'
import { AppApiKeyRepository } from '../Infrastructure/Repositories/AppApiKeyRepository'
import { AppKeyBifrostSync } from '../Infrastructure/Services/AppKeyBifrostSync'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

function createMockSync(shouldFail = false): AppKeyBifrostSync {
  const mockClient = {
    createVirtualKey: shouldFail
      ? vi.fn().mockRejectedValue(new Error('Bifrost 連線失敗'))
      : vi.fn().mockResolvedValue({
          id: 'bfr-vk-app-new',
          name: '[App] test',
          value: 'vk_live_app_abc',
          is_active: true,
          provider_configs: [],
        }),
    updateVirtualKey: vi.fn().mockResolvedValue({}),
    deleteVirtualKey: vi.fn(),
  } as unknown as BifrostClient
  return new AppKeyBifrostSync(mockClient)
}

describe('IssueAppKeyService', () => {
  let service: IssueAppKeyService
  let db: MemoryDatabaseAccess
  let appKeyRepo: AppApiKeyRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    appKeyRepo = new AppApiKeyRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const sync = createMockSync()
    service = new IssueAppKeyService(appKeyRepo, orgAuth, sync)

    const org = Organization.create('org-1', 'Test Org', 'test')
    await orgRepo.save(org)
    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)
  })

  it('應成功配發 App Key 並回傳 rawKey（drp_app_ 前綴）', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'My SDK App Key',
    })
    expect(result.success).toBe(true)
    expect(result.data?.rawKey).toBeTruthy()
    expect((result.data?.rawKey as string).startsWith('drp_app_')).toBe(true)
    expect(result.data?.status).toBe('active')
    expect(result.data?.scope).toBe('read')
  })

  it('應支援自訂 scope 和綁定模組', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'Admin Key',
      scope: 'admin',
      boundModuleIds: ['mod-1', 'mod-2'],
    })
    expect(result.success).toBe(true)
    expect(result.data?.scope).toBe('admin')
    expect(result.data?.boundModules).toEqual(['mod-1', 'mod-2'])
  })

  it('應支援自動輪換策略', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'Auto Rotate Key',
      rotationPolicy: { autoRotate: true, rotationIntervalDays: 90, gracePeriodHours: 48 },
    })
    expect(result.success).toBe(true)
    const policy = result.data?.rotationPolicy as Record<string, unknown>
    expect(policy.auto_rotate).toBe(true)
    expect(policy.rotation_interval_days).toBe(90)
  })

  it('非 Org 成員應回傳錯誤', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      issuedByUserId: 'outsider',
      callerSystemRole: 'user',
      label: 'Unauthorized',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })

  it('空 label 應回傳錯誤', async () => {
    const result = await service.execute({
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      callerSystemRole: 'user',
      label: '',
    })
    expect(result.success).toBe(false)
  })

  it('Bifrost 失敗時應清理本地 pending 記錄', async () => {
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const failSync = createMockSync(true)
    const failService = new IssueAppKeyService(appKeyRepo, orgAuth, failSync)

    const result = await failService.execute({
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      callerSystemRole: 'user',
      label: 'Will Fail',
    })
    expect(result.success).toBe(false)
    const keys = await appKeyRepo.findByOrgId('org-1')
    expect(keys).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/AppApiKey/__tests__/IssueAppKeyService.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/AppApiKey/Application/Services/IssueAppKeyService.ts
import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { AppKeyBifrostSync } from '../../Infrastructure/Services/AppKeyBifrostSync'
import { AppApiKey } from '../../Domain/Aggregates/AppApiKey'
import { AppKeyScope } from '../../Domain/ValueObjects/AppKeyScope'
import { KeyRotationPolicy } from '../../Domain/ValueObjects/KeyRotationPolicy'
import { BoundModules } from '../../Domain/ValueObjects/BoundModules'
import type { IssueAppKeyRequest, AppApiKeyCreatedResponse } from '../DTOs/AppApiKeyDTO'

export class IssueAppKeyService {
  constructor(
    private readonly appApiKeyRepository: IAppApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: AppKeyBifrostSync,
  ) {}

  async execute(request: IssueAppKeyRequest): Promise<AppApiKeyCreatedResponse> {
    try {
      if (!request.label || !request.label.trim()) {
        return { success: false, message: 'Key 標籤不能為空', error: 'LABEL_REQUIRED' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        request.orgId,
        request.issuedByUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: '你不是此組織的成員',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const scope = request.scope ? AppKeyScope.from(request.scope) : AppKeyScope.read()

      const rotationPolicy = request.rotationPolicy?.autoRotate
        ? KeyRotationPolicy.auto(
            request.rotationPolicy.rotationIntervalDays ?? 90,
            request.rotationPolicy.gracePeriodHours ?? 24,
          )
        : KeyRotationPolicy.manual(request.rotationPolicy?.gracePeriodHours)

      const boundModules = request.boundModuleIds
        ? BoundModules.from(request.boundModuleIds)
        : BoundModules.empty()

      const keyId = crypto.randomUUID()
      const rawKey = `drp_app_${crypto.randomUUID().replace(/-/g, '')}`

      const pendingKey = await AppApiKey.create({
        id: keyId,
        orgId: request.orgId,
        issuedByUserId: request.issuedByUserId,
        label: request.label,
        bifrostVirtualKeyId: '',
        rawKey,
        scope,
        rotationPolicy,
        boundModules,
        expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
      })
      await this.appApiKeyRepository.save(pendingKey)

      try {
        const { bifrostVirtualKeyId } = await this.bifrostSync.createVirtualKey(
          request.label,
          request.orgId,
        )

        const activatedKey = await AppApiKey.create({
          id: keyId,
          orgId: request.orgId,
          issuedByUserId: request.issuedByUserId,
          label: request.label,
          bifrostVirtualKeyId,
          rawKey,
          scope,
          rotationPolicy,
          boundModules,
          expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
        })
        const finalKey = activatedKey.activate()
        await this.appApiKeyRepository.update(finalKey)

        return {
          success: true,
          message: 'App API Key 配發成功（請立即記錄 rawKey，此後將無法再次取得）',
          data: { ...finalKey.toDTO(), rawKey },
        }
      } catch (bifrostError: unknown) {
        await this.appApiKeyRepository.delete(keyId)
        throw bifrostError
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '配發失敗'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/AppApiKey/__tests__/IssueAppKeyService.test.ts`
Expected: PASS — all 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/AppApiKey/Application/Services/IssueAppKeyService.ts src/Modules/AppApiKey/__tests__/IssueAppKeyService.test.ts
git commit -m "feat: [AppApiKey] 新增 IssueAppKeyService（配發 App Key + Bifrost 同步）"
```

---

### Task 10: RotateAppKeyService

**Files:**
- Create: `src/Modules/AppApiKey/Application/Services/RotateAppKeyService.ts`
- Test: `src/Modules/AppApiKey/__tests__/RotateAppKeyService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/AppApiKey/__tests__/RotateAppKeyService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { RotateAppKeyService } from '../Application/Services/RotateAppKeyService'
import { AppApiKeyRepository } from '../Infrastructure/Repositories/AppApiKeyRepository'
import { AppKeyBifrostSync } from '../Infrastructure/Services/AppKeyBifrostSync'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { AppApiKey } from '../Domain/Aggregates/AppApiKey'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

function createMockSync(): AppKeyBifrostSync {
  const mockClient = {
    createVirtualKey: vi.fn().mockResolvedValue({
      id: 'bfr-vk-rotated',
      name: '[App] rotated',
      value: 'vk_live_rotated',
      is_active: true,
      provider_configs: [],
    }),
    updateVirtualKey: vi.fn().mockResolvedValue({}),
    deleteVirtualKey: vi.fn(),
  } as unknown as BifrostClient
  return new AppKeyBifrostSync(mockClient)
}

describe('RotateAppKeyService', () => {
  let service: RotateAppKeyService
  let db: MemoryDatabaseAccess
  let appKeyRepo: AppApiKeyRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    appKeyRepo = new AppApiKeyRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const sync = createMockSync()
    service = new RotateAppKeyService(appKeyRepo, orgAuth, sync)

    const org = Organization.create('org-1', 'Test Org', 'test')
    await orgRepo.save(org)
    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)

    // 建立一個 active 的 App Key
    const key = await AppApiKey.create({
      id: 'appkey-rotate',
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      label: 'Rotate Test',
      bifrostVirtualKeyId: 'bfr-vk-original',
      rawKey: 'drp_app_original123',
    })
    await appKeyRepo.save(key.activate())
  })

  it('應成功輪換 Key 並回傳新 rawKey', async () => {
    const result = await service.execute({
      keyId: 'appkey-rotate',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(true)
    expect(result.data?.rawKey).toBeTruthy()
    expect((result.data?.rawKey as string).startsWith('drp_app_')).toBe(true)
    expect(result.data?.isInGracePeriod).toBe(true)
    expect(result.data?.gracePeriodEndsAt).toBeTruthy()
  })

  it('輪換後舊 Key hash 應被保存', async () => {
    await service.execute({
      keyId: 'appkey-rotate',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    const updated = await appKeyRepo.findById('appkey-rotate')
    expect(updated?.previousKeyHash).toBeTruthy()
    expect(updated?.previousBifrostVirtualKeyId).toBe('bfr-vk-original')
  })

  it('Key 不存在應回傳錯誤', async () => {
    const result = await service.execute({
      keyId: 'nonexistent',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('KEY_NOT_FOUND')
  })

  it('非 Org 成員應回傳錯誤', async () => {
    const result = await service.execute({
      keyId: 'appkey-rotate',
      callerUserId: 'outsider',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/AppApiKey/__tests__/RotateAppKeyService.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/AppApiKey/Application/Services/RotateAppKeyService.ts
import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { AppKeyBifrostSync } from '../../Infrastructure/Services/AppKeyBifrostSync'
import type { RotateAppKeyRequest, AppApiKeyCreatedResponse } from '../DTOs/AppApiKeyDTO'

export class RotateAppKeyService {
  constructor(
    private readonly appApiKeyRepository: IAppApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: AppKeyBifrostSync,
  ) {}

  async execute(request: RotateAppKeyRequest): Promise<AppApiKeyCreatedResponse> {
    try {
      const key = await this.appApiKeyRepository.findById(request.keyId)
      if (!key) {
        return { success: false, message: 'App Key 不存在', error: 'KEY_NOT_FOUND' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        key.orgId,
        request.callerUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: '你不是此組織的成員',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const newRawKey = `drp_app_${crypto.randomUUID().replace(/-/g, '')}`

      const { bifrostVirtualKeyId: newBifrostVkId } = await this.bifrostSync.createVirtualKey(
        key.label,
        key.orgId,
      )

      const rotated = await key.rotate(newRawKey, newBifrostVkId)
      await this.appApiKeyRepository.update(rotated)

      return {
        success: true,
        message: 'Key 輪換成功，舊 Key 在寬限期內仍可使用',
        data: { ...rotated.toDTO(), rawKey: newRawKey },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '輪換失敗'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/AppApiKey/__tests__/RotateAppKeyService.test.ts`
Expected: PASS — all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/AppApiKey/Application/Services/RotateAppKeyService.ts src/Modules/AppApiKey/__tests__/RotateAppKeyService.test.ts
git commit -m "feat: [AppApiKey] 新增 RotateAppKeyService（Key 輪換 + grace period）"
```

---

### Task 11: RevokeAppKeyService

**Files:**
- Create: `src/Modules/AppApiKey/Application/Services/RevokeAppKeyService.ts`
- Test: `src/Modules/AppApiKey/__tests__/RevokeAppKeyService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/AppApiKey/__tests__/RevokeAppKeyService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { RevokeAppKeyService } from '../Application/Services/RevokeAppKeyService'
import { AppApiKeyRepository } from '../Infrastructure/Repositories/AppApiKeyRepository'
import { AppKeyBifrostSync } from '../Infrastructure/Services/AppKeyBifrostSync'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { AppApiKey } from '../Domain/Aggregates/AppApiKey'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

function createMockSync(): AppKeyBifrostSync {
  const mockClient = {
    createVirtualKey: vi.fn(),
    updateVirtualKey: vi.fn().mockResolvedValue({}),
    deleteVirtualKey: vi.fn(),
  } as unknown as BifrostClient
  return new AppKeyBifrostSync(mockClient)
}

describe('RevokeAppKeyService', () => {
  let service: RevokeAppKeyService
  let db: MemoryDatabaseAccess
  let appKeyRepo: AppApiKeyRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    appKeyRepo = new AppApiKeyRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const sync = createMockSync()
    service = new RevokeAppKeyService(appKeyRepo, orgAuth, sync)

    const org = Organization.create('org-1', 'Test Org', 'test')
    await orgRepo.save(org)
    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)

    const key = await AppApiKey.create({
      id: 'appkey-revoke',
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      label: 'Revoke Test',
      bifrostVirtualKeyId: 'bfr-vk-revoke',
      rawKey: 'drp_app_revoke123',
    })
    await appKeyRepo.save(key.activate())
  })

  it('應成功撤銷 Key 並停用 Bifrost VK', async () => {
    const result = await service.execute({
      keyId: 'appkey-revoke',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(true)
    const updated = await appKeyRepo.findById('appkey-revoke')
    expect(updated?.status).toBe('revoked')
  })

  it('Key 不存在應回傳錯誤', async () => {
    const result = await service.execute({
      keyId: 'nonexistent',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('KEY_NOT_FOUND')
  })

  it('非 Org 成員應回傳錯誤', async () => {
    const result = await service.execute({
      keyId: 'appkey-revoke',
      callerUserId: 'outsider',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/AppApiKey/__tests__/RevokeAppKeyService.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/AppApiKey/Application/Services/RevokeAppKeyService.ts
import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { AppKeyBifrostSync } from '../../Infrastructure/Services/AppKeyBifrostSync'
import type { RevokeAppKeyRequest, AppApiKeyResponse } from '../DTOs/AppApiKeyDTO'

export class RevokeAppKeyService {
  constructor(
    private readonly appApiKeyRepository: IAppApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: AppKeyBifrostSync,
  ) {}

  async execute(request: RevokeAppKeyRequest): Promise<AppApiKeyResponse> {
    try {
      const key = await this.appApiKeyRepository.findById(request.keyId)
      if (!key) {
        return { success: false, message: 'App Key 不存在', error: 'KEY_NOT_FOUND' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        key.orgId,
        request.callerUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: '你不是此組織的成員',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      await this.bifrostSync.deactivateVirtualKey(key.bifrostVirtualKeyId)
      if (key.previousBifrostVirtualKeyId) {
        await this.bifrostSync.deactivateVirtualKey(key.previousBifrostVirtualKeyId)
      }

      const revoked = key.revoke()
      await this.appApiKeyRepository.update(revoked)

      return { success: true, message: 'App Key 已撤銷', data: revoked.toDTO() }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '撤銷失敗'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/AppApiKey/__tests__/RevokeAppKeyService.test.ts`
Expected: PASS — all 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/AppApiKey/Application/Services/RevokeAppKeyService.ts src/Modules/AppApiKey/__tests__/RevokeAppKeyService.test.ts
git commit -m "feat: [AppApiKey] 新增 RevokeAppKeyService（撤銷 App Key + Bifrost 停用）"
```

---

### Task 12: SetAppKeyScopeService

**Files:**
- Create: `src/Modules/AppApiKey/Application/Services/SetAppKeyScopeService.ts`
- Test: `src/Modules/AppApiKey/__tests__/SetAppKeyScopeService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/AppApiKey/__tests__/SetAppKeyScopeService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { SetAppKeyScopeService } from '../Application/Services/SetAppKeyScopeService'
import { AppApiKeyRepository } from '../Infrastructure/Repositories/AppApiKeyRepository'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { AppApiKey } from '../Domain/Aggregates/AppApiKey'

describe('SetAppKeyScopeService', () => {
  let service: SetAppKeyScopeService
  let db: MemoryDatabaseAccess
  let appKeyRepo: AppApiKeyRepository

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    appKeyRepo = new AppApiKeyRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    service = new SetAppKeyScopeService(appKeyRepo, orgAuth)

    const org = Organization.create('org-1', 'Test Org', 'test')
    await orgRepo.save(org)
    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)

    const key = await AppApiKey.create({
      id: 'appkey-scope',
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      label: 'Scope Test',
      bifrostVirtualKeyId: 'bfr-vk-scope',
      rawKey: 'drp_app_scope123',
    })
    await appKeyRepo.save(key.activate())
  })

  it('應成功更新 scope', async () => {
    const result = await service.execute({
      keyId: 'appkey-scope',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      scope: 'admin',
    })
    expect(result.success).toBe(true)
    expect(result.data?.scope).toBe('admin')
  })

  it('應成功更新綁定模組', async () => {
    const result = await service.execute({
      keyId: 'appkey-scope',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      boundModuleIds: ['mod-1', 'mod-2'],
    })
    expect(result.success).toBe(true)
    expect(result.data?.boundModules).toEqual(['mod-1', 'mod-2'])
  })

  it('應同時更新 scope 和綁定模組', async () => {
    const result = await service.execute({
      keyId: 'appkey-scope',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      scope: 'write',
      boundModuleIds: ['mod-3'],
    })
    expect(result.success).toBe(true)
    expect(result.data?.scope).toBe('write')
    expect(result.data?.boundModules).toEqual(['mod-3'])
  })

  it('Key 不存在應回傳錯誤', async () => {
    const result = await service.execute({
      keyId: 'nonexistent',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      scope: 'admin',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('KEY_NOT_FOUND')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/AppApiKey/__tests__/SetAppKeyScopeService.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/AppApiKey/Application/Services/SetAppKeyScopeService.ts
import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { AppKeyScope } from '../../Domain/ValueObjects/AppKeyScope'
import { BoundModules } from '../../Domain/ValueObjects/BoundModules'
import type { SetAppKeyScopeRequest, AppApiKeyResponse } from '../DTOs/AppApiKeyDTO'

export class SetAppKeyScopeService {
  constructor(
    private readonly appApiKeyRepository: IAppApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(request: SetAppKeyScopeRequest): Promise<AppApiKeyResponse> {
    try {
      const key = await this.appApiKeyRepository.findById(request.keyId)
      if (!key) {
        return { success: false, message: 'App Key 不存在', error: 'KEY_NOT_FOUND' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        key.orgId,
        request.callerUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: '你不是此組織的成員',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      let updated = key
      if (request.scope) {
        updated = updated.updateScope(AppKeyScope.from(request.scope))
      }
      if (request.boundModuleIds) {
        updated = updated.updateBoundModules(BoundModules.from(request.boundModuleIds))
      }

      await this.appApiKeyRepository.update(updated)

      return { success: true, message: 'Scope 更新成功', data: updated.toDTO() }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '更新失敗'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/AppApiKey/__tests__/SetAppKeyScopeService.test.ts`
Expected: PASS — all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/AppApiKey/Application/Services/SetAppKeyScopeService.ts src/Modules/AppApiKey/__tests__/SetAppKeyScopeService.test.ts
git commit -m "feat: [AppApiKey] 新增 SetAppKeyScopeService（更新 Scope + 綁定模組）"
```

---

### Task 13: GetAppKeyUsageService

**Files:**
- Create: `src/Modules/AppApiKey/Application/Services/GetAppKeyUsageService.ts`
- Test: `src/Modules/AppApiKey/__tests__/GetAppKeyUsageService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/AppApiKey/__tests__/GetAppKeyUsageService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { GetAppKeyUsageService } from '../Application/Services/GetAppKeyUsageService'
import { AppApiKeyRepository } from '../Infrastructure/Repositories/AppApiKeyRepository'
import { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { OrganizationRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationRepository'
import { OrganizationMemberRepository } from '@/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository'
import { Organization } from '@/Modules/Organization/Domain/Aggregates/Organization'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { AppApiKey } from '../Domain/Aggregates/AppApiKey'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

function createMockBifrostClient(): BifrostClient {
  return {
    getLogs: vi.fn().mockResolvedValue({
      data: [],
      total: 0,
    }),
    getLogsStats: vi.fn().mockResolvedValue({
      total_requests: 42,
      total_tokens: 12345,
      total_cost: 0.56,
    }),
  } as unknown as BifrostClient
}

describe('GetAppKeyUsageService', () => {
  let service: GetAppKeyUsageService
  let db: MemoryDatabaseAccess

  beforeEach(async () => {
    db = new MemoryDatabaseAccess()
    const appKeyRepo = new AppApiKeyRepository(db)
    const orgRepo = new OrganizationRepository(db)
    const memberRepo = new OrganizationMemberRepository(db)
    const orgAuth = new OrgAuthorizationHelper(memberRepo)
    const bifrostClient = createMockBifrostClient()
    service = new GetAppKeyUsageService(appKeyRepo, orgAuth, bifrostClient)

    const org = Organization.create('org-1', 'Test Org', 'test')
    await orgRepo.save(org)
    const member = OrganizationMember.create('mem-1', 'org-1', 'user-1', 'manager')
    await memberRepo.save(member)

    const key = await AppApiKey.create({
      id: 'appkey-usage',
      orgId: 'org-1',
      issuedByUserId: 'user-1',
      label: 'Usage Test',
      bifrostVirtualKeyId: 'bfr-vk-usage',
      rawKey: 'drp_app_usage123',
    })
    await appKeyRepo.save(key.activate())
  })

  it('應成功查詢用量統計', async () => {
    const result = await service.execute({
      keyId: 'appkey-usage',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(true)
    expect(result.data?.totalRequests).toBe(42)
    expect(result.data?.totalTokens).toBe(12345)
  })

  it('Key 不存在應回傳錯誤', async () => {
    const result = await service.execute({
      keyId: 'nonexistent',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('KEY_NOT_FOUND')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/AppApiKey/__tests__/GetAppKeyUsageService.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/AppApiKey/Application/Services/GetAppKeyUsageService.ts
import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { GetAppKeyUsageRequest, AppApiKeyResponse } from '../DTOs/AppApiKeyDTO'

export class GetAppKeyUsageService {
  constructor(
    private readonly appApiKeyRepository: IAppApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostClient: BifrostClient,
  ) {}

  async execute(request: GetAppKeyUsageRequest): Promise<AppApiKeyResponse> {
    try {
      const key = await this.appApiKeyRepository.findById(request.keyId)
      if (!key) {
        return { success: false, message: 'App Key 不存在', error: 'KEY_NOT_FOUND' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        key.orgId,
        request.callerUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: '你不是此組織的成員',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const stats = await this.bifrostClient.getLogsStats({
        virtual_key_id: key.bifrostVirtualKeyId,
        start_date: request.startDate,
        end_date: request.endDate,
      })

      return {
        success: true,
        message: '用量查詢成功',
        data: {
          keyId: key.id,
          label: key.label,
          totalRequests: stats.total_requests ?? 0,
          totalTokens: stats.total_tokens ?? 0,
          totalCost: stats.total_cost ?? 0,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/AppApiKey/__tests__/GetAppKeyUsageService.test.ts`
Expected: PASS — all 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/AppApiKey/Application/Services/GetAppKeyUsageService.ts src/Modules/AppApiKey/__tests__/GetAppKeyUsageService.test.ts
git commit -m "feat: [AppApiKey] 新增 GetAppKeyUsageService（查詢 Bifrost 用量統計）"
```

---

### Task 14: ListAppKeysService

**Files:**
- Create: `src/Modules/AppApiKey/Application/Services/ListAppKeysService.ts`

- [ ] **Step 1: Create list service**

```typescript
// src/Modules/AppApiKey/Application/Services/ListAppKeysService.ts
import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { ListAppApiKeysResponse } from '../DTOs/AppApiKeyDTO'

export class ListAppKeysService {
  constructor(
    private readonly appApiKeyRepository: IAppApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
    page = 1,
    limit = 20,
  ): Promise<ListAppApiKeysResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(orgId, callerUserId, callerSystemRole)
      if (!authResult.authorized) {
        return {
          success: false,
          message: '你不是此組織的成員',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const offset = (page - 1) * limit
      const [keys, total] = await Promise.all([
        this.appApiKeyRepository.findByOrgId(orgId, limit, offset),
        this.appApiKeyRepository.countByOrgId(orgId),
      ])

      return {
        success: true,
        message: '查詢成功',
        data: {
          keys: keys.map((k) => k.toDTO()),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Modules/AppApiKey/Application/Services/ListAppKeysService.ts
git commit -m "feat: [AppApiKey] 新增 ListAppKeysService（分頁查詢 App Keys）"
```

---

### Task 15: Controller + Routes

**Files:**
- Create: `src/Modules/AppApiKey/Presentation/Controllers/AppApiKeyController.ts`
- Create: `src/Modules/AppApiKey/Presentation/Routes/appApiKey.routes.ts`

- [ ] **Step 1: Create controller**

```typescript
// src/Modules/AppApiKey/Presentation/Controllers/AppApiKeyController.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IssueAppKeyService } from '../../Application/Services/IssueAppKeyService'
import type { ListAppKeysService } from '../../Application/Services/ListAppKeysService'
import type { RotateAppKeyService } from '../../Application/Services/RotateAppKeyService'
import type { RevokeAppKeyService } from '../../Application/Services/RevokeAppKeyService'
import type { SetAppKeyScopeService } from '../../Application/Services/SetAppKeyScopeService'
import type { GetAppKeyUsageService } from '../../Application/Services/GetAppKeyUsageService'

export class AppApiKeyController {
  constructor(
    private readonly issueService: IssueAppKeyService,
    private readonly listService: ListAppKeysService,
    private readonly rotateService: RotateAppKeyService,
    private readonly revokeService: RevokeAppKeyService,
    private readonly setScopeService: SetAppKeyScopeService,
    private readonly getUsageService: GetAppKeyUsageService,
  ) {}

  async issue(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const body = await ctx.getJsonBody<{
      label?: string
      scope?: string
      rotationPolicy?: { autoRotate: boolean; rotationIntervalDays?: number; gracePeriodHours?: number }
      boundModuleIds?: string[]
      expiresAt?: string
    }>()
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 400)
    const result = await this.issueService.execute({
      orgId,
      issuedByUserId: auth.userId,
      callerSystemRole: auth.role,
      label: body.label ?? '',
      scope: body.scope,
      rotationPolicy: body.rotationPolicy,
      boundModuleIds: body.boundModuleIds,
      expiresAt: body.expiresAt,
    })
    return ctx.json(result, result.success ? 201 : 400)
  }

  async list(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 400)
    const page = ctx.getQuery('page') ? parseInt(ctx.getQuery('page')!, 10) : 1
    const limit = ctx.getQuery('limit') ? parseInt(ctx.getQuery('limit')!, 10) : 20
    const result = await this.listService.execute(orgId, auth.userId, auth.role, page, limit)
    return ctx.json(result)
  }

  async rotate(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const keyId = ctx.getParam('keyId')
    if (!keyId) return ctx.json({ success: false, message: '缺少 keyId' }, 400)
    const result = await this.rotateService.execute({
      keyId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    const status = result.success ? 200 : result.error === 'KEY_NOT_FOUND' ? 404 : 400
    return ctx.json(result, status)
  }

  async revoke(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const keyId = ctx.getParam('keyId')
    if (!keyId) return ctx.json({ success: false, message: '缺少 keyId' }, 400)
    const result = await this.revokeService.execute({
      keyId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    const status = result.success ? 200 : result.error === 'KEY_NOT_FOUND' ? 404 : 400
    return ctx.json(result, status)
  }

  async setScope(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const keyId = ctx.getParam('keyId')
    if (!keyId) return ctx.json({ success: false, message: '缺少 keyId' }, 400)
    const body = await ctx.getJsonBody<{ scope?: string; boundModuleIds?: string[] }>()
    const result = await this.setScopeService.execute({
      keyId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      scope: body.scope,
      boundModuleIds: body.boundModuleIds,
    })
    const status = result.success ? 200 : result.error === 'KEY_NOT_FOUND' ? 404 : 400
    return ctx.json(result, status)
  }

  async getUsage(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const keyId = ctx.getParam('keyId')
    if (!keyId) return ctx.json({ success: false, message: '缺少 keyId' }, 400)
    const result = await this.getUsageService.execute({
      keyId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      startDate: ctx.getQuery('startDate') ?? undefined,
      endDate: ctx.getQuery('endDate') ?? undefined,
    })
    const status = result.success ? 200 : result.error === 'KEY_NOT_FOUND' ? 404 : 400
    return ctx.json(result, status)
  }
}
```

- [ ] **Step 2: Create routes**

```typescript
// src/Modules/AppApiKey/Presentation/Routes/appApiKey.routes.ts
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { AppApiKeyController } from '../Controllers/AppApiKeyController'
import { requireAuth } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { createModuleAccessMiddleware } from '@/Shared/Infrastructure/Middleware/ModuleAccessMiddleware'

export function registerAppApiKeyRoutes(router: IModuleRouter, controller: AppApiKeyController): void {
  const appKeysAccess = [requireAuth(), createModuleAccessMiddleware('app_api_keys')]

  // App Key CRUD
  router.post('/api/organizations/:orgId/app-keys', appKeysAccess, (ctx) => controller.issue(ctx))
  router.get('/api/organizations/:orgId/app-keys', appKeysAccess, (ctx) => controller.list(ctx))

  // App Key operations
  router.post('/api/app-keys/:keyId/rotate', [requireAuth()], (ctx) => controller.rotate(ctx))
  router.post('/api/app-keys/:keyId/revoke', [requireAuth()], (ctx) => controller.revoke(ctx))
  router.put('/api/app-keys/:keyId/scope', [requireAuth()], (ctx) => controller.setScope(ctx))
  router.get('/api/app-keys/:keyId/usage', [requireAuth()], (ctx) => controller.getUsage(ctx))
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/AppApiKey/Presentation/Controllers/AppApiKeyController.ts src/Modules/AppApiKey/Presentation/Routes/appApiKey.routes.ts
git commit -m "feat: [AppApiKey] 新增 Controller 和 Routes（6 個 API endpoints）"
```

---

### Task 16: ServiceProvider + Barrel Export

**Files:**
- Create: `src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts`
- Create: `src/Modules/AppApiKey/index.ts`

- [ ] **Step 1: Create service provider**

```typescript
// src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { AppApiKeyRepository } from '../Repositories/AppApiKeyRepository'
import { AppKeyBifrostSync } from '../Services/AppKeyBifrostSync'
import { IssueAppKeyService } from '../../Application/Services/IssueAppKeyService'
import { ListAppKeysService } from '../../Application/Services/ListAppKeysService'
import { RotateAppKeyService } from '../../Application/Services/RotateAppKeyService'
import { RevokeAppKeyService } from '../../Application/Services/RevokeAppKeyService'
import { SetAppKeyScopeService } from '../../Application/Services/SetAppKeyScopeService'
import { GetAppKeyUsageService } from '../../Application/Services/GetAppKeyUsageService'

export class AppApiKeyServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    const db = getCurrentDatabaseAccess()

    container.singleton('appApiKeyRepository', () => new AppApiKeyRepository(db))

    container.singleton('appKeyBifrostSync', (c: IContainer) => {
      return new AppKeyBifrostSync(c.make('bifrostClient') as BifrostClient)
    })

    container.bind('issueAppKeyService', (c: IContainer) => {
      return new IssueAppKeyService(
        c.make('appApiKeyRepository') as IAppApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('appKeyBifrostSync') as AppKeyBifrostSync,
      )
    })

    container.bind('listAppKeysService', (c: IContainer) => {
      return new ListAppKeysService(
        c.make('appApiKeyRepository') as IAppApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('rotateAppKeyService', (c: IContainer) => {
      return new RotateAppKeyService(
        c.make('appApiKeyRepository') as IAppApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('appKeyBifrostSync') as AppKeyBifrostSync,
      )
    })

    container.bind('revokeAppKeyService', (c: IContainer) => {
      return new RevokeAppKeyService(
        c.make('appApiKeyRepository') as IAppApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('appKeyBifrostSync') as AppKeyBifrostSync,
      )
    })

    container.bind('setAppKeyScopeService', (c: IContainer) => {
      return new SetAppKeyScopeService(
        c.make('appApiKeyRepository') as IAppApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('getAppKeyUsageService', (c: IContainer) => {
      return new GetAppKeyUsageService(
        c.make('appApiKeyRepository') as IAppApiKeyRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
        c.make('bifrostClient') as BifrostClient,
      )
    })
  }

  override boot(_context: unknown): void {
    console.log('🔐 [AppApiKey] Module loaded')
  }
}
```

- [ ] **Step 2: Create barrel export**

```typescript
// src/Modules/AppApiKey/index.ts
export { AppApiKey } from './Domain/Aggregates/AppApiKey'
export { AppKeyScope } from './Domain/ValueObjects/AppKeyScope'
export { KeyRotationPolicy } from './Domain/ValueObjects/KeyRotationPolicy'
export { BoundModules } from './Domain/ValueObjects/BoundModules'
export type { IAppApiKeyRepository } from './Domain/Repositories/IAppApiKeyRepository'

export { IssueAppKeyService } from './Application/Services/IssueAppKeyService'
export { ListAppKeysService } from './Application/Services/ListAppKeysService'
export { RotateAppKeyService } from './Application/Services/RotateAppKeyService'
export { RevokeAppKeyService } from './Application/Services/RevokeAppKeyService'
export { SetAppKeyScopeService } from './Application/Services/SetAppKeyScopeService'
export { GetAppKeyUsageService } from './Application/Services/GetAppKeyUsageService'

export { AppApiKeyServiceProvider } from './Infrastructure/Providers/AppApiKeyServiceProvider'
export { AppKeyBifrostSync } from './Infrastructure/Services/AppKeyBifrostSync'

export { AppApiKeyController } from './Presentation/Controllers/AppApiKeyController'
export { registerAppApiKeyRoutes } from './Presentation/Routes/appApiKey.routes'
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts src/Modules/AppApiKey/index.ts
git commit -m "feat: [AppApiKey] 新增 ServiceProvider + barrel exports"
```

---

### Task 17: Wiring — 註冊至 bootstrap + routes

**Files:**
- Modify: `src/bootstrap.ts` (新增 AppApiKeyServiceProvider import + register)
- Modify: `src/wiring/index.ts` (新增 registerAppApiKey 函式)
- Modify: `src/routes.ts` (新增 registerAppApiKey 呼叫)

- [ ] **Step 1: Add registerAppApiKey to wiring/index.ts**

在 `src/wiring/index.ts` 的 `registerAppModule` 之後加入：

```typescript
import { AppApiKeyController, registerAppApiKeyRoutes } from '@/Modules/AppApiKey'

/**
 * 註冊 AppApiKey 模組
 */
export const registerAppApiKey = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const controller = new AppApiKeyController(
    core.container.make('issueAppKeyService') as any,
    core.container.make('listAppKeysService') as any,
    core.container.make('rotateAppKeyService') as any,
    core.container.make('revokeAppKeyService') as any,
    core.container.make('setAppKeyScopeService') as any,
    core.container.make('getAppKeyUsageService') as any,
  )
  registerAppApiKeyRoutes(router, controller)
}
```

- [ ] **Step 2: Register ServiceProvider in bootstrap.ts**

在 `src/bootstrap.ts` 中，在 `AppModuleServiceProvider` 之後加入：

```typescript
import { AppApiKeyServiceProvider } from '@/Modules/AppApiKey'

// 在 core.register(...AppModuleServiceProvider...) 之後加入：
core.register(createGravitoServiceProvider(new AppApiKeyServiceProvider()))
```

- [ ] **Step 3: Register routes in routes.ts**

在 `src/routes.ts` 的 `registerCredit(core)` 之後加入：

```typescript
import { registerAppApiKey } from './wiring'

// 加入：
registerAppApiKey(core)
```

- [ ] **Step 4: Run typecheck to verify wiring**

Run: `bun run typecheck`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/wiring/index.ts src/bootstrap.ts src/routes.ts
git commit -m "feat: [AppApiKey] 註冊 AppApiKey 模組至 bootstrap + routes"
```

---

### Task 18: Database Migration

**Files:**
- Create: `database/migrations/2026_04_10_000001_create_app_api_keys_table.ts`

- [ ] **Step 1: Create migration file**

Check existing migration patterns first, then create:

```typescript
// database/migrations/2026_04_10_000001_create_app_api_keys_table.ts
import type { Migration } from '@gravito/atlas'

export default class CreateAppApiKeysTable implements Migration {
  async up(schema: any): Promise<void> {
    await schema.createTable('app_api_keys', (table: any) => {
      table.string('id').primary()
      table.string('org_id').notNullable().index()
      table.string('issued_by_user_id').notNullable()
      table.string('label').notNullable()
      table.string('key_hash').notNullable().unique()
      table.string('bifrost_virtual_key_id').notNullable()
      table.string('status').notNullable().defaultTo('pending')
      table.string('scope').notNullable().defaultTo('read')
      table.text('rotation_policy').notNullable()
      table.text('bound_modules').notNullable().defaultTo('[]')
      table.string('previous_key_hash').nullable()
      table.string('previous_bifrost_virtual_key_id').nullable()
      table.timestamp('grace_period_ends_at').nullable()
      table.timestamp('expires_at').nullable()
      table.timestamp('revoked_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down(schema: any): Promise<void> {
    await schema.dropTableIfExists('app_api_keys')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add database/migrations/2026_04_10_000001_create_app_api_keys_table.ts
git commit -m "feat: [AppApiKey] 新增 app_api_keys 資料表 migration"
```

---

### Task 19: Integration Verification

**Files:** No new files — verification only

- [ ] **Step 1: Run all AppApiKey unit tests**

Run: `bun test src/Modules/AppApiKey/`
Expected: All tests pass (9 test files, ~40+ test cases)

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No type errors

- [ ] **Step 3: Run full test suite**

Run: `bun test`
Expected: All existing tests still pass, no regressions

- [ ] **Step 4: Run lint**

Run: `bun run lint`
Expected: No lint errors in new files

- [ ] **Step 5: Verify route listing**

Run: `bun run route:list | grep app-key`
Expected: 6 new routes visible:
- `POST /api/organizations/:orgId/app-keys`
- `GET /api/organizations/:orgId/app-keys`
- `POST /api/app-keys/:keyId/rotate`
- `POST /api/app-keys/:keyId/revoke`
- `PUT /api/app-keys/:keyId/scope`
- `GET /api/app-keys/:keyId/usage`

- [ ] **Step 6: Final commit (if any formatting fixes needed)**

```bash
bun run format
git add -A
git commit -m "chore: [AppApiKey] 格式化與最終驗證"
```
