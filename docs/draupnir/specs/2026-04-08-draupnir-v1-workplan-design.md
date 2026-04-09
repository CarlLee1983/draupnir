# Draupnir v1 Work Plan Design

> AI 服務管理平台完整工作計劃，建構於 Bifrost AI Gateway 之上

## 概述

**專案：** Draupnir — Bifrost 的上層管理平台
**技術棧：** Gravito DDD | Bun | Drizzle ORM | JWT | Inertia.js + React
**策略：** 嚴格瀑布式，Phase 內並行分工
**團隊：** 較大團隊協作
**時程壓力：** 無，品質優先
**前端策略：** 後端 API 全部完成後再做前端（Phase 7）

---

## 整體架構

### 執行策略

Phase 1→2→3→4→5→6→7 嚴格按序，每個 Phase 完成並通過 Phase Gate 後才進下一個。每個 Phase 內部拆分為可並行的工作包分配給不同成員。

### 每個 Phase 的標準流程

1. **設計** — Domain Model、API Contract、資料庫 Schema
2. **實作** — TDD（紅→綠→重構），DDD 分層實作
3. **整合測試** — 跨模組整合驗證
4. **Code Review + 文件** — PR Review、API 文件更新
5. **Phase Gate** — 團隊確認品質達標才進下一個 Phase

### Phase 間交付物

- 通過的測試套件（≥ 80% 覆蓋率）
- API 文件（OpenAPI spec）
- 模組使用範例

---

## Phase 1：Foundation — 基礎建設

**目標：** 專案初始化、核心基礎模組建立

### 1.1 專案初始化

| 工作項 | 說明 | 建議負責 |
|--------|------|----------|
| 專案骨架 | 從 gravito-ddd-starter clone，調整為 Draupnir 結構 | Tech Lead |
| 開發環境 | Bun + TypeScript + ESLint + Prettier 配置 | Tech Lead |
| 環境變數 | `.env.example`：`BIFROST_API_URL`、`BIFROST_MASTER_KEY`、`JWT_SECRET`、`DATABASE_URL` | Tech Lead |
| CI/CD | GitHub Actions — lint → test → build，PR 必過 Gate | DevOps / Tech Lead |
| Git 規範 | 分支策略（`main` / `develop` / `feature/*`）、commit format、PR template | 全員共識 |
| 共用基礎 | `ApiResponse<T>` 標準回應格式、共用 Error Code 列舉、分頁介面 | Tech Lead |

**分支策略：** Git Flow 簡化版 — `main`（生產）、`develop`（開發）、`feature/*`（功能分支），每個 PR 至少一人 Review。

### 1.2 Bifrost Client 模組

```
app/Foundation/Infrastructure/Services/BifrostClient/
├── BifrostClient.ts
├── BifrostClientConfig.ts
├── types/
│   ├── VirtualKey.ts
│   ├── Usage.ts
│   └── Model.ts
├── errors/
│   └── BifrostApiError.ts
└── __tests__/
    └── BifrostClient.test.ts
```

**封裝的核心 API：**

| Bifrost API | 封裝方法 | 用途 |
|-------------|----------|------|
| Virtual Key CRUD | `createVirtualKey()` / `listVirtualKeys()` / `deleteVirtualKey()` | Phase 3 ApiKey 模組 |
| 用量查詢 | `getUsageLogs()` / `getUsageSummary()` | Phase 4 UsageSync |
| 模型列表 | `listModels()` | Phase 3 Key 權限設定 |
| Rate Limit | `updateRateLimit()` | Phase 4 餘額阻擋 |

**錯誤處理策略：**
- 網路錯誤：指數退避重試（最多 3 次，含 jitter）
- 429 錯誤：可重試，依 `Retry-After` Header 或指數退避（屬 4xx 但為暫時性限流）
- 其他 4xx 錯誤：不重試，屬終端錯誤（驗證失敗、認證錯誤等），轉為 `BifrostApiError` 拋出
- 5xx 錯誤：指數退避重試
- 所有錯誤帶 request context（endpoint、params）

### Phase 1 完成標準

#### 驗收條件

- [x] 啟動驗收：`bun run dev` 可正常啟動，且 `Health` 與基礎路由可回應
- [x] 品質驗收：`bun run typecheck`、`bun run lint`、`bun run build` 全部通過
- [x] 測試驗收：`bun test` 全部通過，整體覆蓋率 ≥ 80%
- [x] BifrostClient 驗收：核心能力皆有單元測試，包含：
  - [x] `createVirtualKey()`
  - [x] `listVirtualKeys()`
  - [x] `deleteVirtualKey()`
  - [x] `getUsageLogs()`
  - [x] `getUsageSummary()`
  - [x] `listModels()`
  - [x] `updateRateLimit()`
  - [x] retry / error handling 行為
- [x] 基礎建設驗收：Foundation service / provider 已完成註冊，且 `BifrostClient` 可透過容器注入使用
- [x] 環境驗收：`.env.example` 已完整列出啟動與 Bifrost 連線所需變數
- [ ] CI 驗收：Pipeline 綠燈，且至少包含 lint → test → build
- [ ] 協作驗收：團隊完成 Code Review，並對 DDD 分層與 Foundation / Modules 邊界達成共識

---

## Phase 2：Identity — 認證與帳戶

**目標：** 完整的使用者身份管理系統，三個模組可並行開發

### 2.1 Auth 模組

```
app/Modules/Auth/
├── Domain/
│   ├── Entities/AuthToken.ts
│   ├── ValueObjects/Email.ts, HashedPassword.ts, TokenPair.ts
│   └── Ports/IAuthRepository.ts, IPasswordHasher.ts
├── Application/
│   ├── UseCases/Register.ts, Login.ts, Logout.ts, RefreshToken.ts, ResetPassword.ts
│   └── DTOs/RegisterDto.ts, LoginDto.ts
├── Infrastructure/
│   ├── Repositories/AuthRepository.ts
│   ├── Services/BcryptPasswordHasher.ts, JwtTokenService.ts
│   └── Migrations/
└── Presentation/
    ├── Controllers/AuthController.ts
    ├── Routes/authRoutes.ts
    └── Validators/registerValidator.ts, loginValidator.ts
```

**認證流程：**
- 註冊：Email + Password → 驗證 → 建立 User + 發 JWT
- 登入：Email + Password → 驗證 → 回傳 `{ accessToken, refreshToken }`
- Access Token 短效（15min），Refresh Token 長效（7d）
- 密碼重設：Email → 發送重設連結 → Token 驗證 → 更新密碼

**RBAC：**
- 三個角色：`admin`、`manager`、`member`
- 角色存在 User Entity 上
- Middleware 層做權限檢查：`requireRole('admin')`

### 2.2 User 模組

```
app/Modules/User/
├── Domain/
│   ├── Entities/User.ts
│   ├── ValueObjects/UserId.ts, DisplayName.ts, UserStatus.ts
│   └── Ports/IUserRepository.ts
├── Application/
│   ├── UseCases/GetProfile.ts, UpdateProfile.ts, ListUsers.ts, ToggleUserStatus.ts
│   └── DTOs/UpdateProfileDto.ts
├── Infrastructure/
│   └── Repositories/UserRepository.ts
└── Presentation/
    ├── Controllers/UserController.ts
    └── Routes/userRoutes.ts
```

**關鍵點：**
- Auth 負責「認證」，User 負責「Profile 資料」
- Auth 建立帳號時透過 Domain Event `UserRegistered` 通知 User 模組建立 Profile
- 管理員可列表、停用使用者；一般使用者只能改自己的 Profile

### 2.3 Organization 模組

```
app/Modules/Organization/
├── Domain/
│   ├── Entities/Organization.ts, Membership.ts
│   ├── ValueObjects/OrgId.ts, OrgRole.ts, InviteToken.ts
│   └── Ports/IOrganizationRepository.ts, IMembershipRepository.ts
├── Application/
│   ├── UseCases/CreateOrg.ts, InviteMember.ts, RemoveMember.ts, AssignOrgRole.ts, SwitchOrg.ts
│   └── DTOs/CreateOrgDto.ts, InviteMemberDto.ts
├── Infrastructure/
│   └── Repositories/OrganizationRepository.ts, MembershipRepository.ts
└── Presentation/
    ├── Controllers/OrganizationController.ts
    └── Routes/orgRoutes.ts
```

**多租戶設計：**
- User 可屬於多個 Organization
- 每個請求帶 `X-Organization-Id` Header 標示意圖切換的組織
- Middleware 必須驗證當前已認證用戶確實為該 Organization 的成員（查詢 Membership），驗證失敗回傳 403
- 驗證通過後才注入 `currentOrg` 到 request context
- 禁止僅信任 Header 值 — 組織 context 必須經過伺服器端成員資格檢查
- Organization 層級角色（`owner`、`admin`、`member`）獨立於系統角色

**模組間通訊：**

```
Auth ──(Domain Event: UserRegistered)──→ User（建立 Profile）
Organization ──(依賴)──→ User（查詢成員資訊）
Auth Middleware ──(依賴)──→ Organization（解析當前組織 context）
```

### Phase 2 並行分工

- 成員 A：Auth 模組（最核心，經驗最豐富的人）
- 成員 B：User 模組（相對獨立，適合熟悉框架）
- 成員 C：Organization 模組（最複雜的資料關聯）
- Auth 先完成基本註冊/登入後，其他兩個模組才能做整合測試

### Phase 2 完成標準

- [ ] 註冊、登入、登出、Token 刷新全流程可用
- [ ] RBAC 權限檢查 Middleware 正常運作
- [ ] 多租戶 Organization 切換正常
- [ ] 所有 API 有 Zod 輸入驗證
- [ ] 測試覆蓋率 ≥ 80%
- [ ] API 文件（OpenAPI）更新

---

## Phase 3：Key Management — API Key 管理

**目標：** 使用者透過 Draupnir 管理 API Key，每個 Key 對應一個 Bifrost Virtual Key

### 3.1 ApiKey 模組

```
app/Modules/ApiKey/
├── Domain/
│   ├── Entities/ApiKey.ts
│   ├── ValueObjects/ApiKeyId.ts, KeyHash.ts, KeyLabel.ts, KeyStatus.ts, KeyScope.ts
│   ├── Ports/IApiKeyRepository.ts
│   └── Events/ApiKeyCreated.ts, ApiKeyRevoked.ts
├── Application/
│   ├── UseCases/CreateApiKey.ts, ListApiKeys.ts, RevokeApiKey.ts, UpdateKeyLabel.ts, SetKeyPermissions.ts, GetKeyUsage.ts
│   └── DTOs/CreateApiKeyDto.ts, KeyPermissionsDto.ts
├── Infrastructure/
│   ├── Repositories/ApiKeyRepository.ts
│   └── Services/ApiKeyBifrostSync.ts
└── Presentation/
    ├── Controllers/ApiKeyController.ts
    └── Routes/apiKeyRoutes.ts
```

**核心流程 — 建立 API Key：**

```
用戶請求建立 Key
  → 驗證權限（已登入、屬於指定 Org）
  → 呼叫 BifrostClient.createVirtualKey() 建立 Virtual Key
  → 產生 Draupnir API Key（drp_sk_xxxx）
  → 儲存映射關係（Draupnir Key ↔ Bifrost Virtual Key ID）
  → 回傳完整 Key（僅此一次顯示）
```

**Key 與 Bifrost Virtual Key 映射：**
- Draupnir 儲存：`apiKeyHash`、`bifrostVirtualKeyId`、`userId`、`orgId`
- 原始 Key 不落庫，只存 hash
- 刪除/停用時同步操作 Bifrost Virtual Key

**Key 權限設定：**
- 可用模型白名單（從 `BifrostClient.listModels()` 取得可選項）
- 速率限制（RPM / TPM）→ 同步至 Bifrost Virtual Key 設定
- 到期日（可選）

### 3.2 Dashboard 資料聚合

```
app/Modules/Dashboard/
├── Application/
│   ├── UseCases/GetUserDashboard.ts, GetUsageChart.ts, GetCostSummary.ts
│   └── DTOs/UsageChartQuery.ts
├── Infrastructure/
│   └── Services/UsageAggregator.ts
└── Presentation/
    ├── Controllers/DashboardController.ts
    └── Routes/dashboardRoutes.ts
```

**Dashboard API：**

| API | 回傳 | 資料來源 |
|-----|------|----------|
| `GET /dashboard` | Key 總數、活躍 Key 數、總用量、Credit 餘額 | 本地 DB + Bifrost |
| `GET /dashboard/usage` | 用量時序資料（可依時間/模型/Provider 分組） | Bifrost Usage Logs |
| `GET /dashboard/cost` | 費用摘要（本期、上期、趨勢） | 本地計算 |

Dashboard 在 Phase 3 先做用量部分（從 Bifrost 即時拉取），Phase 4 Credit 完成後再補上費用相關欄位。

### Phase 3 並行分工

- 成員 A/B：ApiKey 模組（核心 CRUD + Bifrost 同步）
- 成員 C：Dashboard 聚合（可以用 mock 資料先做，等 ApiKey 完成再串接）

### Phase 3 完成標準

- [ ] API Key 完整生命週期：建立 → 使用 → 停用 → 刪除
- [ ] Draupnir Key 與 Bifrost Virtual Key 正確同步
- [ ] Key 權限設定可限制模型與速率
- [ ] Dashboard API 回傳正確的用量聚合資料
- [ ] 測試覆蓋率 ≥ 80%

---

## Phase 4：Credit System — 額度與計費

**目標：** Credit 儲值、扣款、餘額管理，以及從 Bifrost 同步用量並轉換為 Credit 消耗

### 4.1 Credit 模組

```
app/Modules/Credit/
├── Domain/
│   ├── Entities/CreditAccount.ts, CreditTransaction.ts
│   ├── ValueObjects/
│   │   ├── CreditAccountId.ts, Balance.ts
│   │   └── TransactionType.ts   # TOPUP | DEDUCTION | REFUND | EXPIRY | ADJUSTMENT
│   ├── Ports/ICreditAccountRepository.ts, ICreditTransactionRepository.ts
│   ├── Events/BalanceLow.ts, BalanceDepleted.ts, CreditToppedUp.ts
│   └── DomainServices/CreditDeductionService.ts
├── Application/
│   ├── UseCases/
│   │   ├── TopUpCredit.ts, DeductCredit.ts, RefundCredit.ts
│   │   ├── GetBalance.ts, GetTransactionHistory.ts
│   │   └── HandleBalanceDepleted.ts
│   └── DTOs/TopUpDto.ts, DeductDto.ts
├── Infrastructure/
│   ├── Repositories/CreditAccountRepository.ts, CreditTransactionRepository.ts
│   └── Services/BifrostKeyBlocker.ts
└── Presentation/
    ├── Controllers/CreditController.ts
    └── Routes/creditRoutes.ts
```

**Credit 帳戶模型：**
- 每個 Organization 一個 CreditAccount（個人用戶視為單人 Org）
- Balance 為 Value Object，禁止直接修改，必須透過 Transaction 異動
- 所有異動都是 append-only 的 CreditTransaction 紀錄

**餘額不足阻擋流程：**

```
BalanceDepleted Event 觸發
  → HandleBalanceDepleted UseCase
  → 查詢該帳戶所有活躍 API Keys
  → 對每個 Key 呼叫 BifrostClient.updateRateLimit(0)
  → 標記 Keys 狀態為 SUSPENDED_NO_CREDIT

充值後：
  CreditToppedUp Event 觸發
  → 查詢所有 SUSPENDED_NO_CREDIT 的 Keys
  → 恢復 Bifrost Rate Limit
  → 標記 Keys 狀態恢復為 ACTIVE
```

### 4.2 UsageSync 模組

```
app/Modules/UsageSync/
├── Domain/
│   ├── Entities/UsageRecord.ts, SyncCursor.ts
│   ├── ValueObjects/UsageAmount.ts, PricingTier.ts
│   ├── Ports/IUsageRecordRepository.ts, ISyncCursorRepository.ts
│   └── DomainServices/UsagePricingCalculator.ts
├── Application/
│   ├── UseCases/
│   │   ├── SyncBifrostUsage.ts
│   │   ├── DetectUsageAnomaly.ts
│   │   └── GetSyncStatus.ts
│   └── DTOs/PricingRuleDto.ts
├── Infrastructure/
│   ├── Repositories/UsageRecordRepository.ts, SyncCursorRepository.ts
│   ├── Services/BifrostUsageFetcher.ts
│   └── Jobs/UsageSyncJob.ts
└── Presentation/
    ├── Controllers/UsageSyncController.ts
    └── Routes/usageSyncRoutes.ts
```

**同步機制：**
- Cron Job 每 5 分鐘執行一次，使用分散式鎖（Redis）防止並行重疊執行
- 使用 `SyncCursor` 記錄上次同步位置（避免重複處理）
- 每筆 Bifrost Usage Log 以 `bifrostLogId` 作為冪等鍵（idempotency key），重複處理時自動跳過
- 同步流程在單一資料庫交易內完成：寫入 `UsageRecord` + 呼叫 `DeductCredit` + 推進 `SyncCursor`，任一步驟失敗則整體 rollback
- 流程：拉取 Bifrost Usage Logs → 過濾已處理（依冪等鍵）→ 在交易中批次寫入 UsageRecord + 計算扣款 + 推進 Cursor

**定價規則：**

```typescript
interface PricingRule {
  modelPattern: string       // e.g. "gpt-4*", "claude-3*"
  inputTokenPrice: number    // Credit per 1K tokens
  outputTokenPrice: number
  imagePrice?: number        // per image
  audioPrice?: number        // per minute
}
```

**異常偵測：**
- 與前一個同步週期比較，用量突增超過 3x 時發出 `UsageAnomalyDetected` Event
- 管理員收到通知，可手動暫停相關 Key

### Phase 4 並行分工

- 成員 A：Credit 模組（帳戶、Transaction、餘額阻擋）
- 成員 B：UsageSync 同步與定價計算
- 成員 C：異常偵測 + Dashboard 費用欄位補完

### Phase 4 完成標準

- [ ] Credit 充值、扣款、退款流程正確
- [ ] 餘額不足時自動阻擋 Bifrost Key，充值後自動恢復
- [ ] 用量同步 Cron Job 穩定運行
- [ ] 定價規則可配置，計算結果正確
- [ ] 用量異常偵測可觸發告警
- [ ] 測試覆蓋率 ≥ 80%

---

## Phase 5：Contract & Module — 合約與模組管理

**目標：** 管理者透過合約控制帳戶的可用功能模組

### 5.1 Contract 模組

```
app/Modules/Contract/
├── Domain/
│   ├── Entities/Contract.ts, ContractTerm.ts
│   ├── ValueObjects/
│   │   ├── ContractId.ts, ContractStatus.ts   # DRAFT | ACTIVE | EXPIRED | TERMINATED
│   │   ├── ValidityPeriod.ts
│   │   └── ContractTarget.ts                  # Organization | User
│   ├── Ports/IContractRepository.ts
│   ├── Events/ContractActivated.ts, ContractExpiring.ts, ContractExpired.ts
│   └── DomainServices/ContractEnforcementService.ts
├── Application/
│   ├── UseCases/
│   │   ├── CreateContract.ts, UpdateContract.ts, ActivateContract.ts
│   │   ├── AssignContract.ts
│   │   ├── RenewContract.ts
│   │   ├── HandleContractExpiry.ts
│   │   └── ListContracts.ts, GetContractDetail.ts
│   └── DTOs/CreateContractDto.ts, ContractTermDto.ts
├── Infrastructure/
│   ├── Repositories/ContractRepository.ts
│   └── Jobs/ContractExpiryCheckJob.ts
└── Presentation/
    ├── Controllers/ContractController.ts
    └── Routes/contractRoutes.ts
```

**合約條款（ContractTerm）：**

```typescript
interface ContractTerm {
  creditQuota: number
  allowedModules: string[]
  rateLimit: {
    rpm: number
    tpm: number
  }
  validityPeriod: {
    startDate: Date
    endDate: Date
  }
}
```

**合約生命週期：**

```
DRAFT → (ActivateContract) → ACTIVE → (到期) → EXPIRED
                                ↓
                          (提前終止) → TERMINATED
                                ↓
                          (續約) → 新 ACTIVE Contract
```

**到期處理：**
- 每日 Cron Job 檢查即將到期合約
- 到期前 7 天：`ContractExpiring` Event → 通知管理者與使用者
- 到期日：`ContractExpired` Event → 停用合約關聯的模組存取權限（不自動停用 Key）

### 5.2 AppModule 模組

```
app/Modules/AppModule/
├── Domain/
│   ├── Entities/AppModule.ts, ModuleSubscription.ts
│   ├── ValueObjects/
│   │   ├── ModuleId.ts, ModuleType.ts    # FREE | PAID
│   │   └── SubscriptionStatus.ts         # ACTIVE | SUSPENDED | CANCELLED
│   ├── Ports/IAppModuleRepository.ts, IModuleSubscriptionRepository.ts
│   └── Events/ModuleSubscribed.ts, ModuleAccessRevoked.ts
├── Application/
│   ├── UseCases/
│   │   ├── RegisterModule.ts
│   │   ├── SubscribeModule.ts
│   │   ├── CheckModuleAccess.ts
│   │   ├── TrackModuleUsage.ts
│   │   └── ListModules.ts, GetModuleDetail.ts
│   └── DTOs/RegisterModuleDto.ts
├── Infrastructure/
│   ├── Repositories/AppModuleRepository.ts, ModuleSubscriptionRepository.ts
│   └── Middleware/ModuleAccessMiddleware.ts
└── Presentation/
    ├── Controllers/AppModuleController.ts
    └── Routes/appModuleRoutes.ts
```

**模組存取權限檢查（Middleware）：**

```
Request 進入
  → 解析 API Key 或 JWT
  → 從 Key/User 取得關聯的 Org
  → 查詢 Org 的 Contract → 取得 allowedModules
  → 查詢 Org 的 ModuleSubscription
  → 若模組在 allowedModules 且 Subscription 為 ACTIVE → 放行
  → 否則 → 403 Forbidden
```

**Contract 與 AppModule 的關係：**
- Contract 定義「可以用哪些模組」（白名單）
- ModuleSubscription 紀錄「實際訂閱了哪些模組」
- 兩者需同時滿足才有存取權

### Phase 5 並行分工

- 成員 A：Contract 模組（CRUD + 生命週期 + 到期處理）
- 成員 B：AppModule 模組（註冊 + 訂閱 + 用量追蹤）
- 成員 C：ModuleAccessMiddleware + 整合 Contract 權限檢查

### Phase 5 完成標準

- [ ] 合約 CRUD 完整，生命週期管理正確
- [ ] 合約可指派至 Organization / User
- [ ] 到期通知與停用流程正常
- [ ] 模組註冊、訂閱、取消流程正確
- [ ] ModuleAccessMiddleware 正確阻擋無權限請求
- [ ] 模組使用量獨立追蹤
- [ ] 測試覆蓋率 ≥ 80%

---

## Phase 6：Application Distribution — 應用分發與 SDK

**目標：** 提供應用層級 Key 配發與後端 API，讓 SDK、CLI、第三方開發者使用 Draupnir 服務

### 6.1 Application API Key

```
app/Modules/AppApiKey/
├── Domain/
│   ├── Entities/AppApiKey.ts
│   ├── ValueObjects/
│   │   ├── AppKeyId.ts, AppKeyScope.ts   # READ | WRITE | ADMIN
│   │   ├── KeyRotationPolicy.ts
│   │   └── BoundModules.ts
│   ├── Ports/IAppApiKeyRepository.ts
│   └── Events/AppKeyCreated.ts, AppKeyRotated.ts, AppKeyRevoked.ts
├── Application/
│   ├── UseCases/
│   │   ├── IssueAppKey.ts
│   │   ├── RotateAppKey.ts
│   │   ├── RevokeAppKey.ts
│   │   ├── SetAppKeyScope.ts
│   │   └── GetAppKeyUsage.ts
│   └── DTOs/IssueAppKeyDto.ts
├── Infrastructure/
│   ├── Repositories/AppApiKeyRepository.ts
│   └── Services/AppKeyBifrostSync.ts
└── Presentation/
    ├── Controllers/AppApiKeyController.ts
    └── Routes/appApiKeyRoutes.ts
```

**與個人 Key（Phase 3）的區別：**

| | 個人 API Key (Phase 3) | 應用 API Key (Phase 6) |
|---|---|---|
| 擁有者 | User | Application（管理者配發） |
| 用途 | 個人使用 Bifrost | SDK / CLI / 第三方應用 |
| 權限 | 模型白名單 + 速率限制 | Scope + 綁定模組 |
| 計費 | 扣 User/Org 的 Credit | 獨立追蹤，可歸屬至不同 Org |
| Key 格式 | `drp_sk_xxxx` | `drp_app_xxxx` |

**Key 輪換流程：**

```
觸發輪換（手動或自動到期）
  → 產生新 Key + 新 Bifrost Virtual Key
  → 舊 Key 進入寬限期（grace period，預設 24h）
  → 寬限期間新舊 Key 同時可用
  → 寬限期結束 → 舊 Key 停用 + 刪除舊 Bifrost Virtual Key
```

### 6.2 SDK Backend API

```
app/Modules/SdkApi/
├── Application/
│   ├── UseCases/
│   │   ├── AuthenticateApp.ts
│   │   ├── ProxyModelCall.ts
│   │   ├── QueryUsage.ts
│   │   └── QueryBalance.ts
│   └── DTOs/ProxyCallDto.ts
├── Infrastructure/
│   └── Middleware/AppAuthMiddleware.ts
└── Presentation/
    ├── Controllers/SdkApiController.ts
    └── Routes/sdkApiRoutes.ts
```

### 6.3 CLI Backend API

```
app/Modules/CliApi/
├── Application/
│   ├── UseCases/
│   │   ├── DeviceFlowAuth.ts
│   │   ├── ExchangeDeviceCode.ts
│   │   ├── ProxyCliRequest.ts
│   │   └── ManageSession.ts
│   └── DTOs/DeviceFlowDto.ts
├── Infrastructure/
│   └── Services/DeviceCodeStore.ts     # Redis 暫存 Device Code
└── Presentation/
    ├── Controllers/CliApiController.ts
    └── Routes/cliApiRoutes.ts
```

**CLI 登入流程（Device Flow）：**

```
CLI 端                          Draupnir 端
  │                                │
  ├─ POST /cli/device-code ──────→│ 產生 device_code + user_code
  │←── { device_code,             │ 存入 Redis（TTL 10min）
  │      user_code,               │
  │      verification_uri } ──────│
  │                                │
  │ 顯示: "前往 {uri}             │
  │        輸入 {user_code}"      │
  │                                │
  │ (用戶在瀏覽器登入並輸入 code)  │
  │                                │
  │ 輪詢 POST /cli/token ────────→│ 驗證 device_code
  │←── { access_token,            │ 已授權 → 回傳 Token
  │      refresh_token } ─────────│
```

### 6.4 Developer Portal API

```
app/Modules/DevPortal/
├── Application/
│   ├── UseCases/
│   │   ├── RegisterApp.ts
│   │   ├── ManageAppKeys.ts
│   │   ├── ConfigureWebhook.ts
│   │   └── GetApiDocs.ts
│   └── DTOs/RegisterAppDto.ts, WebhookConfigDto.ts
├── Infrastructure/
│   └── Services/WebhookDispatcher.ts
└── Presentation/
    ├── Controllers/DevPortalController.ts
    └── Routes/devPortalRoutes.ts
```

**Webhook 事件類型：**
- `usage.threshold` — 用量達到設定閾值
- `key.expiring` — Key 即將到期
- `key.revoked` — Key 被撤銷
- `credit.low` — Credit 餘額不足

### Phase 6 並行分工

- 成員 A：AppApiKey 模組（配發 + 輪換 + Scope 管理）
- 成員 B：SDK Backend API（App 認證 + 代理呼叫）
- 成員 C：CLI Backend API（Device Flow + Session）
- 成員 D：Developer Portal API（應用註冊 + Webhook）

### Phase 6 完成標準

- [ ] 應用 Key 配發、輪換、撤銷流程正確
- [ ] App Key 與 AppModule 綁定，存取控制正確
- [ ] SDK API 認證與代理呼叫正常
- [ ] CLI Device Flow 登入完整可用
- [ ] Developer Portal 應用註冊與 Webhook 正常
- [ ] 各類 Key 用量獨立追蹤
- [ ] 測試覆蓋率 ≥ 80%

---

## Phase 7：Admin Portal — 管理後台

**目標：** Inertia.js + React 前端，後端 API 全部完成後開始

### 7.1 管理後台（Admin Portal）

```
resources/pages/Admin/
├── Dashboard/Index.tsx
├── Users/Index.tsx, Show.tsx
├── Organizations/Index.tsx, Show.tsx
├── ApiKeys/Index.tsx
├── Contracts/Index.tsx, Create.tsx, Show.tsx
├── Modules/Index.tsx, Create.tsx
├── UsageSync/Index.tsx
└── Layout/AdminLayout.tsx, AdminSidebar.tsx
```

**管理後台頁面優先序：**
1. Dashboard（系統總覽）
2. Users + Organizations（最常用管理操作）
3. Contracts + Modules（核心業務管理）
4. ApiKeys 全域總覽（監控）
5. UsageSync 狀態（運維監控）

### 7.2 會員 Portal（Member Portal）

```
resources/pages/Member/
├── Dashboard/Index.tsx
├── ApiKeys/Index.tsx, Create.tsx
├── Usage/Index.tsx
├── Contracts/Index.tsx
├── Settings/Index.tsx
└── Layout/MemberLayout.tsx, MemberSidebar.tsx
```

### 共用元件

```
resources/components/
├── ui/                        # 基礎 UI 元件
├── charts/
│   ├── UsageLineChart.tsx
│   ├── ModelPieChart.tsx
│   └── CreditBarChart.tsx
├── tables/
│   ├── DataTable.tsx
│   └── columns/
├── forms/
│   ├── ApiKeyForm.tsx
│   ├── ContractForm.tsx
│   └── ModuleForm.tsx
└── layout/
    ├── AppShell.tsx
    ├── Sidebar.tsx
    └── TopBar.tsx
```

**技術選型：**

| 項目 | 選擇 | 理由 |
|------|------|------|
| 框架 | Inertia.js + React（@gravito/prism） | 框架整合，SSR + SPA 體驗 |
| UI 元件 | 視團隊偏好（Shadcn/ui 或 Ant Design） | Phase 7 開始前決定 |
| 圖表 | Recharts 或 Chart.js | 輕量、React 友好 |
| 表格 | TanStack Table | 功能完整、無 UI 綁定 |
| 表單 | React Hook Form + Zod | 與後端驗證 Schema 共用 |

### 前端開發順序

1. **第一週：** 共用元件 + Layout（AppShell、Sidebar、DataTable、基礎 UI）
2. **第二週：** 會員 Portal（Dashboard → ApiKeys → Usage → Settings）
3. **第三週：** 管理後台（Dashboard → Users → Organizations → Contracts → Modules）
4. **第四週：** 整合與打磨（跨頁面互動、錯誤狀態、Loading、響應式設計）

### Phase 7 並行分工

- 成員 A：共用元件 + 圖表元件
- 成員 B：會員 Portal 頁面
- 成員 C：管理後台頁面
- 成員 D：表單 + 驗證 + API 串接層

### Phase 7 完成標準

- [ ] 管理者可登入後台管理所有資源
- [ ] 會員可自助管理 Key、查看用量與 Credit
- [ ] 所有頁面有 Loading / Empty / Error 狀態處理
- [ ] 響應式設計（桌面優先，平板可用）
- [ ] 前端元件測試覆蓋核心互動邏輯
- [ ] 無 console.log、無 hardcoded 值

---

## 模組依賴圖

```
Foundation
└── BifrostClient（封裝 Bifrost API）

Identity
├── Auth（認證）
├── User（使用者）
└── Organization（組織、多租戶）

Core Business
├── ApiKey（API Key 管理）→ 依賴 BifrostClient、User
├── Credit（額度管理）→ 依賴 User、Organization
├── UsageSync（用量同步）→ 依賴 BifrostClient、Credit、ApiKey
├── Contract（合約）→ 依賴 Organization、Credit、AppModule
└── AppModule（應用模組）→ 依賴 Contract

Applications
├── App API Key（應用層級 Key）→ 依賴 ApiKey、AppModule、BifrostClient
├── SDK Backend API → 依賴 Auth、App API Key、BifrostClient
├── CLI Backend API → 依賴 Auth、App API Key、BifrostClient
└── Developer Portal API → 依賴 Auth、App API Key、AppModule

Portal
├── Admin Portal → 依賴 All
└── Member Portal → 依賴 Auth、ApiKey、Credit、Contract
```

---

## v1 完成標準

- [ ] 使用者可註冊、登入、管理自己的 API Key
- [ ] API Key 與 Bifrost Virtual Key 正確映射
- [ ] 用量從 Bifrost 同步並反映在 Dashboard
- [ ] Credit 系統正常運作（充值、消耗、餘額）
- [ ] 管理者可建立合約並指派給使用者/組織
- [ ] 應用模組可被註冊、訂閱、權限控制
- [ ] CLI 工具可透過 Draupnir 認證使用 Bifrost
- [ ] 管理後台與會員 Portal 基本功能完成
- [ ] 測試覆蓋率 ≥ 80%
- [ ] API 文件完整
