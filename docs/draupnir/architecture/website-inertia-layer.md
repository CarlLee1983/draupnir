# Website（Inertia 網頁層）

**實作目錄**：[`src/Website/`](../../../src/Website/)

`src/Website` 是 Draupnir 的 **瀏覽器端 UI**：以 [Inertia.js](https://inertiajs.com/) 搭配 React（`resources/js`）與伺服端頁面類別，掛在 Gravito HTTP 核心上。此層負責 **路由註冊、DI 綁定、HTTP middleware 鏈、Inertia 渲染與靜態資產**，不承載領域規則；業務流程委派給 `src/Modules/*` 的 Application 服務。

專案整體約束與指令見 [專案文件索引](../README.md)。目錄重組與檔案對照見 [Website 資料夾架構設計](../specs/2026-04-14-website-folder-architecture-design.md)。

---

## 目錄結構

| 路徑 | 用途 |
|------|------|
| `bootstrap/` | 應用啟動：`WebsiteServiceProvider`、`registerWebsiteBindings`、`registerWebsiteRoutes`。 |
| `Http/` | 跨區塊的 HTTP 基礎設施：`HttpKernel`（middleware 群組）、Inertia 工廠與 handler、CSRF、Vite 標籤、與 Gravito 的型別轉接。 |
| `Auth/` | 訪客／登入相關頁面（註冊、登入、重設密碼、裝置驗證等）。 |
| `Admin/` | 管理員後台頁面與 `requireAdmin`。 |
| `Manager/` | 組織管理者區塊與 `requireManager`。 |
| `Member/` | 一般會員區塊與 `requireMember`。 |
| `__tests__/` | Website 層單元／整合測試。 |

每個 **區塊（slice）** 慣例上包含：

- `routes/register*Routes.ts` — 宣告路由，handler 從 container 依 key 取出頁面實例。
- `bindings/register*Bindings.ts` — 將各 `Pages/*Page` 註冊為 container singleton。
- `keys.ts` — 該區塊頁面的 DI key（例如 `page:auth:login`），供 routes 與 bindings 共用。
- `middleware/require*.ts` — 區塊層授權（回傳 `ok` / 導向或錯誤 Response）。
- `Pages/*Page.ts` — 單一 Inertia 頁面的伺服端控制器（呼叫 Module 服務、回傳 Inertia 回應）。

---

## 請求生命週期

1. **Global middleware**（`Http/HttpKernel.ts` → `HttpKernel.global()`）  
   每個請求：body 大小限制、全域錯誤包裝、RequestId、RequestLogger、Security Headers、可選 CORS。

2. **區塊 middleware 群組**（`HttpKernel.groups`）  
   透過 `Http/Inertia/withInertiaPage.ts` 的 wrapper 組成 onion chain：
   - 共用基底 `webBase()`：`attachJwt` → **`createTokenRefreshMiddleware`（靜默以 `refresh_token` 換發 `auth_token` 並補 `ctx.auth`）** → `attachWebCsrf` → `injectSharedData`（`SharedPropsBuilder`）。  
     機制細節、決策樹與 API refresh 的差異見 **[HTTP Middleware Stack](./http-middleware-stack.md)**（章節「網頁 access token 靜默換發」）。
   - `web`：公開頁。
   - `admin` / `manager` / `member`：在基底之上各加上 `requireAdmin` / `requireManager` / `requireMember`。
   - 最後層：`pendingCookiesMiddleware`（把掛在 context 的待寫入 cookie 套進 Response）。

3. **頁面 handler**  
   從 DI 解析對應 `*Page` 類別，執行 GET/POST 等邏輯並透過 `InertiaService` 渲染。

**Gravito 邊界**：專案內 middleware 一律使用 `Shared/Presentation/IModuleRouter` 的 `Middleware` 型別；與 Gravito 的轉接集中在 `Http/GravitoKernelAdapter.ts`（`toGravitoMiddleware`、`registerGlobalMiddlewares`）。

---

## 啟動與註冊順序

`WebsiteServiceProvider`（`bootstrap/WebsiteServiceProvider.ts`）：

1. `registerInfraServices` → `registerWebsiteBindings(container)`  
   註冊 `inertiaService` singleton 與各區塊頁面綁定。  
   **前提**：bootstrap 必須在解析任何 Inertia 頁面前 `await warmInertiaService()`（見 `createInertiaRequestHandler.ts`），否則會拋出「InertiaService not warmed」。

2. `registerRoutes` → `registerWebsiteRoutes(router, container)`  
   掛載順序為：**Auth → Admin → Manager → Member**，最後在生產或 `SERVE_VITE_BUILD=true` 時註冊 `/build/*` 靜態檔（`public` 底下，含路徑正規化以防目錄穿越）。

3. `boot` → `configureTokenRefresh`（網頁 session／refresh 行為與 `RefreshTokenService` 整合）。

---

## Inertia 與前端資產

- **開發**：預設使用 Vite dev server（`VITE_DEV_SERVER` 等環境變數，見 `createInertiaService`）。
- **正式／本地模擬正式**：`NODE_ENV === 'production'` 或 `SERVE_VITE_BUILD=true` 時讀取 `public/build` 的 manifest，並可由 `registerStaticAssets` 提供 `/build/*`。

HTML 壳模板：`resources/views/app.html`（佔位符 `viteTags`、`page`）。

---

## 新增一個區塊內頁面（檢查清單）

1. 在該區塊 `Pages/` 新增 `*Page.ts`，建構子注入 `InertiaService` 與需要的 Application 服務。
2. 在該區塊 `keys.ts` 新增穩定的 `page:...` key。
3. 在 `bindings/register*Bindings.ts` 以 `container.singleton(key, (c) => new ...)` 註冊。
4. 在 `routes/register*Routes.ts` 使用適當的 `with*InertiaPageHandler`，並以 `container.make(KEY)` 取得頁面實例綁定路由。
5. 若需新 middleware 行為：優先加在 `HttpKernel` 的 `webBase` 或對應 `groups.*`；全站層級則加在 `global()`。

頁面與路由註冊檔的 **JSDoc** 見 [`knowledge/jsdoc-standards.md`](../knowledge/jsdoc-standards.md)。

---

## 測試

測試放在 `src/Website/__tests__/`（依區塊或議題分子目錄）。修改 `HttpKernel` 或路由註冊時，建議同步檢查 `registerWebsiteRoutes` 測試與相關 page／middleware 測試。

---

## 與 `src/Modules` 的關係

| Website | Modules |
|---------|---------|
| 決定 URL、誰可進入（middleware）、Inertia props 與表單 POST 導流 | 提供用例服務、驗證、持久化與領域規則 |

頁面類別應**薄**：解析輸入、呼叫 Application service、把結果或錯誤對應到 Inertia／redirect，避免在 `Website` 內複製業務規則。

---

## 相關文件

| 文件 | 說明 |
|------|------|
| [HTTP Middleware Stack](./http-middleware-stack.md) | Global／Inertia 鏈、`TokenRefreshMiddleware` 靜默換發、範例請求 |
| [Website 資料夾架構設計](../specs/2026-04-14-website-folder-architecture-design.md) | `src/Pages` → `src/Website` 遷移對照與設計背景 |
| [開發指南](../DEVELOPMENT.md) | 指令、環境變數、測試 |
| [JSDoc／註解規範](../knowledge/jsdoc-standards.md) | 頁面類別與路由檔註解 |
| [`knowledge/pages-inertia-architecture.md`](../knowledge/pages-inertia-architecture.md) | 舊連結保留用短索引 |

**最後更新**：2026-04-17（補 middleware 文件與靜默 refresh 連結）
