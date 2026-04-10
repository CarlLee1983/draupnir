# @draupnir/bifrost-sdk

Bifrost AI Gateway 的型別安全 TypeScript 客戶端，提供 Virtual Key 管理、請求日誌查詢與模型列表等功能。

> **完整教學**：請參閱 [`docs/GUIDE.md`](./docs/GUIDE.md)，涵蓋從基礎到 Draupnir 整合的所有面向。

## 目錄

- [安裝](#安裝)
- [快速開始](#快速開始)
- [設定](#設定)
- [API 參考](#api-參考)
  - [Virtual Key 管理](#virtual-key-管理)
  - [日誌查詢](#日誌查詢)
  - [模型列表](#模型列表)
- [錯誤處理](#錯誤處理)
- [重試機制](#重試機制)
- [架構](#架構)
- [開發](#開發)

## 安裝

此為 monorepo 內部套件，透過 workspace 依賴使用：

```jsonc
// package.json
{
  "dependencies": {
    "@draupnir/bifrost-sdk": "workspace:*"
  }
}
```

## 快速開始

```typescript
import { BifrostClient, createBifrostClientConfig } from '@draupnir/bifrost-sdk'

// 從環境變數建立配置（需設定 BIFROST_API_URL 和 BIFROST_MASTER_KEY）
const config = createBifrostClientConfig()
const client = new BifrostClient(config)

// 列出所有 Virtual Key
const keys = await client.listVirtualKeys()

// 建立 Virtual Key
const newKey = await client.createVirtualKey({
  name: 'production-key',
  description: '正式環境使用',
  provider_configs: [
    { provider: 'openai', weight: 70 },
    { provider: 'anthropic', weight: 30 },
  ],
})
// newKey.value 僅在建立時回傳，請妥善保存
```

## 設定

### 環境變數

| 變數 | 說明 | 必填 |
|------|------|:----:|
| `BIFROST_API_URL` | Bifrost Gateway 管理 API 基礎 URL | 是 |
| `BIFROST_MASTER_KEY` | Master Key，用於 Bearer 認證 | 是 |

### 配置選項

透過 `createBifrostClientConfig()` 建立配置，所有選項皆可覆寫：

```typescript
const config = createBifrostClientConfig({
  baseUrl: 'https://gateway.example.com',  // 預設：BIFROST_API_URL
  masterKey: 'sk-xxx',                      // 預設：BIFROST_MASTER_KEY
  timeoutMs: 60_000,                        // 預設：30,000（30 秒）
  maxRetries: 5,                            // 預設：3
  retryBaseDelayMs: 1000,                   // 預設：500
  proxyBaseUrl: 'https://proxy.example.com', // 預設：與 baseUrl 相同
})
```

| 選項 | 型別 | 預設值 | 說明 |
|------|------|--------|------|
| `baseUrl` | `string` | `BIFROST_API_URL` | 管理 API 基礎 URL |
| `masterKey` | `string` | `BIFROST_MASTER_KEY` | Bearer 認證金鑰 |
| `timeoutMs` | `number` | `30000` | 單次請求超時（毫秒） |
| `maxRetries` | `number` | `3` | 最大重試次數 |
| `retryBaseDelayMs` | `number` | `500` | 重試基礎延遲（毫秒） |
| `proxyBaseUrl` | `string` | 同 `baseUrl` | Proxy 端點 URL（用於轉發 AI 請求） |

> **注意**：`baseUrl` 尾端的斜線會自動移除。

## API 參考

### Virtual Key 管理

Virtual Key 是 Bifrost 的核心概念，作為 AI API 的虛擬金鑰，封裝了 Provider 路由、預算限制與速率控制。

#### 建立

```typescript
const vk = await client.createVirtualKey({
  name: 'my-key',
  description: '選擇性描述',
  provider_configs: [
    {
      provider: 'openai',
      weight: 60,
      allowed_models: ['gpt-4o', 'gpt-4o-mini'],
    },
    {
      provider: 'anthropic',
      weight: 40,
    },
  ],
  mcp_configs: [
    {
      mcp_client_name: 'my-mcp-client',
      tools_to_execute: ['search', 'calculator'],
    },
  ],
  budget: {
    max_limit: 100,           // 100 美元上限
    reset_duration: '30d',    // 每 30 天重置
    calendar_aligned: true,   // 對齊月曆（月初重置）
  },
  rate_limit: {
    token_max_limit: 1_000_000,
    token_reset_duration: '1h',
    request_max_limit: 1000,
    request_reset_duration: '1h',
  },
  team_id: 'team-xxx',
  customer_id: 'cust-xxx',
  is_active: true,
})

console.log(vk.id)     // Virtual Key ID
console.log(vk.value)  // 金鑰值（僅建立時回傳）
```

#### 列出

```typescript
const keys = await client.listVirtualKeys()
// keys: readonly BifrostVirtualKey[]
```

#### 取得

```typescript
const key = await client.getVirtualKey('vk-xxx')
// key.provider_configs 包含內嵌的 budget 和 rate_limit 資訊
```

#### 更新

```typescript
const updated = await client.updateVirtualKey('vk-xxx', {
  name: '新名稱',
  is_active: false,
  provider_configs: [
    { provider: 'openai' },  // 整組替換，非 merge
  ],
})
```

> **注意**：`provider_configs` 和 `mcp_configs` 為整組替換，非合併更新。

#### 刪除

```typescript
await client.deleteVirtualKey('vk-xxx')
```

### 日誌查詢

#### 查詢日誌

```typescript
const result = await client.getLogs({
  providers: 'openai,anthropic',    // 逗號分隔
  models: 'gpt-4o',
  status: 'success',
  virtual_key_ids: 'vk-xxx',
  start_time: '2026-01-01T00:00:00Z',
  end_time: '2026-01-31T23:59:59Z',
  min_cost: 0.01,
  max_cost: 10.0,
  limit: 50,
  offset: 0,
  sort_by: 'timestamp',
  order: 'desc',
})

for (const log of result.logs) {
  console.log(`${log.provider}/${log.model}: ${log.cost} USD, ${log.latency}ms`)
}
```

#### 統計摘要

```typescript
const stats = await client.getLogsStats({
  start_time: '2026-04-01T00:00:00Z',
})

console.log(`總請求：${stats.total_requests}`)
console.log(`總成本：$${stats.total_cost}`)
console.log(`總 Token：${stats.total_tokens}`)
console.log(`平均延遲：${stats.avg_latency}ms`)
```

### 模型列表

```typescript
const models = await client.listModels({
  provider: 'openai',
  page_size: 50,
})

for (const model of models) {
  console.log(`${model.id} (ctx: ${model.context_length})`)
}
```

## 錯誤處理

所有 API 錯誤皆拋出 `BifrostApiError`，包含結構化的錯誤資訊：

```typescript
import { BifrostApiError, isBifrostApiError } from '@draupnir/bifrost-sdk'

try {
  await client.getVirtualKey('non-existent')
} catch (error) {
  if (isBifrostApiError(error)) {
    console.log(error.status)        // HTTP 狀態碼（如 404）
    console.log(error.endpoint)      // API 端點路徑
    console.log(error.responseBody)  // 原始回應內容
    console.log(error.isRetryable)   // 是否可重試（429、5xx）
    console.log(error.message)       // 格式化的錯誤訊息
  }
}
```

### 可重試的狀態碼

以下 HTTP 狀態碼會觸發自動重試：

| 狀態碼 | 說明 |
|--------|------|
| `429` | Too Many Requests（速率限制） |
| `500` | Internal Server Error |
| `502` | Bad Gateway |
| `503` | Service Unavailable |
| `504` | Gateway Timeout |

其他狀態碼（如 `400`、`401`、`404`）會立即拋出，不重試。

## 重試機制

SDK 內建指數退避重試，透過 `withRetry` 實現：

- **策略**：指數退避 + 隨機抖動（jitter）
- **延遲公式**：`baseDelayMs × 2^attempt + random(0, baseDelayMs)`
- **可重試條件**：`BifrostApiError.isRetryable`、`TypeError`（網路錯誤）、含 `"fetch"` 的錯誤訊息
- **不可重試錯誤**：立即拋出，不消耗重試次數

以預設配置為例（`baseDelayMs=500`, `maxRetries=3`）：

| 嘗試 | 延遲範圍 |
|------|----------|
| 第 1 次重試 | 500–1,000ms |
| 第 2 次重試 | 1,000–1,500ms |
| 第 3 次重試 | 2,000–2,500ms |

`withRetry` 也可獨立使用：

```typescript
import { withRetry } from '@draupnir/bifrost-sdk'

const result = await withRetry(
  () => fetch('https://api.example.com/data'),
  { maxRetries: 5, baseDelayMs: 1000 },
)
```

## 架構

此 SDK 是 Draupnir 的 LLM Gateway 抽象層設計的一部分。在主專案中，`BifrostClient` 被 `BifrostGatewayAdapter` 包裝，實作統一的 `ILLMGatewayClient` 介面：

```
Draupnir 業務層（AppKeyBifrostSync, QueryUsage, ...）
          │
          ▼
  ILLMGatewayClient（抽象介面）
          │
    ┌─────┼─────┐
    ▼     ▼     ▼
 Bifrost  Mock  (未來：OpenRouter, ...)
 Adapter
    │
    ▼
 @draupnir/bifrost-sdk（本套件）
```

### 檔案結構

```
packages/bifrost-sdk/
├── src/
│   ├── index.ts               # 公開 API 匯出
│   ├── BifrostClient.ts       # HTTP 客戶端（Virtual Key CRUD、日誌、模型）
│   ├── BifrostClientConfig.ts # 配置型別與工廠函式
│   ├── errors.ts              # BifrostApiError 與型別守衛
│   ├── retry.ts               # 指數退避重試
│   └── types.ts               # 所有 API 型別定義
├── __tests__/
│   └── smoke.test.ts          # 匯出驗證與基本行為測試
├── package.json
├── tsconfig.json
└── README.md
```

## 開發

```bash
# 執行測試
bun test

# 型別檢查
bun run typecheck

# 建置
bun run build
```

### 從 monorepo 根目錄

```bash
bun run test:sdk
```

### 設計原則

- **零外部依賴**：僅使用 Web 標準 API（`fetch`、`AbortSignal`）
- **不可變**：所有型別使用 `readonly`，回傳值不可修改
- **型別安全**：嚴格 TypeScript，完整泛型支援
- **可獨立使用**：無 Draupnir 特定邏輯，純 Bifrost API 客戶端
