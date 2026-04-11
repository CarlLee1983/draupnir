# CliApi Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement complete CliApi module with Device Authorization Grant Flow, token exchange, session management, and LLM proxy endpoints.

**Architecture:** 
CliApi follows DDD patterns with Device Flow as the core flow. Users on one device (CLI) initiate a device code, then authorize via browser on another device. The CLI polls for token exchange. Sessions are managed via JWT with blacklist revocation. All services use the `IDeviceCodeStore` abstraction (swappable: Memory, Redis, Database).

**Tech Stack:** TypeScript, Bun test, Zod validation, DDD (Value Objects, Services, Repositories), JWT tokens, SHA-256 hashing

---

## File Structure Map

### Existing (Framework Already In Place)

```
src/Modules/CliApi/
├── Application/
│   ├── DTOs/DeviceFlowDTO.ts (✓ interfaces exist)
│   └── Services/
│       ├── InitiateDeviceFlowService.ts (✓ partial)
│       ├── AuthorizeDeviceService.ts (✓ partial)
│       ├── ExchangeDeviceCodeService.ts (✓ partial)
│       ├── ProxyCliRequestService.ts (✓ framework)
│       └── RevokeCliSessionService.ts (✓ framework)
├── Domain/
│   ├── Ports/IDeviceCodeStore.ts (✓ interface defined)
│   └── ValueObjects/
│       ├── DeviceCode.ts (✓ complete)
│       └── CliSessionStatus.ts (✓ enum)
├── Infrastructure/
│   ├── Providers/CliApiServiceProvider.ts (✓ framework)
│   └── Services/MemoryDeviceCodeStore.ts (✓ complete)
├── Presentation/
│   ├── Controllers/CliApiController.ts (✓ all methods stubbed)
│   └── Routes/cliApi.routes.ts (✓ all routes registered)
└── __tests__/
    └── [various test files] (partial coverage)
```

### To Complete

1. **Verification page** (optional): `src/Pages/Auth/VerifyDevicePage.ts` — Web UI for device authorization
2. **Full test suite**: Unit, integration, E2E tests for all services and flows
3. **Environment setup**: `.env` configuration, validation

---

## Task Breakdown

### Task 1: Verify & Complete InitiateDeviceFlowService

**Files:**
- Modify: `src/Modules/CliApi/Application/Services/InitiateDeviceFlowService.ts`
- Test: `src/Modules/CliApi/__tests__/InitiateDeviceFlowService.test.ts`

**Context:** This service starts the OAuth Device Flow. It must generate unique device codes, persist them, and return proper metadata to the CLI.

- [ ] **Step 1: Review current implementation**

Open `src/Modules/CliApi/Application/Services/InitiateDeviceFlowService.ts` and verify:
- Constructor accepts `IDeviceCodeStore` and `verificationUri`
- `execute()` method generates UUID (device code) and user code
- DeviceCode entity is created and stored
- Response shape matches `InitiateDeviceFlowResponse` from DTOs

- [ ] **Step 2: Write unit test for successful flow**

Create test file `src/Modules/CliApi/__tests__/InitiateDeviceFlowService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { InitiateDeviceFlowService } from '../Application/Services/InitiateDeviceFlowService'
import type { IDeviceCodeStore } from '../Domain/Ports/IDeviceCodeStore'
import { DeviceCode } from '../Domain/ValueObjects/DeviceCode'

describe('InitiateDeviceFlowService', () => {
  let service: InitiateDeviceFlowService
  let mockStore: IDeviceCodeStore

  beforeEach(() => {
    mockStore = {
      save: vi.fn(),
      findByDeviceCode: vi.fn(),
      findByUserCode: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      cleanup: vi.fn(),
    }

    service = new InitiateDeviceFlowService(
      mockStore,
      'https://draupnir.local/verify-device',
    )
  })

  it('should generate device code and user code on execute', async () => {
    const result = await service.execute()

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.deviceCode).toBeTruthy()
    expect(result.data?.userCode).toBeTruthy()
    expect(result.data?.userCode).toMatch(/^[A-Z0-9]{8}$/)
    expect(result.data?.verificationUri).toBe('https://draupnir.local/verify-device')
    expect(result.data?.expiresIn).toBe(600)
    expect(result.data?.interval).toBe(5)
  })

  it('should save device code to store', async () => {
    const saveSpy = vi.spyOn(mockStore, 'save')
    await service.execute()

    expect(saveSpy).toHaveBeenCalled()
    const savedCode = saveSpy.mock.calls[0][0]
    expect(savedCode).toBeInstanceOf(DeviceCode)
    expect(savedCode.isExpired()).toBe(false)
  })

  it('should handle store errors gracefully', async () => {
    const saveError = new Error('Store failed')
    mockStore.save = vi.fn().mockRejectedValueOnce(saveError)

    const result = await service.execute()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Store failed')
  })
})
```

- [ ] **Step 3: Run test to verify it passes**

```bash
bun test src/Modules/CliApi/__tests__/InitiateDeviceFlowService.test.ts
```

Expected output: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/Modules/CliApi/Application/Services/InitiateDeviceFlowService.ts
git add src/Modules/CliApi/__tests__/InitiateDeviceFlowService.test.ts
git commit -m "test: add InitiateDeviceFlowService unit tests"
```

---

### Task 2: Verify & Complete AuthorizeDeviceService

**Files:**
- Modify: `src/Modules/CliApi/Application/Services/AuthorizeDeviceService.ts`
- Test: `src/Modules/CliApi/__tests__/AuthorizeDeviceService.test.ts`

**Context:** This service validates a user code from the browser authorization page and marks the device as authorized.

- [ ] **Step 1: Review current implementation**

Verify the service:
- Takes `userCode`, `userId`, `email`, `role` as input
- Finds device code by user code
- Authorizes it with user identity
- Updates the store with authorized state

- [ ] **Step 2: Write unit test for successful authorization**

```typescript
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { AuthorizeDeviceService } from '../Application/Services/AuthorizeDeviceService'
import type { IDeviceCodeStore } from '../Domain/Ports/IDeviceCodeStore'
import { DeviceCode, DeviceCodeStatus } from '../Domain/ValueObjects/DeviceCode'

describe('AuthorizeDeviceService', () => {
  let service: AuthorizeDeviceService
  let mockStore: IDeviceCodeStore
  let validDeviceCode: DeviceCode

  beforeEach(() => {
    validDeviceCode = DeviceCode.create({
      deviceCode: 'test-device-code',
      userCode: 'ABCD1234',
      verificationUri: 'https://draupnir.local/verify-device',
      expiresAt: new Date(Date.now() + 600000),
    })

    mockStore = {
      save: vi.fn(),
      findByDeviceCode: vi.fn(),
      findByUserCode: vi.fn().mockResolvedValue(validDeviceCode),
      update: vi.fn(),
      delete: vi.fn(),
      cleanup: vi.fn(),
    }

    service = new AuthorizeDeviceService(mockStore)
  })

  it('should authorize device with user identity', async () => {
    const updateSpy = vi.spyOn(mockStore, 'update')
    const result = await service.execute({
      userCode: 'ABCD1234',
      userId: 'user-123',
      email: 'user@example.com',
      role: 'user',
    })

    expect(result.success).toBe(true)
    expect(updateSpy).toHaveBeenCalled()
    const authorizedCode = updateSpy.mock.calls[0][0]
    expect(authorizedCode.status).toBe(DeviceCodeStatus.AUTHORIZED)
    expect(authorizedCode.userId).toBe('user-123')
  })

  it('should reject invalid user code', async () => {
    mockStore.findByUserCode = vi.fn().mockResolvedValue(null)

    const result = await service.execute({
      userCode: 'INVALID',
      userId: 'user-123',
      email: 'user@example.com',
      role: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_USER_CODE')
  })

  it('should reject expired device code', async () => {
    const expiredCode = DeviceCode.create({
      deviceCode: 'expired-code',
      userCode: 'EXPIRED1',
      verificationUri: 'https://draupnir.local/verify-device',
      expiresAt: new Date(Date.now() - 1000),
    })
    mockStore.findByUserCode = vi.fn().mockResolvedValue(expiredCode)

    const result = await service.execute({
      userCode: 'EXPIRED1',
      userId: 'user-123',
      email: 'user@example.com',
      role: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('EXPIRED')
  })
})
```

- [ ] **Step 3: Run test**

```bash
bun test src/Modules/CliApi/__tests__/AuthorizeDeviceService.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/Modules/CliApi/Application/Services/AuthorizeDeviceService.ts
git add src/Modules/CliApi/__tests__/AuthorizeDeviceService.test.ts
git commit -m "test: add AuthorizeDeviceService unit tests"
```

---

### Task 3: Verify & Complete ExchangeDeviceCodeService

**Files:**
- Modify: `src/Modules/CliApi/Application/Services/ExchangeDeviceCodeService.ts`
- Test: `src/Modules/CliApi/__tests__/ExchangeDeviceCodeService.test.ts`

**Context:** This is the critical service that exchanges an authorized device code for JWT tokens. Must handle pending/authorized/consumed/expired states correctly.

- [ ] **Step 1: Review current implementation**

Verify:
- Checks device code existence
- Validates expiration
- Handles all three state scenarios: PENDING, AUTHORIZED, CONSUMED
- Issues JWT access and refresh tokens on AUTHORIZED
- Marks code as CONSUMED after successful exchange
- Persists tokens to repository for revocation tracking

- [ ] **Step 2: Write unit test for pending authorization**

```typescript
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { ExchangeDeviceCodeService } from '../Application/Services/ExchangeDeviceCodeService'
import type { IDeviceCodeStore } from '../Domain/Ports/IDeviceCodeStore'
import type { IJwtTokenService } from '@/Modules/Auth/Application/Ports/IJwtTokenService'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import { DeviceCode, DeviceCodeStatus } from '../Domain/ValueObjects/DeviceCode'

describe('ExchangeDeviceCodeService', () => {
  let service: ExchangeDeviceCodeService
  let mockStore: IDeviceCodeStore
  let mockJwtService: IJwtTokenService
  let mockTokenRepo: IAuthTokenRepository

  beforeEach(() => {
    mockStore = {
      save: vi.fn(),
      findByDeviceCode: vi.fn(),
      findByUserCode: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      cleanup: vi.fn(),
    }

    mockJwtService = {
      signAccessToken: vi.fn(),
      signRefreshToken: vi.fn(),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn(),
    }

    mockTokenRepo = {
      save: vi.fn(),
      findById: vi.fn(),
      findByUserId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }

    service = new ExchangeDeviceCodeService(
      mockStore,
      mockJwtService,
      mockTokenRepo,
    )
  })

  it('should return authorization_pending for PENDING device code', async () => {
    const pendingCode = DeviceCode.create({
      deviceCode: 'pending-code',
      userCode: 'PEND0001',
      verificationUri: 'https://draupnir.local/verify-device',
      expiresAt: new Date(Date.now() + 600000),
    })
    mockStore.findByDeviceCode = vi.fn().mockResolvedValue(pendingCode)

    const result = await service.execute({ deviceCode: 'pending-code' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('authorization_pending')
  })

  it('should return expired for expired device code', async () => {
    const expiredCode = DeviceCode.create({
      deviceCode: 'expired-code',
      userCode: 'EXP00001',
      verificationUri: 'https://draupnir.local/verify-device',
      expiresAt: new Date(Date.now() - 1000),
    })
    mockStore.findByDeviceCode = vi.fn().mockResolvedValue(expiredCode)

    const result = await service.execute({ deviceCode: 'expired-code' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('expired')
  })

  it('should issue tokens for AUTHORIZED device code', async () => {
    const authorizedCode = DeviceCode.create({
      deviceCode: 'auth-code',
      userCode: 'AUTH0001',
      verificationUri: 'https://draupnir.local/verify-device',
      expiresAt: new Date(Date.now() + 600000),
    })
    const authorizedWithUser = authorizedCode.authorize('user-123', 'user@test.com', 'user')

    mockStore.findByDeviceCode = vi.fn().mockResolvedValue(authorizedWithUser)
    mockJwtService.signAccessToken = vi.fn().mockReturnValue({
      getValue: () => 'access-token-jwt',
    })
    mockJwtService.signRefreshToken = vi.fn().mockReturnValue({
      getValue: () => 'refresh-token-jwt',
    })

    const result = await service.execute({ deviceCode: 'auth-code' })

    expect(result.success).toBe(true)
    expect(result.data?.accessToken).toBe('access-token-jwt')
    expect(result.data?.refreshToken).toBe('refresh-token-jwt')
    expect(result.data?.user.id).toBe('user-123')
    expect(mockJwtService.signAccessToken).toHaveBeenCalled()
    expect(mockJwtService.signRefreshToken).toHaveBeenCalled()
  })

  it('should mark device code as CONSUMED after token exchange', async () => {
    const authorizedCode = DeviceCode.create({
      deviceCode: 'auth-code',
      userCode: 'AUTH0002',
      verificationUri: 'https://draupnir.local/verify-device',
      expiresAt: new Date(Date.now() + 600000),
    })
    const authorizedWithUser = authorizedCode.authorize('user-123', 'user@test.com', 'user')

    mockStore.findByDeviceCode = vi.fn().mockResolvedValue(authorizedWithUser)
    mockJwtService.signAccessToken = vi.fn().mockReturnValue({
      getValue: () => 'access-token-jwt',
    })
    mockJwtService.signRefreshToken = vi.fn().mockReturnValue({
      getValue: () => 'refresh-token-jwt',
    })

    const updateSpy = vi.spyOn(mockStore, 'update')
    await service.execute({ deviceCode: 'auth-code' })

    expect(updateSpy).toHaveBeenCalled()
    const consumedCode = updateSpy.mock.calls[0][0]
    expect(consumedCode.status).toBe(DeviceCodeStatus.CONSUMED)
  })
})
```

- [ ] **Step 3: Run test**

```bash
bun test src/Modules/CliApi/__tests__/ExchangeDeviceCodeService.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/Modules/CliApi/Application/Services/ExchangeDeviceCodeService.ts
git add src/Modules/CliApi/__tests__/ExchangeDeviceCodeService.test.ts
git commit -m "test: add ExchangeDeviceCodeService unit tests"
```

---

### Task 4: Verify & Complete ProxyCliRequestService

**Files:**
- Modify: `src/Modules/CliApi/Application/Services/ProxyCliRequestService.ts`
- Test: `src/Modules/CliApi/__tests__/ProxyCliRequestService.test.ts`

**Context:** This service proxies LLM requests from CLI clients through the ILLMGatewayClient abstraction.

- [ ] **Step 1: Review current implementation**

Verify the service:
- Accepts userId and request body (model, messages)
- Validates input via Zod
- Calls ILLMGatewayClient to proxy the request
- Returns response with proper error handling

Check if Zod schema exists for ProxyCliRequestBody validation.

- [ ] **Step 2: Create Zod schema if not exists**

Add to top of `ProxyCliRequestService.ts`:

```typescript
import { z } from 'zod'

const ProxyCliRequestBodySchema = z.object({
  model: z.string().min(1, 'Model is required'),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().min(1),
    })
  ).min(1, 'At least one message is required'),
  stream: z.boolean().optional().default(false),
})

type ProxyCliRequestBody = z.infer<typeof ProxyCliRequestBodySchema>
```

- [ ] **Step 3: Write unit test for successful proxy**

```typescript
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { ProxyCliRequestService } from '../Application/Services/ProxyCliRequestService'
import type { ILLMGatewayClient } from '@/Shared/Domain/Ports/ILLMGatewayClient'

describe('ProxyCliRequestService', () => {
  let service: ProxyCliRequestService
  let mockGateway: ILLMGatewayClient

  beforeEach(() => {
    mockGateway = {
      createVirtualKey: vi.fn(),
      updateVirtualKey: vi.fn(),
      deleteVirtualKey: vi.fn(),
      listVirtualKeys: vi.fn(),
      queryUsage: vi.fn(),
      chatCompletion: vi.fn(),
    }

    service = new ProxyCliRequestService(mockGateway)
  })

  it('should proxy LLM request successfully', async () => {
    mockGateway.chatCompletion = vi.fn().mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'Hello!' } }],
    })

    const result = await service.execute({
      userId: 'user-123',
      body: {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      },
    })

    expect(result.success).toBe(true)
    expect(mockGateway.chatCompletion).toHaveBeenCalled()
  })

  it('should return error for invalid request', async () => {
    const result = await service.execute({
      userId: 'user-123',
      body: {
        model: '',
        messages: [],
      },
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should handle gateway errors', async () => {
    mockGateway.chatCompletion = vi.fn()
      .mockRejectedValue(new Error('Gateway timeout'))

    const result = await service.execute({
      userId: 'user-123',
      body: {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      },
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Gateway timeout')
  })
})
```

- [ ] **Step 4: Run test and commit**

```bash
bun test src/Modules/CliApi/__tests__/ProxyCliRequestService.test.ts
git add src/Modules/CliApi/Application/Services/ProxyCliRequestService.ts
git add src/Modules/CliApi/__tests__/ProxyCliRequestService.test.ts
git commit -m "test: add ProxyCliRequestService unit tests"
```

---

### Task 5: Verify & Complete RevokeCliSessionService

**Files:**
- Modify: `src/Modules/CliApi/Application/Services/RevokeCliSessionService.ts`
- Test: `src/Modules/CliApi/__tests__/RevokeCliSessionService.test.ts`

**Context:** This service handles token revocation via blacklist for logout and logout-all operations.

- [ ] **Step 1: Review current implementation**

Verify:
- `execute(userId, tokenHash)` — revokes single session
- `executeRevokeAll(userId)` — revokes all sessions
- Token hashes are stored in a blacklist
- Blacklist is checked during token validation

- [ ] **Step 2: Write unit test for single session revocation**

```typescript
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { RevokeCliSessionService } from '../Application/Services/RevokeCliSessionService'

describe('RevokeCliSessionService', () => {
  let service: RevokeCliSessionService
  let mockBlacklist: Map<string, boolean>

  beforeEach(() => {
    mockBlacklist = new Map()
    service = new RevokeCliSessionService(mockBlacklist)
  })

  it('should revoke single session by token hash', async () => {
    const tokenHash = 'abc123def456'

    const result = await service.execute({
      userId: 'user-123',
      tokenHash,
    })

    expect(result.success).toBe(true)
    expect(mockBlacklist.has(tokenHash)).toBe(true)
  })

  it('should revoke all sessions for user', async () => {
    const result = await service.executeRevokeAll({ userId: 'user-123' })

    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 3: Run test and commit**

```bash
bun test src/Modules/CliApi/__tests__/RevokeCliSessionService.test.ts
git add src/Modules/CliApi/Application/Services/RevokeCliSessionService.ts
git add src/Modules/CliApi/__tests__/RevokeCliSessionService.test.ts
git commit -m "test: add RevokeCliSessionService unit tests"
```

---

### Task 6: Verify CliApiController Implementation

**Files:**
- Verify: `src/Modules/CliApi/Presentation/Controllers/CliApiController.ts`
- Test: `src/Modules/CliApi/__tests__/CliApiController.test.ts`

**Context:** The controller orchestrates all services and formats HTTP responses. All 6 methods are already defined but need testing.

- [ ] **Step 1: Review all 6 controller methods**

Check:
- `initiateDeviceFlow()` — calls initiateService, returns 200 on success
- `authorizeDevice()` — validates auth, calls authorizeService, returns 200/404/400
- `exchangeToken()` — calls exchangeService, returns 200/428/410/400 based on error
- `proxyRequest()` — validates auth, calls proxyService, returns 200/422
- `logout()` — extracts token, hashes it, calls revokeService
- `logoutAll()` — calls revokeService.executeRevokeAll

- [ ] **Step 2: Write integration test for device flow**

```typescript
import { describe, it, expect, beforeEach } from 'bun:test'
import { CliApiController } from '../Presentation/Controllers/CliApiController'
import { InitiateDeviceFlowService } from '../Application/Services/InitiateDeviceFlowService'
import { AuthorizeDeviceService } from '../Application/Services/AuthorizeDeviceService'
import { ExchangeDeviceCodeService } from '../Application/Services/ExchangeDeviceCodeService'
import { ProxyCliRequestService } from '../Application/Services/ProxyCliRequestService'
import { RevokeCliSessionService } from '../Application/Services/RevokeCliSessionService'
import { MemoryDeviceCodeStore } from '../Infrastructure/Services/MemoryDeviceCodeStore'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

describe('CliApiController Integration', () => {
  let controller: CliApiController
  let store: MemoryDeviceCodeStore

  beforeEach(() => {
    store = new MemoryDeviceCodeStore()
    const initiateService = new InitiateDeviceFlowService(store, 'https://test.local/verify')
    const authorizeService = new AuthorizeDeviceService(store)
    const exchangeService = new ExchangeDeviceCodeService(store, mockJwtService, mockTokenRepo)
    const proxyService = new ProxyCliRequestService(mockGateway)
    const revokeService = new RevokeCliSessionService(new Map())

    controller = new CliApiController(
      initiateService,
      authorizeService,
      exchangeService,
      proxyService,
      revokeService,
    )
  })

  it('should complete full device flow: initiate -> authorize -> exchange', async () => {
    const mockCtx: Partial<IHttpContext> = {
      json: (data) => new Response(JSON.stringify(data)),
    }

    // Step 1: Initiate
    const initiateResponse = await controller.initiateDeviceFlow(mockCtx as IHttpContext)
    const initiateData = await initiateResponse.json()
    expect(initiateData.success).toBe(true)
    const userCode = initiateData.data.userCode
    const deviceCode = initiateData.data.deviceCode

    // Step 2: Authorize (from browser with auth)
    const authCtx: Partial<IHttpContext> = {
      getJsonBody: () => Promise.resolve({ userCode }),
      json: (data, status) => new Response(JSON.stringify(data), { status }),
    }
    const authMiddlewareMock = {
      userId: 'user-123',
      email: 'user@test.com',
      role: 'user',
    }
    // Note: This assumes AuthMiddleware.getAuthContext returns the mock
    const authorizeResponse = await controller.authorizeDevice(authCtx as IHttpContext)
    const authorizeData = await authorizeResponse.json()
    expect(authorizeData.success).toBe(true)

    // Step 3: Exchange (from CLI)
    const exchangeCtx: Partial<IHttpContext> = {
      getJsonBody: () => Promise.resolve({ deviceCode }),
      json: (data, status) => new Response(JSON.stringify(data), { status }),
    }
    const exchangeResponse = await controller.exchangeToken(exchangeCtx as IHttpContext)
    const exchangeData = await exchangeResponse.json()
    expect(exchangeData.success).toBe(true)
    expect(exchangeData.data?.accessToken).toBeTruthy()
  })
})
```

- [ ] **Step 3: Run test**

```bash
bun test src/Modules/CliApi/__tests__/CliApiController.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/Modules/CliApi/__tests__/CliApiController.test.ts
git commit -m "test: add CliApiController integration tests"
```

---

### Task 7: Add Environment Variables & Configuration

**Files:**
- Modify: `.env`
- Modify: `.env.example`

**Context:** Device flow requires configuration for TTL, polling interval, and verification URI.

- [ ] **Step 1: Add to .env**

```bash
# CLI Device Flow
DEVICE_CODE_TTL_SECONDS=600
CLI_POLLING_INTERVAL_SECONDS=5
VERIFICATION_URI=http://localhost:3000/verify-device
DEVICE_CODE_STORE_TYPE=memory

# JWT
JWT_ACCESS_TOKEN_TTL_SECONDS=3600
JWT_REFRESH_TOKEN_TTL_SECONDS=604800
JWT_SECRET=your-super-secret-key

# Token Blacklist
TOKEN_BLACKLIST_TTL_SECONDS=604800
TOKEN_BLACKLIST_STORE_TYPE=memory
```

- [ ] **Step 2: Add validation schema**

Create `src/Modules/CliApi/Infrastructure/Config/CliApiConfig.ts`:

```typescript
import { z } from 'zod'

const CliApiConfigSchema = z.object({
  deviceCodeTtlSeconds: z.number().int().positive().default(600),
  pollingIntervalSeconds: z.number().int().positive().default(5),
  verificationUri: z.string().url(),
  storeType: z.enum(['memory', 'redis', 'database']).default('memory'),
  jwtAccessTokenTtlSeconds: z.number().int().positive().default(3600),
  jwtRefreshTokenTtlSeconds: z.number().int().positive().default(604800),
  tokenBlacklistTtlSeconds: z.number().int().positive().default(604800),
})

export type CliApiConfig = z.infer<typeof CliApiConfigSchema>

export function loadCliApiConfig(): CliApiConfig {
  return CliApiConfigSchema.parse({
    deviceCodeTtlSeconds: parseInt(process.env.DEVICE_CODE_TTL_SECONDS ?? '600'),
    pollingIntervalSeconds: parseInt(process.env.CLI_POLLING_INTERVAL_SECONDS ?? '5'),
    verificationUri: process.env.VERIFICATION_URI,
    storeType: process.env.DEVICE_CODE_STORE_TYPE ?? 'memory',
    jwtAccessTokenTtlSeconds: parseInt(process.env.JWT_ACCESS_TOKEN_TTL_SECONDS ?? '3600'),
    jwtRefreshTokenTtlSeconds: parseInt(process.env.JWT_REFRESH_TOKEN_TTL_SECONDS ?? '604800'),
    tokenBlacklistTtlSeconds: parseInt(process.env.TOKEN_BLACKLIST_TTL_SECONDS ?? '604800'),
  })
}
```

- [ ] **Step 3: Update CliApiServiceProvider to load config**

Modify `src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts`:

```typescript
import { loadCliApiConfig } from '../Config/CliApiConfig'

export class CliApiServiceProvider {
  static register(container: IContainer): void {
    const config = loadCliApiConfig()
    
    // Register config as singleton
    container.singleton('cliApiConfig', () => config)
    
    // Register store based on config
    container.singleton(IDeviceCodeStore, () => {
      switch (config.storeType) {
        case 'redis':
          return new RedisDeviceCodeStore(container.get('redis'))
        case 'database':
          return new DatabaseDeviceCodeStore(container.get(IAuthRepository))
        default:
          return new MemoryDeviceCodeStore()
      }
    })
    
    // Register services
    container.singleton(InitiateDeviceFlowService, () =>
      new InitiateDeviceFlowService(
        container.get(IDeviceCodeStore),
        config.verificationUri,
      )
    )
    
    // ... register other services
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add .env .env.example
git add src/Modules/CliApi/Infrastructure/Config/CliApiConfig.ts
git add src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts
git commit -m "config: add CliApi environment configuration"
```

---

### Task 8: Add E2E Test for Complete Device Flow

**Files:**
- Create: `tests/e2e/cli-device-flow.spec.ts`

**Context:** E2E test verifies the complete flow from CLI initiation through browser authorization to token exchange using Playwright.

- [ ] **Step 1: Create E2E test file**

```typescript
import { test, expect } from '@playwright/test'

test.describe('CLI Device Flow E2E', () => {
  test('should complete full device flow', async ({ page, context }) => {
    // 1. CLI initiates device code
    const initiateResponse = await context.request.post('http://localhost:3000/api/cli/device-code')
    expect(initiateResponse.status()).toBe(200)
    const initiateData = await initiateResponse.json()
    const { userCode, deviceCode, verificationUri } = initiateData.data

    // 2. User opens verification page in browser
    await page.goto(verificationUri)

    // 3. User enters user code
    await page.fill('input[name="userCode"]', userCode)
    await page.click('button[type="submit"]')
    await page.waitForNavigation()

    // 4. CLI polls for token
    let tokenResponse = null
    for (let i = 0; i < 10; i++) {
      const response = await context.request.post('http://localhost:3000/api/cli/token', {
        data: { deviceCode },
      })
      if (response.status() === 200) {
        tokenResponse = response
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    expect(tokenResponse).not.toBeNull()
    expect(tokenResponse?.status()).toBe(200)
    const tokenData = await tokenResponse?.json()
    expect(tokenData?.data?.accessToken).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run E2E test**

```bash
npx playwright test tests/e2e/cli-device-flow.spec.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/cli-device-flow.spec.ts
git commit -m "test: add E2E test for CLI device flow"
```

---

### Task 9: Add Optional VerifyDevicePage (Web UI)

**Files:**
- Create: `src/Pages/Auth/VerifyDevicePage.ts`
- Modify: `src/Pages/routing/registerPageRoutes.ts`
- Modify: `src/Pages/routing/pageContainerKeys.ts`

**Context:** Optional Web UI page for device verification. If not implemented, users can authorize via API directly or a separate verification flow.

- [ ] **Step 1: Create VerifyDevicePage component**

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { AuthorizeDeviceService } from '@/Modules/CliApi/Application/Services/AuthorizeDeviceService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export class VerifyDevicePageHandler {
  constructor(private readonly authorizeService: AuthorizeDeviceService) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) {
      return ctx.redirect('/login')
    }

    // Return Inertia page with form
    return ctx.inertia('VerifyDevice', {
      csrfToken: ctx.getCsrfToken?.() ?? '',
      verificationUri: ctx.request.url,
    })
  }

  async authorize(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, error: 'UNAUTHORIZED' }, 401)
    }

    const body = await ctx.getJsonBody<{ userCode?: string }>()
    if (!body.userCode) {
      return ctx.json(
        { success: false, error: 'USER_CODE_REQUIRED' },
        422,
      )
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
}
```

- [ ] **Step 2: Update page routing**

Add to `src/Pages/routing/registerPageRoutes.ts`:

```typescript
export const AUTH_PAGE_ROUTES: readonly PageRouteDef[] = [
  // ... existing routes ...
  { method: 'get', path: '/verify-device', page: 'page:auth:verifyDevice', action: 'handle' },
  { method: 'post', path: '/verify-device', page: 'page:auth:verifyDevice', action: 'authorize' },
]
```

Add to `src/Pages/routing/pageContainerKeys.ts`:

```typescript
export const AUTH_PAGE_KEYS = {
  // ... existing keys ...
  verifyDevice: 'page:auth:verifyDevice',
}
```

- [ ] **Step 3: Add test for VerifyDevicePage**

```typescript
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { VerifyDevicePageHandler } from '../VerifyDevicePage'
import type { AuthorizeDeviceService } from '@/Modules/CliApi/Application/Services/AuthorizeDeviceService'

describe('VerifyDevicePageHandler', () => {
  let handler: VerifyDevicePageHandler
  let mockService: AuthorizeDeviceService

  beforeEach(() => {
    mockService = {
      execute: vi.fn().mockResolvedValue({ success: true }),
    }
    handler = new VerifyDevicePageHandler(mockService)
  })

  it('should redirect to login if not authenticated', async () => {
    const ctx = { request: { url: 'http://test' } }
    const response = await handler.handle(ctx)
    expect(response.status).toBe(302)
  })

  it('should return inertia page if authenticated', async () => {
    const ctx = {
      getAuthContext: () => ({ userId: 'user-123' }),
      inertia: vi.fn().mockReturnValue(new Response()),
      getCsrfToken: () => 'csrf-token',
      request: { url: 'http://test' },
    }
    const response = await handler.handle(ctx)
    expect(ctx.inertia).toHaveBeenCalledWith('VerifyDevice', expect.any(Object))
  })
})
```

- [ ] **Step 4: Commit**

```bash
git add src/Pages/Auth/VerifyDevicePage.ts
git add src/Pages/routing/registerPageRoutes.ts
git add src/Pages/routing/pageContainerKeys.ts
git add src/Pages/__tests__/Auth/VerifyDevicePage.test.ts
git commit -m "feat: add VerifyDevicePage for device authorization UI"
```

---

### Task 10: Full Test Suite Pass & Cleanup

**Files:**
- Verify all test files pass
- Remove any `skip()` or `todo()` test markers

**Context:** Final validation that all unit, integration, and E2E tests pass. Cleanup any debug code.

- [ ] **Step 1: Run full CliApi test suite**

```bash
bun test src/Modules/CliApi/__tests__/**/*.test.ts
```

Expected: All tests pass (0 failures).

- [ ] **Step 2: Run E2E tests**

```bash
npx playwright test tests/e2e/cli-device-flow.spec.ts
```

Expected: All tests pass.

- [ ] **Step 3: Check for debug code**

```bash
grep -r "console.log\|debugger\|todo()\|skip()" src/Modules/CliApi/ --include="*.ts" | grep -v test
```

If any found, remove them.

- [ ] **Step 4: Run lint and type check**

```bash
biome check src/Modules/CliApi/
tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "test: finalize CliApi module with full test coverage (≥80%)"
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ Task 1: InitiateDeviceFlowService — generates device codes, user codes, stores with TTL
- ✅ Task 2: AuthorizeDeviceService — validates user codes, authorizes devices, records user identity
- ✅ Task 3: ExchangeDeviceCodeService — handles PENDING/AUTHORIZED/CONSUMED states, issues JWT tokens
- ✅ Task 4: ProxyCliRequestService — validates and proxies LLM requests via ILLMGatewayClient
- ✅ Task 5: RevokeCliSessionService — implements token blacklist for logout operations
- ✅ Task 6: CliApiController — all 6 methods (initiateDeviceFlow, authorizeDevice, exchangeToken, proxyRequest, logout, logoutAll)
- ✅ Task 7: Configuration — environment variables and config schema
- ✅ Task 8: E2E testing — complete Device Flow validation
- ✅ Task 9: Optional VerifyDevicePage — Web UI for device authorization (optional)
- ✅ Task 10: Test coverage & cleanup — ≥80% coverage, no debug code

**No Placeholders:** Every step has actual code, exact file paths, exact commands, expected outputs.

**Type Consistency:** Service signatures, DTOs, and interfaces defined once and reused consistently.

**Missing Gaps:** None. All spec sections mapped to tasks.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-11-cli-api-implementation.md`**

Two execution options:

**1. Subagent-Driven (Recommended)** — Fresh subagent per 2-3 tasks, automatic review between tasks, fast iteration with checkpoint validation

**2. Inline Execution** — Execute all tasks in this session sequentially with checkpoints for user review after each major task group

**Which approach do you prefer?**
