# Phase 15: Webhook Alerts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 15 — Webhook Alerts
**Mode:** discuss (interactive)

---

## Area Selection

**Q:** Phase 15 要討論哪些 gray areas？(可複選)

**Options presented:**
1. 重用 webhook 基礎建設
2. Config 範圍 + 去重行為
3. Delivery 狀態 + 失敗處理
4. URL 安全 + 歷史 UI

**User selected:** ALL (1, 2, 3, 4)

---

## Area 1 — 重用 WebhookDispatcher & Secret

### Q1: WebhookDispatcher/WebhookSecret 怎麼重用？

**Options:**
- 提升到 Foundation/Shared (Recommended)
- Alerts 直接 import DevPortal
- Alerts 複製一份
- Foundation + 調整 payload

**User chose:** **Foundation + 調整 payload**

**Rationale captured:** 提升至共用 infrastructure，但改為 payload-agnostic generic dispatcher，讓 Alerts 使用自訂 alert-specific schema。

### Q2: Webhook payload 契約格式？

**Options:**
- Alert 專用 schema (Recommended)
- 完全沿用 DevPortal 格式
- Draupnir 一統規格

**User chose:** **Alert 專用 schema (Recommended)**

**Rationale captured:** event='alert.threshold.breached'、data 明確欄位、沿用 envelope `{id, event, data, timestamp}` + X-Webhook-* headers。

---

## Area 2 — Config 範圍 + 去重

### Q3: 一個 org 可以註冊幾個 webhook endpoint？

**Options:**
- 多個 (MVP 上限 5)
- 一個 org 一個 webhook (Recommended for MVP)
- 按 tier 分派到不同 URL

**User chose:** **多個 (MVP 上限 5)**

**Rationale captured:** 選了彈性大的選項；每個 endpoint 獨立 active toggle + secret。

### Q4: Webhook 的去重行為？

**Options:**
- 完全沿用 email 規則 (Recommended)
- 獨立去重
- 僅 webhook 失敗時追蹤

**User chose:** **獨立去重**

**Rationale captured:** 每 channel（email / 每 webhook endpoint）獨立追蹤 last_alerted 狀態，避免某 channel 失敗被其他成功的 channel 鎖住。

---

## Area 3 — Delivery 狀態 + 失敗處理

### Q5: Delivery 狀態的 data model？

**Options:**
- 新建 alert_deliveries 表 (Recommended)
- 擴充 alert_events 加 channel 欄位
- Append-only log 表

**User chose:** **新建 alert_deliveries 表 (Recommended)**

**Rationale captured:** alert_events 保留為「threshold 突破事件」本身，alert_deliveries 一對多記錄 per-channel dispatch。支援獨立重試與歷史查詢。

### Q6: Webhook 失敗後怎麼處理？

**Options:**
- 記狀態 + 手動重送 UI (Recommended)
- 只記狀態、無 UI 重送
- 自動延遲重試 queue

**User chose:** **記狀態 + 手動重送 UI (Recommended)**

**Rationale captured:** Dispatcher 內建 3 次重試失敗後寫 status='failed' + error/statusCode；UI 提供重送按鈕產生新 delivery row。不做自動 DLQ（ALRT-09 v2）。

---

## Area 4 — URL 安全 + 歷史 UI

### Q7: Webhook URL 註冊時的驗證規則？(可複選)

**Options:**
- 強制 HTTPS (Recommended)
- SSRF 防護 (Recommended)
- 「送測試」按鈕 (Recommended)
- 不限制 URL

**User chose:** **強制 HTTPS + SSRF 防護 + 送測試按鈕**（三個 Recommended 全選）

**Rationale captured:** 安全防護全開；送測試按鈕確保使用者在註冊後能立即驗證 endpoint 設定正確。

### Q8: Alert history UI 範圍？

**Options:**
- 統一時間軸 (email+webhook) (Recommended)
- Webhook 專用頁
- 僅 API endpoint

**User chose:** **統一時間軸 (email+webhook) (Recommended)**

**Rationale captured:** 最貼近 ALRT-08「User can view a history of all alerts with delivery status per channel」的描述。

### Q9: Settings UI 放哪裡？

**Options:**
- /alerts 與 Budgets 同頁 (Recommended)
- /settings/webhooks 獨立入口
- 跨頁佈置

**User chose:** **/alerts 與 Budgets 同頁 (Recommended)**

**Rationale captured:** 統一 Alerts 頁面：Budgets / Webhooks / History 三個 tabs。Phase 13 只完成 backend，frontend alerts page 由 Phase 15 新建。

---

*Log generated: 2026-04-12*
