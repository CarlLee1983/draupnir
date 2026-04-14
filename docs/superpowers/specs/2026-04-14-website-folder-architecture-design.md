# Website 資料夾架構設計

**日期：** 2026-04-14
**狀態：** 已確認，待實作
**範圍：** `src/Pages/` → `src/Website/` 重組

---

## 問題背景

現有 `src/Pages/` 存在多個混雜現象：

- `InertiaService.ts`、`SharedDataMiddleware.ts`、`ViteTagHelper.ts` 等 Infrastructure 性質的服務直接浮在頂層
- `routing/` 資料夾把 DI binding（Infrastructure 責任）和 HTTP 路由註冊（Presentation 責任）混在一起
- `routing/admin/adminPageKeys.ts` 等 DI 鍵定義藏在名為 `routing/` 的目錄下，語意不符
- `pageContainerKeys.ts` 孤立浮在頂層，沒有歸屬

---

## 設計目標

將 `src/Pages/` 重命名並重組為 `src/Website/`，建立兩層清晰邊界：

- **第一層（使用者情境）**：回答「使用者在做什麼」
- **第二層（web runtime）**：回答「HTTP stack 如何支撐」
- **組合根**：回答「模組如何被接進框架」

---

## 完整目錄結構

```
src/Website/
├── Admin/
│   ├── Pages/
│   │   ├── AdminDashboardPage.ts
│   │   ├── AdminUsersPage.ts
│   │   ├── AdminUserDetailPage.ts
│   │   ├── AdminOrganizationsPage.ts
│   │   ├── AdminOrganizationDetailPage.ts
│   │   ├── AdminContractsPage.ts
│   │   ├── AdminContractCreatePage.ts
│   │   ├── AdminContractDetailPage.ts
│   │   ├── AdminModulesPage.ts
│   │   ├── AdminModuleCreatePage.ts
│   │   ├── AdminApiKeysPage.ts
│   │   ├── AdminUsageSyncPage.ts
│   │   ├── AdminReportsPage.ts
│   │   └── AdminReportTemplatePage.ts
│   ├── middleware/
│   │   └── requireAdmin.ts
│   ├── routes/
│   │   └── registerAdminRoutes.ts
│   ├── bindings/
│   │   └── registerAdminBindings.ts
│   └── keys.ts
│
├── Auth/
│   ├── Pages/
│   │   ├── LoginPage.ts
│   │   ├── RegisterPage.ts
│   │   ├── ForgotPasswordPage.ts
│   │   ├── ResetPasswordPage.ts
│   │   ├── EmailVerificationPage.ts
│   │   ├── GoogleOAuthCallbackPage.ts
│   │   └── VerifyDevicePage.ts
│   ├── routes/
│   │   └── registerAuthRoutes.ts
│   ├── bindings/
│   │   └── registerAuthBindings.ts
│   └── keys.ts
│
├── Member/
│   ├── Pages/
│   │   ├── MemberDashboardPage.ts
│   │   ├── MemberApiKeysPage.ts
│   │   ├── MemberApiKeyCreatePage.ts
│   │   ├── MemberApiKeyRevokeHandler.ts
│   │   ├── MemberContractsPage.ts
│   │   ├── MemberSettingsPage.ts
│   │   ├── MemberUsagePage.ts
│   │   ├── MemberAlertsPage.ts
│   │   └── MemberCostBreakdownPage.ts
│   ├── routes/
│   │   └── registerMemberRoutes.ts
│   ├── bindings/
│   │   └── registerMemberBindings.ts
│   └── keys.ts
│
├── Http/
│   ├── Inertia/
│   │   ├── createInertiaService.ts    ← 原 inertiaFactory.ts
│   │   ├── HandleInertiaRequests.ts   ← 原 InertiaService.ts
│   │   ├── withInertiaPage.ts
│   │   └── SharedDataBuilder.ts       ← 原 SharedDataMiddleware.ts
│   ├── Routing/
│   │   ├── bindPageAction.ts
│   │   └── routePath.ts               ← 原 pathUtils.ts
│   ├── Middleware/
│   │   ├── requireAuth.ts
│   │   └── requireGuest.ts
│   ├── Assets/
│   │   └── ViteTagHelper.ts
│   └── Security/
│       └── CsrfService.ts             ← 原 webCsrfMiddleware.ts
│
└── bootstrap/
    ├── WebsiteServiceProvider.ts       ← 原 PagesServiceProvider.ts
    ├── registerWebsiteBindings.ts
    └── registerWebsiteRoutes.ts        ← 原 page-routes.ts
```

---

## 三層模型

### 第一層：使用者情境邊界

`Admin/` `Auth/` `Member/` 三個 slice，各自回答「這組功能服務哪種使用情境」。

**典型 slice 結構：**

```
<Slice>/
├── Pages/       ← presentation handlers
├── middleware/  ← slice 專屬 entry policy（若有）
├── routes/      ← HTTP 路由掛載
├── bindings/    ← DI 注入設定
└── keys.ts      ← DI 鍵定義
```

**設計原則：**

- `routes/` 與 `bindings/` 分開，避免啟動責任混雜
- `keys.ts` 與 slice 放在一起，比集中式 key registry 更有凝聚力
- `middleware/` 只放 slice 專屬 guard；通用 guard 屬於 `Http/Middleware/`
- slice 結構一致是目標，不是教條。沒有就不要放空殼目錄（Auth 無 `middleware/` 是正確的）

**Page class 邊界守則：**

> `Pages/` 裡的 class 是 **presentation handler**。
> 它接收 HTTP 請求、呼叫 Application Service、渲染 Inertia response。
> 它不持有 business logic、不直接操作 domain object。

`Pages/` 不應長出次級技術分層（如 `Services/`、`Utils/`、`Components/`）。
若有 Admin 專屬但非 page handler 的東西，先判斷它屬於 `middleware/`、`routes/`、`bindings/` 或一個明確命名的新子目錄（如 `navigation/`、`presenters/`）—— 不要回到模糊的 `helpers/`。

---

### 第二層：Web Runtime 邊界

`Http/` 容納所有 web runtime 元件，按 runtime 職責分子目錄。

**規則 1 — 進入條件：**
`Http/` 只容納 web runtime 元件。若某個檔案不是 request handling、route adaptation、middleware、安全、資產整合的一部分，就不應進 `Http/`。

**規則 2 — 命名原則：**
檔名優先描述 runtime role，不使用模糊技術詞：

| 避免 | 優先 |
|------|------|
| `helper` | — |
| `utils` | — |
| `service`（除非真的是 service） | `Middleware` / `Handler` / `Builder` / `Responder` / `Factory` / `Path` |

**子目錄職責：**

| 目錄 | 職責 |
|------|------|
| `Inertia/` | Inertia protocol 實作：singleton 工廠、請求處理、shared props 建立、page wrap |
| `Routing/` | DI-to-route 配接、URL path 工具 |
| `Middleware/` | 跨 slice 通用 HTTP middleware（requireAuth、requireGuest） |
| `Assets/` | 前端資產整合（Vite tag 輸出） |
| `Security/` | CSRF 保護 |

**重命名對照：**

| 原檔案 | 新位置 | 說明 |
|--------|--------|------|
| `inertiaFactory.ts` | `Http/Inertia/createInertiaService.ts` | 動詞開頭，明確是工廠函式 |
| `InertiaService.ts` | `Http/Inertia/HandleInertiaRequests.ts` | 說明它做什麼，而非它是什麼 |
| `SharedDataMiddleware.ts` | `Http/Inertia/SharedDataBuilder.ts` | 職責是建立共用 props |
| `pathUtils.ts` | `Http/Routing/routePath.ts` | 明確描述 URL path 工具 |
| `webCsrfMiddleware.ts` | `Http/Security/CsrfService.ts` | 歸入安全子目錄 |

---

### 第三層：Composition Root

`bootstrap/` 是模組對框架的接合點。

```
bootstrap/
├── WebsiteServiceProvider.ts      ← 框架介面 adapter
│                                     extends ModuleServiceProvider
│                                     register()/boot() 僅轉呼叫純函式
│                                     不承載任何具體 binding 或 routing 邏輯
│
├── registerWebsiteBindings.ts     ← 組合所有 DI bindings
│                                     呼叫三個 slice bindings +
│                                     Website-level Inertia runtime 元件
│
└── registerWebsiteRoutes.ts       ← 組合所有 routes
                                      呼叫三個 slice routes +
                                      static assets 路由
```

`src/wiring/` 只需知道 `WebsiteServiceProvider`，不直接碰各 slice 的 bindings/routes。
`registerWebsiteBindings` / `registerWebsiteRoutes` 是純函式，可獨立測試。

---

## 遷移對照表

| 原路徑 | 新路徑 |
|--------|--------|
| `src/Pages/Admin/AdminXxxPage.ts` | `src/Website/Admin/Pages/AdminXxxPage.ts` |
| `src/Pages/Auth/XxxPage.ts` | `src/Website/Auth/Pages/XxxPage.ts` |
| `src/Pages/Member/MemberXxxPage.ts` | `src/Website/Member/Pages/MemberXxxPage.ts` |
| `src/Pages/Admin/helpers/requireAdmin.ts` | `src/Website/Admin/middleware/requireAdmin.ts` |
| `src/Pages/Member/helpers/requireMember.ts` | `src/Website/Member/middleware/requireMember.ts` |
| `src/Pages/routing/registerAdminPageRoutes.ts` | `src/Website/Admin/routes/registerAdminRoutes.ts` |
| `src/Pages/routing/registerAuthPageRoutes.ts` | `src/Website/Auth/routes/registerAuthRoutes.ts` |
| `src/Pages/routing/registerMemberPageRoutes.ts` | `src/Website/Member/routes/registerMemberRoutes.ts` |
| `src/Pages/routing/admin/registerAdminPageBindings.ts` | `src/Website/Admin/bindings/registerAdminBindings.ts` |
| `src/Pages/routing/auth/registerAuthPageBindings.ts` | `src/Website/Auth/bindings/registerAuthBindings.ts` |
| `src/Pages/routing/member/registerMemberPageBindings.ts` | `src/Website/Member/bindings/registerMemberBindings.ts` |
| `src/Pages/routing/admin/adminPageKeys.ts` | `src/Website/Admin/keys.ts` |
| `src/Pages/routing/auth/authPageKeys.ts` | `src/Website/Auth/keys.ts` |
| `src/Pages/routing/member/memberPageKeys.ts` | `src/Website/Member/keys.ts` |
| `src/Pages/routing/inertiaFactory.ts` | `src/Website/Http/Inertia/createInertiaService.ts` |
| `src/Pages/InertiaService.ts` | `src/Website/Http/Inertia/HandleInertiaRequests.ts` |
| `src/Pages/routing/withInertiaPage.ts` | `src/Website/Http/Inertia/withInertiaPage.ts` |
| `src/Pages/SharedDataMiddleware.ts` | `src/Website/Http/Inertia/SharedDataBuilder.ts` |
| `src/Pages/routing/bindPageAction.ts` | `src/Website/Http/Routing/bindPageAction.ts` |
| `src/Pages/routing/pathUtils.ts` | `src/Website/Http/Routing/routePath.ts` |
| `src/Pages/ViteTagHelper.ts` | `src/Website/Http/Assets/ViteTagHelper.ts` |
| `src/Pages/routing/webCsrfMiddleware.ts` | `src/Website/Http/Security/CsrfService.ts` |
| `src/Pages/Infrastructure/Providers/PagesServiceProvider.ts` | `src/Website/bootstrap/WebsiteServiceProvider.ts` |
| `src/Pages/page-routes.ts` | `src/Website/bootstrap/registerWebsiteRoutes.ts` |
| `src/Pages/pageContainerKeys.ts` | 拆入各 slice `keys.ts` + `Http/Inertia/` |
| `src/Pages/routing/registerPageStaticRoutes.ts` | 內聯至 `bootstrap/registerWebsiteRoutes.ts` |
