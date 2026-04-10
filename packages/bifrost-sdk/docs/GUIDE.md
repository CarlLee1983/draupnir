# Bifrost SDK 完整教學

本教學涵蓋 `@draupnir/bifrost-sdk` 從基礎用法到進階整合的所有面向。

## 目錄

1. [概念總覽](#1-概念總覽)
2. [安裝與環境設定](#2-安裝與環境設定)
3. [基礎用法：獨立使用 SDK](#3-基礎用法獨立使用-sdk)
4. [Virtual Key 完整操作](#4-virtual-key-完整操作)
5. [Provider 路由與權重](#5-provider-路由與權重)
6. [預算與速率限制](#6-預算與速率限制)
7. [日誌查詢與用量分析](#7-日誌查詢與用量分析)
8. [模型列表與探索](#8-模型列表與探索)
9. [錯誤處理最佳實踐](#9-錯誤處理最佳實踐)
10. [重試機制深入解析](#10-重試機制深入解析)
11. [在 Draupnir 中整合：ILLMGatewayClient 抽象層](#11-在-draupnir-中整合illmgatewayclient-抽象層)
12. [測試策略](#12-測試策略)
13. [常見問題](#13-常見問題)

---

## 1. 概念總覽

### Bifrost 是什麼？

Bifrost 是 AI Gateway，在應用程式與 AI 供應商（OpenAI、Anthropic 等）之間提供統一的代理層。核心功能包括：

- **Virtual Key**：虛擬 API 金鑰，封裝多個供應商的路由規則
- **加權路由**：按比例分配請求到不同供應商
- **預算控制**：設定金額上限，防止超支
- **速率限制**：限制 token 用量或請求次數
- **日誌與用量追蹤**：記錄每筆請求的成本、延遲、token 數

### SDK 的角色

```
你的應用程式
    │
    ▼
@draupnir/bifrost-sdk   ← 本套件
    │
    ▼ HTTP (Bearer Auth)
Bifrost AI Gateway
    │
    ├─→ OpenAI
    ├─→ Anthropic
    └─→ 其他供應商
```

SDK 封裝了 Bifrost 的 REST API，提供型別安全的 TypeScript 介面，讓你不必處理 HTTP 請求、認證、重試等基礎設施。

---

## 2. 安裝與環境設定

### Monorepo 內使用

```jsonc
// package.json
{
  "dependencies": {
    "@draupnir/bifrost-sdk": "workspace:*"
  }
}
```

### 環境變數

建立 `.env` 或透過環境直接設定：

```bash
# 必要
BIFROST_API_URL=https://your-bifrost-instance.com
BIFROST_MASTER_KEY=sk-your-master-key

# 上述兩個值也可透過程式碼傳入，此時不需環境變數
```

### 驗證安裝

```typescript
import { BifrostClient, createBifrostClientConfig } from '@draupnir/bifrost-sdk'

const config = createBifrostClientConfig()
console.log('連線至:', config.baseUrl)

const client = new BifrostClient(config)
const keys = await client.listVirtualKeys()
console.log(`共有 ${keys.length} 個 Virtual Key`)
```

---

## 3. 基礎用法：獨立使用 SDK

### 建立配置

SDK 提供彈性的配置方式：

```typescript
import { createBifrostClientConfig } from '@draupnir/bifrost-sdk'

// 方式 A：全部使用環境變數（最簡潔）
const config = createBifrostClientConfig()

// 方式 B：明確指定必要值
const config = createBifrostClientConfig({
  baseUrl: 'https://gateway.example.com',
  masterKey: 'sk-xxx',
})

// 方式 C：客製化所有選項
const config = createBifrostClientConfig({
  baseUrl: 'https://gateway.example.com',
  masterKey: 'sk-xxx',
  timeoutMs: 60_000,        // 加長超時（預設 30s）
  maxRetries: 5,             // 增加重試次數（預設 3）
  retryBaseDelayMs: 1_000,   // 加長重試間隔（預設 500ms）
  proxyBaseUrl: 'https://proxy.example.com', // 獨立的 Proxy URL
})
```

> **提示**：`baseUrl` 的尾端斜線會自動移除，不需手動處理。

### 建立客戶端

```typescript
import { BifrostClient } from '@draupnir/bifrost-sdk'

const client = new BifrostClient(config)
// client 是無狀態的，可安全地作為 singleton 使用
```

---

## 4. Virtual Key 完整操作

### 4.1 建立 Virtual Key

```typescript
const newKey = await client.createVirtualKey({
  name: 'production-main',
  description: '正式環境主要金鑰',
  is_active: true,
})

// 重要：value 僅在建立時回傳，請妥善保存
console.log('Key ID:', newKey.id)
console.log('Key 值:', newKey.value)  // 之後無法再取得
```

### 4.2 列出所有 Virtual Key

```typescript
const keys = await client.listVirtualKeys()

for (const key of keys) {
  console.log(`${key.name} (${key.id}) - ${key.is_active ? '啟用' : '停用'}`)
  console.log(`  Providers: ${key.provider_configs.map(p => p.provider).join(', ')}`)
}
```

### 4.3 取得單一 Virtual Key

```typescript
const key = await client.getVirtualKey('vk-xxx')

// 包含完整的 Provider、Budget、RateLimit 內嵌資料
for (const pc of key.provider_configs) {
  console.log(`Provider: ${pc.provider}, 權重: ${pc.weight ?? '均等'}`)
  if (pc.budget) {
    console.log(`  預算: $${pc.budget.max_limit}, 已用: $${pc.budget.current_usage ?? 0}`)
  }
  if (pc.rate_limit) {
    console.log(`  Token 限制: ${pc.rate_limit.token_max_limit}`)
  }
}
```

### 4.4 更新 Virtual Key

```typescript
// 注意：provider_configs 和 mcp_configs 是整組替換，不是合併更新
const updated = await client.updateVirtualKey('vk-xxx', {
  description: '更新後的描述',
  is_active: false,  // 停用
})
```

### 4.5 刪除 Virtual Key

```typescript
await client.deleteVirtualKey('vk-xxx')
// 此操作不可逆
```

---

## 5. Provider 路由與權重

Virtual Key 的核心是 Provider 路由，決定請求如何分配到不同的 AI 供應商。

### 單一 Provider

```typescript
const key = await client.createVirtualKey({
  name: 'openai-only',
  provider_configs: [
    { provider: 'openai' },
  ],
})
```

### 加權多 Provider（流量分配）

```typescript
const key = await client.createVirtualKey({
  name: 'multi-provider',
  provider_configs: [
    { provider: 'openai', weight: 70 },      // 70% 流量
    { provider: 'anthropic', weight: 30 },    // 30% 流量
  ],
})
```

### 限制可用模型

```typescript
const key = await client.createVirtualKey({
  name: 'restricted',
  provider_configs: [
    {
      provider: 'openai',
      weight: 60,
      allowed_models: ['gpt-4o', 'gpt-4o-mini'],  // 只允許這些模型
    },
    {
      provider: 'anthropic',
      weight: 40,
      allowed_models: ['claude-sonnet-4-20250514'],
    },
  ],
})
```

### MCP 整合

```typescript
const key = await client.createVirtualKey({
  name: 'mcp-enabled',
  provider_configs: [{ provider: 'openai' }],
  mcp_configs: [
    {
      mcp_client_name: 'internal-tools',
      tools_to_execute: ['search', 'calculator', 'code-interpreter'],
    },
  ],
})
```

---

## 6. 預算與速率限制

### 設定預算上限

```typescript
const key = await client.createVirtualKey({
  name: 'budget-controlled',
  provider_configs: [{ provider: 'openai' }],
  budget: {
    max_limit: 500,           // $500 USD 上限
    reset_duration: '30d',     // 每 30 天重置
    calendar_aligned: true,    // 月初重置（而非建立日起算）
  },
})
```

### 設定速率限制

```typescript
const key = await client.createVirtualKey({
  name: 'rate-limited',
  provider_configs: [{ provider: 'openai' }],
  rate_limit: {
    token_max_limit: 1_000_000,     // 每週期最多 100 萬 token
    token_reset_duration: '1h',      // 每小時重置
    request_max_limit: 500,          // 每週期最多 500 次請求
    request_reset_duration: '1h',    // 每小時重置
  },
})
```

### 同時設定預算 + 速率限制

```typescript
const key = await client.createVirtualKey({
  name: 'fully-governed',
  provider_configs: [
    { provider: 'openai', weight: 60 },
    { provider: 'anthropic', weight: 40 },
  ],
  budget: {
    max_limit: 1000,
    reset_duration: '30d',
    calendar_aligned: true,
  },
  rate_limit: {
    token_max_limit: 5_000_000,
    token_reset_duration: '24h',
    request_max_limit: 10_000,
    request_reset_duration: '24h',
  },
  team_id: 'team-engineering',
  customer_id: 'customer-acme',
})
```

---

## 7. 日誌查詢與用量分析

### 查詢日誌

```typescript
// 基本查詢
const result = await client.getLogs()
console.log(`共 ${result.total ?? '?'} 筆日誌`)

// 進階篩選
const filtered = await client.getLogs({
  providers: 'openai,anthropic',    // 多值用逗號分隔
  models: 'gpt-4o',
  status: 'error',                  // 只看失敗的
  virtual_key_ids: 'vk-xxx,vk-yyy',
  start_time: '2026-04-01T00:00:00Z',
  end_time: '2026-04-10T23:59:59Z',
  min_cost: 0.01,                   // 排除極低成本請求
  sort_by: 'cost',
  order: 'desc',                    // 最貴的排前面
  limit: 100,
  offset: 0,
})
```

### 解讀日誌條目

```typescript
const { logs } = await client.getLogs({ limit: 5 })

for (const log of logs) {
  console.log([
    `[${log.timestamp}]`,
    `${log.provider}/${log.model}`,
    `狀態: ${log.status}`,
    `延遲: ${log.latency}ms`,
    `成本: $${log.cost.toFixed(4)}`,
    `Token: ${log.input_tokens ?? 0} → ${log.output_tokens ?? 0} (共 ${log.total_tokens ?? 0})`,
    log.number_of_retries ? `重試 ${log.number_of_retries} 次` : '',
    log.fallback_index ? `Fallback #${log.fallback_index}` : '',
  ].filter(Boolean).join(' | '))
}
```

### 統計摘要

```typescript
// 本月統計
const stats = await client.getLogsStats({
  start_time: '2026-04-01T00:00:00Z',
})

console.log(`
📊 用量統計
─────────────
總請求數：${stats.total_requests.toLocaleString()}
總成本：$${stats.total_cost.toFixed(2)}
總 Token：${stats.total_tokens.toLocaleString()}
平均延遲：${stats.avg_latency.toFixed(0)}ms
`)

// 按 Key 查詢
const keyStats = await client.getLogsStats({
  virtual_key_ids: 'vk-xxx',
  start_time: '2026-04-01T00:00:00Z',
  end_time: '2026-04-10T23:59:59Z',
})
```

---

## 8. 模型列表與探索

```typescript
// 列出所有可用模型
const models = await client.listModels()

for (const m of models) {
  console.log(`${m.id} — ctx: ${m.context_length ?? '?'}, max_out: ${m.max_output_tokens ?? '?'}`)
}

// 按供應商篩選
const openaiModels = await client.listModels({ provider: 'openai' })

// 分頁
const page1 = await client.listModels({ page_size: 20 })
// page_token 用於下一頁（如果 API 支援）
```

---

## 9. 錯誤處理最佳實踐

### 基本模式

```typescript
import { isBifrostApiError, BifrostApiError } from '@draupnir/bifrost-sdk'

try {
  const key = await client.getVirtualKey('vk-xxx')
} catch (error) {
  if (isBifrostApiError(error)) {
    // 結構化的 API 錯誤
    switch (error.status) {
      case 404:
        console.log('Virtual Key 不存在')
        break
      case 401:
        console.log('Master Key 無效或已過期')
        break
      case 429:
        console.log('請求過於頻繁，請稍後再試')
        break
      default:
        console.log(`API 錯誤 ${error.status}: ${error.message}`)
    }
    // 進階：檢查原始回應
    console.log('回應內容:', error.responseBody)
  } else {
    // 網路錯誤或未預期的錯誤
    console.log('非預期錯誤:', error)
  }
}
```

### 區分可重試與不可重試

```typescript
try {
  await client.createVirtualKey({ name: 'test' })
} catch (error) {
  if (isBifrostApiError(error)) {
    if (error.isRetryable) {
      // 429, 500, 502, 503, 504 — SDK 已經重試過 maxRetries 次了
      console.log('即使重試仍然失敗，可能是服務暫時不可用')
    } else {
      // 400, 401, 403, 404, 422 — 不會重試，因為重試也不會成功
      console.log('請求本身有問題，需修正後再嘗試')
    }
  }
}
```

### 處理超時

```typescript
try {
  await client.getLogs({ limit: 10000 })
} catch (error) {
  // AbortSignal.timeout 在超時時拋出 DOMException (name: 'TimeoutError')
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    console.log('請求超時，嘗試縮小查詢範圍或增加 timeoutMs')
  }
}
```

---

## 10. 重試機制深入解析

### SDK 內建重試

所有 `BifrostClient` 方法都自動重試，無需額外配置。行為由 `createBifrostClientConfig` 中的選項控制：

```typescript
const config = createBifrostClientConfig({
  maxRetries: 3,          // 最多重試 3 次（加上首次共 4 次嘗試）
  retryBaseDelayMs: 500,  // 基礎延遲 500ms
})
```

延遲計算公式：`baseDelayMs × 2^attempt + random(0, baseDelayMs)`

| 嘗試 | 延遲範圍 | 累計最短等待 |
|------|----------|-------------|
| 首次 | 立即 | 0ms |
| 第 1 次重試 | 500–1,000ms | 0.5s |
| 第 2 次重試 | 1,000–1,500ms | 1.5s |
| 第 3 次重試 | 2,000–2,500ms | 3.5s |

### 哪些情況會重試？

| 情況 | 重試？ | 原因 |
|------|:------:|------|
| HTTP 429（Too Many Requests） | ✅ | 速率限制，稍後可能成功 |
| HTTP 500（Internal Server Error） | ✅ | 伺服器暫時故障 |
| HTTP 502, 503, 504 | ✅ | 閘道/服務暫時不可用 |
| `TypeError` | ✅ | 通常是 DNS 或網路暫時故障 |
| 含 `"fetch"` 的錯誤 | ✅ | Fetch API 網路故障 |
| HTTP 400（Bad Request） | ❌ | 請求格式錯誤，重試無用 |
| HTTP 401, 403 | ❌ | 認證/授權問題 |
| HTTP 404 | ❌ | 資源不存在 |
| HTTP 422 | ❌ | 驗證失敗 |

### 獨立使用 `withRetry`

`withRetry` 可以脫離 `BifrostClient` 獨立使用，適合包裝任何非同步操作：

```typescript
import { withRetry } from '@draupnir/bifrost-sdk'

// 包裝任意 async 函式
const data = await withRetry(
  async () => {
    const res = await fetch('https://api.example.com/data')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  },
  { maxRetries: 5, baseDelayMs: 1_000 },
)
```

---

## 11. 在 Draupnir 中整合：ILLMGatewayClient 抽象層

在 Draupnir 主專案中，SDK 不會被業務層直接使用。而是透過 `ILLMGatewayClient` 抽象介面，由 `BifrostGatewayAdapter` 作為橋接。

### 架構分層

```
業務層（Service / UseCase）
    │ 依賴 ILLMGatewayClient 介面
    ▼
ILLMGatewayClient（Gateway-neutral 介面）
    │
    ├─ BifrostGatewayAdapter ← 實際生產環境
    │      │
    │      └─ @draupnir/bifrost-sdk（BifrostClient）
    │
    └─ MockGatewayClient     ← 測試環境
```

### 為什麼需要抽象層？

1. **解耦**：業務邏輯不知道後端是 Bifrost、OpenRouter 還是其他 Gateway
2. **可測試**：用 `MockGatewayClient` 做單元測試，不需要真實 API
3. **一致性**：所有 Gateway 回傳統一的 camelCase DTO，消除 snake_case 差異
4. **可擴展**：新增 Gateway 只需實作一個 Adapter，業務層零修改

### 依賴注入註冊

`FoundationServiceProvider` 負責組裝所有 Gateway 相關元件：

```typescript
// src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts
import { BifrostGatewayAdapter } from '../Services/LLMGateway/implementations/BifrostGatewayAdapter'
import { BifrostClient, createBifrostClientConfig } from '@draupnir/bifrost-sdk'

container.singleton('bifrostConfig', () => createBifrostClientConfig())

container.singleton('bifrostClient', (c) => {
  return new BifrostClient(c.make('bifrostConfig'))
})

container.singleton('llmGatewayClient', (c) => {
  return new BifrostGatewayAdapter(c.make('bifrostClient'))
})
```

### 業務層使用方式

業務層只依賴介面，不引入 SDK：

```typescript
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'

class IssueAppKeyService {
  constructor(private readonly gateway: ILLMGatewayClient) {}

  async execute(orgId: string, keyName: string) {
    // 使用 Gateway-neutral 的 camelCase API
    const result = await this.gateway.createKey({
      name: keyName,
      customerId: orgId,
      isActive: true,
    })

    // result.id, result.name, result.value, result.isActive
    return result
  }
}
```

### 資料轉換：snake_case → camelCase

Adapter 自動處理 Bifrost API 的 snake_case 與內部 camelCase 之間的轉換：

| Bifrost SDK（snake_case） | ILLMGatewayClient（camelCase） |
|--------------------------|-------------------------------|
| `customer_id` | `customerId` |
| `is_active` | `isActive` |
| `virtual_key_ids` | `keyIds` |
| `start_time` | `startTime` |
| `total_requests` | `totalRequests` |
| `input_tokens` | `inputTokens` |

### 錯誤轉換

Adapter 將 `BifrostApiError` 轉換為 Gateway-neutral 的 `GatewayError`：

| HTTP 狀態碼 | GatewayErrorCode | `retryable` |
|:-----------:|:----------------:|:-----------:|
| 400, 422 | `VALIDATION` | `false` |
| 401, 403 | `UNAUTHORIZED` | `false` |
| 404 | `NOT_FOUND` | `false` |
| 429 | `RATE_LIMITED` | `true` |
| 502, 503, 504 | `NETWORK` | `true` |
| 其他 | `UNKNOWN` | `false` |
| TypeError | `NETWORK` | `true` |

業務層的錯誤處理：

```typescript
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway'

try {
  await gateway.createKey({ name: 'test' })
} catch (error) {
  if (error instanceof GatewayError) {
    switch (error.code) {
      case 'NOT_FOUND':     // 資源不存在
      case 'VALIDATION':    // 請求參數錯誤
      case 'UNAUTHORIZED':  // 認證失敗
      case 'RATE_LIMITED':  // 速率限制
      case 'NETWORK':       // 網路問題
      case 'UNKNOWN':       // 未知錯誤
    }
  }
}
```

---

## 12. 測試策略

### 使用 MockGatewayClient

Draupnir 提供完整的測試替身，無需 mock 任何 HTTP 請求：

```typescript
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { describe, it, expect, beforeEach } from 'bun:test'

describe('IssueAppKeyService', () => {
  let mockGateway: MockGatewayClient

  beforeEach(() => {
    mockGateway = new MockGatewayClient()
  })

  it('creates a key with correct parameters', async () => {
    const service = new IssueAppKeyService(mockGateway)

    const result = await service.execute('org-123', 'my-key')

    // 驗證回傳值
    expect(result.name).toBe('my-key')
    expect(result.isActive).toBe(true)
    expect(result.value).toBeDefined()

    // 驗證呼叫參數
    expect(mockGateway.calls.createKey).toHaveLength(1)
    expect(mockGateway.calls.createKey[0]).toEqual({
      name: 'my-key',
      customerId: 'org-123',
      isActive: true,
    })
  })

  it('handles gateway failure', async () => {
    const { GatewayError } = await import('@/Foundation/Infrastructure/Services/LLMGateway/errors')
    mockGateway.failNext(new GatewayError('rate limited', 'RATE_LIMITED', 429, true))

    const service = new IssueAppKeyService(mockGateway)
    await expect(service.execute('org-123', 'key')).rejects.toThrow('rate limited')
  })
})
```

### MockGatewayClient 功能一覽

```typescript
const mock = new MockGatewayClient()

// 📋 呼叫追蹤
mock.calls.createKey     // readonly CreateKeyRequest[]
mock.calls.updateKey     // readonly { keyId, request }[]
mock.calls.deleteKey     // readonly string[]
mock.calls.getUsageStats // readonly { keyIds, query? }[]
mock.calls.getUsageLogs  // readonly { keyIds, query? }[]

// 💉 注入失敗（FIFO 佇列，每次消耗一個）
mock.failNext(new GatewayError(...))
mock.failNext(new GatewayError(...))  // 前兩次呼叫會失敗

// 🌱 預設回傳值
mock.seedUsageStats({
  totalRequests: 1000,
  totalCost: 42.5,
  totalTokens: 500_000,
  avgLatency: 250,
})
mock.seedUsageLogs([
  { timestamp: '...', keyId: 'vk-1', model: 'gpt-4o', ... },
])

// 🔄 重置（適合 beforeEach）
mock.reset()
```

### 直接測試 SDK（Smoke Test）

SDK 本身有獨立的 smoke test，驗證匯出與基本行為：

```bash
# 從 monorepo 根目錄
bun run test:sdk

# 從 SDK 目錄
cd packages/bifrost-sdk && bun test
```

---

## 13. 常見問題

### Q: 我應該直接用 SDK 還是用 ILLMGatewayClient？

**在 Draupnir 的 `src/` 中**：永遠透過 `ILLMGatewayClient` 介面。這是架構約定。

**在 Draupnir 外的專案**：直接用 SDK 即可，不需要抽象層。

**在測試中**：用 `MockGatewayClient` 替代，不需連接實際 Gateway。

### Q: createBifrostClientConfig 拋出錯誤，說缺少環境變數？

確認 `.env` 中有設定 `BIFROST_API_URL` 和 `BIFROST_MASTER_KEY`，或在呼叫時明確傳入：

```typescript
const config = createBifrostClientConfig({
  baseUrl: 'https://...',
  masterKey: 'sk-...',
})
```

### Q: 重試 3 次後仍然失敗？

SDK 重試後仍失敗表示問題持續存在。檢查：

1. **429**：Gateway 的全域速率限制，可能需要等更久或調整限制
2. **5xx**：Gateway 服務可能暫時不可用，檢查部署狀態
3. **網路錯誤**：檢查 DNS、防火牆、VPN 連線

如需更多重試，調大 `maxRetries`：

```typescript
const config = createBifrostClientConfig({ maxRetries: 10 })
```

### Q: proxyBaseUrl 是做什麼的？

`proxyBaseUrl` 用於透過 Gateway 轉發 AI 請求（如 `/v1/chat/completions`），與管理 API（`baseUrl`）可能不同。若未設定，預設與 `baseUrl` 相同。

### Q: 如何新增其他 Gateway 支援？

1. 建立新的 Adapter 實作 `ILLMGatewayClient`
2. 在 `FoundationServiceProvider` 中根據配置選擇 Adapter
3. 業務層無需修改

```typescript
// 未來範例
container.singleton('llmGatewayClient', (c) => {
  const provider = process.env.LLM_GATEWAY ?? 'bifrost'
  switch (provider) {
    case 'bifrost':
      return new BifrostGatewayAdapter(c.make('bifrostClient'))
    case 'openrouter':
      return new OpenRouterAdapter(c.make('openRouterClient'))
    default:
      throw new Error(`Unknown LLM gateway: ${provider}`)
  }
})
```
