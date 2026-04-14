# Draupnir v1 ROADMAP

> Draupnir — AI 服務管理平台，建構於 Bifrost AI Gateway 之上
> 框架：Gravito DDD | 運行時：Bun | 資料庫：PostgreSQL (Drizzle ORM)

## 專案定位

Draupnir 是 Bifrost 的上層管理平台，負責：
- **認證與帳戶管理**：使用者註冊、登入、API Key 管理
- **用量追蹤與 Credit 系統**：追蹤 LLM 使用量、管理餘額
- **合約與模組管理**：管理者定義合約，控制帳號可用的 AI 應用模組
- **應用分發**：自研 AI 工具（如 CLI）透過 Draupnir 認證後使用

Bifrost 處理 LLM 請求路由，Draupnir 處理「誰能用、用多少、付多少」。

---

## ✅ v1.0 - v1.1 里程碑：基礎與門戶 (Phase 1 - 7)
**狀態**：已完成 (2026-04-11)

### Phase 1：Foundation — 基礎建設
- [x] 使用 gravito-ddd-starter 建立專案骨架
- [x] 建立 `BifrostClient` Service — 封裝核心 API（Virtual Key CRUD、用量查詢）
- [x] 實作 API 認證與重試機制

### Phase 2：Identity — 認證與帳戶
- [x] Auth 模組：註冊、登入 (JWT)、密碼重設、RBAC (Admin/Manager/Member)
- [x] Profile 模組：使用者檔案管理與偏好設置
- [x] Organization 模組：多租戶管理、成員邀請與權限指派

### Phase 3：Key Management — API Key 管理
- [x] ApiKey 模組：映射至 Bifrost Virtual Key，支援生命週期管理
- [x] Dashboard 資料聚合：基礎用量總覽與 Key 使用統計

### Phase 4：Credit System — 額度與計費
- [x] Credit 模組：餘額管理、異動紀錄 (Audit Log)、充值與扣款
- [x] Usage Sync：定時同步 Bifrost 用量日誌並轉換為 Credit 消耗

### Phase 5：Contract & Module — 合約與模組管理
- [x] Contract 模組：合約 CRUD、有效期與模組條款定義、續約流程
- [x] AppModule 模組：應用模組註冊、模組存取權限檢查 Middleware

### Phase 6：Application Distribution — 應用分發與 SDK
- [x] AppApiKey：應用專屬 Key 配發、Scope 限制 (Read/Write/Admin)
- [x] CliApi：支援 CLI `draupnir login` (Device Flow) 與請求代理
- [x] Developer Portal API：應用註冊與 Webhook 設定

### Phase 7：Admin Portal — 管理後台
- [x] 管理者介面 (Inertia.js + React)：使用者、組織、合約及全域 Key 管理
- [x] 會員 Portal：個人 Dashboard、Key 管理與用量檢視

---

## ✅ v1.2 里程碑：分析與架構演進 (Phase 8 - 12)
**狀態**：已完成 (2026-04-12)

- [x] **數據正確性與權限基礎** (Phase 8)：強化多租戶隔離與數據存取層 (DAL) 驗證
- [x] **快取同步架構** (Phase 9)：引入 Redis 快取同步機制，提升 Dashboard 響應速度
- [x] **視覺化統計** (Phase 10)：實作 P1 級別圖表 UI，支援多維度用量分析
- [x] **UX 磨光與韌性** (Phase 11)：優化前端交互體驗，實作斷線重連與錯誤邊界

---

## ✅ v1.3 里程碑：進階分析與告警系統 (Phase 13 - 17)
**狀態**：已完成 (2026-04-12)

- [x] **告警基礎與 Email 基礎設施** (Phase 13)：建立 `AlertConfig` 領域與郵件發送服務
- [x] **單金鑰成本分析** (Phase 14)：精確至每一把 API Key 的成本分解與利潤追蹤
- [x] **Webhook 告警** (Phase 15)：實作異步 Webhook 派送與簽章驗證 (HMAC)
- [x] **自動化報表** (Phase 16)：支援 PDF 報表生成與定時郵件交付
- [x] **Drizzle ORM 重構** (Phase 17)：將 `UsageRepository` 與 `IQueryBuilder` 遷移至 Drizzle，統一持久化規範

---

## ✅ v1.4 里程碑：硬化、精煉與 CI 防護 (Phase 18 - 20)
**狀態**：已完成 (2026-04-13)

- [x] **統一後台任務 (IScheduler)** (Phase 18)：建立標準化的 `IScheduler` 接口與 Cron 管理
- [x] **告警模組解耦** (Phase 19)：將 Alerts 模組轉變為觀察者模式，不侵入核心計費邏輯
- [x] **CI 驗證防護網** (Phase 20)：
    - [x] 整合 Lint 與 Format 檢查至 GitHub Actions
    - [x] 實作跨模組路由驗證與型別完整性檢查
    - [x] 設定品質門檻 (Quality Gate) 阻擋不合規的提交

---

## 🎯 未來展望 (v1.5+)

- [ ] **高可用擴展**：實作分布式鎖與主從同步優化
- [ ] **支付門戶整合**：正式對接 Stripe / PayPal 支付流程
- [ ] **AI 輔助診斷**：引入 LLM 進行異常流量診斷與成本優化建議
- [ ] **多端點路由優化**：根據地理位置或延遲自動切換 Bifrost 節點

---

## 技術決策摘要

| 項目 | 選擇 | 理由 |
|------|------|------|
| 框架 | Gravito DDD | 團隊標準框架，DDD + DCI 架構 |
| 運行時 | Bun | 效能、TypeScript 原生支援 |
| ORM | Drizzle | SSoT Schema、型別安全、優異的 SQL 生成能力 |
| 認證 | JWT + Device Flow | 兼顧 Web 與 CLI 認證需求 |
| 前端 | Inertia.js + React | SSR 效能與 SPA 開發體驗的平衡 |
| 調度 | IScheduler (Cron) | 統一的背景任務管理 |
