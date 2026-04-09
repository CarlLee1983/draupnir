# Draupnir v1 架构概览与模块指南

> 完整的系统架构、模块划分、依赖关系和开发指南。  
> 配置详情见 `DESIGN_DECISIONS.md`，技术细节见 `specs/` 目录。

**文档版本**: v1.1  
**更新日期**: 2026-04-09  
**项目**: Draupnir — AI 服务管理平台（建构于 Bifrost 之上）

---

## 架构全景图

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend (Inertia.js + React)             │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/JSON
┌──────────────────────▼──────────────────────────────────────┐
│                   API Gateway (SdkApi)                       │
│              (认证代理、请求转发、限流)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│          Presentation Layer (Controllers)                    │
│  ├─ Auth Controller                                          │
│  ├─ User Controller                                          │
│  ├─ Organization Controller                                  │
│  ├─ ApiKey Controller                                        │
│  ├─ Credit Controller                                        │
│  ├─ Billing Controller                                       │
│  ├─ Dashboard Controller                                     │
│  └─ SdkApi Controller                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│        Application Layer (Services & DTOs)                   │
│  ├─ AuthService                                              │
│  ├─ UserService                                              │
│  ├─ OrganizationService                                      │
│  ├─ ApiKeyService                                            │
│  ├─ CreditService                                            │
│  ├─ BillingService                                           │
│  └─ DashboardService (聚合逻辑)                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│         Domain Layer (Aggregates & Events)                   │
│                                                              │
│  ┌─ User Aggregate                                           │
│  │  ├─ User (值对象: email, role, status)                   │
│  │  ├─ PasswordResetToken                                    │
│  │  └─ UserRegisteredEvent                                   │
│  │                                                            │
│  ├─ Organization Aggregate                                   │
│  │  ├─ Organization                                          │
│  │  ├─ OrganizationMember                                    │
│  │  └─ InvitationToken                                       │
│  │                                                            │
│  ├─ ApiKey Aggregate                                         │
│  │  ├─ ApiKey (值对象: key_hash, models, status)            │
│  │  └─ ApiKeyRevokedEvent                                    │
│  │                                                            │
│  ├─ Credit Aggregate                                         │
│  │  ├─ Credit (值对象: balance, unit_price)                 │
│  │  └─ CreditUsageDeductedEvent                              │
│  │                                                            │
│  └─ Domain Services                                          │
│     ├─ AuthorizationService (权限检查)                       │
│     ├─ TokenManager (JWT 操作)                               │
│     └─ CreditCalculator (积分计算)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│        Infrastructure Layer (Repos & Externals)              │
│  ├─ UserRepository (DB 持久化)                               │
│  ├─ OrganizationRepository                                   │
│  ├─ ApiKeyRepository                                         │
│  ├─ CreditRepository                                         │
│  ├─ BifrostClient (Bifrost API 调用)                        │
│  ├─ MailService (邮件服务)                                   │
│  └─ CacheService (Redis 缓存)                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│         Foundation Layer (共享基础设施)                       │
│  ├─ Database (PostgreSQL + Drizzle ORM)                     │
│  ├─ Redis Cache                                              │
│  ├─ JWT Token Manager                                        │
│  ├─ Logging & Monitoring                                     │
│  └─ Error Handling                                           │
└──────────────────────────────────────────────────────────────┘
         ↓ 下游
   Bifrost AI Gateway
   (Virtual Key 管理、模型列表、用量计费)
```

---

## 模块架构详解

### 1. Auth 模块（认证与会话）

**职责**：用户登录、注册、密码管理、JWT 颁发  
**关键 Aggregate**：User、PasswordResetToken

```
Domain 层
├─ User (聚合根)
│  ├─ id: UUID
│  ├─ email: Email (VO)
│  ├─ passwordHash: string
│  ├─ role: Role (VO: ADMIN/MANAGER/MEMBER)
│  ├─ status: UserStatus (VO: ACTIVE/INACTIVE/SUSPENDED)
│  └─ Methods
│     ├─ authenticate(password: string): boolean
│     ├─ resetPassword(newPassword: string): void
│     └─ changeRole(newRole: Role): void
│
├─ PasswordResetToken (VO)
│  ├─ token: string
│  ├─ userId: UUID
│  ├─ expiresAt: Date
│  └─ isUsed: boolean
│
└─ Events
   ├─ UserRegisteredEvent
   ├─ PasswordResetRequestedEvent
   └─ PasswordResetExecutedEvent

Application 层
├─ RegisterUserService
│  └─ Input: { email, password, confirmPassword }
│  └─ Output: { userId, token }
│
├─ LoginService
│  └─ Input: { email, password }
│  └─ Output: { token, refreshToken, user }
│
├─ RequestPasswordResetService
├─ ExecutePasswordResetService
└─ RoleMiddleware (权限检查)

API 端点
├─ POST /api/auth/register
├─ POST /api/auth/login
├─ POST /api/auth/logout
├─ POST /api/auth/password-reset/request
├─ POST /api/auth/password-reset/execute
└─ POST /api/auth/refresh
```

---

### 2. User 模块（用户档案）

**职责**：用户档案管理、偏好设置  
**关键 Aggregate**：UserProfile

```
Domain 层
├─ UserProfile (聚合根，与 Auth.User 分离)
│  ├─ id: UUID (= Auth.User.id)
│  ├─ displayName: string
│  ├─ avatarUrl: string
│  ├─ phone: string
│  ├─ bio: string
│  ├─ timezone: string (e.g., "Asia/Taipei")
│  ├─ locale: string (e.g., "zh-TW")
│  ├─ notificationPreferences: JSON
│  └─ Methods
│     └─ updateProfile(updates: Partial): void
│
└─ Events
   └─ UserProfileUpdatedEvent

Application 层
├─ GetUserProfileService
├─ UpdateUserProfileService
└─ GetUserPreferencesService

API 端点
├─ GET /api/users/profile
├─ PUT /api/users/profile
└─ GET /api/users/preferences
```

---

### 3. Organization 模块（组织与成员管理）

**职责**：多租户管理、成员邀请、权限分配  
**关键 Aggregate**：Organization、OrganizationMember、InvitationToken

```
Domain 层
├─ Organization (聚合根)
│  ├─ id: UUID
│  ├─ name: string
│  ├─ createdById: UUID
│  ├─ status: OrgStatus (ACTIVE/ARCHIVED)
│  └─ Methods
│     ├─ inviteMember(email, role): InvitationToken
│     ├─ addMember(userId, role): void
│     └─ removeMember(userId): void
│
├─ OrganizationMember (实体)
│  ├─ id: UUID
│  ├─ organizationId: UUID
│  ├─ userId: UUID
│  ├─ role: Role (VO: ADMIN/MANAGER/MEMBER)
│  ├─ joinedAt: Date
│  └─ Methods
│     └─ updateRole(newRole: Role): void
│
├─ InvitationToken (VO)
│  ├─ token: string
│  ├─ organizationId: UUID
│  ├─ inviteeEmail: string
│  ├─ expiresAt: Date (7 天)
│  └─ acceptedAt: Date | null
│
└─ Events
   ├─ OrganizationCreatedEvent
   ├─ MemberInvitedEvent
   └─ MemberAcceptedInviteEvent

Application 层
├─ CreateOrganizationService
├─ InviteMemberService
├─ AcceptInvitationService
├─ ListOrganizationMembersService
└─ RemoveMemberService

API 端点
├─ POST /api/organizations
├─ GET /api/organizations/:id
├─ POST /api/organizations/:id/invite
├─ POST /api/organizations/:id/members/accept-invite
├─ GET /api/organizations/:id/members
└─ DELETE /api/organizations/:id/members/:userId
```

---

### 4. ApiKey 模块（密钥管理）

**职责**：生成、列表、撤销 API 密钥  
**关键 Aggregate**：ApiKey

```
Domain 层
├─ ApiKey (聚合根)
│  ├─ id: UUID
│  ├─ organizationId: UUID
│  ├─ userId: UUID (所有者)
│  ├─ name: string
│  ├─ keyHash: string (SHA-256，仅存储哈希)
│  ├─ bifrostVirtualKeyId: UUID (Bifrost 对应 Key ID)
│  ├─ allowedModels: string[] (e.g., ["gpt-4", "claude-3"])
│  ├─ isActive: boolean
│  ├─ lastUsedAt: Date | null
│  └─ Methods
│     ├─ revoke(): void
│     └─ markAsUsed(): void
│
└─ Events
   ├─ ApiKeyCreatedEvent
   └─ ApiKeyRevokedEvent

Application 层
├─ CreateApiKeyService
│  └─ 调用 BifrostClient 创建 Virtual Key
│  └─ 存储本地记录 + 权限映射
│
├─ ListApiKeysService
├─ RevokeApiKeyService
│  └─ 调用 BifrostClient 撤销 Virtual Key
│  └─ 标记本地记录为已撤销
│
└─ ValidateApiKeyService
   └─ 快速验证（内存缓存）

API 端点
├─ POST /api/api-keys (需 MANAGER+ 权限)
├─ GET /api/api-keys
├─ DELETE /api/api-keys/:keyId
└─ GET /api/api-keys/:keyId/validate
```

---

### 5. Credit 模块（积分系统）

**职责**：积分余额、用量扣费、同步 Bifrost 账单  
**关键 Aggregate**：Credit、UsageTransaction

```
Domain 层
├─ Credit (聚合根)
│  ├─ organizationId: UUID
│  ├─ balance: Decimal (精确小数)
│  ├─ unitPrice: Decimal (单位：USD/K tokens)
│  ├─ updatedAt: Date
│  ├─ lastSyncedAt: Date (与 Bifrost 同步时间)
│  └─ Methods
│     ├─ deductUsage(tokensUsed: number): void
│     ├─ purchase(amount: Decimal): void
│     └─ validateSufficientCredit(): void
│
├─ UsageTransaction (实体，审计日志)
│  ├─ id: UUID
│  ├─ organizationId: UUID
│  ├─ amount: Decimal (扣费金额)
│  ├─ tokensUsed: number (消耗 tokens)
│  ├─ transactionType: enum (USAGE/PURCHASE/REFUND)
│  ├─ externalRef: string (Bifrost 账单 ID)
│  └─ createdAt: Date
│
└─ Events
   ├─ CreditUsageDeductedEvent
   ├─ CreditPurchasedEvent
   └─ CreditLowEvent (余额低于阈值)

Application 层
├─ SyncCreditFromBifrostService
│  └─ 定时任务，从 Bifrost 获取最新用量
│  └─ 计算费用，更新 Credit.balance
│
├─ GetCreditBalanceService
├─ ValidateCreditSufficientService
│  └─ 在 SdkApi 请求前检查
│  └─ 若余额不足，阻止请求
│
├─ GetUsageHistoryService
└─ PurchaseCreditService (Phase 4)

API 端点
├─ GET /api/credits/balance
├─ GET /api/credits/usage-history
├─ POST /api/credits/purchase (Phase 4)
└─ GET /api/credits/transactions (管理员)
```

---

### 6. Billing 模块（账单管理）

**职责**：生成发票、充值流程、费用报表  
**关键 Aggregate**：Invoice、Subscription

```
Domain 层
├─ Invoice (聚合根)
│  ├─ id: UUID
│  ├─ organizationId: UUID
│  ├─ billingPeriod: { from, to }
│  ├─ totalAmount: Decimal
│  ├─ paidAt: Date | null
│  ├─ status: InvoiceStatus (DRAFT/ISSUED/PAID/OVERDUE)
│  └─ Methods
│     ├─ issue(): void
│     └─ markAsPaid(): void
│
└─ Events
   ├─ InvoiceGeneratedEvent
   └─ InvoicePaidEvent

Application 层
├─ GenerateInvoiceService (定时，每月)
├─ GetBillingHistoryService
└─ SendInvoiceService

API 端点
├─ GET /api/billing/invoices
├─ GET /api/billing/invoices/:invoiceId
└─ POST /api/billing/invoices/:invoiceId/download
```

---

### 7. Dashboard 模块（数据聚合，无 Domain 层）

**职责**：多数据源聚合、实时统计、报表生成

```
架构说明：纯读操作，无业务规则 → 无需 Domain 层
         符合 CQRS 读侧设计 → 应用层直接查询

Application 层
├─ GetDashboardOverviewService
│  ├─ 获取用户信息（名字、角色）
│  ├─ 获取组织成员数
│  ├─ 获取积分余额
│  ├─ 获取本月用量 (Bifrost 同步)
│  └─ 返回聚合结果
│
├─ GetApiKeyStatsService
│  ├─ Key 总数、活跃 Key 数
│  ├─ 最近使用的 Key（top 5）
│  └─ 按模型分组的使用统计
│
├─ GetCreditTrendService
│  ├─ 过去 30 天的用量曲线
│  ├─ 日均消耗
│  └─ 预测剩余可用天数
│
└─ GetOrganizationStatsService
   ├─ 成员活跃度
   └─ 模型热度排行

API 端点
├─ GET /api/dashboard/overview
├─ GET /api/dashboard/api-key-stats
├─ GET /api/dashboard/credit-trend
└─ GET /api/dashboard/organization-stats
```

---

### 8. SdkApi 模块（请求代理，无 Domain 层）

**职责**：验证 API Key、转发请求到 Bifrost、检查余额

```
架构说明：纯认证 + 转发，无业务逻辑 → 无需 Domain 层
         API 网关职责 → 中间件处理

Middleware
├─ AppAuthMiddleware
│  ├─ 解析 Authorization: Bearer <key>
│  ├─ 验证 Key 有效性（缓存 + Bifrost 后台验证）
│  ├─ 验证 Key 权限（允许的模型）
│  └─ 验证租户隔离（Key 所属组织）
│
└─ RateLimitMiddleware
   ├─ 按 Key 限流
   └─ 与 Bifrost 限流联动

Application 层
├─ ValidateApiKeyService
├─ CheckCreditSufficientService
└─ ForwardRequestService
   ├─ 构建 Bifrost 请求
   ├─ 转发请求
   ├─ 记录日志
   └─ 返回响应

Controller
├─ POST /v1/chat/completions (代理端点)
├─ POST /v1/embeddings
├─ GET /v1/models
└─ GET /v1/usage (Bifrost 用量)
```

---

## 数据流示例

### 用户注册 → 组织邀请 → Key 创建 → API 调用

```
1. 用户注册
   POST /api/auth/register { email, password }
   ├─ RegisterUserService
   ├─ 创建 User Aggregate
   ├─ 发布 UserRegisteredEvent
   └─ 返回 JWT Token

2. 管理员创建组织
   POST /api/organizations { name }
   ├─ CreateOrganizationService
   ├─ 创建 Organization Aggregate
   ├─ 发布 OrganizationCreatedEvent
   └─ 返回 organizationId

3. 管理员邀请成员
   POST /api/organizations/:id/invite { email, role: MANAGER }
   ├─ InviteMemberService
   ├─ 生成 InvitationToken（7 天过期）
   ├─ 发布 MemberInvitedEvent
   ├─ 邮件服务发送邀请链接
   └─ 返回 { token }

4. 被邀请用户注册 / 接受邀请
   POST /api/organizations/:id/members/accept-invite { token }
   ├─ AcceptInvitationService
   ├─ 验证 Token 有效性
   ├─ 添加 OrganizationMember
   ├─ 发布 MemberAcceptedInviteEvent
   └─ 用户成为组织成员

5. 管理员创建 API Key
   POST /api/api-keys { name, allowedModels: ["gpt-4"] }
   ├─ CreateApiKeyService
   ├─ 调用 BifrostClient.createVirtualKey()
   ├─ 生成密钥、存储哈希
   ├─ 发布 ApiKeyCreatedEvent
   └─ 返回 { key: "sk-xxx" } (仅返回一次)

6. 用户通过 SDK 调用 API
   curl -H "Authorization: Bearer sk-xxx" \
        https://api.draupnir.io/v1/chat/completions \
        -d { model: "gpt-4", ... }
   
   ├─ AppAuthMiddleware
   │  ├─ 验证 Key 有效性（缓存）
   │  └─ 验证权限（gpt-4 在 allowedModels）
   │
   ├─ RateLimitMiddleware
   │  └─ 检查 Key 的请求频率
   │
   ├─ SdkApi.Controller
   │  ├─ CheckCreditSufficientService
   │  │  └─ 验证余额充足（缓存 + 定时检查）
   │  │
   │  └─ ForwardRequestService
   │     ├─ 调用 BifrostClient 代理请求
   │     ├─ 返回 Bifrost 响应
   │     └─ 记录使用日志（异步）
   │
   └─ 返回 { choices: [...], usage: { ... } }

7. 后台异步处理
   ├─ UsageLogService（定时，每 5 分钟）
   │  └─ 从日志聚合本组织的 token 用量
   │  └─ 调用 SyncCreditFromBifrostService
   │
   └─ SyncCreditFromBifrostService
      ├─ 调用 BifrostClient.getUsageLogs()
      ├─ 计算费用（tokens * unitPrice）
      ├─ 更新 Credit.balance
      └─ 发布 CreditUsageDeductedEvent
```

---

## 依赖关系图

```
Presentation (Controller)
    ↓
Application Service (编排、聚合)
    ↓
Domain (Aggregate、VO、Event、Repository Interface)
    ↓
Infrastructure (Repository Impl、外部服务)
    ↑
Foundation (Database、Redis、JWT、Logger)
```

**关键规则**：
- Domain 无外向依赖（唯一例外：Event 发布）
- Application 依赖 Domain（调用 Service、Aggregate）
- Infrastructure 依赖 Domain（实现 Repository）
- Presentation 只调用 Application
- 不允许跨模块 Aggregate 直接访问

---

## 模块间通讯方式

### 1. 同步通讯（Service 注入）
```typescript
// OrganizationService 需要 AuthorizationService
class OrganizationService {
  constructor(
    private authService: AuthorizationService,
    private orgRepository: OrganizationRepository
  ) {}
  
  async inviteMember(orgId, email, role) {
    this.authService.requirePermission(user, 'INVITE_MEMBER')
    // 业务逻辑...
  }
}
```

### 2. 异步通讯（Domain Events）
```typescript
// Auth Module 发布事件
await this.userRepository.save(user) // user.events = [UserRegisteredEvent]

// Subscriber 监听（可在不同模块）
class SendWelcomeEmailSubscriber {
  async handle(event: UserRegisteredEvent) {
    await this.mailService.sendWelcomeEmail(event.email)
  }
}
```

### 3. 外部服务调用（Infrastructure）
```typescript
// ApiKeyService 调用 Bifrost
class CreateApiKeyService {
  constructor(private bifrostClient: BifrostClient) {}
  
  async execute() {
    const virtualKey = await this.bifrostClient.createVirtualKey(...)
    // 存储本地映射...
  }
}
```

---

## 文件位置参考

```
src/
├── Modules/
│   ├── Auth/
│   │   ├── Domain/
│   │   │   ├── User.ts (Aggregate Root)
│   │   │   ├── PasswordResetToken.ts (VO)
│   │   │   ├── Role.ts (VO)
│   │   │   ├── IUserRepository.ts (Interface)
│   │   │   └── Events/
│   │   │       ├── UserRegisteredEvent.ts
│   │   │       ├── PasswordResetRequestedEvent.ts
│   │   │       └── PasswordResetExecutedEvent.ts
│   │   ├── Application/
│   │   │   ├── Services/
│   │   │   │   ├── RegisterUserService.ts
│   │   │   │   ├── LoginService.ts
│   │   │   │   ├── RequestPasswordResetService.ts
│   │   │   │   └── ExecutePasswordResetService.ts
│   │   │   └── DTOs/
│   │   │       ├── RegisterUserRequest.ts
│   │   │       ├── LoginRequest.ts
│   │   │       └── AuthResponse.ts
│   │   ├── Infrastructure/
│   │   │   └── Repositories/
│   │   │       ├── DrizzleUserRepository.ts
│   │   │       └── DrizzlePasswordResetTokenRepository.ts
│   │   └── Presentation/
│   │       └── Controllers/
│   │           └── AuthController.ts
│   ├── User/
│   ├── Organization/
│   ├── ApiKey/
│   ├── Credit/
│   ├── Billing/
│   ├── Dashboard/
│   └── SdkApi/
│
├── Foundation/
│   ├── Infrastructure/
│   │   ├── Services/
│   │   │   ├── BifrostClient/
│   │   │   ├── MailService.ts
│   │   │   └── CacheService.ts
│   │   └── Database/
│   │       ├── schema.ts (Drizzle)
│   │       └── migrations/
│   └── Providers/
│       └── ServiceProvider.ts
│
└── Shared/
    ├── Domain/
    │   ├── Errors/
    │   │   ├── AppException.ts
    │   │   ├── ValidationException.ts
    │   │   └── NotFoundException.ts
    │   └── Interfaces/
    │       ├── IRepository.ts
    │       └── IEvent.ts
    ├── Application/
    │   └── DTOs/
    │       ├── ApiResponse.ts
    │       └── PaginationDto.ts
    └── Presentation/
        └── Middleware/
            ├── AuthMiddleware.ts
            ├── RoleMiddleware.ts
            └── ErrorHandler.ts
```

---

## 快速开发指南

### 添加新模块的步骤

1. **创建 Domain 层**
   - 定义 Aggregate Root 和关键 Value Objects
   - 编写业务规则（验证、不变式）
   - 定义 Repository Interface
   - 定义 Events

2. **创建 Application 层**
   - 实现 Service（编排、聚合）
   - 定义 Request/Response DTO
   - 添加单元测试

3. **创建 Infrastructure 层**
   - 实现 Repository（Drizzle ORM）
   - 实现外部服务调用（如需）
   - 添加集成测试

4. **创建 Presentation 层**
   - 实现 Controller（HTTP 端点）
   - 添加路由（routes.ts）
   - 添加 E2E 测试

5. **注册模块**
   - 在 ServiceProvider 中注册 Service 和 Repository
   - 在 routes.ts 中注册路由

---

**更多详情请查阅** `DESIGN_DECISIONS.md` 和 `specs/` 目录下的完整设计文档。
