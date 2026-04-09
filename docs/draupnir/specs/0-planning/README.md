# 0. 規劃與總覽

> Draupnir 項目的高層次工作計劃與全景設計

## 📄 文檔

### [V1 工作計劃設計](./draupnir-v1-workplan.md)

**概述**：Draupnir v1 的完整工作計劃，涵蓋 Phase 1-7，細分為基礎建設、認證、API Key 管理、信用與計費、合約管控、應用分發、前端開發。

**包含內容**：

| Phase | 名稱 | 工作包 | 驗收條件 |
|-------|------|--------|---------|
| 1 | Foundation 基礎建設 | 專案初始化、Bifrost Client 模組 | Health 檢查、品質關卡、覆蓋率 ≥80% |
| 2 | Identity 認證與帳戶 | Auth 補完、User 模組、Organization | 認證流程、RBAC、成員邀請 |
| 3 | Key Management API 金鑰管理 | ApiKey CRUD、Key 權限、Dashboard 聚合 | Key 建立/停用/刪除、用量統計 |
| 4 | Credit System 信用與計費 | Credit 模組、UsageSync、定價規則 | 充值/扣款、餘額阻擋、用量同步 |
| 5 | Contract & Module 合約與模組 | Contract CRUD、AppModule 註冊 | 合約指派、模組訂閱、存取控制 |
| 6 | Application Distribution 應用分發 | AppApiKey、SDK、CLI、DevPortal | Key 配發、SDK 認證、CLI 登入 |
| 7 | Frontend UI 前端開發 | React + Inertia.js 前端 | 完整 UI、圖表、用戶交互 |

**技術棧**：
- 框架：Gravito DDD
- 運行時：Bun
- 數據庫：Drizzle ORM（SQLite 開發、PostgreSQL 生產）
- 認證：JWT
- 前端：Inertia.js + React

**執行策略**：
- 嚴格瀑布式 Phase 執行（1→2→3→...→7）
- Phase 內容並行分工
- 每個 Phase 需通過 Phase Gate（質量認可）才進下一個

---

## 🔗 相關文檔

快速連結到各功能區域的詳細設計規格：

- **[1. 認證與身份](../1-authentication/)** — Phase 2 Auth、User、Organization 設計
- **[2. 用戶與組織](../2-user-organization/)** — User Profile、Organization 詳細設計
- **[3. API 金鑰管理](../3-api-keys/)** — Phase 3、6 中的 Key 管理規格
- **[4. 信用與計費](../4-credit-billing/)** — Phase 4 完整信用系統設計
- **[5. 測試與驗證](../5-testing-validation/)** — 自動化測試框架與驗證設計
- **[6. 架構與決策](../6-architecture/)** — V1 架構評審與改進方案

---

## ✅ 進度與狀態

截至 **2026-04-10**，實現狀態：

| Phase | 模組 | 狀態 |
|-------|------|------|
| 1 | Health, BifrostClient | ✅ 完成 |
| 2 | Auth, Profile, Organization | ✅ 完成 |
| 3 | ApiKey, Dashboard | ✅ 完成 |
| 4 | Credit, UsageSync | ✅ 完成 |
| 5 | Contract, AppModule | ✅ 完成 |
| 6 | AppApiKey, SdkApi, CliApi, DevPortal | 🟡 進行中 |
| 7 | Frontend | 📅 規劃中 |

---

## 📍 何時參考本文檔

- **項目新成員**：了解整個項目的全景與階段劃分
- **跨功能協調**：理解各個 Phase 之間的依賴關係
- **進度追蹤**：確認當前工作應該在哪個 Phase、涉及哪些模組
- **決策背景**：理解為什麼採用瀑布式分階段、為什麼 Phase 7 在最後

---

**上次更新**：2026-04-10  
**管理者**：carl
