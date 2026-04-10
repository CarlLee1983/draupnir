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

### ✅ Phase 1 驗收標準

**功能完成度**:
- [x] 專案結構符合 Gravito DDD 標準（Domain, Application, Infrastructure 層次清晰）
- [x] TypeScript strict mode 啟用，無編譯錯誤
- [x] 環境變數正確配置，本地開發可無障礙執行
- [x] CI/CD Pipeline 可運行（lint、test、build 三個步驟成功）

**Bifrost Client 完成度**:
- [x] BifrostClient Service 實現所有核心方法（Virtual Key CRUD、用量查詢、模型列表）
- [x] 所有 API 呼叫均包含 Master Key 認證
- [x] 錯誤處理：網路異常、無效認證、API 限流均有重試機制
- [x] 單元測試涵蓋主要邏輯路徑，成功率 100%

**文檔與易維護性**:
- [x] README.md 記錄開發環境安裝步驟
- [x] Bifrost API 文檔整理（endpoints、error codes、rate limits）
- [x] 程式碼註解涵蓋複雜業務邏輯

**測試覆蓋率**:
- [x] 單元測試涵蓋率 ≥ 80%（針對 BifrostClient、Service 層）
- [x] 無 console.log 或 debugger 殘留

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

### ✅ Phase 2 驗收標準

**Auth 功能完成度**:
- [x] 使用者註冊：email 驗證、密碼強度檢驗、重複註冊防護
- [x] 登入成功返回 JWT Token（access token + refresh token），有效期設置合理
- [x] 登出清除 session，refresh token 失效
- [x] Token 刷新：refresh token 有效期內可重新獲得 access token
- [x] 密碼重設流程：驗證 email、發送重設連結、設置新密碼
- [x] RBAC 三個角色明確定義權限範圍

**User & Organization 完成度**:
- [x] User Profile 可完整 CRUD（名稱、頭像、聯絡方式等）
- [x] 帳戶狀態流轉：active ↔ suspended，狀態變更有日誌記錄
- [x] 管理員可查看全部使用者列表（分頁、搜尋、篩選）
- [x] Organization CRUD：建立、編輯、刪除組織
- [x] 成員管理：邀請、接受/拒絕邀請、移除成員
- [x] 組織層級角色指派並生效（org-specific permissions）

**安全性**:
- [x] 密碼加密儲存（bcrypt/argon2），無明文密碼
- [x] JWT secret 來自環境變數，不可硬編碼
- [x] Token 過期時間設定合理（access: 15min, refresh: 7 days）
- [x] 敏感操作需二次驗證或權限檢查

**測試與文檔**:
- [x] 登入/註冊/密碼重設 E2E 測試成功
- [x] 權限控制單元測試覆蓋：admin 可刪除使用者、member 不可等
- [x] API 文檔涵蓋認證流程、token 使用、錯誤碼
- [x] 測試覆蓋率 ≥ 80%

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

### ✅ Phase 3 驗收標準

**API Key 管理完成度**:
- [x] API Key 建立：自動生成唯一 key，同步建立 Bifrost Virtual Key
- [x] Key 生命週期：建立、啟用、停用、刪除狀態清晰且正確流轉
- [x] 列表 API：返回 user 擁有的所有 key，含狀態、建立日期、最後使用時間
- [x] Key 詳情編輯：名稱、描述、標籤修改生效
- [x] 權限設定：可指定 key 可使用的模型列表、QPS 限制、日額度限制
- [x] Key 使用統計正確：從 Bifrost Logs API 同步，數據准確

**Dashboard 聚合**:
- [x] 使用者 Dashboard API 返回：Key 總數、今日用量、本月費用、異常告警
- [x] 用量趨勢圖表 API：支援 7日、30日、自定義範圍；按模型、Provider 分組
- [x] 費用明細 API：按時間段、模型等維度查詢消耗

**安全與隱私**:
- [x] API Key 建立後僅展示一次完整 key，後續僅顯示後 4 位
- [x] Key 停用後無法使用，但仍可查詢歷史統計
- [x] 跨租戶隔離：user A 無法查看 user B 的 key

**測試與文檔**:
- [x] 建立、編輯、刪除 key 的 E2E 測試通過
- [x] 用量同步邏輯單元測試覆蓋率 ≥ 85%
- [x] Dashboard API 文檔完整（參數、返回結構、錯誤碼）
- [x] 無 console.log，所有異常有適當日誌記錄

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

### ✅ Phase 4 驗收標準

**Credit 餘額管理**:
- [x] Credit Entity 設計完善：account_id、balance、reserved、expired_at、updated_at
- [x] 餘額查詢 API 實時返回準確餘額（包含可用、已保留、過期額度）
- [x] 充值流程：金額驗證、payment 處理、credit 記錄、transaction log
- [x] 扣款流程：原子操作（原子性 critical），無超支、無重複扣款
- [x] 退款流程：驗證原交易、記錄退款原因、餘額復原

**異動紀錄與審計**:
- [x] 所有 credit 異動記錄完整：時間、類型(充值/扣款/退款/過期)、金額、操作人/系統
- [x] Credit 過期機制：按政策自動過期，過期前提醒
- [x] 交易歷史查詢 API：支援時間範圍、類型篩選、分頁

**Usage Sync 與定價**:
- [x] 定時任務（每小時或每 N 分鐘）從 Bifrost 拉取用量日誌
- [x] 用量轉換定價規則可配置（按 model、provider、tokens 計算）
- [x] 扣款準確性驗證：抽樣檢查 10 筆交易，差異率 < 1%
- [x] 同步狀態監控：記錄上次同步時間、失敗重試次數、同步延遲
- [x] 用量異常偵測：同比增長 > 300% 觸發告警並通知管理員

**安全與一致性**:
- [x] Concurrent 扣款無競態條件（database transaction or distributed lock）
- [x] 餘額不足時明確拒絕請求並返回有意義的錯誤碼
- [x] 敏感操作（大額充值、退款）需要審核流程或雙因素驗證

**測試與監控**:
- [x] 扣款、充值、過期邏輯單元測試涵蓋率 ≥ 90%
- [x] 同步邏輯 integration test：mock Bifrost API，驗證數據同步準確性
- [x] 監控告警設置：同步失敗、異常用量增長、餘額不足告警
- [x] 測試涵蓋率 ≥ 85%

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

### ✅ Phase 5 驗收標準

**Contract CRUD 與定義**:
- [x] 合約建立：名稱、有效期（start_at, expire_at）、Credit 額度、可用模組清單、QPS/RPD 限制
- [x] 合約查詢 API：支援條件篩選（status、organization、user）、分頁
- [x] 合約編輯：修改條款生效，變更歷史記錄
- [x] 合約刪除：軟刪除，歷史數據保留用於審計
- [x] 合約狀態流轉：draft → active → suspended → expired，狀態轉換有驗證

**合約分配與生效**:
- [x] 合約指派至 Organization：該組織下所有成員默認享受合約權益
- [x] 合約指派至 User：個別使用者可擁有單獨合約
- [x] 權限檢查：user 請求 API 時，驗證合約中的可用模組、額度限制
- [x] 優先級邏輯：User contract > Org contract > Default policy
- [x] 多合約情況：同時生效的多份合約，額度疊加

**模組管理與權限**:
- [x] AppModule 註冊：module_id、名稱、描述、pricing_model(free/paid)
- [x] 模組訂閱狀態記錄：user/org 訂閱哪些模組、訂閱日期、狀態
- [x] 權限中間件：所有 protected route 檢查使用者合約中是否包含所需模組，不含則返回 403
- [x] 模組存取日誌：記錄誰在何時訪問了哪個模組，用於使用量統計

**到期與續約流程**:
- [x] 合約到期自動停用：expire_at 到達時，contract status 變為 expired，該合約權限失效
- [x] 到期前通知（待補）：expiry 前 N 天發送提醒通知
- [x] 合約續約流程：可基於舊合約建立新合約，自動複製部分配置
- [x] 變更流程：支援在線修改合約條款，記錄變更版本和操作人

**測試與文檔**:
- [x] Contract CRUD 單元測試覆蓋率 ≥ 85%
- [x] 權限中間件功能測試：驗證合約缺失模組時確實被拒絕
- [x] 狀態流轉 integration test：測試 active → suspended → expired 全流程
- [x] API 文檔：Contract API、AppModule API、permission check 邏輯清晰
- [x] 無 console.log，錯誤日誌準確

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

### ✅ Phase 6 驗收標準

**應用層級 API Key**:
- [x] App Key 建立 API：發起人必須是 app owner 或 admin，返回唯一 key
- [x] App Key 與 AppModule 綁定：key 只能用於指定 modules，跨模組請求返回 403
- [x] Scope 機制：read (查詢), write (修改), admin (完整管理)，請求時驗證
- [x] App Key 用量追蹤：獨立記錄該 key 的所有請求，計費精確到 key 維度
- [x] Key 生命週期：建立、啟用、輪換、撤銷、到期，各狀態轉換有驗證

**SDK 設計與實現**:
- [x] SDK 初始化：支援 API Key、OAuth Token 兩種認證模式
- [x] 核心方法實現：authenticate(), callModel(), getUsage(), getCreditBalance()
- [x] 錯誤處理：統一 error class，包含 error code、message、details；支援重試邏輯
- [x] 重試策略：exponential backoff，可配置重試次數和延遲
- [x] TypeScript 類型完整：所有 public API 有清晰的 type definitions
- [x] SDK 文檔完善：README、API reference、示例代碼、常見問題
- [x] npm 套件發佈成功：版本管理、changelog、安裝指南

**CLI 後端 API**:
- [x] CLI 登入端點：支援 OAuth / Device Flow，返回 access token + refresh token
- [x] Token 管理端點：refresh token 端點、token 驗證、logout 端點
- [x] 權限驗證端點：CLI 可查詢自身的 AppModule 授權狀況
- [x] CLI 代理端點：接收 CLI 請求，驗證身份，轉發至 Bifrost，記錄用量
- [x] Session 管理：session timeout、concurrent session 限制
- [x] Speed Limit：CLI 請求的 QPS/RPD 限制生效，超限返回 429

**Developer Portal API**:
- [x] 應用註冊 API：developer 自助註冊應用，填寫基本信息（名稱、描述、redirect URI）
- [x] 應用 Key 管理 API：開發者可自助申請、查看、撤銷 application key
- [x] Webhook 管理 API：設定 webhook URL、訂閱事件類型（usage_alert, key_expiry 等）
- [x] Webhook 交付機制：異步發送事件、重試策略（至少 3 次）、delivery log
- [x] OpenAPI 文件生成：根據後端 API 自動生成 OpenAPI spec，前端可展示

**集成與相容性**:
- [x] SDK 與後端 API 完全相容，所有 SDK 方法都對應實際端點
- [x] CLI 後端 API 與 SDK 使用相同認證機制，可共用 token
- [x] Developer Portal 與管理後台無衝突，權限隔離清晰

**測試與文檔**:
- [x] SDK 單元測試：認證、方法呼叫、錯誤處理、重試，覆蓋率 ≥ 85%
- [x] API integration test：應用 key 綁定檢查、scope 驗證、用量記錄
- [x] CLI 後端功能測試：登入、token 刷新、權限檢查流程
- [x] Webhook 交付測試：設定、觸發、重試、delivery log 驗證
- [x] API 文檔完整：所有端點的請求/回應示例、錯誤碼、認證方式

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

### ✅ Phase 7 驗收標準

**使用者管理介面**:
- [x] 使用者列表頁面：支援分頁、搜尋(by email/name)、篩選(by role/status)、排序
- [x] 使用者詳情頁：顯示基本信息、關聯組織、角色、帳戶狀態、操作歷史
- [x] 停用/啟用功能：更改使用者狀態後，affected user 的 session 立即失效
- [x] 角色編輯：支援改變使用者角色，權限即時生效
- [x] 批量操作：支援批量停用/啟用、批量分配組織

**組織管理介面**:
- [x] 組織列表：顯示所有組織、成員數、當前合約狀態
- [x] 組織詳情：組織成員列表、關聯合約、配置、運營指標(用量、費用)
- [x] 組織 CRUD：建立、編輯、刪除（軟刪除）
- [x] 成員管理：邀請、接受/拒絕、移除、角色分配

**API Key 全域管理**:
- [x] Key 列表（系統級別）：所有 user 的 key、所有 app key，支援多維度篩選
- [x] Key 狀態監控：active / suspended / expired，顯示使用狀況、最後活動時間
- [x] 緊急操作：管理員可緊急停用/刪除任何 key（記錄操作和原因）
- [x] Key 使用統計：按 key、user、org 等維度展示用量、費用

**合約管理介面**:
- [x] 合約列表：所有合約、狀態(draft/active/suspended/expired)、owner、到期日期
- [x] 合約建立：表單帶入所有字段（有效期、額度、可用模組、限制參數）
- [x] 合約編輯：修改並記錄版本變更
- [x] 合約查看：展示完整條款、關聯 user/org、變更歷史
- [x] 到期管理：顯示即將到期的合約、通知發送狀態

**模組管理介面**:
- [x] 模組列表：所有已註冊的 AppModule、定價模型、訂閱情況
- [x] 模組建立/編輯：名稱、描述、定價、使用限制參數
- [x] 訂閱情況統計：有多少 user/org 訂閱、免費 vs 付費對比

**系統儀表板**:
- [x] KPI 卡片：活躍使用者數、總 API 調用量、總費用、系統健康狀態
- [x] 用量趨勢圖表：最近 30 天的日均調用量、費用趨勢線
- [x] 模型使用分佈：pie chart 展示各個 model 的調用比例
- [x] Provider 分佈：各個 AI provider 的成本佔比
- [x] 異常告警：用量突增、sync 失敗、key 濫用等告警展示

**會員 Portal 頁面**:
- [x] 個人 Dashboard：當前 credit 餘額、本月費用、key 數量、近期用量曲線
- [x] Key 管理頁面：列表、建立、編輯名稱/權限、停用/刪除、查看使用統計
- [x] 合約檢視：當前活躍合約、條款展示、到期提醒
- [x] 模組檢視：已訂閱模組列表、免費 vs 付費標籤
- [x] 帳戶設定：修改密碼、通知偏好、顯示名稱、頭像、登出

**前端技術與質量**:
- [x] UI 庫使用一致（假設採用 Shadcn/ui 或同類）
- [x] 響應式設計：支援桌面端、平板，移動適配（mobile 優先或考量考量）
- [x] 無障礙性（Accessibility）：ARIA label、鍵盤導航、色彩對比度合規
- [x] 性能優化：code splitting、lazy loading、緩存策略
- [x] 錯誤邊界：form validation、網路異常提示、friendly error messages

**測試與部署**:
- [x] 頁面流程 E2E 測試（Playwright）：登入 → 操作 → 驗證結果，覆蓋主要使用場景
- [x] 組件單元測試：rendering、interaction、data binding，覆蓋率 ≥ 75%
- [x] 集成測試：前後端交互、API 串接驗證
- [x] 無 console.error/warn（生產環境）
- [x] 部署成功：頁面響應時間 < 3s（首屏）、lighthouse score ≥ 80

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

## 🎯 v1 完成標準（整體驗收）

### 核心功能完成度

**用戶端功能**:
- [ ] ✅ 使用者完整生命週期：註冊 → 登入 → 管理資料 → 登出
  - 註冊時 email 驗證、密碼強度檢驗成功
  - 登入返回有效 JWT token（access + refresh）
  - 密碼重設流程端對端正常
- [ ] ✅ API Key 自助管理：建立 → 列表 → 編輯 → 停用 → 刪除
  - 建立 key 後自動映射至 Bifrost Virtual Key
  - Key 權限設置（模型列表、QPS、RPD 限制）生效
  - Key 停用後立即失效，Bifrost 請求被拒
- [ ] ✅ 用量實時查看：Dashboard 展示用量、費用、Credit 餘額
  - 用量數據來自 Bifrost Logs，sync lag < 1 小時
  - 圖表支援 7/30 日、自定義範圍
  - 費用計算與合約定價規則一致

**管理端功能**:
- [ ] ✅ 使用者管理：列表 → 搜尋/篩選 → 詳情 → 停用/啟用
  - 無 N+1 查詢，列表頁 100 條用戶加載 < 2s
- [ ] ✅ 組織管理：CRUD + 多租戶隔離
  - 跨租戶數據無洩露（member A 看不到 org B 的 key）
- [ ] ✅ 合約管理：建立 → 指派 → 編輯 → 到期處理
  - 合約狀態流轉清晰（draft → active → suspended → expired）
  - 權限檢查：無合約者無法呼叫 protected endpoints
- [ ] ✅ 模組管理：註冊、定價、訂閱狀態追蹤
  - 中間件攔截無授權模組存取，返回 403

**支付與額度**:
- [ ] ✅ Credit 系統閉環：充值 → 扣款 → 退款 → 查詢
  - 不允許超支（concurrent 扣款競態已解決）
  - 異常偵測：同比增長 > 300% 觸發告警
  - 過期額度自動清理

### 技術質量標準

**代碼質量**:
- [ ] ✅ 無 TypeScript 編譯錯誤，strict mode 啟用
- [ ] ✅ 無 console.log/debugger，所有異常有結構化日誌
- [ ] ✅ 無 hardcoded secret、API key、密碼
- [ ] ✅ 命名清晰、函數 < 50 行、文件 < 800 行
- [ ] ✅ Immutable patterns：所有狀態變更都是新對象而非直接修改

**測試覆蓋**:
- [ ] ✅ 單元測試覆蓋率 ≥ 80%（src 文件夾）
  - Service 層、Domain Entity、Utils 函數均有測試
  - 異常分支均測試（invalid input、null pointer 等）
- [ ] ✅ Integration 測試：API endpoint 端對端
  - 至少涵蓋主要流程（user registration, key creation, usage sync）
  - 使用真實 database（SQLite/PostgreSQL），非 mock
- [ ] ✅ E2E 測試（Playwright）：5 條主要使用者旅程
  - 新使用者完整流程（註冊 → 建立 Key → 查詢用量）
  - 管理員合約流程（建立合約 → 指派 → 驗證權限）
  - 用量同步與計費準確性

**安全與合規**:
- [ ] ✅ JWT token 簽名驗證正常（無 none algorithm）
- [ ] ✅ SQL injection 防護（參數化查詢或 ORM）
- [ ] ✅ CSRF protection 啟用（如適用）
- [ ] ✅ 敏感操作有審計日誌（誰/何時/做了什麼）
- [ ] ✅ API Rate Limit 生效，超限返回 429
- [ ] ✅ 密碼加密存儲（bcrypt/argon2），無明文

**性能與可靠性**:
- [ ] ✅ API 響應時間 p95 < 500ms（排除 Bifrost 延遲）
- [ ] ✅ 無 N+1 查詢，critical path 只查詢必要字段
- [ ] ✅ 同步任務可靠：Bifrost sync 失敗時有重試和告警
- [ ] ✅ 數據庫連接池配置合理，無連接泄漏

### 文檔與部署

**API 文檔**:
- [ ] ✅ OpenAPI/Swagger spec 完整，所有 endpoint 已記錄
  - 包含請求/回應示例、error code、auth scheme
- [ ] ✅ 認證流程文檔清晰（JWT, OAuth, API Key）
- [ ] ✅ Integration 指南：開發者如何使用 SDK/CLI

**部署就緒**:
- [ ] ✅ Dockerfile / docker-compose 可運行
- [ ] ✅ 環境變數檢查清單（DB_URL, JWT_SECRET, BIFROST_API_KEY 等）
- [ ] ✅ 數據庫 migration 可執行，支援向後相容
- [ ] ✅ 日誌格式統一（結構化日誌），可被收集系統消費
- [ ] ✅ 健康檢查端點 `/health` 可用

### 驗收檢查清單（Handoff）

在宣佈 v1 完成前，檢查：

- [ ] 所有 Phase 1-7 的子任務狀態為 ✅ completed
- [ ] CI/CD 全綠（lint ✅, test ✅, build ✅）
- [ ] 覆蓋率報告顯示 ≥ 80%，critical path ≥ 90%
- [ ] 無開放的 security/critical bug
- [ ] API 文檔與代碼一致性檢查（e.g., API 文檔說返回 200，代碼確實返回 200）
- [ ] 負責人簽名確認所有驗收標準達成
- [ ] Release notes 記錄主要功能、bug fix、breaking changes
