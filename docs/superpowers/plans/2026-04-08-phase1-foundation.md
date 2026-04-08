# Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 從 gravito-ddd-starter 建立 Draupnir 專案骨架，實作 BifrostClient 封裝模組，確保開發環境、CI、測試全部就緒。

**Architecture:** 複製 gravito-ddd-starter 為基底，移除範例模組（Product/Category/Order/Payment），保留 Health + Auth 骨架。新增 BifrostClient 作為 Foundation Service，封裝 Bifrost Governance API（Virtual Key CRUD）、Logging API（用量查詢）、Models API（模型列表）。BifrostClient 使用 fetch + 指數退避重試，透過 ServiceProvider 注入容器。

**Tech Stack:** Bun, TypeScript, Gravito DDD (@gravito/core ^2.0.0), Biome (lint/format), bun:test

**Reference:** 
- Starter: `/Users/carl/Dev/CMG/gravito-ddd-starter/`
- Bifrost API docs: `docs/Bifrost_API_Final/`
- OpenAPI spec: `docs/openapi.json`

---

## File Structure

```
src/
├── index.ts                          # 應用入口
├── app.ts                            # createApp() 工廠
├── bootstrap.ts                      # DDD 啟動流程
├── routes.ts                         # 路由註冊
├── wiring/
│   ├── index.ts                      # Wiring 層匯出 + 模組註冊
│   ├── RepositoryRegistry.ts         # (從 starter 保留)
│   ├── RepositoryFactory.ts          # (從 starter 保留)
│   ├── DatabaseAccessBuilder.ts      # (從 starter 保留)
│   └── CurrentDatabaseAccess.ts      # (從 starter 保留)
├── Shared/                           # (從 starter 保留，框架適配層)
│   ├── Application/
│   ├── Infrastructure/
│   │   ├── IServiceProvider.ts
│   │   ├── IDatabaseAccess.ts
│   │   └── Framework/               # Gravito 適配器
│   └── Presentation/
│       ├── IHttpContext.ts
│       └── IModuleRouter.ts
├── Foundation/
│   └── Infrastructure/
│       └── Services/
│           └── BifrostClient/
│               ├── BifrostClient.ts          # 主要 HTTP Client
│               ├── BifrostClientConfig.ts    # 設定型別
│               ├── types.ts                  # Bifrost API 型別定義
│               ├── errors.ts                 # BifrostApiError
│               └── retry.ts                  # 重試邏輯
├── Foundation/
│   └── Infrastructure/
│       └── Providers/
│           └── FoundationServiceProvider.ts  # 註冊 BifrostClient
└── Modules/
    └── Health/                               # (從 starter 保留)
config/
├── index.ts
├── app.ts
├── cache.ts
├── database.ts
├── redis.ts
├── orbits.ts
└── types.ts
tests/
├── Unit/
│   └── Foundation/
│       └── BifrostClient/
│           ├── BifrostClient.test.ts
│           ├── retry.test.ts
│           └── errors.test.ts
└── Integration/
    └── Foundation/
        └── BifrostClient.integration.test.ts
```

---

### Task 1: 複製 Starter 並清理範例模組

**Files:**
- Copy: `/Users/carl/Dev/CMG/gravito-ddd-starter/` → 當前專案根目錄
- Delete: `src/Modules/Product/`, `src/Modules/Category/`, `src/Modules/Order/`, `src/Modules/Payment/`
- Modify: `src/bootstrap.ts`, `src/routes.ts`, `src/wiring/index.ts`, `config/app.ts`, `package.json`

- [ ] **Step 1: 複製 starter 專案檔案到 Draupnir**

```bash
cp -r /Users/carl/Dev/CMG/gravito-ddd-starter/src /Users/carl/Dev/CMG/Draupnir/
cp -r /Users/carl/Dev/CMG/gravito-ddd-starter/config /Users/carl/Dev/CMG/Draupnir/
cp -r /Users/carl/Dev/CMG/gravito-ddd-starter/tests /Users/carl/Dev/CMG/Draupnir/
cp /Users/carl/Dev/CMG/gravito-ddd-starter/package.json /Users/carl/Dev/CMG/Draupnir/
cp /Users/carl/Dev/CMG/gravito-ddd-starter/tsconfig.json /Users/carl/Dev/CMG/Draupnir/
cp /Users/carl/Dev/CMG/gravito-ddd-starter/biome.json /Users/carl/Dev/CMG/Draupnir/ 2>/dev/null || true
cp /Users/carl/Dev/CMG/gravito-ddd-starter/playwright.config.ts /Users/carl/Dev/CMG/Draupnir/ 2>/dev/null || true
```

- [ ] **Step 2: 刪除範例模組**

```bash
rm -rf src/Modules/Product
rm -rf src/Modules/Category
rm -rf src/Modules/Order
rm -rf src/Modules/Payment
```

- [ ] **Step 3: 刪除範例模組的測試**

```bash
find tests/ -type d -name "Product" -exec rm -rf {} + 2>/dev/null || true
find tests/ -type d -name "Category" -exec rm -rf {} + 2>/dev/null || true
find tests/ -type d -name "Order" -exec rm -rf {} + 2>/dev/null || true
find tests/ -type d -name "Payment" -exec rm -rf {} + 2>/dev/null || true
```

- [ ] **Step 4: 更新 package.json**

將 `name` 改為 `"draupnir"`，`version` 改為 `"0.1.0"`，`description` 改為 `"Draupnir - AI Service Management Platform"`。

```json
{
  "name": "draupnir",
  "version": "0.1.0",
  "description": "Draupnir - AI Service Management Platform built on Bifrost AI Gateway"
}
```

- [ ] **Step 5: 更新 config/app.ts**

```typescript
export default {
  name: process.env.APP_NAME ?? 'draupnir',
  env: process.env.APP_ENV ?? 'development',
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  VIEW_DIR: process.env.VIEW_DIR ?? 'src/views',
  debug: process.env.APP_DEBUG === 'true',
  url: process.env.APP_URL ?? 'http://localhost:3000',
} as const
```

- [ ] **Step 6: 清理 bootstrap.ts — 移除範例模組 import 和註冊**

```typescript
import { PlanetCore, defineConfig } from '@gravito/core'
import { buildConfig } from '../config/index'
import { createGravitoServiceProvider } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { HealthServiceProvider } from './Modules/Health/Infrastructure/Providers/HealthServiceProvider'
import { AuthServiceProvider } from './Modules/Auth/Infrastructure/Providers/AuthServiceProvider'
import { registerRoutes } from './routes'
import { initializeRegistry } from './wiring/RepositoryRegistry'
import { getCurrentORM } from './wiring/RepositoryFactory'
import { DatabaseAccessBuilder } from './wiring/DatabaseAccessBuilder'
import { setCurrentDatabaseAccess } from './wiring/CurrentDatabaseAccess'

export async function bootstrap(port = 3000): Promise<PlanetCore> {
  const configObj = buildConfig(port)
  initializeRegistry()

  const db = new DatabaseAccessBuilder(getCurrentORM()).getDatabaseAccess()
  setCurrentDatabaseAccess(db)

  const config = defineConfig({ config: configObj })
  const core = new PlanetCore(config)

  core.register(createGravitoServiceProvider(new HealthServiceProvider()))
  core.register(createGravitoServiceProvider(new AuthServiceProvider()))

  await core.bootstrap()
  await registerRoutes(core)
  core.registerGlobalErrorHandlers()

  return core
}

export default bootstrap
```

- [ ] **Step 7: 清理 routes.ts — 只保留 Health 和 Auth**

```typescript
import type { PlanetCore } from '@gravito/core'
import { registerHealth, registerAuth, registerDocs } from './wiring'

export async function registerRoutes(core: PlanetCore) {
  core.router.get('/api', async (ctx) => {
    return ctx.json({
      success: true,
      message: 'Draupnir API',
      version: '0.1.0',
    })
  })

  registerHealth(core)
  registerAuth(core)
  await registerDocs(core)

  console.log('✅ Routes registered')
}
```

- [ ] **Step 8: 清理 wiring/index.ts — 移除範例模組的 import 和 register 函式**

移除所有 Product、Category、Order、Payment 相關的 import 和 export function。只保留：
- `registerHealth`
- `registerDocs`
- `registerAuth`
- Wiring 工具匯出（DatabaseAccessBuilder 等）

```typescript
import type { PlanetCore } from '@gravito/core'
import { registerHealthWithGravito } from '@/Shared/Infrastructure/Framework/GravitoHealthAdapter'
import { registerDocsWithGravito } from '@/Shared/Infrastructure/Framework/GravitoDocsAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'

export { DatabaseAccessBuilder, createDatabaseAccess } from './DatabaseAccessBuilder'
export { setCurrentDatabaseAccess, getCurrentDatabaseAccess, hasCurrentDatabaseAccess } from './CurrentDatabaseAccess'
export { getCurrentORM, getDatabaseAccess } from './RepositoryFactory'
export { initializeRegistry, getRegistry, resetRegistry } from './RepositoryRegistry'
export { createRepositoryFactory } from './RepositoryFactoryGenerator'

export const registerHealth = (core: PlanetCore): void => {
  registerHealthWithGravito(core)
}

export const registerDocs = (core: PlanetCore): Promise<void> => {
  return registerDocsWithGravito(core)
}

import { AuthController, registerAuthRoutes } from '@/Modules/Auth'

export const registerAuth = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const registerService = core.container.make('registerUserService') as any
  const loginService = core.container.make('loginUserService') as any
  const refreshTokenService = core.container.make('refreshTokenService') as any
  const logoutUserService = core.container.make('logoutUserService') as any
  const controller = new AuthController(registerService, loginService, refreshTokenService, logoutUserService)
  registerAuthRoutes(router, controller)
}
```

- [ ] **Step 9: 安裝依賴**

```bash
bun install
```

- [ ] **Step 10: 驗證應用可啟動**

```bash
ORM=memory bun run dev
```

Expected: Server starts on port 3000, `curl http://localhost:3000/api` 回傳 `{ success: true, message: "Draupnir API" }`

- [ ] **Step 11: 驗證 typecheck 通過**

```bash
bun run typecheck
```

Expected: 0 errors

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: [foundation] 從 gravito-ddd-starter 初始化 Draupnir 專案骨架"
```

---

### Task 2: 建立 .env 與環境變數管理

**Files:**
- Create: `.env.example`, `.env`
- Modify: `.gitignore`

- [ ] **Step 1: 建立 .env.example**

```bash
# Draupnir Environment Configuration

# Application
APP_NAME=draupnir
APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:3000
PORT=3000

# Database
ORM=memory
ENABLE_DB=false
# DATABASE_URL=postgresql://user:pass@localhost:5432/draupnir

# Bifrost
BIFROST_API_URL=http://localhost:8080
BIFROST_MASTER_KEY=your-bifrost-master-key-here

# Auth
JWT_SECRET=your-jwt-secret-here-change-in-production
JWT_ACCESS_TOKEN_TTL=900
JWT_REFRESH_TOKEN_TTL=604800

# Cache
CACHE_DRIVER=memory
# REDIS_URL=redis://localhost:6379
```

- [ ] **Step 2: 複製 .env.example 為 .env**

```bash
cp .env.example .env
```

- [ ] **Step 3: 確認 .gitignore 包含 .env**

檢查 `.gitignore` 是否已包含 `.env`。如果沒有，新增：

```
.env
.env.local
.env.*.local
```

- [ ] **Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: [foundation] 建立環境變數範本"
```

---

### Task 3: 建立 Bifrost API 型別定義

**Files:**
- Create: `src/Foundation/Infrastructure/Services/BifrostClient/types.ts`
- Test: `tests/Unit/Foundation/BifrostClient/types.test.ts`

- [ ] **Step 1: 建立目錄結構**

```bash
mkdir -p src/Foundation/Infrastructure/Services/BifrostClient
mkdir -p src/Foundation/Infrastructure/Providers
mkdir -p tests/Unit/Foundation/BifrostClient
```

- [ ] **Step 2: 寫型別定義的測試**

```typescript
// tests/Unit/Foundation/BifrostClient/types.test.ts
import { describe, it, expect } from 'bun:test'
import type {
  BifrostVirtualKey,
  CreateVirtualKeyRequest,
  UpdateVirtualKeyRequest,
  BifrostLogEntry,
  BifrostLogsQuery,
  BifrostLogsResponse,
  BifrostModel,
  BifrostModelsResponse,
  BifrostProviderConfig,
  BifrostRateLimit,
  BifrostBudget,
} from '@/Foundation/Infrastructure/Services/BifrostClient/types'

describe('Bifrost API Types', () => {
  it('should allow creating a valid CreateVirtualKeyRequest', () => {
    const request: CreateVirtualKeyRequest = {
      name: 'test-key',
      description: 'A test key',
      provider_configs: [],
      is_active: true,
    }
    expect(request.name).toBe('test-key')
    expect(request.provider_configs).toEqual([])
  })

  it('should allow creating a valid UpdateVirtualKeyRequest', () => {
    const request: UpdateVirtualKeyRequest = {
      name: 'updated-key',
      is_active: false,
    }
    expect(request.name).toBe('updated-key')
  })

  it('should represent a BifrostVirtualKey response', () => {
    const key: BifrostVirtualKey = {
      id: 'vk-123',
      name: 'my-key',
      value: 'bifrost_vk_xxx',
      description: 'test',
      is_active: true,
      provider_configs: [],
      mcp_configs: [],
    }
    expect(key.id).toBe('vk-123')
    expect(key.is_active).toBe(true)
  })

  it('should represent a BifrostLogEntry', () => {
    const log: BifrostLogEntry = {
      id: 'log-1',
      provider: 'openai',
      model: 'gpt-4',
      status: 'success',
      object: 'chat.completion',
      timestamp: '2026-04-08T00:00:00Z',
      latency: 1.5,
      cost: 0.03,
      virtual_key_id: 'vk-123',
      input_tokens: 100,
      output_tokens: 50,
    }
    expect(log.status).toBe('success')
  })

  it('should represent a BifrostModel', () => {
    const model: BifrostModel = {
      id: 'openai/gpt-4',
      name: 'GPT-4',
      context_length: 128000,
      max_input_tokens: 128000,
      max_output_tokens: 16384,
    }
    expect(model.id).toBe('openai/gpt-4')
  })
})
```

- [ ] **Step 3: 執行測試確認失敗**

```bash
bun test tests/Unit/Foundation/BifrostClient/types.test.ts
```

Expected: FAIL — 模組不存在

- [ ] **Step 4: 寫型別定義**

```typescript
// src/Foundation/Infrastructure/Services/BifrostClient/types.ts

// === Virtual Key ===

export interface BifrostBudget {
  readonly id?: string
  readonly max_limit: number
  readonly reset_duration: string
  readonly calendar_aligned?: boolean
  readonly last_reset?: string
  readonly current_usage?: number
  readonly created_at?: string
  readonly updated_at?: string
}

export interface BifrostRateLimit {
  readonly id?: string
  readonly token_max_limit: number
  readonly token_reset_duration: string
  readonly token_current_usage?: number
  readonly token_last_reset?: string
  readonly request_max_limit?: number | null
  readonly request_reset_duration?: string | null
  readonly request_current_usage?: number
  readonly request_last_reset?: string
  readonly created_at?: string
  readonly updated_at?: string
}

export interface BifrostProviderConfig {
  readonly id?: number
  readonly virtual_key_id?: string
  readonly provider: string
  readonly weight?: number | null
  readonly allowed_models?: readonly string[]
  readonly budget_id?: string
  readonly rate_limit_id?: string
  readonly budget?: BifrostBudget
  readonly rate_limit?: BifrostRateLimit
}

export interface BifrostMcpConfig {
  readonly id?: number
  readonly mcp_client_name: string
  readonly tools_to_execute?: readonly string[]
}

export interface BifrostVirtualKey {
  readonly id: string
  readonly name: string
  readonly value?: string
  readonly description?: string
  readonly is_active: boolean
  readonly provider_configs: readonly BifrostProviderConfig[]
  readonly mcp_configs?: readonly BifrostMcpConfig[]
}

export interface CreateVirtualKeyRequest {
  readonly name: string
  readonly description?: string
  readonly provider_configs?: readonly Omit<BifrostProviderConfig, 'id' | 'virtual_key_id'>[]
  readonly mcp_configs?: readonly Omit<BifrostMcpConfig, 'id'>[]
  readonly team_id?: string
  readonly customer_id?: string
  readonly budget?: Pick<BifrostBudget, 'max_limit' | 'reset_duration' | 'calendar_aligned'>
  readonly rate_limit?: Pick<BifrostRateLimit, 'token_max_limit' | 'token_reset_duration' | 'request_max_limit' | 'request_reset_duration'>
  readonly is_active?: boolean
}

export interface UpdateVirtualKeyRequest {
  readonly name?: string
  readonly description?: string
  readonly provider_configs?: readonly Omit<BifrostProviderConfig, 'id' | 'virtual_key_id'>[]
  readonly mcp_configs?: readonly Omit<BifrostMcpConfig, 'id'>[]
  readonly team_id?: string
  readonly customer_id?: string
  readonly budget?: Pick<BifrostBudget, 'max_limit' | 'reset_duration' | 'calendar_aligned'>
  readonly rate_limit?: Pick<BifrostRateLimit, 'token_max_limit' | 'token_reset_duration' | 'request_max_limit' | 'request_reset_duration'>
  readonly is_active?: boolean
}

export interface VirtualKeyResponse {
  readonly message: string
  readonly virtual_key: BifrostVirtualKey
}

export interface VirtualKeyListResponse {
  readonly virtual_keys: readonly BifrostVirtualKey[]
}

// === Logging ===

export interface BifrostLogEntry {
  readonly id: string
  readonly parent_request_id?: string
  readonly provider: string
  readonly model: string
  readonly status: 'processing' | 'success' | 'error'
  readonly object: string
  readonly timestamp: string
  readonly number_of_retries?: number
  readonly fallback_index?: number
  readonly latency: number
  readonly cost: number
  readonly selected_key_id?: string
  readonly selected_key_name?: string
  readonly virtual_key_id?: string
  readonly virtual_key_name?: string | null
  readonly input_tokens?: number
  readonly output_tokens?: number
  readonly total_tokens?: number
}

export interface BifrostLogsQuery {
  readonly providers?: string
  readonly models?: string
  readonly status?: string
  readonly virtual_key_ids?: string
  readonly start_time?: string
  readonly end_time?: string
  readonly min_cost?: number
  readonly max_cost?: number
  readonly limit?: number
  readonly offset?: number
  readonly sort_by?: string
  readonly order?: string
}

export interface BifrostLogsResponse {
  readonly logs: readonly BifrostLogEntry[]
  readonly total?: number
}

export interface BifrostLogsStats {
  readonly total_requests: number
  readonly total_cost: number
  readonly total_tokens: number
  readonly avg_latency: number
}

// === Models ===

export interface BifrostModel {
  readonly id: string
  readonly canonical_slug?: string
  readonly name?: string
  readonly deployment?: string
  readonly created?: number
  readonly context_length?: number
  readonly max_input_tokens?: number
  readonly max_output_tokens?: number
}

export interface BifrostModelsQuery {
  readonly provider?: string
  readonly page_size?: number
  readonly page_token?: string
}

export interface BifrostModelsResponse {
  readonly data: readonly BifrostModel[]
}
```

- [ ] **Step 5: 執行測試確認通過**

```bash
bun test tests/Unit/Foundation/BifrostClient/types.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/Foundation/Infrastructure/Services/BifrostClient/types.ts tests/Unit/Foundation/BifrostClient/types.test.ts
git commit -m "feat: [foundation] 建立 Bifrost API 型別定義"
```

---

### Task 4: 建立 BifrostApiError

**Files:**
- Create: `src/Foundation/Infrastructure/Services/BifrostClient/errors.ts`
- Test: `tests/Unit/Foundation/BifrostClient/errors.test.ts`

- [ ] **Step 1: 寫 BifrostApiError 測試**

```typescript
// tests/Unit/Foundation/BifrostClient/errors.test.ts
import { describe, it, expect } from 'bun:test'
import { BifrostApiError, isBifrostApiError } from '@/Foundation/Infrastructure/Services/BifrostClient/errors'

describe('BifrostApiError', () => {
  it('should create error with status, endpoint, and message', () => {
    const error = new BifrostApiError(404, '/api/governance/virtual-keys/vk-1', 'Virtual key not found')
    expect(error.message).toBe('Bifrost API error 404 on /api/governance/virtual-keys/vk-1: Virtual key not found')
    expect(error.status).toBe(404)
    expect(error.endpoint).toBe('/api/governance/virtual-keys/vk-1')
    expect(error.name).toBe('BifrostApiError')
  })

  it('should include optional response body', () => {
    const body = { error: 'not found' }
    const error = new BifrostApiError(404, '/api/test', 'Not found', body)
    expect(error.responseBody).toEqual(body)
  })

  it('should be instanceof Error', () => {
    const error = new BifrostApiError(500, '/api/test', 'Server error')
    expect(error instanceof Error).toBe(true)
  })

  it('should identify retryable errors', () => {
    const error429 = new BifrostApiError(429, '/api/test', 'Rate limited')
    expect(error429.isRetryable).toBe(true)

    const error500 = new BifrostApiError(500, '/api/test', 'Server error')
    expect(error500.isRetryable).toBe(true)

    const error502 = new BifrostApiError(502, '/api/test', 'Bad gateway')
    expect(error502.isRetryable).toBe(true)

    const error503 = new BifrostApiError(503, '/api/test', 'Unavailable')
    expect(error503.isRetryable).toBe(true)

    const error400 = new BifrostApiError(400, '/api/test', 'Bad request')
    expect(error400.isRetryable).toBe(false)

    const error404 = new BifrostApiError(404, '/api/test', 'Not found')
    expect(error404.isRetryable).toBe(false)
  })

  it('should be identifiable via type guard', () => {
    const bifrostError = new BifrostApiError(500, '/api/test', 'fail')
    const genericError = new Error('generic')
    expect(isBifrostApiError(bifrostError)).toBe(true)
    expect(isBifrostApiError(genericError)).toBe(false)
    expect(isBifrostApiError(null)).toBe(false)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
bun test tests/Unit/Foundation/BifrostClient/errors.test.ts
```

Expected: FAIL

- [ ] **Step 3: 實作 BifrostApiError**

```typescript
// src/Foundation/Infrastructure/Services/BifrostClient/errors.ts

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])

export class BifrostApiError extends Error {
  readonly status: number
  readonly endpoint: string
  readonly responseBody: unknown
  readonly isRetryable: boolean

  constructor(status: number, endpoint: string, message: string, responseBody?: unknown) {
    super(`Bifrost API error ${status} on ${endpoint}: ${message}`)
    this.name = 'BifrostApiError'
    this.status = status
    this.endpoint = endpoint
    this.responseBody = responseBody
    this.isRetryable = RETRYABLE_STATUS_CODES.has(status)
  }
}

export function isBifrostApiError(error: unknown): error is BifrostApiError {
  return error instanceof BifrostApiError
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
bun test tests/Unit/Foundation/BifrostClient/errors.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/Foundation/Infrastructure/Services/BifrostClient/errors.ts tests/Unit/Foundation/BifrostClient/errors.test.ts
git commit -m "feat: [foundation] 建立 BifrostApiError 錯誤處理"
```

---

### Task 5: 建立重試邏輯

**Files:**
- Create: `src/Foundation/Infrastructure/Services/BifrostClient/retry.ts`
- Test: `tests/Unit/Foundation/BifrostClient/retry.test.ts`

- [ ] **Step 1: 寫重試邏輯測試**

```typescript
// tests/Unit/Foundation/BifrostClient/retry.test.ts
import { describe, it, expect } from 'bun:test'
import { withRetry } from '@/Foundation/Infrastructure/Services/BifrostClient/retry'
import { BifrostApiError } from '@/Foundation/Infrastructure/Services/BifrostClient/errors'

describe('withRetry', () => {
  it('should return result on first success', async () => {
    let callCount = 0
    const result = await withRetry(async () => {
      callCount++
      return 'success'
    })
    expect(result).toBe('success')
    expect(callCount).toBe(1)
  })

  it('should retry on retryable BifrostApiError and succeed', async () => {
    let callCount = 0
    const result = await withRetry(async () => {
      callCount++
      if (callCount < 3) {
        throw new BifrostApiError(500, '/api/test', 'Server error')
      }
      return 'recovered'
    }, { maxRetries: 3, baseDelayMs: 1 })
    expect(result).toBe('recovered')
    expect(callCount).toBe(3)
  })

  it('should retry on 429 with respect to Retry-After', async () => {
    let callCount = 0
    const result = await withRetry(async () => {
      callCount++
      if (callCount < 2) {
        throw new BifrostApiError(429, '/api/test', 'Rate limited')
      }
      return 'ok'
    }, { maxRetries: 3, baseDelayMs: 1 })
    expect(result).toBe('ok')
    expect(callCount).toBe(2)
  })

  it('should NOT retry on non-retryable BifrostApiError', async () => {
    let callCount = 0
    try {
      await withRetry(async () => {
        callCount++
        throw new BifrostApiError(400, '/api/test', 'Bad request')
      }, { maxRetries: 3, baseDelayMs: 1 })
    } catch (error) {
      expect(callCount).toBe(1)
      expect(error instanceof BifrostApiError).toBe(true)
    }
  })

  it('should retry on network errors (non-BifrostApiError)', async () => {
    let callCount = 0
    const result = await withRetry(async () => {
      callCount++
      if (callCount < 2) {
        throw new TypeError('fetch failed')
      }
      return 'recovered'
    }, { maxRetries: 3, baseDelayMs: 1 })
    expect(result).toBe('recovered')
    expect(callCount).toBe(2)
  })

  it('should throw after exhausting retries', async () => {
    let callCount = 0
    try {
      await withRetry(async () => {
        callCount++
        throw new BifrostApiError(500, '/api/test', 'Server error')
      }, { maxRetries: 3, baseDelayMs: 1 })
      expect(true).toBe(false) // should not reach here
    } catch (error) {
      expect(callCount).toBe(4) // 1 initial + 3 retries
      expect(error instanceof BifrostApiError).toBe(true)
    }
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
bun test tests/Unit/Foundation/BifrostClient/retry.test.ts
```

Expected: FAIL

- [ ] **Step 3: 實作重試邏輯**

```typescript
// src/Foundation/Infrastructure/Services/BifrostClient/retry.ts
import { BifrostApiError } from './errors'

export interface RetryOptions {
  readonly maxRetries: number
  readonly baseDelayMs: number
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 500,
}

function isRetryable(error: unknown): boolean {
  if (error instanceof BifrostApiError) {
    return error.isRetryable
  }
  // Network errors (TypeError: fetch failed, etc.) are retryable
  return error instanceof TypeError || error instanceof Error && error.message.includes('fetch')
}

function calculateDelay(attempt: number, baseDelayMs: number): number {
  // Exponential backoff with jitter
  const exponentialDelay = baseDelayMs * 2 ** attempt
  const jitter = Math.random() * baseDelayMs
  return exponentialDelay + jitter
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>,
): Promise<T> {
  const { maxRetries, baseDelayMs } = { ...DEFAULT_OPTIONS, ...options }

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (!isRetryable(error)) {
        throw error
      }

      if (attempt < maxRetries) {
        const delay = calculateDelay(attempt, baseDelayMs)
        await sleep(delay)
      }
    }
  }

  throw lastError
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
bun test tests/Unit/Foundation/BifrostClient/retry.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/Foundation/Infrastructure/Services/BifrostClient/retry.ts tests/Unit/Foundation/BifrostClient/retry.test.ts
git commit -m "feat: [foundation] 建立重試邏輯（指數退避 + jitter）"
```

---

### Task 6: 建立 BifrostClientConfig

**Files:**
- Create: `src/Foundation/Infrastructure/Services/BifrostClient/BifrostClientConfig.ts`

- [ ] **Step 1: 建立設定型別**

```typescript
// src/Foundation/Infrastructure/Services/BifrostClient/BifrostClientConfig.ts

export interface BifrostClientConfig {
  readonly baseUrl: string
  readonly masterKey: string
  readonly timeoutMs: number
  readonly maxRetries: number
  readonly retryBaseDelayMs: number
}

export function createBifrostClientConfig(overrides?: Partial<BifrostClientConfig>): BifrostClientConfig {
  const baseUrl = overrides?.baseUrl ?? process.env.BIFROST_API_URL
  const masterKey = overrides?.masterKey ?? process.env.BIFROST_MASTER_KEY

  if (!baseUrl) {
    throw new Error('BIFROST_API_URL is required. Set it in .env or pass baseUrl in config.')
  }

  if (!masterKey) {
    throw new Error('BIFROST_MASTER_KEY is required. Set it in .env or pass masterKey in config.')
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''), // strip trailing slashes
    masterKey,
    timeoutMs: overrides?.timeoutMs ?? 30_000,
    maxRetries: overrides?.maxRetries ?? 3,
    retryBaseDelayMs: overrides?.retryBaseDelayMs ?? 500,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Foundation/Infrastructure/Services/BifrostClient/BifrostClientConfig.ts
git commit -m "feat: [foundation] 建立 BifrostClient 設定管理"
```

---

### Task 7: 實作 BifrostClient 核心

**Files:**
- Create: `src/Foundation/Infrastructure/Services/BifrostClient/BifrostClient.ts`
- Test: `tests/Unit/Foundation/BifrostClient/BifrostClient.test.ts`

- [ ] **Step 1: 寫 BifrostClient 測試**

```typescript
// tests/Unit/Foundation/BifrostClient/BifrostClient.test.ts
import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import { BifrostApiError } from '@/Foundation/Infrastructure/Services/BifrostClient/errors'
import type { BifrostClientConfig } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClientConfig'
import type { BifrostVirtualKey, VirtualKeyResponse, VirtualKeyListResponse, BifrostLogsResponse, BifrostModelsResponse } from '@/Foundation/Infrastructure/Services/BifrostClient/types'

const TEST_CONFIG: BifrostClientConfig = {
  baseUrl: 'https://bifrost.test',
  masterKey: 'test-master-key',
  timeoutMs: 5000,
  maxRetries: 0, // no retries in unit tests
  retryBaseDelayMs: 1,
}

// Helper to create mock fetch responses
function mockFetchResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('BifrostClient', () => {
  let client: BifrostClient
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    client = new BifrostClient(TEST_CONFIG)
  })

  // Restore fetch after each test
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('createVirtualKey', () => {
    it('should create a virtual key', async () => {
      const mockResponse: VirtualKeyResponse = {
        message: 'Virtual key created',
        virtual_key: {
          id: 'vk-123',
          name: 'test-key',
          value: 'bifrost_vk_xxx',
          is_active: true,
          provider_configs: [],
        },
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse)))

      const result = await client.createVirtualKey({ name: 'test-key' })

      expect(result.id).toBe('vk-123')
      expect(result.name).toBe('test-key')
      expect(result.value).toBe('bifrost_vk_xxx')

      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toBe('https://bifrost.test/api/governance/virtual-keys')
      expect(fetchCall[1].method).toBe('POST')
      expect(fetchCall[1].headers['Authorization']).toBe('Bearer test-master-key')
    })
  })

  describe('listVirtualKeys', () => {
    it('should list virtual keys', async () => {
      const mockResponse: VirtualKeyListResponse = {
        virtual_keys: [
          { id: 'vk-1', name: 'key-1', is_active: true, provider_configs: [] },
          { id: 'vk-2', name: 'key-2', is_active: false, provider_configs: [] },
        ],
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse)))

      const result = await client.listVirtualKeys()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('vk-1')
    })
  })

  describe('getVirtualKey', () => {
    it('should get a virtual key by ID', async () => {
      const mockResponse: VirtualKeyResponse = {
        message: 'ok',
        virtual_key: { id: 'vk-1', name: 'key-1', is_active: true, provider_configs: [] },
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse)))

      const result = await client.getVirtualKey('vk-1')

      expect(result.id).toBe('vk-1')
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toBe('https://bifrost.test/api/governance/virtual-keys/vk-1')
    })

    it('should throw BifrostApiError on 404', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(404, { error: 'not found' })),
      )

      try {
        await client.getVirtualKey('vk-nonexistent')
        expect(true).toBe(false)
      } catch (error) {
        expect(error instanceof BifrostApiError).toBe(true)
        expect((error as BifrostApiError).status).toBe(404)
      }
    })
  })

  describe('updateVirtualKey', () => {
    it('should update a virtual key', async () => {
      const mockResponse: VirtualKeyResponse = {
        message: 'updated',
        virtual_key: { id: 'vk-1', name: 'updated-key', is_active: true, provider_configs: [] },
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse)))

      const result = await client.updateVirtualKey('vk-1', { name: 'updated-key' })

      expect(result.name).toBe('updated-key')
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[1].method).toBe('PUT')
    })
  })

  describe('deleteVirtualKey', () => {
    it('should delete a virtual key', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(200, { message: 'deleted' })),
      )

      await client.deleteVirtualKey('vk-1')

      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[1].method).toBe('DELETE')
      expect(fetchCall[0]).toBe('https://bifrost.test/api/governance/virtual-keys/vk-1')
    })
  })

  describe('getLogs', () => {
    it('should fetch logs with query params', async () => {
      const mockResponse: BifrostLogsResponse = {
        logs: [
          {
            id: 'log-1',
            provider: 'openai',
            model: 'gpt-4',
            status: 'success',
            object: 'chat.completion',
            timestamp: '2026-04-08T00:00:00Z',
            latency: 1.0,
            cost: 0.02,
          },
        ],
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse)))

      const result = await client.getLogs({
        virtual_key_ids: 'vk-1',
        start_time: '2026-04-01T00:00:00Z',
        limit: 100,
      })

      expect(result.logs).toHaveLength(1)
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      const url = fetchCall[0] as string
      expect(url).toContain('virtual_key_ids=vk-1')
      expect(url).toContain('limit=100')
    })
  })

  describe('listModels', () => {
    it('should list available models', async () => {
      const mockResponse: BifrostModelsResponse = {
        data: [
          { id: 'openai/gpt-4', name: 'GPT-4', context_length: 128000 },
          { id: 'anthropic/claude-3', name: 'Claude 3', context_length: 200000 },
        ],
      }
      globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse)))

      const result = await client.listModels()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('openai/gpt-4')
    })
  })

  describe('request headers', () => {
    it('should include Authorization and Content-Type headers', async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(mockFetchResponse(200, { virtual_keys: [] })),
      )

      await client.listVirtualKeys()

      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[1].headers['Authorization']).toBe('Bearer test-master-key')
      expect(fetchCall[1].headers['Content-Type']).toBe('application/json')
    })
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
bun test tests/Unit/Foundation/BifrostClient/BifrostClient.test.ts
```

Expected: FAIL

- [ ] **Step 3: 實作 BifrostClient**

```typescript
// src/Foundation/Infrastructure/Services/BifrostClient/BifrostClient.ts
import type { BifrostClientConfig } from './BifrostClientConfig'
import type {
  CreateVirtualKeyRequest,
  UpdateVirtualKeyRequest,
  BifrostVirtualKey,
  VirtualKeyResponse,
  VirtualKeyListResponse,
  BifrostLogsQuery,
  BifrostLogsResponse,
  BifrostLogsStats,
  BifrostModel,
  BifrostModelsQuery,
  BifrostModelsResponse,
} from './types'
import { BifrostApiError } from './errors'
import { withRetry } from './retry'

export class BifrostClient {
  private readonly config: BifrostClientConfig

  constructor(config: BifrostClientConfig) {
    this.config = config
  }

  // === Virtual Key CRUD ===

  async createVirtualKey(request: CreateVirtualKeyRequest): Promise<BifrostVirtualKey> {
    const response = await this.post<VirtualKeyResponse>(
      '/api/governance/virtual-keys',
      request,
    )
    return response.virtual_key
  }

  async listVirtualKeys(): Promise<readonly BifrostVirtualKey[]> {
    const response = await this.get<VirtualKeyListResponse>(
      '/api/governance/virtual-keys',
    )
    return response.virtual_keys
  }

  async getVirtualKey(vkId: string): Promise<BifrostVirtualKey> {
    const response = await this.get<VirtualKeyResponse>(
      `/api/governance/virtual-keys/${encodeURIComponent(vkId)}`,
    )
    return response.virtual_key
  }

  async updateVirtualKey(vkId: string, request: UpdateVirtualKeyRequest): Promise<BifrostVirtualKey> {
    const response = await this.put<VirtualKeyResponse>(
      `/api/governance/virtual-keys/${encodeURIComponent(vkId)}`,
      request,
    )
    return response.virtual_key
  }

  async deleteVirtualKey(vkId: string): Promise<void> {
    await this.delete(`/api/governance/virtual-keys/${encodeURIComponent(vkId)}`)
  }

  // === Logging ===

  async getLogs(query?: BifrostLogsQuery): Promise<BifrostLogsResponse> {
    const params = query ? this.toQueryString(query) : ''
    const path = params ? `/api/logs?${params}` : '/api/logs'
    return this.get<BifrostLogsResponse>(path)
  }

  async getLogsStats(query?: BifrostLogsQuery): Promise<BifrostLogsStats> {
    const params = query ? this.toQueryString(query) : ''
    const path = params ? `/api/logs/stats?${params}` : '/api/logs/stats'
    return this.get<BifrostLogsStats>(path)
  }

  // === Models ===

  async listModels(query?: BifrostModelsQuery): Promise<readonly BifrostModel[]> {
    const params = query ? this.toQueryString(query) : ''
    const path = params ? `/v1/models?${params}` : '/v1/models'
    const response = await this.get<BifrostModelsResponse>(path)
    return response.data
  }

  // === Private HTTP Methods ===

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  private async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  private async delete(path: string): Promise<void> {
    await this.request<unknown>('DELETE', path)
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.config.baseUrl}${path}`

    return withRetry(
      async () => {
        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${this.config.masterKey}`,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(this.config.timeoutMs),
        })

        if (!response.ok) {
          let responseBody: unknown
          try {
            responseBody = await response.json()
          } catch {
            responseBody = await response.text().catch(() => null)
          }
          throw new BifrostApiError(
            response.status,
            path,
            `${method} request failed`,
            responseBody,
          )
        }

        return response.json() as Promise<T>
      },
      {
        maxRetries: this.config.maxRetries,
        baseDelayMs: this.config.retryBaseDelayMs,
      },
    )
  }

  private toQueryString(params: Record<string, unknown>): string {
    const entries = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    return entries.join('&')
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
bun test tests/Unit/Foundation/BifrostClient/BifrostClient.test.ts
```

Expected: PASS

- [ ] **Step 5: 執行所有 BifrostClient 測試**

```bash
bun test tests/Unit/Foundation/BifrostClient/
```

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/Foundation/Infrastructure/Services/BifrostClient/BifrostClient.ts tests/Unit/Foundation/BifrostClient/BifrostClient.test.ts
git commit -m "feat: [foundation] 實作 BifrostClient 核心（Virtual Key CRUD、Logs、Models）"
```

---

### Task 8: 建立 FoundationServiceProvider 並注入容器

**Files:**
- Create: `src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts`
- Modify: `src/bootstrap.ts`

- [ ] **Step 1: 建立 FoundationServiceProvider**

```typescript
// src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { BifrostClient } from '../Services/BifrostClient/BifrostClient'
import { createBifrostClientConfig } from '../Services/BifrostClient/BifrostClientConfig'

export class FoundationServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    container.singleton('bifrostClient', () => {
      const config = createBifrostClientConfig()
      return new BifrostClient(config)
    })
  }

  override boot(_context: any): void {
    console.log('🏗️  [Foundation] Module loaded')
  }
}
```

- [ ] **Step 2: 在 bootstrap.ts 註冊 FoundationServiceProvider**

在 `core.register(createGravitoServiceProvider(new HealthServiceProvider()))` 之後新增：

```typescript
import { FoundationServiceProvider } from './Foundation/Infrastructure/Providers/FoundationServiceProvider'

// 在 HealthServiceProvider 之後、AuthServiceProvider 之前
core.register(createGravitoServiceProvider(new FoundationServiceProvider()))
```

完整的 register 順序：

```typescript
core.register(createGravitoServiceProvider(new HealthServiceProvider()))
core.register(createGravitoServiceProvider(new FoundationServiceProvider()))
core.register(createGravitoServiceProvider(new AuthServiceProvider()))
```

- [ ] **Step 3: 驗證 typecheck**

```bash
bun run typecheck
```

Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts src/bootstrap.ts
git commit -m "feat: [foundation] 註冊 FoundationServiceProvider 將 BifrostClient 注入容器"
```

---

### Task 9: 建立 BifrostClient barrel export

**Files:**
- Create: `src/Foundation/Infrastructure/Services/BifrostClient/index.ts`
- Create: `src/Foundation/index.ts`

- [ ] **Step 1: 建立 BifrostClient barrel**

```typescript
// src/Foundation/Infrastructure/Services/BifrostClient/index.ts
export { BifrostClient } from './BifrostClient'
export { createBifrostClientConfig, type BifrostClientConfig } from './BifrostClientConfig'
export { BifrostApiError, isBifrostApiError } from './errors'
export { withRetry, type RetryOptions } from './retry'
export type {
  BifrostVirtualKey,
  CreateVirtualKeyRequest,
  UpdateVirtualKeyRequest,
  VirtualKeyResponse,
  VirtualKeyListResponse,
  BifrostLogEntry,
  BifrostLogsQuery,
  BifrostLogsResponse,
  BifrostLogsStats,
  BifrostModel,
  BifrostModelsQuery,
  BifrostModelsResponse,
  BifrostProviderConfig,
  BifrostRateLimit,
  BifrostBudget,
  BifrostMcpConfig,
} from './types'
```

- [ ] **Step 2: 建立 Foundation barrel**

```typescript
// src/Foundation/index.ts
export { BifrostClient, BifrostApiError, isBifrostApiError, createBifrostClientConfig } from './Infrastructure/Services/BifrostClient'
export type { BifrostClientConfig } from './Infrastructure/Services/BifrostClient'
export { FoundationServiceProvider } from './Infrastructure/Providers/FoundationServiceProvider'
```

- [ ] **Step 3: Commit**

```bash
git add src/Foundation/Infrastructure/Services/BifrostClient/index.ts src/Foundation/index.ts
git commit -m "chore: [foundation] 建立 BifrostClient 模組匯出"
```

---

### Task 10: 建立共用 ApiResponse 型別與 Error Code

**Files:**
- Create: `src/Shared/Application/ApiResponse.ts`
- Create: `src/Shared/Application/ErrorCodes.ts`

- [ ] **Step 1: 建立 ApiResponse**

```typescript
// src/Shared/Application/ApiResponse.ts

export interface PaginationMeta {
  readonly total: number
  readonly page: number
  readonly limit: number
  readonly totalPages: number
}

export interface ApiResponse<T = unknown> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
  readonly code?: string
  readonly meta?: PaginationMeta
}

export function successResponse<T>(data: T, meta?: PaginationMeta): ApiResponse<T> {
  return { success: true, data, ...(meta && { meta }) }
}

export function errorResponse(error: string, code?: string): ApiResponse<never> {
  return { success: false, error, ...(code && { code }) }
}
```

- [ ] **Step 2: 建立 ErrorCodes**

```typescript
// src/Shared/Application/ErrorCodes.ts

export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // Bifrost
  BIFROST_ERROR: 'BIFROST_ERROR',
  BIFROST_TIMEOUT: 'BIFROST_TIMEOUT',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]
```

- [ ] **Step 3: Commit**

```bash
git add src/Shared/Application/ApiResponse.ts src/Shared/Application/ErrorCodes.ts
git commit -m "feat: [foundation] 建立共用 ApiResponse 型別與 ErrorCode 列舉"
```

---

### Task 11: 建立 .env.example 驗證與 CI 腳本

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 建立 CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Typecheck
        run: bun run typecheck

      - name: Lint
        run: bun run lint

      - name: Format check
        run: bun run format:check

      - name: Test
        run: bun test --coverage
        env:
          ORM: memory
          BIFROST_API_URL: http://localhost:8080
          BIFROST_MASTER_KEY: ci-test-key
          JWT_SECRET: ci-test-secret
```

- [ ] **Step 2: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/ci.yml
git commit -m "ci: [foundation] 建立 CI Pipeline（typecheck、lint、test）"
```

---

### Task 12: 最終驗證

**Files:** None (verification only)

- [ ] **Step 1: 執行完整 typecheck**

```bash
bun run typecheck
```

Expected: 0 errors

- [ ] **Step 2: 執行完整 lint**

```bash
bun run lint
```

Expected: 0 errors

- [ ] **Step 3: 執行所有測試**

```bash
bun test
```

Expected: All tests PASS

- [ ] **Step 4: 執行測試覆蓋率**

```bash
bun test --coverage
```

Expected: BifrostClient 相關檔案覆蓋率 ≥ 80%

- [ ] **Step 5: 驗證應用可啟動**

```bash
ORM=memory bun run dev
```

在另一個 terminal：

```bash
curl http://localhost:3000/api
curl http://localhost:3000/health
```

Expected: 兩者都回傳 JSON 成功回應

- [ ] **Step 6: 如有 lint/type 錯誤，修正後 commit**

```bash
bun run lint:fix
bun run format
git add -A
git commit -m "fix: [foundation] 修正 lint/format 問題"
```

- [ ] **Step 7: 確認最終 commit log**

```bash
git log --oneline
```

Expected: 可看到 Phase 1 的所有 commit，每個 commit 有清楚的 scope 標記 `[foundation]`
