# 1. 認證與身份

> 用戶認證、帳戶安全、角色與權限管理、組織租戶上下文

## 📄 文檔

### [Phase 2: Identity — 認證與帳戶設計規格](./identity-design.md)

**核心目標**：完整的使用者身份管理系統；**細節與實作對照**以 [identity-design.md](./identity-design.md)（最後審閱 2026-04-20）為準。

#### 設計要點

| 模組 | 職責 | 驗收／實作對照 |
|------|------|----------------|
| **Auth 補完** | 密碼重設、RBAC 三角色 | Inertia：`/forgot-password`、`/reset-password/:token`；`ForgotPasswordService`／`ResetPasswordService`；`createRoleMiddleware('admin' \| …)` |
| **Profile 模組**（原「User」規格） | Profile CRUD、管理員列表／啟停 | `GET/PUT /api/users/me`；`ListUsersService`／`ChangeUserStatusService` 在 Auth，由 `ProfileController` 暴露 |
| **Organization** | 多租戶、成員邀請、組織內角色 | `organization.routes.ts`；**`X-Organization-Id`**（`requireOrganizationContext`）；**非**用戶↔組織一對一 |

#### 核心決策（摘要）

| 決策 | 選擇 | 備註 |
|------|------|------|
| 密碼重設 | **網頁流程 + Email** | 非以 `POST /api/auth/password-reset/*` JSON 為主介面 |
| RBAC | **`admin`／`manager`／`member`**（小寫，`Role` VO） | 未獨立落地 `Permission` VO／`AuthorizationService` 矩陣 |
| 資料隔離 | 共享 DB + `organization_id` + **成員資格驗證** | `OrgAuthorizationHelper` |
| 用戶 ↔ 組織 | **多組織成員** | `organization_members`；每位使用者至多一筆 org-level **manager**（partial unique index） |

---

## 🏗️ 實現狀態

### ✅ 已落地的功能（摘要）

- 用戶註冊（email + password）
- 登入／登出（JWT）；Token 刷新；sessions／logout-all
- 密碼重設（**Inertia** + `ForgotPasswordService`／`ResetPasswordService` + `password_reset_tokens`）
- RBAC 三角色與 **`RoleMiddleware`**／**`requireAuth`**
- **Profile**（`src/Modules/Profile/`）與 **Organization**（邀請、成員、`X-Organization-Id`）
- **Google OAuth**（`GoogleOAuthService`、`oauth.routes`）

### 📋 詳細規格

**以 [identity-design.md](./identity-design.md) 為準**（服務命名、路由表、Schema、與初稿差異）。

---

## 🔗 相關文檔與實現

### 相關規格

- [user-stories.md](./user-stories.md)
- [draupnir-v1-workplan.md](../0-planning/draupnir-v1-workplan.md) Phase 2
- [2-user-organization](../2-user-organization/README.md)（組織／用戶故事補充）

### 實現模組位置（精簡）

```
src/Modules/
├── Auth/          # 註冊、登入、JWT、密碼重設服務、ListUsers／ChangeUserStatus
├── Profile/       # UserProfile、/api/users/*
├── Organization/  # 組織、成員、邀請、Middleware
└── …

src/Website/Auth/  # Inertia 登入／註冊／forgot-password／reset-password
```

### 相關設定

- `JWT_SECRET`、OAuth 相關變數（見 `.env.example`）
- RBAC：`src/Modules/Auth/Domain/ValueObjects/Role.ts`
- 覆蓋率門檻：`bunfig.toml`；CI **`unit-coverage`**

---

## 🧪 驗收標準

- [x] 註冊、登入、登出、Token 刷新
- [x] 密碼重設流程（網頁 + 後端）
- [x] RBAC 與組織上下文 Middleware
- [x] Profile 與 Organization 核心 API
- [ ] 測試覆蓋率 ≥ 80%（以 **CI `bun test --coverage`** 通過為準）
- [x] OpenAPI 持續維護

---

## 📌 設計考量

### 密碼重設為何以網頁為主？

- Inertia 提供表單；`IEmailService` 發送重設連結。若需純 API 客戶端應另定契約並列入 OpenAPI。

### 為什麼三角色而不是動態權限？

- 簡化 v1；細粒度權限可後續擴展。

### 資料與租戶隔離

- 共享 DB + `organization_id` + **成員關係檢查**（不可僅信任 Header）。

---

## 🚀 後續與擴展

- 更細粒度權限、審計日誌
- MFA／2FA；動態 RBAC（長期）

---

**狀態**：Phase 2 後端與主要前端流程已落地；細節以 [identity-design.md](./identity-design.md) 為準。  
**最後更新**：2026-04-20  
**測試覆蓋率**：以 `bunfig.toml` 與 **CI `unit-coverage`** 為準，不於此手寫固定百分比。
