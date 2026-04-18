# 開發者 API 使用者故事（SdkApi + CliApi + DevPortal）

> 本文件對標代碼日期：2026-04-18（commit `b63e134`）。
> 若你看到的代碼與此文件明顯不一致，請提 issue 或直接 PR 修正。

## 範圍

- 本檔覆蓋：**SdkApi**（App-Key 代理）+ **CliApi**（CLI OAuth Device Flow + proxy）+ **DevPortal**（開發者入口）
- 共同特徵：都是**面向外部開發者 / 外部程式**的入口；底層 App-Key 的管理路徑另見 [3-api-keys/user-stories.md](../3-api-keys/user-stories.md) 的 AppApiKey 章節

## 相關 personas

閱讀前請先看 [../personas.md](../personas.md)：
- **SDK Client** — 外部程式 / CLI，拿 App-Key 打 proxy
- **Org Manager / Member** — 在 DevPortal 建 App、管理 App-Key 的人類開發者

---

## SdkApi

### US-SDK-001 | SDK Client 以 App-Key 打 Chat Completion

**As** an SDK Client (external program holding a valid App-Key)
**I want to** send a chat completion request through Draupnir's SDK endpoint in an OpenAI-compatible shape
**so that** I can call AI models without knowing Draupnir's internal routing or Bifrost specifics.

**Related**
- Module: `src/Modules/SdkApi`
- Entry: `ProxyModelCall.execute(auth, request)` → `src/Modules/SdkApi/Application/UseCases/ProxyModelCall.ts`
- Controller: `SdkApiController.chatCompletions()` → `src/Modules/SdkApi/Presentation/Controllers/SdkApiController.ts`
- Middleware: `AppAuthMiddleware` → `src/Modules/SdkApi/Infrastructure/Middleware/AppAuthMiddleware.ts`
- Route: `POST /sdk/v1/chat/completions`（`appAuthMiddleware`）

**Key rules**
- App-Key 經 `AuthenticateApp` use case 驗證：看 App-Key 是否存在、未 revoke、scope 是否允許 model 呼叫
- `scope=read` 的 App-Key 無法呼叫 model（回 `INSUFFICIENT_SCOPE`）
- 若 App-Key 有 `boundModuleIds`，必須包含 `ai_chat` module 才能呼叫 SDK chat endpoint；否則 `MODULE_NOT_ALLOWED`
- 實際 model call 會 forward 到 Bifrost gateway；本 proxy 主要處理認證、scope 檢查、header / body forwarding

---

### US-SDK-002 | SDK Client 查餘額 / 查使用量

**As** an SDK Client
**I want to** query the org's remaining credit balance and the App-Key's recent usage
**so that** my app can show meaningful errors (e.g. "low balance") or dashboards without hitting `/v1/organizations/...`.

**Related**
- Module: `src/Modules/SdkApi`
- Entries：
  - `QueryBalance.execute(auth)` → `src/Modules/SdkApi/Application/UseCases/QueryBalance.ts`
  - `QueryUsage.execute(auth)` → `src/Modules/SdkApi/Application/UseCases/QueryUsage.ts`
- Controller: `SdkApiController.getBalance()` / `getUsage()`
- Routes：`GET /sdk/v1/balance`、`GET /sdk/v1/usage`（皆 `appAuthMiddleware`）

**Key rules**
- 兩個端點皆需同樣的 App-Key 認證；balance / usage 僅回所屬 org 範疇
- Balance 底層借 Credit 模組的 `GetBalanceService`；Usage 底層借 AppApiKey 的 `GetAppKeyUsageService`
- 回傳 shape 刻意簡化成 SDK-friendly（非完整 REST payload），減少 client 處理負擔

---

## CliApi

### US-CLI-001 | CLI Client OAuth Device Flow 登入

**As** a CLI user (running Claude Code / Codex / custom CLI)
**I want to** run a command that pairs my CLI with my Draupnir account via OAuth Device Flow
**so that** I don't need to paste long-lived tokens into the CLI, and the CLI can use my user identity.

**Related**
- Module: `src/Modules/CliApi`
- Entries：
  - `InitiateDeviceFlowService.execute()` → `src/Modules/CliApi/Application/Services/InitiateDeviceFlowService.ts`（生 device_code / user_code）
  - `AuthorizeDeviceService.execute()` → 同目錄（使用者在瀏覽器按「授權」）
  - `ExchangeDeviceCodeService.execute()` → 同目錄（CLI 用 device_code 換 access token）
- Controller: `CliApiController.initiateDeviceFlow()` / `authorizeDevice()` / `exchangeToken()`
- Routes：
  - `POST /cli/device-code`（**無 auth**——這是流程起點）
  - `POST /cli/authorize`（`requireAuth`——使用者須已登入 web portal）
  - `POST /cli/token`（**無 auth**——以 device_code 換 token）
- Verify Device Page：瀏覽器端由 `VerifyDevicePage` 呈現，使用者輸入 `user_code` 並確認

**Key rules**
- Device flow 分三步：CLI 產生 code → 使用者在瀏覽器輸入 user_code 並授權 → CLI 以 device_code polling 交換 access token
- `user_code` 短碼（人類 friendly）；`device_code` 長碼（CLI 保存）；兩者都有 TTL
- 使用者授權前交換 token 回 `authorization_pending`；授權後回 access token
- 此 flow 讓 CLI 取得的 token 與 Web 端登入取得的等效——可打所有需 `requireAuth` 的 API

---

### US-CLI-002 | CLI Client 透過 Proxy 呼叫 Bifrost

**As** an authenticated CLI user
**I want to** send a proxy request through `/cli/proxy` that forwards to Bifrost
**so that** Claude Code / Codex can use Draupnir as their gateway and inherit rate limits, usage tracking, and cost accounting.

**Related**
- Module: `src/Modules/CliApi`
- Entry: `ProxyCliRequestService.execute()` → `src/Modules/CliApi/Application/Services/ProxyCliRequestService.ts`
- Controller: `CliApiController.proxyRequest()`
- Route: `POST /cli/proxy`（`requireAuth`）

**Key rules**
- Proxy 請求帶著使用者身份（非 App-Key），用於 per-user 的 CLI 流量——與 SdkApi 的 App-Key 模型互補
- 轉發的 request / response 由 Bifrost 處理；本 service 負責 attach 使用者身份、記錄 usage、扣額度
- 若使用者沒有 active org membership 或 org 無可用 credit，回錯誤讓 CLI 明確提示

---

### US-CLI-003 | CLI Client 登出（單裝置 / 全部裝置）

**As** a CLI user
**I want to** sign out of the current CLI device or sign out of every CLI session linked to my account
**so that** I can rotate credentials when a laptop is lost or retire an old workstation.

**Related**
- Module: `src/Modules/CliApi`
- Entry: `RevokeCliSessionService.execute(...)` → `src/Modules/CliApi/Application/Services/RevokeCliSessionService.ts`（同 service 支援單裝置與批次）
- Controller: `CliApiController.logout()` / `logoutAll()`
- Routes：`POST /cli/logout`、`POST /cli/logout-all`（皆 `requireAuth`）

**Key rules**
- `logout`：撤銷當前 CLI session（僅該台裝置）
- `logoutAll`：撤銷該使用者所有 CLI sessions（包括其他裝置）
- 撤銷是單向、不可逆；撤銷後該 device_code / token 再請求立即 401

---

## DevPortal

### US-DEV-001 | Developer 在 DevPortal 註冊 / 列出 Application

**As** an Org Manager / Member (developer)
**I want to** register my team's applications in the DevPortal and see the list of our apps
**so that** each app has its own identity and key set, and we can manage them independently.

**Related**
- Module: `src/Modules/DevPortal`
- Entries：
  - `RegisterAppService.execute()` → `src/Modules/DevPortal/Application/Services/RegisterAppService.ts`
  - `ListAppsService.execute()` → 同目錄
- Controller: `DevPortalController.registerApp()` / `listApps()`
- Routes：`POST /api/dev-portal/apps`、`GET /api/dev-portal/apps`（皆 `requireAuth`）

**Key rules**
- App 歸屬於 org；註冊時自動帶 `orgId` 來自登入使用者的 membership
- 列出只回呼叫者所屬 org 的 app
- App 本身沒有 secret；實際的 secret 綁在 App-Key 上（見 US-DEV-002）

---

### US-DEV-002 | Developer 管理 App 的 App-Keys（Issue / List / Revoke）

**As** an Org Manager / Member
**I want to** issue new App-Keys for a specific app, list them, and revoke ones I no longer need
**so that** each app and environment (staging, prod) can have its own key with independent lifecycle.

**Related**
- Module: `src/Modules/DevPortal`
- Entry: `ManageAppKeysService`（三個子操作）→ `src/Modules/DevPortal/Application/Services/ManageAppKeysService.ts`
- Controller: `DevPortalController.issueKey()` / `listKeys()` / `revokeKey()`
- Routes：
  - `POST /api/dev-portal/apps/:appId/keys`（issue）
  - `GET /api/dev-portal/apps/:appId/keys`（list）
  - `POST /api/dev-portal/apps/:appId/keys/:keyId/revoke`（revoke）
- 底層：同 AppApiKey 模組（見 [US-APPKEY-001/002](../3-api-keys/user-stories.md#us-appkey-001-org-成員發--列-app-key)）；DevPortal 是「圍繞 app 的視圖」，AppApiKey 是「org 全局的 key 管理」

**Key rules**
- Key 只有在 issue 當下回一次明文；之後只存 hash
- 任何 org member 皆可 issue / revoke（同 AppApiKey 的 permissive authz）
- DevPortal 的 key 列表會按 `appId` 過濾，與 `/api/organizations/:orgId/app-keys` 的「全 org 視角」不同

---

### US-DEV-003 | Developer 設定 App Webhook + 讀取 API 文件

**As** an Org Manager / Member
**I want to** configure a webhook URL for an app (where Draupnir sends events) and read the public API documentation
**so that** my app can receive async events and I have a single reference for how to integrate.

**Related**
- Module: `src/Modules/DevPortal`
- Entries：
  - `ConfigureWebhookService.execute()` → `src/Modules/DevPortal/Application/Services/ConfigureWebhookService.ts`
  - `GetApiDocsService.execute()` → 同目錄
- Controller: `DevPortalController.configureWebhook()` / `getApiDocs()`
- Routes：
  - `PUT /api/dev-portal/apps/:appId/webhook`（`requireAuth`）
  - `GET /api/dev-portal/docs`（**公開**——沒有 auth middleware）

**Key rules**
- Webhook URL 儲存在 app 層，每個 app 一個 URL（要多 URL 請用 Alerts 模組的 WebhookEndpoints，見 [US-ALERTS-002](../4-credit-billing/user-stories.md#us-alerts-002-manager-管理-webhook-endpointscrud--rotate-secret)）
- API docs 公開給任何人看，不洩漏 org-specific 資料
- Webhook 設定沒有獨立 secret rotate API；必要時刪舊 app 重建

---

## Coverage map

### SdkApi 模組 Application UseCases

| UseCase | Story ID | 備註 |
|---|---|---|
| `AuthenticateApp.execute` | US-SDK-001, US-SDK-002 | 被 `AppAuthMiddleware` 呼叫 |
| `ProxyModelCall.execute` | US-SDK-001 | 轉發 chat completions |
| `QueryBalance.execute` | US-SDK-002 | 讀餘額 |
| `QueryUsage.execute` | US-SDK-002 | 讀使用量 |

### CliApi 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `InitiateDeviceFlowService.execute` | US-CLI-001 | Device Flow 起點 |
| `AuthorizeDeviceService.execute` | US-CLI-001 | 瀏覽器授權 |
| `ExchangeDeviceCodeService.execute` | US-CLI-001 | Polling 換 token |
| `ProxyCliRequestService.execute` | US-CLI-002 | CLI 代理 |
| `RevokeCliSessionService.execute` | US-CLI-003 | Logout / Logout-all |

### DevPortal 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `RegisterAppService.execute` | US-DEV-001 | 註冊 app |
| `ListAppsService.execute` | US-DEV-001 | 列 app |
| `ManageAppKeysService.*` | US-DEV-002 | Issue / List / Revoke |
| `ConfigureWebhookService.execute` | US-DEV-003 | 設 webhook |
| `GetApiDocsService.execute` | US-DEV-003 | 讀 API 文件（公開）|

### Presentation 入口

| Entry | Story ID | 備註 |
|---|---|---|
| `SdkApiController.chatCompletions` | US-SDK-001 | SDK |
| `SdkApiController.getUsage` | US-SDK-002 | SDK |
| `SdkApiController.getBalance` | US-SDK-002 | SDK |
| `CliApiController.initiateDeviceFlow` | US-CLI-001 | CLI |
| `CliApiController.authorizeDevice` | US-CLI-001 | CLI |
| `CliApiController.exchangeToken` | US-CLI-001 | CLI |
| `CliApiController.proxyRequest` | US-CLI-002 | CLI |
| `CliApiController.logout` | US-CLI-003 | CLI |
| `CliApiController.logoutAll` | US-CLI-003 | CLI |
| `DevPortalController.registerApp` | US-DEV-001 | DevPortal |
| `DevPortalController.listApps` | US-DEV-001 | DevPortal |
| `DevPortalController.issueKey` | US-DEV-002 | DevPortal |
| `DevPortalController.listKeys` | US-DEV-002 | DevPortal |
| `DevPortalController.revokeKey` | US-DEV-002 | DevPortal |
| `DevPortalController.configureWebhook` | US-DEV-003 | DevPortal |
| `DevPortalController.getApiDocs` | US-DEV-003 | DevPortal（public）|
| `AppAuthMiddleware` | US-SDK-001 | SDK auth 閘門 |
| `VerifyDevicePage`（Website） | US-CLI-001 | 瀏覽器端授權 UI（Auth 模組的 Verify Device Page） |

### 已知覆蓋缺口

- **SdkApi 的 streaming / SSE 支援**：目前 `ProxyModelCall` 主要處理完整回應；若要支援 streaming chat completions，需要後續 story 描述
- **CLI Token Expiry / Refresh**：目前 Device Flow 換到的 token 生命週期延續 Auth 模組的 access / refresh token 機制，沒有 CLI 專屬 refresh 路徑，依賴 `POST /api/auth/refresh`
- **DevPortal 的 App 生命週期（rename / transfer / delete）**：v1 只支援 register / list，不提供 rename、跨 org transfer、delete；若補上需新 story
- **GetApiDocs 的版本控制**：目前單一 endpoint 回當前 API 文件；若之後需要版本化 API，需要額外 story 定義 `/docs/v1` 這類 path
