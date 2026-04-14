# 架構文件撰寫標準

本文件定義 Draupnir 專案中 **架構相關文件** 的撰寫原則，並對齊國際與業界常用標準，供新文件與改版時遵循。自 v1.4 起，專案導入 GSD (Get Stuff Done) 自動化與半自動化文件流程。

---

## 1. 對齊的標準與其角色

| 標準／框架 | 正式名稱／來源 | 在本專案中的用途 |
|------------|----------------|------------------|
| **ISO/IEC/IEEE 42010** | *Systems and software engineering — Architecture description* | 定義「誰要看、關心什麼、用哪種觀點呈現、多份視圖如何一致」的**元架構**。 |
| **arc42** | 架構說明模板（Gernot Starke 等） | **章節化檢查清單**：確保常見主題（情境、限制、決策、品質）有落點，避免遺漏。 |
| **C4 model** | 軟體架構圖層級模型（Simon Brown） | **圖示抽象層級**：由外而內（情境→容器→元件→程式碼），控制每一張圖的粒度。 |
| **4+1 View Model** | Philippe Kruchten | **多視角補充**：邏輯、程序、開發、實體部署，並以情境／用例貫穿驗證。 |
| **ADR** | Architecture Decision Records | **決策與脈絡**：單則決策可追溯，記錄於 `.planning/PROJECT.md` 與 `docs/draupnir/DESIGN_DECISIONS.md`。 |

上述標準**彼此相容**：42010 說明「如何組織架構描述」；arc42 與 C4 提供具體章節與圖層慣例；ADR 承載「為何如此」。

---

## 2. ISO/IEC/IEEE 42010 核心觀念（必備思維）

撰寫或審閱架構文件時，應能對應以下要素：

1. **利害關係人（Stakeholders）**  
   明確預設讀者：例如新進開發者、維運、資安審核、產品經理。

2. **關注點（Concerns）**  
   每份視圖應服務具體關注點：例如模組邊界、資料一致性、驗證流程、部署拓撲。

3. **觀點（Viewpoint）**  
   定義「如何看」：符號、抽象層級、允許／禁止的資訊（例如 C4 層級即是一種觀點）。

4. **視圖（View）**  
   觀點的具體產物：一張圖、一節文字、一張表。

5. **一致性（Consistency）**  
   多份視圖之間不得互相矛盾。**單一事實來源 (SSoT)**：
   - **Data View**: 以 `src/Foundation/Infrastructure/Database/schema.ts` (Drizzle) 為準。
   - **Structure View**: 以 `.planning/codebase/STRUCTURE.md` 為準。

---

## 3. C4 模型：圖的層級（建議指南）

| 層級 | 英文 | 應包含的內容 | 本專案常見落點 |
|------|------|----------------|----------------|
| 1 | System Context | 本系統與外部使用者／系統（如 Bifrost）的關係 | `ARCHITECTURE_SUMMARY.md` 開頭 |
| 2 | Containers | 可部署單元（SdkApi, CliApi, WebApp, Redis, DB）的職責 | 同上、`.planning/codebase/ARCHITECTURE.md` |
| 3 | Components | 容器內主要結構（Modules/Auth, Modules/Alerts 等） | `.planning/codebase/STRUCTURE.md` |
| 4 | Code | 類別、介面、重要模式 | `knowledge/*.md`、原始碼 (JSDoc) |

**原則**：單一圖表維持**一個 C4 層級**。

---

## 4. arc42 章節與本專案文件對照（文件導覽）

arc42 提供完整架構說明書的章節結構。本專案將內容分散在多個檔案中。

| arc42 章節（概要） | 建議對應（本倉庫） |
|--------------------|---------------------|
| 簡介與目標 | `ARCHITECTURE_SUMMARY.md`、`.planning/PROJECT.md` |
| 限制條件 | `docs/draupnir/DESIGN_DECISIONS.md`、`.planning/codebase/STACK.md` |
| 情境與範圍 | `ARCHITECTURE_SUMMARY.md`、`.planning/codebase/INTEGRATIONS.md` |
| 解決方案策略 | `docs/draupnir/DESIGN_DECISIONS.md` |
| 建置區塊／模組視圖 | `.planning/codebase/STRUCTURE.md`、`src/Modules/` |
| 執行時期視圖 | `docs/draupnir/` 下的流程圖、Specs |
| 部署視圖 | `DEVELOPMENT.md`、CI/CD 相關 Specs |
| 跨領域概念（領域模型） | `knowledge/ddd-*.md`、`src/Foundation/Infrastructure/Database/schema.ts` |
| 架構決策 (ADR) | `.planning/PROJECT.md` (Key Decisions 表) |
| 品質屬性／風險 | `.planning/codebase/CONCERNS.md`、`reviews/` |

---

## 5. 文件類型分工

| 類型 | 目的 | 應寫入的內容 |
|------|------|----------------|
| **架構概覽** (`ARCHITECTURE_SUMMARY.md`) | 快速建立心智模型 | 邊界、主要聚合／服務名稱、模組職責 |
| **Codebase 分析** (`.planning/codebase/*.md`) | 由 GSD 生成的現狀分析 | 當前技術棧、目錄結構、依賴關係、測試覆蓋率 |
| **設計決策** (`DESIGN_DECISIONS.md`) | 記錄「為何如此」的脈絡 | 選項評估、權衡 (Trade-offs)、後果 |
| **工程知識** (`knowledge/*.md`) | 可重用的模式與規則 | DDD 戰術規範、分層規則、前端開發慣例 |
| **規格** (`specs/`) | 具體功能的行為約定 | API 定義、業務規則驗證、UAT 標準 |

---

## 6. 品質檢查清單（發 PR 或重大改版前）

- [ ] 是否標示了**目標讀者**與**主要關注點**？
- [ ] 圖表是否落在**單一抽象層級**（C4）？
- [ ] 與其他視圖（如 Drizzle Schema）是否**無矛盾**？
- [ ] 關鍵決策是否已記錄於 `.planning/PROJECT.md` 或 `DESIGN_DECISIONS.md`？
- [ ] 結構性敘述是否與 **實際程式路徑**（Modules/Foundations）對齊？

---

## 7. 維護原則

- **語言**：本文件以 **繁體中文（台灣）** 撰寫；標準名稱保留英文。
- **時效性**：架構文檔應在每個 Milestone 完成後，對齊 `.planning/STATE.md` 的變更進行同步更新。
