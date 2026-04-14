# Draupnir v1 架構概覽與模組指南

> 完整的系統架構、模組劃分、依賴關係和開發指南。  
> 配置詳情見 `DESIGN_DECISIONS.md`，技術細節見 `.planning/codebase/` 目錄。

**文檔版本**: v1.4  
**更新日期**: 2026-04-13  
**專案**: Draupnir — 企業級 AI 服務管理平台（建構於 Bifrost 之上）

---

## 架構全景圖

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (Inertia.js + React)             │
│        (Admin Shell / Dev Portal / Member Portal)           │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/JSON
┌──────────────────────▼──────────────────────────────────────┐
│                   API Gateway (SdkApi / CliApi)              │
│         (認證代理、請求轉發、設備流、限流、餘額預檢)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│          Presentation Layer (Controllers & Routes)           │
│  ├─ Auth / Profile / Organization                            │
│  ├─ ApiKey / AppApiKey (應用級金鑰)                          │
│  ├─ Credit / Contract (合約與餘額)                           │
│  ├─ Alerts / Reports / Dashboard                             │
│  └─ AppModule / DevPortal / Health                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│        Application Layer (Services, DTOs & Ports)            │
│  ├─ Domain Event Dispatcher (跨模組通訊)                     │
│  ├─ Background Jobs (IScheduler / BackgroundService)         │
│  └─ Module Services (編排邏輯、外部 Client 包裝)             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│        Domain Layer (Aggregates, Events & Rules)             │
│  ├─ Auth/Profile: User, UserProfile, AuthToken               │
│  ├─ Organization: Organization, Member, Invitation           │
│  ├─ Billing: CreditAccount, Contract, AppModule              │
│  ├─ Alerts: AlertConfig, AlertEvent, WebhookEndpoint         │
│  └─ DevPortal: Application, WebhookConfig                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│        Infrastructure Layer (Repos & Adapters)               │
│  ├─ Repositories (Drizzle ORM + PostgreSQL)                  │
│  ├─ Bifrost Client (API 代理與同步)                          │
│  ├─ Mailer (Email 交付) / Webhook Dispatcher                 │
│  └─ PDF Generator (Chromium/Puppeteer)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│         Foundation Layer (共享基礎設施)                       │
│  ├─ Database (Drizzle ORM / PostgreSQL)                      │
│  ├─ Redis (Cache & Pub/Sub)                                  │
│  ├─ Security (JWT / HMAC / AES-256)                          │
│  └─ Monitoring (Health Checks / Logger)                      │
└──────────────────────────────────────────────────────────────┘
         ↓ 下游
   Bifrost AI Gateway
   (Virtual Key 管理、模型代理、用量統計)
```

---

## 核心模組詳解

### 1. Auth & Profile 模組（身分與檔案）

**職責**：認證、授權、用戶檔案、OAuth 集成。  
**關鍵項**：`User` (Auth) 與 `UserProfile` (Profile) 物理分離，通過 `userId` 關聯。

- **Auth**: 處理登錄、註冊、密碼重置、JWT 簽發及 Google OAuth。
- **Profile**: 管理用戶偏好（Timezone/Locale）、通知設置及多語言檔案。
- **CLI Auth**: 提供 `/cli-api/device/code` 端點支持設備碼流程（Device Flow）。

---

### 2. Organization 模組（多租戶管理）

**職責**：租戶隔離、成員邀請、RBAC 權限分配。  
**關鍵項**：`Organization` 聚合根控制所有資源的歸屬。

- **邀請流**: 生成加密 Token 發送郵件，支持受邀者註冊並自動加入組織。
- **Slug 支持**: 組織支持自定義 Slug，用於子域名或特定路由（Phase 03）。

---

### 3. Credit & Contract 模組（計費與協議）

**職責**：積分餘額管理、預付費/後付費合約、用量扣費。  
**關鍵項**：`CreditAccount` 處理實時餘額，`Contract` 處理服務等級協議 (SLA)。

- **Credit**: 支持 Top-up（充值）、Deduction（扣費）及餘額告警（Balance Low）。
- **Contract**: 維護有效期限、模型範圍及資源限制，支持自動續約與到期強制執行。

---

### 4. Alerts 模組（智能告警）

**職責**：跨模組預算監控、閾值觸發、多渠道通知。  
**關鍵項**：`AlertConfig` 聚合根定義監控邏輯。

- **評估流**: 監聽 `bifrost.sync.completed` 事件，通過 `EvaluateThresholdsService` 掃描組織用量。
- **通知管道**: 支持 `EmailAlertNotifier` 和 `WebhookAlertNotifier`（支持簽名驗證）。
- **預算隔離**: 支持按組織或按特定 API Key 設置月度預算門檻。

---

### 5. ApiKey & AppApiKey 模組（金鑰管理）

**職責**：用戶級金鑰與應用級金鑰管理。  
**關鍵項**：`ApiKey` 映射至 Bifrost 的 Virtual Keys。

- **ApiKey**: 用戶為日常使用生成的金鑰。
- **AppApiKey**: 專為開發者註冊的應用（App）生成的金鑰，支持 Scope 限制（如僅限 Chat 或 Embeddings）。

---

### 6. AppModule & DevPortal 模組（功能管理與門戶）

**職責**：模組訂閱、開發者自助服務。  
**關鍵項**：`AppModule` 定義系統功能單元及其計費屬性（Free/Paid）。

- **AppModule**: 控制組織是否可以使用特定功能（如「告警模組」、「高級報表」）。
- **DevPortal**: 允許開發者註冊應用、配置 Webhook Endpoint、查看 API 調用文檔。

---

### 7. Dashboard & Reports 模組（數據分析）

**職責**：實時指標聚合、PDF 報表調度。  
**關鍵項**：`Dashboard` 採用讀寫分離（CQRS 讀側），`Reports` 處理非同步長任務。

- **指標**: 模型消耗分佈、成本趨勢預測、KPI 匯總（Tokens/Tokens Per Second）。
- **Reports**: 通過 `IScheduler` 調度月度或週度報表，使用 `GeneratePdfService` 生成 PDF 並發送郵件。

---

### 8. SdkApi & CliApi 模組（訪問層代理）

**職責**：透明轉發請求至下游 Bifrost，執行准入檢查。  
**關鍵項**：高性能中間件。

- **檢查項**: 驗證 Key 有效性 -> 檢查組織狀態 -> 檢查模組訂閱 -> 檢查餘額/合約。
- **代理**: 請求成功後非同步投遞用量統計任務，確保主路徑延遲最低。

---

## 跨模組通訊

### 1. 同步依賴 (Ports)
Application 層定義 Port（接口），Infrastructure 層注入具體實現（如 `IAlertRecipientResolver` 調用 `AuthRepository`）。

### 2. 非同步通訊 (Events)
使用 `DomainEventDispatcher` 進行進程內通訊。例如：
- `UserRegisteredEvent` -> 自動創建默認組織。
- `BalanceDepleted` -> 觸發告警通知並使關聯 API Key 失效。
- `BifrostSyncCompleted` -> 觸發告警評估。

### 3. 統一調度 (IScheduler)
Phase 18 引入的 `IScheduler` 提供標準化的後台任務管理，確保報表、合約到期掃描等任務在分佈式環境下安全運行。

---

## 數據持久化規範

專案全面採用 **Drizzle ORM**。
- **Schema**: 集中定義於 `src/Foundation/Infrastructure/Database/schema.ts`。
- **Migrations**: 位於 `database/migrations/`，通過 `bun orbit` 或 `migrate.ts` 執行。
- **Repository**: 每個模組在 `Infrastructure/Repositories` 下實現對應的接口。

---

## 開發流程指引

### 新增功能模組的推薦路徑：
1. **Domain**: 定義核心邏輯、驗證規則和事件。
2. **Application**: 編寫 Service 處理業務流程，定義 DTO。
3. **Infrastructure**: 實現 Drizzle Repository 和外部服務 Adapter。
4. **Presentation**: 編寫 Controller 和路由，使用 `Inertia::render` 或 `Response::json`。
5. **ServiceProvider**: 在模組的 `Infrastructure/Providers` 下註冊 DI 綁定，並在 `AppModule` 中註冊模組信息。

---

**更多詳情請查閱** `.planning/codebase/` 下的各專題文檔。
