# Website 資料夾架構重組 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 `src/Pages/` 重組為 `src/Website/`，建立三層清晰邊界（使用者情境切片、Http runtime、組合根），消除 Infrastructure 職責散落頂層的問題。

**Architecture:** 按使用者情境（Admin / Auth / Member）切片，每個切片自含 Pages、middleware、routes、bindings、keys；Http runtime 元件集中於 `Http/`；`bootstrap/` 為組合根，是唯一對外的框架接合點。

**Tech Stack:** TypeScript strict mode、Bun runtime、`@/` path alias（映射 `src/`）、Gravito DI container、Inertia.js SSR

---

## 檔案對照總表

### Http 層（新位置 → 舊位置）

| 新路徑 | 舊路徑 | 說明 |
|--------|--------|------|
| `src/Website/Http/Inertia/InertiaRequestHandler.ts` | `src/Pages/InertiaService.ts` | 檔名改，class 名稱不動 |
| `src/Website/Http/Inertia/SharedPropsBuilder.ts` | `src/Pages/SharedDataMiddleware.ts` | 檔名改，函式名稱不動 |
| `src/Website/Http/Inertia/withInertiaPage.ts` | `src/Pages/routing/withInertiaPage.ts` | 純移動 |
| `src/Website/Http/Inertia/createInertiaRequestHandler.ts` | `src/Pages/routing/inertiaFactory.ts` | 檔名改，函式名稱不動 |
| `src/Website/Http/Routing/bindPageAction.ts` | `src/Pages/routing/bindPageAction.ts` | 純移動 |
| `src/Website/Http/Routing/routePath.ts` | `src/Pages/routing/pathUtils.ts` | 檔名改，函式名稱不動 |
| `src/Website/Http/Assets/ViteTagHelper.ts` | `src/Pages/ViteTagHelper.ts` | 純移動 |
| `src/Website/Http/Security/CsrfMiddleware.ts` | `src/Pages/routing/webCsrfMiddleware.ts` | 純移動 |

### Admin 切片

| 新路徑 | 舊路徑 |
|--------|--------|
| `src/Website/Admin/keys.ts` | `src/Pages/routing/admin/adminPageKeys.ts` |
| `src/Website/Admin/middleware/requireAdmin.ts` | `src/Pages/Admin/helpers/requireAdmin.ts` |
| `src/Website/Admin/Pages/Admin*.ts`（14 個） | `src/Pages/Admin/Admin*.ts` |
| `src/Website/Admin/routes/registerAdminRoutes.ts` | `src/Pages/routing/registerAdminPageRoutes.ts` |
| `src/Website/Admin/bindings/registerAdminBindings.ts` | `src/Pages/routing/admin/registerAdminPageBindings.ts` |

### Auth 切片

| 新路徑 | 舊路徑 |
|--------|--------|
| `src/Website/Auth/keys.ts` | `src/Pages/routing/auth/authPageKeys.ts` |
| `src/Website/Auth/Pages/XxxPage.ts`（7 個） | `src/Pages/Auth/XxxPage.ts` |
| `src/Website/Auth/routes/registerAuthRoutes.ts` | `src/Pages/routing/registerAuthPageRoutes.ts` |
| `src/Website/Auth/bindings/registerAuthBindings.ts` | `src/Pages/routing/auth/registerAuthPageBindings.ts` |

### Member 切片

| 新路徑 | 舊路徑 |
|--------|--------|
| `src/Website/Member/keys.ts` | `src/Pages/routing/member/memberPageKeys.ts` |
| `src/Website/Member/middleware/requireMember.ts` | `src/Pages/Member/helpers/requireMember.ts` |
| `src/Website/Member/Pages/Member*.ts`（9 個） | `src/Pages/Member/Member*.ts` |
| `src/Website/Member/routes/registerMemberRoutes.ts` | `src/Pages/routing/registerMemberPageRoutes.ts` |
| `src/Website/Member/bindings/registerMemberBindings.ts` | `src/Pages/routing/member/registerMemberPageBindings.ts` |

### Bootstrap 層（全新組合）

| 新路徑 | 來源 |
|--------|------|
| `src/Website/bootstrap/WebsiteServiceProvider.ts` | `src/Pages/Infrastructure/Providers/PagesServiceProvider.ts` 改寫 |
| `src/Website/bootstrap/registerWebsiteBindings.ts` | 從 `WebsiteServiceProvider.register()` 抽出為純函式 |
| `src/Website/bootstrap/registerWebsiteRoutes.ts` | `src/Pages/page-routes.ts` + 內聯 `registerPageStaticRoutes.ts` |

### 測試遷移

| 新路徑 | 舊路徑 |
|--------|--------|
| `src/Website/__tests__/Http/InertiaRequestHandler.test.ts` | `src/Pages/__tests__/InertiaService.test.ts` |
| `src/Website/__tests__/Http/SharedPropsBuilder.test.ts` | `src/Pages/__tests__/SharedDataMiddleware.test.ts` |
| `src/Website/__tests__/Http/ViteTagHelper.test.ts` | `src/Pages/__tests__/ViteTagHelper.test.ts` |
| `src/Website/__tests__/Http/CsrfMiddleware.test.ts` | `src/Pages/__tests__/webCsrfMiddleware.test.ts` |
| `src/Website/__tests__/bootstrap/registerWebsiteRoutes.test.ts` | `src/Pages/__tests__/page-routes.test.ts` |
| `src/Website/__tests__/Admin/Admin*.test.ts` | `src/Pages/__tests__/Admin/Admin*.test.ts` |
| `src/Website/__tests__/Auth/*.test.ts` | `src/Pages/__tests__/Auth/*.test.ts` |
| `src/Website/__tests__/Member/Member*.test.ts` | `src/Pages/__tests__/Member/Member*.test.ts` |
| `src/Website/__tests__/fixtures/` | `src/Pages/__tests__/fixtures/` |
| `src/Website/__tests__/admin-page-i18n.test.ts` | `src/Pages/__tests__/admin-page-i18n.test.ts` |
| `src/Website/__tests__/member-page-i18n.test.ts` | `src/Pages/__tests__/member-page-i18n.test.ts` |

---

## 執行策略

這是純粹的結構性重組（純 rename/move，無邏輯變更）：
- Class 和函式名稱全部不動，只改檔案路徑
- 每個 Task 移動一個邏輯層，結束後執行測試確認 green
- 每個 Task 結束後 commit

**Import 路徑替換原則：**
- `@/Pages/InertiaService` → `@/Website/Http/Inertia/InertiaRequestHandler`
- `@/Pages/SharedDataMiddleware` → `@/Website/Http/Inertia/SharedPropsBuilder`
- `@/Pages/ViteTagHelper` → `@/Website/Http/Assets/ViteTagHelper`
- `@/Pages/pageContainerKeys` → `@/Website/Http/Inertia/createInertiaRequestHandler`
- `@/Pages/routing/inertiaFactory` → `@/Website/Http/Inertia/createInertiaRequestHandler`
- `@/Pages/routing/withInertiaPage` → `@/Website/Http/Inertia/withInertiaPage`
- `@/Pages/routing/bindPageAction` → `@/Website/Http/Routing/bindPageAction`
- `@/Pages/routing/pathUtils` → `@/Website/Http/Routing/routePath`
- `@/Pages/routing/webCsrfMiddleware` → `@/Website/Http/Security/CsrfMiddleware`
- `@/Pages/routing/admin/adminPageKeys` → `@/Website/Admin/keys`
- `@/Pages/routing/auth/authPageKeys` → `@/Website/Auth/keys`
- `@/Pages/routing/member/memberPageKeys` → `@/Website/Member/keys`
- `@/Pages/routing/admin/registerAdminPageBindings` → `@/Website/Admin/bindings/registerAdminBindings`
- `@/Pages/routing/auth/registerAuthPageBindings` → `@/Website/Auth/bindings/registerAuthBindings`
- `@/Pages/routing/member/registerMemberPageBindings` → `@/Website/Member/bindings/registerMemberBindings`
- `@/Pages/Admin/AdminXxxPage` → `@/Website/Admin/Pages/AdminXxxPage`
- `@/Pages/Auth/XxxPage` → `@/Website/Auth/Pages/XxxPage`
- `@/Pages/Member/MemberXxxPage` → `@/Website/Member/Pages/MemberXxxPage`
- `@/Pages/Infrastructure/Providers/PagesServiceProvider` → `@/Website/bootstrap/WebsiteServiceProvider`
- `./Pages/page-routes` → `./Website/bootstrap/registerWebsiteRoutes`（相對 import）

---

## Task 1: 建立基線

**Files:**
- 無修改

- [ ] **Step 1: 確認目前所有測試通過**

```bash
bun test src tests/Unit packages 2>&1 | tail -20
```

預期：所有測試 PASS（沒有 FAIL）

- [ ] **Step 2: 確認 TypeScript 編譯無錯誤**

```bash
bunx tsc --noEmit 2>&1 | head -30
```

預期：無輸出（0 errors）

---

## Task 2: 建立 Http/Inertia 層

**Files:**
- Create: `src/Website/Http/Inertia/InertiaRequestHandler.ts`
- Create: `src/Website/Http/Inertia/SharedPropsBuilder.ts`
- Create: `src/Website/Http/Inertia/withInertiaPage.ts`
- Create: `src/Website/Http/Inertia/createInertiaRequestHandler.ts`
- Delete: `src/Pages/InertiaService.ts`
- Delete: `src/Pages/SharedDataMiddleware.ts`
- Delete: `src/Pages/routing/withInertiaPage.ts`
- Delete: `src/Pages/routing/inertiaFactory.ts`
- Delete: `src/Pages/pageContainerKeys.ts`

- [ ] **Step 1: 建立目錄結構**

```bash
mkdir -p src/Website/Http/Inertia
```

- [ ] **Step 2: 移動並更新 InertiaRequestHandler.ts**

```bash
git mv src/Pages/InertiaService.ts src/Website/Http/Inertia/InertiaRequestHandler.ts
```

`InertiaRequestHandler.ts` 內部無需改動（class 名稱維持 `InertiaService`，無 `@/Pages/` import）。

- [ ] **Step 3: 移動並更新 SharedPropsBuilder.ts**

```bash
git mv src/Pages/SharedDataMiddleware.ts src/Website/Http/Inertia/SharedPropsBuilder.ts
```

`SharedPropsBuilder.ts` 內部無 `@/Pages/` import，無需修改。

- [ ] **Step 4: 移動 withInertiaPage.ts 並更新其 import**

```bash
git mv src/Pages/routing/withInertiaPage.ts src/Website/Http/Inertia/withInertiaPage.ts
```

編輯 `src/Website/Http/Inertia/withInertiaPage.ts`，將：
```typescript
import { injectSharedData } from '../SharedDataMiddleware'
import { attachWebCsrf } from './webCsrfMiddleware'
```
改為：
```typescript
import { injectSharedData } from './SharedPropsBuilder'
import { attachWebCsrf } from '../Security/CsrfMiddleware'
```

- [ ] **Step 5: 移動 createInertiaRequestHandler.ts 並更新其 import 與 export**

```bash
git mv src/Pages/routing/inertiaFactory.ts src/Website/Http/Inertia/createInertiaRequestHandler.ts
```

編輯 `src/Website/Http/Inertia/createInertiaRequestHandler.ts`：

將：
```typescript
import { InertiaService } from '../InertiaService'
import { type ViteManifest, ViteTagHelper } from '../ViteTagHelper'
import { joinPath } from './pathUtils'
```
改為：
```typescript
import { InertiaService } from './InertiaRequestHandler'
import { type ViteManifest, ViteTagHelper } from '../Assets/ViteTagHelper'
import { joinPath } from '../Routing/routePath'
```

並在檔案頂部（所有 import 之後）新增 `PAGE_CONTAINER_KEYS` 常數（取代被刪掉的 `pageContainerKeys.ts`）：

```typescript
/**
 * DI container keys for the Inertia presentation shell.
 */
export const PAGE_CONTAINER_KEYS = {
  inertiaService: 'inertiaService',
} as const
```

- [ ] **Step 6: 刪除已整合的 pageContainerKeys.ts**

```bash
git rm src/Pages/pageContainerKeys.ts
```

- [ ] **Step 7: 確認編譯（預期此時 Http/Inertia 層內部一致，其他檔案尚有斷裂）**

```bash
bunx tsc --noEmit 2>&1 | grep "Website/Http/Inertia" | head -20
```

---

## Task 3: 建立 Http/Routing、Http/Assets、Http/Security 層

**Files:**
- Create: `src/Website/Http/Routing/bindPageAction.ts`
- Create: `src/Website/Http/Routing/routePath.ts`
- Create: `src/Website/Http/Assets/ViteTagHelper.ts`
- Create: `src/Website/Http/Security/CsrfMiddleware.ts`
- Delete: `src/Pages/routing/bindPageAction.ts`
- Delete: `src/Pages/routing/pathUtils.ts`
- Delete: `src/Pages/ViteTagHelper.ts`
- Delete: `src/Pages/routing/webCsrfMiddleware.ts`

- [ ] **Step 1: 建立目錄**

```bash
mkdir -p src/Website/Http/Routing src/Website/Http/Assets src/Website/Http/Security
```

- [ ] **Step 2: 移動 bindPageAction.ts**

```bash
git mv src/Pages/routing/bindPageAction.ts src/Website/Http/Routing/bindPageAction.ts
```

`bindPageAction.ts` 無 `@/Pages/` import，無需修改。

- [ ] **Step 3: 移動 routePath.ts（原 pathUtils.ts）**

```bash
git mv src/Pages/routing/pathUtils.ts src/Website/Http/Routing/routePath.ts
```

`routePath.ts` 無 `@/Pages/` import，無需修改。函式名稱 `joinPath` / `normalizePath` 維持不動。

- [ ] **Step 4: 移動 ViteTagHelper.ts**

```bash
git mv src/Pages/ViteTagHelper.ts src/Website/Http/Assets/ViteTagHelper.ts
```

`ViteTagHelper.ts` 無 `@/Pages/` import，無需修改。

- [ ] **Step 5: 移動 CsrfMiddleware.ts（原 webCsrfMiddleware.ts）**

```bash
git mv src/Pages/routing/webCsrfMiddleware.ts src/Website/Http/Security/CsrfMiddleware.ts
```

`CsrfMiddleware.ts` 無 `@/Pages/` import，無需修改。

- [ ] **Step 6: 驗證 Http 層本身編譯正確**

```bash
bunx tsc --noEmit 2>&1 | grep "Website/Http" | head -20
```

- [ ] **Step 7: Commit Http 層**

```bash
git add src/Website/Http/
git commit -m "refactor: [website] 建立 Http runtime 層（Inertia / Routing / Assets / Security）"
```

---

## Task 4: 建立 Admin 切片

**Files:**
- Create: `src/Website/Admin/keys.ts`
- Create: `src/Website/Admin/middleware/requireAdmin.ts`
- Create: `src/Website/Admin/Pages/Admin*.ts`（14 個）
- Create: `src/Website/Admin/routes/registerAdminRoutes.ts`
- Create: `src/Website/Admin/bindings/registerAdminBindings.ts`

- [ ] **Step 1: 建立目錄**

```bash
mkdir -p src/Website/Admin/Pages src/Website/Admin/middleware \
         src/Website/Admin/routes src/Website/Admin/bindings
```

- [ ] **Step 2: 移動 keys.ts（原 adminPageKeys.ts）**

```bash
git mv src/Pages/routing/admin/adminPageKeys.ts src/Website/Admin/keys.ts
```

`keys.ts` 無 `@/Pages/` import，無需修改。

- [ ] **Step 3: 移動 Admin middleware**

```bash
git mv src/Pages/Admin/helpers/requireAdmin.ts src/Website/Admin/middleware/requireAdmin.ts
```

檢查是否有 `@/Pages/` import：

```bash
grep "@/Pages" src/Website/Admin/middleware/requireAdmin.ts
```

若有，依 import 替換原則修改。

- [ ] **Step 4: 移動全部 Admin Page 檔案**

```bash
git mv src/Pages/Admin/AdminApiKeysPage.ts        src/Website/Admin/Pages/AdminApiKeysPage.ts
git mv src/Pages/Admin/AdminContractCreatePage.ts  src/Website/Admin/Pages/AdminContractCreatePage.ts
git mv src/Pages/Admin/AdminContractDetailPage.ts  src/Website/Admin/Pages/AdminContractDetailPage.ts
git mv src/Pages/Admin/AdminContractsPage.ts       src/Website/Admin/Pages/AdminContractsPage.ts
git mv src/Pages/Admin/AdminDashboardPage.ts       src/Website/Admin/Pages/AdminDashboardPage.ts
git mv src/Pages/Admin/AdminModuleCreatePage.ts    src/Website/Admin/Pages/AdminModuleCreatePage.ts
git mv src/Pages/Admin/AdminModulesPage.ts         src/Website/Admin/Pages/AdminModulesPage.ts
git mv src/Pages/Admin/AdminOrganizationDetailPage.ts src/Website/Admin/Pages/AdminOrganizationDetailPage.ts
git mv src/Pages/Admin/AdminOrganizationsPage.ts   src/Website/Admin/Pages/AdminOrganizationsPage.ts
git mv src/Pages/Admin/AdminReportsPage.ts         src/Website/Admin/Pages/AdminReportsPage.ts
git mv src/Pages/Admin/AdminReportTemplatePage.ts  src/Website/Admin/Pages/AdminReportTemplatePage.ts
git mv src/Pages/Admin/AdminUsageSyncPage.ts       src/Website/Admin/Pages/AdminUsageSyncPage.ts
git mv src/Pages/Admin/AdminUserDetailPage.ts      src/Website/Admin/Pages/AdminUserDetailPage.ts
git mv src/Pages/Admin/AdminUsersPage.ts           src/Website/Admin/Pages/AdminUsersPage.ts
```

- [ ] **Step 5: 更新每個 Admin Page 的 @/Pages/ import**

每個 Admin Page 檔案都有：
```typescript
import type { InertiaService } from '@/Pages/InertiaService'
```
全部改為：
```typescript
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
```

執行批次替換：
```bash
sed -i '' "s|from '@/Pages/InertiaService'|from '@/Website/Http/Inertia/InertiaRequestHandler'|g" \
  src/Website/Admin/Pages/*.ts
```

- [ ] **Step 6: 移動 registerAdminRoutes.ts（原 registerAdminPageRoutes.ts）**

```bash
git mv src/Pages/routing/registerAdminPageRoutes.ts src/Website/Admin/routes/registerAdminRoutes.ts
```

更新 `src/Website/Admin/routes/registerAdminRoutes.ts` 內部 imports：

```typescript
// 舊
import type { AdminPageBindingKey } from './admin/adminPageKeys'
import { ADMIN_PAGE_KEYS } from './admin/adminPageKeys'
import { bindPageAction } from './bindPageAction'
import { withInertiaPageHandler } from './withInertiaPage'

// 新
import type { AdminPageBindingKey } from '../keys'
import { ADMIN_PAGE_KEYS } from '../keys'
import { bindPageAction } from '@/Website/Http/Routing/bindPageAction'
import { withInertiaPageHandler } from '@/Website/Http/Inertia/withInertiaPage'
```

- [ ] **Step 7: 移動 registerAdminBindings.ts（原 registerAdminPageBindings.ts）**

```bash
git mv src/Pages/routing/admin/registerAdminPageBindings.ts src/Website/Admin/bindings/registerAdminBindings.ts
```

更新 `src/Website/Admin/bindings/registerAdminBindings.ts` 內部 imports：

```typescript
// 舊
import type { InertiaService } from '@/Pages/InertiaService'
import { PAGE_CONTAINER_KEYS } from '@/Pages/pageContainerKeys'
import { AdminApiKeysPage } from '../../Admin/AdminApiKeysPage'
// ... 其他 14 個相對 import
import { ADMIN_PAGE_KEYS } from './adminPageKeys'

// 新
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import { AdminApiKeysPage } from '../Pages/AdminApiKeysPage'
import { AdminContractCreatePage } from '../Pages/AdminContractCreatePage'
import { AdminContractDetailPage } from '../Pages/AdminContractDetailPage'
import { AdminContractsPage } from '../Pages/AdminContractsPage'
import { AdminDashboardPage } from '../Pages/AdminDashboardPage'
import { AdminModuleCreatePage } from '../Pages/AdminModuleCreatePage'
import { AdminModulesPage } from '../Pages/AdminModulesPage'
import { AdminOrganizationDetailPage } from '../Pages/AdminOrganizationDetailPage'
import { AdminOrganizationsPage } from '../Pages/AdminOrganizationsPage'
import { AdminReportsPage } from '../Pages/AdminReportsPage'
import { AdminReportTemplatePage } from '../Pages/AdminReportTemplatePage'
import { AdminUsageSyncPage } from '../Pages/AdminUsageSyncPage'
import { AdminUserDetailPage } from '../Pages/AdminUserDetailPage'
import { AdminUsersPage } from '../Pages/AdminUsersPage'
import { ADMIN_PAGE_KEYS } from '../keys'
```

- [ ] **Step 8: Commit Admin 切片**

```bash
git add src/Website/Admin/
git commit -m "refactor: [website] 建立 Admin 切片（keys / middleware / Pages / routes / bindings）"
```

---

## Task 5: 建立 Auth 切片

**Files:**
- Create: `src/Website/Auth/keys.ts`
- Create: `src/Website/Auth/Pages/`（7 個 Page 檔案）
- Create: `src/Website/Auth/routes/registerAuthRoutes.ts`
- Create: `src/Website/Auth/bindings/registerAuthBindings.ts`

- [ ] **Step 1: 建立目錄**

```bash
mkdir -p src/Website/Auth/Pages src/Website/Auth/routes src/Website/Auth/bindings
```

- [ ] **Step 2: 移動 keys.ts（原 authPageKeys.ts）**

```bash
git mv src/Pages/routing/auth/authPageKeys.ts src/Website/Auth/keys.ts
```

`keys.ts` 無 `@/Pages/` import，無需修改。

- [ ] **Step 3: 移動全部 Auth Page 檔案**

```bash
git mv src/Pages/Auth/EmailVerificationPage.ts  src/Website/Auth/Pages/EmailVerificationPage.ts
git mv src/Pages/Auth/ForgotPasswordPage.ts     src/Website/Auth/Pages/ForgotPasswordPage.ts
git mv src/Pages/Auth/GoogleOAuthCallbackPage.ts src/Website/Auth/Pages/GoogleOAuthCallbackPage.ts
git mv src/Pages/Auth/LoginPage.ts              src/Website/Auth/Pages/LoginPage.ts
git mv src/Pages/Auth/RegisterPage.ts           src/Website/Auth/Pages/RegisterPage.ts
git mv src/Pages/Auth/ResetPasswordPage.ts      src/Website/Auth/Pages/ResetPasswordPage.ts
git mv src/Pages/Auth/VerifyDevicePage.ts       src/Website/Auth/Pages/VerifyDevicePage.ts
```

- [ ] **Step 4: 更新 Auth Page 檔案的 @/Pages/ import**

```bash
sed -i '' "s|from '@/Pages/InertiaService'|from '@/Website/Http/Inertia/InertiaRequestHandler'|g" \
  src/Website/Auth/Pages/*.ts
```

- [ ] **Step 5: 移動 registerAuthRoutes.ts（原 registerAuthPageRoutes.ts）**

```bash
git mv src/Pages/routing/registerAuthPageRoutes.ts src/Website/Auth/routes/registerAuthRoutes.ts
```

更新內部 imports：
```typescript
// 舊
import { AUTH_PAGE_KEYS } from './auth/authPageKeys'
import { bindPageAction } from './bindPageAction'
import { withInertiaPageHandler } from './withInertiaPage'

// 新
import { AUTH_PAGE_KEYS } from '../keys'
import { bindPageAction } from '@/Website/Http/Routing/bindPageAction'
import { withInertiaPageHandler } from '@/Website/Http/Inertia/withInertiaPage'
```

- [ ] **Step 6: 移動 registerAuthBindings.ts（原 registerAuthPageBindings.ts）**

```bash
git mv src/Pages/routing/auth/registerAuthPageBindings.ts src/Website/Auth/bindings/registerAuthBindings.ts
```

更新內部 imports：
```typescript
// 舊
import { EmailVerificationPage } from '@/Pages/Auth/EmailVerificationPage'
import { ForgotPasswordPage } from '@/Pages/Auth/ForgotPasswordPage'
import { GoogleOAuthCallbackPage } from '@/Pages/Auth/GoogleOAuthCallbackPage'
import { LoginPage } from '@/Pages/Auth/LoginPage'
import { RegisterPage } from '@/Pages/Auth/RegisterPage'
import { ResetPasswordPage } from '@/Pages/Auth/ResetPasswordPage'
import { VerifyDevicePage } from '@/Pages/Auth/VerifyDevicePage'
import type { InertiaService } from '@/Pages/InertiaService'
import { PAGE_CONTAINER_KEYS } from '@/Pages/pageContainerKeys'
import { AUTH_PAGE_KEYS } from './authPageKeys'

// 新
import { EmailVerificationPage } from '../Pages/EmailVerificationPage'
import { ForgotPasswordPage } from '../Pages/ForgotPasswordPage'
import { GoogleOAuthCallbackPage } from '../Pages/GoogleOAuthCallbackPage'
import { LoginPage } from '../Pages/LoginPage'
import { RegisterPage } from '../Pages/RegisterPage'
import { ResetPasswordPage } from '../Pages/ResetPasswordPage'
import { VerifyDevicePage } from '../Pages/VerifyDevicePage'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import { AUTH_PAGE_KEYS } from '../keys'
```

- [ ] **Step 7: Commit Auth 切片**

```bash
git add src/Website/Auth/
git commit -m "refactor: [website] 建立 Auth 切片（keys / Pages / routes / bindings）"
```

---

## Task 6: 建立 Member 切片

**Files:**
- Create: `src/Website/Member/keys.ts`
- Create: `src/Website/Member/middleware/requireMember.ts`
- Create: `src/Website/Member/Pages/`（9 個 Page 檔案）
- Create: `src/Website/Member/routes/registerMemberRoutes.ts`
- Create: `src/Website/Member/bindings/registerMemberBindings.ts`

- [ ] **Step 1: 建立目錄**

```bash
mkdir -p src/Website/Member/Pages src/Website/Member/middleware \
         src/Website/Member/routes src/Website/Member/bindings
```

- [ ] **Step 2: 移動 keys.ts（原 memberPageKeys.ts）**

```bash
git mv src/Pages/routing/member/memberPageKeys.ts src/Website/Member/keys.ts
```

- [ ] **Step 3: 移動 Member middleware**

```bash
git mv src/Pages/Member/helpers/requireMember.ts src/Website/Member/middleware/requireMember.ts
```

檢查是否有 `@/Pages/` import：
```bash
grep "@/Pages" src/Website/Member/middleware/requireMember.ts
```

若有，依 import 替換原則修改。

- [ ] **Step 4: 移動全部 Member Page 檔案**

```bash
git mv src/Pages/Member/MemberAlertsPage.ts       src/Website/Member/Pages/MemberAlertsPage.ts
git mv src/Pages/Member/MemberApiKeyCreatePage.ts  src/Website/Member/Pages/MemberApiKeyCreatePage.ts
git mv src/Pages/Member/MemberApiKeyRevokeHandler.ts src/Website/Member/Pages/MemberApiKeyRevokeHandler.ts
git mv src/Pages/Member/MemberApiKeysPage.ts       src/Website/Member/Pages/MemberApiKeysPage.ts
git mv src/Pages/Member/MemberContractsPage.ts     src/Website/Member/Pages/MemberContractsPage.ts
git mv src/Pages/Member/MemberCostBreakdownPage.ts src/Website/Member/Pages/MemberCostBreakdownPage.ts
git mv src/Pages/Member/MemberDashboardPage.ts     src/Website/Member/Pages/MemberDashboardPage.ts
git mv src/Pages/Member/MemberSettingsPage.ts      src/Website/Member/Pages/MemberSettingsPage.ts
git mv src/Pages/Member/MemberUsagePage.ts         src/Website/Member/Pages/MemberUsagePage.ts
```

- [ ] **Step 5: 更新 Member Page 檔案的 @/Pages/ import**

```bash
sed -i '' "s|from '@/Pages/InertiaService'|from '@/Website/Http/Inertia/InertiaRequestHandler'|g" \
  src/Website/Member/Pages/*.ts
```

- [ ] **Step 6: 移動 registerMemberRoutes.ts（原 registerMemberPageRoutes.ts）**

```bash
git mv src/Pages/routing/registerMemberPageRoutes.ts src/Website/Member/routes/registerMemberRoutes.ts
```

更新內部 imports：
```typescript
// 舊
import { bindPageAction } from './bindPageAction'
import type { MemberPageBindingKey } from './member/memberPageKeys'
import { MEMBER_PAGE_KEYS } from './member/memberPageKeys'
import { withInertiaPageHandler } from './withInertiaPage'

// 新
import { bindPageAction } from '@/Website/Http/Routing/bindPageAction'
import type { MemberPageBindingKey } from '../keys'
import { MEMBER_PAGE_KEYS } from '../keys'
import { withInertiaPageHandler } from '@/Website/Http/Inertia/withInertiaPage'
```

- [ ] **Step 7: 移動 registerMemberBindings.ts（原 registerMemberPageBindings.ts）**

```bash
git mv src/Pages/routing/member/registerMemberPageBindings.ts src/Website/Member/bindings/registerMemberBindings.ts
```

更新內部 imports：
```typescript
// 舊
import type { InertiaService } from '@/Pages/InertiaService'
import { PAGE_CONTAINER_KEYS } from '@/Pages/pageContainerKeys'
import { MemberAlertsPage } from '../../Member/MemberAlertsPage'
// ... 其他相對 import
import { MEMBER_PAGE_KEYS } from './memberPageKeys'

// 新
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import { MemberAlertsPage } from '../Pages/MemberAlertsPage'
import { MemberApiKeyCreatePage } from '../Pages/MemberApiKeyCreatePage'
import { MemberApiKeyRevokeHandler } from '../Pages/MemberApiKeyRevokeHandler'
import { MemberApiKeysPage } from '../Pages/MemberApiKeysPage'
import { MemberContractsPage } from '../Pages/MemberContractsPage'
import { MemberCostBreakdownPage } from '../Pages/MemberCostBreakdownPage'
import { MemberDashboardPage } from '../Pages/MemberDashboardPage'
import { MemberSettingsPage } from '../Pages/MemberSettingsPage'
import { MemberUsagePage } from '../Pages/MemberUsagePage'
import { MEMBER_PAGE_KEYS } from '../keys'
```

- [ ] **Step 8: Commit Member 切片**

```bash
git add src/Website/Member/
git commit -m "refactor: [website] 建立 Member 切片（keys / middleware / Pages / routes / bindings）"
```

---

## Task 7: 建立 Bootstrap 層

**Files:**
- Create: `src/Website/bootstrap/WebsiteServiceProvider.ts`
- Create: `src/Website/bootstrap/registerWebsiteBindings.ts`
- Create: `src/Website/bootstrap/registerWebsiteRoutes.ts`

- [ ] **Step 1: 建立目錄**

```bash
mkdir -p src/Website/bootstrap
```

- [ ] **Step 2: 建立 registerWebsiteBindings.ts（純函式，從 PagesServiceProvider.register() 抽出）**

Create: `src/Website/bootstrap/registerWebsiteBindings.ts`

```typescript
import { registerAdminBindings } from '@/Website/Admin/bindings/registerAdminBindings'
import { registerAuthBindings } from '@/Website/Auth/bindings/registerAuthBindings'
import { PAGE_CONTAINER_KEYS, getInertiaServiceSingleton } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import { registerMemberBindings } from '@/Website/Member/bindings/registerMemberBindings'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'

/**
 * Registers all Website DI bindings: Inertia runtime + all slice page handlers.
 *
 * Must run after module providers that register services pages depend on.
 * `bootstrap` must `await warmInertiaService()` before route resolution.
 *
 * @param container - Gravito DI container.
 */
export function registerWebsiteBindings(container: IContainer): void {
  const { inertiaService } = PAGE_CONTAINER_KEYS
  container.singleton(inertiaService, () => getInertiaServiceSingleton())
  registerAuthBindings(container)
  registerAdminBindings(container)
  registerMemberBindings(container)
}
```

- [ ] **Step 3: 建立 WebsiteServiceProvider.ts（框架 adapter，純轉呼叫）**

Create: `src/Website/bootstrap/WebsiteServiceProvider.ts`

```typescript
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { registerWebsiteBindings } from './registerWebsiteBindings'

export { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'

/**
 * WebsiteServiceProvider
 *
 * Gravito framework adapter for the Website module.
 * Delegates all DI registration to `registerWebsiteBindings` (pure function, independently testable).
 * Route registration happens later in `registerWebsiteRoutes`.
 */
export class WebsiteServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    registerWebsiteBindings(container)
  }

  override boot(_context: unknown): void {
    console.log('📄 [Website] Inertia page bundles registered')
  }
}
```

- [ ] **Step 4: 建立 registerWebsiteRoutes.ts（組合所有 routes，內聯 static assets）**

Create: `src/Website/bootstrap/registerWebsiteRoutes.ts`

```typescript
/**
 * Website route registration: composes Admin / Auth / Member declarative routes
 * and optional Vite build static assets under `/build/*`.
 *
 * Expects `WebsiteServiceProvider` to have registered page bindings on `container`.
 */
import { registerAdminRoutes } from '@/Website/Admin/routes/registerAdminRoutes'
import { registerAuthRoutes } from '@/Website/Auth/routes/registerAuthRoutes'
import { useBuiltFrontendAssets } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import { joinPath, normalizePath } from '@/Website/Http/Routing/routePath'
import { registerMemberRoutes } from '@/Website/Member/routes/registerMemberRoutes'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'

type WebsiteRouteRegistration = {
  label: string
  register: (router: IModuleRouter, container: IContainer) => void
}

function safeDecodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

function registerStaticAssets(router: Pick<IModuleRouter, 'get'>): void {
  if (!useBuiltFrontendAssets()) {
    return
  }

  const staticDir = joinPath(process.cwd(), 'public')

  router.get(
    '/build/*',
    async (ctx: IHttpContext) => {
      const pathname = safeDecodePathname(ctx.getPathname())
      if (!pathname.startsWith('/build/')) {
        return new Response('Not Found', { status: 404 })
      }
      const relative = pathname.replace(/^\/+/, '')
      const filePath = joinPath(staticDir, relative)
      const normalizedStatic = normalizePath(staticDir)
      const normalizedFilePath = normalizePath(filePath)
      if (!normalizedFilePath.startsWith(normalizedStatic)) {
        return new Response('Forbidden', { status: 403 })
      }
      try {
        const file = Bun.file(filePath)
        if (await file.exists()) {
          return new Response(file)
        }
      } catch {
        /* ignore */
      }
      return new Response('Not Found', { status: 404 })
    },
    { name: 'assets.vite.build' },
  )
}

/** Order matters: auth → admin → member → static assets. */
const WEBSITE_ROUTE_REGISTRATIONS: readonly WebsiteRouteRegistration[] = [
  { label: 'Auth Inertia page', register: registerAuthRoutes },
  { label: 'Admin Inertia page', register: registerAdminRoutes },
  { label: 'Member Inertia page', register: registerMemberRoutes },
  {
    label: 'Static page assets',
    register: (r) => {
      registerStaticAssets(r)
    },
  },
]

/**
 * Mounts all Inertia routes and static frontend assets on the module router.
 *
 * @param router - Framework-agnostic route registrar.
 * @param container - DI container holding page bindings from `WebsiteServiceProvider`.
 */
export function registerWebsiteRoutes(router: IModuleRouter, container: IContainer): void {
  let currentLabel = ''
  try {
    for (const { label, register } of WEBSITE_ROUTE_REGISTRATIONS) {
      currentLabel = label
      register(router, container)
      console.log(`✅ ${label} routes registered`)
    }
  } catch (error) {
    console.error(`❌ Failed to register ${currentLabel} routes:`, error)
    throw error
  }
}
```

- [ ] **Step 5: 確認 bootstrap 層編譯**

```bash
bunx tsc --noEmit 2>&1 | grep "Website/bootstrap" | head -20
```

- [ ] **Step 6: Commit bootstrap 層**

```bash
git add src/Website/bootstrap/
git commit -m "refactor: [website] 建立 bootstrap 組合根（WebsiteServiceProvider / registerWebsiteBindings / registerWebsiteRoutes）"
```

---

## Task 8: 遷移測試檔案

**Files:**
- Modify: 全部 `src/Pages/__tests__/` 測試檔案（移動 + 更新 import）

- [ ] **Step 1: 建立測試目錄結構**

```bash
mkdir -p src/Website/__tests__/Http \
         src/Website/__tests__/bootstrap \
         src/Website/__tests__/Admin \
         src/Website/__tests__/Auth \
         src/Website/__tests__/Member \
         src/Website/__tests__/fixtures
```

- [ ] **Step 2: 移動 Http 層測試**

```bash
git mv src/Pages/__tests__/InertiaService.test.ts      src/Website/__tests__/Http/InertiaRequestHandler.test.ts
git mv src/Pages/__tests__/SharedDataMiddleware.test.ts src/Website/__tests__/Http/SharedPropsBuilder.test.ts
git mv src/Pages/__tests__/ViteTagHelper.test.ts        src/Website/__tests__/Http/ViteTagHelper.test.ts
git mv src/Pages/__tests__/webCsrfMiddleware.test.ts    src/Website/__tests__/Http/CsrfMiddleware.test.ts
```

- [ ] **Step 3: 更新 Http 層測試 import**

對每個 Http 測試檔案，找出 `@/Pages/` import 並替換：

```bash
# InertiaRequestHandler.test.ts
sed -i '' "s|from '@/Pages/InertiaService'|from '@/Website/Http/Inertia/InertiaRequestHandler'|g" \
  src/Website/__tests__/Http/InertiaRequestHandler.test.ts
sed -i '' "s|from '@/Pages/ViteTagHelper'|from '@/Website/Http/Assets/ViteTagHelper'|g" \
  src/Website/__tests__/Http/InertiaRequestHandler.test.ts

# SharedPropsBuilder.test.ts
sed -i '' "s|from '@/Pages/SharedDataMiddleware'|from '@/Website/Http/Inertia/SharedPropsBuilder'|g" \
  src/Website/__tests__/Http/SharedPropsBuilder.test.ts

# ViteTagHelper.test.ts
sed -i '' "s|from '@/Pages/ViteTagHelper'|from '@/Website/Http/Assets/ViteTagHelper'|g" \
  src/Website/__tests__/Http/ViteTagHelper.test.ts

# CsrfMiddleware.test.ts
sed -i '' "s|from '@/Pages/routing/webCsrfMiddleware'|from '@/Website/Http/Security/CsrfMiddleware'|g" \
  src/Website/__tests__/Http/CsrfMiddleware.test.ts
```

- [ ] **Step 4: 移動 bootstrap 測試**

```bash
git mv src/Pages/__tests__/page-routes.test.ts src/Website/__tests__/bootstrap/registerWebsiteRoutes.test.ts
```

更新 import：
```bash
sed -i '' \
  -e "s|from '@/Pages/page-routes'|from '@/Website/bootstrap/registerWebsiteRoutes'|g" \
  -e "s|from '@/Pages/routing/inertiaFactory'|from '@/Website/Http/Inertia/createInertiaRequestHandler'|g" \
  -e "s|registerPageRoutes|registerWebsiteRoutes|g" \
  src/Website/__tests__/bootstrap/registerWebsiteRoutes.test.ts
```

- [ ] **Step 5: 移動 Admin 測試**

```bash
git mv src/Pages/__tests__/Admin/AdminApiKeysPage.test.ts          src/Website/__tests__/Admin/AdminApiKeysPage.test.ts
git mv src/Pages/__tests__/Admin/AdminContractCreatePage.test.ts    src/Website/__tests__/Admin/AdminContractCreatePage.test.ts
git mv src/Pages/__tests__/Admin/AdminContractDetailPage.test.ts    src/Website/__tests__/Admin/AdminContractDetailPage.test.ts
git mv src/Pages/__tests__/Admin/AdminContractsPage.test.ts         src/Website/__tests__/Admin/AdminContractsPage.test.ts
git mv src/Pages/__tests__/Admin/AdminDashboardPage.test.ts         src/Website/__tests__/Admin/AdminDashboardPage.test.ts
git mv src/Pages/__tests__/Admin/AdminModuleCreatePage.test.ts      src/Website/__tests__/Admin/AdminModuleCreatePage.test.ts
git mv src/Pages/__tests__/Admin/AdminModulesPage.test.ts           src/Website/__tests__/Admin/AdminModulesPage.test.ts
git mv src/Pages/__tests__/Admin/AdminOrganizationDetailPage.test.ts src/Website/__tests__/Admin/AdminOrganizationDetailPage.test.ts
git mv src/Pages/__tests__/Admin/AdminOrganizationsPage.test.ts     src/Website/__tests__/Admin/AdminOrganizationsPage.test.ts
git mv src/Pages/__tests__/Admin/AdminUsageSyncPage.test.ts         src/Website/__tests__/Admin/AdminUsageSyncPage.test.ts
git mv src/Pages/__tests__/Admin/AdminUserDetailPage.test.ts        src/Website/__tests__/Admin/AdminUserDetailPage.test.ts
git mv src/Pages/__tests__/Admin/AdminUsersPage.test.ts             src/Website/__tests__/Admin/AdminUsersPage.test.ts
git mv src/Pages/__tests__/admin-page-i18n.test.ts                  src/Website/__tests__/admin-page-i18n.test.ts
```

- [ ] **Step 6: 更新 Admin 測試 import**

```bash
# 批次替換所有 Admin Page import
sed -i '' \
  -e "s|from '@/Pages/Admin/|from '@/Website/Admin/Pages/|g" \
  -e "s|from '@/Pages/InertiaService'|from '@/Website/Http/Inertia/InertiaRequestHandler'|g" \
  -e "s|from '@/Pages/pageContainerKeys'|from '@/Website/Http/Inertia/createInertiaRequestHandler'|g" \
  -e "s|from '@/Pages/routing/admin/adminPageKeys'|from '@/Website/Admin/keys'|g" \
  src/Website/__tests__/Admin/*.test.ts src/Website/__tests__/admin-page-i18n.test.ts
```

- [ ] **Step 7: 移動 Auth 測試**

```bash
git mv src/Pages/__tests__/Auth/EmailVerificationPage.test.ts  src/Website/__tests__/Auth/EmailVerificationPage.test.ts
git mv src/Pages/__tests__/Auth/ForgotPasswordPage.test.ts     src/Website/__tests__/Auth/ForgotPasswordPage.test.ts
git mv src/Pages/__tests__/Auth/GoogleOAuthCallbackPage.test.ts src/Website/__tests__/Auth/GoogleOAuthCallbackPage.test.ts
git mv src/Pages/__tests__/Auth/LoginFlow.integration.test.ts  src/Website/__tests__/Auth/LoginFlow.integration.test.ts
git mv src/Pages/__tests__/Auth/LoginPage.test.ts              src/Website/__tests__/Auth/LoginPage.test.ts
git mv src/Pages/__tests__/Auth/RegisterPage.test.ts           src/Website/__tests__/Auth/RegisterPage.test.ts
git mv src/Pages/__tests__/Auth/ResetPasswordPage.test.ts      src/Website/__tests__/Auth/ResetPasswordPage.test.ts
git mv src/Pages/__tests__/Auth/VerifyDevicePage.test.ts       src/Website/__tests__/Auth/VerifyDevicePage.test.ts
git mv src/Pages/__tests__/Auth/VerifyDevicePageFlow.integration.test.ts src/Website/__tests__/Auth/VerifyDevicePageFlow.integration.test.ts
```

- [ ] **Step 8: 更新 Auth 測試 import**

```bash
sed -i '' \
  -e "s|from '@/Pages/Auth/|from '@/Website/Auth/Pages/|g" \
  -e "s|from '@/Pages/InertiaService'|from '@/Website/Http/Inertia/InertiaRequestHandler'|g" \
  -e "s|from '@/Pages/pageContainerKeys'|from '@/Website/Http/Inertia/createInertiaRequestHandler'|g" \
  -e "s|from '@/Pages/routing/auth/authPageKeys'|from '@/Website/Auth/keys'|g" \
  src/Website/__tests__/Auth/*.test.ts
```

- [ ] **Step 9: 移動 Member 測試**

```bash
git mv src/Pages/__tests__/Member/MemberApiKeyCreatePage.test.ts  src/Website/__tests__/Member/MemberApiKeyCreatePage.test.ts
git mv src/Pages/__tests__/Member/MemberApiKeyRevokeHandler.test.ts src/Website/__tests__/Member/MemberApiKeyRevokeHandler.test.ts
git mv src/Pages/__tests__/Member/MemberApiKeysPage.test.ts        src/Website/__tests__/Member/MemberApiKeysPage.test.ts
git mv src/Pages/__tests__/Member/MemberContractsPage.test.ts      src/Website/__tests__/Member/MemberContractsPage.test.ts
git mv src/Pages/__tests__/Member/MemberDashboardPage.test.ts      src/Website/__tests__/Member/MemberDashboardPage.test.ts
git mv src/Pages/__tests__/Member/MemberSettingsPage.test.ts       src/Website/__tests__/Member/MemberSettingsPage.test.ts
git mv src/Pages/__tests__/Member/MemberUsagePage.test.ts          src/Website/__tests__/Member/MemberUsagePage.test.ts
git mv src/Pages/__tests__/member-page-i18n.test.ts                src/Website/__tests__/member-page-i18n.test.ts
```

- [ ] **Step 10: 更新 Member 測試 import**

```bash
sed -i '' \
  -e "s|from '@/Pages/Member/|from '@/Website/Member/Pages/|g" \
  -e "s|from '@/Pages/InertiaService'|from '@/Website/Http/Inertia/InertiaRequestHandler'|g" \
  -e "s|from '@/Pages/pageContainerKeys'|from '@/Website/Http/Inertia/createInertiaRequestHandler'|g" \
  -e "s|from '@/Pages/routing/member/memberPageKeys'|from '@/Website/Member/keys'|g" \
  src/Website/__tests__/Member/*.test.ts src/Website/__tests__/member-page-i18n.test.ts
```

- [ ] **Step 11: 移動 fixtures**

```bash
git mv src/Pages/__tests__/fixtures/ src/Website/__tests__/fixtures/
```

更新測試中的 fixture 相對路徑（若有）：

```bash
grep -r "fixtures/minimal-vite-manifest" src/Website/__tests__/ --include="*.ts" -l
# 對找到的每個檔案，確認相對路徑是否需要調整
```

- [ ] **Step 12: 執行測試確認 green**

```bash
bun test src/Website/__tests__/ 2>&1 | tail -30
```

預期：全部 PASS

- [ ] **Step 13: Commit 測試遷移**

```bash
git add src/Website/__tests__/
git commit -m "refactor: [website] 遷移所有測試至 src/Website/__tests__/"
```

---

## Task 9: 更新外部接線（src/bootstrap.ts、src/routes.ts）

**Files:**
- Modify: `src/bootstrap.ts`
- Modify: `src/routes.ts`

- [ ] **Step 1: 更新 src/bootstrap.ts**

找到以下 import：
```typescript
import { PagesServiceProvider } from './Pages/Infrastructure/Providers/PagesServiceProvider'
import { warmInertiaService } from './Pages/routing/inertiaFactory'
```

改為：
```typescript
import { WebsiteServiceProvider } from './Website/bootstrap/WebsiteServiceProvider'
import { warmInertiaService } from './Website/Http/Inertia/createInertiaRequestHandler'
```

同時更新使用點（在 `modules` 陣列中）：
```typescript
// 舊
new PagesServiceProvider(),

// 新
new WebsiteServiceProvider(),
```

- [ ] **Step 2: 更新 src/routes.ts**

找到以下 import：
```typescript
import { registerPageRoutes } from './Pages/page-routes'
```

改為：
```typescript
import { registerWebsiteRoutes } from './Website/bootstrap/registerWebsiteRoutes'
```

同時更新使用點：
```typescript
// 舊
registerPageRoutes(web, core.container as IContainer)

// 新
registerWebsiteRoutes(web, core.container as IContainer)
```

- [ ] **Step 3: 執行 TypeScript 完整編譯確認無錯**

```bash
bunx tsc --noEmit 2>&1
```

預期：無任何 error 輸出

- [ ] **Step 4: 執行全部測試**

```bash
bun test src tests/Unit packages 2>&1 | tail -30
```

預期：全部 PASS（與 Task 1 基線相同）

- [ ] **Step 5: Commit 外部接線更新**

```bash
git add src/bootstrap.ts src/routes.ts
git commit -m "refactor: [website] 更新 bootstrap.ts 與 routes.ts 指向新 Website 模組"
```

---

## Task 10: 清理舊 src/Pages/ 目錄

**Files:**
- Delete: `src/Pages/` 整個目錄

- [ ] **Step 1: 確認 src/Pages/ 已完全清空（只剩 routing/ 空殼）**

```bash
find src/Pages -type f | sort
```

預期：無任何輸出（所有檔案已被 `git mv` 移走）

- [ ] **Step 2: 刪除殘餘空目錄**

```bash
git rm -r src/Pages/
```

若有任何未追蹤的殘檔，手動確認後刪除：
```bash
find src/Pages -type f  # 應為空
rm -rf src/Pages/       # 只有在確認為空後執行
```

- [ ] **Step 3: 執行最終測試確認**

```bash
bun test src tests/Unit packages 2>&1 | tail -30
```

預期：全部 PASS

- [ ] **Step 4: 確認 TypeScript 無錯**

```bash
bunx tsc --noEmit 2>&1
```

預期：無任何 error

- [ ] **Step 5: 最終 Commit**

```bash
git add -A
git commit -m "refactor: [website] 刪除舊 src/Pages/ 目錄，完成 Website 架構重組"
```

---

## 注意事項

### registerAdminRoutes 函式名稱對齊

原檔案 `registerAdminPageRoutes.ts` export function 名為 `registerAdminPageRoutes`，移動後需要確認：
- 新檔案 `registerAdminRoutes.ts` 的 export function 名稱對齊為 `registerAdminRoutes`
- `registerWebsiteRoutes.ts` 的 import 使用新名稱

同理適用於 Auth 和 Member 的 routes 函式。

### registerXxxBindings 函式名稱對齊

- 原 `registerAdminPageBindings` → 新 `registerAdminBindings`
- 原 `registerAuthPageBindings` → 新 `registerAuthBindings`
- 原 `registerMemberPageBindings` → 新 `registerMemberBindings`

`registerWebsiteBindings.ts` 使用新名稱。

### Http/Middleware/ 目錄

規格中提到 `Http/Middleware/requireAuth.ts` 和 `Http/Middleware/requireGuest.ts`，但這兩個檔案在現有 `src/Pages/` 中**不存在**（分別在 `src/Modules/Auth/` 和其他位置）。本次重組不含這兩個檔案，保留為後續任務。

### sed 相容性注意

macOS 的 `sed -i ''` 與 Linux 的 `sed -i` 語法不同，上述命令使用 macOS 格式。若在 Linux 執行，改為 `sed -i`。

建議每個 `sed` 命令執行後驗證結果：
```bash
grep "@/Pages" 目標檔案  # 應無任何輸出
```
