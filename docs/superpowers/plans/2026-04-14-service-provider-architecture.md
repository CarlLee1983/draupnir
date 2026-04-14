# ServiceProvider 架構規範 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 `ModuleServiceProvider` 重構為四層 hook 架構，封鎖 `register()` override，統一所有 15 個模組的 ServiceProvider 結構。

**Architecture:** Base class 以 `readonly` arrow function property 封鎖 `register()`，強制子類只能 override 四個 protected hook（Repositories / InfraServices / ApplicationServices / Controllers）。`boot()` 型別固定為 `IContainer`，解包責任留在 framework adapter。

**Tech Stack:** TypeScript 5.x strict mode、Vitest（bun test）、現有 `IContainer` / `ModuleServiceProvider` 介面

---

> **重要：** 變更 base class 後，TypeScript build 會立刻失敗（所有 `override register()` 變成編譯錯誤），直到 Task 9 完成全部遷移才會恢復通過。請確保在同一個 branch/worktree 內完成 Task 1–9，不要在中途 merge。

---

## 檔案清單

### 修改
| 檔案 | 變更摘要 |
|------|----------|
| `src/Shared/Infrastructure/IServiceProvider.ts` | `register` 改為 readonly arrow property；`boot` 簽名改為 `IContainer` |
| `tsconfig.json` | 新增 `noImplicitOverride: true` |
| `src/Modules/Health/Infrastructure/Providers/HealthServiceProvider.ts` | 分四層 hook |
| `src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts` | 分四層 hook，controller 移入 `registerControllers` |
| `src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts` | 分四層 hook |
| `src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts` | 分四層 hook |
| `src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts` | 分四層 hook |
| `src/Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider.ts` | 分四層 hook |
| `src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts` | 分四層 hook |
| `src/Modules/Contract/Infrastructure/Providers/ContractServiceProvider.ts` | 分四層 hook |
| `src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts` | 分四層 hook，`setCheckModuleAccessService` 移入 `boot` |
| `src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts` | 分四層 hook，`boot` 型別修正 |
| `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts` | 分四層 hook，controller 移入 `registerControllers` |
| `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts` | 分四層 hook，`private container` 保留 |
| `src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider.ts` | 分四層 hook，controller 移入 `registerControllers` |
| `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts` | 分四層 hook，`configureAuthMiddleware` 移入 `boot` |
| `src/Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider.ts` | 分四層 hook，`boot` 型別修正 |

### 新增
| 檔案 | 用途 |
|------|------|
| `src/Shared/__tests__/ModuleServiceProvider.test.ts` | Base class 行為測試 |

---

## Task 1：更新 Base Class + tsconfig

**Files:**
- Modify: `src/Shared/Infrastructure/IServiceProvider.ts`
- Modify: `tsconfig.json`
- Create: `src/Shared/__tests__/ModuleServiceProvider.test.ts`

- [ ] **Step 1: 寫失敗測試**

新增檔案 `src/Shared/__tests__/ModuleServiceProvider.test.ts`：

```typescript
import { describe, expect, it, vi } from 'vitest'
import type { IContainer } from '../Infrastructure/IServiceProvider'
import { ModuleServiceProvider } from '../Infrastructure/IServiceProvider'

const mockContainer = (): IContainer => ({
  singleton: vi.fn(),
  bind: vi.fn(),
  make: vi.fn(),
})

describe('ModuleServiceProvider', () => {
  it('register() 以固定順序呼叫四個 hooks', () => {
    const callOrder: string[] = []
    class TestProvider extends ModuleServiceProvider {
      protected override registerRepositories() { callOrder.push('repos') }
      protected override registerInfraServices() { callOrder.push('infra') }
      protected override registerApplicationServices() { callOrder.push('services') }
      protected override registerControllers() { callOrder.push('controllers') }
    }
    const provider = new TestProvider()
    provider.register(mockContainer())
    expect(callOrder).toEqual(['repos', 'infra', 'services', 'controllers'])
  })

  it('未 override 的 hook 預設為空操作，不拋出錯誤', () => {
    class MinimalProvider extends ModuleServiceProvider {}
    const provider = new MinimalProvider()
    expect(() => provider.register(mockContainer())).not.toThrow()
  })

  it('boot() 預設為空操作，不拋出錯誤', () => {
    class MinimalProvider extends ModuleServiceProvider {}
    const provider = new MinimalProvider()
    expect(() => provider.boot(mockContainer())).not.toThrow()
  })

  it('register() 將 container 傳遞給所有 hooks', () => {
    const c = mockContainer()
    let receivedContainer: IContainer | undefined
    class TestProvider extends ModuleServiceProvider {
      protected override registerRepositories(container: IContainer) {
        receivedContainer = container
      }
    }
    new TestProvider().register(c)
    expect(receivedContainer).toBe(c)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
bun test src/Shared/__tests__/ModuleServiceProvider.test.ts
```

預期：**FAIL**（`registerRepositories` 不存在、hook 順序無法驗證）

- [ ] **Step 3: 更新 `IServiceProvider.ts`**

將 `src/Shared/Infrastructure/IServiceProvider.ts` 中 `ModuleServiceProvider` 替換為：

```typescript
export abstract class ModuleServiceProvider {
  /**
   * Sealed：固定呼叫四個 hook，不可 override。
   * readonly arrow function property — 子類宣告同名 method 會產生 TypeScript 編譯錯誤。
   */
  readonly register: (container: IContainer) => void = (container) => {
    this.registerRepositories(container)
    this.registerInfraServices(container)
    this.registerApplicationServices(container)
    this.registerControllers(container)
  }

  /** Layer 1：Repository 實作（infrastructure → domain port 綁定） */
  protected registerRepositories(_container: IContainer): void {}

  /** Layer 2：技術 adapter（JWT / Email / OAuth / Queue / Dispatcher 等） */
  protected registerInfraServices(_container: IContainer): void {}

  /** Layer 3：Application Services（use-case services） */
  protected registerApplicationServices(_container: IContainer): void {}

  /** Layer 4：Controllers（登記至容器，供 registerRoutes 取用） */
  protected registerControllers(_container: IContainer): void {}

  /**
   * Boot hook：初始化用途（event 訂閱 / warmup / middleware 設定）。
   * 禁止在此做 DI 註冊（container.singleton / container.bind）。
   * 解包責任在 framework adapter，此處永遠收到 IContainer。
   */
  boot(_container: IContainer): void {}
}
```

同時移除舊的 `abstract register(container: IContainer): void` 宣告。

- [ ] **Step 4: 新增 `noImplicitOverride` 至 tsconfig**

在 `tsconfig.json` 的 compiler options 加入：

```json
"noImplicitOverride": true
```

這確保子類任何 override 都需明確標示 `override`，而 `readonly` 屬性無法被 `override`，形成雙重保護。

- [ ] **Step 5: 執行測試確認通過**

```bash
bun test src/Shared/__tests__/ModuleServiceProvider.test.ts
```

預期：**PASS**（4 tests）

- [ ] **Step 6: Commit**

```bash
git add src/Shared/Infrastructure/IServiceProvider.ts \
        src/Shared/__tests__/ModuleServiceProvider.test.ts \
        tsconfig.json
git commit -m "refactor: [DI] ModuleServiceProvider 四層 hook 架構 + sealed register"
```

> ⚠️ 此時 `bun run typecheck` 會失敗，因為所有模組仍有 `override register()`，這是預期的。

---

## Task 2：遷移 Health + Profile

**Files:**
- Modify: `src/Modules/Health/Infrastructure/Providers/HealthServiceProvider.ts`
- Modify: `src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts`

- [ ] **Step 1: 遷移 HealthServiceProvider**

將 `HealthServiceProvider.ts` 替換為：

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { registerHealthWithGravito } from '@/Shared/Infrastructure/Framework/GravitoHealthAdapter'
import type { ISystemHealthChecker } from '../../Domain/Ports/ISystemHealthChecker'
import type { IHealthCheckRepository } from '../../Domain/Repositories/IHealthCheckRepository'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'
import { MemoryHealthCheckRepository } from '../Repositories/MemoryHealthCheckRepository'
import { SystemHealthChecker } from '../Services/SystemHealthChecker'

export class HealthServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    container.singleton('healthRepository', () => new MemoryHealthCheckRepository())
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('systemHealthChecker', () => new SystemHealthChecker(null, null, null))
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind('healthCheckService', (c: IContainer) => new PerformHealthCheckService(
      c.make('healthRepository') as IHealthCheckRepository,
      c.make('systemHealthChecker') as ISystemHealthChecker,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    registerHealthWithGravito(context)
  }
}
```

- [ ] **Step 2: 遷移 ProfileServiceProvider**

將 `ProfileServiceProvider.ts` 替換為：

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { GetProfileService } from '../../Application/Services/GetProfileService'
import { UpdateProfileService } from '../../Application/Services/UpdateProfileService'
import type { IUserProfileRepository } from '../../Domain/Repositories/IUserProfileRepository'
import { UserProfileRepository } from '../Repositories/UserProfileRepository'
import { ProfileController } from '../../Presentation/Controllers/ProfileController'
import { registerProfileRoutes } from '../../Presentation/Routes/profile.routes'

export class ProfileServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    container.singleton('profileRepository', () => new UserProfileRepository(getCurrentDatabaseAccess()))
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind('getProfileService', (c: IContainer) =>
      new GetProfileService(c.make('profileRepository') as IUserProfileRepository)
    )
    container.bind('updateProfileService', (c: IContainer) =>
      new UpdateProfileService(c.make('profileRepository') as IUserProfileRepository)
    )
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('profileController', (c: IContainer) => new ProfileController(
      c.make('getProfileService') as GetProfileService,
      c.make('updateProfileService') as UpdateProfileService,
      c.make('listUsersService') as any,
      c.make('changeUserStatusService') as any,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('profileController') as ProfileController
    registerProfileRoutes(context.router, controller)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/Health/Infrastructure/Providers/HealthServiceProvider.ts \
        src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts
git commit -m "refactor: [DI] 遷移 Health + Profile ServiceProvider 至四層 hook"
```

---

## Task 3：遷移 ApiKey + AppApiKey + CliApi

**Files:**
- Modify: `src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts`
- Modify: `src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts`
- Modify: `src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts`

- [ ] **Step 1: 遷移 ApiKeyServiceProvider**

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { CreateApiKeyService } from '../../Application/Services/CreateApiKeyService'
import { ListApiKeysService } from '../../Application/Services/ListApiKeysService'
import { RevokeApiKeyService } from '../../Application/Services/RevokeApiKeyService'
import { SetKeyPermissionsService } from '../../Application/Services/SetKeyPermissionsService'
import { UpdateKeyLabelService } from '../../Application/Services/UpdateKeyLabelService'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import { ApiKeyRepository } from '../Repositories/ApiKeyRepository'
import { ApiKeyBifrostSync } from '../Services/ApiKeyBifrostSync'
import { ApiKeyController } from '../../Presentation/Controllers/ApiKeyController'
import { registerApiKeyRoutes } from '../../Presentation/Routes/apikey.routes'

export class ApiKeyServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    container.singleton('apiKeyRepository', () => new ApiKeyRepository(getCurrentDatabaseAccess()))
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('apiKeyBifrostSync', (c: IContainer) =>
      new ApiKeyBifrostSync(c.make('llmGatewayClient') as ILLMGatewayClient)
    )
    container.singleton('keyHashingService', () => new KeyHashingService())
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind('createApiKeyService', (c: IContainer) => new CreateApiKeyService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('apiKeyBifrostSync') as ApiKeyBifrostSync,
      c.make('keyHashingService') as KeyHashingService,
    ))
    container.bind('listApiKeysService', (c: IContainer) => new ListApiKeysService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('revokeApiKeyService', (c: IContainer) => new RevokeApiKeyService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('apiKeyBifrostSync') as ApiKeyBifrostSync,
    ))
    container.bind('updateKeyLabelService', (c: IContainer) => new UpdateKeyLabelService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('setKeyPermissionsService', (c: IContainer) => new SetKeyPermissionsService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('apiKeyBifrostSync') as ApiKeyBifrostSync,
    ))
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('apiKeyController', (c: IContainer) => new ApiKeyController(
      c.make('createApiKeyService') as CreateApiKeyService,
      c.make('listApiKeysService') as ListApiKeysService,
      c.make('revokeApiKeyService') as RevokeApiKeyService,
      c.make('updateKeyLabelService') as UpdateKeyLabelService,
      c.make('setKeyPermissionsService') as SetKeyPermissionsService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('apiKeyController') as ApiKeyController
    registerApiKeyRoutes(context.router, controller)
  }

  override boot(_container: IContainer): void {
    console.log('🔑 [ApiKey] Module loaded')
  }
}
```

- [ ] **Step 2: 遷移 AppApiKeyServiceProvider**

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { KeyHashingService } from '@/Shared/Infrastructure/Services/KeyHashingService'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { GetAppKeyUsageService } from '../../Application/Services/GetAppKeyUsageService'
import { IssueAppKeyService } from '../../Application/Services/IssueAppKeyService'
import { ListAppKeysService } from '../../Application/Services/ListAppKeysService'
import { RevokeAppKeyService } from '../../Application/Services/RevokeAppKeyService'
import { RotateAppKeyService } from '../../Application/Services/RotateAppKeyService'
import { SetAppKeyScopeService } from '../../Application/Services/SetAppKeyScopeService'
import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import { AppApiKeyRepository } from '../Repositories/AppApiKeyRepository'
import { AppKeyBifrostSync } from '../Services/AppKeyBifrostSync'
import { AppApiKeyController } from '../../Presentation/Controllers/AppApiKeyController'
import { registerAppApiKeyRoutes } from '../../Presentation/Routes/appApiKey.routes'

export class AppApiKeyServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    container.singleton('appApiKeyRepository', () => new AppApiKeyRepository(getCurrentDatabaseAccess()))
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('appKeyBifrostSync', (c: IContainer) =>
      new AppKeyBifrostSync(c.make('llmGatewayClient') as ILLMGatewayClient)
    )
    container.singleton('keyHashingService', () => new KeyHashingService())
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind('issueAppKeyService', (c: IContainer) => new IssueAppKeyService(
      c.make('appApiKeyRepository') as IAppApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('appKeyBifrostSync') as AppKeyBifrostSync,
      c.make('keyHashingService') as KeyHashingService,
    ))
    container.bind('listAppKeysService', (c: IContainer) => new ListAppKeysService(
      c.make('appApiKeyRepository') as IAppApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('rotateAppKeyService', (c: IContainer) => new RotateAppKeyService(
      c.make('appApiKeyRepository') as IAppApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('appKeyBifrostSync') as AppKeyBifrostSync,
      c.make('keyHashingService') as KeyHashingService,
    ))
    container.bind('revokeAppKeyService', (c: IContainer) => new RevokeAppKeyService(
      c.make('appApiKeyRepository') as IAppApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('appKeyBifrostSync') as AppKeyBifrostSync,
    ))
    container.bind('setAppKeyScopeService', (c: IContainer) => new SetAppKeyScopeService(
      c.make('appApiKeyRepository') as IAppApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('getAppKeyUsageService', (c: IContainer) => new GetAppKeyUsageService(
      c.make('appApiKeyRepository') as IAppApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('llmGatewayClient') as ILLMGatewayClient,
    ))
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('appApiKeyController', (c: IContainer) => new AppApiKeyController(
      c.make('issueAppKeyService') as IssueAppKeyService,
      c.make('listAppKeysService') as ListAppKeysService,
      c.make('rotateAppKeyService') as RotateAppKeyService,
      c.make('revokeAppKeyService') as RevokeAppKeyService,
      c.make('setAppKeyScopeService') as SetAppKeyScopeService,
      c.make('getAppKeyUsageService') as GetAppKeyUsageService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('appApiKeyController') as AppApiKeyController
    registerAppApiKeyRoutes(context.router, controller)
  }

  override boot(_container: IContainer): void {
    console.log('🔐 [AppApiKey] Module loaded')
  }
}
```

- [ ] **Step 3: 遷移 CliApiServiceProvider**

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import type { JwtTokenService } from '@/Modules/Auth/Infrastructure/Services/JwtTokenService'
import { AuthorizeDeviceService } from '../../Application/Services/AuthorizeDeviceService'
import { ExchangeDeviceCodeService } from '../../Application/Services/ExchangeDeviceCodeService'
import { InitiateDeviceFlowService } from '../../Application/Services/InitiateDeviceFlowService'
import type { ICliProxyClient } from '../../Application/Services/ProxyCliRequestService'
import { ProxyCliRequestService } from '../../Application/Services/ProxyCliRequestService'
import { RevokeCliSessionService } from '../../Application/Services/RevokeCliSessionService'
import { loadCliApiConfig } from '../Config/CliApiConfig'
import { MemoryDeviceCodeStore } from '../Services/MemoryDeviceCodeStore'
import { CliApiController } from '../../Presentation/Controllers/CliApiController'
import { registerCliApiRoutes } from '../../Presentation/Routes/cliApi.routes'

export class CliApiServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerInfraServices(container: IContainer): void {
    const cliApiConfig = loadCliApiConfig()
    container.singleton('cliApiConfig', () => cliApiConfig)
    container.singleton('deviceCodeStore', () => new MemoryDeviceCodeStore())
  }

  protected override registerApplicationServices(container: IContainer): void {
    const cliApiConfig = loadCliApiConfig()
    container.bind('initiateDeviceFlowService', (c: IContainer) => new InitiateDeviceFlowService(
      c.make('deviceCodeStore') as MemoryDeviceCodeStore,
      cliApiConfig.verificationUri,
      cliApiConfig.deviceCodeTtlSeconds,
      cliApiConfig.pollingIntervalSeconds,
    ))
    container.bind('authorizeDeviceService', (c: IContainer) =>
      new AuthorizeDeviceService(c.make('deviceCodeStore') as MemoryDeviceCodeStore)
    )
    container.bind('exchangeDeviceCodeService', (c: IContainer) => new ExchangeDeviceCodeService(
      c.make('deviceCodeStore') as MemoryDeviceCodeStore,
      c.make('jwtTokenService') as JwtTokenService,
      c.make('authTokenRepository') as IAuthTokenRepository,
    ))
    container.bind('proxyCliRequestService', (c: IContainer) =>
      new ProxyCliRequestService(c.make('bifrostClient') as ICliProxyClient)
    )
    container.bind('revokeCliSessionService', (c: IContainer) =>
      new RevokeCliSessionService(c.make('authTokenRepository') as IAuthTokenRepository)
    )
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('cliApiController', (c: IContainer) => new CliApiController(
      c.make('initiateDeviceFlowService') as InitiateDeviceFlowService,
      c.make('authorizeDeviceService') as AuthorizeDeviceService,
      c.make('exchangeDeviceCodeService') as ExchangeDeviceCodeService,
      c.make('proxyCliRequestService') as ProxyCliRequestService,
      c.make('revokeCliSessionService') as RevokeCliSessionService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('cliApiController') as CliApiController
    registerCliApiRoutes(context.router, controller)
  }

  override boot(_container: IContainer): void {
    console.log('🖥️ [CliApi] Module loaded')
  }
}
```

> **注意 CliApi：** `loadCliApiConfig()` 在 `registerInfraServices` 和 `registerApplicationServices` 各呼叫一次，因為 config 值在 service 建構時需要直接傳入（非容器依賴）。如果日後想避免雙次呼叫，可將 config 改為從容器取得（`c.make('cliApiConfig')`）。

- [ ] **Step 4: Commit**

```bash
git add src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts \
        src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts \
        src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts
git commit -m "refactor: [DI] 遷移 ApiKey + AppApiKey + CliApi ServiceProvider 至四層 hook"
```

---

## Task 4：遷移 DevPortal + SdkApi + Contract

**Files:**
- Modify: `src/Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider.ts`
- Modify: `src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts`
- Modify: `src/Modules/Contract/Infrastructure/Providers/ContractServiceProvider.ts`

- [ ] **Step 1: 遷移 DevPortalServiceProvider**

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { IWebhookDispatcher } from '@/Foundation/Infrastructure/Ports/IWebhookDispatcher'
import type { IssueAppKeyService } from '@/Modules/AppApiKey/Application/Services/IssueAppKeyService'
import type { ListAppKeysService } from '@/Modules/AppApiKey/Application/Services/ListAppKeysService'
import type { RevokeAppKeyService } from '@/Modules/AppApiKey/Application/Services/RevokeAppKeyService'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { ConfigureWebhookService } from '../../Application/Services/ConfigureWebhookService'
import { GetApiDocsService } from '../../Application/Services/GetApiDocsService'
import { ListAppsService } from '../../Application/Services/ListAppsService'
import { ManageAppKeysService } from '../../Application/Services/ManageAppKeysService'
import { RegisterAppService } from '../../Application/Services/RegisterAppService'
import { ApplicationRepository } from '../Repositories/ApplicationRepository'
import { WebhookConfigRepository } from '../Repositories/WebhookConfigRepository'
import { DevPortalController } from '../../Presentation/Controllers/DevPortalController'
import { registerDevPortalRoutes } from '../../Presentation/Routes/devPortal.routes'

export class DevPortalServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    container.singleton('devPortalApplicationRepository', () => new ApplicationRepository(db))
    container.singleton('devPortalWebhookConfigRepository', () => new WebhookConfigRepository(db))
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('devPortalWebhookDispatcher', (c: IContainer) =>
      c.make('webhookDispatcher') as IWebhookDispatcher
    )
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind('registerAppService', (c: IContainer) => new RegisterAppService(
      c.make('devPortalApplicationRepository') as ApplicationRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('listAppsService', (c: IContainer) => new ListAppsService(
      c.make('devPortalApplicationRepository') as ApplicationRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('manageAppKeysService', (c: IContainer) => new ManageAppKeysService(
      c.make('devPortalApplicationRepository') as ApplicationRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('issueAppKeyService') as IssueAppKeyService,
      c.make('revokeAppKeyService') as RevokeAppKeyService,
      c.make('listAppKeysService') as ListAppKeysService,
    ))
    container.bind('configureWebhookService', (c: IContainer) => new ConfigureWebhookService(
      c.make('devPortalApplicationRepository') as ApplicationRepository,
      c.make('devPortalWebhookConfigRepository') as WebhookConfigRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('getApiDocsService', () => new GetApiDocsService())
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('devPortalController', (c: IContainer) => new DevPortalController(
      c.make('registerAppService') as RegisterAppService,
      c.make('listAppsService') as ListAppsService,
      c.make('manageAppKeysService') as ManageAppKeysService,
      c.make('configureWebhookService') as ConfigureWebhookService,
      c.make('getApiDocsService') as GetApiDocsService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('devPortalController') as DevPortalController
    registerDevPortalRoutes(context.router, controller)
  }

  override boot(_container: IContainer): void {
    console.log('🚀 [DevPortal] Module loaded')
  }
}
```

- [ ] **Step 2: 遷移 SdkApiServiceProvider**

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import type { BifrostClientConfig } from '@draupnir/bifrost-sdk'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { IAppApiKeyRepository } from '@/Modules/AppApiKey/Domain/Repositories/IAppApiKeyRepository'
import type { ICreditAccountRepository } from '@/Modules/Credit/Domain/Repositories/ICreditAccountRepository'
import type { IKeyHashingService } from '@/Shared/Domain/Ports/IKeyHashingService'
import { AuthenticateApp } from '../../Application/UseCases/AuthenticateApp'
import { ProxyModelCall } from '../../Application/UseCases/ProxyModelCall'
import { QueryBalance } from '../../Application/UseCases/QueryBalance'
import { QueryUsage } from '../../Application/UseCases/QueryUsage'
import { AppAuthMiddleware } from '../Middleware/AppAuthMiddleware'
import { SdkApiController } from '../../Presentation/Controllers/SdkApiController'
import { registerSdkApiRoutes } from '../../Presentation/Routes/sdkApi.routes'

export class SdkApiServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerInfraServices(container: IContainer): void {
    container.singleton('appAuthMiddleware', (c: IContainer) =>
      new AppAuthMiddleware(c.make('authenticateApp') as AuthenticateApp)
    )
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.singleton('authenticateApp', (c: IContainer) => new AuthenticateApp(
      c.make('appApiKeyRepository') as IAppApiKeyRepository,
      c.make('keyHashingService') as IKeyHashingService,
    ))
    container.bind('proxyModelCall', (c: IContainer) => {
      const config = c.make('bifrostConfig') as BifrostClientConfig
      return new ProxyModelCall(config.proxyBaseUrl)
    })
    container.bind('queryUsage', (c: IContainer) =>
      new QueryUsage(c.make('llmGatewayClient') as ILLMGatewayClient)
    )
    container.bind('queryBalance', (c: IContainer) =>
      new QueryBalance(c.make('creditAccountRepository') as ICreditAccountRepository)
    )
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('sdkApiController', (c: IContainer) => new SdkApiController(
      c.make('proxyModelCall') as ProxyModelCall,
      c.make('queryUsage') as QueryUsage,
      c.make('queryBalance') as QueryBalance,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('sdkApiController') as SdkApiController
    const appAuthMiddleware = context.container.make('appAuthMiddleware') as AppAuthMiddleware
    registerSdkApiRoutes(context.router, controller, appAuthMiddleware)
  }

  override boot(_container: IContainer): void {
    console.log('🔌 [SdkApi] Module loaded')
  }
}
```

- [ ] **Step 3: 遷移 ContractServiceProvider**

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { ActivateContractService } from '../../Application/Services/ActivateContractService'
import { AssignContractService } from '../../Application/Services/AssignContractService'
import { CreateContractService } from '../../Application/Services/CreateContractService'
import { GetContractDetailService } from '../../Application/Services/GetContractDetailService'
import { HandleContractExpiryService } from '../../Application/Services/HandleContractExpiryService'
import { ListAdminContractsService } from '../../Application/Services/ListAdminContractsService'
import { ListContractsService } from '../../Application/Services/ListContractsService'
import { RenewContractService } from '../../Application/Services/RenewContractService'
import { TerminateContractService } from '../../Application/Services/TerminateContractService'
import { UpdateContractService } from '../../Application/Services/UpdateContractService'
import { ContractEnforcementService } from '../../Domain/Services/ContractEnforcementService'
import { ContractRepository } from '../Repositories/ContractRepository'
import { ContractController } from '../../Presentation/Controllers/ContractController'
import { registerContractRoutes } from '../../Presentation/Routes/contract.routes'

export class ContractServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    container.singleton('contractRepository', () => new ContractRepository(getCurrentDatabaseAccess()))
  }

  protected override registerApplicationServices(container: IContainer): void {
    // ContractEnforcementService は Domain Service — app layer に登記
    container.singleton('contractEnforcementService', () => new ContractEnforcementService())
    container.bind('createContractService', (c: IContainer) =>
      new CreateContractService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('activateContractService', (c: IContainer) =>
      new ActivateContractService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('updateContractService', (c: IContainer) =>
      new UpdateContractService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('assignContractService', (c: IContainer) =>
      new AssignContractService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('terminateContractService', (c: IContainer) =>
      new TerminateContractService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('renewContractService', (c: IContainer) =>
      new RenewContractService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('handleContractExpiryService', (c: IContainer) =>
      new HandleContractExpiryService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('listContractsService', (c: IContainer) => new ListContractsService(
      c.make('contractRepository') as ContractRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('getContractDetailService', (c: IContainer) =>
      new GetContractDetailService(c.make('contractRepository') as ContractRepository)
    )
    container.bind('listAdminContractsService', (c: IContainer) =>
      new ListAdminContractsService(c.make('contractRepository') as ContractRepository)
    )
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('contractController', (c: IContainer) => new ContractController(
      c.make('createContractService') as CreateContractService,
      c.make('activateContractService') as ActivateContractService,
      c.make('updateContractService') as UpdateContractService,
      c.make('assignContractService') as AssignContractService,
      c.make('terminateContractService') as TerminateContractService,
      c.make('renewContractService') as RenewContractService,
      c.make('listContractsService') as ListContractsService,
      c.make('getContractDetailService') as GetContractDetailService,
      c.make('handleContractExpiryService') as HandleContractExpiryService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('contractController') as ContractController
    registerContractRoutes(context.router, controller)
  }

  override boot(_container: IContainer): void {
    console.log('📋 [Contract] Module loaded')
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider.ts \
        src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts \
        src/Modules/Contract/Infrastructure/Providers/ContractServiceProvider.ts
git commit -m "refactor: [DI] 遷移 DevPortal + SdkApi + Contract ServiceProvider 至四層 hook"
```

---

## Task 5：遷移 AppModule + Credit

**Files:**
- Modify: `src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts`
- Modify: `src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts`

- [ ] **Step 1: 遷移 AppModuleServiceProvider**

> **注意：** `setCheckModuleAccessService(checkAccessService)` 從 `registerRoutes()` 移至 `boot()`，因為這是初始化 middleware singleton，而非路由綁定。

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { setCheckModuleAccessService } from '@/Shared/Infrastructure/Middleware/ModuleAccessMiddleware'
import type { IContractRepository } from '@/Modules/Contract/Domain/Repositories/IContractRepository'
import { CheckModuleAccessService } from '../../Application/Services/CheckModuleAccessService'
import { EnsureCoreAppModulesService } from '../../Application/Services/EnsureCoreAppModulesService'
import { GetModuleDetailService } from '../../Application/Services/GetModuleDetailService'
import { ListModulesService } from '../../Application/Services/ListModulesService'
import { ListOrgSubscriptionsService } from '../../Application/Services/ListOrgSubscriptionsService'
import { ProvisionOrganizationDefaultsService } from '../../Application/Services/ProvisionOrganizationDefaultsService'
import { RegisterModuleService } from '../../Application/Services/RegisterModuleService'
import { SubscribeModuleService } from '../../Application/Services/SubscribeModuleService'
import { UnsubscribeModuleService } from '../../Application/Services/UnsubscribeModuleService'
import type { IAppModuleRepository } from '../../Domain/Repositories/IAppModuleRepository'
import type { IModuleSubscriptionRepository } from '../../Domain/Repositories/IModuleSubscriptionRepository'
import { AppModuleRepository } from '../Repositories/AppModuleRepository'
import { ModuleSubscriptionRepository } from '../Repositories/ModuleSubscriptionRepository'
import { AppModuleController } from '../../Presentation/Controllers/AppModuleController'
import { registerAppModuleRoutes } from '../../Presentation/Routes/appModule.routes'

export class AppModuleServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    container.singleton('appModuleRepository', () => new AppModuleRepository(db))
    container.singleton('moduleSubscriptionRepository', () => new ModuleSubscriptionRepository(db))
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.singleton('ensureCoreAppModulesService', (c: IContainer) =>
      new EnsureCoreAppModulesService(c.make('appModuleRepository') as IAppModuleRepository)
    )
    container.singleton('provisionOrganizationDefaultsService', (c: IContainer) =>
      new ProvisionOrganizationDefaultsService(
        c.make('appModuleRepository') as IAppModuleRepository,
        c.make('contractRepository') as IContractRepository,
        c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository,
      )
    )
    container.bind('registerModuleService', (c: IContainer) =>
      new RegisterModuleService(c.make('appModuleRepository') as IAppModuleRepository)
    )
    container.bind('subscribeModuleService', (c: IContainer) => new SubscribeModuleService(
      c.make('appModuleRepository') as IAppModuleRepository,
      c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository,
    ))
    container.bind('unsubscribeModuleService', (c: IContainer) =>
      new UnsubscribeModuleService(c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository)
    )
    container.bind('checkModuleAccessService', (c: IContainer) => new CheckModuleAccessService(
      c.make('contractRepository') as IContractRepository,
      c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository,
      c.make('appModuleRepository') as IAppModuleRepository,
    ))
    container.bind('listModulesService', (c: IContainer) =>
      new ListModulesService(c.make('appModuleRepository') as IAppModuleRepository)
    )
    container.bind('getModuleDetailService', (c: IContainer) =>
      new GetModuleDetailService(c.make('appModuleRepository') as IAppModuleRepository)
    )
    container.bind('listOrgSubscriptionsService', (c: IContainer) =>
      new ListOrgSubscriptionsService(c.make('moduleSubscriptionRepository') as IModuleSubscriptionRepository)
    )
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('appModuleController', (c: IContainer) => new AppModuleController(
      c.make('registerModuleService') as RegisterModuleService,
      c.make('subscribeModuleService') as SubscribeModuleService,
      c.make('unsubscribeModuleService') as UnsubscribeModuleService,
      c.make('listModulesService') as ListModulesService,
      c.make('getModuleDetailService') as GetModuleDetailService,
      c.make('listOrgSubscriptionsService') as ListOrgSubscriptionsService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('appModuleController') as AppModuleController
    registerAppModuleRoutes(context.router, controller)
  }

  override boot(container: IContainer): void {
    // Middleware 初始化（不是 DI 註冊）
    const checkAccessService = container.make('checkModuleAccessService') as CheckModuleAccessService
    setCheckModuleAccessService(checkAccessService)
    console.log('🧩 [AppModule] Module loaded')
  }
}
```

- [ ] **Step 2: 遷移 CreditServiceProvider**

> **注意：** 原 `boot(core: any)` 有 `core?.container ?? core` 解包邏輯，現在直接改為 `boot(container: IContainer)`。

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { DeductCreditService } from '../../Application/Services/DeductCreditService'
import { GetBalanceService } from '../../Application/Services/GetBalanceService'
import { GetTransactionHistoryService } from '../../Application/Services/GetTransactionHistoryService'
import { HandleBalanceDepletedService } from '../../Application/Services/HandleBalanceDepletedService'
import { HandleCreditToppedUpService } from '../../Application/Services/HandleCreditToppedUpService'
import { RefundCreditService } from '../../Application/Services/RefundCreditService'
import { TopUpCreditService } from '../../Application/Services/TopUpCreditService'
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../../Domain/Repositories/ICreditTransactionRepository'
import { CreditAccountRepository } from '../Repositories/CreditAccountRepository'
import { CreditTransactionRepository } from '../Repositories/CreditTransactionRepository'
import { CreditController } from '../../Presentation/Controllers/CreditController'
import { registerCreditRoutes } from '../../Presentation/Routes/credit.routes'

export class CreditServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    container.singleton('creditAccountRepository', () => new CreditAccountRepository(db))
    container.singleton('creditTransactionRepository', () => new CreditTransactionRepository(db))
  }

  protected override registerApplicationServices(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    container.bind('deductCreditService', (c: IContainer) => new DeductCreditService(
      c.make('creditAccountRepository') as ICreditAccountRepository,
      c.make('creditTransactionRepository') as ICreditTransactionRepository,
      db,
    ))
    container.bind('topUpCreditService', (c: IContainer) => new TopUpCreditService(
      c.make('creditAccountRepository') as CreditAccountRepository,
      c.make('creditTransactionRepository') as CreditTransactionRepository,
      db,
    ))
    container.bind('getBalanceService', (c: IContainer) => new GetBalanceService(
      c.make('creditAccountRepository') as CreditAccountRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('getTransactionHistoryService', (c: IContainer) => new GetTransactionHistoryService(
      c.make('creditAccountRepository') as CreditAccountRepository,
      c.make('creditTransactionRepository') as CreditTransactionRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('refundCreditService', (c: IContainer) => new RefundCreditService(
      c.make('creditAccountRepository') as CreditAccountRepository,
      c.make('creditTransactionRepository') as CreditTransactionRepository,
      db,
    ))
    container.bind('handleBalanceDepletedService', (c: IContainer) => new HandleBalanceDepletedService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('llmGatewayClient') as ILLMGatewayClient,
    ))
    container.bind('handleCreditToppedUpService', (c: IContainer) => new HandleCreditToppedUpService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('llmGatewayClient') as ILLMGatewayClient,
    ))
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('creditController', (c: IContainer) => new CreditController(
      c.make('topUpCreditService') as TopUpCreditService,
      c.make('getBalanceService') as GetBalanceService,
      c.make('getTransactionHistoryService') as GetTransactionHistoryService,
      c.make('refundCreditService') as RefundCreditService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('creditController') as CreditController
    registerCreditRoutes(context.router, controller)
  }

  override boot(container: IContainer): void {
    const dispatcher = DomainEventDispatcher.getInstance()
    dispatcher.on('credit.balance_depleted', async (event) => {
      const handler = container.make('handleBalanceDepletedService') as HandleBalanceDepletedService
      await handler.execute(event.data.orgId as string)
    })
    dispatcher.on('credit.topped_up', async (event) => {
      const handler = container.make('handleCreditToppedUpService') as HandleCreditToppedUpService
      await handler.execute(event.data.orgId as string)
    })
    console.log('💰 [Credit] Module loaded')
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts \
        src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts
git commit -m "refactor: [DI] 遷移 AppModule + Credit ServiceProvider 至四層 hook"
```

---

## Task 6：遷移 Organization + Dashboard

**Files:**
- Modify: `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts`
- Modify: `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts`

- [ ] **Step 1: 遷移 OrganizationServiceProvider**

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import type { ProvisionOrganizationDefaultsService } from '@/Modules/AppModule/Application/Services/ProvisionOrganizationDefaultsService'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { AcceptInvitationService } from '../../Application/Services/AcceptInvitationService'
import { CancelInvitationService } from '../../Application/Services/CancelInvitationService'
import { ChangeOrgMemberRoleService } from '../../Application/Services/ChangeOrgMemberRoleService'
import { ChangeOrgStatusService } from '../../Application/Services/ChangeOrgStatusService'
import { CreateOrganizationService } from '../../Application/Services/CreateOrganizationService'
import { GetOrganizationService } from '../../Application/Services/GetOrganizationService'
import { InviteMemberService } from '../../Application/Services/InviteMemberService'
import { ListInvitationsService } from '../../Application/Services/ListInvitationsService'
import { ListMembersService } from '../../Application/Services/ListMembersService'
import { ListOrganizationsService } from '../../Application/Services/ListOrganizationsService'
import { OrgAuthorizationHelper } from '../../Application/Services/OrgAuthorizationHelper'
import { RemoveMemberService } from '../../Application/Services/RemoveMemberService'
import { UpdateOrganizationService } from '../../Application/Services/UpdateOrganizationService'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import { OrganizationInvitationRepository } from '../Repositories/OrganizationInvitationRepository'
import { OrganizationMemberRepository } from '../Repositories/OrganizationMemberRepository'
import { OrganizationRepository } from '../Repositories/OrganizationRepository'
import { OrganizationController } from '../../Presentation/Controllers/OrganizationController'
import { registerOrganizationRoutes } from '../../Presentation/Routes/organization.routes'

export class OrganizationServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    container.singleton('organizationRepository', () => new OrganizationRepository(db))
    container.singleton('organizationMemberRepository', () => new OrganizationMemberRepository(db))
    container.singleton('organizationInvitationRepository', () => new OrganizationInvitationRepository(db))
  }

  protected override registerApplicationServices(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    container.singleton('orgAuthorizationHelper', (c: IContainer) =>
      new OrgAuthorizationHelper(c.make('organizationMemberRepository') as IOrganizationMemberRepository)
    )
    container.bind('createOrganizationService', (c: IContainer) => new CreateOrganizationService(
      c.make('organizationRepository') as IOrganizationRepository,
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
      c.make('authRepository') as IAuthRepository,
      db as IDatabaseAccess,
      c.make('provisionOrganizationDefaultsService') as ProvisionOrganizationDefaultsService,
    ))
    container.bind('updateOrganizationService', (c: IContainer) => new UpdateOrganizationService(
      c.make('organizationRepository') as IOrganizationRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('listOrganizationsService', (c: IContainer) =>
      new ListOrganizationsService(c.make('organizationRepository') as IOrganizationRepository)
    )
    container.bind('getOrganizationService', (c: IContainer) => new GetOrganizationService(
      c.make('organizationRepository') as IOrganizationRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('changeOrgStatusService', (c: IContainer) => new ChangeOrgStatusService(
      c.make('organizationRepository') as IOrganizationRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('inviteMemberService', (c: IContainer) => new InviteMemberService(
      c.make('organizationRepository') as IOrganizationRepository,
      c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('acceptInvitationService', (c: IContainer) => new AcceptInvitationService(
      c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
      c.make('authRepository') as IAuthRepository,
      db as IDatabaseAccess,
    ))
    container.bind('removeMemberService', (c: IContainer) => new RemoveMemberService(
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      db as IDatabaseAccess,
    ))
    container.bind('listMembersService', (c: IContainer) => new ListMembersService(
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('changeOrgMemberRoleService', (c: IContainer) => new ChangeOrgMemberRoleService(
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
      db as IDatabaseAccess,
    ))
    container.bind('listInvitationsService', (c: IContainer) => new ListInvitationsService(
      c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
    container.bind('cancelInvitationService', (c: IContainer) => new CancelInvitationService(
      c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    ))
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('organizationController', (c: IContainer) => new OrganizationController(
      c.make('createOrganizationService') as CreateOrganizationService,
      c.make('updateOrganizationService') as UpdateOrganizationService,
      c.make('listOrganizationsService') as ListOrganizationsService,
      c.make('inviteMemberService') as InviteMemberService,
      c.make('acceptInvitationService') as AcceptInvitationService,
      c.make('removeMemberService') as RemoveMemberService,
      c.make('listMembersService') as ListMembersService,
      c.make('changeOrgMemberRoleService') as ChangeOrgMemberRoleService,
      c.make('getOrganizationService') as GetOrganizationService,
      c.make('changeOrgStatusService') as ChangeOrgStatusService,
      c.make('listInvitationsService') as ListInvitationsService,
      c.make('cancelInvitationService') as CancelInvitationService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('organizationController') as OrganizationController
    void registerOrganizationRoutes(context.router, controller)
  }

  override boot(_container: IContainer): void {
    console.log('🏢 [Organization] Module loaded')
  }
}
```

- [ ] **Step 2: 遷移 DashboardServiceProvider**

> **注意：** `private container!: IContainer` 保留供 `registerJobs()` 使用，在 `registerRepositories` 中設定（第一個被呼叫的 hook）。

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { getCurrentORM } from '@/wiring/RepositoryFactory'
import appConfig from '../../../../../config/app'
import type { IJobRegistrar } from '../../../../Foundation/Infrastructure/Ports/Scheduler/IJobRegistrar'
import type { IScheduler } from '../../../../Foundation/Infrastructure/Ports/Scheduler/IScheduler'
import type { ISyncCursorRepository } from '../../Application/Ports/ISyncCursorRepository'
import type { IUsageRepository } from '../../Application/Ports/IUsageRepository'
import { GetCostTrendsService } from '../../Application/Services/GetCostTrendsService'
import { GetDashboardSummaryService } from '../../Application/Services/GetDashboardSummaryService'
import { GetKpiSummaryService } from '../../Application/Services/GetKpiSummaryService'
import { GetModelComparisonService } from '../../Application/Services/GetModelComparisonService'
import { GetPerKeyCostService } from '../../Application/Services/GetPerKeyCostService'
import { GetUsageChartService } from '../../Application/Services/GetUsageChartService'
import { DrizzleSyncCursorRepository } from '../Repositories/DrizzleSyncCursorRepository'
import { DrizzleUsageRepository } from '../Repositories/DrizzleUsageRepository'
import { BifrostSyncService } from '../Services/BifrostSyncService'
import { DatabaseUsageAggregator } from '../Services/DatabaseUsageAggregator'
import { UsageAggregator } from '../Services/UsageAggregator'
import { DashboardController } from '../../Presentation/Controllers/DashboardController'
import { registerDashboardRoutes } from '../../Presentation/Routes/dashboard.routes'

export class DashboardServiceProvider extends ModuleServiceProvider implements IJobRegistrar, IRouteRegistrar {
  // 保留供 registerJobs() 使用（IJobRegistrar 介面需要）
  private container!: IContainer

  protected override registerRepositories(container: IContainer): void {
    this.container = container
    container.singleton('syncCursorRepository', (c: IContainer) =>
      new DrizzleSyncCursorRepository(c.make('database') as IDatabaseAccess)
    )
    container.singleton('drizzleUsageRepository', (c: IContainer) =>
      new DrizzleUsageRepository(c.make('database') as IDatabaseAccess)
    )
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('usageAggregator', (c: IContainer) => {
      if (getCurrentORM() === 'drizzle') {
        return new DatabaseUsageAggregator(c.make('drizzleUsageRepository') as IUsageRepository)
      }
      return new UsageAggregator(c.make('llmGatewayClient') as ILLMGatewayClient)
    })
    container.singleton('bifrostSyncService', (c: IContainer) => new BifrostSyncService(
      c.make('llmGatewayClient') as ILLMGatewayClient,
      c.make('drizzleUsageRepository') as IUsageRepository,
      c.make('syncCursorRepository') as ISyncCursorRepository,
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('database') as IDatabaseAccess,
    ))
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind('getDashboardSummaryService', (c: IContainer) => new GetDashboardSummaryService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('usageAggregator') as UsageAggregator,
    ))
    container.bind('getUsageChartService', (c: IContainer) => new GetUsageChartService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('usageAggregator') as UsageAggregator,
    ))
    container.bind('getKpiSummaryService', (c: IContainer) => new GetKpiSummaryService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('drizzleUsageRepository') as IUsageRepository,
      c.make('syncCursorRepository') as ISyncCursorRepository,
    ))
    container.bind('getCostTrendsService', (c: IContainer) => new GetCostTrendsService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('drizzleUsageRepository') as IUsageRepository,
    ))
    container.bind('getModelComparisonService', (c: IContainer) => new GetModelComparisonService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('drizzleUsageRepository') as IUsageRepository,
    ))
    container.bind('getPerKeyCostService', (c: IContainer) => new GetPerKeyCostService(
      c.make('apiKeyRepository') as IApiKeyRepository,
      c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      c.make('drizzleUsageRepository') as IUsageRepository,
    ))
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('dashboardController', (c: IContainer) => new DashboardController(
      c.make('getDashboardSummaryService') as GetDashboardSummaryService,
      c.make('getUsageChartService') as GetUsageChartService,
      c.make('getKpiSummaryService') as GetKpiSummaryService,
      c.make('getCostTrendsService') as GetCostTrendsService,
      c.make('getModelComparisonService') as GetModelComparisonService,
      c.make('getPerKeyCostService') as GetPerKeyCostService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('dashboardController') as DashboardController
    registerDashboardRoutes(context.router, controller)
  }

  registerJobs(scheduler: IScheduler): void {
    const syncService = this.container.make('bifrostSyncService') as BifrostSyncService
    scheduler.schedule(
      {
        name: 'bifrost-sync',
        cron: appConfig.bifrostSyncCron,
        runOnInit: true,
        maxRetries: 2,
        backoffMs: 2000,
      },
      async () => {
        const result = await syncService.sync()
        console.error(`[BifrostSync] Synced ${result.synced} records, quarantined ${result.quarantined}`)
      },
    )
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts \
        src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts
git commit -m "refactor: [DI] 遷移 Organization + Dashboard ServiceProvider 至四層 hook"
```

---

## Task 7：遷移 Reports + Auth

**Files:**
- Modify: `src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider.ts`
- Modify: `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`

- [ ] **Step 1: 遷移 ReportsServiceProvider**

> **注意：** `private container!: IContainer` 保留供 `registerJobs()` 使用，在 `registerRepositories` 中設定。`reportController` 從舊 `register()` 移至 `registerControllers()`。

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import type { IMailer } from '../../../../Foundation/Infrastructure/Ports/IMailer'
import type { IJobRegistrar } from '../../../../Foundation/Infrastructure/Ports/Scheduler/IJobRegistrar'
import type { IScheduler } from '../../../../Foundation/Infrastructure/Ports/Scheduler/IScheduler'
import type { IDatabaseAccess } from '../../../../Shared/Infrastructure/IDatabaseAccess'
import { GeneratePdfService } from '../../Application/Services/GeneratePdfService'
import { ScheduleReportService } from '../../Application/Services/ScheduleReportService'
import { SendReportEmailService } from '../../Application/Services/SendReportEmailService'
import type { IReportRepository } from '../../Domain/Repositories/IReportRepository'
import { ReportController } from '../../Presentation/Controllers/ReportController'
import { registerReportRoutes } from '../../Presentation/Routes/report.routes'
import { DrizzleReportRepository } from '../Repositories/DrizzleReportRepository'

export class ReportsServiceProvider extends ModuleServiceProvider implements IJobRegistrar, IRouteRegistrar {
  private container!: IContainer

  protected override registerRepositories(container: IContainer): void {
    this.container = container
    container.singleton('reportRepository', (c: IContainer) =>
      new DrizzleReportRepository(c.make('database') as IDatabaseAccess)
    )
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('generatePdfService', () => new GeneratePdfService())
    container.singleton('sendReportEmailService', (c: IContainer) =>
      new SendReportEmailService(c.make('mailer') as IMailer)
    )
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.singleton('scheduleReportService', (c: IContainer) => new ScheduleReportService(
      c.make('reportRepository') as IReportRepository,
      c.make('generatePdfService') as GeneratePdfService,
      c.make('sendReportEmailService') as SendReportEmailService,
      c.make('scheduler') as IScheduler,
    ))
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('reportController', (c: IContainer) => new ReportController(
      c.make('reportRepository') as IReportRepository,
      c.make('scheduleReportService') as ScheduleReportService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('reportController') as ReportController
    registerReportRoutes(context.router, controller)
  }

  async registerJobs(_scheduler: IScheduler): Promise<void> {
    const scheduleService = this.container.make('scheduleReportService') as ScheduleReportService
    await scheduleService.bootstrap()
    console.log('[Reports] registered scheduled report jobs')
  }
}
```

- [ ] **Step 2: 遷移 AuthServiceProvider**

> **注意：** `configureAuthMiddleware(...)` 從 `register()` 尾端移至 `boot()`；`registerAuthRoutes` 的 controller 從 `registerControllers()` 取得。

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import type { IUserProfileRepository } from '@/Modules/Profile/Domain/Repositories/IUserProfileRepository'
import { UserRegisteredHandler } from '@/Modules/Profile/Application/EventHandlers/UserRegisteredHandler'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { getCurrentDatabaseAccess } from '@/wiring/CurrentDatabaseAccess'
import { getCurrentORM } from '@/wiring/RepositoryFactory'
import { getRegistry } from '@/wiring/RepositoryRegistry'
import type { IEmailService } from '../../Application/Ports/IEmailService'
import type { IGoogleOAuthAdapter } from '../../Application/Ports/IGoogleOAuthAdapter'
import { ChangeUserStatusService } from '../../Application/Services/ChangeUserStatusService'
import { EmailVerificationService } from '../../Application/Services/EmailVerificationService'
import { ForgotPasswordService } from '../../Application/Services/ForgotPasswordService'
import { GetUserDetailService } from '../../Application/Services/GetUserDetailService'
import { GoogleOAuthService } from '../../Application/Services/GoogleOAuthService'
import { ListUsersService } from '../../Application/Services/ListUsersService'
import { LoginUserService } from '../../Application/Services/LoginUserService'
import { LogoutUserService } from '../../Application/Services/LogoutUserService'
import { RefreshTokenService } from '../../Application/Services/RefreshTokenService'
import { RegisterUserService } from '../../Application/Services/RegisterUserService'
import { ResetPasswordService } from '../../Application/Services/ResetPasswordService'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'
import type { IEmailVerificationRepository } from '../../Domain/Repositories/IEmailVerificationRepository'
import type { IPasswordResetRepository } from '../../Domain/Repositories/IPasswordResetRepository'
import { AuthController } from '../../Presentation/Controllers/AuthController'
import { registerAuthRoutes } from '../../Presentation/Routes/auth.routes'
import { registerTestSeedRoutes } from '../../Presentation/Routes/test-seed.routes'
import { configureAuthMiddleware } from '../../Presentation/Middleware/RoleMiddleware'
import { AuthRepository } from '../Repositories/AuthRepository'
import { AuthTokenRepository } from '../Repositories/AuthTokenRepository'
import { EmailVerificationRepository } from '../Repositories/EmailVerificationRepository'
import { PasswordResetRepository } from '../Repositories/PasswordResetRepository'
import { ConsoleEmailService } from '../Services/ConsoleEmailService'
import { GoogleOAuthAdapter } from '../Services/GoogleOAuthAdapter'
import { JwtTokenService } from '../Services/JwtTokenService'
import { ScryptPasswordHasher } from '../Services/PasswordHasher'

export class AuthServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    const db = getCurrentDatabaseAccess()
    const registry = getRegistry()
    registry.register('auth', (_orm: string, _db: IDatabaseAccess | undefined) => new AuthRepository(db))
    container.singleton('authRepository', () => getRegistry().create('auth', getCurrentORM(), undefined))
    container.singleton('authTokenRepository', () => new AuthTokenRepository(db))
    container.singleton('passwordResetRepository', () => new PasswordResetRepository(db))
    container.singleton('emailVerificationRepository', () => new EmailVerificationRepository(db))
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('passwordHasher', () => new ScryptPasswordHasher())
    container.singleton('jwtTokenService', () => new JwtTokenService())
    container.singleton('googleOAuthAdapter', () => new GoogleOAuthAdapter(
      process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
      process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
      process.env.GOOGLE_OAUTH_REDIRECT_URI ?? 'http://localhost:3000/oauth/google/callback',
    ))
    container.singleton('emailService', (): IEmailService => {
      if (process.env.NODE_ENV === 'production' && process.env.EMAIL_TRANSPORT_CONFIGURED !== 'true') {
        throw new Error(
          '[Auth] Production email transport not configured. ' +
          'Set EMAIL_TRANSPORT_CONFIGURED=true and wire a real IEmailService binding, ' +
          'or replace ConsoleEmailService in AuthServiceProvider.',
        )
      }
      return new ConsoleEmailService()
    })
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind('registerUserService', (c: IContainer) => new RegisterUserService(
      c.make('authRepository') as IAuthRepository,
      c.make('passwordHasher') as ScryptPasswordHasher,
    ))
    container.bind('loginUserService', (c: IContainer) => new LoginUserService(
      c.make('authRepository') as IAuthRepository,
      c.make('authTokenRepository') as IAuthTokenRepository,
      c.make('jwtTokenService') as JwtTokenService,
      c.make('passwordHasher') as ScryptPasswordHasher,
    ))
    container.bind('refreshTokenService', (c: IContainer) => new RefreshTokenService(
      c.make('authRepository') as IAuthRepository,
      c.make('authTokenRepository') as IAuthTokenRepository,
      c.make('jwtTokenService') as JwtTokenService,
    ))
    container.bind('logoutUserService', (c: IContainer) =>
      new LogoutUserService(c.make('authTokenRepository') as IAuthTokenRepository)
    )
    container.bind('changeUserStatusService', (c: IContainer) => new ChangeUserStatusService(
      c.make('authRepository') as IAuthRepository,
      c.make('authTokenRepository') as IAuthTokenRepository,
    ))
    container.bind('listUsersService', (c: IContainer) => new ListUsersService(
      c.make('authRepository') as IAuthRepository,
      c.make('profileRepository') as IUserProfileRepository,
    ))
    container.bind('getUserDetailService', (c: IContainer) =>
      new GetUserDetailService(c.make('authRepository') as IAuthRepository)
    )
    container.bind('googleOAuthService', (c: IContainer) => new GoogleOAuthService(
      c.make('authRepository') as IAuthRepository,
      c.make('jwtTokenService') as JwtTokenService,
      c.make('googleOAuthAdapter') as IGoogleOAuthAdapter,
      c.make('profileRepository') as IUserProfileRepository,
      c.make('passwordHasher') as ScryptPasswordHasher,
    ))
    container.bind('forgotPasswordService', (c: IContainer) => new ForgotPasswordService(
      c.make('authRepository') as IAuthRepository,
      c.make('passwordResetRepository') as IPasswordResetRepository,
      c.make('emailService') as IEmailService,
      process.env.APP_URL?.trim() || 'http://localhost:3000',
    ))
    container.bind('resetPasswordService', (c: IContainer) => new ResetPasswordService(
      c.make('passwordResetRepository') as IPasswordResetRepository,
      c.make('authRepository') as IAuthRepository,
      c.make('passwordHasher') as ScryptPasswordHasher,
      c.make('authTokenRepository') as IAuthTokenRepository,
    ))
    container.bind('emailVerificationService', (c: IContainer) => new EmailVerificationService(
      c.make('emailVerificationRepository') as IEmailVerificationRepository,
    ))
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('authController', (c: IContainer) => new AuthController(
      c.make('registerUserService') as RegisterUserService,
      c.make('loginUserService') as LoginUserService,
      c.make('refreshTokenService') as RefreshTokenService,
      c.make('logoutUserService') as LogoutUserService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('authController') as AuthController
    void registerAuthRoutes(context.router, controller)
    if (getCurrentORM() === 'memory') {
      registerTestSeedRoutes(context.router, getCurrentDatabaseAccess())
    }
  }

  override boot(container: IContainer): void {
    // Middleware 初始化
    configureAuthMiddleware(container.make('authTokenRepository') as IAuthTokenRepository)

    // Event 訂閱
    const profileRepo = container.make('profileRepository') as IUserProfileRepository
    DomainEventDispatcher.getInstance().on('auth.user_registered', async (event) => {
      await new UserRegisteredHandler(profileRepo).execute(
        event.data.userId as string,
        event.data.email as string,
      )
    })
    console.log('🔐 [Auth] Module loaded')
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider.ts \
        src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts
git commit -m "refactor: [DI] 遷移 Reports + Auth ServiceProvider 至四層 hook"
```

---

## Task 8：遷移 Alerts

**Files:**
- Modify: `src/Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider.ts`

- [ ] **Step 1: 遷移 AlertsServiceProvider**

> **注意：** Alerts 已部分使用 `wireSingleton`/`wireBind`，保留此風格；`boot(context: unknown)` 改為 `boot(container: IContainer)` 並移除解包。

```typescript
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { registerAlertRoutes } from '../../Presentation/Routes/alert.routes'
import type { IMailer } from '@/Foundation/Infrastructure/Ports/IMailer'
import type { IWebhookDispatcher } from '@/Foundation/Infrastructure/Ports/IWebhookDispatcher'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IUsageRepository } from '@/Modules/Dashboard/Application/Ports/IUsageRepository'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { wireBind, wireSingleton } from '@/Shared/Infrastructure/wire'

import { DeleteWebhookEndpointService } from '../../Application/Services/DeleteWebhookEndpointService'
import { EvaluateThresholdsService } from '../../Application/Services/EvaluateThresholdsService'
import { GetAlertHistoryService } from '../../Application/Services/GetAlertHistoryService'
import { GetBudgetService } from '../../Application/Services/GetBudgetService'
import { ListWebhookEndpointsService } from '../../Application/Services/ListWebhookEndpointsService'
import { RegisterWebhookEndpointService } from '../../Application/Services/RegisterWebhookEndpointService'
import { ResendDeliveryService } from '../../Application/Services/ResendDeliveryService'
import { RotateWebhookSecretService } from '../../Application/Services/RotateWebhookSecretService'
import { SendAlertService } from '../../Application/Services/SendAlertService'
import { SetBudgetService } from '../../Application/Services/SetBudgetService'
import { TestWebhookEndpointService } from '../../Application/Services/TestWebhookEndpointService'
import { UpdateWebhookEndpointService } from '../../Application/Services/UpdateWebhookEndpointService'
import type { IAlertConfigRepository } from '../../Domain/Repositories/IAlertConfigRepository'
import type { IAlertDeliveryRepository } from '../../Domain/Repositories/IAlertDeliveryRepository'
import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'
import type { IWebhookEndpointRepository } from '../../Domain/Repositories/IWebhookEndpointRepository'
import type { IAlertNotifier } from '../../Domain/Services/IAlertNotifier'
import type { IAlertRecipientResolver } from '../../Domain/Services/IAlertRecipientResolver'
import { AlertController } from '../../Presentation/Controllers/AlertController'
import { AlertHistoryController } from '../../Presentation/Controllers/AlertHistoryController'
import { WebhookEndpointController } from '../../Presentation/Controllers/WebhookEndpointController'
import { AlertConfigRepository } from '../Repositories/AlertConfigRepository'
import { AlertDeliveryRepository } from '../Repositories/AlertDeliveryRepository'
import { AlertEventRepository } from '../Repositories/AlertEventRepository'
import { WebhookEndpointRepository } from '../Repositories/WebhookEndpointRepository'
import { AlertRecipientResolverImpl } from '../Services/AlertRecipientResolverImpl'
import { EmailAlertNotifier } from '../Services/EmailAlertNotifier'
import { WebhookAlertNotifier } from '../Services/WebhookAlertNotifier'

export class AlertsServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  protected override registerRepositories(container: IContainer): void {
    wireSingleton(container, 'alertConfigRepository', AlertConfigRepository, ['database'])
    wireSingleton(container, 'alertEventRepository', AlertEventRepository, ['database'])
    wireSingleton(container, 'webhookEndpointRepository', WebhookEndpointRepository, ['database'])
    wireSingleton(container, 'alertDeliveryRepository', AlertDeliveryRepository, ['database'])
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('emailAlertNotifier', (c: IContainer) => new EmailAlertNotifier({
      mailer: c.make('mailer') as IMailer,
      deliveryRepo: c.make('alertDeliveryRepository') as IAlertDeliveryRepository,
    }))
    container.singleton('webhookAlertNotifier', (c: IContainer) => new WebhookAlertNotifier({
      endpointRepo: c.make('webhookEndpointRepository') as IWebhookEndpointRepository,
      deliveryRepo: c.make('alertDeliveryRepository') as IAlertDeliveryRepository,
      dispatcher: c.make('webhookDispatcher') as IWebhookDispatcher,
    }))
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.bind('alertRecipientResolver', (c: IContainer) => new AlertRecipientResolverImpl({
      orgRepo: c.make('organizationRepository') as IOrganizationRepository,
      orgMemberRepo: c.make('organizationMemberRepository') as IOrganizationMemberRepository,
      authRepo: c.make('authRepository') as IAuthRepository,
    }))

    wireBind(container, 'setBudgetService', SetBudgetService, ['alertConfigRepository'])
    wireBind(container, 'getBudgetService', GetBudgetService, ['alertConfigRepository'])
    wireBind(container, 'listWebhookEndpointsService', ListWebhookEndpointsService, ['webhookEndpointRepository'])
    wireBind(container, 'updateWebhookEndpointService', UpdateWebhookEndpointService, ['webhookEndpointRepository'])
    wireBind(container, 'rotateWebhookSecretService', RotateWebhookSecretService, ['webhookEndpointRepository'])
    wireBind(container, 'deleteWebhookEndpointService', DeleteWebhookEndpointService, ['webhookEndpointRepository'])

    container.bind('registerWebhookEndpointService', (c: IContainer) => new RegisterWebhookEndpointService({
      repo: c.make('webhookEndpointRepository') as IWebhookEndpointRepository,
      allowHttp: process.env.WEBHOOK_ALLOW_HTTP === '1',
    }))
    container.bind('testWebhookEndpointService', (c: IContainer) => new TestWebhookEndpointService({
      repo: c.make('webhookEndpointRepository') as IWebhookEndpointRepository,
      dispatcher: c.make('webhookDispatcher') as IWebhookDispatcher,
    }))
    container.bind('getAlertHistoryService', (c: IContainer) => new GetAlertHistoryService({
      eventRepo: c.make('alertEventRepository') as IAlertEventRepository,
      deliveryRepo: c.make('alertDeliveryRepository') as IAlertDeliveryRepository,
    }))
    container.bind('resendDeliveryService', (c: IContainer) => new ResendDeliveryService({
      deliveryRepo: c.make('alertDeliveryRepository') as IAlertDeliveryRepository,
      eventRepo: c.make('alertEventRepository') as IAlertEventRepository,
      recipientResolver: c.make('alertRecipientResolver') as IAlertRecipientResolver,
      notifierRegistry: {
        email: c.make('emailAlertNotifier') as IAlertNotifier,
        webhook: c.make('webhookAlertNotifier') as IAlertNotifier,
      },
    }))
    container.bind('sendAlertService', (c: IContainer) => new SendAlertService({
      recipientResolver: c.make('alertRecipientResolver') as IAlertRecipientResolver,
      alertEventRepo: c.make('alertEventRepository') as IAlertEventRepository,
      notifiers: [
        c.make('emailAlertNotifier') as IAlertNotifier,
        c.make('webhookAlertNotifier') as IAlertNotifier,
      ],
    }))
    container.bind('evaluateThresholdsService', (c: IContainer) => new EvaluateThresholdsService({
      configRepo: c.make('alertConfigRepository') as IAlertConfigRepository,
      usageRepo: c.make('drizzleUsageRepository') as IUsageRepository,
      apiKeyRepo: c.make('apiKeyRepository') as IApiKeyRepository,
      sendAlertService: c.make('sendAlertService') as SendAlertService,
    }))
  }

  protected override registerControllers(container: IContainer): void {
    wireBind(container, 'alertController', AlertController, ['setBudgetService', 'getBudgetService'])
    container.bind('webhookEndpointController', (c: IContainer) => new WebhookEndpointController({
      listWebhookEndpointsService: c.make('listWebhookEndpointsService') as ListWebhookEndpointsService,
      registerWebhookEndpointService: c.make('registerWebhookEndpointService') as RegisterWebhookEndpointService,
      updateWebhookEndpointService: c.make('updateWebhookEndpointService') as UpdateWebhookEndpointService,
      rotateWebhookSecretService: c.make('rotateWebhookSecretService') as RotateWebhookSecretService,
      deleteWebhookEndpointService: c.make('deleteWebhookEndpointService') as DeleteWebhookEndpointService,
      testWebhookEndpointService: c.make('testWebhookEndpointService') as TestWebhookEndpointService,
    }))
    container.bind('alertHistoryController', (c: IContainer) => new AlertHistoryController({
      getAlertHistoryService: c.make('getAlertHistoryService') as GetAlertHistoryService,
      resendDeliveryService: c.make('resendDeliveryService') as ResendDeliveryService,
    }))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('alertController') as AlertController
    const webhookController = context.container.make('webhookEndpointController') as WebhookEndpointController
    const historyController = context.container.make('alertHistoryController') as AlertHistoryController
    registerAlertRoutes(context.router, controller, webhookController, historyController)
  }

  override boot(container: IContainer): void {
    const evaluateThresholdsService = container.make('evaluateThresholdsService') as EvaluateThresholdsService
    DomainEventDispatcher.getInstance().on('bifrost.sync.completed', async (event) => {
      const orgIds = Array.isArray(event.data.orgIds)
        ? event.data.orgIds.map((value) => String(value))
        : []
      await evaluateThresholdsService.evaluateOrgs(orgIds)
    })
    console.error('[Alerts] Module loaded')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider.ts
git commit -m "refactor: [DI] 遷移 Alerts ServiceProvider 至四層 hook"
```

---

## Task 9：TypeScript build + 測試驗證

**Files:** 無新增修改

- [ ] **Step 1: 執行 TypeScript 型別檢查**

```bash
bun run typecheck
```

預期：**0 errors**

若有錯誤，常見原因：
- Controller 建構子參數型別不符 → 確認 `c.make(...)` 的 cast 型別
- `override boot(container: IContainer)` 與 base 簽名不符 → 確認 base class 已更新
- 某個 provider 仍有 `override register()` → 找到並移除

- [ ] **Step 2: 執行所有測試**

```bash
bun test src
```

預期：全部通過（含 Task 1 新增的 4 個 base class 測試）

- [ ] **Step 3: 執行 base class 專項測試**

```bash
bun test src/Shared/__tests__/ModuleServiceProvider.test.ts
```

預期：**PASS 4 tests**

- [ ] **Step 4: 最終 commit**

```bash
git add -A
git commit -m "refactor: [DI] ServiceProvider 架構規範遷移完成 — 全 15 模組四層 hook"
```

---

## 驗收清單

- [ ] `ModuleServiceProvider.register` 為 `readonly` arrow function property
- [ ] `tsconfig.json` 新增 `noImplicitOverride: true`
- [ ] `boot()` 簽名為 `boot(_container: IContainer): void`，無 `any`
- [ ] 所有 `boot()` 實作內無 `container.singleton` / `container.bind`
- [ ] 所有 `registerRoutes()` 內無 `new Controller(...)` 及 `as any`
- [ ] 所有 `boot()` 實作內無解包邏輯（`context as IContainer` / `core?.container ?? core`）
- [ ] `bun run typecheck` 通過（0 errors）
- [ ] `bun test src` 全部通過
