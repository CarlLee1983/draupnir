# Manager 角色晉降機制設計

**日期**：2026-04-15
**狀態**：已核准，待實作
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
| `PATCH /api/organizations/:id/status` | 僅限 `admin` |
| `GET /api/organizations/:id/members` | 查看成員列表 |
| `POST /api/organizations/:id/invitations` | 邀請成員 |
| `GET /api/organizations/:id/invitations` | 查看邀請列表 |
| `DELETE /api/organizations/:id/invitations/:invId` | 取消邀請 |
| `DELETE /api/organizations/:id/members/:userId` | 移除成員 |
| `PATCH /api/organizations/:id/members/:userId/role` | 變更成員角色（僅限 `admin`） |
| `GET /api/organizations/:id/credits` | 查看餘額 |
| `GET /api/organizations/:id/contracts` | 查看合約 |

---

## 晉升流程

```
用戶（member）在首頁點擊「建立我的組織」
  ↓
POST /api/organizations
  middleware: requireAuth()（不限角色）
  ↓
CreateOrganizationService.execute()
  1. 確認 managerUserId === 當前用戶（防止代建）
  2. 查詢用戶是否已是任何組織的 manager/admin（isManagerInAnyOrg）
     若是 → 回傳錯誤 ALREADY_HAS_ORGANIZATION
  3. 建立 Organization aggregate
  4. 建立 OrganizationMember（org 層級 manager）
  5. ProvisionOrganizationDefaults（CreditAccount 等預設資源）
  6. authRepository.updateRole(userId, 'manager')
  ↓
回傳成功，前端刷新，用戶進入組織主頁
```

---

## 降級流程

觸發點：
- `RemoveMemberService` 執行成功後
- `ChangeOrgMemberRoleService` 執行成功後

降級邏輯：
```
isManagerInAnyOrg(userId)
  查詢：用戶是否在任何組織中擁有 'manager' 或 'admin' org 角色
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
```

---

## 變更清單

### 後端

| 檔案 | 變更 |
|------|------|
| `Organization/Presentation/Routes/organization.routes.ts` | `POST /api/organizations` 改為 `requireAuth()`；其他管理路由加入 `'manager'` 角色選項 |
| `Organization/Application/Services/CreateOrganizationService.ts` | 加入「已有組織則拒絕」檢查；成功後呼叫 `authRepository.updateRole()` |
| `Organization/Application/Services/RemoveMemberService.ts` | 成功後呼叫降級檢查 |
| `Organization/Application/Services/ChangeOrgMemberRoleService.ts` | 成功後呼叫降級檢查 |
| `Auth/Domain/Repositories/IAuthRepository.ts` | 新增 `updateRole(userId: string, role: string): Promise<void>` |
| `Auth/Infrastructure/Repositories/AuthRepository.ts` | 實作 `updateRole()` |
| `Organization/Domain/Repositories/IOrganizationMemberRepository.ts` | 新增 `isManagerInAnyOrg(userId: string): Promise<boolean>` |
| `Organization/Infrastructure/Repositories/OrganizationMemberRepository.ts` | 實作 `isManagerInAnyOrg()` |

### 前端

| 檔案 | 變更 |
|------|------|
| Dashboard Controller | props 加入 `hasOrganization: boolean` |
| Dashboard React 頁面 | 無組織時渲染提示卡片 |
| `CreateOrganizationModal` 元件（新增） | 表單含組織名稱欄位，送出後 POST `/api/organizations` |

### 不變更

- Domain 層聚合（`Organization`、`OrganizationMember`）
- 其他 Organization Services（已透過 `requireOrganizationContext()` 確保租戶隔離）

---

## 測試策略

- `CreateOrganizationService`：晉升後 `users.role` 必須為 `manager`；已有組織時拒絕建立
- `RemoveMemberService` / `ChangeOrgMemberRoleService`：移除最後一個 org manager → 系統角色降回 `member`；仍有其他組織時保持 `manager`
- E2E：完整流程—註冊 → 首頁看到提示卡片 → 建立組織 → 進入 Dashboard
