# Manager 角色晉降機制設計

**日期**：2026-04-15
**狀態**：已核准，待實作（2026-04-15 設計審查已修正）
**範疇**：Auth 模組、Organization 模組、Dashboard 前端

---

## 背景

Draupnir 系統存在三個系統層級角色（`admin` / `manager` / `member`），但 `manager` 角色過去沒有明確的語意定義、晉升機制、對應路由權限，也沒有降級條件。本設計文件定義完整的 `manager` 角色生命週期。

---

## 角色語意定義

| 角色 | 語意 | 產生方式 |
|------|------|---------|
| `admin` | 平台管理者，可管理所有組織、用戶、模組 | 手動設定（DB seed） |
| `manager` | 組織擁有者，可管理自己的組織 + 帳單 | 自建組織後自動晉升 |
| `member` | 一般用戶，僅有個人操作（個人檔案等） | 預設（註冊時） |

---

## `manager` 可存取的路由

| 路由 | 說明 |
|------|------|
| `POST /api/organizations` | 自建第一個組織（限自己為 manager，已有組織則拒絕） |
| `GET /api/organizations/:id` | 查看自己的組織 |
| `PUT /api/organizations/:id` | 更新自己的組織資訊 |
| `GET /api/organizations/:id/members` | 查看成員列表 |
| `POST /api/organizations/:id/invitations` | 邀請成員 |
| `GET /api/organizations/:id/invitations` | 查看邀請列表 |
| `DELETE /api/organizations/:id/invitations/:invId` | 取消邀請 |
| `DELETE /api/organizations/:id/members/:userId` | 移除成員 |
| `GET /api/organizations/:id/credits` | 查看餘額 |
| `GET /api/organizations/:id/contracts` | 查看合約 |

### `admin` 專屬路由（不在 manager 範圍內）

| 路由 | 說明 |
|------|------|
| `PATCH /api/organizations/:id/status` | 變更組織狀態 |
| `PATCH /api/organizations/:id/members/:userId/role` | 變更成員系統角色 |

---

## 晉升流程

> **注意**：`admin` 系統角色的用戶不應透過此流程建立組織。若 `admin` 呼叫此端點，步驟 0 應回傳 `ADMIN_CANNOT_CREATE_ORG` 錯誤（admin 擁有全平台管理權，無需建立自己的組織）。

```
用戶（member）在首頁點擊「建立我的組織」
  ↓
POST /api/organizations
  middleware: requireAuth()（不限角色）
  ↓
CreateOrganizationService.execute()
  0. 若用戶系統角色為 'admin' → 回傳錯誤 ADMIN_CANNOT_CREATE_ORG
  1. 確認 managerUserId === 當前用戶（防止代建）
  2. 查詢用戶是否已擁有任何組織的 org-level manager 角色（isOrgManagerInAnyOrg）
     若是 → 回傳錯誤 ALREADY_HAS_ORGANIZATION
  ── 以下步驟 3-6 必須在同一個 DB transaction 內執行 ──
  3. 建立 Organization aggregate
  4. 建立 OrganizationMember（org 層級 manager）
  5. ProvisionOrganizationDefaults（CreditAccount 等預設資源）
  6. authRepository.updateRole(userId, 'manager')
  ─────────────────────────────────────────────────────
  ↓
回傳成功，前端刷新，用戶進入組織主頁
```

> **防 Race Condition**：DB 層必須在 `organization_members` 上建立 partial unique constraint：`UNIQUE (user_id) WHERE org_role = 'manager'`。應用層的 `isOrgManagerInAnyOrg` 檢查是可讀性保護，DB constraint 才是最終防線。

---

## 降級流程

觸發點：
- `RemoveMemberService` 執行成功後（對 **被移除的用戶** `removedUserId` 執行檢查）
- `ChangeOrgMemberRoleService` 執行成功後（對 **被變更角色的用戶** `targetUserId` 執行檢查）
- `DeleteOrganizationService` 執行成功後（對 **原組織的 manager 用戶** `ownerUserId` 執行檢查）

降級邏輯：
```
isOrgManagerInAnyOrg(userId)
  查詢：用戶是否在任何組織中擁有 org-level 'manager' 角色
  （注意：此查詢只看 OrganizationMember.org_role，不看系統角色）
  ↓
若否 → authRepository.updateRole(userId, 'member')
若是 → 保持不變
```

---

## 前端首頁邏輯

```
登入後進入 Dashboard
  ↓
Controller 檢查用戶的組織資訊
  ↓
有組織 → 正常顯示 Dashboard
無組織（member 角色）→ props: { hasOrganization: false }
  ↓
React 渲染「尚無組織」提示卡片
  - 說明：「建立組織以開始使用 API Key、帳單與儀表板功能」
  - 按鈕：「建立我的組織」
  - 點擊開啟 Modal，填寫組織名稱
  - 送出後 POST /api/organizations
  - 成功後整頁刷新（Inertia router.visit）
  - 失敗時 Modal 保持開啟，顯示錯誤訊息：
      ALREADY_HAS_ORGANIZATION → 「您已擁有一個組織」
      ADMIN_CANNOT_CREATE_ORG  → 「管理員帳號無法建立組織」
      其他伺服器錯誤            → 「建立失敗，請稍後再試」
```

### 組織名稱驗證規則

| 規則 | 限制 |
|------|------|
| 最小長度 | 2 字元 |
| 最大長度 | 64 字元 |
| 允許字元 | 中英文、數字、空格、`-`、`_` |
| 唯一性 | 不強制唯一（同名組織允許並存） |

前端用 Zod schema 驗證，送出前即時提示；後端 `CreateOrganizationService` 同樣驗證（double validation）。

---

## 變更清單

### 後端

| 檔案 | 變更 |
|------|------|
| `Organization/Presentation/Routes/organization.routes.ts` | `POST /api/organizations` 改為 `requireAuth()`；其他管理路由加入 `'manager'` 角色選項 |
| `Organization/Application/Services/CreateOrganizationService.ts` | 加入 admin 拒絕、已有組織拒絕檢查；步驟 3-6 包入 transaction；成功後呼叫 `authRepository.updateRole()` |
| `Organization/Application/Services/RemoveMemberService.ts` | 成功後對 `removedUserId` 呼叫降級檢查 |
| `Organization/Application/Services/ChangeOrgMemberRoleService.ts` | 成功後對 `targetUserId` 呼叫降級檢查 |
| `Organization/Application/Services/DeleteOrganizationService.ts` | 成功後對 `ownerUserId` 呼叫降級檢查 |
| `Auth/Domain/Repositories/IAuthRepository.ts` | 新增 `updateRole(userId: string, role: 'admin' \| 'manager' \| 'member'): Promise<void>` |
| `Auth/Infrastructure/Repositories/AuthRepository.ts` | 實作 `updateRole()` |
| `Organization/Domain/Repositories/IOrganizationMemberRepository.ts` | 新增 `isOrgManagerInAnyOrg(userId: string): Promise<boolean>` |
| `Organization/Infrastructure/Repositories/OrganizationMemberRepository.ts` | 實作 `isOrgManagerInAnyOrg()`（查詢 `org_role = 'manager'`） |
| DB Migration | 新增 partial unique constraint：`UNIQUE (user_id) WHERE org_role = 'manager'` |

### 前端

| 檔案 | 變更 |
|------|------|
| Dashboard Controller | props 加入 `hasOrganization: boolean` |
| Dashboard React 頁面 | 無組織時渲染提示卡片 |
| `CreateOrganizationModal` 元件（新增） | 表單含組織名稱欄位（含 Zod 驗證）；送出後 POST `/api/organizations`；失敗時顯示對應錯誤訊息，Modal 保持開啟 |

### 不變更

- Domain 層聚合（`Organization`、`OrganizationMember`）
- 其他 Organization Services（已透過 `requireOrganizationContext()` 確保租戶隔離）

---

## 測試策略

### 單元測試

- `CreateOrganizationService`
  - 晉升後 `users.role` 必須為 `'manager'`
  - 已有組織時回傳 `ALREADY_HAS_ORGANIZATION`
  - admin 呼叫時回傳 `ADMIN_CANNOT_CREATE_ORG`
  - 步驟 5 失敗時 transaction rollback，組織不殘留
- `RemoveMemberService`
  - 移除最後一個 org manager → `removedUserId` 系統角色降回 `'member'`
  - 被移除用戶仍有其他組織時保持 `'manager'`
- `ChangeOrgMemberRoleService`
  - 同上邏輯，對 `targetUserId`
- `DeleteOrganizationService`
  - org 刪除後 `ownerUserId` 無其他組織時系統角色降回 `'member'`

### E2E

- 完整晉升流程：註冊 → 首頁看到提示卡片 → 填寫名稱 → 建立組織 → 進入 Dashboard
- 錯誤流程：重複建立組織 → Modal 顯示錯誤，不跳轉
