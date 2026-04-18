# Draupnir Personas

> 本文件列出 Draupnir 系統中的人物與非人類 actor，供 User Stories 與 onboarding 閱讀使用。
> **對標代碼日期**：2026-04-18（commit `f767eea`，建立本文件時的 HEAD）。

本文件是 [User Stories 索引](./user-stories-index.md) 的起點——先認識「誰在用這個系統」，再讀對應旅程的 story。

**Stage 覆蓋狀態**：
- ✅ Stage 0（主 3 張）：Cloud Admin、Org Manager、Org Member
- ⏳ Stage 1.4：Bifrost Sync Job（Task 4 補）
- ⏳ Stage 2.2：SDK Client（Task 7 補）

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

<!-- TODO(stage-1.4): Bifrost Sync Job persona 卡將在 Task 4 補入 -->

<!-- TODO(stage-2.2): SDK Client persona 卡將在 Task 7 補入 -->
