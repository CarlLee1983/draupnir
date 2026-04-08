# Phase 2: Identity — 認證與帳戶 設計規格

> Draupnir v1 Phase 2
> 日期：2026-04-08

---

## 概述

Phase 2 完成完整的使用者身份管理系統，包含三大模組：

1. **Auth 補完** — 密碼重設（API-only）、RBAC 三角色
2. **User 模組** — Profile CRUD、帳戶管理
3. **Organization 模組** — 多租戶、成員管理、邀請機制

**建構順序**：Auth 補完 → User → Organization（循序建構，每步可獨立測試）

---

## 設計決策摘要

| 決策 | 選擇 | 理由 |
|------|------|------|
| 密碼重設 | API-only，之後加 Email | 降低初期複雜度 |
| RBAC | 固定三角色（ADMIN/MANAGER/MEMBER） | 符合 ROADMAP 需求，簡單明確 |
| 資料隔離 | 共享 DB + organization_id 過濾 | 適合初期，簡單有效 |
| 使用者 ↔ 組織 | 一對一 | 簡化權限模型 |
| 組織建立 | Admin 建立 + 指定 Manager | 集中管控 |
| User Profile | 完整版（display_name, avatar, phone, bio, timezone, locale, notification_preferences） | 一次到位 |
| 邀請機制 | 邀請連結（帶 token，未註冊者走註冊後自動加入） | 彈性最大 |

---

## 2.1 Auth 補完

### 密碼重設（API-only）

#### Domain

- **PasswordResetToken** Value Object：token 值、userId、過期時間（1 小時）、是否已使用
- `User` aggregate 新增 `resetPassword(newPassword)` 方法

#### Application Services

- **RequestPasswordResetService**：驗證 email 存在 → 產生 reset token → 存入 `IPasswordResetTokenRepository` → 回傳 token
- **ExecutePasswordResetService**：驗證 token 有效且未過期 → 呼叫 `user.resetPassword()` → 標記 token 已使用 → 撤銷該使用者所有既有 JWT

#### Repository

- **IPasswordResetTokenRepository**：`save()`, `findByToken()`, `markAsUsed()`, `deleteExpiredByUserId()`

#### API Endpoints

- `POST /api/auth/password-reset/request` — body: `{ email }` → 回傳 `{ token, expiresAt }`
- `POST /api/auth/password-reset/execute` — body: `{ token, newPassword, confirmPassword }`

### RBAC 三角色

#### Domain

- 重構 `Role` VO — 固定值 `ADMIN` / `MANAGER` / `MEMBER`（取代 ADMIN / USER）
- 重構 `Permission` VO — 預定義權限集：
  - **ADMIN**：全部權限
  - **MANAGER**：管理組織成員、檢視用量、管理 Key
  - **MEMBER**：管理自己的 Profile 和 Key
- **AuthorizationService** 補完：`hasPermission(user, permission): boolean`、`requirePermission(user, permission): void`（失敗拋 AppException）

#### Middleware

- **RoleMiddleware**：路由層級角色檢查，例如 `requireRole('ADMIN')`
- 整合到現有 `AuthMiddleware`，解析 JWT 後把 user + role 注入 context

---

## 2.2 User 模組

### Domain

**UserProfile Aggregate**（與 Auth 的 User 分離）：
- 欄位：`id`（與 Auth User 共用）、`displayName`、`avatarUrl`、`phone`、`bio`、`timezone`、`locale`、`notificationPreferences`（JSON）、`createdAt`、`updatedAt`
- Value Objects：`Phone`（格式驗證）、`Timezone`（合法時區驗證）、`Locale`（支援語系列表）
- 方法：`updateProfile(fields)` → 回傳新的 Profile 實例（immutable）

### Repository

- **IUserProfileRepository**：`findById()`, `save()`, `update()`, `findAll(filters, limit, offset)`, `count(filters)`

### Application Services

- **GetUserProfileService** — 取得自己或指定使用者的 Profile
- **UpdateUserProfileService** — 更新 Profile 欄位（部分更新），驗證輸入
- **ListUsersService** — Admin 專用，分頁 + 篩選（role、status、keyword 搜尋）
- **ChangeUserStatusService** — Admin 專用，啟用 / 停用帳戶

### API Endpoints

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| GET | `/api/users/me` | 已認證 | 取得自己的 Profile |
| PUT | `/api/users/me` | 已認證 | 更新自己的 Profile |
| GET | `/api/users` | ADMIN | 使用者列表（分頁） |
| GET | `/api/users/:id` | ADMIN | 取得指定使用者 |
| PATCH | `/api/users/:id/status` | ADMIN | 啟用 / 停用帳戶 |

### 跨模組協作

- User Profile 在註冊時自動建立（Auth 模組觸發），初始值為空白 Profile + email 作為 displayName
- `ChangeUserStatusService` 同時更新 Auth User status 和撤銷所有 Token（停用時）

---

## 2.3 Organization 模組

### Domain

**Organization Aggregate**：
- 欄位：`id`、`name`、`slug`、`description`、`status`（ACTIVE / SUSPENDED）、`createdAt`、`updatedAt`
- Value Objects：`OrgSlug`（格式驗證、唯一性）
- 方法：`update(fields)`、`suspend()`、`activate()`

**OrganizationMember Entity**：
- 欄位：`id`、`organizationId`、`userId`、`role`（MANAGER / MEMBER）、`joinedAt`
- 一個使用者只能屬於一個 Organization（user_id UNIQUE）

**OrganizationInvitation Entity**：
- 欄位：`id`、`organizationId`、`email`、`token`、`role`、`invitedByUserId`、`status`（PENDING / ACCEPTED / EXPIRED / CANCELLED）、`expiresAt`、`createdAt`
- 過期時間：7 天
- Token 存 hash，不存明文

### Repository

- **IOrganizationRepository**：`findById()`, `findBySlug()`, `save()`, `update()`, `findAll()`
- **IOrganizationMemberRepository**：`findByUserId()`, `findByOrgId()`, `save()`, `remove()`, `countByOrgId()`
- **IOrganizationInvitationRepository**：`save()`, `findByToken()`, `findByOrgId()`, `markAsAccepted()`, `cancelByOrgId()`, `deleteExpired()`

### Application Services

- **CreateOrganizationService** — Admin 建立 Organization + 指定 Manager
- **UpdateOrganizationService** — Admin 更新 Organization 資訊
- **ListOrganizationsService** — Admin 列表（分頁）
- **InviteMemberService** — Manager 產生邀請連結
- **AcceptInvitationService** — 驗證 token → 已註冊且無組織則加入；未註冊則提示先註冊
- **RemoveMemberService** — Manager 移除成員（不能移除自己、不能移除最後一個 Manager）
- **ListMembersService** — 組織成員列表
- **ChangeOrgMemberRoleService** — Admin 變更組織內成員角色

### API Endpoints

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| POST | `/api/organizations` | ADMIN | 建立 Organization |
| GET | `/api/organizations` | ADMIN | Organization 列表 |
| GET | `/api/organizations/:id` | ADMIN / 所屬成員 | Organization 詳情 |
| PUT | `/api/organizations/:id` | ADMIN | 更新 Organization |
| PATCH | `/api/organizations/:id/status` | ADMIN | 啟停 Organization |
| GET | `/api/organizations/:id/members` | MANAGER / ADMIN | 成員列表 |
| POST | `/api/organizations/:id/invitations` | MANAGER | 發送邀請 |
| GET | `/api/organizations/:id/invitations` | MANAGER | 邀請列表 |
| DELETE | `/api/organizations/:id/invitations/:invId` | MANAGER | 取消邀請 |
| POST | `/api/invitations/:token/accept` | 已認證 | 接受邀請 |
| DELETE | `/api/organizations/:id/members/:userId` | MANAGER / ADMIN | 移除成員 |
| PATCH | `/api/organizations/:id/members/:userId/role` | ADMIN | 變更成員角色 |

### 跨模組協作

- 建立 Organization 時驗證 Manager userId 存在（查 Auth Repository）
- 接受邀請時檢查使用者是否已屬於其他 Organization（一對一限制）
- Organization 停用時，所屬成員的 API Key 也應受影響（Phase 3 串接）

---

## 資料庫 Schema

### users（修改既有）

| 欄位 | 型別 | 備註 |
|------|------|------|
| id | TEXT PK | |
| name | TEXT | |
| email | TEXT UNIQUE | |
| password_hash | TEXT | |
| role | TEXT | 'ADMIN' / 'MANAGER' / 'MEMBER'（原 'USER' → 'MEMBER'） |
| status | TEXT | 'ACTIVE' / 'INACTIVE' / 'SUSPENDED' |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### user_profiles（新增）

| 欄位 | 型別 | 備註 |
|------|------|------|
| id | TEXT PK | = users.id |
| display_name | TEXT | |
| avatar_url | TEXT | |
| phone | TEXT | |
| bio | TEXT | |
| timezone | TEXT | default: 'Asia/Taipei' |
| locale | TEXT | default: 'zh-TW' |
| notification_preferences | TEXT | JSON |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### password_reset_tokens（新增）

| 欄位 | 型別 | 備註 |
|------|------|------|
| id | TEXT PK | |
| user_id | TEXT FK | → users.id |
| token_hash | TEXT UNIQUE | |
| used | INTEGER | 0/1 |
| expires_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

### organizations（新增）

| 欄位 | 型別 | 備註 |
|------|------|------|
| id | TEXT PK | |
| name | TEXT | |
| slug | TEXT UNIQUE | |
| description | TEXT | |
| status | TEXT | 'ACTIVE' / 'SUSPENDED' |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### organization_members（新增）

| 欄位 | 型別 | 備註 |
|------|------|------|
| id | TEXT PK | |
| organization_id | TEXT FK | → organizations.id |
| user_id | TEXT UNIQUE FK | → users.id（UNIQUE 確保一對一） |
| role | TEXT | 'MANAGER' / 'MEMBER' |
| joined_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

### organization_invitations（新增）

| 欄位 | 型別 | 備註 |
|------|------|------|
| id | TEXT PK | |
| organization_id | TEXT FK | → organizations.id |
| email | TEXT | |
| token_hash | TEXT UNIQUE | |
| role | TEXT | 'MANAGER' / 'MEMBER' |
| invited_by_user_id | TEXT FK | → users.id |
| status | TEXT | 'PENDING' / 'ACCEPTED' / 'EXPIRED' / 'CANCELLED' |
| expires_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

### 遷移策略

- 既有 users 表 role 欄位：`USER` → `MEMBER` 資料遷移
- 為每個既有使用者自動建立空白 `user_profiles` 記錄
- 所有 token 存 hash（不存明文）

---

## DDD 模組結構

每個模組遵循既有的 Health / Auth 模組結構：

```
src/Modules/<Module>/
├── Domain/
│   ├── Aggregates/
│   ├── ValueObjects/
│   ├── Repositories/
│   └── Services/
├── Application/
│   ├── DTOs/
│   └── Services/
├── Infrastructure/
│   ├── Repositories/
│   └── Providers/
├── Presentation/
│   ├── Controllers/
│   └── Routes/
├── __tests__/
└── index.ts
```

---

## 測試策略

每個模組需要：

1. **Domain 層單元測試** — Aggregate 方法、Value Object 驗證
2. **Application 層整合測試** — Service 搭配 MemoryDatabaseAccess
3. **API 層測試** — Controller + Routes 端對端流程
4. **跨模組測試** — 註冊 → 建立 Profile → 加入 Organization 完整流程

目標覆蓋率：80%+
