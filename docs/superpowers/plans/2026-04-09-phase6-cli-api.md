# Phase 6.3: CLI Backend API 實作計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作 CLI 登入流程（Device Flow），讓使用者透過 CLI 工具進行 OAuth-style 的裝置授權，取得 JWT token 後可代理 AI 請求至 Bifrost。包含 device code 產生、瀏覽器授權、token 交換、CLI 請求轉發、session 管理五大功能。

**Architecture:** 遵循現有 DDD 模組模式，新增 CliApi 模組於 `src/Modules/CliApi/`。DeviceCodeStore 設計為介面 `IDeviceCodeStore`，預設實作 `MemoryDeviceCodeStore`（Map-based with TTL），生產環境可替換為 Redis。所有路由前綴為 `/cli/`。Device Flow 遵循 RFC 8628 精神簡化版。

**Tech Stack:** Bun + TypeScript, Vitest, Gravito DDD Framework, MemoryDatabaseAccess (tests), IDatabaseAccess (ORM-agnostic)

**Related Plans (Phase 6):**
- `2026-04-09-phase6-app-api-key.md` -- AppApiKey 模組（平行開發）

---

## File Structure

```
src/Modules/CliApi/
├── Domain/
│   ├── ValueObjects/
│   │   ├── DeviceCode.ts                    # device_code + user_code + 狀態
│   │   └── CliSessionStatus.ts              # CLI session 狀態
│   └── Ports/
│       └── IDeviceCodeStore.ts              # DeviceCodeStore 介面
├── Application/
│   ├── DTOs/
│   │   └── DeviceFlowDTO.ts                 # Request/Response DTOs
│   └── Services/
│       ├── InitiateDeviceFlowService.ts     # 產生 device_code + user_code
│       ├── AuthorizeDeviceService.ts        # 使用者在瀏覽器授權 user_code
│       ├── ExchangeDeviceCodeService.ts     # CLI 輪詢換取 JWT token
│       ├── ProxyCliRequestService.ts        # 轉發 CLI AI 請求至 Bifrost
│       └── RevokeCliSessionService.ts       # 撤銷 CLI session
├── Infrastructure/
│   ├── Services/
│   │   └── MemoryDeviceCodeStore.ts         # Map-based 實作（with TTL）
│   └── Providers/
│       └── CliApiServiceProvider.ts         # DI 註冊
├── Presentation/
│   ├── Controllers/
│   │   └── CliApiController.ts              # HTTP handlers
│   └── Routes/
│       └── cliApi.routes.ts                 # 路由定義
├── __tests__/
│   ├── DeviceCode.test.ts                   # ValueObject 測試
│   ├── MemoryDeviceCodeStore.test.ts        # Store 測試
│   ├── InitiateDeviceFlowService.test.ts    # Service 測試
│   ├── AuthorizeDeviceService.test.ts       # Service 測試
│   ├── ExchangeDeviceCodeService.test.ts    # Service 測試
│   ├── ProxyCliRequestService.test.ts       # Service 測試
│   └── RevokeCliSessionService.test.ts      # Service 測試
└── index.ts                                 # Barrel exports

src/wiring/index.ts                          # 新增 registerCliApi
src/bootstrap.ts                             # 新增 CliApiServiceProvider
src/routes.ts                                # 新增 registerCliApi 呼叫
```

---

### Task 1: DeviceCode ValueObject

**Files:**
- Create: `src/Modules/CliApi/Domain/ValueObjects/DeviceCode.ts`
- Test: `src/Modules/CliApi/__tests__/DeviceCode.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/CliApi/__tests__/DeviceCode.test.ts
import { describe, it, expect } from 'vitest'
import { DeviceCode, DeviceCodeStatus } from '../Domain/ValueObjects/DeviceCode'

describe('DeviceCode', () => {
  it('should create a pending device code with valid codes', () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-uuid-123',
      userCode: 'ABCD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    expect(dc.deviceCode).toBe('dc-uuid-123')
    expect(dc.userCode).toBe('ABCD1234')
    expect(dc.status).toBe(DeviceCodeStatus.PENDING)
    expect(dc.userId).toBeNull()
    expect(dc.isExpired()).toBe(false)
  })

  it('should detect expired device code', () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-uuid-123',
      userCode: 'ABCD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() - 1000),
    })
    expect(dc.isExpired()).toBe(true)
  })

  it('should authorize with user info', () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-uuid-123',
      userCode: 'ABCD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    const authorized = dc.authorize('user-1', 'user@example.com', 'user')
    expect(authorized.status).toBe(DeviceCodeStatus.AUTHORIZED)
    expect(authorized.userId).toBe('user-1')
    expect(authorized.userEmail).toBe('user@example.com')
    expect(authorized.userRole).toBe('user')
  })

  it('should not authorize an expired code', () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-uuid-123',
      userCode: 'ABCD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() - 1000),
    })
    expect(() => dc.authorize('user-1', 'u@e.com', 'user')).toThrow('Device code 已過期')
  })

  it('should not authorize twice', () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-uuid-123',
      userCode: 'ABCD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    const authorized = dc.authorize('user-1', 'u@e.com', 'user')
    expect(() => authorized.authorize('user-2', 'u2@e.com', 'user')).toThrow('此 device code 已被授權')
  })

  it('should mark as consumed', () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-uuid-123',
      userCode: 'ABCD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    const authorized = dc.authorize('user-1', 'u@e.com', 'user')
    const consumed = authorized.consume()
    expect(consumed.status).toBe(DeviceCodeStatus.CONSUMED)
  })

  it('should generate a valid user code (8 chars, alphanumeric uppercase)', () => {
    const code = DeviceCode.generateUserCode()
    expect(code).toHaveLength(8)
    expect(code).toMatch(/^[A-Z0-9]{8}$/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/CliApi/__tests__/DeviceCode.test.ts`
Expected: FAIL -- module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/CliApi/Domain/ValueObjects/DeviceCode.ts
export enum DeviceCodeStatus {
  PENDING = 'pending',
  AUTHORIZED = 'authorized',
  CONSUMED = 'consumed',
}

interface DeviceCodeProps {
  readonly deviceCode: string
  readonly userCode: string
  readonly verificationUri: string
  readonly status: DeviceCodeStatus
  readonly userId: string | null
  readonly userEmail: string | null
  readonly userRole: string | null
  readonly expiresAt: Date
  readonly createdAt: Date
}

interface CreateDeviceCodeParams {
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresAt: Date
}

export class DeviceCode {
  private readonly props: DeviceCodeProps

  private constructor(props: DeviceCodeProps) {
    this.props = props
  }

  static create(params: CreateDeviceCodeParams): DeviceCode {
    return new DeviceCode({
      deviceCode: params.deviceCode,
      userCode: params.userCode,
      verificationUri: params.verificationUri,
      status: DeviceCodeStatus.PENDING,
      userId: null,
      userEmail: null,
      userRole: null,
      expiresAt: params.expiresAt,
      createdAt: new Date(),
    })
  }

  static generateUserCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
    const bytes = crypto.getRandomValues(new Uint8Array(8))
    return Array.from(bytes)
      .map((b) => chars[b % chars.length])
      .join('')
  }

  isExpired(): boolean {
    return this.props.expiresAt.getTime() <= Date.now()
  }

  authorize(userId: string, email: string, role: string): DeviceCode {
    if (this.isExpired()) {
      throw new Error('Device code 已過期')
    }
    if (this.props.status !== DeviceCodeStatus.PENDING) {
      throw new Error('此 device code 已被授權')
    }
    return new DeviceCode({
      ...this.props,
      status: DeviceCodeStatus.AUTHORIZED,
      userId,
      userEmail: email,
      userRole: role,
    })
  }

  consume(): DeviceCode {
    if (this.props.status !== DeviceCodeStatus.AUTHORIZED) {
      throw new Error('只有已授權的 device code 可以被消費')
    }
    return new DeviceCode({
      ...this.props,
      status: DeviceCodeStatus.CONSUMED,
    })
  }

  get deviceCode(): string {
    return this.props.deviceCode
  }
  get userCode(): string {
    return this.props.userCode
  }
  get verificationUri(): string {
    return this.props.verificationUri
  }
  get status(): DeviceCodeStatus {
    return this.props.status
  }
  get userId(): string | null {
    return this.props.userId
  }
  get userEmail(): string | null {
    return this.props.userEmail
  }
  get userRole(): string | null {
    return this.props.userRole
  }
  get expiresAt(): Date {
    return this.props.expiresAt
  }
  get createdAt(): Date {
    return this.props.createdAt
  }

  toDTO(): Record<string, unknown> {
    return {
      deviceCode: this.props.deviceCode,
      userCode: this.props.userCode,
      verificationUri: this.props.verificationUri,
      status: this.props.status,
      expiresAt: this.props.expiresAt.toISOString(),
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/CliApi/__tests__/DeviceCode.test.ts`
Expected: PASS -- all 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/CliApi/Domain/ValueObjects/DeviceCode.ts src/Modules/CliApi/__tests__/DeviceCode.test.ts
git commit -m "feat: [CliApi] 新增 DeviceCode ValueObject（device_code + user_code + 狀態管理）"
```

---

### Task 2: IDeviceCodeStore Port + MemoryDeviceCodeStore

**Files:**
- Create: `src/Modules/CliApi/Domain/Ports/IDeviceCodeStore.ts`
- Create: `src/Modules/CliApi/Infrastructure/Services/MemoryDeviceCodeStore.ts`
- Test: `src/Modules/CliApi/__tests__/MemoryDeviceCodeStore.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/CliApi/__tests__/MemoryDeviceCodeStore.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MemoryDeviceCodeStore } from '../Infrastructure/Services/MemoryDeviceCodeStore'
import { DeviceCode } from '../Domain/ValueObjects/DeviceCode'

describe('MemoryDeviceCodeStore', () => {
  let store: MemoryDeviceCodeStore

  beforeEach(() => {
    store = new MemoryDeviceCodeStore()
  })

  it('should save and retrieve by device code', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-1',
      userCode: 'ABCD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)
    const found = await store.findByDeviceCode('dc-1')
    expect(found).not.toBeNull()
    expect(found!.deviceCode).toBe('dc-1')
  })

  it('should retrieve by user code', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-2',
      userCode: 'WXYZ5678',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)
    const found = await store.findByUserCode('WXYZ5678')
    expect(found).not.toBeNull()
    expect(found!.deviceCode).toBe('dc-2')
  })

  it('should return null for non-existent code', async () => {
    const found = await store.findByDeviceCode('non-existent')
    expect(found).toBeNull()
  })

  it('should update existing entry', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-3',
      userCode: 'CODE3333',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)

    const authorized = dc.authorize('user-1', 'u@e.com', 'user')
    await store.update(authorized)

    const found = await store.findByDeviceCode('dc-3')
    expect(found!.status).toBe('authorized')
    expect(found!.userId).toBe('user-1')
  })

  it('should delete by device code', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-4',
      userCode: 'DEL44444',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)
    await store.delete('dc-4')
    const found = await store.findByDeviceCode('dc-4')
    expect(found).toBeNull()
  })

  it('should not return expired entries', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-5',
      userCode: 'EXP55555',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() - 1000),
    })
    await store.save(dc)
    const found = await store.findByDeviceCode('dc-5')
    expect(found).toBeNull()
  })

  it('should clean up expired entries on cleanup()', async () => {
    const expired = DeviceCode.create({
      deviceCode: 'dc-exp',
      userCode: 'EXPIRED1',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() - 1000),
    })
    const valid = DeviceCode.create({
      deviceCode: 'dc-valid',
      userCode: 'VALID111',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(expired)
    await store.save(valid)

    await store.cleanup()

    expect(await store.findByDeviceCode('dc-exp')).toBeNull()
    expect(await store.findByDeviceCode('dc-valid')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/CliApi/__tests__/MemoryDeviceCodeStore.test.ts`
Expected: FAIL -- module not found

- [ ] **Step 3: Write the port interface**

```typescript
// src/Modules/CliApi/Domain/Ports/IDeviceCodeStore.ts
import type { DeviceCode } from '../ValueObjects/DeviceCode'

export interface IDeviceCodeStore {
  save(deviceCode: DeviceCode): Promise<void>
  findByDeviceCode(deviceCode: string): Promise<DeviceCode | null>
  findByUserCode(userCode: string): Promise<DeviceCode | null>
  update(deviceCode: DeviceCode): Promise<void>
  delete(deviceCode: string): Promise<void>
  cleanup(): Promise<void>
}
```

- [ ] **Step 4: Write the MemoryDeviceCodeStore implementation**

```typescript
// src/Modules/CliApi/Infrastructure/Services/MemoryDeviceCodeStore.ts
import type { IDeviceCodeStore } from '../../Domain/Ports/IDeviceCodeStore'
import { DeviceCode } from '../../Domain/ValueObjects/DeviceCode'

interface StoredEntry {
  readonly deviceCode: DeviceCode
}

export class MemoryDeviceCodeStore implements IDeviceCodeStore {
  private readonly store = new Map<string, StoredEntry>()
  private readonly userCodeIndex = new Map<string, string>() // userCode -> deviceCode

  async save(deviceCode: DeviceCode): Promise<void> {
    this.store.set(deviceCode.deviceCode, { deviceCode })
    this.userCodeIndex.set(deviceCode.userCode, deviceCode.deviceCode)
  }

  async findByDeviceCode(code: string): Promise<DeviceCode | null> {
    const entry = this.store.get(code)
    if (!entry) return null
    if (entry.deviceCode.isExpired()) {
      this.store.delete(code)
      this.userCodeIndex.delete(entry.deviceCode.userCode)
      return null
    }
    return entry.deviceCode
  }

  async findByUserCode(userCode: string): Promise<DeviceCode | null> {
    const deviceCodeKey = this.userCodeIndex.get(userCode)
    if (!deviceCodeKey) return null
    return this.findByDeviceCode(deviceCodeKey)
  }

  async update(deviceCode: DeviceCode): Promise<void> {
    this.store.set(deviceCode.deviceCode, { deviceCode })
  }

  async delete(code: string): Promise<void> {
    const entry = this.store.get(code)
    if (entry) {
      this.userCodeIndex.delete(entry.deviceCode.userCode)
    }
    this.store.delete(code)
  }

  async cleanup(): Promise<void> {
    for (const [key, entry] of this.store.entries()) {
      if (entry.deviceCode.isExpired()) {
        this.userCodeIndex.delete(entry.deviceCode.userCode)
        this.store.delete(key)
      }
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test src/Modules/CliApi/__tests__/MemoryDeviceCodeStore.test.ts`
Expected: PASS -- all 7 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/Modules/CliApi/Domain/Ports/IDeviceCodeStore.ts src/Modules/CliApi/Infrastructure/Services/MemoryDeviceCodeStore.ts src/Modules/CliApi/__tests__/MemoryDeviceCodeStore.test.ts
git commit -m "feat: [CliApi] 新增 IDeviceCodeStore 介面與 MemoryDeviceCodeStore 實作"
```

---

### Task 3: DeviceFlowDTO

**Files:**
- Create: `src/Modules/CliApi/Application/DTOs/DeviceFlowDTO.ts`

- [ ] **Step 1: Write the DTOs**

```typescript
// src/Modules/CliApi/Application/DTOs/DeviceFlowDTO.ts

/** POST /cli/device-code -- 初始化 device flow */
export interface InitiateDeviceFlowResponse {
  success: boolean
  message: string
  data?: {
    deviceCode: string
    userCode: string
    verificationUri: string
    expiresIn: number // seconds
    interval: number // polling interval in seconds
  }
  error?: string
}

/** POST /cli/authorize -- 使用者在瀏覽器授權 */
export interface AuthorizeDeviceRequest {
  userCode: string
}

export interface AuthorizeDeviceResponse {
  success: boolean
  message: string
  error?: string
}

/** POST /cli/token -- CLI 輪詢換取 token */
export interface ExchangeDeviceCodeRequest {
  deviceCode: string
}

export interface ExchangeDeviceCodeResponse {
  success: boolean
  message: string
  data?: {
    accessToken: string
    refreshToken: string
    user: {
      id: string
      email: string
      role: string
    }
  }
  error?: 'authorization_pending' | 'expired' | 'invalid_device_code' | string
}

/** POST /cli/proxy -- 轉發 AI 請求 */
export interface ProxyCliRequestBody {
  model: string
  messages: Array<{ role: string; content: string }>
  stream?: boolean
  [key: string]: unknown
}

/** POST /cli/logout -- 撤銷 CLI session */
export interface RevokeCliSessionResponse {
  success: boolean
  message: string
  error?: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Modules/CliApi/Application/DTOs/DeviceFlowDTO.ts
git commit -m "feat: [CliApi] 新增 DeviceFlowDTO（Device Flow 請求/回應型別）"
```

---

### Task 4: InitiateDeviceFlowService

**Files:**
- Create: `src/Modules/CliApi/Application/Services/InitiateDeviceFlowService.ts`
- Test: `src/Modules/CliApi/__tests__/InitiateDeviceFlowService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/CliApi/__tests__/InitiateDeviceFlowService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDeviceCodeStore } from '../Infrastructure/Services/MemoryDeviceCodeStore'
import { InitiateDeviceFlowService } from '../Application/Services/InitiateDeviceFlowService'

describe('InitiateDeviceFlowService', () => {
  let store: MemoryDeviceCodeStore
  let service: InitiateDeviceFlowService

  beforeEach(() => {
    store = new MemoryDeviceCodeStore()
    service = new InitiateDeviceFlowService(store, 'https://app.draupnir.dev/cli/verify')
  })

  it('should generate device_code and user_code', async () => {
    const result = await service.execute()
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.deviceCode).toBeTruthy()
    expect(result.data!.userCode).toHaveLength(8)
    expect(result.data!.verificationUri).toBe('https://app.draupnir.dev/cli/verify')
    expect(result.data!.expiresIn).toBe(600) // 10 minutes
    expect(result.data!.interval).toBe(5) // 5 seconds polling
  })

  it('should store the device code in the store', async () => {
    const result = await service.execute()
    const stored = await store.findByDeviceCode(result.data!.deviceCode)
    expect(stored).not.toBeNull()
    expect(stored!.userCode).toBe(result.data!.userCode)
  })

  it('should generate unique codes on each call', async () => {
    const result1 = await service.execute()
    const result2 = await service.execute()
    expect(result1.data!.deviceCode).not.toBe(result2.data!.deviceCode)
    expect(result1.data!.userCode).not.toBe(result2.data!.userCode)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/CliApi/__tests__/InitiateDeviceFlowService.test.ts`
Expected: FAIL -- module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/CliApi/Application/Services/InitiateDeviceFlowService.ts
import type { IDeviceCodeStore } from '../../Domain/Ports/IDeviceCodeStore'
import { DeviceCode } from '../../Domain/ValueObjects/DeviceCode'
import type { InitiateDeviceFlowResponse } from '../DTOs/DeviceFlowDTO'

const DEVICE_CODE_TTL_SECONDS = 600 // 10 minutes
const POLLING_INTERVAL_SECONDS = 5

export class InitiateDeviceFlowService {
  constructor(
    private readonly store: IDeviceCodeStore,
    private readonly verificationUri: string,
  ) {}

  async execute(): Promise<InitiateDeviceFlowResponse> {
    try {
      const deviceCodeId = crypto.randomUUID()
      const userCode = DeviceCode.generateUserCode()
      const expiresAt = new Date(Date.now() + DEVICE_CODE_TTL_SECONDS * 1000)

      const deviceCode = DeviceCode.create({
        deviceCode: deviceCodeId,
        userCode,
        verificationUri: this.verificationUri,
        expiresAt,
      })

      await this.store.save(deviceCode)

      return {
        success: true,
        message: 'Device code 已產生，請前往驗證頁面輸入 user code',
        data: {
          deviceCode: deviceCodeId,
          userCode,
          verificationUri: this.verificationUri,
          expiresIn: DEVICE_CODE_TTL_SECONDS,
          interval: POLLING_INTERVAL_SECONDS,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Device flow 初始化失敗'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/CliApi/__tests__/InitiateDeviceFlowService.test.ts`
Expected: PASS -- all 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/CliApi/Application/Services/InitiateDeviceFlowService.ts src/Modules/CliApi/__tests__/InitiateDeviceFlowService.test.ts
git commit -m "feat: [CliApi] 新增 InitiateDeviceFlowService（產生 device_code + user_code）"
```

---

### Task 5: AuthorizeDeviceService

**Files:**
- Create: `src/Modules/CliApi/Application/Services/AuthorizeDeviceService.ts`
- Test: `src/Modules/CliApi/__tests__/AuthorizeDeviceService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/CliApi/__tests__/AuthorizeDeviceService.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDeviceCodeStore } from '../Infrastructure/Services/MemoryDeviceCodeStore'
import { AuthorizeDeviceService } from '../Application/Services/AuthorizeDeviceService'
import { DeviceCode } from '../Domain/ValueObjects/DeviceCode'

describe('AuthorizeDeviceService', () => {
  let store: MemoryDeviceCodeStore
  let service: AuthorizeDeviceService

  beforeEach(() => {
    store = new MemoryDeviceCodeStore()
    service = new AuthorizeDeviceService(store)
  })

  it('should authorize a pending device code', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-1',
      userCode: 'AUTH1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)

    const result = await service.execute({
      userCode: 'AUTH1234',
      userId: 'user-1',
      email: 'user@example.com',
      role: 'user',
    })

    expect(result.success).toBe(true)
    expect(result.message).toContain('授權成功')

    const updated = await store.findByDeviceCode('dc-1')
    expect(updated!.status).toBe('authorized')
    expect(updated!.userId).toBe('user-1')
  })

  it('should reject invalid user code', async () => {
    const result = await service.execute({
      userCode: 'INVALID1',
      userId: 'user-1',
      email: 'user@example.com',
      role: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_USER_CODE')
  })

  it('should reject expired device code', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-exp',
      userCode: 'EXPD1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() - 1000),
    })
    await store.save(dc)

    const result = await service.execute({
      userCode: 'EXPD1234',
      userId: 'user-1',
      email: 'user@example.com',
      role: 'user',
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty user code', async () => {
    const result = await service.execute({
      userCode: '',
      userId: 'user-1',
      email: 'user@example.com',
      role: 'user',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('USER_CODE_REQUIRED')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/CliApi/__tests__/AuthorizeDeviceService.test.ts`
Expected: FAIL -- module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/CliApi/Application/Services/AuthorizeDeviceService.ts
import type { IDeviceCodeStore } from '../../Domain/Ports/IDeviceCodeStore'
import type { AuthorizeDeviceResponse } from '../DTOs/DeviceFlowDTO'

interface AuthorizeDeviceRequest {
  userCode: string
  userId: string
  email: string
  role: string
}

export class AuthorizeDeviceService {
  constructor(private readonly store: IDeviceCodeStore) {}

  async execute(request: AuthorizeDeviceRequest): Promise<AuthorizeDeviceResponse> {
    try {
      if (!request.userCode || !request.userCode.trim()) {
        return { success: false, message: 'User code 不能為空', error: 'USER_CODE_REQUIRED' }
      }

      const deviceCode = await this.store.findByUserCode(request.userCode.toUpperCase())
      if (!deviceCode) {
        return { success: false, message: '無效的 user code', error: 'INVALID_USER_CODE' }
      }

      const authorized = deviceCode.authorize(request.userId, request.email, request.role)
      await this.store.update(authorized)

      return { success: true, message: 'CLI 裝置授權成功，請返回 CLI 等待登入完成' }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '授權失敗'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/CliApi/__tests__/AuthorizeDeviceService.test.ts`
Expected: PASS -- all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/CliApi/Application/Services/AuthorizeDeviceService.ts src/Modules/CliApi/__tests__/AuthorizeDeviceService.test.ts
git commit -m "feat: [CliApi] 新增 AuthorizeDeviceService（瀏覽器端授權 user_code）"
```

---

### Task 6: ExchangeDeviceCodeService

**Files:**
- Create: `src/Modules/CliApi/Application/Services/ExchangeDeviceCodeService.ts`
- Test: `src/Modules/CliApi/__tests__/ExchangeDeviceCodeService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/CliApi/__tests__/ExchangeDeviceCodeService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryDeviceCodeStore } from '../Infrastructure/Services/MemoryDeviceCodeStore'
import { ExchangeDeviceCodeService } from '../Application/Services/ExchangeDeviceCodeService'
import { DeviceCode } from '../Domain/ValueObjects/DeviceCode'
import { JwtTokenService } from '@/Modules/Auth/Application/Services/JwtTokenService'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'

function createMockAuthTokenRepo(): IAuthTokenRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findByUserId: vi.fn().mockResolvedValue([]),
    isRevoked: vi.fn().mockResolvedValue(false),
    revokeAll: vi.fn().mockResolvedValue(undefined),
    revoke: vi.fn().mockResolvedValue(undefined),
    deleteExpired: vi.fn().mockResolvedValue(0),
  } as unknown as IAuthTokenRepository
}

describe('ExchangeDeviceCodeService', () => {
  let store: MemoryDeviceCodeStore
  let service: ExchangeDeviceCodeService
  let jwtService: JwtTokenService
  let mockAuthTokenRepo: IAuthTokenRepository

  beforeEach(() => {
    store = new MemoryDeviceCodeStore()
    jwtService = new JwtTokenService()
    mockAuthTokenRepo = createMockAuthTokenRepo()
    service = new ExchangeDeviceCodeService(store, jwtService, mockAuthTokenRepo)
  })

  it('should return authorization_pending when code is not yet authorized', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-pending',
      userCode: 'PEND1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)

    const result = await service.execute({ deviceCode: 'dc-pending' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('authorization_pending')
  })

  it('should return tokens when code is authorized', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-auth',
      userCode: 'AUTH5678',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)

    const authorized = dc.authorize('user-1', 'user@example.com', 'user')
    await store.update(authorized)

    const result = await service.execute({ deviceCode: 'dc-auth' })
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.accessToken).toBeTruthy()
    expect(result.data!.refreshToken).toBeTruthy()
    expect(result.data!.user.id).toBe('user-1')
    expect(result.data!.user.email).toBe('user@example.com')
  })

  it('should consume the device code after token exchange', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-consume',
      userCode: 'CONS1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)
    const authorized = dc.authorize('user-1', 'u@e.com', 'user')
    await store.update(authorized)

    await service.execute({ deviceCode: 'dc-consume' })
    const afterExchange = await store.findByDeviceCode('dc-consume')
    expect(afterExchange!.status).toBe('consumed')
  })

  it('should reject invalid device code', async () => {
    const result = await service.execute({ deviceCode: 'non-existent' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('invalid_device_code')
  })

  it('should reject expired device code', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-exp',
      userCode: 'EXPD9999',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() - 1000),
    })
    // Directly set in internal map to bypass expiry check on save
    await store.save(dc)

    const result = await service.execute({ deviceCode: 'dc-exp' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('expired')
  })

  it('should save auth tokens to repository', async () => {
    const dc = DeviceCode.create({
      deviceCode: 'dc-save-tok',
      userCode: 'SAVE1234',
      verificationUri: 'https://app.draupnir.dev/cli/verify',
      expiresAt: new Date(Date.now() + 600_000),
    })
    await store.save(dc)
    const authorized = dc.authorize('user-1', 'u@e.com', 'user')
    await store.update(authorized)

    await service.execute({ deviceCode: 'dc-save-tok' })
    expect(mockAuthTokenRepo.save).toHaveBeenCalledTimes(2) // access + refresh
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/CliApi/__tests__/ExchangeDeviceCodeService.test.ts`
Expected: FAIL -- module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/CliApi/Application/Services/ExchangeDeviceCodeService.ts
import type { IDeviceCodeStore } from '../../Domain/Ports/IDeviceCodeStore'
import { DeviceCodeStatus } from '../../Domain/ValueObjects/DeviceCode'
import type { JwtTokenService } from '@/Modules/Auth/Application/Services/JwtTokenService'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import type { ExchangeDeviceCodeRequest, ExchangeDeviceCodeResponse } from '../DTOs/DeviceFlowDTO'
import { createHash } from 'crypto'

export class ExchangeDeviceCodeService {
  constructor(
    private readonly store: IDeviceCodeStore,
    private readonly jwtService: JwtTokenService,
    private readonly authTokenRepository: IAuthTokenRepository,
  ) {}

  async execute(request: ExchangeDeviceCodeRequest): Promise<ExchangeDeviceCodeResponse> {
    try {
      const deviceCode = await this.store.findByDeviceCode(request.deviceCode)

      // findByDeviceCode returns null for expired entries
      if (!deviceCode) {
        // Check if it existed but expired vs never existed
        // Since MemoryDeviceCodeStore auto-cleans expired, treat as expired/invalid
        return {
          success: false,
          message: '無效或已過期的 device code',
          error: 'invalid_device_code',
        }
      }

      if (deviceCode.isExpired()) {
        return {
          success: false,
          message: 'Device code 已過期，請重新申請',
          error: 'expired',
        }
      }

      if (deviceCode.status === DeviceCodeStatus.CONSUMED) {
        return {
          success: false,
          message: '此 device code 已被使用',
          error: 'invalid_device_code',
        }
      }

      if (deviceCode.status === DeviceCodeStatus.PENDING) {
        return {
          success: false,
          message: '等待使用者授權中',
          error: 'authorization_pending',
        }
      }

      // Status is AUTHORIZED -- issue tokens
      const userId = deviceCode.userId!
      const email = deviceCode.userEmail!
      const role = deviceCode.userRole!

      const accessTokenObj = this.jwtService.signAccessToken({
        userId,
        email,
        role,
        permissions: [],
      })

      const refreshTokenObj = this.jwtService.signRefreshToken({
        userId,
        email,
        role,
        permissions: [],
      })

      // Save tokens for revocation tracking
      const accessTokenStr = accessTokenObj.getValue()
      const accessTokenHash = createHash('sha256').update(accessTokenStr).digest('hex')
      await this.authTokenRepository.save({
        id: `${userId}_cli_access_${Date.now()}`,
        userId,
        tokenHash: accessTokenHash,
        type: 'access',
        expiresAt: accessTokenObj.getExpiresAt(),
        createdAt: new Date(),
      })

      const refreshTokenStr = refreshTokenObj.getValue()
      const refreshTokenHash = createHash('sha256').update(refreshTokenStr).digest('hex')
      await this.authTokenRepository.save({
        id: `${userId}_cli_refresh_${Date.now()}`,
        userId,
        tokenHash: refreshTokenHash,
        type: 'refresh',
        expiresAt: refreshTokenObj.getExpiresAt(),
        createdAt: new Date(),
      })

      // Mark device code as consumed
      const consumed = deviceCode.consume()
      await this.store.update(consumed)

      return {
        success: true,
        message: 'CLI 登入成功',
        data: {
          accessToken: accessTokenStr,
          refreshToken: refreshTokenStr,
          user: { id: userId, email, role },
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Token 交換失敗'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/CliApi/__tests__/ExchangeDeviceCodeService.test.ts`
Expected: PASS -- all 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/CliApi/Application/Services/ExchangeDeviceCodeService.ts src/Modules/CliApi/__tests__/ExchangeDeviceCodeService.test.ts
git commit -m "feat: [CliApi] 新增 ExchangeDeviceCodeService（CLI 輪詢換取 JWT token）"
```

---

### Task 7: ProxyCliRequestService

**Files:**
- Create: `src/Modules/CliApi/Application/Services/ProxyCliRequestService.ts`
- Test: `src/Modules/CliApi/__tests__/ProxyCliRequestService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/CliApi/__tests__/ProxyCliRequestService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProxyCliRequestService } from '../Application/Services/ProxyCliRequestService'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

function createMockBifrostClient(response?: unknown): BifrostClient {
  return {
    proxyRequest: vi.fn().mockResolvedValue(
      response ?? {
        id: 'chatcmpl-123',
        choices: [{ message: { role: 'assistant', content: 'Hello!' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      },
    ),
  } as unknown as BifrostClient
}

describe('ProxyCliRequestService', () => {
  let service: ProxyCliRequestService
  let mockClient: BifrostClient

  beforeEach(() => {
    mockClient = createMockBifrostClient()
    service = new ProxyCliRequestService(mockClient)
  })

  it('should proxy a chat completion request to Bifrost', async () => {
    const result = await service.execute({
      userId: 'user-1',
      body: {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
      },
    })
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(mockClient.proxyRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    )
  })

  it('should return error when model is missing', async () => {
    const result = await service.execute({
      userId: 'user-1',
      body: { model: '', messages: [{ role: 'user', content: 'Hi' }] },
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('MODEL_REQUIRED')
  })

  it('should return error when messages are empty', async () => {
    const result = await service.execute({
      userId: 'user-1',
      body: { model: 'gpt-4', messages: [] },
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('MESSAGES_REQUIRED')
  })

  it('should handle Bifrost errors gracefully', async () => {
    const failClient = {
      proxyRequest: vi.fn().mockRejectedValue(new Error('Bifrost 連線失敗')),
    } as unknown as BifrostClient
    const failService = new ProxyCliRequestService(failClient)

    const result = await failService.execute({
      userId: 'user-1',
      body: { model: 'gpt-4', messages: [{ role: 'user', content: 'Hi' }] },
    })
    expect(result.success).toBe(false)
    expect(result.message).toContain('Bifrost')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/CliApi/__tests__/ProxyCliRequestService.test.ts`
Expected: FAIL -- module not found

- [ ] **Step 3: Write minimal implementation**

> **Note:** BifrostClient 目前沒有 `proxyRequest` 方法，需要先在 BifrostClient 新增。如果 BifrostClient 不方便修改，可改用直接 fetch 至 Bifrost API URL。以下實作使用直接 fetch 方式，避免修改 Foundation 層。

```typescript
// src/Modules/CliApi/Application/Services/ProxyCliRequestService.ts
import type { ProxyCliRequestBody } from '../DTOs/DeviceFlowDTO'

interface ProxyRequest {
  userId: string
  body: ProxyCliRequestBody
}

interface ProxyResponse {
  success: boolean
  message: string
  data?: unknown
  error?: string
}

export interface ICliProxyClient {
  proxyRequest(body: ProxyCliRequestBody): Promise<unknown>
}

export class ProxyCliRequestService {
  constructor(private readonly client: ICliProxyClient) {}

  async execute(request: ProxyRequest): Promise<ProxyResponse> {
    try {
      if (!request.body.model || !request.body.model.trim()) {
        return { success: false, message: '模型名稱不能為空', error: 'MODEL_REQUIRED' }
      }

      if (!request.body.messages || request.body.messages.length === 0) {
        return { success: false, message: '訊息列表不能為空', error: 'MESSAGES_REQUIRED' }
      }

      const result = await this.client.proxyRequest(request.body)

      return {
        success: true,
        message: 'AI 請求完成',
        data: result,
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'AI 請求代理失敗'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/CliApi/__tests__/ProxyCliRequestService.test.ts`
Expected: PASS -- all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/CliApi/Application/Services/ProxyCliRequestService.ts src/Modules/CliApi/__tests__/ProxyCliRequestService.test.ts
git commit -m "feat: [CliApi] 新增 ProxyCliRequestService（轉發 CLI AI 請求至 Bifrost）"
```

---

### Task 8: RevokeCliSessionService

**Files:**
- Create: `src/Modules/CliApi/Application/Services/RevokeCliSessionService.ts`
- Test: `src/Modules/CliApi/__tests__/RevokeCliSessionService.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/Modules/CliApi/__tests__/RevokeCliSessionService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RevokeCliSessionService } from '../Application/Services/RevokeCliSessionService'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'

function createMockAuthTokenRepo(): IAuthTokenRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findByUserId: vi.fn().mockResolvedValue([]),
    isRevoked: vi.fn().mockResolvedValue(false),
    revokeAll: vi.fn().mockResolvedValue(undefined),
    revoke: vi.fn().mockResolvedValue(undefined),
    deleteExpired: vi.fn().mockResolvedValue(0),
  } as unknown as IAuthTokenRepository
}

describe('RevokeCliSessionService', () => {
  let service: RevokeCliSessionService
  let mockRepo: IAuthTokenRepository

  beforeEach(() => {
    mockRepo = createMockAuthTokenRepo()
    service = new RevokeCliSessionService(mockRepo)
  })

  it('should revoke a specific token by hash', async () => {
    const result = await service.execute({
      userId: 'user-1',
      tokenHash: 'abc123hash',
    })
    expect(result.success).toBe(true)
    expect(mockRepo.revoke).toHaveBeenCalledWith('abc123hash')
  })

  it('should revoke all tokens for a user', async () => {
    const result = await service.executeRevokeAll({
      userId: 'user-1',
    })
    expect(result.success).toBe(true)
    expect(mockRepo.revokeAll).toHaveBeenCalledWith('user-1')
  })

  it('should handle revocation errors gracefully', async () => {
    const failRepo = {
      ...createMockAuthTokenRepo(),
      revoke: vi.fn().mockRejectedValue(new Error('DB error')),
    } as unknown as IAuthTokenRepository
    const failService = new RevokeCliSessionService(failRepo)

    const result = await failService.execute({
      userId: 'user-1',
      tokenHash: 'abc123hash',
    })
    expect(result.success).toBe(false)
    expect(result.message).toContain('DB error')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/Modules/CliApi/__tests__/RevokeCliSessionService.test.ts`
Expected: FAIL -- module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/Modules/CliApi/Application/Services/RevokeCliSessionService.ts
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import type { RevokeCliSessionResponse } from '../DTOs/DeviceFlowDTO'

interface RevokeRequest {
  userId: string
  tokenHash: string
}

interface RevokeAllRequest {
  userId: string
}

export class RevokeCliSessionService {
  constructor(private readonly authTokenRepository: IAuthTokenRepository) {}

  async execute(request: RevokeRequest): Promise<RevokeCliSessionResponse> {
    try {
      await this.authTokenRepository.revoke(request.tokenHash)
      return { success: true, message: 'CLI session 已撤銷' }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '撤銷失敗'
      return { success: false, message, error: message }
    }
  }

  async executeRevokeAll(request: RevokeAllRequest): Promise<RevokeCliSessionResponse> {
    try {
      await this.authTokenRepository.revokeAll(request.userId)
      return { success: true, message: '所有 CLI session 已撤銷' }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '撤銷失敗'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/Modules/CliApi/__tests__/RevokeCliSessionService.test.ts`
Expected: PASS -- all 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/Modules/CliApi/Application/Services/RevokeCliSessionService.ts src/Modules/CliApi/__tests__/RevokeCliSessionService.test.ts
git commit -m "feat: [CliApi] 新增 RevokeCliSessionService（撤銷 CLI session token）"
```

---

### Task 9: CliApiController

**Files:**
- Create: `src/Modules/CliApi/Presentation/Controllers/CliApiController.ts`

- [ ] **Step 1: Write the controller**

```typescript
// src/Modules/CliApi/Presentation/Controllers/CliApiController.ts
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { InitiateDeviceFlowService } from '../../Application/Services/InitiateDeviceFlowService'
import type { AuthorizeDeviceService } from '../../Application/Services/AuthorizeDeviceService'
import type { ExchangeDeviceCodeService } from '../../Application/Services/ExchangeDeviceCodeService'
import type { ProxyCliRequestService } from '../../Application/Services/ProxyCliRequestService'
import type { RevokeCliSessionService } from '../../Application/Services/RevokeCliSessionService'
import { createHash } from 'crypto'

export class CliApiController {
  constructor(
    private readonly initiateService: InitiateDeviceFlowService,
    private readonly authorizeService: AuthorizeDeviceService,
    private readonly exchangeService: ExchangeDeviceCodeService,
    private readonly proxyService: ProxyCliRequestService,
    private readonly revokeService: RevokeCliSessionService,
  ) {}

  /** POST /cli/device-code -- CLI 請求裝置碼（公開端點） */
  async initiateDeviceFlow(ctx: IHttpContext): Promise<Response> {
    const result = await this.initiateService.execute()
    const status = result.success ? 200 : 500
    return ctx.json(result, status)
  }

  /** POST /cli/authorize -- 使用者在瀏覽器端授權（需要登入） */
  async authorizeDevice(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)

    const body = await ctx.getJsonBody<{ userCode?: string }>()
    if (!body.userCode) {
      return ctx.json({ success: false, message: '缺少 userCode', error: 'USER_CODE_REQUIRED' }, 400)
    }

    const result = await this.authorizeService.execute({
      userCode: body.userCode,
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
    })
    const status = result.success ? 200 : result.error === 'INVALID_USER_CODE' ? 404 : 400
    return ctx.json(result, status)
  }

  /** POST /cli/token -- CLI 輪詢換取 token（公開端點） */
  async exchangeToken(ctx: IHttpContext): Promise<Response> {
    const body = await ctx.getJsonBody<{ deviceCode?: string }>()
    if (!body.deviceCode) {
      return ctx.json({ success: false, message: '缺少 deviceCode', error: 'DEVICE_CODE_REQUIRED' }, 400)
    }

    const result = await this.exchangeService.execute({ deviceCode: body.deviceCode })
    if (result.success) return ctx.json(result, 200)
    if (result.error === 'authorization_pending') return ctx.json(result, 428)
    if (result.error === 'expired') return ctx.json(result, 410)
    return ctx.json(result, 400)
  }

  /** POST /cli/proxy -- 轉發 AI 請求（需要 token） */
  async proxyRequest(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)

    const body = await ctx.getJsonBody<{ model?: string; messages?: Array<{ role: string; content: string }> }>()

    const result = await this.proxyService.execute({
      userId: auth.userId,
      body: {
        model: body.model ?? '',
        messages: body.messages ?? [],
      },
    })
    const status = result.success ? 200 : 400
    return ctx.json(result, status)
  }

  /** POST /cli/logout -- 撤銷目前的 CLI session（需要 token） */
  async logout(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)

    const token = this.extractRawToken(ctx)
    if (!token) {
      return ctx.json({ success: false, message: '無法取得 token', error: 'TOKEN_MISSING' }, 400)
    }

    const tokenHash = createHash('sha256').update(token).digest('hex')
    const result = await this.revokeService.execute({
      userId: auth.userId,
      tokenHash,
    })
    return ctx.json(result, result.success ? 200 : 500)
  }

  /** POST /cli/logout-all -- 撤銷所有 CLI session（需要 token） */
  async logoutAll(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)

    const result = await this.revokeService.executeRevokeAll({ userId: auth.userId })
    return ctx.json(result, result.success ? 200 : 500)
  }

  private extractRawToken(ctx: IHttpContext): string | null {
    const header =
      ctx.getHeader('authorization') ??
      ctx.getHeader('Authorization') ??
      ctx.headers?.authorization ??
      ctx.headers?.Authorization
    if (!header) return null
    const parts = header.split(' ')
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null
    return parts[1]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Modules/CliApi/Presentation/Controllers/CliApiController.ts
git commit -m "feat: [CliApi] 新增 CliApiController（6 個端點 handler）"
```

---

### Task 10: Routes + CliSessionStatus ValueObject

**Files:**
- Create: `src/Modules/CliApi/Presentation/Routes/cliApi.routes.ts`
- Create: `src/Modules/CliApi/Domain/ValueObjects/CliSessionStatus.ts`

- [ ] **Step 1: Write the routes**

```typescript
// src/Modules/CliApi/Presentation/Routes/cliApi.routes.ts
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { CliApiController } from '../Controllers/CliApiController'
import { requireAuth } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'

export function registerCliApiRoutes(router: IModuleRouter, controller: CliApiController): void {
  // 公開端點（CLI 端使用，無需認證）
  router.post('/cli/device-code', [], (ctx) => controller.initiateDeviceFlow(ctx))
  router.post('/cli/token', [], (ctx) => controller.exchangeToken(ctx))

  // 需要認證的端點
  router.post('/cli/authorize', [requireAuth()], (ctx) => controller.authorizeDevice(ctx))
  router.post('/cli/proxy', [requireAuth()], (ctx) => controller.proxyRequest(ctx))
  router.post('/cli/logout', [requireAuth()], (ctx) => controller.logout(ctx))
  router.post('/cli/logout-all', [requireAuth()], (ctx) => controller.logoutAll(ctx))
}
```

- [ ] **Step 2: Write CliSessionStatus (simple enum-like ValueObject for future use)**

```typescript
// src/Modules/CliApi/Domain/ValueObjects/CliSessionStatus.ts
export const CliSessionStatusValues = ['active', 'revoked', 'expired'] as const
export type CliSessionStatusType = (typeof CliSessionStatusValues)[number]

export class CliSessionStatus {
  private constructor(private readonly value: CliSessionStatusType) {}

  static active(): CliSessionStatus {
    return new CliSessionStatus('active')
  }

  static revoked(): CliSessionStatus {
    return new CliSessionStatus('revoked')
  }

  static expired(): CliSessionStatus {
    return new CliSessionStatus('expired')
  }

  static from(value: string): CliSessionStatus {
    if (!CliSessionStatusValues.includes(value as CliSessionStatusType)) {
      throw new Error(`無效的 CLI Session 狀態: ${value}`)
    }
    return new CliSessionStatus(value as CliSessionStatusType)
  }

  isActive(): boolean {
    return this.value === 'active'
  }

  isRevoked(): boolean {
    return this.value === 'revoked'
  }

  getValue(): CliSessionStatusType {
    return this.value
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/CliApi/Presentation/Routes/cliApi.routes.ts src/Modules/CliApi/Domain/ValueObjects/CliSessionStatus.ts
git commit -m "feat: [CliApi] 新增 CLI API 路由定義與 CliSessionStatus ValueObject"
```

---

### Task 11: ServiceProvider + Wiring + Bootstrap

**Files:**
- Create: `src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts`
- Create: `src/Modules/CliApi/index.ts`
- Modify: `src/wiring/index.ts`
- Modify: `src/bootstrap.ts`
- Modify: `src/routes.ts`

- [ ] **Step 1: Write the ServiceProvider**

```typescript
// src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { MemoryDeviceCodeStore } from '../Services/MemoryDeviceCodeStore'
import { InitiateDeviceFlowService } from '../../Application/Services/InitiateDeviceFlowService'
import { AuthorizeDeviceService } from '../../Application/Services/AuthorizeDeviceService'
import { ExchangeDeviceCodeService } from '../../Application/Services/ExchangeDeviceCodeService'
import { ProxyCliRequestService } from '../../Application/Services/ProxyCliRequestService'
import { RevokeCliSessionService } from '../../Application/Services/RevokeCliSessionService'
import type { JwtTokenService } from '@/Modules/Auth/Application/Services/JwtTokenService'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

const CLI_VERIFICATION_URI = process.env.CLI_VERIFICATION_URI || 'http://localhost:3000/cli/verify'

export class CliApiServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('deviceCodeStore', () => new MemoryDeviceCodeStore())

    container.bind('initiateDeviceFlowService', (c: IContainer) => {
      return new InitiateDeviceFlowService(
        c.make('deviceCodeStore') as MemoryDeviceCodeStore,
        CLI_VERIFICATION_URI,
      )
    })

    container.bind('authorizeDeviceService', (c: IContainer) => {
      return new AuthorizeDeviceService(
        c.make('deviceCodeStore') as MemoryDeviceCodeStore,
      )
    })

    container.bind('exchangeDeviceCodeService', (c: IContainer) => {
      return new ExchangeDeviceCodeService(
        c.make('deviceCodeStore') as MemoryDeviceCodeStore,
        c.make('jwtTokenService') as JwtTokenService,
        c.make('authTokenRepository') as IAuthTokenRepository,
      )
    })

    container.bind('proxyCliRequestService', (c: IContainer) => {
      const bifrostClient = c.make('bifrostClient') as BifrostClient
      return new ProxyCliRequestService(bifrostClient as any)
    })

    container.bind('revokeCliSessionService', (c: IContainer) => {
      return new RevokeCliSessionService(
        c.make('authTokenRepository') as IAuthTokenRepository,
      )
    })
  }

  override boot(_context: unknown): void {
    console.log('🖥️ [CliApi] Module loaded')
  }
}
```

- [ ] **Step 2: Write the barrel export**

```typescript
// src/Modules/CliApi/index.ts
export { DeviceCode, DeviceCodeStatus } from './Domain/ValueObjects/DeviceCode'
export { CliSessionStatus } from './Domain/ValueObjects/CliSessionStatus'
export type { IDeviceCodeStore } from './Domain/Ports/IDeviceCodeStore'

export { InitiateDeviceFlowService } from './Application/Services/InitiateDeviceFlowService'
export { AuthorizeDeviceService } from './Application/Services/AuthorizeDeviceService'
export { ExchangeDeviceCodeService } from './Application/Services/ExchangeDeviceCodeService'
export { ProxyCliRequestService } from './Application/Services/ProxyCliRequestService'
export { RevokeCliSessionService } from './Application/Services/RevokeCliSessionService'

export { MemoryDeviceCodeStore } from './Infrastructure/Services/MemoryDeviceCodeStore'
export { CliApiServiceProvider } from './Infrastructure/Providers/CliApiServiceProvider'

export { CliApiController } from './Presentation/Controllers/CliApiController'
export { registerCliApiRoutes } from './Presentation/Routes/cliApi.routes'
```

- [ ] **Step 3: Add registerCliApi to wiring/index.ts**

在 `src/wiring/index.ts` 檔案末尾新增：

```typescript
import { CliApiController, registerCliApiRoutes } from '@/Modules/CliApi'

/**
 * 註冊 CliApi 模組
 */
export const registerCliApi = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const controller = new CliApiController(
    core.container.make('initiateDeviceFlowService') as any,
    core.container.make('authorizeDeviceService') as any,
    core.container.make('exchangeDeviceCodeService') as any,
    core.container.make('proxyCliRequestService') as any,
    core.container.make('revokeCliSessionService') as any,
  )
  registerCliApiRoutes(router, controller)
}
```

- [ ] **Step 4: Register CliApiServiceProvider in bootstrap.ts**

在 `src/bootstrap.ts` 新增 import 和 registration：

```typescript
import { CliApiServiceProvider } from './Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider'

// 在 core.register(...) 區塊加入：
core.register(createGravitoServiceProvider(new CliApiServiceProvider()))
```

- [ ] **Step 5: Call registerCliApi in routes.ts**

在 `src/routes.ts` 新增 import 和呼叫：

```typescript
import { registerCliApi } from './wiring'

// 在 registerRoutes 函數內加入：
registerCliApi(core)
```

- [ ] **Step 6: Verify build passes**

Run: `bun run typecheck`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts src/Modules/CliApi/index.ts src/wiring/index.ts src/bootstrap.ts src/routes.ts
git commit -m "feat: [CliApi] 整合 ServiceProvider、Wiring、Bootstrap 完成模組註冊"
```

---

### Task 12: End-to-End Integration Verification

**Files:**
- No new files -- verify existing wiring works

- [ ] **Step 1: Run all CliApi tests**

Run: `bun test src/Modules/CliApi/`
Expected: PASS -- all tests pass (DeviceCode, MemoryDeviceCodeStore, InitiateDeviceFlowService, AuthorizeDeviceService, ExchangeDeviceCodeService, ProxyCliRequestService, RevokeCliSessionService)

- [ ] **Step 2: Run full test suite to ensure no regressions**

Run: `bun test`
Expected: PASS -- no regressions

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: No errors

- [ ] **Step 4: Run lint**

Run: `bun run lint`
Expected: No errors (or only pre-existing warnings)

- [ ] **Step 5: Test dev server starts correctly**

Run: `ORM=memory bun run dev`
Expected: Server starts, logs show `[CliApi] Module loaded`

- [ ] **Step 6: Manual smoke test (optional)**

```bash
# 1. Initiate device flow
curl -s -X POST http://localhost:3000/cli/device-code | jq .

# 2. Login to get a token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@test.com","password":"password"}' | jq -r '.data.accessToken')

# 3. Authorize with user code from step 1
curl -s -X POST http://localhost:3000/cli/authorize \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"userCode":"<USER_CODE_FROM_STEP_1>"}' | jq .

# 4. Exchange device code for CLI token
curl -s -X POST http://localhost:3000/cli/token \
  -H 'Content-Type: application/json' \
  -d '{"deviceCode":"<DEVICE_CODE_FROM_STEP_1>"}' | jq .
```

- [ ] **Step 7: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: [CliApi] 修復整合測試發現的問題"
```

---

## API Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/cli/device-code` | No | 產生 device_code + user_code |
| POST | `/cli/authorize` | Yes | 使用者在瀏覽器端授權 user_code |
| POST | `/cli/token` | No | CLI 輪詢換取 JWT token |
| POST | `/cli/proxy` | Yes | 轉發 AI 請求至 Bifrost |
| POST | `/cli/logout` | Yes | 撤銷目前 CLI session |
| POST | `/cli/logout-all` | Yes | 撤銷所有 CLI session |

## Device Flow 狀態機

```
PENDING ──(authorize)──> AUTHORIZED ──(exchange)──> CONSUMED
   │                                                    
   └──(expired)──> [auto-cleaned by store]              
```

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `CLI_VERIFICATION_URI` | 瀏覽器端授權頁面 URL | `http://localhost:3000/cli/verify` |

## Key Design Decisions

1. **IDeviceCodeStore 介面** -- 預設使用 MemoryDeviceCodeStore（Map-based），生產環境可替換為 RedisDeviceCodeStore。測試環境完全不需要外部依賴。
2. **User code 格式** -- 8 位大寫英數字（排除易混淆的 I/O），方便使用者手動輸入。
3. **Token 交換後消費** -- device code 在 token 交換後標記為 CONSUMED，防止重複使用。
4. **Proxy 介面抽象** -- ProxyCliRequestService 使用 `ICliProxyClient` 介面，不直接依賴 BifrostClient，便於測試和未來替換。
5. **公開 vs 認證端點** -- `/cli/device-code` 和 `/cli/token` 為公開端點（CLI 端無法先認證），`/cli/authorize` 需要瀏覽器端登入。
6. **JWT 簽發複用** -- 使用現有 `JwtTokenService` 簽發 token，保持與 Web 登入相同的 token 格式和驗證機制。
7. **Immutable pattern** -- DeviceCode ValueObject 遵循 immutable pattern，所有狀態變更（authorize、consume）皆回傳新實例。
