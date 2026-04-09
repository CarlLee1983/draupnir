# 1. 認證與身份

> 用戶認證、帳戶安全、角色與權限管理

## 📄 文檔

### [Phase 2: Identity — 認證與帳戶設計規格](./identity-design.md)

**核心目標**：完整的使用者身份管理系統，包含三大模組

#### 設計要點

| 模組 | 職責 | 驗收內容 |
|------|------|---------|
| **Auth 補完** | 密碼重設、RBAC 三角色 | `POST /auth/password-reset/*`、角色檢查 middleware |
| **User 模組** | Profile CRUD、帳戶啟用/停用 | `GET/PUT /users/me`、Admin List API |
| **Organization** | 多租戶、成員邀請、角色管理 | Org CRUD、成員邀請、角色指派 |

#### 核心決策

| 決策 | 選擇 | 理由 |
|------|------|------|
| 密碼重設 | API-only（Email 待後續） | 降低初期複雜度 |
| RBAC | 固定三角色（ADMIN/MANAGER/MEMBER） | 符合 ROADMAP、簡單明確 |
| 資料隔離 | 共享 DB + organization_id 過濾 | 適合初期、簡單有效 |
| 用戶 ↔ 組織 | 一對一 | 簡化權限模型 |

---

## 🏗️ 實現狀態

### ✅ 完成的功能

- ✅ 用戶註冊（email + password）
- ✅ 登入 / 登出（JWT Token）
- ✅ Token 刷新機制
- ✅ 密碼重設流程（API-only）
- ✅ RBAC 三角色（ADMIN/MANAGER/MEMBER）
- ✅ 授權 Middleware（角色檢查）

### 📋 詳細規格

#### Auth 補完

**PasswordResetToken Value Object**
- token 值、userId、過期時間（1 小時）、是否已使用
- `User` aggregate 新增 `resetPassword(newPassword)` 方法

**Application Services**
- `RequestPasswordResetService` — 產生 reset token
- `ExecutePasswordResetService` — 驗證 token、重設密碼、撤銷既有 JWT

**API Endpoints**
- `POST /api/auth/password-reset/request` — body: `{ email }`
- `POST /api/auth/password-reset/execute` — body: `{ token, newPassword, confirmPassword }`

#### RBAC 實現

**Role Value Object**
- 三個固定值：`ADMIN`、`MANAGER`、`MEMBER`
- 預定義權限集：
  - **ADMIN**：全部權限
  - **MANAGER**：管理組織成員、檢視用量、管理 Key
  - **MEMBER**：管理自己的 Profile 和 Key

**AuthorizationService**
- `hasPermission(user, permission): boolean`
- `requirePermission(user, permission): void`

---

## 🔗 相關文檔與實現

### 相關規格文檔
- 詳細 User Profile 設計 → [2-user-organization](../2-user-organization/)
- 詳細 Organization 設計 → [2-user-organization](../2-user-organization/)

### 實現模組位置
```
src/Modules/
├── Auth/
│   ├── Domain/
│   │   ├── Aggregates/User
│   │   ├── ValueObjects/Email, UserRole, ...
│   │   └── Repositories/IUserRepository
│   ├── Application/
│   │   └── Services/AuthService, PasswordResetService
│   ├── Infrastructure/
│   │   └── Repositories/UserRepository
│   ├── Presentation/
│   │   ├── Controllers/AuthController
│   │   └── Routes/authRoutes
│   └── __tests__/
```

### 相關設定與常量
- JWT Secret（`.env` 中的 `JWT_SECRET`）
- Token 過期時間（配置項）
- 密碼重設 Token 過期時間（1 小時）
- RBAC 權限定義（`src/Modules/Auth/Domain/ValueObjects/Role.ts`）

---

## 🧪 驗收標準

Phase 2 認證部分的驗收條件：

- [ ] 認證流程完整：註冊 → 登入 → 使用 JWT → 登出 ✅
- [ ] 密碼重設可用：Request → 產生 Token → Execute → 新密碼生效 ✅
- [ ] RBAC 生效：不同角色對不同端點有不同存取權限 ✅
- [ ] Authorization Middleware 正常運作 ✅
- [ ] 測試覆蓋率 ≥80% ✅
- [ ] OpenAPI 規格更新 ✅

---

## 📌 設計考量

### 為什麼 API-only 密碼重設？
- 降低初期實現複雜度（無須郵件集成）
- Email 通知機制可在後續迭代補上
- 當前支援 debug mode 下透過 `_debugToken` 欄位回傳 token

### 為什麼三角色而不是動態權限？
- 簡化初期設計與實現
- 便於快速驗收與測試
- 動態權限系統可在 v1.1+ 進階功能中實現

### 資料隔離策略
- 採用共享 DB + `organization_id` 過濾
- 不同租戶的資料透過查詢過濾隔離
- 適合初期（單一區域、單一數據庫）
- 如需完全隔離，可在後期升級為 Schema-per-tenant 或 Database-per-tenant

---

## 🚀 後續與擴展

### V1.1 計劃中的改進
- Email 通知機制（密碼重設 Email）
- 更細粒度的權限定義
- 審計日誌（誰在何時做了什麼操作）

### V1.2+ 的可能擴展
- OAuth 2.0 集成（Google、GitHub 登入）
- MFA / 2FA 多因素驗證
- 動態 RBAC 系統
- 組織層級的自定義角色

---

**狀態**：✅ Phase 2 完成  
**最後更新**：2026-04-10  
**實現覆蓋率**：100% 功能完成，81-85% 測試覆蓋
