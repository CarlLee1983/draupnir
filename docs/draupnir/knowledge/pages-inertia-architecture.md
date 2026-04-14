# Inertia 頁面層（`src/Pages`）架構說明

> **目標目錄結構（待實作）：** 已確認之 `src/Pages/` → `src/Website/` 重組設計見 **[Website 資料夾架構設計](../specs/2026-04-14-website-folder-architecture-design.md)**。下文描述 **現行** `src/Pages/` 配置；遷移完成後應以該規格為準更新本頁路徑與檔名。

本文件說明 **伺服端 Inertia + React** 的註冊方式、與 DDD 模組的邊界，以及應配合的 JSDoc 要求。程式內註解規範仍以 [`jsdoc-standards.md`](./jsdoc-standards.md) 為準（`src/` 內使用英文 JSDoc）。

## 角色定位

- **`src/Pages`** 等同 **Presentation 的一種**：負責 HTTP 入站、組裝 Inertia payload、呼叫 **Application 層** 的 `*Service`，不承載網域不變式。
- **業務模組**（`src/Modules/*`）繼續提供 `*Service`、Repository；頁面類別僅透過建構子注入這些服務。

## 啟動與路由順序

1. `bootstrap` 依序註冊各模組的 `*ServiceProvider`，最後註冊 `PagesServiceProvider`。
2. `PagesServiceProvider.register` 會：
   - 註冊 `InertiaService`（`PAGE_CONTAINER_KEYS.inertiaService`）；
   - 呼叫 `registerAdminPageBindings` / `registerMemberPageBindings`，為每個頁面類別建立 **container singleton**（類似 Laravel 的 controller binding）。
3. `registerRoutes` 尾端呼叫 `registerPageRoutes`：
   - `registerAdminPageRoutes` / `registerMemberPageRoutes` 以 **宣告表**（path、method、DI key、action 名稱）掛載路由；
   - `bindPageAction` 在請求時 `container.make(pageKey)` 並呼叫對應方法；
   - `withInertiaPageHandler` 統一套用 JWT 附加與 `injectSharedData`（共用 Inertia props）。

因此：**綁定早於路由註冊**，解析頁面實例時依賴已就緒。

## 主要檔案導覽

| 區域 | 檔案 | 說明 |
|------|------|------|
| 組裝入口 | `page-routes.ts` | 註冊 admin/member 與靜態 `/build/*` |
| DI | `Infrastructure/Providers/PagesServiceProvider.ts` | Inertia + 全頁綁定 |
| 鍵名 | `pageContainerKeys.ts`、`routing/admin/adminPageKeys.ts`、`routing/member/memberPageKeys.ts` | Container 字串 key，需與路由表一致 |
| 綁定 | `routing/admin/registerAdminPageBindings.ts`、`routing/member/registerMemberPageBindings.ts` | 各頁 constructor 注入 |
| 路由表 | `routing/registerAdminPageRoutes.ts`、`routing/registerMemberPageRoutes.ts` | 僅宣告，不 new 頁面 |
| 中介層 | `routing/withInertiaPage.ts`、`SharedDataMiddleware.ts` | JWT + `inertia:shared` |
| 核心 | `InertiaService.ts`、`routing/inertiaFactory.ts`、`ViteTagHelper.ts` | 渲染、資產標籤、版本協商 |
| 授權輔助 | `Admin/helpers/requireAdmin.ts` | 管理區角色檢查（頁面內呼叫） |

## 新增一頁時的檢查清單

1. 新增 **Page 類別**（`Admin/` 或 `Member/`），並為類別與每個公開 handler 撰寫 **英文 JSDoc**（見 `jsdoc-standards.md` §3 Pages 列）。
2. 在 **`adminPageKeys.ts` 或 `memberPageKeys.ts`** 新增唯一 binding key。
3. 在 **`registerAdminPageBindings` 或 `registerMemberPageBindings`** 註冊 `container.singleton(key, …)`。
4. 在 **`registerAdminPageRoutes` 或 `registerMemberPageRoutes`** 新增一筆路由（注意 **靜態 path 需排在 `/:id` 之前**）。
5. 若需新服務，應先在對應模組的 ServiceProvider 註冊，再在 binding 內 `c.make('…')`。

## 與 JSDoc 規範的對應

- 頁面 handler 屬 **Presentation**：需 **類別說明** + 各 **`handle` / `store` / `postAction` / `update`** 的 `@param`、`@returns`（行為非顯而易見時補充）。
- 路由註冊檔需 **檔案層級** 說明「宣告式路由 + DI key」設計，避免後續誤改成在路由檔內直接 `new` 頁面類別。

## 相關連結

- [Website 資料夾架構設計](../specs/2026-04-14-website-folder-architecture-design.md)（`src/Website/` 目標結構與遷移表）
- [JSDoc／註解規範](./jsdoc-standards.md)
- [開發指南](../DEVELOPMENT.md)（命令與環境變數）
- [架構概覽](../ARCHITECTURE_SUMMARY.md)
