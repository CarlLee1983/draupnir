# Draupnir 規格與設計文檔

> 按功能領域組織的設計規格，對標實現模組進度

## 🎭 User Stories

**新人 onboarding 首先讀這個**：
- [**Personas**](./personas.md) — 五類使用者 / 非人類 actor 的人物卡（Cloud Admin / Org Manager / Org Member / Bifrost Sync Job / SDK Client）
- [**User Stories 索引**](./user-stories-index.md) — 三張表檢視（依模組 / 依 Actor / 依 Epic 旅程）
- 各模組 Story 位於該分區 `user-stories.md`，例：[3-api-keys/user-stories.md](./3-api-keys/user-stories.md)、[7-developer-api/user-stories.md](./7-developer-api/user-stories.md)
- [**User Stories 覆蓋缺口 Backlog**](./user-stories-backlog.md) — Priority A/B/C 的未解決項目，排 sprint 時參考

---

## 📋 目錄結構

### [0. 規劃與總覽](./0-planning/)
**高層次工作計劃與專案藍圖**

- **[V1 工作計劃](./0-planning/draupnir-v1-workplan.md)** — Phase 1-7 全貌、各 Phase 的標準流程、交付物、驗收條件

### [1. 認證與身份](./1-authentication/)
**用戶認證、帳戶安全、角色與權限**

- **[Identity & Auth 設計](./1-authentication/identity-design.md)** — 完整認證系統（包含密碼重設、RBAC 三角色）
- **實現進度** ✅ Phase 2 完成
- **相關模組**：Auth、Profile、Organization

### [2. 用戶與組織管理](./2-user-organization/)
**用戶資料、組織管理、多租戶模型**

- **User Profile 設計** — 完整用戶資料管理（個人資訊、偏好設定）
- **Organization 設計** — 多租戶組織、成員邀請、角色指派
- **實現進度** ✅ Phase 2 完成
- **相關模組**：Profile、Organization

**注意**：詳細設計參見 [1-authentication](./1-authentication/identity-design.md#22-user-模組)

### [3. API 金鑰管理](./3-api-keys/)
**虛擬金鑰、應用層級金鑰、權限與配額**

- **ApiKey 設計** — 用戶個人 API Key 管理、與 Bifrost Virtual Key 映射
- **AppKey 設計** — 應用級別 Key、Scope 定義、生命週期管理
- **實現進度** ✅ Phase 3、6 部分完成 / ⏳ 細項待補充

**相關 Phase 內容**：
- Phase 3：Key Management — [0-planning 內的 Phase 3 章節](./0-planning/draupnir-v1-workplan.md#phase-3key-management--api-key-管理)
- Phase 6：Application Key — [0-planning 內的 Phase 6.1 章節](./0-planning/draupnir-v1-workplan.md#61-application-api-key應用層級-key)

### [4. 信用與計費系統](./4-credit-billing/)
**餘額管理、充值扣款、使用量同步、定價規則**

- **[Credit System 設計](./4-credit-billing/credit-system-design.md)** — 完整的額度體系（CreditAccount、CreditTransaction、扣款流程）
- **Usage Sync 設計** — Bifrost 用量同步、轉換為 Credit 消耗、定價引擎
- **餘額阻擋機制** — 額度不足時自動凍結 Key
- **實現進度** ✅ Phase 4 完成
- **相關模組**：Credit、UsageSync

### [5. 測試與驗證框架](./5-testing-validation/)
**自動化測試設計、表單驗證、規格驅動測試**

- **[API 功能性測試設計](./5-testing-validation/api-functional-testing.md)** — Spec-driven 自動化 API 測試框架（OpenAPI 驅動）
- **[表單驗證整合設計](./5-testing-validation/impulse-validation.md)** — @gravito/impulse FormRequest 遷移、統一驗證層
- **實現進度** ✅ 表單驗證完成 / ⏳ API 測試框架待實現

### [6. 架構與決策](./6-architecture/)
**系統架構評審、設計決策記錄、改進方案**

- **[V1 架構評審報告](./6-architecture/v1-architecture-review.md)** — 13 個模組全面評估（DDD 符合度、代碼品質、可維護性）
  - 整體評分：8.2/10，無 Critical 問題
  - 逐模組深度分析與改進建議

- **[V1.1 改進總結](./6-architecture/v1.1-improvements-summary.md)** — 架構決策補充、Domain Events 實踐、文件完善
  - Dashboard/SdkApi 無 Domain 層的正式決策
  - 測試覆蓋率驗證：81-85%（符合 80%+ 要求）
  - 新增 5 個架構圖表

### [7. 開發者 API](./7-developer-api/)
**面向外部開發者的 API 層（SDK / CLI / DevPortal）**

- **[分區 README](./7-developer-api/README.md)** — SdkApi / CliApi / DevPortal 對照說明
- **[User Stories](./7-developer-api/user-stories.md)** — 8 則 SDK Client / Developer 旅程
- **相關模組**：SdkApi、CliApi、DevPortal

### 呈現層與程式庫結構（日期規格）

**Inertia／Web 殼層目錄與框架接線** — 與領域規格分開存放，便於對照實作遷移。

- **[Website 資料夾架構設計](./2026-04-14-website-folder-architecture-design.md)** — `src/Pages/` → `src/Website/`：情境 slice、`Http/` runtime、`bootstrap/` 組合根與遷移對照表（已確認；**現行實作說明**見 [`../architecture/website-inertia-layer.md`](../architecture/website-inertia-layer.md)）
- **[Gravito i18n 設計](./2026-04-11-gravito-i18n-design.md)** — 多語與頁面 locale 解析（與 Website 呈現層相關時可一併查閱）

### 合約與組織配額（日期規格）

- **[合約額度與 API Key 配發](./2026-04-16-contract-quota-allocation-spec.md)** — 組織合約上限、未分配池、各 Key 重置週期（7d／30d）、Admin 調降（先吸收未分配再比例縮減）、Manager 依 `slack` 重配、硬擋；與 [2-user-organization](./2-user-organization/README.md)、[3-api-keys](./3-api-keys/README.md) 對齊。

---

## 🗂️ 模組對應表

| 規格區域 | 相關模組 | 狀態 | 文檔位置 |
|---------|--------|------|---------|
| 1. 認證與身份 | Auth, Profile | ✅ 完成 | [1-authentication](./1-authentication/) |
| 2. 用戶與組織 | Profile, Organization | ✅ 完成 | [2-user-organization](./2-user-organization/) |
| 3. API 金鑰 | ApiKey, AppApiKey | ✅ 部分 | [3-api-keys](./3-api-keys/) |
| 4. 信用與計費 | Credit, UsageSync | ✅ 完成 | [4-credit-billing](./4-credit-billing/) |
| 5. 測試與驗證 | Testing Infrastructure | 🟡 部分 | [5-testing-validation](./5-testing-validation/) |
| 6. 架構決策 | 系統全景 | ✅ 完成 | [6-architecture](./6-architecture/) |
| 7. 開發者 API | SdkApi, CliApi, DevPortal | ✅ 完成 | [7-developer-api](./7-developer-api/) |

---

## 📌 快速導航

### 按功能查找
- **新成員入門？** → 先讀 [personas.md](./personas.md) → [user-stories-index.md](./user-stories-index.md)
- **快速開始？** → 見 [0-planning](./0-planning/)
- **做認證相關的工作？** → 見 [1-authentication](./1-authentication/)
- **管理用戶或組織？** → 見 [2-user-organization](./2-user-organization/)
- **合約上限與 Key 配發／調降規則？** → 見 [2026-04-16-contract-quota-allocation-spec](./2026-04-16-contract-quota-allocation-spec.md)
- **實現 API Key 功能？** → 見 [3-api-keys](./3-api-keys/)
- **開發計費或額度系統？** → 見 [4-credit-billing](./4-credit-billing/)
- **寫測試或驗證？** → 見 [5-testing-validation](./5-testing-validation/)
- **接外部 SDK / CLI / 建 DevPortal？** → 見 [7-developer-api](./7-developer-api/)
- **評估架構或做決策？** → 見 [6-architecture](./6-architecture/)

### 按文檔類型查找
- **實現計劃** → [0-planning/V1 工作計劃](./0-planning/draupnir-v1-workplan.md)
- **設計規格** → 各功能區域（1-6）
- **架構評審** → [6-architecture](./6-architecture/)

---

## ✅ 對標進度

| 階段 | 狀態 | 最後更新 |
|-----|------|---------|
| **Phase 1：基礎建設** | ✅ 完成 | 2026-04-08 |
| **Phase 2：認證與帳戶** | ✅ 完成 | 2026-04-08 |
| **Phase 3：API Key 管理** | ✅ 部分 | 2026-04-08 |
| **Phase 4：信用與計費** | ✅ 完成 | 2026-04-08 |
| **Phase 5：合約與模組** | ✅ 完成 | 2026-04-09 |
| **Phase 6：應用分發** | 🟡 進行中 | 2026-04-09 |
| **Phase 7：前端 UI** | 📅 規劃中 | — |

---

**說明**：本結構於 2026-04-10 重組，按功能領域取代執行章節，便於按需查找與導航。
