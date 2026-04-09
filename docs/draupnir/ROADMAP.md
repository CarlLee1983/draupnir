# Draupnir v1 ROADMAP

> Draupnir — AI 服務管理平台，建構於 Bifrost AI Gateway 之上
> 框架：Gravito DDD | 運行時：Bun | 資料庫：SQLite（開發）/ PostgreSQL（生產）

## 專案定位

Draupnir 是 Bifrost 的上層管理平台，負責：
- **認證與帳戶管理**：使用者註冊、登入、API Key 管理
- **用量追蹤與 Credit 系統**：追蹤 LLM 使用量、管理餘額
- **合約與模組管理**：管理者定義合約，控制帳號可用的 AI 應用模組
- **應用分發**：自研 AI 工具（如 CLI）透過 Draupnir 認證後使用

Bifrost 處理 LLM 請求路由，Draupnir 處理「誰能用、用多少、付多少」。

---

## Phase 1：Foundation — 基礎建設

**目標**：專案初始化、核心基礎模組建立

### 1.1 專案初始化
- [ ] 使用 gravito-ddd-starter 建立專案骨架
- [ ] 設定 Bun 開發環境與 TypeScript 配置
- [ ] 設定 .env 與環境變數管理（Bifrost API URL、JWT Secret 等）
- [ ] 設定 CI/CD Pipeline 基礎（lint、test、build）
- [ ] 建立 Git 倉庫與分支策略

### 1.2 Bifrost Client 模組
- [ ] 建立 `Bifrost` Foundation Service — 封裝 Bifrost API 呼叫
- [ ] 實作 API 認證（Bifrost Master Key）
- [ ] 封裝核心 API：Virtual Key CRUD、用量查詢、模型列表
- [ ] 錯誤處理與重試機制
- [ ] 單元測試

---

## Phase 2：Identity — 認證與帳戶

**目標**：完整的使用者身份管理系統

### 2.1 Auth 模組
- [ ] 使用者註冊（email + password）
- [ ] 登入 / 登出（JWT Token）
- [ ] Token 刷新機制
- [ ] 密碼重設流程
- [ ] RBAC 角色系統：`admin`、`manager`、`member`

### 2.2 User 模組
- [ ] 使用者 Profile CRUD
- [ ] 帳戶啟用 / 停用
- [ ] 使用者列表（管理員）
- [ ] 帳戶設定（顯示名稱、通知偏好）

### 2.3 Organization 模組（多租戶）
- [ ] 組織建立與管理
- [ ] 組織成員邀請 / 移除
- [ ] 組織層級角色指派
- [ ] 組織切換機制

---

## Phase 3：Key Management — API Key 管理

**目標**：使用者可建立、管理自己的 API Key，與 Bifrost Virtual Key 串接

### 3.1 ApiKey 模組
- [ ] API Key 建立（映射至 Bifrost Virtual Key）
- [ ] API Key 列表、停用、刪除
- [ ] Key 名稱 / 標籤管理
- [ ] Key 權限設定（可用模型、速率限制）
- [ ] Key 使用統計（從 Bifrost Logs API 拉取）

### 3.2 Dashboard 資料聚合
- [ ] 使用者 Dashboard API：Key 總覽、近期用量
- [ ] 用量圖表資料 API（依時間、模型、Provider 分組）
- [ ] 費用摘要 API

---

## Phase 4：Credit System — 額度與計費

**目標**：Credit 儲值、扣款、餘額管理

### 4.1 Credit 模組
- [ ] Credit 餘額管理（Domain Entity）
- [ ] Credit 異動紀錄（充值、扣款、退款、過期）
- [ ] 餘額不足時阻擋 Key 使用（透過 Bifrost Rate Limit 或 Webhook）
- [ ] Credit 餘額查詢 API

### 4.2 Usage Sync 模組
- [ ] 定時同步 Bifrost 用量日誌
- [ ] 用量轉換為 Credit 消耗（依定價規則）
- [ ] 用量異常偵測（突增告警）
- [ ] 同步狀態監控

---

## Phase 5：Contract & Module — 合約與模組管理

**目標**：管理者可透過合約控制帳戶的可用功能模組

**進度註記（2026-04-09）**：核心後端與 middleware 已串聯；細項與缺口見 [`specs/2026-04-08-draupnir-v1-workplan-design.md`](./specs/2026-04-08-draupnir-v1-workplan-design.md) 內「Phase 5 完成註記」。

### 5.1 Contract 模組
- [x] 合約 CRUD（管理者操作）
- [x] 合約條款定義：有效期、Credit 額度、可用模組、速率限制
- [x] 合約指派至 Organization / User
- [x] 合約到期處理（停用與事件；**通知通道**、**內建 Cron** 仍待補）
- [x] 合約續約 / 變更流程

### 5.2 AppModule 模組
- [x] 應用模組註冊（管理者定義 AI 工具為模組）
- [x] 模組訂閱（免費 / 付費）
- [x] 模組存取權限檢查 Middleware（已掛 org 路徑之 dashboard／credit／api_keys）
- [ ] 模組使用量獨立追蹤

---

## Phase 6：Application Distribution — 應用分發與 SDK

**目標**：提供 API Key 配發、SDK、CLI 等多種方式讓外部開發者與終端用戶使用 Draupnir 服務

### 6.1 Application API Key（應用層級 Key）
- [ ] 應用專屬 API Key 配發（區別於使用者個人 Key）
- [ ] Key 與 AppModule 綁定（此 Key 只能存取特定模組功能）
- [ ] Key Scope 定義（read / write / admin）
- [ ] 應用 Key 用量獨立追蹤與計費
- [ ] Key 生命週期管理（到期、輪換、撤銷）

### 6.2 SDK
- [ ] Draupnir SDK 設計（TypeScript / JavaScript 優先）
- [ ] SDK 認證流程（API Key / OAuth Token）
- [ ] 核心方法封裝：認證、模型呼叫、用量查詢、Credit 餘額
- [ ] 錯誤處理與重試策略
- [ ] SDK 文件與範例程式碼
- [ ] npm 套件發佈

### 6.3 CLI Application
- [ ] CLI 登入流程（`draupnir login` → OAuth / Device Flow）
- [ ] Token 本地儲存與自動刷新
- [ ] 模組權限驗證（CLI 對應的 AppModule 是否已授權）
- [ ] CLI 請求代理至 Bifrost（附帶用戶 Context）
- [ ] 用量即時扣款
- [ ] Session 管理與速率限制

> SDK 與 CLI 本體為獨立 Repository，本模組提供後端 API 與配發機制。

### 6.4 Developer Portal API
- [ ] 應用註冊 API（第三方開發者註冊應用）
- [ ] API Key 自助申請與管理
- [ ] Webhook 設定（用量告警、Key 到期通知）
- [ ] API 使用文件自動生成

---

## Phase 7：Admin Portal — 管理後台

**目標**：管理者 Web 介面（Inertia.js + React）

### 7.1 管理後台頁面
- [ ] 使用者管理（列表、詳情、停用）
- [ ] 組織管理
- [ ] API Key 全域總覽
- [ ] 合約管理介面
- [ ] 模組管理介面
- [ ] 系統用量儀表板（Bifrost 數據視覺化）

### 7.2 會員 Portal 頁面
- [ ] 個人 Dashboard（Key 總覽、用量、Credit）
- [ ] API Key 管理頁面
- [ ] 合約與模組檢視
- [ ] 帳戶設定

---

## 技術決策摘要

| 項目 | 選擇 | 理由 |
|------|------|------|
| 框架 | Gravito DDD | 團隊標準框架，DDD + DCI 架構 |
| 運行時 | Bun | 效能、TypeScript 原生支援 |
| ORM | Drizzle（透過 @gravito/atlas） | ORM 無關設計，由 Infrastructure 層實現 |
| 認證 | JWT（@gravito/sentinel） | 已有成熟方案 |
| 前端 | Inertia.js + React（@gravito/prism） | SSR、SPA 體驗、框架整合 |
| 快取 | Redis（@gravito/stasis） | Session、Rate Limit、用量快取 |
| 事件 | Redis / RabbitMQ（@gravito/signal） | 用量同步、通知分發 |
| 與 Bifrost 整合 | HTTP Client + Webhook | API 呼叫 + 事件回調 |

---

## 模組依賴圖

```
Foundation
└── BifrostClient（封裝 Bifrost API）

Identity
├── Auth（認證）
├── User（使用者）
└── Organization（組織、多租戶）

Core Business
├── ApiKey（API Key 管理）→ 依賴 BifrostClient、User
├── Credit（額度管理）→ 依賴 User、Organization
├── UsageSync（用量同步）→ 依賴 BifrostClient、Credit、ApiKey
├── Contract（合約）→ 依賴 Organization、Credit、AppModule
└── AppModule（應用模組）→ 依賴 Contract

Applications
├── App API Key（應用層級 Key）→ 依賴 ApiKey、AppModule、BifrostClient
├── SDK Backend API → 依賴 Auth、App API Key、BifrostClient
├── CLI Backend API → 依賴 Auth、App API Key、BifrostClient
└── Developer Portal API → 依賴 Auth、App API Key、AppModule

Portal
├── Admin Portal → 依賴 All
└── Member Portal → 依賴 Auth、ApiKey、Credit、Contract
```

---

## v1 完成標準

- [ ] 使用者可註冊、登入、管理自己的 API Key
- [ ] API Key 與 Bifrost Virtual Key 正確映射
- [ ] 用量從 Bifrost 同步並反映在 Dashboard
- [ ] Credit 系統正常運作（充值、消耗、餘額）
- [ ] 管理者可建立合約並指派給使用者/組織
- [ ] 應用模組可被註冊、訂閱、權限控制
- [ ] CLI 工具可透過 Draupnir 認證使用 Bifrost
- [ ] 管理後台與會員 Portal 基本功能完成
- [ ] 測試覆蓋率 ≥ 80%
- [ ] API 文件完整
