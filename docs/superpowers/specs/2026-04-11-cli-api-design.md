# CliApi 模組設計文檔（第一週期）

**日期**：2026-04-11  
**版本**：1.0  
**範圍**：CliApi 模組 6 個 API 端點 + Device Flow OAuth 整合

---

## 目標與概述

### 目標
完成 Draupnir 的**命令列工具認證系統**，支持：
- Device Authorization Grant Flow（RFC 8628）
- 設備碼與使用者碼生成
- 令牌交換與會話管理
- LLM 模型代理請求
- 會話撤銷與登出

### 成功指標
1. 所有 6 個 API 端點路由正常運作（POST 端點）
2. Device Flow 端對端測試通過（設備碼 → 授權 → 令牌交換）
3. 令牌交換能正常處理各種狀態（pending、expired、consumed）
4. 單元測試覆蓋 ≥ 80%
5. E2E 測試驗證核心 CLI 認證旅程

---

## 端點清單與功能

### 1. POST /cli/device-code — 啟動設備流程

**責任**：初始化 OAuth 2.0 Device Authorization 流程

**請求**：無請求體

**流程**：
1. 生成唯一的設備碼（UUID）
2. 生成人類友善的使用者碼（8 字元英數字）
3. 儲存設備碼至記憶體或資料庫（有效期 10 分鐘）
4. 返回初始化資料（設備碼、使用者碼、驗證 URI、過期時間）

**回應**：
```json
{
  "success": true,
  "message": "Device code generated. Please visit the verification page and enter the user code.",
  "data": {
    "deviceCode": "550e8400-e29b-41d4-a716-446655440000",
    "userCode": "ABCD1234",
    "verificationUri": "https://draupnir.local/verify-device",
    "expiresIn": 600,
    "interval": 5
  }
}
```

**Inertia Props**（若有對應 UI 頁面）：
```typescript
{
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}
```

---

### 2. POST /cli/authorize — 授權設備

**路由**：`POST /cli/authorize` （需認證）  
**責任**：使用者在另一台設備（如瀏覽器）驗證使用者碼，授權該設備

**認證需求**：JWT Bearer token（使用者已登入）

**請求體**：
```json
{
  "userCode": "ABCD1234"
}
```

**流程**：
1. 驗證請求的有效性（userCode 格式）
2. 查詢設備碼記錄：
   - 未找到 → 返回「無效或已過期的使用者碼」
   - 已過期 → 返回「設備碼已過期」
   - 已授權或已消費 → 返回「此設備碼已被使用」
3. 更新設備碼狀態為 AUTHORIZED，記錄授權使用者的 ID、Email、Role
4. 返回成功訊息

**回應**：
```json
{
  "success": true,
  "message": "Device authorized successfully.",
  "error": null
}
```

**錯誤情況**：
- 未授權 → 401 Unauthorized
- 無效的使用者碼 → 404 Not Found
- 伺服器錯誤 → 400 Bad Request

**Inertia Props**（若有驗證 UI 頁面）：
```typescript
{
  csrfToken: string
  verificationUri?: string
  message?: string
  error?: string
}
```

---

### 3. POST /cli/token — 交換令牌

**路由**：`POST /cli/token` （無需認證）  
**責任**：CLI 客戶端輪詢此端點，用設備碼交換存取令牌

**請求體**：
```json
{
  "deviceCode": "550e8400-e29b-41d4-a716-446655440000"
}
```

**流程**：
1. 驗證設備碼格式
2. 查詢設備碼記錄：
   - 未找到 → 返回「設備碼無效」
   - 已過期 → 返回「設備碼已過期」（HTTP 410）
   - 仍為 PENDING（未授權）→ 返回「授權待決」（HTTP 428）
   - 已為 CONSUMED → 返回「設備碼已被使用」
3. 若狀態為 AUTHORIZED：
   - 生成 JWT access token（有效期 1 小時）
   - 生成 refresh token（有效期 7 天）
   - 標記設備碼為 CONSUMED
   - 返回令牌與使用者資訊
4. 若為其他狀態 → 返回錯誤

**回應**（成功）：
```json
{
  "success": true,
  "message": "Token exchange successful.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "role": "admin"
    }
  }
}
```

**回應**（授權待決，HTTP 428）：
```json
{
  "success": false,
  "message": "Authorization pending. Please authorize the device and try again.",
  "error": "authorization_pending"
}
```

**回應**（已過期，HTTP 410）：
```json
{
  "success": false,
  "message": "Device code has expired.",
  "error": "expired"
}
```

---

### 4. POST /cli/proxy — 代理 LLM 請求

**路由**：`POST /cli/proxy` （需認證）  
**責任**：代理 CLI 客戶端的 LLM 模型請求至 Gateway

**認證需求**：JWT Bearer token（使用者已登入）

**請求體**：
```json
{
  "model": "gpt-4",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "stream": false
}
```

**流程**：
1. 驗證認證令牌（從 AuthMiddleware 取得 userId）
2. 驗證請求體（model、messages 非空）
3. 呼叫 `ProxyCliRequestService.execute()`：
   - 記錄 API 金鑰使用量（optional）
   - 驗證使用者配額（optional）
   - 轉發請求至 LLM Gateway（ILLMGatewayClient）
   - 返回模型回應
4. 返回結果或錯誤

**回應**（成功）：
```json
{
  "success": true,
  "message": "Request proxied successfully.",
  "data": {
    "choices": [
      { "role": "assistant", "content": "Hello there!" }
    ]
  }
}
```

**錯誤情況**：
- 未授權 → 401 Unauthorized
- 無效的請求 → 422 Unprocessable Entity
- Gateway 錯誤 → 502 Bad Gateway

---

### 5. POST /cli/logout — 登出單一會話

**路由**：`POST /cli/logout` （需認證）  
**責任**：撤銷特定的 CLI 會話令牌

**認證需求**：JWT Bearer token

**請求體**：無

**流程**：
1. 從 Authorization Header 提取原始令牌
2. 計算令牌的 SHA-256 雜湊
3. 儲存令牌雜湊至黑名單（有效期與令牌相同，如 7 天）
4. 返回成功訊息

**回應**：
```json
{
  "success": true,
  "message": "Session logged out successfully."
}
```

**錯誤情況**：
- 未授權 → 401 Unauthorized
- 無法提取令牌 → 400 Bad Request

---

### 6. POST /cli/logout-all — 登出所有會話

**路由**：`POST /cli/logout-all` （需認證）  
**責任**：撤銷使用者的所有 CLI 會話

**認證需求**：JWT Bearer token

**請求體**：無

**流程**：
1. 從 AuthMiddleware 取得使用者 ID
2. 查詢該使用者的所有活躍會話（可選，可直接全局撤銷）
3. 撤銷所有會話令牌（儲存使用者 ID 至黑名單）
4. 返回成功訊息

**回應**：
```json
{
  "success": true,
  "message": "All sessions logged out successfully."
}
```

---

## Device Flow 架構設計

### OAuth 2.0 Device Authorization Grant 流程

```
┌─ CLI 客戶端               ┌─ 瀏覽器 / Web UI           ┌─ 後端服務
│                           │                             │
├─ POST /cli/device-code    │                             │
├──────────────────────────────────────────────────────→ │
│                           │                             │
│  ◄─ { deviceCode,         │                             │
│      userCode,            │                             │
│      verificationUri }    │                             │
│                           │                             │
├─ Poll: POST /cli/token    │                             │
├─ (with deviceCode)        │                             │
├──────────────────────────────────────────────────────→ │
│  ◄─ { error:              │                             │
│      "authorization_pending" } (HTTP 428)               │
│                           │                             │
│                           │ GET verificationUri         │
│                           │ + input userCode            │
│                           ├────────────────────────────→│
│                           │                             │
│                           │                             │
│                           │ POST /cli/authorize         │
│                           │ (with JWT + userCode)       │
│                           ├────────────────────────────→│
│                           │ ◄─ { success: true }       │
│                           │                             │
├─ Poll: POST /cli/token    │                             │
├──────────────────────────────────────────────────────→ │
│                           │                             │
│  ◄─ { accessToken,        │                             │
│      refreshToken,        │                             │
│      user: { ... } }      │                             │
│                           │                             │
├─ POST /cli/proxy          │                             │
├─ (with accessToken)       │                             │
├──────────────────────────────────────────────────────→ │
│                           │                             │
│  ◄─ { LLM response }      │                             │
│                           │                             │
└───────────────────────────┴─────────────────────────────┴─────
```

### 狀態轉換圖

```
PENDING ──(authorize)──→ AUTHORIZED ──(exchange)──→ CONSUMED
   │                          │                          │
   │◄─(polling timeout)       │◄─(polling timeout)      │
   └──────────(expired)───────┴──────────────────────────┘
```

### 新增服務與元件

#### DeviceCode（Domain Value Object）

**責任**：
- 表示一個設備授權請求
- 管理狀態轉換（PENDING → AUTHORIZED → CONSUMED）
- 檢查過期狀態

#### IDeviceCodeStore（Domain Port）

**責任**：
- 儲存和查詢設備碼
- 支援多種後端（Memory、Database、Redis）

**方法**：
```typescript
async save(deviceCode: DeviceCode): Promise<void>
async findByDeviceCode(deviceCode: string): Promise<DeviceCode | null>
async findByUserCode(userCode: string): Promise<DeviceCode | null>
async update(deviceCode: DeviceCode): Promise<void>
async delete(deviceCode: DeviceCode): Promise<void>
```

#### InitiateDeviceFlowService（Application Service）

**責任**：
- 生成設備碼和使用者碼
- 初始化設備流程狀態

#### AuthorizeDeviceService（Application Service）

**責任**：
- 驗證使用者碼
- 授權設備，記錄授權使用者的身份

#### ExchangeDeviceCodeService（Application Service）

**責任**：
- 驗證設備碼
- 交換為 JWT access token 和 refresh token
- 標記設備碼為已消費

#### RevokeCliSessionService（Application Service）

**責任**：
- 撤銷單一會話令牌
- 撤銷使用者的所有會話

---

## 檔案結構

```
src/Pages/
├── Auth/                          ← 新資料夾（若新增 UI 頁面）
│   ├── VerifyDevicePage.ts
│   └── ...
├── routing/
│   ├── registerPageRoutes.ts      ← 更新（若新增頁面）
│   └── ...existing...
└── ...existing...

src/Modules/CliApi/
├── Application/
│   ├── DTOs/
│   │   └── DeviceFlowDTO.ts
│   └── Services/
│       ├── InitiateDeviceFlowService.ts
│       ├── AuthorizeDeviceService.ts
│       ├── ExchangeDeviceCodeService.ts
│       ├── ProxyCliRequestService.ts
│       └── RevokeCliSessionService.ts
├── Domain/
│   ├── Ports/
│   │   └── IDeviceCodeStore.ts
│   └── ValueObjects/
│       └── DeviceCode.ts
├── Infrastructure/
│   ├── Providers/
│   │   └── CliApiServiceProvider.ts  ← 更新，註冊所有服務
│   └── Services/
│       └── MemoryDeviceCodeStore.ts
├── Presentation/
│   ├── Controllers/
│   │   └── CliApiController.ts    ← 實現 6 個方法
│   └── Routes/
│       └── cliApi.routes.ts       ← 定義 6 個端點
└── ...existing...
```

---

## 路由配置

### registerPageRoutes.ts（若有驗證 UI 頁面）

新增至 `CLI_PAGE_ROUTES`：

```typescript
const CLI_PAGE_ROUTES: readonly CliRouteDef[] = [
  { method: 'get', path: '/verify-device', page: CLI_PAGE_KEYS.verifyDevice, action: 'handle' },
  { method: 'post', path: '/verify-device', page: CLI_PAGE_KEYS.verifyDevice, action: 'authorize' },
]
```

### cliApi.routes.ts（API 端點）

```typescript
export function registerCliApiRoutes(router: IModuleRouter, controller: CliApiController): void {
  // 無需認證的端點
  router.post('/cli/device-code', [], (ctx) => controller.initiateDeviceFlow(ctx))
  router.post('/cli/token', [], (ctx) => controller.exchangeToken(ctx))

  // 需認證的端點
  router.post('/cli/authorize', [requireAuth()], (ctx) => controller.authorizeDevice(ctx))
  router.post('/cli/proxy', [requireAuth()], (ctx) => controller.proxyRequest(ctx))
  router.post('/cli/logout', [requireAuth()], (ctx) => controller.logout(ctx))
  router.post('/cli/logout-all', [requireAuth()], (ctx) => controller.logoutAll(ctx))
}
```

---

## 環境變數

新增至 `.env`：

```
# CLI Device Flow
DEVICE_CODE_TTL_SECONDS=600              # 10 minutes
CLI_POLLING_INTERVAL_SECONDS=5
VERIFICATION_URI=https://draupnir.local/verify-device
DEVICE_CODE_STORE_TYPE=memory            # 'memory' or 'redis' or 'database'

# JWT
JWT_ACCESS_TOKEN_TTL_SECONDS=3600        # 1 hour
JWT_REFRESH_TOKEN_TTL_SECONDS=604800     # 7 days
JWT_SECRET=your-secret-key

# Token Blacklist (Optional)
TOKEN_BLACKLIST_TTL_SECONDS=604800       # 7 days
TOKEN_BLACKLIST_STORE_TYPE=memory        # 'memory' or 'redis'
```

---

## 資料流

### Device Flow 完整流程

```
CLI 客戶端:
1. POST /cli/device-code
   ← { deviceCode, userCode, verificationUri, expiresIn, interval }

2. 開始輪詢 POST /cli/token { deviceCode }
   Loop:
     ← { error: "authorization_pending" } (HTTP 428) — 重試
     or
     ← { accessToken, refreshToken, user }

瀏覽器 / Web UI:
1. 訪問 verificationUri
   ← VerifyDevicePage（要求輸入 userCode）

2. 使用者輸入 userCode，按「授權」
   POST /verify-device { userCode }
   ← POST /cli/authorize (from page with JWT)
   ← { success: true }

CLI 客戶端:
3. 繼續輪詢，最終收到令牌
   ← { accessToken, refreshToken, user }

4. 使用 accessToken 發送請求
   POST /cli/proxy
   Authorization: Bearer {accessToken}
   ← { LLM response }

5. 登出
   POST /cli/logout
   Authorization: Bearer {accessToken}
   ← { success: true }
```

---

## 令牌管理

### Access Token（有效期 1 小時）

```typescript
{
  sub: userId,
  email: userEmail,
  role: userRole,
  iat: issuedAt,
  exp: expiresAt,
  type: 'access'
}
```

### Refresh Token（有效期 7 天）

```typescript
{
  sub: userId,
  iat: issuedAt,
  exp: expiresAt,
  type: 'refresh'
}
```

---

## 會話與令牌撤銷

### 令牌黑名單

當使用者登出時：
1. 提取並雜湊 access token
2. 將令牌雜湊存至黑名單（Memory / Redis / Database）
3. 設定過期時間（同令牌有效期）
4. 後續請求檢查黑名單

### 登出全部

當使用者執行登出全部時：
- 直接撤銷該使用者 ID 的所有 refresh token
- 所有後續 access token 刷新請求會失敗

---

## 錯誤處理

### Device Flow 錯誤

- 無效的使用者碼 → 404 Not Found
- 設備碼已過期 → 410 Gone
- 授權待決 → 428 Precondition Required
- 伺服器錯誤 → 500 Internal Server Error

### 令牌交換錯誤

- 無效的設備碼 → 400 Bad Request + `"invalid_device_code"`
- 已過期 → 410 Gone + `"expired"`
- 待決授權 → 428 Precondition Required + `"authorization_pending"`
- 已被使用 → 400 Bad Request + `"code_already_used"`

### 認證錯誤

- 無效或過期的令牌 → 401 Unauthorized
- 黑名單令牌 → 401 Unauthorized
- 缺少令牌 → 401 Unauthorized

---

## 測試策略

### 單元測試

- `InitiateDeviceFlowService.execute()` → 設備碼生成
- `AuthorizeDeviceService.execute()` → 各種授權失敗情況
- `ExchangeDeviceCodeService.execute()` → 狀態轉換、過期、待決
- `RevokeCliSessionService.execute()` → 令牌撤銷邏輯
- `DeviceCode` Value Object → 狀態驗證、過期檢查

### 整合測試

- 完整 Device Flow（碼生成 → 授權 → 令牌交換）
- 令牌交換重試邏輯（待決 → 授權 → 成功）
- 令牌過期檢查
- 已使用碼拒絕

### E2E 測試

- CLI 客戶端可以初始化 Device Flow
- 使用者可以在瀏覽器授權設備
- CLI 可以輪詢並收到令牌
- CLI 可以使用令牌代理 LLM 請求
- 登出功能正常運作

---

## 依賴與前置條件

### 已有（無需新增）

- `IJwtTokenService` — JWT 簽署與驗證
- `AuthMiddleware` — 令牌驗證
- `IHttpContext` — HTTP 請求/回應
- `IContainer` — 依賴注入

### 需要補全

- `IDeviceCodeStore` — 設備碼儲存介面
- `MemoryDeviceCodeStore` — 記憶體實現
- **令牌黑名單服務**（可選） — 撤銷令牌的儲存
- **VerifyDevicePage**（若需 Web UI） — 設備驗證頁面

---

## 設計考慮

### 安全性

1. **Device Code 生成**：使用 UUID（設備碼）+ 隨機英數字（使用者碼）
2. **User Code 簡短性**：8 字元，便於手工輸入
3. **過期管理**：設備碼 10 分鐘過期，access token 1 小時，refresh token 7 天
4. **令牌撤銷**：黑名單機制防止已登出的令牌被使用
5. **HTTPS 強制**：OAuth 流程必須在 HTTPS 下進行
6. **State 驗證**：Device Code 相當於 state，防止 CSRF

### 使用者體驗

1. **簡單的授權流程**：使用者碼只需 8 字元，易於輸入
2. **清晰的驗證 URI**：告知使用者在何處進行授權
3. **輪詢間隔**：5 秒一次，平衡實時性與伺服器負載
4. **無狀態 CLI**：無需儲存本地狀態，每次重新授權

### 性能

1. **非同步輪詢**：CLI 使用指數退避或固定間隔輪詢
2. **短期存儲**：設備碼 10 分鐘過期，減少記憶體佔用
3. **無資料庫依賴**（可選）：可用記憶體存儲，簡化部署

### 可擴展性

1. **多個存儲後端**：Memory、Redis、Database 可插拔
2. **令牌管理分離**：黑名單邏輯獨立，便於未來優化
3. **模塊化設計**：每個服務獨立，便於測試和擴展

---

## 後續步驟

完成此週期後，進入新的里程碑與階段，遵循相同流程：
1. 澄清需求
2. 提出設計
3. 編寫設計文檔
4. 建立實現計畫

---

*本文檔完成於 2026-04-11*
