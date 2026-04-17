# Draupnir 專案文件

本資料夾集中存放 **Draupnir 產品與工程規劃**（規格、計畫、審查、路線圖）。

**索引更新**：2026-04-17

## 快速參考（核心文件）

| 內容 | 位置 |
|------|------|
| **架構概覽與模組指南** | [`ARCHITECTURE_SUMMARY.md`](./ARCHITECTURE_SUMMARY.md) |
| **Website（Inertia，`src/Website`）** | [`architecture/website-inertia-layer.md`](./architecture/website-inertia-layer.md) |
| **設計決策彙總** | [`DESIGN_DECISIONS.md`](./DESIGN_DECISIONS.md) |
| **開發指南**（目錄、環境、新增模組） | [`DEVELOPMENT.md`](./DEVELOPMENT.md) |
| **指令一覽** | [`COMMANDS.md`](./COMMANDS.md) |
| **驗收與查核清單** | [`VERIFICATION_CHECKLIST.md`](./VERIFICATION_CHECKLIST.md) |
| **DDD 架構圖表** | [`architecture/`](./architecture/) |
| **設計規格（依領域分類）** | [`specs/README.md`](./specs/README.md) |
| **工程知識與模式** | [`knowledge/README.md`](./knowledge/README.md) |

## 架構文件（`architecture/`）

| 檔案 | 內容 |
|------|------|
| [`architecture/README.md`](./architecture/README.md) | 架構目錄導覽 |
| [`architecture/ddd-layered-architecture.md`](./architecture/ddd-layered-architecture.md) | DDD 四層架構圖與模組分層（與 `src/Modules/` 對齊） |
| [`architecture/module-dependency-map.md`](./architecture/module-dependency-map.md) | 模組依賴圖、耦合與協調環說明 |
| [`architecture/entity-relationship-overview.md`](./architecture/entity-relationship-overview.md) | ER／schema 映射概覽 |
| [`architecture/auth-flow-diagrams.md`](./architecture/auth-flow-diagrams.md) | 認證流程（JWT、API Key、OAuth、SDK 閘道） |
| [`architecture/http-middleware-stack.md`](./architecture/http-middleware-stack.md) | HTTP middleware 三層、Inertia 鏈、**網頁靜默 token refresh** |
| [`architecture/website-inertia-layer.md`](./architecture/website-inertia-layer.md) | Website／Inertia 層（`src/Website`：路由、middleware、DI、Vite） |

## 路線圖

| 檔案 | 說明 |
|------|------|
| [`ROADMAP.md`](./ROADMAP.md) | v1 階段目標與能力清單（高層次） |

## 設計規格（`specs/`）

規格已依 **功能領域** 分目錄存放；完整目錄、模組對照與進度見 **[`specs/README.md`](./specs/README.md)**。

| 區域 | 代表文件 |
|------|----------|
| 規劃總覽 | [`specs/0-planning/draupnir-v1-workplan.md`](./specs/0-planning/draupnir-v1-workplan.md) |
| 認證與身分 | [`specs/1-authentication/identity-design.md`](./specs/1-authentication/identity-design.md) |
| 使用者與組織 | [`specs/2-user-organization/README.md`](./specs/2-user-organization/README.md) |
| API 金鑰 | [`specs/3-api-keys/README.md`](./specs/3-api-keys/README.md) |
| 信用與計費 | [`specs/4-credit-billing/credit-system-design.md`](./specs/4-credit-billing/credit-system-design.md) |
| 測試與驗證 | [`api-functional-testing.md`](./specs/5-testing-validation/api-functional-testing.md)、[`impulse-validation.md`](./specs/5-testing-validation/impulse-validation.md) |
| 架構評審 | [`v1-architecture-review.md`](./specs/6-architecture/v1-architecture-review.md)、[`v1.1-improvements-summary.md`](./specs/6-architecture/v1.1-improvements-summary.md) |
| i18n（Gravito） | [`specs/2026-04-11-gravito-i18n-design.md`](./specs/2026-04-11-gravito-i18n-design.md) |
| Website 目錄（`src/Pages` → `src/Website`） | 實作說明 [`architecture/website-inertia-layer.md`](./architecture/website-inertia-layer.md) · 遷移對照 [`specs/2026-04-14-website-folder-architecture-design.md`](./specs/2026-04-14-website-folder-architecture-design.md) |
| 合約額度與 API Key 配發 | [`specs/2026-04-16-contract-quota-allocation-spec.md`](./specs/2026-04-16-contract-quota-allocation-spec.md) |

## 關於實作計畫

已完成或過期的 **實作計畫**（`plans/`）已自本庫移除，避免與現行規格重疊。  
持久結論請以 [`ARCHITECTURE_SUMMARY.md`](./ARCHITECTURE_SUMMARY.md)、[`DESIGN_DECISIONS.md`](./DESIGN_DECISIONS.md) 與 [`specs/README.md`](./specs/README.md) 為主。

## 專案知識（`knowledge/`）

可長期引用的規範與戰術說明；**完整列表**見 [`knowledge/README.md`](./knowledge/README.md)。

| 檔案 | 主題 |
|------|------|
| [`knowledge/module-boundaries.md`](./knowledge/module-boundaries.md) | Bounded context 與 `src/Modules` 對照 |
| [`knowledge/context-dependency-map.md`](./knowledge/context-dependency-map.md) | 模組依賴矩陣（政策向） |
| [`knowledge/coding-conventions.md`](./knowledge/coding-conventions.md) | 命名、Biome、TypeScript strict、錯誤處理、Function Design |
| [`knowledge/tech-stack.md`](./knowledge/tech-stack.md) | 技術棧版本、設定與環境變數 |
| [`knowledge/jsdoc-standards.md`](./knowledge/jsdoc-standards.md) | JSDoc／註解規範 |
| [`architecture/website-inertia-layer.md`](./architecture/website-inertia-layer.md) | Website（`src/Website`）Inertia 架構與擴充檢查；舊連結 [`knowledge/pages-inertia-architecture.md`](./knowledge/pages-inertia-architecture.md) 仍指向此主題 |

## 審查紀錄（`reviews/`）

| 檔案 | 說明 |
|------|------|
| [`reviews/2026-04-09-adversarial-review-fixes.md`](./reviews/2026-04-09-adversarial-review-fixes.md) | 對抗審查後之修正紀錄 |
| [`reviews/2026-04-09-v1-verification-checklist.md`](./reviews/2026-04-09-v1-verification-checklist.md) | V1 驗收清單（歷史快照；現行細項見 [`VERIFICATION_CHECKLIST.md`](./VERIFICATION_CHECKLIST.md)） |

## 深度程式庫對照（選讀）

本機或內部盤點用的結構化摘要（與 `docs/draupnir` 互補）：[`.planning/codebase/`](../../.planning/codebase/)（例如 `STRUCTURE.md`、`STACK.md`、`TESTING.md`）。
