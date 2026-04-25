# 2. 用戶與組織管理

> 用戶資料、個人設定、組織管理、多租戶模型

## 📄 規格文檔

### [Phase 2: Identity — Profile & Organization 詳細設計](../1-authentication/identity-design.md)

完整欄位、路由表、Schema 與實作對照以 [identity-design.md](../1-authentication/identity-design.md)（**最後審閱 2026-04-20**）為準。以下為快速索引：

#### 組織與成員規格 — [Organization Spec](./organization-spec.md)

**用途**：機械可驗收的 Organization 規格，聚焦路由、授權、不變式與 middleware 行為；作為後續 acceptance / spec-planning 的對齊基準。

| 項目 | 內容 |
|------|------|
| **範圍** | 組織建立、查詢、狀態變更、成員管理、邀請流程、上下文 middleware |
| **對齊原則** | 以現行程式行為為準；若未來放寬成員／組織關係，需同步修訂此文件 |
| **相關模組** | `Organization`、`Auth`（系統角色 / JWT）、`ApiKey`（後續依賴組織上下文） |

#### 2.2 Profile 模組 — [詳細設計](../1-authentication/identity-design.md#22-profile-模組規格原user-模組)

**職責**：用戶個人資料與（管理員）帳戶管理

| 項目 | 內容 |
|------|------|
| **程式位置** | `src/Modules/Profile/` |
| **Domain** | `UserProfile` Aggregate；`Phone`／`Timezone`／`Locale` 等 VO |
| **Repository** | `IUserProfileRepository` |
| **Services** | `GetProfileService`、`UpdateProfileService`；`ListUsersService`、`ChangeUserStatusService` 實作於 **Auth**，由 **`ProfileController`** 暴露 |
| **API** | `GET/PUT /api/users/me`、`GET /api/users`、`GET /api/users/:id`、`PATCH /api/users/:id/status`（`profile.routes.ts`） |

#### 2.3 Organization 模組 — [詳細設計](../1-authentication/identity-design.md#23-organization-模組)

**職責**：多租戶組織、成員管理、邀請與組織內角色；API 前綴為 **`/api/organizations`**（非 `/api/orgs`）

| 項目 | 內容 |
|------|------|
| **Domain** | `Organization` Aggregate；**`OrganizationMember`**、**`OrganizationInvitation`** Entity；組織內角色 **`OrgMemberRole`：`manager`／`member`**（兩級；**無** OWNER／ADMIN／MEMBER 命名） |
| **Repository** | `IOrganizationRepository`、`IOrganizationMemberRepository`、`IOrganizationInvitationRepository` |
| **Services** | `CreateOrganizationService`、`ListMembersService`、`InviteMemberService`、`RemoveMemberService`、`ChangeOrgMemberRoleService` 等（見模組目錄） |
| **租戶上下文** | 客戶端帶 **`X-Organization-Id`**；`requireOrganizationContext()` |
| **API（摘）** | `POST/GET /api/organizations`、`GET/PUT/PATCH …/organizations/:id`、`GET …/members`、`POST/GET …/invitations`、`PATCH …/members/:userId/role`、`POST /api/invitations/...`（`organization.routes.ts`） |

#### 組織合約與 API Key 配額 — [合約額度與配發規格](../2026-04-16-contract-quota-allocation-spec.md)

**職責摘要**：組織合約上限（可配發至各 API Key 之總池）、未分配池、Admin 調降、Manager 重配、硬擋與通知。與 Credit／計費、API Key 模組之銜接見該規格及 [3-api-keys](../3-api-keys/README.md)。

---

## 🏗️ 實現狀態

### ✅ 已完成的功能

**Profile**
- ✅ Get 自己的 Profile（`GET /api/users/me`）
- ✅ Update Profile（`PUT /api/users/me`，部分更新）
- ✅ Admin List 用戶（分頁 + 篩選）、`GET /api/users/:id`
- ✅ 啟用/停用帳戶（`PATCH /api/users/:id/status`）
- ✅ 完整個人資訊（displayName, avatar, phone, bio, timezone, locale）
- ✅ 通知偏好設定（JSON 儲存）

**Organization**
- ✅ 組織建立／列表／取得／更新／狀態（`/api/organizations`…）
- ✅ 租戶上下文（`X-Organization-Id`）與前端組織切換
- ✅ 成員邀請（邀請 Token／accept-by-id／decline）
- ✅ 成員角色 **`manager`／`member`**（`ChangeOrgMemberRoleService`）
- ✅ 成員移除、成員與邀請列表

### 📊 核心資料模型

#### User Profile
```
UserProfile Aggregate
├── id (UUID)
├── displayName (string)
├── avatarUrl (URL)
├── phone (Phone VO)
├── bio (string)
├── timezone (Timezone VO)
├── locale (Locale VO)
├── notificationPreferences (JSON)
├── createdAt (timestamp)
└── updatedAt (timestamp)
```

#### Organization（Aggregate 不含內嵌成員陣列；成員／邀請為獨立 Entity／表）
```
Organization Aggregate
├── id (UUID)
├── name (string)
├── slug (OrgSlug VO，可由名稱生成)
├── description (string)
├── status (active | suspended)
├── gatewayTeamId (string | null，Bifrost Team 連結)
├── createdAt (timestamp)
└── updatedAt (timestamp)

OrganizationMember Entity（持久化於獨立表）
├── id, organizationId, userId
├── role (OrgMemberRole: manager | member)
└── …

OrganizationInvitation Entity
├── id, organizationId, token, email（等）
├── role（邀請生效後的組織內角色）
├── status／expiresAt 等
└── …
```

---

## 🔗 相關文檔

### 相關規格
- **認證與身份管理** → [1-authentication](../1-authentication/)
- **API 金鑰管理**（與 Organization 關聯） → [3-api-keys](../3-api-keys/)
- **合約與模組**（與 Organization 關聯） → [0-planning](../0-planning/)

### 實現模組位置
```
src/Modules/
├── Profile/
│   ├── Domain/
│   │   ├── Aggregates/UserProfile
│   │   ├── ValueObjects/Phone, Timezone, Locale
│   │   └── Repositories/IUserProfileRepository
│   ├── Application/
│   │   └── Services/GetProfileService, UpdateProfileService, …
│   ├── Infrastructure/
│   │   └── Repositories/UserProfileRepository
│   ├── Presentation/
│   │   ├── Controllers/ProfileController
│   │   └── Routes/profile.routes.ts
│   └── __tests__/
│
├── Organization/
│   ├── Domain/
│   │   ├── Aggregates/Organization
│   │   ├── Entities/OrganizationMember, OrganizationInvitation
│   │   ├── ValueObjects/OrgSlug, OrgMemberRole
│   │   └── Repositories/IOrganizationRepository, IOrganizationMemberRepository, …
│   ├── Application/
│   │   └── Services/CreateOrganizationService, ListMembersService, InviteMemberService, …
│   ├── Infrastructure/
│   │   └── Repositories/*Repository
│   ├── Presentation/
│   │   ├── Controllers/OrganizationController
│   │   ├── Middleware/OrganizationMiddleware（X-Organization-Id）
│   │   └── Routes/organization.routes.ts
│   └── __tests__/
```

---

## 🧪 驗收標準

### Profile 模組
- [ ] 用戶可查看自己的 Profile ✅
- [ ] 用戶可更新自己的 Profile ✅
- [ ] Admin 可列表所有用戶（分頁+篩選）、依 id 取得用戶 ✅
- [ ] Admin 可啟用/停用帳戶（`PATCH …/status`） ✅
- [ ] 完整個人資訊欄位支援 ✅
- [ ] 單元測試覆蓋率門檻：`bunfig.toml` `coverageThreshold = 0.8`，CI job `unit-coverage` ✅

### Organization 模組
- [ ] 可建立組織（創建者為 `manager`） ✅
- [ ] 可列出／取得組織（含租戶上下文） ✅
- [ ] 可邀請成員、接受／拒絕邀請 ✅
- [ ] 可變更成員組織內角色（`manager`／`member`） ✅
- [ ] 可移除成員 ✅
- [ ] 成員與邀請列表 ✅
- [ ] 單元測試覆蓋率門檻同上 ✅

---

## 📌 設計決策記錄

### 用戶 ↔ 組織：多對多
**決策**：用戶可屬於多個組織；請求需帶 **`X-Organization-Id`** 以解析租戶上下文（見 `identity-design.md`、Organization 中介層）。

### 邀請機制：Token + API
**決策**：邀請以 `OrganizationInvitation` + token／id 驅動；接受／拒絕走專用 API（見 `organization.routes.ts`）。

### 組織 Slug
**決策**：`OrgSlug` 可由組織名稱生成並保證唯一；詳見模組與 identity 文檔。

### 組織內成員角色：兩層級
**決策**：**`manager`／`member`**（`OrgMemberRole`）
- **manager**：組織管理（含邀請、成員角色變更等，依路由與規則）
- **member**：一般成員

**平台級角色**（`admin` 等）屬 **Auth／全域**，與組織內 `manager`／`member` 分層（見 identity-design）。

---

## 🚀 後續與擴展

### V1.1 計劃
- 邀請 Email 通知
- 組織層級審計日誌
- 成員角色自定義

### V1.2+ 可能擴展
- 子組織（組織樹）
- 組織層級 API Key 隔離
- 組織級別的配額管理

---

**狀態**：✅ Phase 2 完成  
**最後更新**：2026-04-20  
**驗證**：功能與路由以 `profile.routes.ts`、`organization.routes.ts` 及 `identity-design.md` 為準；覆蓋率門檻見根目錄 `bunfig.toml` 與 CI `unit-coverage`
