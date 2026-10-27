# Gravito System Standard (GSS)

這是基於 **Gravito Framework** 的高度模組化應用開發標準。這套標準從 **Draupnir** 專案中提煉而成，旨在提供一套具備強大擴展性、可測試性與維護性的後端架構。

## 核心設計原則
- **模組化 (Modularity)**: 每個功能都是一個獨立的模組，擁有完整的層級結構。
- **領域驅動 (DDD)**: 核心業務邏輯與技術細節分離。
- **介面優先 (Interface First)**: 基礎設施透過 Ports 定義，方便切換實作（例如：切換不同的資料庫或郵件服務）。
- **可測試性 (Testability)**: 透過依賴注入 (DI) 確保每個組件都能輕鬆進行單元測試與整合測試。

## 目錄結構導覽
- `ARCHITECTURE.md`: 深度解析四層架構 (Domain, Application, Infrastructure, Presentation)。
- `FRAMEWORK_RUNTIME.md`: 核心框架運作機制、生命週期與 IoC 容器說明。
- `MODULE_BLUEPRINT/`: 新模組的標準樣板。
- `CONVENTIONS/`: 代碼風格、命名規範與型別標準。
- `INFRASTRUCTURE_TEMPLATES.md`: 資料庫 (Atlas)、快取 (Plasma)、驗證 (Sentinel) 的標準配置規範。

## 如何使用此庫
1. 參考 `ARCHITECTURE.md` 理解設計理念。
2. 複製 `MODULE_BLUEPRINT/` 到你的專案 `src/Modules/` 下並重命名。
3. 按照 `CONVENTIONS/` 撰寫代碼。
