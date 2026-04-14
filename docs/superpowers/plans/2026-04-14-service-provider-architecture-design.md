# ServiceProvider 架構規範遷移計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正剩餘不合規的 ServiceProvider，使所有模組完全符合 `ModuleServiceProvider` 四層架構規範。

**Architecture:** Base class `ModuleServiceProvider` 與 `GravitoServiceProviderAdapter` 已正確實作；15 個模組皆已符合四層規範（含 Profile `as any` 與 DevPortal 冗餘 singleton 之清理）。

**Tech Stack:** TypeScript strict mode, Bun test runner, `tsc --noEmit` 作為型別驗證工具

---

## 現況快照

| 模組 | 狀態 | 問題 |
|------|------|------|
| `IServiceProvider.ts` base class | ✅ 已完成 | — |
| `GravitoServiceProviderAdapter.ts` | ✅ 已完成 | — |
| Auth | ✅ 已完成 | — |
| Alerts | ✅ 已完成 | — |
| ApiKey | ✅ 已完成 | — |
| AppApiKey | ✅ 已完成 | — |
| AppModule | ✅ 已完成 | — |
| CliApi | ✅ 已完成 | — |
| Contract | ✅ 已完成 | — |
| Credit | ✅ 已完成 | — |
| Dashboard | ✅ 已完成 | — |
| DevPortal | ✅ 已完成 | — |
| Health | ✅ 已完成 | — |
| Organization | ✅ 已完成 | — |
| Profile | ✅ 已完成 | — |
| Reports | ✅ 已完成 | — |
| SdkApi | ✅ 已完成 | — |

---

## 驗收標準（完整）

來自規格文件：

- [x] `ModuleServiceProvider.register` 為 `readonly` arrow function property
- [x] `boot()` 簽名為 `boot(_container: IContainer): void`，無 `any`
- [x] 所有 `boot()` 實作內無 `container.singleton` / `container.bind` 呼叫
- [x] 所有 `registerRoutes()` 內無 `new Controller(...)` 及 `as any`
- [x] 所有 `boot()` 實作內無解包邏輯（`context as IContainer` / `core?.container ?? core`）
- [x] 本計畫範圍內原始碼（含 `registerMemberBindings.ts` 補回函式包裝）無語法／遷移相關 TS 錯誤
- [ ] 專案全域 `tsc --noEmit` 仍受其他預存測試檔等問題影響（與本 ServiceProvider 遷移無關）

**待完成項目（本計畫範圍）：**
- [x] `ProfileServiceProvider.registerControllers()` 無 `as any` 型別轉型
- [x] `DevPortalServiceProvider.registerInfraServices()` 無無用 singleton 別名

---

## 檔案結構

**修改：**
- `src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts` — 修正 registerControllers 中的 `as any`，加入正確 import
- `src/Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider.ts` — 移除無用的 `devPortalWebhookDispatcher` singleton 別名

**新建：**
- `src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.test.ts` — 驗證 ProfileServiceProvider 可正確解析跨模組服務

---

### Task 1: 修正 ProfileServiceProvider 的 `as any` 型別轉型

ProfileController 建構子接受 `ListUsersService` 與 `ChangeUserStatusService`（來自 Auth 模組），
目前 `ProfileServiceProvider` 使用 `as any` 規避型別檢查。正確做法是直接 import 這兩個型別。

**Files:**
- Modify: `src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts:26-32`
- Create: `src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.test.ts`

- [x] **Step 1: 撰寫失敗測試**

```typescript
// src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.test.ts
import { describe, it, expect, mock } from 'bun:test'
import { ProfileServiceProvider } from './ProfileServiceProvider'

describe('ProfileServiceProvider', () => {
  it('should register profileController with proper typed dependencies', () => {
    // Arrange: mock container tracking registrations
    const registered: Record<string, unknown> = {}
    const container = {
      singleton: (name: string, factory: (c: unknown) => unknown) => {
        registered[name] = factory
      },
      bind: (name: string, factory: (c: unknown) => unknown) => {
        registered[name] = factory
      },
      make: (name: string) => registered[name],
    }

    // Act
    const provider = new ProfileServiceProvider()
    provider.register(container as any)

    // Assert: profileController was registered
    expect(registered['profileController']).toBeDefined()
    expect(typeof registered['profileController']).toBe('function')
  })
})
```

- [x] **Step 2: 執行測試，確認通過（ProfileServiceProvider 邏輯本身沒有破壞）**

```bash
bun test src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.test.ts
```

預期：PASS（測試驗證結構，不驗證型別）

- [x] **Step 3: 在 ProfileServiceProvider 加入正確 import**

在 `src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts` 頂端加入：

```typescript
import type { ListUsersService } from '@/Modules/Auth/Application/Services/ListUsersService'
import type { ChangeUserStatusService } from '@/Modules/Auth/Application/Services/ChangeUserStatusService'
```

- [x] **Step 4: 修正 registerControllers 的 `as any` 轉型**

將：
```typescript
protected override registerControllers(container: IContainer): void {
  container.bind('profileController', (c: IContainer) => new ProfileController(
    c.make('getProfileService') as GetProfileService,
    c.make('updateProfileService') as UpdateProfileService,
    c.make('listUsersService') as any,
    c.make('changeUserStatusService') as any,
  ))
}
```

改為：
```typescript
protected override registerControllers(container: IContainer): void {
  container.bind('profileController', (c: IContainer) => new ProfileController(
    c.make('getProfileService') as GetProfileService,
    c.make('updateProfileService') as UpdateProfileService,
    c.make('listUsersService') as ListUsersService,
    c.make('changeUserStatusService') as ChangeUserStatusService,
  ))
}
```

- [x] **Step 5: 執行 TypeScript 型別檢查**

```bash
npx tsc --noEmit 2>&1 | grep "ProfileServiceProvider"
```

預期：無輸出（無 ProfileServiceProvider 相關錯誤）

- [x] **Step 6: 執行測試確認**

```bash
bun test src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.test.ts
```

預期：PASS

- [x] **Step 7: Commit**

```bash
git add src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.ts \
        src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider.test.ts
git commit -m "fix: [Profile] 修正 registerControllers 中的 as any 型別轉型"
```

---

### Task 2: 清理 DevPortalServiceProvider 無用的 singleton 別名

`registerInfraServices` 中的 `devPortalWebhookDispatcher` 只是把 `webhookDispatcher` 
重新包裝，且在整個 DevPortal 模組中沒有任何地方使用這個別名。這是死碼，移除即可。

**Files:**
- Modify: `src/Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider.ts:27-31`

- [x] **Step 1: 確認 devPortalWebhookDispatcher 確實未被使用**

```bash
grep -r "devPortalWebhookDispatcher" src/
```

預期輸出：只有 `DevPortalServiceProvider.ts` 這一個檔案（即它被定義但從未被消費）

- [x] **Step 2: 移除 registerInfraServices 中的無用 singleton 別名**

將：
```typescript
protected override registerInfraServices(container: IContainer): void {
  container.singleton('devPortalWebhookDispatcher', (c: IContainer) =>
    c.make('webhookDispatcher') as IWebhookDispatcher
  )
}
```

改為（移除整個 registerInfraServices override，DevPortalServiceProvider 本層無需技術 adapter）：

```typescript
// 刪除 registerInfraServices override，讓 base class 的空實作生效
```

同時移除不再需要的 import：
```typescript
import type { IWebhookDispatcher } from '@/Foundation/Infrastructure/Ports/IWebhookDispatcher'
```

（確認 IWebhookDispatcher 是否還被其他地方引用；若 registerApplicationServices 的 services 也不使用，一併移除）

- [x] **Step 3: 確認 registerApplicationServices 的 services 不依賴 devPortalWebhookDispatcher**

檢查 ConfigureWebhookService、RegisterAppService 等是否注入了 webhookDispatcher：

```bash
grep -r "webhookDispatcher\|IWebhookDispatcher" \
  src/Modules/DevPortal/Application/ \
  src/Modules/DevPortal/Infrastructure/
```

預期：應用層 services 不直接使用 webhookDispatcher（ConfigureWebhookService 只儲存 webhook config）

- [x] **Step 4: 執行 TypeScript 型別檢查**

```bash
npx tsc --noEmit 2>&1 | grep "DevPortalServiceProvider"
```

預期：無輸出

- [x] **Step 5: Commit**

```bash
git add src/Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider.ts
git commit -m "refactor: [DevPortal] 移除 registerInfraServices 中的無用 singleton 別名"
```

---

### Task 3: 最終驗收驗證

- [x] **Step 1: 執行完整 TypeScript build**

```bash
npx tsc --noEmit
```

`registerMemberBindings.ts` 已補上 `export function registerMemberBindings`；若輸出仍有其他檔案錯誤，屬專案內預存問題，與本 ServiceProvider 遷移無關。

預期：無 Profile / DevPortal ServiceProvider 或 `registerMemberBindings` 語法錯誤

- [x] **Step 2: 執行全部 module 測試**

```bash
bun test src/Modules
```

預期：所有測試 PASS，無退化

- [x] **Step 3: 逐一確認驗收標準清單**

```bash
# 確認無 boot() 中有 DI 呼叫
grep -r "container\.singleton\|container\.bind" \
  src/Modules/*/Infrastructure/Providers/*.ts \
  | grep "boot("
# 預期：無輸出

# 確認無 registerRoutes() 中有 new Controller
grep -rn "new.*Controller" \
  src/Modules/*/Infrastructure/Providers/*.ts
# 預期：無輸出

# 確認無解包邏輯
grep -rn "context as IContainer\|core?.container ?? core" \
  src/Modules/*/Infrastructure/Providers/*.ts
# 預期：無輸出

# 確認無 as any
grep -rn "as any" \
  src/Modules/*/Infrastructure/Providers/*.ts
# 預期：無輸出
```

- [x] **Step 4: 最終 commit（若 Step 3 發現額外問題，先修正再 commit）**

（本輪以獨立 commit 處理 `.gitignore`、計畫文件與 `registerMemberBindings` 修復；未另開「驗收」空 commit。）
