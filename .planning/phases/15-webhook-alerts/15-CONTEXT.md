# Phase 15: Webhook Alerts - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

使用者能透過 webhook endpoints 接收 HMAC-SHA256 簽署的告警通知，並在 Alerts 頁面查看所有告警的 per-channel 遞送歷史。本階段交付：

- Webhook endpoint CRUD（註冊、啟用/停用、刪除、送測試）
- 從 `SendAlertService` 分派 HMAC-SHA256 簽署的 webhook
- Per-channel 遞送狀態與歷史查詢
- 統一 Alerts UI（Budgets / Webhooks / History 三個分頁）

**不在範圍內：**自動 DLQ / cron retry（ALRT-09 v2）、自訂 payload schema UI、跨 org webhook、webhook recipient configuration UI。

</domain>

<decisions>
## Implementation Decisions

### Infrastructure Reuse

- **D-01:** 將現有 `WebhookDispatcher` 與 `WebhookSecret` 從 `src/Modules/DevPortal/` 提升（移動）至 `src/Foundation/` 或 `src/Shared/`，改為 **generic / payload-agnostic** 共用 infrastructure。原本 DevPortal 的寫死 envelope `{id, event, data, timestamp}` 可保留為預設或由呼叫端組裝；dispatcher 只負責「接收 body + secret + url → POST 並簽名 + 重試」。DevPortal 與 Alerts 兩模組都從同一處 import。
- **D-02:** Webhook payload 沿用現有 envelope `{id, event, data, timestamp}` + headers `X-Webhook-Signature`, `X-Webhook-Event`, `X-Webhook-Id`。Alert 專用 schema：
  - `event`: `"alert.threshold.breached"`（正式）/ `"alert.test"`（測試按鈕用）
  - `data`: `{ orgId, orgName, tier: "warning"|"critical", budgetUsd, actualCostUsd, percentage, month, alertEventId }`

### Webhook Config Model

- **D-03:** 每個 organization 可註冊最多 **5 個 webhook endpoints**（MVP 上限，寫死或簡單 config）。每個 endpoint 各自包含：`id`, `orgId`, `url`, `secret`, `active` (boolean), `description` (optional), `createdAt`, `lastSuccessAt`, `lastFailureAt`。多重 endpoints 平行 dispatch（Promise.allSettled）。
- **D-04:** Secret 為系統產生（32-byte hex），建立時顯示一次、之後僅顯示遮罩或「Rotate」按鈕重新產生；不讓使用者自訂 secret。

### URL Validation

- **D-05:** **HTTPS 強制**：註冊時若 URL scheme 非 `https` 直接拒絕（本地開發環境透過 env flag 可放寬為允許 `http`）。
- **D-06:** **SSRF 防護**：拒絕 `localhost`、`127.0.0.0/8`、`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`、`169.254.0.0/16`、`0.0.0.0`、IPv6 loopback/link-local。解析 DNS 後也要檢查（防 DNS rebinding）；若解析失敗亦拒絕。
- **D-07:** 「**送測試**」按鈕：設定頁可針對任一 endpoint 立即派送 `event: "alert.test"` 的假 payload，UI 顯示 response status / 錯誤；測試請求不寫入 `alert_deliveries`（或以 `channel='webhook', target=..., status='test'` 方式分離可查）。

### Dedup Strategy

- **D-08:** **Per-channel 獨立去重**。不重用 Phase 13 `AlertConfig` 上的 `last_alerted_tier`/`last_alerted_at`（那是整個 org 維度）。改為 per-(channel, target) 獨立追蹤最近成功 tier：
  - Email：以 (orgId, 'email') 為 key，同月同 tier 只送一次、僅送最高 tier（沿用 Phase 13 D-10/11/12）。
  - Webhook：以 (orgId, endpoint_id) 為 key，同樣邏輯。意即 email 送成功但某 webhook 失敗 → 下次 sync 若狀態未變，**仍會重試該 webhook**（因為它還沒 "sent"）。
- **D-09:** 「成功」定義為 `alert_deliveries.status = 'sent'`。只要有過一次成功即鎖該 (channel, target, month, tier)；後續 sync 不再 re-dispatch 該 tier（即使 endpoint 後來變失敗狀態）。

### Delivery & Failure Handling

- **D-10:** 新增 `alert_deliveries` 資料表（取代 Phase 13 `alert_events.recipients` JSON 欄位作為遞送紀錄的權威來源；`alert_events` 保留為「threshold 被突破」事件本身）：
  ```
  alert_deliveries (
    id TEXT PK,
    alert_event_id TEXT FK → alert_events.id,
    channel TEXT ('email' | 'webhook'),
    target TEXT,            -- email address OR webhook endpoint_id
    target_url TEXT,        -- webhook URL 快照（endpoint 刪掉後仍可查）
    status TEXT ('pending' | 'sent' | 'failed'),
    attempts INTEGER,
    status_code INTEGER NULL,
    error_message TEXT NULL,
    dispatched_at TEXT,
    delivered_at TEXT NULL,
    created_at TEXT
  )
  ```
- **D-11:** Dispatcher 內建 3 次指數退避（沿用現有）。3 次都失敗 → `status='failed'`，寫入 `status_code`（如有）與 `error_message`。**不做自動 DLQ / cron retry**（ALRT-09 v2）。
- **D-12:** History UI 提供「**手動重送**」按鈕，針對失敗的 delivery row 重新 dispatch，產生新的 `alert_deliveries` row（舊 row 保留為歷史）。

### UI / Integration

- **D-13:** 整合入統一 `/alerts` 頁面，使用 tabs 結構：`Budgets` | `Webhooks` | `History`（Phase 13 的 budget 設定亦放此頁的 Budgets tab —— Phase 13 只做了 backend，frontend 頁面由 Phase 15 建立）。
- **D-14:** History tab 為**統一時間軸**：列出所有 `alert_events`（最新在上），每筆展開顯示 per-channel `alert_deliveries`（email: ✓ sent | webhook #1: ✗ failed → [重送]）。
- **D-15:** 權限：所有 Alert / Webhook CRUD endpoints 要求 `requireOrganizationContext()` + organization ADMIN role（沿用 `createRoleMiddleware()` / `createModuleAccessMiddleware()` 模式）。

### Post-Sync Integration

- **D-16:** `SendAlertService` 改為同時處理 email + webhook：
  1. 建立 `AlertEvent`（沿用）
  2. 依 per-channel dedup 決定哪些 channels 需要 dispatch
  3. Email dispatch（沿用 `IMailer`），寫入 `alert_deliveries`
  4. 平行 dispatch 所有 active webhooks，各寫入 `alert_deliveries`
- **D-17:** Dispatch 為 **fire-and-forget（在 sync 完成後 async）** — 不阻塞 BifrostSync 的主流程；若 dispatcher 拋例外要 catch 並記錄為 `status='failed'`。

### Claude's Discretion

- Foundation 內 WebhookDispatcher 的確切位置（`src/Foundation/Infrastructure/Services/` vs `src/Shared/Infrastructure/`）
- `WebhookEndpoint` aggregate 內部結構（Entity vs Aggregate 選擇）
- Test dispatch 實作細節（是否寫入 alert_deliveries、或僅 in-memory response）
- SSRF IP 檢查實作（可用現有 lib 或手寫 `net` module 範圍判斷）
- History UI 分頁 / 篩選 / 排序互動細節（建議：月份篩選、tier 篩選、status 篩選）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Prior Decisions
- `.planning/REQUIREMENTS.md` — ALRT-06, ALRT-07, ALRT-08 acceptance criteria
- `.planning/phases/13-alert-foundation-email-infrastructure/13-CONTEXT.md` — 前期 email / dedup / post-sync hook 決策（特別是 D-05, D-07, D-10/11/12）
- `.planning/phases/13-alert-foundation-email-infrastructure/13-RESEARCH.md` — Alerts module 架構研究
- `.planning/ROADMAP.md` — Phase 15 Success Criteria 與依賴關係（depends on Phase 13）

### Existing Webhook Infrastructure (to be promoted)
- `src/Modules/DevPortal/Infrastructure/Services/WebhookDispatcher.ts` — HMAC 簽名 + 3 次指數退避重試邏輯（需提升至 Foundation）
- `src/Modules/DevPortal/Domain/ValueObjects/WebhookSecret.ts` — HMAC-SHA256 value object（需提升至 Foundation）
- `src/Modules/DevPortal/__tests__/WebhookDispatcher.test.ts` — 現有測試可作參考
- `src/Modules/DevPortal/__tests__/WebhookSecret.test.ts`
- `src/Modules/DevPortal/Domain/Entities/WebhookConfig.ts` — 參考結構
- `src/Modules/DevPortal/Infrastructure/Repositories/WebhookConfigRepository.ts` — Repository pattern 參考
- `src/Modules/DevPortal/Infrastructure/Mappers/WebhookConfigMapper.ts` — Drizzle mapper pattern

### Existing Alerts Module
- `src/Modules/Alerts/Application/Services/SendAlertService.ts` — 需擴充為同時處理 email + webhook dispatch
- `src/Modules/Alerts/Domain/Entities/AlertEvent.ts` — 告警事件本身（保留）
- `src/Modules/Alerts/Domain/Aggregates/AlertConfig.ts` — 預算設定（加一個 webhook endpoints 子關聯或另建 WebhookEndpoint aggregate）
- `src/Modules/Alerts/Presentation/Routes/alert.routes.ts` — 現有 budget 路由，擴充 webhook endpoints 路由
- `src/Modules/Alerts/Infrastructure/Providers/*ServiceProvider.ts` — DI 註冊

### Foundation / Shared Patterns
- `src/Foundation/Infrastructure/Ports/IMailer.ts` — 參考 port 抽象化方式（新的 `IWebhookDispatcher` port 可仿照）
- `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` — 新增 `webhook_endpoints` 與 `alert_deliveries` tables
- `src/Shared/Domain/DomainEventDispatcher.ts` — 若要異步觸發 webhook dispatch 用此 event bus

### Codebase Maps
- `.planning/codebase/CONVENTIONS.md` — DDD 模組結構、命名、錯誤處理
- `.planning/codebase/ARCHITECTURE.md` — 四層架構、data flow
- `.planning/codebase/STACK.md` — Bun + Drizzle 生態
- `.planning/codebase/TESTING.md` — TDD 測試慣例

### Frontend
- `resources/js/Pages/Member/Settings/Index.tsx` — 現有 settings 頁面結構參考（tabs pattern）
- `resources/js/Pages/Member/CostBreakdown/` — Phase 14 剛完成的 page 結構參考
- `src/Pages/routing/member/memberPageKeys.ts` — Inertia page key 註冊處

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`WebhookDispatcher` (DevPortal)** — 完整的 HMAC 簽名 + 指數退避重試實作，提升到 Foundation 後兩模組共用
- **`WebhookSecret` (DevPortal)** — HMAC-SHA256 value object（簽名邏輯封裝），同樣提升至 Foundation
- **`WebhookConfig` entity + mapper pattern (DevPortal)** — Repository / Mapper / Drizzle 整合範本可直接套用於新的 `WebhookEndpoint`
- **`SendAlertService` (Alerts)** — 擴充為 multi-channel dispatch 的自然位置
- **`AlertEvent` entity** — 保留為 threshold 突破事件的權威紀錄
- **`DomainEventDispatcher`** — 若要 async 解耦 BifrostSync 與 webhook dispatch
- **`createRoleMiddleware()` + `requireOrganizationContext()`** — 沿用現有權限 middleware
- **`FormRequest` + Zod validation (Gravito Impulse)** — webhook URL 註冊 request validation

### Established Patterns
- **DDD Module Structure:** Domain/Application/Infrastructure/Presentation
- **Immutable Aggregates:** `WebhookEndpoint` 應為 immutable，rotate secret 回傳新 instance
- **ServiceProvider DI:** 新 services 透過 `AlertsServiceProvider.register()` 註冊
- **Typed Service Response:** `{ success, message, data? }` 配合 controller
- **Value Objects:** `WebhookUrl` (HTTPS + SSRF 驗證)、沿用 `WebhookSecret`
- **TDD 80%+:** Unit + integration + E2E for webhook registration & dispatch

### Integration Points
- **Drizzle schema:** 新增 `webhook_endpoints` + `alert_deliveries` tables，`alert_events` 保留
- **`SendAlertService`:** 注入 `IWebhookEndpointRepository` + `IWebhookDispatcher` + `IAlertDeliveryRepository`
- **`AlertsServiceProvider`:** 註冊新 repositories、dispatcher、services
- **Alert Routes:** 擴充 `alert.routes.ts` 新增 `/api/organizations/:orgId/alerts/webhooks` CRUD + `/test` + `/history`
- **Frontend Page:** 新建 `resources/js/Pages/Member/Alerts/Index.tsx`（tabs: Budgets | Webhooks | History）、註冊 Inertia page key

</code_context>

<specifics>
## Specific Ideas

- 使用者偏好**重用優先**（明確選擇提升既有 dispatcher 到 Foundation），避免重複實作維護成本
- MVP 風格：多 endpoint 但設上限 5、UI 提供手動工具（送測試、重送）而非自動化（DLQ、cron）
- 「統一時間軸」是 ALRT-08 驗收的最佳對應 —— 使用者只需一個地方看到所有告警與遞送狀態
- SSRF 防護被明確要求，使用者關注安全面（不是隨便接受任何 URL）
- 預設 dedup 與 Phase 13 一致但**每 channel 獨立**，避免單 channel 失敗影響其他 channel 的告警送達

</specifics>

<deferred>
## Deferred Ideas

- **ALRT-09 Advanced retry with exponential backoff & DLQ** — v2 milestone；本階段只用 dispatcher 內建 3 次重試 + 手動 UI 重送
- **ALRT-10 Custom alert rule builder** — v2 milestone
- **Tier-based endpoint routing** — warning 與 critical 送到不同 URL 的能力延後，MVP 所有 endpoints 都收所有 tier
- **自訂 payload schema / headers per endpoint** — 未來若有需求再加
- **Webhook recipient configuration UI（哪些 admin 收哪些 channel）** — Phase 13 沿用「所有 org ADMIN 收」
- **跨 org / shared webhook endpoints** — 一律 org-scoped
- **Slack / PagerDuty 原生整合** — v2；目前 MVP 僅通用 HTTP webhook
- **Webhook event subscription（只接收特定 tier / 特定事件類型）** — MVP 全部都收

</deferred>

---

*Phase: 15-webhook-alerts*
*Context gathered: 2026-04-12*
