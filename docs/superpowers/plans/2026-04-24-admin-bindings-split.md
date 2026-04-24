# Admin Bindings 分拆實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 183 行的單一 `registerAdminBindings.ts` 按 domain 拆分為 8 個小檔，主檔縮減為協調層；行為與型別零變動。

**Architecture:** 純粹搬移：每個子檔匯出一個 `register<Domain>Bindings(container)` 函式，注冊該 domain 所有 Page 單例；主檔依序呼叫。先建立 regression 測試作為安全網，再逐 domain 搬移、每步 typecheck + 跑測試後 commit。

**Tech Stack:** TypeScript / Bun / Gravito DI Container (`IContainer`) / Bun Test。

**規格出處：** `docs/superpowers/specs/2026-04-24-admin-bindings-split-design.md`

---

## 檔案結構（最終狀態）

```
src/Website/Admin/bindings/
  registerAdminBindings.ts     ← 協調層（只 call 8 個子模組）
  dashboard.ts                 ← AdminDashboardPage
  users.ts                     ← AdminUsersPage, AdminUserDetailPage
  organizations.ts             ← AdminOrganizationsPage, AdminOrganizationDetailPage
  contracts.ts                 ← AdminContractsPage, AdminContractCreatePage, AdminContractDetailPage
  modules.ts                   ← AdminModulesPage, AdminModuleCreatePage
  apiKeys.ts                   ← AdminApiKeysPage
  reports.ts                   ← AdminReportsPage, AdminReportTemplatePage
  usageSync.ts                 ← AdminUsageSyncPage

src/Website/__tests__/Admin/
  registerAdminBindings.test.ts ← regression 安全網（新增）
```

**不受影響：** `keys.ts`、`routes/registerAdminRoutes.ts`、所有 Page 類別、所有 Application Service、`registerWebsiteBindings.ts`（透過同名 export 呼叫，介面不變）。

---

## 工作流程準則

- 每個任務：建立 / 編輯檔案 → 跑安全網測試 → 跑 `bun run typecheck` → commit。
- Commit message 用 `refactor: [admin-bindings] <短描述>`。
- 純搬移：嚴禁修改任何 Page 建構子參數、Service key 字串、cast 型別。
- 依規格順序處理 8 個 domain：dashboard → users → organizations → contracts → modules → apiKeys → reports → usageSync。

---

### Task 1：建立 regression 安全網測試

> 這不是 RED→GREEN：是 characterization test，pin 住目前行為，後續 8 個搬移任務每次都用它驗證沒退化。

**Files:**
- Create: `src/Website/__tests__/Admin/registerAdminBindings.test.ts`

- [ ] **Step 1：建立測試檔**

寫入 `src/Website/__tests__/Admin/registerAdminBindings.test.ts`：

```typescript
import { describe, expect, test } from 'bun:test'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { registerAdminBindings } from '@/Website/Admin/bindings/registerAdminBindings'
import { ADMIN_PAGE_KEYS } from '@/Website/Admin/keys'
import { AdminApiKeysPage } from '@/Website/Admin/Pages/AdminApiKeysPage'
import { AdminContractCreatePage } from '@/Website/Admin/Pages/AdminContractCreatePage'
import { AdminContractDetailPage } from '@/Website/Admin/Pages/AdminContractDetailPage'
import { AdminContractsPage } from '@/Website/Admin/Pages/AdminContractsPage'
import { AdminDashboardPage } from '@/Website/Admin/Pages/AdminDashboardPage'
import { AdminModuleCreatePage } from '@/Website/Admin/Pages/AdminModuleCreatePage'
import { AdminModulesPage } from '@/Website/Admin/Pages/AdminModulesPage'
import { AdminOrganizationDetailPage } from '@/Website/Admin/Pages/AdminOrganizationDetailPage'
import { AdminOrganizationsPage } from '@/Website/Admin/Pages/AdminOrganizationsPage'
import { AdminReportsPage } from '@/Website/Admin/Pages/AdminReportsPage'
import { AdminReportTemplatePage } from '@/Website/Admin/Pages/AdminReportTemplatePage'
import { AdminUsageSyncPage } from '@/Website/Admin/Pages/AdminUsageSyncPage'
import { AdminUserDetailPage } from '@/Website/Admin/Pages/AdminUserDetailPage'
import { AdminUsersPage } from '@/Website/Admin/Pages/AdminUsersPage'

function createFakeContainer(): IContainer {
  type Factory = (c: IContainer) => unknown
  const factories = new Map<string, Factory>()
  const cache = new Map<string, unknown>()
  const stub: Record<string, unknown> = {}

  const container: IContainer = {
    singleton(name, factory) {
      factories.set(name, factory)
    },
    bind(name, factory) {
      factories.set(name, factory)
    },
    make(name) {
      if (cache.has(name)) return cache.get(name)
      const factory = factories.get(name)
      const value = factory ? factory(container) : stub
      cache.set(name, value)
      return value
    },
  }
  return container
}

describe('registerAdminBindings', () => {
  test('每個 admin page key 解析為對應的 Page 類別實例', () => {
    const container = createFakeContainer()
    registerAdminBindings(container)

    expect(container.make(ADMIN_PAGE_KEYS.dashboard)).toBeInstanceOf(AdminDashboardPage)
    expect(container.make(ADMIN_PAGE_KEYS.users)).toBeInstanceOf(AdminUsersPage)
    expect(container.make(ADMIN_PAGE_KEYS.userDetail)).toBeInstanceOf(AdminUserDetailPage)
    expect(container.make(ADMIN_PAGE_KEYS.organizations)).toBeInstanceOf(AdminOrganizationsPage)
    expect(container.make(ADMIN_PAGE_KEYS.organizationDetail)).toBeInstanceOf(
      AdminOrganizationDetailPage,
    )
    expect(container.make(ADMIN_PAGE_KEYS.contracts)).toBeInstanceOf(AdminContractsPage)
    expect(container.make(ADMIN_PAGE_KEYS.contractCreate)).toBeInstanceOf(AdminContractCreatePage)
    expect(container.make(ADMIN_PAGE_KEYS.contractDetail)).toBeInstanceOf(AdminContractDetailPage)
    expect(container.make(ADMIN_PAGE_KEYS.modules)).toBeInstanceOf(AdminModulesPage)
    expect(container.make(ADMIN_PAGE_KEYS.moduleCreate)).toBeInstanceOf(AdminModuleCreatePage)
    expect(container.make(ADMIN_PAGE_KEYS.apiKeys)).toBeInstanceOf(AdminApiKeysPage)
    expect(container.make(ADMIN_PAGE_KEYS.usageSync)).toBeInstanceOf(AdminUsageSyncPage)
    expect(container.make(ADMIN_PAGE_KEYS.reports)).toBeInstanceOf(AdminReportsPage)
    expect(container.make(ADMIN_PAGE_KEYS.reportTemplate)).toBeInstanceOf(AdminReportTemplatePage)
  })
})
```

- [ ] **Step 2：跑測試確認對現有程式碼通過**

Run：
```bash
bun test src/Website/__tests__/Admin/registerAdminBindings.test.ts
```
Expected：PASS（1 test, 14 assertions）。失敗代表 fake container 寫錯或 Page 建構子有副作用，必須先修。

- [ ] **Step 3：跑 typecheck**

Run：
```bash
bun run typecheck
```
Expected：無錯誤。

- [ ] **Step 4：commit**

```bash
git add src/Website/__tests__/Admin/registerAdminBindings.test.ts
git commit -m "test: [admin-bindings] add regression safety net for admin DI registration"
```

---

### Task 2：抽出 dashboard.ts

**Files:**
- Create: `src/Website/Admin/bindings/dashboard.ts`
- Modify: `src/Website/Admin/bindings/registerAdminBindings.ts`

- [ ] **Step 1：建立 `dashboard.ts`**

寫入 `src/Website/Admin/bindings/dashboard.ts`：

```typescript
import type { ListUsersService } from '@/Modules/Auth/Application/Services/ListUsersService'
import type { ListAdminContractsService } from '@/Modules/Contract/Application/Services/ListAdminContractsService'
import type { GetAdminPlatformUsageTrendService } from '@/Modules/Dashboard/Application/Services/GetAdminPlatformUsageTrendService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminDashboardPage } from '../Pages/AdminDashboardPage'

export function registerDashboardBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(
    k.dashboard,
    (c) =>
      new AdminDashboardPage(
        c.make(i) as InertiaService,
        c.make('listUsersService') as ListUsersService,
        c.make('listOrganizationsService') as ListOrganizationsService,
        c.make('listAdminContractsService') as ListAdminContractsService,
        c.make('getAdminPlatformUsageTrendService') as GetAdminPlatformUsageTrendService,
      ),
  )
}
```

- [ ] **Step 2：在主檔 `registerAdminBindings.ts` 加入 import**

在 `import { ADMIN_PAGE_KEYS } from '../keys'` 那行**上方**加入：

```typescript
import { registerDashboardBindings } from './dashboard'
```

- [ ] **Step 3：移除主檔已不再需要的 import**

從 `registerAdminBindings.ts` 移除以下兩行：

```typescript
import type { GetAdminPlatformUsageTrendService } from '@/Modules/Dashboard/Application/Services/GetAdminPlatformUsageTrendService'
import { AdminDashboardPage } from '../Pages/AdminDashboardPage'
```

> 註：`ListUsersService`、`ListOrganizationsService`、`ListAdminContractsService` 還有其他 Page 用到，先保留。

- [ ] **Step 4：用函式呼叫取代 dashboard 區塊**

在 `registerAdminBindings.ts` 中找到並刪除：

```typescript
  container.singleton(
    k.dashboard,
    (c) =>
      new AdminDashboardPage(
        c.make(i) as InertiaService,
        c.make('listUsersService') as ListUsersService,
        c.make('listOrganizationsService') as ListOrganizationsService,
        c.make('listAdminContractsService') as ListAdminContractsService,
        c.make('getAdminPlatformUsageTrendService') as GetAdminPlatformUsageTrendService,
      ),
  )
```

在原位置插入：

```typescript
  registerDashboardBindings(container)
```

- [ ] **Step 5：跑安全網測試**

Run：
```bash
bun test src/Website/__tests__/Admin/registerAdminBindings.test.ts
```
Expected：PASS。

- [ ] **Step 6：跑 typecheck**

Run：
```bash
bun run typecheck
```
Expected：無錯誤。

- [ ] **Step 7：commit**

```bash
git add src/Website/Admin/bindings/dashboard.ts src/Website/Admin/bindings/registerAdminBindings.ts
git commit -m "refactor: [admin-bindings] extract dashboard bindings"
```

---

### Task 3：抽出 users.ts

**Files:**
- Create: `src/Website/Admin/bindings/users.ts`
- Modify: `src/Website/Admin/bindings/registerAdminBindings.ts`

- [ ] **Step 1：建立 `users.ts`**

寫入 `src/Website/Admin/bindings/users.ts`：

```typescript
import type { ChangeUserStatusService } from '@/Modules/Auth/Application/Services/ChangeUserStatusService'
import type { GetUserDetailService } from '@/Modules/Auth/Application/Services/GetUserDetailService'
import type { ListUsersService } from '@/Modules/Auth/Application/Services/ListUsersService'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminUserDetailPage } from '../Pages/AdminUserDetailPage'
import { AdminUsersPage } from '../Pages/AdminUsersPage'

export function registerUsersBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(
    k.users,
    (c) =>
      new AdminUsersPage(
        c.make(i) as InertiaService,
        c.make('listUsersService') as ListUsersService,
      ),
  )

  container.singleton(
    k.userDetail,
    (c) =>
      new AdminUserDetailPage(
        c.make(i) as InertiaService,
        c.make('getProfileService') as GetProfileService,
        c.make('getUserDetailService') as GetUserDetailService,
        c.make('changeUserStatusService') as ChangeUserStatusService,
      ),
  )
}
```

- [ ] **Step 2：在主檔加入 import**

在主檔 `import { registerDashboardBindings } from './dashboard'` 下方加入：

```typescript
import { registerUsersBindings } from './users'
```

- [ ] **Step 3：移除主檔已不再需要的 import**

從 `registerAdminBindings.ts` 移除以下行（這些 service / Page 在主檔已無人使用）：

```typescript
import type { ChangeUserStatusService } from '@/Modules/Auth/Application/Services/ChangeUserStatusService'
import type { GetUserDetailService } from '@/Modules/Auth/Application/Services/GetUserDetailService'
import type { ListUsersService } from '@/Modules/Auth/Application/Services/ListUsersService'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import { AdminUserDetailPage } from '../Pages/AdminUserDetailPage'
import { AdminUsersPage } from '../Pages/AdminUsersPage'
```

- [ ] **Step 4：用函式呼叫取代 users 區塊**

在 `registerAdminBindings.ts` 中找到並刪除以下兩個區塊：

```typescript
  container.singleton(
    k.users,
    (c) =>
      new AdminUsersPage(
        c.make(i) as InertiaService,
        c.make('listUsersService') as ListUsersService,
      ),
  )

  container.singleton(
    k.userDetail,
    (c) =>
      new AdminUserDetailPage(
        c.make(i) as InertiaService,
        c.make('getProfileService') as GetProfileService,
        c.make('getUserDetailService') as GetUserDetailService,
        c.make('changeUserStatusService') as ChangeUserStatusService,
      ),
  )
```

在原位置插入：

```typescript
  registerUsersBindings(container)
```

- [ ] **Step 5：跑安全網測試**

Run：
```bash
bun test src/Website/__tests__/Admin/registerAdminBindings.test.ts
```
Expected：PASS。

- [ ] **Step 6：跑 typecheck**

Run：
```bash
bun run typecheck
```
Expected：無錯誤。

- [ ] **Step 7：commit**

```bash
git add src/Website/Admin/bindings/users.ts src/Website/Admin/bindings/registerAdminBindings.ts
git commit -m "refactor: [admin-bindings] extract users bindings"
```

---

### Task 4：抽出 organizations.ts

**Files:**
- Create: `src/Website/Admin/bindings/organizations.ts`
- Modify: `src/Website/Admin/bindings/registerAdminBindings.ts`

- [ ] **Step 1：建立 `organizations.ts`**

寫入 `src/Website/Admin/bindings/organizations.ts`：

```typescript
import type { SumQuotaAllocatedForOrgService } from '@/Modules/ApiKey/Application/Services/SumQuotaAllocatedForOrgService'
import type { GetActiveOrgContractQuotaService } from '@/Modules/Contract/Application/Services/GetActiveOrgContractQuotaService'
import type { GetOrganizationService } from '@/Modules/Organization/Application/Services/GetOrganizationService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminOrganizationDetailPage } from '../Pages/AdminOrganizationDetailPage'
import { AdminOrganizationsPage } from '../Pages/AdminOrganizationsPage'

export function registerOrganizationsBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(
    k.organizations,
    (c) =>
      new AdminOrganizationsPage(
        c.make(i) as InertiaService,
        c.make('listOrganizationsService') as ListOrganizationsService,
      ),
  )

  container.singleton(
    k.organizationDetail,
    (c) =>
      new AdminOrganizationDetailPage(
        c.make(i) as InertiaService,
        c.make('getOrganizationService') as GetOrganizationService,
        c.make('listMembersService') as ListMembersService,
        c.make('getActiveOrgContractQuotaService') as GetActiveOrgContractQuotaService,
        c.make('sumQuotaAllocatedForOrgService') as SumQuotaAllocatedForOrgService,
      ),
  )
}
```

- [ ] **Step 2：在主檔加入 import**

在主檔 `import { registerUsersBindings } from './users'` 下方加入：

```typescript
import { registerOrganizationsBindings } from './organizations'
```

- [ ] **Step 3：移除主檔已不再需要的 import**

從 `registerAdminBindings.ts` 移除：

```typescript
import type { SumQuotaAllocatedForOrgService } from '@/Modules/ApiKey/Application/Services/SumQuotaAllocatedForOrgService'
import type { GetActiveOrgContractQuotaService } from '@/Modules/Contract/Application/Services/GetActiveOrgContractQuotaService'
import type { GetOrganizationService } from '@/Modules/Organization/Application/Services/GetOrganizationService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import { AdminOrganizationDetailPage } from '../Pages/AdminOrganizationDetailPage'
import { AdminOrganizationsPage } from '../Pages/AdminOrganizationsPage'
```

> 註：`ListOrganizationsService` 在 ApiKeys 區塊還會用到，先保留。

- [ ] **Step 4：用函式呼叫取代 organizations 區塊**

在 `registerAdminBindings.ts` 中找到並刪除以下兩個區塊：

```typescript
  container.singleton(
    k.organizations,
    (c) =>
      new AdminOrganizationsPage(
        c.make(i) as InertiaService,
        c.make('listOrganizationsService') as ListOrganizationsService,
      ),
  )

  container.singleton(
    k.organizationDetail,
    (c) =>
      new AdminOrganizationDetailPage(
        c.make(i) as InertiaService,
        c.make('getOrganizationService') as GetOrganizationService,
        c.make('listMembersService') as ListMembersService,
        c.make('getActiveOrgContractQuotaService') as GetActiveOrgContractQuotaService,
        c.make('sumQuotaAllocatedForOrgService') as SumQuotaAllocatedForOrgService,
      ),
  )
```

在原位置插入：

```typescript
  registerOrganizationsBindings(container)
```

- [ ] **Step 5：跑安全網測試**

Run：
```bash
bun test src/Website/__tests__/Admin/registerAdminBindings.test.ts
```
Expected：PASS。

- [ ] **Step 6：跑 typecheck**

Run：
```bash
bun run typecheck
```
Expected：無錯誤。

- [ ] **Step 7：commit**

```bash
git add src/Website/Admin/bindings/organizations.ts src/Website/Admin/bindings/registerAdminBindings.ts
git commit -m "refactor: [admin-bindings] extract organizations bindings"
```

---

### Task 5：抽出 contracts.ts

**Files:**
- Create: `src/Website/Admin/bindings/contracts.ts`
- Modify: `src/Website/Admin/bindings/registerAdminBindings.ts`

- [ ] **Step 1：建立 `contracts.ts`**

寫入 `src/Website/Admin/bindings/contracts.ts`：

```typescript
import type { ActivateContractService } from '@/Modules/Contract/Application/Services/ActivateContractService'
import type { AdjustContractQuotaService } from '@/Modules/Contract/Application/Services/AdjustContractQuotaService'
import type { CreateContractService } from '@/Modules/Contract/Application/Services/CreateContractService'
import type { GetContractDetailService } from '@/Modules/Contract/Application/Services/GetContractDetailService'
import type { ListAdminContractsService } from '@/Modules/Contract/Application/Services/ListAdminContractsService'
import type { TerminateContractService } from '@/Modules/Contract/Application/Services/TerminateContractService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminContractCreatePage } from '../Pages/AdminContractCreatePage'
import { AdminContractDetailPage } from '../Pages/AdminContractDetailPage'
import { AdminContractsPage } from '../Pages/AdminContractsPage'

export function registerContractsBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(
    k.contracts,
    (c) =>
      new AdminContractsPage(
        c.make(i) as InertiaService,
        c.make('listAdminContractsService') as ListAdminContractsService,
      ),
  )

  container.singleton(
    k.contractCreate,
    (c) =>
      new AdminContractCreatePage(
        c.make(i) as InertiaService,
        c.make('createContractService') as CreateContractService,
      ),
  )

  container.singleton(
    k.contractDetail,
    (c) =>
      new AdminContractDetailPage(
        c.make(i) as InertiaService,
        c.make('getContractDetailService') as GetContractDetailService,
        c.make('activateContractService') as ActivateContractService,
        c.make('terminateContractService') as TerminateContractService,
        c.make('adjustContractQuotaService') as AdjustContractQuotaService,
      ),
  )
}
```

- [ ] **Step 2：在主檔加入 import**

在主檔 `import { registerOrganizationsBindings } from './organizations'` 下方加入：

```typescript
import { registerContractsBindings } from './contracts'
```

- [ ] **Step 3：移除主檔已不再需要的 import**

從 `registerAdminBindings.ts` 移除：

```typescript
import type { ActivateContractService } from '@/Modules/Contract/Application/Services/ActivateContractService'
import type { AdjustContractQuotaService } from '@/Modules/Contract/Application/Services/AdjustContractQuotaService'
import type { CreateContractService } from '@/Modules/Contract/Application/Services/CreateContractService'
import type { GetContractDetailService } from '@/Modules/Contract/Application/Services/GetContractDetailService'
import type { ListAdminContractsService } from '@/Modules/Contract/Application/Services/ListAdminContractsService'
import type { TerminateContractService } from '@/Modules/Contract/Application/Services/TerminateContractService'
import { AdminContractCreatePage } from '../Pages/AdminContractCreatePage'
import { AdminContractDetailPage } from '../Pages/AdminContractDetailPage'
import { AdminContractsPage } from '../Pages/AdminContractsPage'
```

- [ ] **Step 4：用函式呼叫取代 contracts 區塊**

在 `registerAdminBindings.ts` 中找到並刪除以下三個區塊：

```typescript
  container.singleton(
    k.contracts,
    (c) =>
      new AdminContractsPage(
        c.make(i) as InertiaService,
        c.make('listAdminContractsService') as ListAdminContractsService,
      ),
  )

  container.singleton(
    k.contractCreate,
    (c) =>
      new AdminContractCreatePage(
        c.make(i) as InertiaService,
        c.make('createContractService') as CreateContractService,
      ),
  )

  container.singleton(
    k.contractDetail,
    (c) =>
      new AdminContractDetailPage(
        c.make(i) as InertiaService,
        c.make('getContractDetailService') as GetContractDetailService,
        c.make('activateContractService') as ActivateContractService,
        c.make('terminateContractService') as TerminateContractService,
        c.make('adjustContractQuotaService') as AdjustContractQuotaService,
      ),
  )
```

在原位置插入：

```typescript
  registerContractsBindings(container)
```

- [ ] **Step 5：跑安全網測試**

Run：
```bash
bun test src/Website/__tests__/Admin/registerAdminBindings.test.ts
```
Expected：PASS。

- [ ] **Step 6：跑 typecheck**

Run：
```bash
bun run typecheck
```
Expected：無錯誤。

- [ ] **Step 7：commit**

```bash
git add src/Website/Admin/bindings/contracts.ts src/Website/Admin/bindings/registerAdminBindings.ts
git commit -m "refactor: [admin-bindings] extract contracts bindings"
```

---

### Task 6：抽出 modules.ts

**Files:**
- Create: `src/Website/Admin/bindings/modules.ts`
- Modify: `src/Website/Admin/bindings/registerAdminBindings.ts`

- [ ] **Step 1：建立 `modules.ts`**

寫入 `src/Website/Admin/bindings/modules.ts`：

```typescript
import type { ListModulesService } from '@/Modules/AppModule/Application/Services/ListModulesService'
import type { RegisterModuleService } from '@/Modules/AppModule/Application/Services/RegisterModuleService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminModuleCreatePage } from '../Pages/AdminModuleCreatePage'
import { AdminModulesPage } from '../Pages/AdminModulesPage'

export function registerModulesBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(
    k.modules,
    (c) =>
      new AdminModulesPage(
        c.make(i) as InertiaService,
        c.make('listModulesService') as ListModulesService,
      ),
  )

  container.singleton(
    k.moduleCreate,
    (c) =>
      new AdminModuleCreatePage(
        c.make(i) as InertiaService,
        c.make('registerModuleService') as RegisterModuleService,
      ),
  )
}
```

- [ ] **Step 2：在主檔加入 import**

在主檔 `import { registerContractsBindings } from './contracts'` 下方加入：

```typescript
import { registerModulesBindings } from './modules'
```

- [ ] **Step 3：移除主檔已不再需要的 import**

從 `registerAdminBindings.ts` 移除：

```typescript
import type { ListModulesService } from '@/Modules/AppModule/Application/Services/ListModulesService'
import type { RegisterModuleService } from '@/Modules/AppModule/Application/Services/RegisterModuleService'
import { AdminModuleCreatePage } from '../Pages/AdminModuleCreatePage'
import { AdminModulesPage } from '../Pages/AdminModulesPage'
```

- [ ] **Step 4：用函式呼叫取代 modules 區塊**

在 `registerAdminBindings.ts` 中找到並刪除以下兩個區塊：

```typescript
  container.singleton(
    k.modules,
    (c) =>
      new AdminModulesPage(
        c.make(i) as InertiaService,
        c.make('listModulesService') as ListModulesService,
      ),
  )

  container.singleton(
    k.moduleCreate,
    (c) =>
      new AdminModuleCreatePage(
        c.make(i) as InertiaService,
        c.make('registerModuleService') as RegisterModuleService,
      ),
  )
```

在原位置插入：

```typescript
  registerModulesBindings(container)
```

- [ ] **Step 5：跑安全網測試**

Run：
```bash
bun test src/Website/__tests__/Admin/registerAdminBindings.test.ts
```
Expected：PASS。

- [ ] **Step 6：跑 typecheck**

Run：
```bash
bun run typecheck
```
Expected：無錯誤。

- [ ] **Step 7：commit**

```bash
git add src/Website/Admin/bindings/modules.ts src/Website/Admin/bindings/registerAdminBindings.ts
git commit -m "refactor: [admin-bindings] extract modules bindings"
```

---

### Task 7：抽出 apiKeys.ts

**Files:**
- Create: `src/Website/Admin/bindings/apiKeys.ts`
- Modify: `src/Website/Admin/bindings/registerAdminBindings.ts`

- [ ] **Step 1：建立 `apiKeys.ts`**

寫入 `src/Website/Admin/bindings/apiKeys.ts`：

```typescript
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminApiKeysPage } from '../Pages/AdminApiKeysPage'

export function registerApiKeysBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(
    k.apiKeys,
    (c) =>
      new AdminApiKeysPage(
        c.make(i) as InertiaService,
        c.make('listApiKeysService') as ListApiKeysService,
        c.make('listOrganizationsService') as ListOrganizationsService,
      ),
  )
}
```

- [ ] **Step 2：在主檔加入 import**

在主檔 `import { registerModulesBindings } from './modules'` 下方加入：

```typescript
import { registerApiKeysBindings } from './apiKeys'
```

- [ ] **Step 3：移除主檔已不再需要的 import**

ApiKeys 是 `ListOrganizationsService` 的最後一個使用者，可以一併移除。從 `registerAdminBindings.ts` 移除：

```typescript
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import { AdminApiKeysPage } from '../Pages/AdminApiKeysPage'
```

- [ ] **Step 4：用函式呼叫取代 apiKeys 區塊**

在 `registerAdminBindings.ts` 中找到並刪除：

```typescript
  container.singleton(
    k.apiKeys,
    (c) =>
      new AdminApiKeysPage(
        c.make(i) as InertiaService,
        c.make('listApiKeysService') as ListApiKeysService,
        c.make('listOrganizationsService') as ListOrganizationsService,
      ),
  )
```

在原位置插入：

```typescript
  registerApiKeysBindings(container)
```

- [ ] **Step 5：跑安全網測試**

Run：
```bash
bun test src/Website/__tests__/Admin/registerAdminBindings.test.ts
```
Expected：PASS。

- [ ] **Step 6：跑 typecheck**

Run：
```bash
bun run typecheck
```
Expected：無錯誤。

- [ ] **Step 7：commit**

```bash
git add src/Website/Admin/bindings/apiKeys.ts src/Website/Admin/bindings/registerAdminBindings.ts
git commit -m "refactor: [admin-bindings] extract apiKeys bindings"
```

---

### Task 8：抽出 reports.ts

**Files:**
- Create: `src/Website/Admin/bindings/reports.ts`
- Modify: `src/Website/Admin/bindings/registerAdminBindings.ts`

- [ ] **Step 1：建立 `reports.ts`**

寫入 `src/Website/Admin/bindings/reports.ts`：

```typescript
import type { IUsageRepository } from '@/Modules/Dashboard/Application/Ports/IUsageRepository'
import type { IReportRepository } from '@/Modules/Reports/Domain/Repositories/IReportRepository'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminReportsPage } from '../Pages/AdminReportsPage'
import { AdminReportTemplatePage } from '../Pages/AdminReportTemplatePage'

export function registerReportsBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(
    k.reports,
    (c) =>
      new AdminReportsPage(
        c.make(i) as InertiaService,
        c.make('reportRepository') as IReportRepository,
      ),
  )

  container.singleton(
    k.reportTemplate,
    (c) =>
      new AdminReportTemplatePage(
        c.make(i) as InertiaService,
        c.make('reportRepository') as IReportRepository,
        c.make('atlasUsageRepository') as IUsageRepository,
      ),
  )
}
```

- [ ] **Step 2：在主檔加入 import**

在主檔 `import { registerApiKeysBindings } from './apiKeys'` 下方加入：

```typescript
import { registerReportsBindings } from './reports'
```

- [ ] **Step 3：移除主檔已不再需要的 import**

從 `registerAdminBindings.ts` 移除：

```typescript
import type { IUsageRepository } from '@/Modules/Dashboard/Application/Ports/IUsageRepository'
import type { IReportRepository } from '@/Modules/Reports/Domain/Repositories/IReportRepository'
import { AdminReportsPage } from '../Pages/AdminReportsPage'
import { AdminReportTemplatePage } from '../Pages/AdminReportTemplatePage'
```

- [ ] **Step 4：用函式呼叫取代 reports 區塊**

在 `registerAdminBindings.ts` 中找到並刪除：

```typescript
  container.singleton(
    k.reports,
    (c) =>
      new AdminReportsPage(
        c.make(i) as InertiaService,
        c.make('reportRepository') as IReportRepository,
      ),
  )

  container.singleton(
    k.reportTemplate,
    (c) =>
      new AdminReportTemplatePage(
        c.make(i) as InertiaService,
        c.make('reportRepository') as IReportRepository,
        c.make('atlasUsageRepository') as IUsageRepository,
      ),
  )
```

在原位置插入：

```typescript
  registerReportsBindings(container)
```

- [ ] **Step 5：跑安全網測試**

Run：
```bash
bun test src/Website/__tests__/Admin/registerAdminBindings.test.ts
```
Expected：PASS。

- [ ] **Step 6：跑 typecheck**

Run：
```bash
bun run typecheck
```
Expected：無錯誤。

- [ ] **Step 7：commit**

```bash
git add src/Website/Admin/bindings/reports.ts src/Website/Admin/bindings/registerAdminBindings.ts
git commit -m "refactor: [admin-bindings] extract reports bindings"
```

---

### Task 9：抽出 usageSync.ts（最後一個 domain；同步把主檔縮為協調層）

**Files:**
- Create: `src/Website/Admin/bindings/usageSync.ts`
- Modify: `src/Website/Admin/bindings/registerAdminBindings.ts`

- [ ] **Step 1：建立 `usageSync.ts`**

寫入 `src/Website/Admin/bindings/usageSync.ts`：

```typescript
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { ADMIN_PAGE_KEYS } from '../keys'
import { AdminUsageSyncPage } from '../Pages/AdminUsageSyncPage'

export function registerUsageSyncBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = ADMIN_PAGE_KEYS

  container.singleton(k.usageSync, (c) => new AdminUsageSyncPage(c.make(i) as InertiaService))
}
```

- [ ] **Step 2：用最終協調層取代主檔**

把整個 `src/Website/Admin/bindings/registerAdminBindings.ts` 覆蓋為以下內容（這是抽完所有 domain 後的最終形態）：

```typescript
/**
 * Registers admin Inertia page classes as container singletons.
 *
 * 各 domain 的 Page 綁定分別定義在：
 * - dashboard.ts / users.ts / organizations.ts / contracts.ts
 * - modules.ts / apiKeys.ts / reports.ts / usageSync.ts
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { registerApiKeysBindings } from './apiKeys'
import { registerContractsBindings } from './contracts'
import { registerDashboardBindings } from './dashboard'
import { registerModulesBindings } from './modules'
import { registerOrganizationsBindings } from './organizations'
import { registerReportsBindings } from './reports'
import { registerUsageSyncBindings } from './usageSync'
import { registerUsersBindings } from './users'

/**
 * @param container - Gravito DI container; `InertiaService` must already be bound under
 *   `PAGE_CONTAINER_KEYS.inertiaService`.
 */
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

- [ ] **Step 3：跑安全網測試**

Run：
```bash
bun test src/Website/__tests__/Admin/registerAdminBindings.test.ts
```
Expected：PASS（仍然 14 個 assertion 全綠）。

- [ ] **Step 4：跑 typecheck**

Run：
```bash
bun run typecheck
```
Expected：無錯誤、無 unused import 警告。

- [ ] **Step 5：跑 full check（lint + typecheck + 全部測試）**

Run：
```bash
bun run check
```
Expected：全部通過。失敗時先 grep 失敗案例，確認是否為本次 refactor 造成（純搬移不該影響任何 admin page 行為）。

- [ ] **Step 6：commit**

```bash
git add src/Website/Admin/bindings/usageSync.ts src/Website/Admin/bindings/registerAdminBindings.ts
git commit -m "refactor: [admin-bindings] extract usageSync and reduce main file to coordinator"
```

---

### Task 10：最終驗證

**Files:** 無（純檢查）

- [ ] **Step 1：確認最終目錄結構**

Run：
```bash
ls src/Website/Admin/bindings/
```
Expected output（共 9 個檔）：
```
apiKeys.ts
contracts.ts
dashboard.ts
modules.ts
organizations.ts
registerAdminBindings.ts
reports.ts
usageSync.ts
users.ts
```

- [ ] **Step 2：確認主檔行數已大幅縮減**

Run：
```bash
wc -l src/Website/Admin/bindings/registerAdminBindings.ts
```
Expected：約 25–30 行（原本 183 行）。

- [ ] **Step 3：再跑一次完整 check**

Run：
```bash
bun run check
```
Expected：全部通過。

- [ ] **Step 4：檢查 commit 歷史**

Run：
```bash
git log --oneline -10
```
Expected：可看到 1 個 test commit + 8 個 refactor commit。

不需要再 commit；本任務僅作驗證。

---

## 自我審查摘要

- **規格覆蓋**：8 個子檔（dashboard / users / organizations / contracts / modules / apiKeys / reports / usageSync）全部對應到 Task 2–9；主檔協調層對應 Task 9 Step 2；目錄結構對應 Task 10 Step 1；不在範圍的型別安全改善 / `keys.ts` 調整 / 路由層修改皆未觸碰。
- **無 placeholder**：每個 step 都有明確指令、完整程式碼、預期輸出。
- **型別 / 命名一致性**：所有 `register<Domain>Bindings` 函式名稱、檔名、import 路徑與規格一致；Page class 名稱、service key 字串、cast 型別與原始碼 `registerAdminBindings.ts` 完全一致。
- **TDD 紀律**：純搬移不適用 RED→GREEN，但 Task 1 建立 characterization test 作為 8 次搬移的 regression 安全網，每次搬移都驗證它仍綠。
