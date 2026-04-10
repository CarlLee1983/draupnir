# Draupnir 專案文件

本資料夾集中存放 **Draupnir 產品與工程規劃**（規格、計畫、審查、路線圖）。

## ⚡ 快速參考（核心文件）

| 內容 | 位置 |
|------|------|
| **架構概覽與模組指南** | [`ARCHITECTURE_SUMMARY.md`](./ARCHITECTURE_SUMMARY.md) ⭐ |
| **設計決策彙總** | [`DESIGN_DECISIONS.md`](./DESIGN_DECISIONS.md) ⭐ |
| **開發指南**（命令、環境變數、模組新增） | [`DEVELOPMENT.md`](./DEVELOPMENT.md) |
| **Commands 完整列表** | [`COMMANDS.md`](./COMMANDS.md) |
| **DDD 架構圖表** | [`architecture/`](./architecture/) |
| **工程知識與模式** | [`knowledge/`](./knowledge/) |

## 架構文件（`architecture/`）

**新增！** V1.1 完整架構圖表與設計決策說明

| 檔案 | 內容 |
|------|------|
| [`architecture/README.md`](./architecture/README.md) | 🏛️ 架構導航索引 |
| [`architecture/ddd-layered-architecture.md`](./architecture/ddd-layered-architecture.md) | DDD 四層架構圖 + 13 模組評分 |
| [`architecture/module-dependency-map.md`](./architecture/module-dependency-map.md) | 模組依賴圖 + 耦合度分析 |
| [`architecture/entity-relationship-overview.md`](./architecture/entity-relationship-overview.md) | ER 圖 + 資料庫映射 |
| [`architecture/auth-flow-diagrams.md`](./architecture/auth-flow-diagrams.md) | 認證流程圖 (JWT、API Key、OAuth) |

## 路線圖

| 檔案 | 說明 |
|------|------|
| [`ROADMAP.md`](./ROADMAP.md) | v1 階段目標與能力清單（高層次） |

## 設計規格（`specs/`）

### 功能設計規格

| 檔案 | 主題 |
|------|------|
| [`2026-04-08-draupnir-v1-workplan-design.md`](./specs/2026-04-08-draupnir-v1-workplan-design.md) | v1 整體工作計畫設計 |
| [`2026-04-08-phase2-identity-design.md`](./specs/2026-04-08-phase2-identity-design.md) | Phase 2 身分／認證設計 |
| [`2026-04-08-p4-credit-system-design.md`](./specs/2026-04-08-p4-credit-system-design.md) | Credit 系統設計 |
| [`2026-04-09-api-functional-testing-design.md`](./specs/2026-04-09-api-functional-testing-design.md) | API 功能性測試架構設計 |

### 架構評審與驗證

| 檔案 | 主題 |
|------|------|
| [`2026-04-09-v1-architecture-review.md`](./specs/2026-04-09-v1-architecture-review.md) | V1 架構評審報告（Codex 對抗審查） |
| [`2026-04-09-impulse-validation-design.md`](./specs/2026-04-09-impulse-validation-design.md) | Impulse 驗證系統設計 |
| [`2026-04-09-v1.1-improvements-summary.md`](./specs/2026-04-09-v1.1-improvements-summary.md) | V1.1 改進摘要 |

## ℹ️ 關於實作計畫

實作計畫文檔（`plans/`）在完成實作後已歸檔刪除，以保持文件庫精簡。  
**核心設計內容** 已彙整到 [`ARCHITECTURE_SUMMARY.md`](./ARCHITECTURE_SUMMARY.md) 和 [`DESIGN_DECISIONS.md`](./DESIGN_DECISIONS.md)。

## 專案知識（`knowledge/`）

長期可重複引用的工程知識，不放在 `specs/` 以免混淆一次性規格。

| 檔案 | 主題 |
|------|------|
| [`README.md`](./knowledge/README.md) | 知識索引 |
| [`knowledge/coding-conventions.md`](./knowledge/coding-conventions.md) | 命名慣例、程式碼風格、Biome、TypeScript strict、Error 處理、Function Design（normative） |
| [`knowledge/tech-stack.md`](./knowledge/tech-stack.md) | 完整技術棧版本、配置、環境變數、build 輸出、平台要求 |
| [`knowledge/jsdoc-standards.md`](./knowledge/jsdoc-standards.md) | 原始碼 JSDoc／註解規範（normative） |
| [`knowledge/pages-inertia-architecture.md`](./knowledge/pages-inertia-architecture.md) | Inertia 頁面層（`src/Pages`）架構與擴充檢查清單 |

## 審查紀錄（`reviews/`）

| 檔案 | 說明 |
|------|------|
| [`2026-04-09-adversarial-review-fixes.md`](./reviews/2026-04-09-adversarial-review-fixes.md) | Codex 對抗審查後之修正紀錄 |
| [`2026-04-09-v1-verification-checklist.md`](./reviews/2026-04-09-v1-verification-checklist.md) | V1 驗收清單（歷史版本，詳細版見 VERIFICATION_CHECKLIST.md） |
