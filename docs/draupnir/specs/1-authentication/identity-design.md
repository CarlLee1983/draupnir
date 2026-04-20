# Phase 2: Identity — 認證與帳戶 設計規格

> Draupnir v1 Phase 2
> 初稿日期：2026-04-08
> **最後審閱：** 2026-04-20（對照 `src/Modules/Auth`、`Profile`、`Organization` 與 `src/Website/Auth`）

---

## 概述

Phase 2 完成完整的使用者身份管理系統，包含三大模組：

1. **Auth 補完** — 密碼重設、RBAC 三角色
2. **Profile 模組**（本文件原稱 User 模組）— Profile CRUD、帳戶管理
3. **Organization 模組** — 多租戶、成員管理、邀請機制

**建構順序**：Auth 補完 → Profile → Organization（循序建構，每步可獨立測試）

### 實作對照（目錄）

| 規格區塊 | 程式位置 |
|----------|----------|
| Auth | `src/Modules/Auth/` |
| Profile（User 規格） | `src/Modules/Profile/` |
| Organization | `src/Modules/Organization/` |
| 密碼重設頁 | `src/Website/Auth/`（`/forgot-password`、`/reset-password/:token`） |
| 租戶 Header | `OrganizationMiddleware`：`X-Organization-Id` 等，見 `requireOrganizationContext()` |

---

## 設計決策摘要

| 決策 | 選擇 | 理由／實作註記（2026-04-20） |
|------|------|------------------------------|
| 密碼重設 | **Inertia 網頁流程** + `ForgotPasswordService`／`ResetPasswordService` + Email | 非以 `POST /api/auth/password-reset/*` JSON 為主介面；見 §2.1 |
| RBAC | 三角色 **`admin`／`manager`／`member`**（`Role` VO，小寫字串） | `createRoleMiddleware('admin')` 等；**未**獨立實作規格草稿中的 `Permission` VO／`AuthorizationService` 權限矩陣 |
| 資料隔離 | 共享 DB + `organization_id` + 成員資格檢查 | `OrgAuthorizationHelper` |
| 使用者 ↔ 組織 | **多組織成員**（非一對一） | `organization_members` 可有多筆相同 `user_id`；並以 **partial unique index** 限制每位使用者最多一筆 **manager** 成員資格。部分 API 仍透過 `findByUserId` 取得「單一」列，與多組織並存時語意需留意 |
| 組織建立 | 已登入可建立 + 指派 manager | `POST /api/organizations` 使用 `requireAuth()`（**非**僅 admin）；列表仍 `admin` |
| User Profile | `user_profiles` + `UserProfile` | 見 `Profile` 模組與遷移 |
| 邀請 | token／id 接受或拒絕 | 見 `organization.routes.ts`（含 `accept-by-id`、`decline`） |

---

## 2.1 Auth 補完

### 密碼重設

#### Domain

- **PasswordResetToken** Value Object：`PasswordResetToken`（email、過期、used 等）
- 重設流程由 **ResetPasswordService** 與 **User**／**Hasher** 協作（見 `src/Modules/Auth/Application/Services/`）

#### Application Services（實作名稱）

- **ForgotPasswordService**：驗證 email → 建立 token → `IPasswordResetRepository` → `IEmailService.sendPasswordReset(..., resetUrl)`
- **ResetPasswordService**：依 token 驗證 → 更新密碼 → 標記已使用 → 撤銷既有 JWT（見服務實作）

#### Repository

- **IPasswordResetRepository**／**PasswordResetRepository**：表 **`password_reset_tokens`**（`id` 即 token 字串便於查詢；見 repository 註解）

#### HTTP 介面（實際）

- **網頁（Inertia）**（主要）  
  - `GET/POST /forgot-password` — `ForgotPasswordRequest`  
  - `GET/POST /reset-password/:token` — `ResetPasswordRequest`  
  定義於 `src/Website/Auth/routes/registerAuthRoutes.ts`，頁面於 `src/Website/Auth/Pages/`。
- **規格草稿中的 JSON API**（`POST /api/auth/password-reset/request`／`execute`）**未作為主要對外契約**；若未來要給純 API 客戶端使用，需另列 OpenAPI 並與現有流程統一。

### RBAC 三角色

#### Domain

- **`Role` VO**：`RoleType` 為 **`admin`／`manager`／`member`**（小寫字串，見 `Role.ts`）
- **Permission VO／AuthorizationService**：規格草稿中的細粒度權限矩陣 **尚未** 以獨立 `Permission` + `AuthorizationService` 落地；目前以 **路由 Middleware**（`createRoleMiddleware`）+ **組織內角色**（`OrgMemberRole`）分工。

#### Middleware

- **`RoleMiddleware` 模組**（`RoleMiddleware.ts`）：`requireAuth`、`createRoleMiddleware('admin' | 'manager' | 'member')`、`attachJwt`
- **AuthMiddleware**：解析 JWT，將 userId／role 放入 context

---

## 2.2 Profile 模組（規格原「User 模組」）

**程式模組目錄：** `src/Modules/Profile/`

### Domain

**UserProfile Aggregate**（與 Auth 的 User 分離）：
- 欄位：使用者識別與 `displayName`、`avatarUrl`、`phone`、`bio`、`timezone`、`locale`、`notificationPreferences`（JSON）、`createdAt`、`updatedAt`（**持久層**可能為 `user_id` + 獨立 `id`，見 `UserProfile`／mapper）
- Value Objects：`Phone`（格式驗證）、`Timezone`（合法時區驗證）、`Locale`（支援語系列表）
- 方法：`updateProfile(fields)` → 回傳新的 Profile 實例（immutable）

### Repository

- **IUserProfileRepository**：`findById()`, `save()`, `update()`, `findAll(filters, limit, offset)`, `count(filters)`

### Application Services（實作名稱）

- **GetProfileService**、**UpdateProfileService** — Profile 讀寫
- **ListUsersService**、**ChangeUserStatusService** — 實作於 **`src/Modules/Auth/`**，由 **`ProfileController`** 暴露（見該檔案註解：管理操作統一走 Profile 路由）

### API Endpoints

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| GET | `/api/users/me` | 已認證 | 取得自己的 Profile |
| PUT | `/api/users/me` | 已認證 | 更新自己的 Profile |
| GET | `/api/users` | **admin**（`createRoleMiddleware('admin')`） | 使用者列表（分頁） |
| GET | `/api/users/:id` | **admin** | 取得指定使用者 |
| PATCH | `/api/users/:id/status` | **admin** | 啟用 / 停用帳戶 |

### 跨模組協作

- User Profile 在註冊時**原子性**建立（Auth 模組觸發）。若 Profile 建立失敗，Auth User 會回滾刪除，確保不會產生孤兒記錄。初始值為空白 Profile + email 作為 displayName。
- `ChangeUserStatusService` 同時更新 Auth User status 和撤銷所有 Token（停用時）

---

## 2.3 Organization 模組

### Domain

**Organization Aggregate**：
- 欄位：`id`、`name`、`slug`、`description`、`status`（ACTIVE / SUSPENDED）、`createdAt`、`updatedAt`
- Value Objects：`OrgSlug`（格式驗證、唯一性）
- 方法：`update(fields)`、`suspend()`、`activate()`

**OrganizationMember Entity**：
- 欄位：`id`、`organizationId`、`userId`、`role`（org-level **manager** / **member** 等）、`joinedAt`
- **多組織**：同一 `user_id` 可有多筆 membership；資料層以 **partial unique index** 限制每位使用者至多一筆 **manager** 角色（見遷移 `uniq_org_manager_per_user`）。舊版「user_id UNIQUE」敘述已廢棄。

**OrganizationInvitation Entity**：
- 欄位：`id`、`organizationId`、`email`、`token`、`role`、`invitedByUserId`、`status`（PENDING / ACCEPTED / EXPIRED / CANCELLED）、`expiresAt`、`createdAt`
- 過期時間：7 天
- Token 存 hash，不存明文

### Repository

- **IOrganizationRepository**：`findById()`, `findBySlug()`, `save()`, `update()`, `findAll()`
- **IOrganizationMemberRepository**：`findByUserId()`, `findByOrgId()`, `save()`, `remove()`, `countByOrgId()`
- **IOrganizationInvitationRepository**：`save()`, `findByToken()`, `findByOrgId()`, `markAsAccepted()`, `cancelByOrgId()`, `deleteExpired()`

### Application Services

- **CreateOrganizationService** — 已登入使用者建立 Organization + 指定 Manager（未必為系統 Admin）
- **UpdateOrganizationService** — Admin 更新 Organization 資訊
- **ListOrganizationsService** — Admin 列表（分頁）
- **InviteMemberService** — Manager 產生邀請連結
- **AcceptInvitationService** — 驗證 token → 已註冊且無組織則加入；未註冊則提示先註冊
- **RemoveMemberService** — Manager 移除成員（不能移除自己、不能移除最後一個 Manager）
- **ListMembersService** — 組織成員列表
- **ChangeOrgMemberRoleService** — Admin 變更組織內成員角色

### API Endpoints（與 `organization.routes.ts` 對照；角色字串小寫）

| Method | Path | 權限 | 說明 |
|--------|------|------|------|
| POST | `/api/organizations` | **已認證** | 建立 Organization（**非**僅 admin；見 `CreateOrganizationService`） |
| GET | `/api/organizations` | **admin** | Organization 列表 |
| GET | `/api/organizations/:id` | **`requireOrganizationContext`** | 詳情（需 **`X-Organization-Id`** 等；**系統 admin** 可不通過成員檢查，見 `OrgAuthorizationHelper`） |
| PUT | `/api/organizations/:id` | **admin** | 更新 Organization |
| PATCH | `/api/organizations/:id/status` | **admin** | 啟停 Organization |
| GET | `/api/organizations/:id/members` | **`requireOrganizationContext`** | 成員列表 |
| POST | `/api/organizations/:id/invitations` | **`requireOrganizationContext`** | 發送邀請 |
| GET | `/api/organizations/:id/invitations` | **`requireOrganizationContext`** | 邀請列表 |
| DELETE | `/api/organizations/:id/invitations/:invId` | **`requireOrganizationContext`** | 取消邀請 |
| POST | `/api/invitations/:token/accept` | 已認證 | 接受邀請（token） |
| POST | `/api/invitations/:id/accept-by-id` | 已認證 | 依邀請 **id** 接受 |
| POST | `/api/invitations/:id/decline` | 已認證 | 拒絕邀請 |
| DELETE | `/api/organizations/:id/members/:userId` | **`requireOrganizationContext`** | 移除成員 |
| PATCH | `/api/organizations/:id/members/:userId/role` | **admin** + **`requireOrganizationContext`** | 變更成員角色 |

### 租戶隔離授權

- **OrgAuthorizationHelper** — 統一的租戶隔離檢查
- **HTTP 層**：`requireOrganizationContext()` 自 **`X-Organization-Id`**（大小寫相容）或路由參數取得 org，再驗證成員資格；缺 header／非成員 → 400／403
- 系統 **admin** 可依 helper 規則跨組織（見實作）

### 跨模組協作

- 建立 Organization 時驗證 Manager userId 存在（查 Auth Repository）
- 接受邀請時檢查是否**已為該組織成員**等規則（見 `OrgInvitationRules`／`AcceptInvitation*Service`）；**非**「全系統僅能加入一個組織」的一對一模型
- 接受邀請時驗證接受者 email 與邀請 email 一致（防止 token 被他人冒用）
- Organization 停用時，所屬成員的 API Key 也應受影響（Phase 3 串接）

---

## 資料庫 Schema

### users（修改既有）

| 欄位 | 型別 | 備註 |
|------|------|------|
| id | TEXT PK | |
| email | TEXT UNIQUE | |
| password | TEXT | 密碼雜湊（欄位名 **`password`**，見 `2026_04_08_000001_create_users_table`） |
| role | TEXT | 應用層為 **`admin`／`manager`／`member`**（`Role` VO）；初建表預設曾為 `user`，以遷移／種子調整為準 |
| status | TEXT | 如 `active`／`inactive` 等（小寫） |
| created_at、updated_at | TIMESTAMP | `timestamps()` |

（若後續 migration 新增 `name`、`google_id` 等，以倉庫遷移為準。）

### user_profiles（新增）

| 欄位 | 型別 | 備註 |
|------|------|------|
| id | TEXT PK | |
| user_id | TEXT | 關聯 users（初版 migration）；與規格「id = users.id」二擇一語意請以 **Domain／Mapper** 為準 |
| display_name | TEXT | |
| avatar_url | TEXT | |
| bio | TEXT | |
| timezone | TEXT | 預設例：`UTC`（初版 migration） |
| phone、locale、notification_preferences | 見 `2026_04_15_000001_add_phone_locale_notification_to_user_profiles` | |
| created_at、updated_at | TIMESTAMP | |

### password_reset_tokens（新增）

| 欄位 | 型別 | 備註 |
|------|------|------|
| id | TEXT PK | **即 token 字串**（與 `PasswordResetRepository` 註解一致） |
| email | TEXT | |
| expires_at | TEXT／TIMESTAMP | |
| used | BOOLEAN | 預設 false |

（無獨立 `user_id` FK；見 `2026_04_14_000002_create_password_reset_tokens_table`。）

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
| user_id | TEXT FK | → users.id（**非**全域 UNIQUE；同一使用者可屬多組織） |
| role | TEXT | org-level **`manager`**／**`member`** 等（小寫） |
| joined_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

另：**partial unique index** `uniq_org_manager_per_user` 限制每位使用者最多一筆 `role = manager` 的列（見 `2026_04_15_000002_add_unique_org_manager_per_user`）。

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

- 依序執行倉庫 `database/migrations/*`；角色／狀態字串以 **小寫**與應用層 `Role` 一致為目標
- 為使用者建立 **`user_profiles`**（見 `create_user_profiles` 相關遷移）
- 密碼重設 token 由 **`password_reset_tokens`** 儲存；邀請 token 使用 **`token_hash`**（邀請表）

---

## DDD 模組結構

每個模組遵循既有的 Health / Auth 模組結構：

```
src/Modules/<Module>/     # 實作於 src/（規格草稿中的 app/ 僅為概念路徑）
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

目標覆蓋率：80%+（全專案門檻見根目錄 `bunfig.toml`、CI `unit-coverage`）
