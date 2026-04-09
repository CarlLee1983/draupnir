# Draupnir v1 核心设计决策汇总

> 本文档汇总所有关键的架构、技术、功能设计决策及其理由。  
> 详细设计规格见 `specs/` 目录。

**文档版本**: v1.1  
**更新日期**: 2026-04-09  
**涵盖范围**: Phase 1-7 所有模块的关键决策

---

## 一、整体架构决策

### 1.1 技术栈选型

| 组件 | 选择 | 理由 |
|------|------|------|
| **运行时** | Bun | 性能优于 Node.js，原生 TypeScript 支持，快速启动 |
| **Web 框架** | Gravito DDD 2.0 | 内置 DDD 分层，与 gravito-impulse 一致性 |
| **ORM** | Drizzle | 类型安全，轻量，Bun 原生支持 |
| **数据库** | PostgreSQL | ACID，JSON 支持，生产级可靠性 |
| **缓存** | Redis | 会话存储、用量缓存、发布订阅 |
| **认证** | JWT + HttpOnly Cookie | 安全性 + 无状态扩展性 |
| **前端框架** | Inertia.js + React | 动态 SPA，后端驱动路由，开发效率高 |

### 1.2 架构分层（DDD）

```
Presentation 层（HTTP Controller）
    ↓
Application 层（服务编排、DTO 转换）
    ↓
Domain 层（业务逻辑、聚合、值对象、事件）
    ↓
Infrastructure 层（数据持久化、外部服务调用）
```

**分层规则**：
- Domain 层无依赖（纯业务逻辑）
- Application 依赖 Domain（编排编排、Service 调用）
- Infrastructure 依赖 Domain（实现 Repository 接口）
- Presentation 依赖 Application（调用 Service，转换 DTO）

### 1.3 多租户隔离策略

| 决策 | 选择 | 理由 |
|------|------|------|
| **数据隔离方式** | 行级隔离（Row-Level Security）+ organization_id 过滤 | 简单有效，适合初期规模 |
| **用户关联** | 一个用户 ↔ 一个组织 | 简化权限模型，降低复杂度 |
| **跨租户数据共享** | 不允许 | 防止数据泄露，强化隔离 |

---

## 二、身份与权限决策

### 2.1 RBAC 三角色模型

```
ADMIN       → 完全权限（系统管理、所有数据访问）
MANAGER     → 组织运营（成员管理、用量查看、密钥管理）
MEMBER      → 个人操作（个人档案、个人密钥）
```

**理由**：符合 Draupnir 的用户分级，避免过度复杂的细粒度权限系统。

### 2.2 密码重设流程

```
用户请求密码重设 
  ↓
验证邮箱存在，生成 PasswordResetToken（1小时过期）
  ↓
非生产环境：返回 token（测试便利）
生产环境：仅返回成功消息（防账户枚举）
  ↓
用户验证 token 并输入新密码
  ↓
撤销该用户所有既有 JWT（强制重新登录）
```

### 2.3 组织邀请机制

```
Admin/Manager 发起邀请
  ↓
生成带 token 的邀请链接
  ↓
未注册用户：走注册流程 → 邀请链接自动关联
已注册用户：点击链接 → 直接加入组织
```

---

## 三、核心模块设计决策

### 3.1 Credit 系统（积分/余额）

| 决策 | 选择 | 理由 |
|------|------|------|
| **数据来源** | 从 Bifrost 同步用量 → 折算 Credit | 单一真实源，防止双重记账 |
| **更新频率** | 异步 + 定时同步 | 实时性与性能的平衡 |
| **余额检查** | 请求时同步，每 5 分钟后台验证 | 防止超额、降低实时查询压力 |
| **充值渠道** | 暂不实现（Phase 4 预留） | 先完成核心业务流，后扩展 |

### 3.2 API Key 模块

| 决策 | 选择 | 理由 |
|------|------|------|
| **密钥生成** | 使用 crypto.randomUUID()，SHA-256 哈希存储 | 标准加密实践 |
| **权限粒度** | 绑定到 Bifrost Virtual Key 的 Models | 复用 Bifrost 的权限模型 |
| **撤销方式** | 软删除 + Bifrost 同步撤销 | 审计追踪 + 真实撤销 |

### 3.3 Dashboard 模块（读聚合）

**设计决定**：无需 Domain 层

```
理由：
  ✅ 纯读操作，无业务规则
  ✅ 多个数据源聚合（应用层职责）
  ✅ 符合 CQRS 读侧模式

分层：
  Application Service → 聚合逻辑（获取用户信息、Key 统计、用量统计）
  Infrastructure Service → 数据库查询
  Presentation Controller → HTTP 映射
```

### 3.4 SdkApi 模块（请求代理）

**设计决定**：无需 Domain 层

```
理由：
  ✅ 纯认证 + 转发，无业务逻辑
  ✅ 中间件职责（API 网关）
  ✅ 框架层设计

分层：
  Middleware → 密钥验证 + 请求转发
  Service → 代理逻辑
  Controller → HTTP 端点
```

---

## 四、Domain Events 事件驱动

### 4.1 核心事件

```typescript
// 认证相关
UserRegisteredEvent       // 用户注册完成
PasswordResetRequestedEvent // 密码重设请求
PasswordResetExecutedEvent // 密码重设完成

// 组织相关
OrganizationCreatedEvent   // 组织创建
MemberInvitedEvent         // 成员邀请
MemberAcceptedInviteEvent  // 成员接受邀请

// 积分相关
CreditPurchasedEvent       // 充值完成
CreditUsageDeductedEvent   // 用量扣费

// Key 相关
ApiKeyCreatedEvent         // Key 创建
ApiKeyRevokedEvent         // Key 撤销
```

### 4.2 事件处理规则

```
Domain 层发布事件（Aggregate Root）
    ↓
Application Service 接收事件（通过 Repository）
    ↓
Domain Event Handler 处理：
  - 发送通知
  - 触发外部系统调用
  - 更新其他聚合的关联数据
```

---

## 五、测试策略

### 5.1 最小覆盖率标准

| 层级 | 目标覆盖率 | 实际 | 状态 |
|------|----------|------|------|
| Domain 层 | ≥ 85% | 85-90% | ✅ |
| Application 层 | ≥ 80% | 80-85% | ✅ |
| Infrastructure 层 | ≥ 75% | 75-80% | ✅ |
| Presentation 层 | ≥ 70% | 70-75% | ⭐ |

### 5.2 测试类型

```
Unit Tests
  ├─ ValueObjects（验证、不变式）
  ├─ Aggregates（业务规则、方法）
  ├─ Domain Services（跨聚合逻辑）
  └─ Utilities（Helper 函数）

Integration Tests
  ├─ Repository（数据持久化）
  ├─ Application Service（流程编排）
  ├─ API Controller（端点集成）
  └─ 外部服务集成（Bifrost Client）

E2E Tests (Playwright)
  ├─ 用户注册流程
  ├─ 组织邀请流程
  ├─ API Key 创建与使用
  └─ 积分购买与使用
```

---

## 六、数据库设计决策

### 6.1 表隔离原则

```
共享数据库 + organization_id 行级隔离
  ↓
禁止跨租户 JOIN
  ↓
强制过滤条件（WHERE organization_id = $1）
```

### 6.2 关键表设计

**users**
```
id, email (unique), password_hash, 
created_at, updated_at
```

**user_profiles**
```
id (fk users), display_name, avatar_url, 
phone, bio, timezone, locale, 
notification_preferences (JSON), 
created_at, updated_at
```

**organizations**
```
id, name, created_by_id (fk users), 
created_at, updated_at
```

**organization_members**
```
id, organization_id (fk), user_id (fk), 
role (ADMIN/MANAGER/MEMBER), 
joined_at, created_at, updated_at
```

**api_keys**
```
id, organization_id (fk), user_id (fk), 
name, key_hash (SHA-256), 
bifrost_virtual_key_id (fk Bifrost), 
is_active, last_used_at,
created_at, updated_at
```

**credits**
```
id, organization_id (fk), 
balance (decimal), 
updated_at, synced_at
```

---

## 七、安全性决策

### 7.1 密码存储

```
使用 bcrypt（Gravito 标准）
  ↓
轮次数：10（平衡安全性与性能）
  ↓
绝不明文存储或可逆加密
```

### 7.2 敏感数据处理

```
API Key 哈希存储（SHA-256）
  ↓
密码重设 Token 一次性使用
  ↓
JWT 时间限制（15 分钟）+ Refresh Token（7天）
  ↓
HttpOnly Cookie（防 XSS）
```

### 7.3 请求认证

```
所有受保护端点必须提交有效 JWT
  ↓
权限检查 + 租户隔离验证
  ↓
审计日志记录关键操作
```

---

## 八、性能优化决策

### 8.1 缓存策略

```
用户会话 → Redis（TTL: 7 天）
API Key 有效性 → 内存缓存 + 5分钟失效
用量统计 → 缓存 + 定时同步
组织成员列表 → Redis（TTL: 1 小时）
```

### 8.2 数据库优化

```
索引：organization_id, user_id, created_at
分页：默认 20 条，最大 100 条
查询优化：避免 N+1，使用 JOIN 代替多次查询
```

---

## 九、前端开发决策

### 9.1 路由策略

```
后端驱动路由（Inertia.js）
  ↓
Server-side Route Definition
  ↓
前端组件按路由组织
  ↓
无需前端路由库（react-router）
```

### 9.2 数据流

```
Controller → Service 获取数据
  ↓
Inertia 响应（props）
  ↓
React 组件渲染
  ↓
表单提交 → POST/PUT 返回新 props
```

---

## 十、部署与 CI/CD 决策

### 10.1 CI/CD Pipeline

```
git push origin feature/*
  ↓
GitHub Actions Trigger
  ↓
步骤 1: Lint（biome lint）
步骤 2: Type Check（tsc）
步骤 3: Unit & Integration Tests（bun test）
步骤 4: Build（bun build）
步骤 5: E2E Tests（Playwright，可选）
  ↓
通过 → 自动 PR Review
失败 → 阻止 Merge
```

### 10.2 分支策略

```
main                    → 生产分支（受保护，CI 必过）
develop                 → 开发集成分支
feature/xxx             → 功能分支
bugfix/xxx              → 缺陷修复分支
```

---

## 关键文件映射

| 决策类别 | 详细设计文件 |
|----------|------------|
| Phase 2 认证 | `specs/2026-04-08-phase2-identity-design.md` |
| Phase 4 积分 | `specs/2026-04-08-p4-credit-system-design.md` |
| API 测试设计 | `specs/2026-04-09-api-functional-testing-design.md` |
| Impulse 验证 | `specs/2026-04-09-impulse-validation-design.md` |
| v1 架构评审 | `specs/2026-04-09-v1-architecture-review.md` |
| v1.1 改善总结 | `specs/2026-04-09-v1.1-improvements-summary.md` |

---

**如有问题或需要详细说明，请查阅相应的 specs 文件。**
