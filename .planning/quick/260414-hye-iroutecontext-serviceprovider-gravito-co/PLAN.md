# Quick Task 260414-hye: IRouteContext Refactoring Plan

**Created:** 2026-04-14
**Status:** Ready

## Goal

消除所有模組 `ServiceProvider` 對 `@gravito/core` `PlanetCore` 的直接 import，讓 `@gravito/core` 耦合僅存在於 `src/Shared/Infrastructure/Framework/` 目錄下的適配層。

透過新增框架無關的 `IRouteContext` 抽象，`IRouteRegistrar.registerRoutes` 的簽名改為接受 `IRouteContext`（包含 `container: IContainer` 與 `router: IModuleRouter`），模組僅透過此抽象操作容器與路由。

## Success Criteria

- `grep -r "from '@gravito/core'" src/Modules src/Foundation src/Website` 僅命中 `Shared/Infrastructure/Framework/` 以外沒有非預期結果（除非屬於既有的 Infrastructure 適配器）。
- 所有 `*ServiceProvider.ts` 的 `registerRoutes` 簽名改為 `registerRoutes(context: IRouteContext): void | Promise<void>`。
- `bun run typecheck`（或 `tsc --noEmit`）通過。
- 既有單元測試與路由行為維持不變（`bun test` 通過）。

## Affected Files Inventory

**需修改的 18 個 ServiceProvider：**
1. `src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts`
2. `src/Website/bootstrap/WebsiteServiceProvider.ts`
3. `src/Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider.ts`
4. `src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts`
5. `src/Modules/AppApiKey/Infrastructure/Providers/AppApiKeyServiceProvider.ts`
6. `src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider.ts`
7. `src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider.ts`
8. `src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider.ts`
9. `src/Modules/Contract/Infrastructure/Providers/ContractServiceProvider.ts`
10. `src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts`
11. `src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts`
12. `src/Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider.ts`
13. `src/Modules/Health/Infrastructure/Providers/HealthServiceProvider.ts`
14. `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts`
15. `src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts`
16. `src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider.ts`
17. `src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider.ts`

(17 個模組，上面少算 AlertsServiceProvider 後正好 17；AlertsServiceProvider 已在 uncommitted diff 內)

**需修改的框架適配層：**
- `src/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter.ts`（`IRouteRegistrar` 介面簽名）
- `src/Shared/Infrastructure/Framework/GravitoHealthAdapter.ts`（改接收 `IRouteContext`）
- `src/Shared/Infrastructure/Framework/GravitoDocsAdapter.ts`（改接收 `IRouteContext`）
- `src/bootstrap.ts`（呼叫 `registerRoutes(context)` 前組裝 `IRouteContext`）

**新增檔案：**
- `src/Shared/Infrastructure/IRouteContext.ts`（新增介面）

## Design Decision

**為何把 `IRouteContext` 放在 `src/Shared/Infrastructure/` 而不是 `Framework/`：**
`IRouteContext` 本身是框架無關抽象（只參照 `IContainer` 與 `IModuleRouter`），模組的 `ServiceProvider` 需要 import 它；如果放進 `Framework/`，會讓模組在語意上以為那裡是框架耦合層。放在 `Shared/Infrastructure/` 與 `IServiceProvider.ts` 同層最恰當。

**為何不乾脆把 `container` 從 `IRouteContext` 拿掉、改讓模組在 `register()` 保存 container 參考：**
`register()` 階段 container 尚未完成所有模組註冊；`registerRoutes()` 階段才可以安全呼叫 `container.make(...)` 取得跨模組依賴。保留 `container` 在 context 中語意最清楚。

---

## Tasks

### Task 1: 新增 `IRouteContext` 介面

**File:** `src/Shared/Infrastructure/IRouteContext.ts`（新檔）

**Action:** 建立以下內容：

```typescript
/**
 * Route registration context - Framework Agnostic.
 *
 * @public - Passed to IRouteRegistrar.registerRoutes so modules can register
 *   HTTP routes without depending on any specific web framework.
 *
 * The framework adapter layer is responsible for assembling this context from
 * its concrete core/app instance (e.g. Gravito PlanetCore) before invoking
 * `registerRoutes`. Modules must only interact with IContainer + IModuleRouter.
 */
import type { IContainer } from './IServiceProvider'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'

export interface IRouteContext {
  /** Framework-agnostic DI container for resolving already-registered services. */
  readonly container: IContainer
  /** Framework-agnostic module router for declaring HTTP endpoints. */
  readonly router: IModuleRouter
}
```

**Verify:** `bun x tsc --noEmit` 通過，檔案存在且 export `IRouteContext`。

---

### Task 2: 更新 `IRouteRegistrar` 介面簽名

**File:** `src/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter.ts`

**Action:**
1. 新增 import：`import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'`
2. 把 `IRouteRegistrar.registerRoutes` 的簽名從：

   ```typescript
   export interface IRouteRegistrar {
     registerRoutes(core: PlanetCore): void | Promise<void>
   }
   ```

   改成：

   ```typescript
   export interface IRouteRegistrar {
     registerRoutes(context: IRouteContext): void | Promise<void>
   }
   ```

3. 移除不再使用的 `PlanetCore` import（檢查檔案其他地方是否還用到；目前 `boot(core: PlanetCore)` 仍需要，所以 `PlanetCore` import 保留）。
4. `isRouteRegistrar` 型別守衛維持不變（仍檢查 `registerRoutes` 是 function）。

**Verify:** 此檔案 `tsc --noEmit` 單獨編譯通過（必定連帶 break 其他檔案，Task 3+ 才會修完）。

---

### Task 3: 更新 `bootstrap.ts` 組裝 `IRouteContext`

**File:** `src/bootstrap.ts`

**Action:**
1. 新增 import：
   ```typescript
   import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
   import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
   import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
   ```
2. 在迭代 `registerRoutes` 迴圈前組裝 context。因為 `GravitoContainerAdapter` 是 private class，最簡潔的方式是直接呼叫 `core.container.make` 時透過 `IRouteContext` 結構；但 `core.container` 是 Gravito 原生 container，不符 `IContainer` 介面。

   **解法**：把 `GravitoContainerAdapter` 從 `GravitoServiceProviderAdapter.ts` 內部改為 `export`（或提供一個 factory `createAdaptedContainer(core)`），讓 `bootstrap.ts` 可以使用它。

   **具體步驟：**
   - 在 `GravitoServiceProviderAdapter.ts` export 一個 factory：
     ```typescript
     export function adaptGravitoContainer(gravitoContainer: GravitoContainer): IContainer {
       return new GravitoContainerAdapter(gravitoContainer)
     }
     ```
   - `bootstrap.ts` 中組裝：
     ```typescript
     const container: IContainer = adaptGravitoContainer(core.container)
     const router = createGravitoModuleRouter(core)
     const routeContext: IRouteContext = { container, router }
     for (const module of modules) {
       if (isRouteRegistrar(module)) {
         await module.registerRoutes(routeContext)
       }
     }
     ```

3. 注意：各模組原本可能透過 `createGravitoModuleRouter(core, prefix)` 用不同 prefix 建立子 router（例如 `SdkApi`、`CliApi` 會用 `/api/v1` 之類）。`IRouteContext.router` 只提供「根 router」，模組仍可透過 `router.group(prefix, fn)` 來達成原本 prefix 效果；若任一模組使用非 group 的 prefix，Task 4~20 需確認改寫方式。

**Verify:** `bun x tsc --noEmit src/bootstrap.ts`（或全專案）錯誤數量較之前減少。

---

### Task 4: 更新 `GravitoHealthAdapter` 接收 `IRouteContext`

**File:** `src/Shared/Infrastructure/Framework/GravitoHealthAdapter.ts`

**Action:**
1. 把 `registerHealthWithGravito(core: PlanetCore)` 改為 `registerHealthWithGravito(context: IRouteContext)`。
2. 內部：
   - `core.container.make(...)` → `context.container.make(...)`（需要時搭配 `tryMake` helper 的 signature 調整）
   - `const router = createGravitoModuleRouter(core)` → `const router = context.router`
3. 更新 `tryMake` helper：改為 `tryMake<T>(container: IContainer, key: string): T | undefined`。

**Verify:** 檔案 `tsc --noEmit` 通過；不再 import `PlanetCore`（允許 import 留存給註解，但最好移除）。

---

### Task 5: 更新 `GravitoDocsAdapter` 接收 `IRouteContext`

**File:** `src/Shared/Infrastructure/Framework/GravitoDocsAdapter.ts`

**Action:**
1. 把 `registerDocsWithGravito(core: PlanetCore)` 改為 `registerDocsWithGravito(context: IRouteContext)`。
2. `core.router.get('/api/docs', ...)` → `context.router.get('/api/docs', handler)`。注意 `IModuleRouter.get` 的 handler 型別是 `(ctx: IHttpContext) => Promise<Response>`，與原本 Gravito 原生 ctx 不同；需確認 `ctx.html()`、`ctx.json()`、`ctx.header()` 在 `IHttpContext` 上都存在。若 `IHttpContext` 沒有 `header()`，需透過 `Response` header 設定替代。

**Verify:** `curl http://localhost:3000/api/docs` 回傳 HTML；`curl http://localhost:3000/api/openapi.json` 回傳 JSON。

---

### Task 6: 更新 17 個模組 ServiceProvider 的 `registerRoutes`

針對每個 ServiceProvider 做三件事：
1. 移除 `import type { PlanetCore } from '@gravito/core'`
2. 新增 `import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'`
3. 把方法簽名與 body 改寫：

**改寫 pattern A（多數模組 — 使用 createGravitoModuleRouter + container.make）：**

```typescript
// Before
registerRoutes(core: PlanetCore): void {
  const router = createGravitoModuleRouter(core)
  const controller = core.container.make('xxxController') as XxxController
  registerXxxRoutes(router, controller)
}

// After
registerRoutes(context: IRouteContext): void {
  const controller = context.container.make('xxxController') as XxxController
  registerXxxRoutes(context.router, controller)
}
```

若該模組原本呼叫 `createGravitoModuleRouter(core, '/some/prefix')`，改寫為：

```typescript
registerRoutes(context: IRouteContext): void {
  const controller = context.container.make('xxxController') as XxxController
  context.router.group('/some/prefix', (r) => {
    registerXxxRoutes(r, controller)
  })
}
```

**改寫 pattern B（Foundation — 呼叫 `registerDocsWithGravito`）：**

```typescript
async registerRoutes(context: IRouteContext): Promise<void> {
  context.router.get('/api', async (ctx) =>
    ctx.json({ success: true, message: 'Draupnir API', version: '0.1.0' }),
    { name: 'api.root' },
  )
  await registerDocsWithGravito(context)
}
```

**改寫 pattern C（Health — 呼叫 `registerHealthWithGravito`）：**

```typescript
registerRoutes(context: IRouteContext): void {
  registerHealthWithGravito(context)
}
```

**逐一處理（可一次 Edit 多檔，但逐檔 typecheck）：**

- 6.1 `FoundationServiceProvider.ts`（pattern B）
- 6.2 `HealthServiceProvider.ts`（pattern C）
- 6.3 `AlertsServiceProvider.ts`（pattern A）
- 6.4 `ApiKeyServiceProvider.ts`（pattern A，檢查是否用 prefix）
- 6.5 `AppApiKeyServiceProvider.ts`（pattern A）
- 6.6 `AppModuleServiceProvider.ts`（pattern A）
- 6.7 `AuthServiceProvider.ts`（pattern A，內容最長）
- 6.8 `CliApiServiceProvider.ts`（pattern A，注意 /api prefix）
- 6.9 `ContractServiceProvider.ts`（pattern A）
- 6.10 `CreditServiceProvider.ts`（pattern A）
- 6.11 `DashboardServiceProvider.ts`（pattern A）
- 6.12 `DevPortalServiceProvider.ts`（pattern A）
- 6.13 `OrganizationServiceProvider.ts`（pattern A）
- 6.14 `ProfileServiceProvider.ts`（pattern A）
- 6.15 `ReportsServiceProvider.ts`（pattern A）
- 6.16 `SdkApiServiceProvider.ts`（pattern A，注意 /api prefix）
- 6.17 `WebsiteServiceProvider.ts`（pattern A，/Website 相關）

**對每一檔的操作步驟：**
1. Read 該檔 `registerRoutes` 區塊
2. 紀錄是否使用 `createGravitoModuleRouter(core, prefix)` 的 prefix
3. 把 prefix 改為 `context.router.group(prefix, fn)`；若無 prefix 則直接使用 `context.router`
4. 所有 `core.container.make(...)` 改為 `context.container.make(...)`
5. 移除 `PlanetCore` import，新增 `IRouteContext` import
6. 若該檔 `registerRoutes` 之外仍有使用 `PlanetCore`（少見，但檢查一下）→ 如果 `boot` 有用到，保留；否則移除整個 import

**Verify（每改完一個模組）：** `bun x tsc --noEmit` 該檔無 error。

---

### Task 7: 全域驗證

**Action:**
1. 執行 `grep -rn "from '@gravito/core'" src/Modules src/Foundation src/Website` — 預期無結果（或僅剩 boot/container 相關但不帶 `PlanetCore`）。若仍有 `PlanetCore` 命中，需逐一處理。
2. 執行 `bun x tsc --noEmit`（或專案對應指令）— 預期 0 error。
3. 執行 `bun test`（或 `pnpm test`）— 既有測試全通過。
4. 啟動服務：`bun run dev` / 對應啟動指令，手動 smoke test 至少以下路由：
   - `GET /health`
   - `GET /api`
   - `GET /api/docs`
   - `GET /api/openapi.json`
   - 至少一個模組路由（例：`GET /api/api-keys` 或 Dashboard 首頁）

**Done when:**
- [ ] `src/Modules/*/Infrastructure/Providers/*.ts` 任一檔 `grep PlanetCore` 無結果
- [ ] `src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts` 無 `PlanetCore`
- [ ] `src/Website/bootstrap/WebsiteServiceProvider.ts` 無 `PlanetCore`
- [ ] `@gravito/core` 的 `PlanetCore` 只出現在 `src/Shared/Infrastructure/Framework/**` 與 `src/bootstrap.ts`
- [ ] typecheck + tests 通過
- [ ] smoke test 通過

---

### Task 8: Git commit

```
refactor: [DI] 新增 IRouteContext 框架無關抽象

將 IRouteRegistrar.registerRoutes 的參數從 Gravito PlanetCore 改為
框架無關的 IRouteContext（container + router），消除 17 個模組
ServiceProvider 對 @gravito/core 的直接耦合。

- 新增 src/Shared/Infrastructure/IRouteContext.ts
- 更新 GravitoHealthAdapter/GravitoDocsAdapter 接收 IRouteContext
- bootstrap.ts 組裝 IRouteContext 後傳遞給各模組
- @gravito/core 耦合現僅存於 Shared/Infrastructure/Framework/ 與 bootstrap.ts
```

---

## Risks & Mitigations

- **Risk:** 某些模組可能用 `createGravitoModuleRouter(core, prefix)` 的 prefix 與 `router.group()` 行為不完全等價（例如 named route 的 prefix 組合）。
  **Mitigation:** Task 6 針對有 prefix 的模組逐一確認行為；若 group 不完全等價，可在 `IRouteContext` 擴充 `createSubRouter(prefix)` helper。

- **Risk:** `GravitoContainerAdapter` 原本是 private class，export 後可能與 Gravito 內部實作綁更緊。
  **Mitigation:** 僅 export factory 函式 `adaptGravitoContainer`，不 export class 本身，保持封裝。

- **Risk:** `GravitoDocsAdapter` 從 `core.router.get` 改用 `IModuleRouter.get`，`IHttpContext` API 可能缺少 `header()` 等方法。
  **Mitigation:** Task 5 實作前先檢查 `IHttpContext` 介面；若缺方法，改用回傳 `new Response(html, { headers })` 的方式達成。

PLAN COMPLETE
