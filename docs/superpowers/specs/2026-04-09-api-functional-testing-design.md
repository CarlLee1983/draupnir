# API 功能性測試設計規格

> 基於 OpenAPI Spec 的自動化 API 功能性測試框架

## 背景

Draupnir 目前的測試層級：

- **單元測試**：Value Object、Entity、Service 的邏輯驗證（Bun test）
- **E2E 測試**：AuthFlow 端到端流程（Playwright / Vitest）

**缺口**：沒有針對 HTTP API 層的功能性測試 — 真正發送 HTTP 請求、驗證 API 回應是否符合 OpenAPI 規格。

## 核心決策

| 決策項目 | 選擇 | 理由 |
|----------|------|------|
| 執行環境 | 本地 MemoryDB + 未來可打真實環境 | 本地快速回歸；真實環境驗證部署 |
| 測試生成 | 完全自動生成 | spec 驅動，零人工介入 |
| 狀態依賴 | 獨立 endpoint 測試 + 流程鏈測試 | 獨立測試覆蓋 schema，流程鏈覆蓋業務邏輯 |
| 測試框架 | Bun test | 與現有單元測試統一，流程鏈邏輯用 TS 最靈活 |
| 觸發時機 | 動態讀取（runtime 解析 spec） | spec 即 source of truth，零 drift 風險 |
| 測試資料策略 | 先做本地 MemoryDB | 真實環境策略後續設計 |
| 架構方案 | Spec Walker + x-test-flows 擴展 | spec 作為唯一 source of truth，OpenAPI 允許的擴展機制 |

## 架構

```
openapi.yaml (唯一 source of truth)
    │
    ├── paths/* ──────→ Spec Walker ──→ 自動產生：
    │                      │             • Happy path test (每個 operation)
    │                      │             • Error case test (缺欄位、錯格式)
    │                      │             • Auth gate test (有 security → 無 token → 401)
    │                      │             • Schema validation (response 結構比對)
    │                      │
    │                      └── 使用 lib/:
    │                            ├── spec-parser.ts
    │                            ├── schema-validator.ts
    │                            ├── request-builder.ts
    │                            └── test-client.ts
    │
    └── x-test-flows/* ──→ Flow Runner ──→ 自動產生：
                              │             • 依序執行 steps
                              │             • 前步 extract → 後步注入（JSONPath）
                              │             • 每步驗證 status + optional assertions
                              │
                              └── 使用 lib/:
                                    ├── flow-parser.ts
                                    └── jsonpath.ts
```

## 檔案結構

```
tests/Feature/
├── api-spec.test.ts          # Spec Walker：endpoint 獨立測試
├── api-flows.test.ts         # Flow Runner：流程鏈測試
└── lib/
    ├── spec-parser.ts        # OpenAPI YAML → Operation[]
    ├── schema-validator.ts   # AJV response schema 驗證
    ├── request-builder.ts    # 從 schema 產生合法/非法 request body
    ├── test-client.ts        # HTTP fetch 封裝 + auth header
    ├── test-server.ts        # Server 啟動/停止生命週期
    ├── flow-parser.ts        # x-test-flows 解析
    └── jsonpath.ts           # $.a.b.c 點號路徑取值

docs/openapi.yaml             # 補上 x-test-flows + response schemas
```

## Spec Walker — 自動 Endpoint 測試

### 動態測試生成

`api-spec.test.ts` 在 runtime 解析 `openapi.yaml`，對每個 path + method 組合動態產生 test case：

```typescript
const spec = parseOpenAPI('docs/openapi.yaml')

for (const operation of spec.operations) {
  describe(`${operation.method.toUpperCase()} ${operation.path}`, () => {
    // 1. Happy path → 預期 status code
    // 2. Response schema 驗證（有定義時）
    // 3. Auth gate → 無 token 回 401（有 security 時）
    // 4. 必填欄位缺漏 → 400（有 required 時）
  })
}
```

### 每個 Endpoint 自動產生的 Test Case

| Test Case | 條件 | 驗證內容 |
|-----------|------|---------|
| Happy path | 所有 endpoint | 正確 request → 預期 status code |
| Schema 驗證 | response 有定義 schema 時 | response body 結構符合 spec |
| Auth gate | 有 `security` 定義時 | 不帶 token → 401 |
| 必填欄位缺漏 | 有 `required` fields 時 | 空 body → 400 |

### Request Body 自動生成策略

| Schema Type | 生成策略 |
|-------------|---------|
| `string` + `format: email` | `test-{uuid}@feature.test` |
| `string` + `format: uuid` | `crypto.randomUUID()` |
| `string` + `minLength: N` | 隨機 N+4 字元字串 |
| `string`（一般） | `test-{fieldName}` |
| `number` / `integer` | `1` |
| `boolean` | `true` |
| `object` | 遞迴處理各 property |

### Auth 狀態解決

需要 auth 的 endpoint，測試前自動 register + login 取得 token：

```typescript
async function ensureAuth(): Promise<string> {
  if (cachedToken) return cachedToken
  await client.post('/api/auth/register', { email, password })
  const res = await client.post('/api/auth/login', { email, password })
  cachedToken = res.json.data.accessToken
  return cachedToken
}
```

### 特殊 Endpoint 前置資料

依賴前置資料的 endpoint 透過 `x-test-setup` 擴展欄位處理：

```yaml
/api/organizations:
  get:
    x-test-setup:
      - operation: post-/api/organizations
        body: { name: "Test Org", managerUserId: "$.authUserId" }
```

`$.authUserId` 是內建變數，由 `ensureAuth()` 執行 register + login 後自動注入 context。內建變數清單：

- `$.authUserId` — 自動認證用戶的 user ID
- `$.authToken` — 自動認證用戶的 access token

## Flow Runner — 流程鏈測試

### x-test-flows 格式

```yaml
x-test-flows:
  auth-flow:
    description: 完整認證流程
    steps:
      - operation: post-/api/auth/register
        body:
          email: "flow-auth@feature.test"
          password: "SecurePass123"
        expect:
          status: 201
        extract:
          userId: "$.data.user.id"

      - operation: post-/api/auth/login
        body:
          email: "flow-auth@feature.test"
          password: "SecurePass123"
        expect:
          status: 200
          body:
            data.accessToken: { exists: true }
            data.refreshToken: { exists: true }
        extract:
          token: "$.data.accessToken"

      - operation: get-/api/user/me
        auth: "$.token"
        expect:
          status: 200
          body:
            data.email: "flow-auth@feature.test"

  org-flow:
    description: 組織建立與列表
    steps:
      - operation: post-/api/auth/register
        body:
          email: "flow-org@feature.test"
          password: "SecurePass123"
        extract:
          userId: "$.data.user.id"

      - operation: post-/api/auth/login
        body:
          email: "flow-org@feature.test"
          password: "SecurePass123"
        extract:
          token: "$.data.accessToken"

      - operation: post-/api/organizations
        auth: "$.token"
        body:
          name: "Test Organization"
          managerUserId: "$.userId"
        expect:
          status: 201

      - operation: get-/api/organizations
        auth: "$.token"
        expect:
          status: 200
```

### Flow Runner 邏輯

```typescript
const flows = spec['x-test-flows']

for (const [flowName, flow] of Object.entries(flows)) {
  describe(`流程鏈: ${flow.description}`, () => {
    it('完成所有步驟', async () => {
      const context: Record<string, unknown> = {}

      for (const step of flow.steps) {
        const body = resolveRefs(step.body, context)
        const auth = step.auth ? resolveRef(step.auth, context) : undefined
        const res = await client.request(parseOperation(step.operation), { body, auth })

        // 驗證 expect
        if (step.expect?.status) expect(res.status).toBe(step.expect.status)
        if (step.expect?.body) { /* 逐欄位斷言 */ }

        // 提取變數
        if (step.extract) {
          for (const [key, path] of Object.entries(step.extract)) {
            context[key] = extractValue(res.json, path)
          }
        }
      }
    })
  })
}
```

### Expect 斷言支援

| 斷言格式 | 含義 |
|----------|------|
| `{ exists: true }` | 欄位存在且非 null/undefined |
| `"literal"` | 嚴格相等 |
| `{ gt: 0 }` | 大於 |
| `{ contains: "text" }` | 字串包含 |
| `{ length: 1 }` | 陣列長度 |

### JSONPath 實作

不引入完整 JSONPath 套件，只實作 `$.a.b.c` 點號路徑取值：

```typescript
function extractValue(obj: unknown, path: string): unknown {
  const keys = path.replace(/^\$\./, '').split('.')
  let current = obj
  for (const key of keys) {
    current = (current as Record<string, unknown>)?.[key]
  }
  return current
}
```

## Server 生命週期與環境切換

### 本地測試 — 自動啟動 Server

```typescript
// tests/Feature/lib/test-server.ts
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001'

export function setupTestServer() {
  if (process.env.API_BASE_URL) return  // 有外部 URL → 不啟動

  beforeAll(async () => {
    serverProcess = Bun.spawn(
      ['bun', 'run', 'src/index.ts'],
      { env: { ...process.env, PORT: '3001', ORM: 'memory' } }
    )
    await waitForReady(BASE_URL + '/api/health', 10_000)
  })

  afterAll(() => {
    serverProcess?.kill()
  })
}
```

### 環境切換

```bash
# 本地（預設）— 自動啟動 MemoryDB server
bun test tests/Feature/

# 打 staging
API_BASE_URL=https://staging.example.com bun test tests/Feature/

# 打 production
API_BASE_URL=https://api.example.com bun test tests/Feature/
```

## Schema 驗證

### AJV 整合

使用 `ajv` + `ajv-formats` 做 response body 的 JSON Schema 驗證：

```typescript
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)
```

### Response Schema 缺口

目前 `openapi.yaml` 的 response 只有 `description`，沒有 body schema。策略：

- 有 `content.application/json.schema` 時 → 執行 schema 驗證
- 沒有時 → 只驗 status code，測試報告標記 `⚠ 缺少 response schema`
- 逐步補完 response schema 作為實作計畫的一部分

### 錯誤報告格式

測試失敗時輸出完整 debug 資訊：

```
✗ POST /api/auth/register → 回傳 201

  Status: expected 201, got 400

  Request:
    POST http://localhost:3001/api/auth/register
    Body: { "email": "test-xxx@feature.test", "password": "Ab12345678" }

  Response:
    Status: 400
    Body: { "success": false, "error": "Email already exists" }
```

```
✗ POST /api/auth/register → response 結構符合 OpenAPI spec

  Schema validation failed:
    - $.data.user.id: must be string (got number)
    - $.data.user.email: must match format "email"
```

## 新增依賴

| 套件 | 用途 | 大小 |
|------|------|------|
| `ajv` | JSON Schema 驗證 | ~150KB |
| `ajv-formats` | email/uuid 等 format 支援 | ~10KB |
| `yaml` | 解析 openapi.yaml | ~100KB |

## 執行指令

```bash
# 跑所有功能性測試
bun test tests/Feature/

# 只跑 schema 驗證
bun test tests/Feature/api-spec.test.ts

# 只跑流程鏈
bun test tests/Feature/api-flows.test.ts

# 打 staging
API_BASE_URL=https://staging.example.com bun test tests/Feature/
```

## OpenAPI Spec 補完清單

實作時需要對 `docs/openapi.yaml` 做的修改：

1. 新增 `x-test-flows`（auth-flow、org-flow）
2. 補上 response body schema（RegisterResponse、LoginResponse 等）
3. 需要前置資料的 endpoint 加 `x-test-setup`

## 未來擴展

- **真實環境測試資料策略**：固定 prefix / 專用測試租戶（已延後）
- **CI 整合**：GitHub Actions 中跑功能性測試
- **覆蓋率追蹤**：追蹤 spec 中有多少 endpoint 被測試覆蓋
- **效能基準**：在流程鏈中記錄 response time
