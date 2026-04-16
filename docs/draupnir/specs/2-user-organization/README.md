# 2. 用戶與組織管理

> 用戶資料、個人設定、組織管理、多租戶模型

## 📄 規格文檔

### [Phase 2: Identity — User & Organization 詳細設計](../1-authentication/identity-design.md)

本區域的設計規格位在認證區域的 Phase 2 文檔中。以下為快速索引：

#### 2.2 User 模組 — [詳細設計](../1-authentication/identity-design.md#22-user-模組)

**職責**：用戶個人資料與帳戶設定

| 項目 | 內容 |
|------|------|
| **Domain** | UserProfile Aggregate，包含 displayName、avatar、phone、bio、timezone、locale、notificationPreferences |
| **Repository** | IUserProfileRepository，支持 CRUD、列表、分頁 |
| **Services** | GetUserProfileService、UpdateUserProfileService、ListUsersService、ChangeUserStatusService |
| **API** | `GET /api/users/me`、`PUT /api/users/me`、`GET /api/users`、`PUT /api/users/{id}/status` |

#### 2.3 Organization 模組 — [詳細設計](../1-authentication/identity-design.md#23-organization-模組多租戶)

**職責**：多租戶組織、成員管理、邀請與角色指派

| 項目 | 內容 |
|------|------|
| **Domain** | Organization Aggregate、OrgMember Entity、OrgInvitation Entity、角色定義（OWNER/ADMIN/MEMBER） |
| **Repository** | IOrganizationRepository、IOrgMemberRepository、IOrgInvitationRepository |
| **Services** | CreateOrgService、ListMembersService、InviteMemberService、UpdateMemberRoleService、RemoveMemberService |
| **API** | `POST /api/orgs`、`GET /api/orgs`、`GET /api/orgs/{id}/members`、`POST /api/orgs/{id}/invites` |

#### 組織合約與 API Key 配額 — [合約額度與配發規格](../2026-04-16-contract-quota-allocation-spec.md)

**職責摘要**：組織合約上限（可配發至各 API Key 之總池）、未分配池、Admin 調降（先吸收未分配再比例縮減已配發）、Manager 依 `slack` 重配、硬擋與通知。各 Key 用量重置週期（7d／30d 等）與 Credit／計費模組之銜接見該規格 §2.5、關聯 [3-api-keys](../3-api-keys/README.md)。

---

## 🏗️ 實現狀態

### ✅ 已完成的功能

**User Profile**
- ✅ Get 自己的 Profile
- ✅ Update Profile（部分更新）
- ✅ Admin List 用戶（分頁 + 篩選）
- ✅ 啟用/停用帳戶
- ✅ 完整個人資訊（displayName, avatar, phone, bio, timezone, locale）
- ✅ 通知偏好設定（JSON 儲存）

**Organization**
- ✅ 組織 CRUD
- ✅ 組織切換機制
- ✅ 成員邀請（邀請連結 + Token）
- ✅ 成員角色指派（OWNER/ADMIN/MEMBER）
- ✅ 成員移除
- ✅ 組織成員列表（分頁 + 篩選）

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

#### Organization
```
Organization Aggregate
├── id (UUID)
├── name (string)
├── slug (OrgSlug VO - auto-generated)
├── description (string)
├── members (OrgMember[] Entity)
│   ├── id (UUID)
│   ├── userId (UUID)
│   ├── role (OrgRole VO - OWNER/ADMIN/MEMBER)
│   ├── status (MemberStatus VO - PENDING/ACTIVE)
│   └── joinedAt (timestamp)
├── invitations (OrgInvitation[] Entity)
│   ├── id (UUID)
│   ├── email (string)
│   ├── token (string, 邀請連結用)
│   ├── status (PENDING/ACCEPTED/REVOKED)
│   ├── expiresAt (timestamp)
│   └── createdAt (timestamp)
├── createdAt (timestamp)
└── updatedAt (timestamp)
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
│   │   └── Services/GetUserProfileService, UpdateUserProfileService, etc.
│   ├── Infrastructure/
│   │   └── Repositories/UserProfileRepository
│   ├── Presentation/
│   │   ├── Controllers/UserProfileController
│   │   └── Routes/profileRoutes
│   └── __tests__/
│
├── Organization/
│   ├── Domain/
│   │   ├── Aggregates/Organization
│   │   ├── Entities/OrgMember, OrgInvitation
│   │   ├── ValueObjects/OrgSlug, OrgRole, MemberStatus
│   │   └── Repositories/IOrganizationRepository, IOrgMemberRepository, IOrgInvitationRepository
│   ├── Application/
│   │   └── Services/CreateOrgService, ListMembersService, InviteMemberService, etc.
│   ├── Infrastructure/
│   │   └── Repositories/*Repository
│   ├── Presentation/
│   │   ├── Controllers/OrganizationController
│   │   └── Routes/organizationRoutes
│   └── __tests__/
```

---

## 🧪 驗收標準

### User Profile 模組
- [ ] 用戶可查看自己的 Profile ✅
- [ ] 用戶可更新自己的 Profile ✅
- [ ] Admin 可列表所有用戶（分頁+篩選） ✅
- [ ] Admin 可啟用/停用帳戶 ✅
- [ ] 完整個人資訊欄位支援 ✅
- [ ] 測試覆蓋率 ≥80% ✅

### Organization 模組
- [ ] Admin 可建立組織 ✅
- [ ] 成員可查看所屬組織列表 ✅
- [ ] 可邀請新成員（邀請連結方式） ✅
- [ ] 已註冊用戶點擊邀請連結自動加入 ✅
- [ ] 可指派成員角色（OWNER/ADMIN/MEMBER） ✅
- [ ] 可移除成員 ✅
- [ ] Organization 成員列表分頁 ✅
- [ ] 測試覆蓋率 ≥80% ✅

---

## 📌 設計決策記錄

### 用戶 ↔ 組織 關係：一對一
**決策**：在 v1 中採用一對一簡化模型
- 每個用戶對應一個默認組織
- 用戶可建立或加入多個組織，但有默認組織概念
- 便於初期實現，後期可升級為真正的多對多

### 邀請機制：邀請連結 + Token
**決策**：採用邀請連結方式
- 已註冊用戶點擊邀請連結自動加入
- 未註冊用戶走註冊流程後自動加入
- 彈性最大，支援多種邀請場景

### 組織 Slug：自動生成
**決策**：Organization slug 自動生成
- 基於組織名稱 + UUID 後綴確保唯一性
- 便於 URL 美化（`/orgs/company-name`）
- 不允許用戶自定義（避免重複與衝突）

### 成員角色：三層級
**決策**：OWNER / ADMIN / MEMBER
- **OWNER**：組織創始人，無法更改角色
- **ADMIN**：管理成員、檢視用量、管理 Key
- **MEMBER**：管理自己的 Key

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
**最後更新**：2026-04-10  
**實現覆蓋率**：100% 功能完成，81-85% 測試覆蓋
