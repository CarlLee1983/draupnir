# Module Self-Registration Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓每個 DDD 模組透過自身的 `ServiceProvider` 自己管理路由接線，消除中央集中的 `wiring/index.ts` register* 函式群和 `routes.ts`，達到 Open/Closed Principle。

**Architecture:** 在 Gravito 適配層新增 `IRouteRegistrar` 介面（保持 `ModuleServiceProvider` 框架無關），各模組的 `ServiceProvider` 選擇性實作此介面的 `registerRoutes(core: PlanetCore): void` 方法。`bootstrap.ts` 以型別守衛迭代呼叫，完全取代舊有的集中 `routes.ts` + `wiring/index.ts` 模式。

**Tech Stack:** TypeScript strict, Bun, Gravito Core (`PlanetCore`, `createGravitoModuleRouter`)

---

## File Map

**新增：**
- (none)

**修改：**
- `src/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter.ts` — 新增 `IRouteRegistrar` 介面與 `isRouteRegistrar` 型別守衛
- `src/bootstrap.ts` — 取代 `registerRoutes(core)` 呼叫，改為迭代模組並呼叫 `registerRoutes`
- `src/Modules/Health/Infrastructure/Providers/HealthServiceProvider.ts`
- `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`
- `src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts`
- `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts`
- `src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts`
- `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts`
- `src/Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider.ts`
- `src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider.ts`
- `src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts`
- `src/Modules/Contract/Infrastructure/Providers/ContractServiceProvider.ts`
- `src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts`
- `src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts`
- `src/Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider.ts`
- `src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts`
- `src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts`
- `src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts` — 加入 docs + api root 路由
- `src/Website/bootstrap/WebsiteServiceProvider.ts` — 加入 website 路由

**刪除：**
- `src/routes.ts`
- `src/wiring/index.ts`（保留目錄，其他 wiring 檔案不動）

---

## Task 1: 新增 IRouteRegistrar 介面

**Files:**
- Modify: `src/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter.ts`

- [ ] **Step 1: 在 GravitoServiceProviderAdapter.ts 末端加入介面與型別守衛**

在檔案最後加入（`createGravitoServiceProvider` 之後）：

```typescript
/**
 * 可選介面：模組實作此介面以自我管理路由。
 * 刻意放在 Gravito 適配層而非 IServiceProvider.ts，保持 ModuleServiceProvider 框架無關。
 */
export interface IRouteRegistrar {
  registerRoutes(core: PlanetCore): void | Promise<void>
}

/**
 * 型別守衛：判斷 ModuleServiceProvider 是否實作了 IRouteRegistrar。
 */
export function isRouteRegistrar(value: unknown): value is IRouteRegistrar {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as IRouteRegistrar).registerRoutes === 'function'
  )
}
```

- [ ] **Step 2: 執行 TypeScript 型別檢查確認無誤**

```bash
cd /Users/carl/Dev/CMG/Draupnir && bun run tsc --noEmit 2>&1 | head -20
```

Expected: 無型別錯誤（或只有原本就存在的錯誤）。

- [ ] **Step 3: Commit**

```bash
git add src/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter.ts
git commit -m "feat: [wiring] 新增 IRouteRegistrar 介面與 isRouteRegistrar 型別守衛"
```

---

## Task 2: 更新 bootstrap.ts 使用 IRouteRegistrar

**Files:**
- Modify: `src/bootstrap.ts`

- [ ] **Step 1: 替換 bootstrap.ts 中的 registerRoutes 呼叫**

找到並替換 import 段落（移除 `registerRoutes`，加入 `isRouteRegistrar`）：

```typescript
// 移除這行：
import { registerRoutes } from './routes'

// 加入這行：
import { isRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
```

找到並替換路由呼叫段落：

```typescript
// 移除：
await registerRoutes(core)

// 替換為：
for (const module of modules) {
  if (isRouteRegistrar(module)) {
    await module.registerRoutes(core)
  }
}
console.log('✅ Routes registered')
```

- [ ] **Step 2: 型別檢查**

```bash
cd /Users/carl/Dev/CMG/Draupnir && bun run tsc --noEmit 2>&1 | head -20
```

Expected: 可能出現 `routes.ts` 相關的 unused import 警告，其他無錯誤。

- [ ] **Step 3: Commit**

```bash
git add src/bootstrap.ts
git commit -m "refactor: [wiring] bootstrap 改用 IRouteRegistrar 迭代取代集中 registerRoutes"
```

---

## Task 3: 遷移 HealthServiceProvider

**Files:**
- Modify: `src/Modules/Health/Infrastructure/Providers/HealthServiceProvider.ts`

- [ ] **Step 1: 加入 registerRoutes**

在 `HealthServiceProvider` class 加入 `registerRoutes`（需要新增 imports）：

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { registerHealthWithGravito } from '@/Shared/Infrastructure/Framework/GravitoHealthAdapter'
```

```typescript
export class HealthServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  override register(container: IContainer): void {
    // ... 現有程式碼不動 ...
  }

  registerRoutes(core: PlanetCore): void {
    registerHealthWithGravito(core)
  }

  override boot(_context: unknown): void {}
}
```

- [ ] **Step 2: 型別檢查**

```bash
cd /Users/carl/Dev/CMG/Draupnir && bun run tsc --noEmit 2>&1 | grep -i "health" | head -10
```

Expected: 無輸出（無錯誤）。

- [ ] **Step 3: Commit**

```bash
git add src/Modules/Health/Infrastructure/Providers/HealthServiceProvider.ts
git commit -m "refactor: [Health] ServiceProvider 自管路由接線"
```

---

## Task 4: 遷移 AuthServiceProvider

**Files:**
- Modify: `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`

- [ ] **Step 1: 加入 imports**

在現有 import 段落加入：

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { AuthController } from '../../Presentation/Controllers/AuthController'
import { registerAuthRoutes } from '../../Presentation/Routes/auth.routes'
import { registerTestSeedRoutes } from '../../Presentation/Routes/test-seed.routes'
```

- [ ] **Step 2: 加入 registerRoutes**

在 `AuthServiceProvider` class 加入（在 `boot` 方法之前）：

```typescript
export class AuthServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  // ... 現有 register() 不動 ...

  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new AuthController(
      core.container.make('registerUserService') as any,
      core.container.make('loginUserService') as any,
      core.container.make('refreshTokenService') as any,
      core.container.make('logoutUserService') as any,
    )
    void registerAuthRoutes(router, controller)

    if (getCurrentORM() === 'memory') {
      registerTestSeedRoutes(router, getCurrentDatabaseAccess())
    }
  }

  // ... 現有 boot() 不動 ...
}
```

- [ ] **Step 3: 型別檢查**

```bash
cd /Users/carl/Dev/CMG/Draupnir && bun run tsc --noEmit 2>&1 | grep -i "auth" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts
git commit -m "refactor: [Auth] ServiceProvider 自管路由接線"
```

---

## Task 5: 遷移 ProfileServiceProvider

**Files:**
- Modify: `src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts`

- [ ] **Step 1: 查看現有 ProfileServiceProvider 結構**

```bash
cat src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts
```

- [ ] **Step 2: 加入 imports**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { ProfileController } from '../../Presentation/Controllers/ProfileController'
import { registerProfileRoutes } from '../../Presentation/Routes/profile.routes'
```

- [ ] **Step 3: 加入 registerRoutes**

```typescript
export class ProfileServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  // 現有 register() 不動

  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new ProfileController(
      core.container.make('getProfileService') as any,
      core.container.make('updateProfileService') as any,
      core.container.make('listUsersService') as any,
      core.container.make('changeUserStatusService') as any,
    )
    registerProfileRoutes(router, controller)
  }
}
```

- [ ] **Step 4: 型別檢查 + Commit**

```bash
bun run tsc --noEmit 2>&1 | grep -i "profile" | head -5
git add src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts
git commit -m "refactor: [Profile] ServiceProvider 自管路由接線"
```

---

## Task 6: 遷移 OrganizationServiceProvider

**Files:**
- Modify: `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts`

- [ ] **Step 1: 查看現有結構**

```bash
cat src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts
```

- [ ] **Step 2: 加入 imports**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { OrganizationController } from '../../Presentation/Controllers/OrganizationController'
import { registerOrganizationRoutes } from '../../Presentation/Routes/organization.routes'
```

- [ ] **Step 3: 加入 registerRoutes**

```typescript
export class OrganizationServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  // 現有 register() 不動

  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new OrganizationController(
      core.container.make('createOrganizationService') as any,
      core.container.make('updateOrganizationService') as any,
      core.container.make('listOrganizationsService') as any,
      core.container.make('inviteMemberService') as any,
      core.container.make('acceptInvitationService') as any,
      core.container.make('removeMemberService') as any,
      core.container.make('listMembersService') as any,
      core.container.make('changeOrgMemberRoleService') as any,
      core.container.make('getOrganizationService') as any,
      core.container.make('changeOrgStatusService') as any,
      core.container.make('listInvitationsService') as any,
      core.container.make('cancelInvitationService') as any,
    )
    void registerOrganizationRoutes(router, controller)
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts
git commit -m "refactor: [Organization] ServiceProvider 自管路由接線"
```

---

## Task 7: 遷移 ApiKeyServiceProvider

**Files:**
- Modify: `src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts`

- [ ] **Step 1: 查看現有結構**

```bash
cat src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts
```

- [ ] **Step 2: 加入 imports**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { ApiKeyController } from '../../Presentation/Controllers/ApiKeyController'
import { registerApiKeyRoutes } from '../../Presentation/Routes/apikey.routes'
```

- [ ] **Step 3: 加入 registerRoutes**

```typescript
export class ApiKeyServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new ApiKeyController(
      core.container.make('createApiKeyService') as any,
      core.container.make('listApiKeysService') as any,
      core.container.make('revokeApiKeyService') as any,
      core.container.make('updateKeyLabelService') as any,
      core.container.make('setKeyPermissionsService') as any,
    )
    registerApiKeyRoutes(router, controller)
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts
git commit -m "refactor: [ApiKey] ServiceProvider 自管路由接線"
```

---

## Task 8: 遷移 DashboardServiceProvider

**Files:**
- Modify: `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts`

- [ ] **Step 1: 查看現有結構**

```bash
cat src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts
```

- [ ] **Step 2: 加入 imports**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { DashboardController } from '../../Presentation/Controllers/DashboardController'
import { registerDashboardRoutes } from '../../Presentation/Routes/dashboard.routes'
```

- [ ] **Step 3: 加入 registerRoutes**

```typescript
export class DashboardServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new DashboardController(
      core.container.make('getDashboardSummaryService') as any,
      core.container.make('getUsageChartService') as any,
      core.container.make('getKpiSummaryService') as any,
      core.container.make('getCostTrendsService') as any,
      core.container.make('getModelComparisonService') as any,
      core.container.make('getPerKeyCostService') as any,
    )
    registerDashboardRoutes(router, controller)
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts
git commit -m "refactor: [Dashboard] ServiceProvider 自管路由接線"
```

---

## Task 9: 遷移 AlertsServiceProvider

**Files:**
- Modify: `src/Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider.ts`

> Alerts 特殊：controller 已在 register() 中注入至 container（singleton），registerRoutes 直接從 container 取出。

- [ ] **Step 1: 查看現有結構確認 controller 注入方式**

```bash
cat src/Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider.ts
```

- [ ] **Step 2: 加入 imports**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { type AlertController, type AlertHistoryController, registerAlertRoutes, type WebhookEndpointController } from '../../Presentation'
```

- [ ] **Step 3: 加入 registerRoutes**

```typescript
export class AlertsServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = core.container.make('alertController') as AlertController
    const webhookController = core.container.make('webhookEndpointController') as WebhookEndpointController
    const historyController = core.container.make('alertHistoryController') as AlertHistoryController
    registerAlertRoutes(router, controller, webhookController, historyController)
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider.ts
git commit -m "refactor: [Alerts] ServiceProvider 自管路由接線"
```

---

## Task 10: 遷移 ReportsServiceProvider

**Files:**
- Modify: `src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider.ts`

> Reports 與 Alerts 相同：controller 已在 register() 中作為 singleton 注入。

- [ ] **Step 1: 查看現有結構**

```bash
cat src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider.ts
```

- [ ] **Step 2: 加入 imports**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { type ReportController, registerReportRoutes } from '../../Presentation'
```

- [ ] **Step 3: 加入 registerRoutes**

```typescript
export class ReportsServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = core.container.make('reportController') as ReportController
    registerReportRoutes(router, controller)
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider.ts
git commit -m "refactor: [Reports] ServiceProvider 自管路由接線"
```

---

## Task 11: 遷移 CreditServiceProvider

**Files:**
- Modify: `src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts`

- [ ] **Step 1: 查看現有結構**

```bash
cat src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts
```

- [ ] **Step 2: 加入 imports + registerRoutes**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { CreditController } from '../../Presentation/Controllers/CreditController'
import { registerCreditRoutes } from '../../Presentation/Routes/credit.routes'
```

```typescript
export class CreditServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new CreditController(
      core.container.make('topUpCreditService') as any,
      core.container.make('getBalanceService') as any,
      core.container.make('getTransactionHistoryService') as any,
      core.container.make('refundCreditService') as any,
    )
    registerCreditRoutes(router, controller)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts
git commit -m "refactor: [Credit] ServiceProvider 自管路由接線"
```

---

## Task 12: 遷移 ContractServiceProvider

**Files:**
- Modify: `src/Modules/Contract/Infrastructure/Providers/ContractServiceProvider.ts`

- [ ] **Step 1: 查看現有結構**

```bash
cat src/Modules/Contract/Infrastructure/Providers/ContractServiceProvider.ts
```

- [ ] **Step 2: 加入 imports + registerRoutes**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { ContractController } from '../../Presentation/Controllers/ContractController'
import { registerContractRoutes } from '../../Presentation/Routes/contract.routes'
```

```typescript
export class ContractServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new ContractController(
      core.container.make('createContractService') as any,
      core.container.make('activateContractService') as any,
      core.container.make('updateContractService') as any,
      core.container.make('assignContractService') as any,
      core.container.make('terminateContractService') as any,
      core.container.make('renewContractService') as any,
      core.container.make('listContractsService') as any,
      core.container.make('getContractDetailService') as any,
      core.container.make('handleContractExpiryService') as any,
    )
    registerContractRoutes(router, controller)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/Contract/Infrastructure/Providers/ContractServiceProvider.ts
git commit -m "refactor: [Contract] ServiceProvider 自管路由接線"
```

---

## Task 13: 遷移 AppModuleServiceProvider

**Files:**
- Modify: `src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts`

> AppModule 特殊：`registerRoutes` 完成後需要呼叫 `setCheckModuleAccessService`。

- [ ] **Step 1: 查看現有結構**

```bash
cat src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts
```

- [ ] **Step 2: 加入 imports + registerRoutes**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { AppModuleController } from '../../Presentation/Controllers/AppModuleController'
import { registerAppModuleRoutes } from '../../Presentation/Routes/appmodule.routes'
import type { CheckModuleAccessService } from '../../Application/Services/CheckModuleAccessService'
import { setCheckModuleAccessService } from '@/Shared/Infrastructure/Middleware/ModuleAccessMiddleware'
```

```typescript
export class AppModuleServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new AppModuleController(
      core.container.make('registerModuleService') as any,
      core.container.make('subscribeModuleService') as any,
      core.container.make('unsubscribeModuleService') as any,
      core.container.make('listModulesService') as any,
      core.container.make('getModuleDetailService') as any,
      core.container.make('listOrgSubscriptionsService') as any,
    )
    registerAppModuleRoutes(router, controller)

    const checkAccessService = core.container.make('checkModuleAccessService') as CheckModuleAccessService
    setCheckModuleAccessService(checkAccessService)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts
git commit -m "refactor: [AppModule] ServiceProvider 自管路由接線"
```

---

## Task 14: 遷移 AppApiKeyServiceProvider

**Files:**
- Modify: `src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts`

- [ ] **Step 1: 查看現有結構**

```bash
cat src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts
```

- [ ] **Step 2: 加入 imports + registerRoutes**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { AppApiKeyController } from '../../Presentation/Controllers/AppApiKeyController'
import { registerAppApiKeyRoutes } from '../../Presentation/Routes/appApiKey.routes'
```

```typescript
export class AppApiKeyServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new AppApiKeyController(
      core.container.make('issueAppKeyService') as any,
      core.container.make('listAppKeysService') as any,
      core.container.make('rotateAppKeyService') as any,
      core.container.make('revokeAppKeyService') as any,
      core.container.make('setAppKeyScopeService') as any,
      core.container.make('getAppKeyUsageService') as any,
    )
    registerAppApiKeyRoutes(router, controller)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts
git commit -m "refactor: [AppApiKey] ServiceProvider 自管路由接線"
```

---

## Task 15: 遷移 DevPortalServiceProvider

**Files:**
- Modify: `src/Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider.ts`

- [ ] **Step 1: 查看現有結構**

```bash
cat src/Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider.ts
```

- [ ] **Step 2: 加入 imports + registerRoutes**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { DevPortalController } from '../../Presentation/Controllers/DevPortalController'
import { registerDevPortalRoutes } from '../../Presentation/Routes/devPortal.routes'
```

```typescript
export class DevPortalServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new DevPortalController(
      core.container.make('registerAppService') as any,
      core.container.make('listAppsService') as any,
      core.container.make('manageAppKeysService') as any,
      core.container.make('configureWebhookService') as any,
      core.container.make('getApiDocsService') as any,
    )
    registerDevPortalRoutes(router, controller)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider.ts
git commit -m "refactor: [DevPortal] ServiceProvider 自管路由接線"
```

---

## Task 16: 遷移 SdkApiServiceProvider

**Files:**
- Modify: `src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts`

> SdkApi 特殊：需要 `appAuthMiddleware` 作為路由 middleware。

- [ ] **Step 1: 查看現有結構**

```bash
cat src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts
```

- [ ] **Step 2: 加入 imports + registerRoutes**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { type AppAuthMiddleware, registerSdkApiRoutes, SdkApiController } from '../../Presentation'
```

```typescript
export class SdkApiServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new SdkApiController(
      core.container.make('proxyModelCall') as any,
      core.container.make('queryUsage') as any,
      core.container.make('queryBalance') as any,
    )
    const appAuthMiddleware = core.container.make('appAuthMiddleware') as AppAuthMiddleware
    registerSdkApiRoutes(router, controller, appAuthMiddleware)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts
git commit -m "refactor: [SdkApi] ServiceProvider 自管路由接線"
```

---

## Task 17: 遷移 CliApiServiceProvider

**Files:**
- Modify: `src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts`

- [ ] **Step 1: 查看現有結構**

```bash
cat src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts
```

- [ ] **Step 2: 加入 imports + registerRoutes**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { CliApiController } from '../../Presentation/Controllers/CliApiController'
import { registerCliApiRoutes } from '../../Presentation/Routes/cliApi.routes'
```

```typescript
export class CliApiServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    const controller = new CliApiController(
      core.container.make('initiateDeviceFlowService') as any,
      core.container.make('authorizeDeviceService') as any,
      core.container.make('exchangeDeviceCodeService') as any,
      core.container.make('proxyCliRequestService') as any,
      core.container.make('revokeCliSessionService') as any,
    )
    registerCliApiRoutes(router, controller)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts
git commit -m "refactor: [CliApi] ServiceProvider 自管路由接線"
```

---

## Task 18: 遷移 FoundationServiceProvider（docs + api root）

**Files:**
- Modify: `src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts`

> Foundation 負責接管 `routes.ts` 中的 `/api` root route 與 docs 路由。

- [ ] **Step 1: 查看現有結構**

```bash
cat src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts
```

- [ ] **Step 2: 加入 imports + registerRoutes**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { registerDocsWithGravito } from '../Framework/GravitoDocsAdapter'
```

```typescript
export class FoundationServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  // 現有 register() 不動

  async registerRoutes(core: PlanetCore): Promise<void> {
    const router = createGravitoModuleRouter(core)
    router.get(
      '/api',
      async (ctx) => ctx.json({ success: true, message: 'Draupnir API', version: '0.1.0' }),
      { name: 'api.root' },
    )
    await registerDocsWithGravito(core)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts
git commit -m "refactor: [Foundation] ServiceProvider 自管 api root + docs 路由"
```

---

## Task 19: 遷移 WebsiteServiceProvider

**Files:**
- Modify: `src/Website/bootstrap/WebsiteServiceProvider.ts`

- [ ] **Step 1: 加入 imports + registerRoutes**

```typescript
import type { PlanetCore } from '@gravito/core'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Website/Http/Routing/routePath'
import { registerWebsiteRoutes } from './registerWebsiteRoutes'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
```

注意：Website 需要用 `createGravitoModuleRouter` 取得 router 後傳入 `registerWebsiteRoutes`：

```typescript
export class WebsiteServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  override register(container: IContainer): void {
    registerWebsiteBindings(container)
  }

  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    registerWebsiteRoutes(router, core.container as IContainer)
  }

  override boot(_context: unknown): void {}
}
```

（`createGravitoModuleRouter` 從 `@/Shared/Infrastructure/Framework/GravitoModuleRouter` import）

- [ ] **Step 2: 型別檢查**

```bash
bun run tsc --noEmit 2>&1 | grep -i "website" | head -10
```

- [ ] **Step 3: Commit**

```bash
git add src/Website/bootstrap/WebsiteServiceProvider.ts
git commit -m "refactor: [Website] ServiceProvider 自管路由接線"
```

---

## Task 20: 刪除 wiring/index.ts 與 routes.ts

**Files:**
- Delete: `src/wiring/index.ts`
- Delete: `src/routes.ts`

> `wiring/` 目錄下其他檔案（DatabaseAccessBuilder, CurrentDatabaseAccess, RepositoryFactory, RepositoryFactoryGenerator, RepositoryRegistry）保留不動。

- [ ] **Step 1: 確認所有模組已完成遷移**

```bash
grep -r "from './wiring'" src/ --include="*.ts"
grep -r "from './routes'" src/ --include="*.ts"
```

Expected: 兩條指令應無輸出（無任何檔案仍引用這兩個舊入口）。

- [ ] **Step 2: 刪除檔案**

```bash
rm src/wiring/index.ts
rm src/routes.ts
```

- [ ] **Step 3: 型別檢查**

```bash
bun run tsc --noEmit 2>&1 | head -30
```

Expected: 無錯誤。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: [wiring] 刪除集中式 wiring/index.ts 與 routes.ts，完成模組自管路由"
```

---

## Task 21: 全套測試驗證

- [ ] **Step 1: 執行所有單元/整合測試**

```bash
cd /Users/carl/Dev/CMG/Draupnir && bun test 2>&1 | tail -20
```

Expected: 全部通過，無失敗。

- [ ] **Step 2: 啟動開發伺服器冒煙測試**

```bash
ORM=memory bun run dev &
sleep 3
curl -s http://localhost:3000/api | jq .
curl -s http://localhost:3000/health | jq .
curl -o /dev/null -s -w "%{http_code}" http://localhost:3000/
kill %1
```

Expected:
- `/api` → `{"success":true,"message":"Draupnir API","version":"0.1.0"}`
- `/health` → `{"status":"ok",...}`
- `/` → `200`（Website Inertia HTML）

- [ ] **Step 3: 最終 Commit（若有任何修正）**

```bash
git add -A
git commit -m "test: [wiring] 全套測試通過，模組自管路由驗證完成"
```

---

## 執行完成後的架構

```
bootstrap.ts
│
└─ modules[] → ServiceProvider.register()    ← services 注入 container
             → ServiceProvider.registerRoutes(core)  ← 路由接線（模組自管）

src/wiring/                                  ← 只剩 DB 基礎設施
├── CurrentDatabaseAccess.ts
├── DatabaseAccessBuilder.ts
├── RepositoryFactory.ts
├── RepositoryFactoryGenerator.ts
└── RepositoryRegistry.ts
```

每個模組新增一個模組，只需要：
1. 建立 `*ServiceProvider.ts`（register services + registerRoutes）
2. 加入 `bootstrap.ts` 的 `modules[]` 陣列

**無需修改任何其他集中式檔案。**
