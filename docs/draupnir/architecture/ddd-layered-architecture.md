# DDD 四層架構圖

## Draupnir DDD 架構總覽

```
┌─────────────────────────────────────────────────────────────────────┐
│                     HTTP 請求 / 回應                                  │
├─────────────────────────────────────────────────────────────────────┤
│
│  ┌──────────────────────────────────────────────────────────────┐
│  │                  Presentation Layer                          │
│  │            (HTTP Controllers & Route Handlers)               │
│  │                                                              │
│  │  • DashboardController        • ProfileController           │
│  │  • CreditController           • AuthController              │
│  │  • SdkApiController           • OrganizationController      │
│  │  • AdminPortalController      • ContractController          │
│  │                                                              │
│  │  職責：HTTP 映射、輸入驗證 (Zod)、狀態碼回應               │
│  └──────────────────────────────────────────────────────────────┘
│                              ↓ (依賴)
│  ┌──────────────────────────────────────────────────────────────┐
│  │                  Application Layer                           │
│  │              (Use Case Services & DTOs)                      │
│  │                                                              │
│  │  Services (單一職責 - 一個服務 = 一個 Use Case):            │
│  │  • CreateOrganizationService     • DeductCreditService      │
│  │  • TopUpCreditService            • CreateApiKeyService      │
│  │  • AuthenticateAppService        • AcceptInvitationService  │
│  │  • GetDashboardSummaryService    • CreateUserService       │
│  │                                                              │
│  │  職責：用例協調、交易邊界、授權檢查、事件發佈              │
│  └──────────────────────────────────────────────────────────────┘
│                              ↓ (依賴)
│  ┌──────────────────────────────────────────────────────────────┐
│  │                    Domain Layer                              │
│  │       (Business Rules, Aggregates, Value Objects)           │
│  │                                                              │
│  │  Aggregate Roots:                                           │
│  │  • User / Profile               • CreditAccount             │
│  │  • Organization                 • ApiKey / AppApiKey        │
│  │  • AuthSession                  • AppModule                 │
│  │  • Contract                                                 │
│  │                                                              │
│  │  Value Objects:                                             │
│  │  • Email, UserRole              • Balance, TransactionType │
│  │  • OrgSlug, OrgRole             • KeyStatus                │
│  │  • TokenClaims, JwtToken        • MemberStatus             │
│  │                                                              │
│  │  Domain Services (跨 Aggregate 的純規則):                   │
│  │  • CreditDeductionService       • OrgAuthorizationHelper   │
│  │                                                              │
│  │  Domain Events:                                             │
│  │  • CreditDeductedEvent          • UserCreatedEvent        │
│  │  • CreditToppedUpEvent          • LowBalanceAlertEvent    │
│  │  • MemberAddedEvent             • (可擴展)                 │
│  │                                                              │
│  │  Repository 介面 (無實現):                                   │
│  │  • IUserRepository              • ICreditAccountRepository │
│  │  • IOrganizationRepository      • IApiKeyRepository        │
│  │  • IAuthSessionRepository       (等 13 個模組)              │
│  │                                                              │
│  │  職責：不變式、狀態轉換、業務規則、純計算                  │
│  └──────────────────────────────────────────────────────────────┘
│                              ↓ (依賴)
│  ┌──────────────────────────────────────────────────────────────┐
│  │                 Infrastructure Layer                         │
│  │      (Persistence, External APIs, DI Container)             │
│  │                                                              │
│  │  Repositories (實現):                                       │
│  │  • UserRepository               • CreditAccountRepository  │
│  │  • OrganizationRepository       • ApiKeyRepository         │
│  │  • AuthSessionRepository        (12+ 其他實現)              │
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

## 13 個模組的分層完整性

| 模組 | Domain | Applic | Infra | Pres | 評分 | 備註 |
|------|--------|--------|-------|------|------|------|
| Profile | ✅ | ✅ | ✅ | ✅ | 9/10 | 完整 DDD |
| Organization | ✅ | ✅ | ✅ | ✅ | 9/10 | 複雜業務邏輯 |
| Auth | ✅ | ✅ | ✅ | ✅ | 8.5/10 | JWT 驗證清晰 |
| ApiKey | ✅ | ✅ | ✅ | ✅ | 8.8/10 | 完整 |
| Credit | ✅ | ✅ | ✅ | ✅ | 9/10 | 額度計算邏輯優雅 |
| Health | ✅ | ✅ | ✅ | ✅ | 8.9/10 | 簡單實用 |
| Dashboard | ❌ | ✅ | ✅ | ✅ | 7.9/10 | 應用層讀聚合 |
| CliApi | ✅ | ✅ | ✅ | ✅ | 8.4/10 | 代理層 |
| SdkApi | ❌ | ✅ | ✅ | ✅ | 7.6/10 | 認證代理 |
| AppApiKey | ✅ | ✅ | ✅ | ✅ | 8.6/10 | 與 ApiKey 對稱 |
| AppModule | ✅ | ✅ | ✅ | ✅ | 8.6/10 | 應用管理 |
| DevPortal | ✅ | ✅ | ✅ | ✅ | 8.5/10 | 開發者入口 |
| Contract | ✅ | ✅ | ✅ | ✅ | 8.6/10 | Admin 支援 |

**11/13 模組完整四層，整體評分 8.2/10**

---

## 參考

- [`layer-decision-rules.md`](../knowledge/layer-decision-rules.md) — 分層判斷規則
- [`domain-events.md`](../knowledge/domain-events.md) — Domain Events 實踐
- `src/Shared/` — 跨模組共享程式碼
- `src/Modules/` — 13 個模組實現
