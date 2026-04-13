# DDD 四層架構圖

## Draupnir DDD 架構總覽

```
┌─────────────────────────────────────────────────────────────────────┐
│                     HTTP 請求 / 回應                                  │
├─────────────────────────────────────────────────────────────────────┤
│
│  ┌──────────────────────────────────────────────────────────────┐
│  │                  Presentation Layer                           │
│  │            (HTTP Controllers & Route Handlers)               │
│  │                                                              │
│  │  • DashboardController        • ProfileController           │
│  │  • CreditController           • AuthController              │
│  │  • SdkApiController           • OrganizationController      │
│  │  • DevPortalController        • ContractController          │
│  │  • ApiKeyController           • AppApiKeyController         │
│  │  • AppModuleController        • CliApiController            │
│  │  • HealthController           • ReportController            │
│  │  • AlertController            • WebhookEndpointController  │
│  │  • AlertHistoryController                                    │
│  │                                                              │
│  │  職責：HTTP 映射、輸入驗證 (Zod)、狀態碼回應               │
│  └──────────────────────────────────────────────────────────────┘
│                              ↓ (依賴)
│  ┌──────────────────────────────────────────────────────────────┐
│  │                  Application Layer                           │
│  │              (Use Case Services & DTOs)                      │
│  │                                                              │
│  │  Services（單一職責 — 一例一服務，例示）:                    │
│  │  • CreateOrganizationService     • DeductCreditService      │
│  │  • TopUpCreditService            • CreateApiKeyService      │
│  │  • LoginUserService              • AcceptInvitationService  │
│  │  • GetDashboardSummaryService    • RegisterUserService      │
│  │  • ScheduleReportService         • ConfigureWebhookService   │
│  │                                                              │
│  │  協調／授權輔助（仍屬應用層，非 Domain）:                   │
│  │  • OrgAuthorizationHelper（Organization/Application）       │
│  │                                                              │
│  │  職責：用例協調、交易邊界、授權檢查、事件發佈              │
│  └──────────────────────────────────────────────────────────────┘
│                              ↓ (依賴)
│  ┌──────────────────────────────────────────────────────────────┐
│  │                    Domain Layer                              │
│  │       (Business Rules, Aggregates, Value Objects)           │
│  │                                                              │
│  │  Aggregate Roots（例示）:                                   │
│  │  • User (Auth) / UserProfile    • CreditAccount             │
│  │  • Organization                 • ApiKey / AppApiKey        │
│  │  • Contract / AppModule         • ReportSchedule (Reports)  │
│  │  • AlertConfig, WebhookEndpoint (Alerts)                    │
│  │                                                              │
│  │  Value Objects（例示）:                                     │
│  │  • Email, Role                  • Balance, TransactionType  │
│  │  • OrgSlug, OrgMemberRole       • KeyStatus / rotation 等    │
│  │  • Jwt / Token 相關值物件       • ReportToken 等                  │
│  │                                                              │
│  │  Domain Services / 純規則（例示）:                          │
│  │  • ContractEnforcementService     • OrgMembershipRules      │
│  │  • HealthCheckService             • Alerts 通知／解析埠型          │
│  │                                                              │
│  │  Domain Events（例示，實際命名以程式為準）:                 │
│  │  • CreditToppedUp / BalanceLow / BalanceDepleted           │
│  │  • ContractActivated / ContractExpired / ContractExpiring  │
│  │  • ModuleSubscribed / ModuleAccessRevoked                    │
│  │  • AppApiKey: app_key.created / rotated / revoked            │
│  │  • BifrostSyncCompletedEvent (Dashboard)                   │
│  │                                                              │
│  │  Repository 介面（無實現，例示）:                           │
│  │  • IAuthRepository / IUserProfileRepository                  │
│  │  • IOrganizationRepository      • ICreditAccountRepository │
│  │  • IApiKeyRepository              （各模組另有專屬介面）     │
│  │                                                              │
│  │  職責：不變式、狀態轉換、業務規則、純計算                  │
│  └──────────────────────────────────────────────────────────────┘
│                              ↓ (依賴)
│  ┌──────────────────────────────────────────────────────────────┐
│  │                 Infrastructure Layer                         │
│  │      (Persistence, External APIs, DI Container)             │
│  │                                                              │
│  │  Repositories（實現，例示）:                                 │
│  │  • UserRepository / Drizzle*Repository 等                   │
│  │  • CreditAccountRepository      • ApiKeyRepository         │
│  │  • 其餘依模組介面實作（含 Reports、Alerts 多表儲存）         │
│  │                                                              │
│  │  External Services:                                         │
│  │  • BifrostGatewayClient         (LLM 模型呼叫)              │
│  │  • DatabaseAccessAdapter        (ORM 中介層)               │
│  │  • ServiceProvider              (DI 註冊)                   │
│  │                                                              │
│  │  職責：持久化、外部 API、事件分發、DI 註冊                 │
│  └──────────────────────────────────────────────────────────────┘
│
├─────────────────────────────────────────────────────────────────────┤
│                      Shared Layer (跨模組)                           │
│  • Domain base classes (AggregateRoot, Entity, ValueObject)        │
│  • DomainEvent & DomainEventDispatcher                            │
│  • Framework adapters (IHttpContext, IModuleRouter, IDatabase)    │
│  • Exceptions & Error codes                                       │
│  • Middleware (Auth, Error handling)                              │
├─────────────────────────────────────────────────────────────────────┤
│                     Framework (Gravito/Bun)                         │
│                                                                     │
│  完全解耦 — 模組無直接導入 Gravito，經由 Framework Adapters      │
│  ORM 可切換：memory (測試) / drizzle / atlas                       │
└─────────────────────────────────────────────────────────────────────┘
```

## 分層職責對應

### Presentation Layer（展現層）
```
Controller
  ↓
1. 驗證輸入 (Zod schema)
2. 授權檢查 (middleware 或 decorator)
3. 呼叫 Application Service
4. 轉換 DTO 為 HTTP response
5. 處理 HTTP 狀態碼
```

### Application Layer（應用層）
```
Service
  ↓
1. 驗證業務前置條件
2. 呼叫 Domain Service / Repository
3. 協調多個 Aggregate
4. 管理 Transaction 邊界
5. 發佈 Domain Events
```

### Domain Layer（領域層）
```
Aggregate / Entity / ValueObject
  ↓
1. 驗證不變式
2. 實現業務規則
3. 狀態轉換 (Factory 方法)
4. 純計算邏輯
5. 無任何 I/O 操作
```

### Infrastructure Layer（基礎設施層）
```
Repository / ServiceProvider / Middleware
  ↓
1. 實現 Domain 層 Repository 介面
2. 對映 Domain 物件 ↔ 資料庫行
3. 連接外部 API (Bifrost、email 服務)
4. DI 容器註冊
5. 框架整合（路由、中間件）
```

## 依賴方向（重要！）

```
Presentation → Application → Domain
                              ↓
                        Infrastructure
                             ↓
                        (讀取 Repository 介面)

Framework
    ↓
(適配層)
    ↓
Shared (無環形依賴)
    ↑
所有模組依賴
```

### 關鍵規則

✅ **允許**：
- Presentation 依賴 Application
- Application 依賴 Domain
- 所有層依賴 Shared
- Domain 定義 Repository 介面，Infrastructure 實現

❌ **禁止**：
- Domain 依賴 Application / Infrastructure
- Application 直接依賴 Controller
- Infrastructure 直接依賴 Presentation
- 模組間循環依賴

## 15 個模組的分層完整性

欄位 **Domain**：`✅` 表示具 Aggregate／實質領域模型；`△` 表示僅事件或極薄領域程式；`❌` 表示無 `Domain/`。

| 模組 | Domain | Applic | Infra | Pres | 評分 | 備註 |
|------|--------|--------|-------|------|------|------|
| Alerts | ✅ | ✅ | ✅ | ✅ | 8.5/10 | Webhook／預算／告警 |
| ApiKey | ✅ | ✅ | ✅ | ✅ | 8.8/10 | 完整 |
| AppApiKey | ✅ | ✅ | ✅ | ✅ | 8.6/10 | 與 ApiKey 對稱 |
| AppModule | ✅ | ✅ | ✅ | ✅ | 8.6/10 | 應用／訂閱 |
| Auth | ✅ | ✅ | ✅ | ✅ | 8.5/10 | JWT、User Aggregate |
| CliApi | ✅ | ✅ | ✅ | ✅ | 8.4/10 | Device code／代理 |
| Contract | ✅ | ✅ | ✅ | ✅ | 8.6/10 | Admin 合約 |
| Credit | ✅ | ✅ | ✅ | ✅ | 9/10 | 額度與事件清晰 |
| Dashboard | △ | ✅ | ✅ | ✅ | 8.0/10 | 讀模型為主；Domain 僅 `BifrostSyncCompletedEvent` |
| DevPortal | ✅ | ✅ | ✅ | ✅ | 8.5/10 | 開發者入口 |
| Health | ✅ | ✅ | ✅ | ✅ | 8.9/10 | 簡單實用 |
| Organization | ✅ | ✅ | ✅ | ✅ | 9/10 | 成員／邀請／授權 |
| Profile | ✅ | ✅ | ✅ | ✅ | 9/10 | UserProfile |
| Reports | ✅ | ✅ | ✅ | ✅ | 8.4/10 | 排程／PDF／寄信 |
| SdkApi | ❌ | ✅ | ✅ | ✅ | 7.6/10 | 認證與代理，無 Domain 目錄 |

**摘要**：**14/15** 模組四層目錄齊備（**SdkApi** 無 `Domain/`）；其中 **13/15** 具實質領域模型（**Dashboard** 僅薄 Domain、**SdkApi** 無）。主觀整體約 **8.3/10**（隨模組演進可再調整）。

---

## 參考

- [`layer-decision-rules.md`](../knowledge/layer-decision-rules.md) — 分層判斷規則
- [`domain-events.md`](../knowledge/domain-events.md) — Domain Events 實踐
- [`module-boundaries.md`](../knowledge/module-boundaries.md) — bounded context
- `src/Shared/` — 跨模組共享程式碼
- `src/Modules/` — **15** 個模組實現（見各模組 `index.ts`／目錄）
