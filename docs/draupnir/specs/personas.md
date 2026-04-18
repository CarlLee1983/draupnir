# Draupnir Personas

> 本文件列出 Draupnir 系統中的人物與非人類 actor，供 User Stories 與 onboarding 閱讀使用。
> **對標代碼日期**：2026-04-18（commit `f767eea`，建立本文件時的 HEAD）。

本文件是 [User Stories 索引](./user-stories-index.md) 的起點——先認識「誰在用這個系統」，再讀對應旅程的 story。

**Stage 覆蓋狀態**：
- ✅ Stage 0（主 3 張）：Cloud Admin、Org Manager、Org Member
- ✅ Stage 1.4：Bifrost Sync Job
- ✅ Stage 2.2：SDK Client

---

## 👤 Cloud Admin

**是誰**
Draupnir 平台的總管理員（內部運維 / 客戶成功團隊）。全站唯一能跨 org 操作的角色。

**關切的事**
- 平台整體的健康、用量、異常
- 幫客戶組織（org）建立初始合約與額度
- 介入處理客戶投訴 / 手動調降

**不關切**
- 單一 org 內部的 member 分工
- 單把 key 的細節（除非出問題）

**會碰到哪些模組**
Contract、Organization（provisioning）、Credit（手動調整）、Alerts（全站視角）、Dashboard（管理員視圖）

**代表性 Story**
US-APIKEY-xxx（跨 org 查 key，待 Stage 1 Admin 視圖加入後補）

---

## 👤 Org Manager

**是誰**
客戶組織的管理員（通常是技術主管、PM、或 team lead）。負責該 org 內部的資源分配與成員管理。

**關切的事**
- org 的剩餘額度、合約狀態
- 給成員發 key、管權限、設額度
- 成員活動與成本分佈
- 告警設定（超額、額度不足）

**不關切**
- 其他 org 的任何事
- 平台底層（Bifrost、資料庫）

**會碰到哪些模組**
Organization（成員管理）、ApiKey（發 / 指派 / 撤銷 key）、Contract（只讀）、Credit（只讀）、Dashboard（org 視圖）、Reports、Alerts

**代表性 Story**
[US-APIKEY-001](./3-api-keys/user-stories.md#us-apikey-001-manager-建立-api-key)、[US-APIKEY-003](./3-api-keys/user-stories.md#us-apikey-003-manager-指派-key-給成員)、[US-APIKEY-005](./3-api-keys/user-stories.md#us-apikey-005-manager-撤銷-key)

---

## 👤 Org Member

**是誰**
客戶組織內的一般使用者（開發者、數據分析師、內容團隊成員）。靠 Manager 發的 key 使用 AI 服務。

**關切的事**
- 拿到自己的 API key 能開工
- 看自己的 key 用了多少、剩多少
- 自己的 key 失效時知道是為什麼

**不關切**
- 其他 member 的 key
- org 合約細節、付款流程
- 後台資料庫或 Bifrost 機制

**會碰到哪些模組**
ApiKey（只看自己的 key）、Dashboard（member 視圖、只看自己的活動）、Profile（個人設定）

**代表性 Story**
[US-APIKEY-007](./3-api-keys/user-stories.md#us-apikey-007-member-列出自己持有的-key)

---

## 🤖 Bifrost Sync Job

**是誰**
定時 cron 任務（預設 `*/5 * * * *`，由 `appConfig.bifrostSyncCron` 控制），由 Scheduler 觸發，代表「系統自己」執行的背景工作。實作在 `BifrostSyncService`（`src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts`）。

**關切的事**
- 從 Bifrost Gateway 拉取最新的 usage logs
- 寫入 `usage_records`、推進 `sync_cursors`（只在成功寫入後推進）
- 失敗 log 寫入 `quarantined_logs`（例如 `virtual_key_not_found`）、不影響 cursor 前進
- 完成時 dispatch `BifrostSyncCompletedEvent` 帶 `affectedOrgIds`，讓 Credit 模組接續扣款

**不關切**
- 使用者請求路徑（非 user-facing）
- 業務規則驗證（log 來什麼拉什麼；意外的 log 隔離不阻塞）
- 多輪之間的狀態保留（每輪獨立；靠 cursor 決定 resume 點）

**會碰到哪些模組**
Dashboard（本身所在模組，寫 `usage_records`）、ApiKey（比對 `virtual_key_id`）、Credit（事件下游扣款）

**失效模式**
- 單次 sync 30 秒 timeout：超時回 empty result，不 throw，等下次 tick
- Gateway network 錯誤：同上，靜默 retry 下次 tick
- Quarantine 過多：資料健康度問題，靠運維觀察 `quarantined_logs` 表

**代表性 Story**
[US-DASHBOARD-007](./4-credit-billing/user-stories.md#us-dashboard-007-bifrost-sync-job定期拉-logs寫-usage_records隔離失敗-logs)、[US-CREDIT-004](./4-credit-billing/user-stories.md#us-credit-004-系統依-bifrost-sync-結果扣款)

---

## 🔌 SDK Client

**是誰**
外部程式（客戶的系統、CI pipeline、CLI 工具如 Claude Code / Codex，或 App Server），拿著 Draupnir 發的 App-Key 或透過 CLI Device Flow 交換到的 user token，透過 Draupnir SdkApi / CliApi 呼叫 AI 模型。

**兩種子類**：
- **App-Key 模式**：拿到 App-Key，打 `/sdk/v1/chat/completions`，認證走 `AppAuthMiddleware`
- **CLI Device-Flow 模式**：先 OAuth Device Flow 換 user token（見 [US-CLI-001](./7-developer-api/user-stories.md#us-cli-001-cli-client-oauth-device-flow-登入)），之後以 user 身份打 `/cli/proxy`

**關切的事**
- 能用 OpenAI 相容格式發 request、取得 AI 回應
- 遇到錯誤（餘額不足、key revoked、scope 不足、module 未訂閱）能收到**清楚的錯誤 code 與訊息**
- App-Key / token 能安全取得、rotate、撤銷

**不關切**
- 背後的 Bifrost gateway 細節、usage sync 流程
- 額度扣款的計算邏輯（只需要知道「扣完了」）
- 組織內部的 member 分工

**會碰到哪些模組**
SdkApi、CliApi、DevPortal（UI 端）、AppApiKey（底層 key 管理）

**代表性 Story**
[US-SDK-001](./7-developer-api/user-stories.md#us-sdk-001-sdk-client-以-app-key-打-chat-completion)（chat completion）、[US-SDK-002](./7-developer-api/user-stories.md#us-sdk-002-sdk-client-查餘額--查使用量)（查餘額 / 使用量）、[US-CLI-001](./7-developer-api/user-stories.md#us-cli-001-cli-client-oauth-device-flow-登入)（CLI 登入）、[US-CLI-002](./7-developer-api/user-stories.md#us-cli-002-cli-client-透過-proxy-呼叫-bifrost)（CLI proxy）
