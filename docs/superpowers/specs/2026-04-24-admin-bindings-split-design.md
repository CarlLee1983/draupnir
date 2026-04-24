# Admin Bindings 分拆設計

**日期**：2026-04-24  
**範圍**：`src/Website/Admin/bindings/`  
**目標**：將單一大型 `registerAdminBindings.ts` 按 domain 拆分為多個小檔案，解決隨頁面增加檔案無限膨脹的問題。

---

## 背景

目前 `registerAdminBindings.ts` 是一個 183 行的單一檔案，負責注冊所有 14 個 Admin Page 類別的 DI 綁定。每新增一個 Page 就讓這個檔案再長一截，閱讀和維護成本隨之增加。

---

## 設計決策

**分組依據**：業務 domain，與 `src/Modules/` 下的模組對應。  
**檔案命名**：短名稱（`users.ts`），目錄名 `bindings/` 已提供上下文。  
**分組函式命名**：`register<Domain>Bindings(container)`，與主檔呼叫對稱。

---

## 目錄結構

```
src/Website/Admin/bindings/
  registerAdminBindings.ts     ← 協調層（只負責 call 各子模組）
  dashboard.ts                 ← AdminDashboardPage
  users.ts                     ← AdminUsersPage, AdminUserDetailPage
  organizations.ts             ← AdminOrganizationsPage, AdminOrganizationDetailPage
  contracts.ts                 ← AdminContractsPage, AdminContractCreatePage, AdminContractDetailPage
  modules.ts                   ← AdminModulesPage, AdminModuleCreatePage
  apiKeys.ts                   ← AdminApiKeysPage
  reports.ts                   ← AdminReportsPage, AdminReportTemplatePage
  usageSync.ts                 ← AdminUsageSyncPage
```

---

## 各子檔結構

每個子檔只匯出一個 `register<Domain>Bindings` 函式，負責注冊該 domain 的所有 Page 單例。結構不變，只是從大檔搬移過來。

```typescript
// users.ts
export function registerUsersBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(k.users, (c) =>
    new AdminUsersPage(
      c.make(i) as InertiaService,
      c.make('listUsersService') as ListUsersService,
    ),
  )

  container.singleton(k.userDetail, (c) =>
    new AdminUserDetailPage(
      c.make(i) as InertiaService,
      c.make('getProfileService') as GetProfileService,
      c.make('getUserDetailService') as GetUserDetailService,
      c.make('changeUserStatusService') as ChangeUserStatusService,
    ),
  )
}
```

---

## 主檔（協調層）

主檔縮減為入口地圖，只負責依序呼叫各子模組。

```typescript
// registerAdminBindings.ts
//
// 各 domain 的 Page 綁定分別定義在：
// - dashboard.ts / users.ts / organizations.ts / contracts.ts
// - modules.ts / apiKeys.ts / reports.ts / usageSync.ts

export function registerAdminBindings(container: IContainer): void {
  registerDashboardBindings(container)
  registerUsersBindings(container)
  registerOrganizationsBindings(container)
  registerContractsBindings(container)
  registerModulesBindings(container)
  registerApiKeysBindings(container)
  registerReportsBindings(container)
  registerUsageSyncBindings(container)
}
```

---

## 影響範圍

| 檔案 | 變動 |
|------|------|
| `bindings/registerAdminBindings.ts` | 大幅縮減，改為協調層 |
| `bindings/dashboard.ts` | 新增 |
| `bindings/users.ts` | 新增 |
| `bindings/organizations.ts` | 新增 |
| `bindings/contracts.ts` | 新增 |
| `bindings/modules.ts` | 新增 |
| `bindings/apiKeys.ts` | 新增 |
| `bindings/reports.ts` | 新增 |
| `bindings/usageSync.ts` | 新增 |

**不受影響**：`keys.ts`、`routes/registerAdminRoutes.ts`、所有 Page 類別、所有 Application Service — 純粹是搬移，不改任何邏輯。

---

## 擴充慣例

新增 Admin Page 時：
1. 判斷所屬 domain → 找到對應子檔
2. 在子檔加一個 `container.singleton(...)` 區塊
3. 若屬於新 domain → 新增子檔 + 在主檔加一行呼叫

---

## 不在本次範圍

- `c.make('serviceName') as ServiceType` 型別安全改善（後續討論）
- `keys.ts` 結構調整
- 路由層任何修改
