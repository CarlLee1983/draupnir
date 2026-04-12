# Phase 15: Webhook Alerts - Research

**Researched:** 2026-04-12
**Domain:** Outbound HTTP webhook dispatch, HMAC-SHA256 signing, SSRF defense, multi-channel alert delivery + history
**Confidence:** HIGH

## Summary

Phase 15 extends the Phase 13 alert foundation with a **second delivery channel (HTTP webhook)** and a **per-channel delivery audit log** (`alert_deliveries`). Almost all dispatch-layer plumbing already exists in `src/Modules/DevPortal/`:
`WebhookDispatcher` (HMAC signing + 3x exponential backoff + envelope `{id,event,data,timestamp}` + headers `X-Webhook-Signature / X-Webhook-Event / X-Webhook-Id`), `WebhookSecret` (HMAC-SHA256 sign/verify value object), and `WebhookConfig` / `WebhookConfigMapper` / `WebhookConfigRepository` as reference patterns. The locked plan (D-01) is to **promote** those primitives into `src/Foundation/` as payload-agnostic shared infrastructure and consume them from both DevPortal and Alerts.

The net-new work is: (1) a new `WebhookEndpoint` aggregate + repository scoped to Alerts (org-level, max 5/org, system-generated secret), (2) a URL value object enforcing HTTPS + SSRF defense (IPv4/IPv6 private range + DNS rebinding guard), (3) an `alert_deliveries` audit table replacing the JSON `recipients` column on `alert_events` as the authoritative per-channel delivery record, (4) per-(channel, target) dedup replacing the org-wide `AlertConfig.last_alerted_tier` dedup from Phase 13, (5) a "send test" endpoint and manual "resend" action, (6) the unified `/alerts` page with three tabs (Budgets | Webhooks | History) — Phase 13 backend only, frontend is built now.

**Primary recommendation:** Do NOT fork a second dispatcher. Move `WebhookDispatcher` + `WebhookSecret` into `src/Foundation/Infrastructure/Services/Webhook/` and introduce an `IWebhookDispatcher` port in `src/Foundation/Infrastructure/Ports/`. Keep the existing envelope. Build Alerts-side `WebhookEndpoint` aggregate + SSRF-aware `WebhookUrl` VO. Extend `SendAlertService` to fan-out email + webhooks in parallel via `Promise.allSettled`, recording each attempt to `alert_deliveries`. Switch dedup to per-(channel, target) by querying `alert_deliveries.status='sent'` rather than mutating `AlertConfig`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Infrastructure Reuse**
- **D-01:** 將現有 `WebhookDispatcher` 與 `WebhookSecret` 從 `src/Modules/DevPortal/` 提升（移動）至 `src/Foundation/` 或 `src/Shared/`，改為 **generic / payload-agnostic** 共用 infrastructure。原本 DevPortal 的寫死 envelope `{id, event, data, timestamp}` 可保留為預設或由呼叫端組裝；dispatcher 只負責「接收 body + secret + url → POST 並簽名 + 重試」。DevPortal 與 Alerts 兩模組都從同一處 import。
- **D-02:** Webhook payload 沿用現有 envelope `{id, event, data, timestamp}` + headers `X-Webhook-Signature`, `X-Webhook-Event`, `X-Webhook-Id`。Alert 專用 schema：
  - `event`: `"alert.threshold.breached"`（正式）/ `"alert.test"`（測試按鈕用）
  - `data`: `{ orgId, orgName, tier: "warning"|"critical", budgetUsd, actualCostUsd, percentage, month, alertEventId }`

**Webhook Config Model**
- **D-03:** 每個 organization 可註冊最多 **5 個 webhook endpoints**。每個 endpoint：`id`, `orgId`, `url`, `secret`, `active` (boolean), `description` (optional), `createdAt`, `lastSuccessAt`, `lastFailureAt`。多重 endpoints 平行 dispatch（Promise.allSettled）。
- **D-04:** Secret 為系統產生（32-byte hex），建立時顯示一次、之後僅顯示遮罩或「Rotate」按鈕重新產生；不讓使用者自訂 secret。

**URL Validation**
- **D-05:** HTTPS 強制；本地開發環境透過 env flag 可放寬為允許 `http`。
- **D-06:** SSRF 防護：拒絕 `localhost`、`127.0.0.0/8`、`10.0.0.0/8`、`172.16.0.0/12`、`192.168.0.0/16`、`169.254.0.0/16`、`0.0.0.0`、IPv6 loopback/link-local。解析 DNS 後也要檢查；解析失敗亦拒絕。
- **D-07:** 「送測試」按鈕：設定頁可針對任一 endpoint 立即派送 `event: "alert.test"` 的假 payload；測試請求不寫入 `alert_deliveries`（或以特殊 status 分離可查）。

**Dedup Strategy**
- **D-08:** Per-channel 獨立去重。不重用 Phase 13 `AlertConfig.last_alerted_tier` / `last_alerted_at`（整個 org 維度）。改為 per-(channel, target) 獨立追蹤最近成功 tier：Email key = (orgId, 'email')；Webhook key = (orgId, endpoint_id)。
- **D-09:** 「成功」定義為 `alert_deliveries.status = 'sent'`。只要有過一次成功即鎖該 (channel, target, month, tier)；後續 sync 不再 re-dispatch 該 tier。

**Delivery & Failure Handling**
- **D-10:** 新增 `alert_deliveries` 資料表（權威遞送紀錄；`alert_events` 保留為 threshold 突破事件）：
  ```
  alert_deliveries (id, alert_event_id FK, channel ('email'|'webhook'), target,
    target_url, status ('pending'|'sent'|'failed'), attempts, status_code,
    error_message, dispatched_at, delivered_at, created_at)
  ```
- **D-11:** Dispatcher 內建 3 次指數退避（沿用現有）。3 次都失敗 → `status='failed'`，寫入 `status_code` 與 `error_message`。不做自動 DLQ / cron retry。
- **D-12:** History UI 提供手動重送按鈕，針對失敗的 delivery row 重新 dispatch，產生新的 `alert_deliveries` row（舊 row 保留為歷史）。

**UI / Integration**
- **D-13:** 整合入統一 `/alerts` 頁面，tabs：`Budgets` | `Webhooks` | `History`。
- **D-14:** History tab 為統一時間軸：`alert_events`（最新在上），每筆展開顯示 per-channel `alert_deliveries`。
- **D-15:** 權限：所有 Alert / Webhook CRUD 要求 `requireOrganizationContext()` + organization manager role。

**Post-Sync Integration**
- **D-16:** `SendAlertService` 改為同時處理 email + webhook：建立 `AlertEvent` → 依 per-channel dedup 決定 dispatch → Email dispatch（寫 `alert_deliveries`）→ 平行 dispatch all active webhooks（各寫 `alert_deliveries`）。
- **D-17:** Dispatch 為 fire-and-forget（sync 完成後 async），不阻塞 BifrostSync 主流程；dispatcher 拋例外需 catch 並記錄為 `status='failed'`。

### Claude's Discretion

- Foundation 內 WebhookDispatcher 的確切位置（`src/Foundation/Infrastructure/Services/` vs `src/Shared/Infrastructure/`）
- `WebhookEndpoint` aggregate 內部結構（Entity vs Aggregate 選擇）
- Test dispatch 實作細節（是否寫入 alert_deliveries、或僅 in-memory response）
- SSRF IP 檢查實作（可用現有 lib 或手寫 `net` module 範圍判斷）
- History UI 分頁 / 篩選 / 排序互動細節

### Deferred Ideas (OUT OF SCOPE)

- ALRT-09 自動 retry with exponential backoff + DLQ（v2；本階段只用內建 3 次 + 手動 UI 重送）
- ALRT-10 Custom alert rule builder（v2）
- Tier-based endpoint routing（warning 與 critical 送不同 URL）
- 自訂 payload schema / headers per endpoint
- Webhook recipient configuration UI
- 跨 org / shared webhook endpoints
- Slack / PagerDuty 原生整合
- Webhook event subscription（只接收特定 tier / event）
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **ALRT-06** | User can register webhook endpoints for alert notifications (MVP) | `WebhookEndpoint` aggregate + `DrizzleWebhookEndpointRepository` + CRUD controller at `/api/organizations/:orgId/alerts/webhooks` with HTTPS + SSRF-validated `WebhookUrl` VO; max 5/org enforced in `SetWebhookEndpointService`. Reuses DevPortal's `WebhookConfig` mapper/repository pattern as the template (see Code Examples). |
| **ALRT-07** | Webhook payloads signed with HMAC-SHA256 | `WebhookSecret` (already implemented in DevPortal, proven by `WebhookDispatcher.test.ts`) promoted to Foundation. `sign(body)` returns hex digest sent in `X-Webhook-Signature` header. Verification path already exists: `secret.verify(body, signature)`. Alert envelope per D-02 identical to DevPortal envelope, so existing dispatcher needs zero signing changes. |
| **ALRT-08** | User can view alert history + delivery status | New `alert_deliveries` table (per-channel delivery row) joined to `alert_events`. New `GetAlertHistoryService` returns paginated alert_events with embedded deliveries. `History` tab renders unified timeline; `ResendDeliveryService` allows manual retry of failed rows. `alert_events.recipients` column becomes deprecated (kept for backfill; new writes go to `alert_deliveries`). |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Bun built-in `crypto`** | runtime | `createHmac('sha256', secret)` for signing + `timingSafeEqual` for verify | Already used by existing `WebhookSecret` VO — zero new deps |
| **Bun built-in `fetch`** | runtime | HTTP POST to webhook URLs | Already used by `WebhookDispatcher` — works under Bun natively |
| **Bun built-in `dns/promises`** (`dns.lookup`) | runtime | SSRF defense — resolve hostname and validate resolved IP | Native Node/Bun API, no dependency needed |
| **Bun built-in `net`** (`net.isIP`, manual range check) | runtime | CIDR range check for private/loopback IPs | Sufficient for the fixed RFC1918 / loopback / link-local list in D-06 |
| **drizzle-orm** | 0.45.1 (existing) | `webhook_endpoints` + `alert_deliveries` schema + queries | Already used by Alerts and entire project |
| **decimal.js** | 10.6.0 (existing) | Cost math in alert payload (`budgetUsd`, `actualCostUsd`, `percentage`) | Established Phase 13 convention |
| **zod** (via `@gravito/impulse` FormRequest) | existing | Register/update webhook request validation | Established project convention |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ipaddr.js` | 2.2.0 | CIDR matching helper (optional) | Only if manual range checks get unwieldy. Training-data assumption — **verify before adding**. Confident manual check matches D-06's fixed list is simpler. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Promoting existing `WebhookDispatcher` to Foundation | Fork a second webhook dispatcher in `src/Modules/Alerts/Infrastructure/` | D-01 explicitly locks promote-and-share. Forking duplicates maintenance of retry/signing logic. |
| Adding `ipaddr.js` | Hand-roll octet parsing for the D-06 list | D-06 is a fixed, small list; manual check in ~30 lines is simpler than a new dep. Project has "no new deps" soft constraint from v1.2 optimization milestone. |
| Hex string (current `WebhookSecret`) | base64url-encoded secret | Interop consistency with DevPortal existing format; `X-Webhook-Signature` consumers already reading hex. |
| Storing secret plaintext | Hash secret at rest | Secret must be verifiable on *send* (not receive), so we must be able to reproduce the HMAC — plaintext (or reversible encryption) is required. Existing DevPortal stores plaintext in `webhook_configs.secret`. Acceptable trade-off; document in ADR. |

**Installation:** No new runtime dependencies required (all locked decisions rely on Bun built-ins + existing libs).

**Version verification:** Skipped — no net-new packages. Existing `drizzle-orm@0.45.1` and `decimal.js@10.6.0` were verified during Phase 13 research.

## Architecture Patterns

### Recommended Structure

```
src/Foundation/Infrastructure/
├── Ports/
│   └── IWebhookDispatcher.ts           # NEW — payload-agnostic dispatch port
└── Services/
    └── Webhook/
        ├── WebhookDispatcher.ts         # MOVED from DevPortal, refactored to IWebhookDispatcher
        ├── WebhookSecret.ts             # MOVED from DevPortal (value object, HMAC-SHA256)
        └── WebhookEnvelope.ts           # NEW — `{id,event,data,timestamp}` builder (or inlined)

src/Modules/Alerts/
├── Domain/
│   ├── Aggregates/
│   │   └── WebhookEndpoint.ts           # NEW — immutable aggregate (activate/deactivate/rotateSecret)
│   ├── Entities/
│   │   └── AlertDelivery.ts             # NEW — per-channel delivery row
│   ├── ValueObjects/
│   │   ├── WebhookUrl.ts                # NEW — HTTPS + SSRF validation
│   │   └── DeliveryStatus.ts            # NEW — 'pending' | 'sent' | 'failed'
│   └── Repositories/
│       ├── IWebhookEndpointRepository.ts
│       └── IAlertDeliveryRepository.ts
├── Application/
│   ├── Services/
│   │   ├── RegisterWebhookEndpointService.ts    # Create; enforce 5-per-org, HTTPS, SSRF
│   │   ├── UpdateWebhookEndpointService.ts      # Toggle active / update description
│   │   ├── RotateWebhookSecretService.ts        # Returns new plaintext (one-time)
│   │   ├── DeleteWebhookEndpointService.ts
│   │   ├── TestWebhookEndpointService.ts        # Synchronous test dispatch
│   │   ├── DispatchAlertWebhooksService.ts      # Per-alert fan-out (called by SendAlertService)
│   │   ├── GetAlertHistoryService.ts            # List alert_events + deliveries
│   │   └── ResendDeliveryService.ts             # Manual retry of failed delivery row
│   └── DTOs/
│       ├── WebhookEndpointDTO.ts
│       └── AlertHistoryDTO.ts
├── Infrastructure/
│   ├── Repositories/
│   │   ├── DrizzleWebhookEndpointRepository.ts
│   │   └── DrizzleAlertDeliveryRepository.ts
│   ├── Mappers/
│   │   ├── WebhookEndpointMapper.ts
│   │   └── AlertDeliveryMapper.ts
│   └── Providers/
│       └── AlertsServiceProvider.ts    # MODIFIED — register new bindings + subscribe webhook dispatch handler
├── Presentation/
│   ├── Controllers/
│   │   ├── WebhookEndpointController.ts
│   │   └── AlertHistoryController.ts
│   ├── Routes/
│   │   └── alert.routes.ts              # MODIFIED — add webhook + history routes
│   └── Requests/
│       ├── RegisterWebhookEndpointRequest.ts
│       └── UpdateWebhookEndpointRequest.ts
└── __tests__/
    ├── WebhookEndpoint.test.ts
    ├── WebhookUrl.test.ts                # SSRF + HTTPS cases
    ├── DispatchAlertWebhooksService.test.ts
    ├── GetAlertHistoryService.test.ts
    └── ResendDeliveryService.test.ts

resources/js/Pages/Member/Alerts/
├── Index.tsx                             # NEW — tabs container (Budgets | Webhooks | History)
├── tabs/
│   ├── BudgetsTab.tsx                    # Wraps Phase 13 budget backend (new frontend)
│   ├── WebhooksTab.tsx                   # CRUD + test button
│   └── HistoryTab.tsx                    # Timeline + per-channel delivery rows + resend
└── components/
    ├── WebhookEndpointForm.tsx
    ├── SecretRevealModal.tsx             # Shows plaintext secret one time
    └── DeliveryStatusBadge.tsx
```

### Pattern 1: Promoted `IWebhookDispatcher` Port (D-01)

**What:** Payload-agnostic port that accepts url/secret/body + headers. Envelope construction moves to the caller (Alerts builds its envelope, DevPortal builds its envelope — both identical shape but different `event` values).

**Example:**
```typescript
// src/Foundation/Infrastructure/Ports/IWebhookDispatcher.ts
import type { WebhookSecret } from '@/Foundation/Infrastructure/Services/Webhook/WebhookSecret'

export interface WebhookDispatchRequest {
  readonly url: string
  readonly secret: WebhookSecret
  readonly eventType: string
  readonly payload: Record<string, unknown>
}

export interface WebhookDispatchResult {
  readonly success: boolean
  readonly statusCode?: number
  readonly error?: string
  readonly attempts: number
  readonly webhookId: string     // NEW — propagated for alert_deliveries.target linkage
}

export interface IWebhookDispatcher {
  dispatch(request: WebhookDispatchRequest): Promise<WebhookDispatchResult>
}
```

**Migration:** Update `WebhookDispatcher` to implement the port, return `webhookId` (it already generates `crypto.randomUUID()` for the envelope — just expose it in the result). DevPortal consumers update their imports from `@/Modules/DevPortal/Infrastructure/Services/WebhookDispatcher` → `@/Foundation/Infrastructure/Services/Webhook/WebhookDispatcher`.

### Pattern 2: `WebhookUrl` Value Object with SSRF Defense (D-05, D-06)

**What:** Constructor validates scheme + parses hostname + resolves DNS + rejects private/loopback/link-local ranges. Immutable; throws on invalid.

**Example:**
```typescript
// src/Modules/Alerts/Domain/ValueObjects/WebhookUrl.ts
import { promises as dns } from 'node:dns'
import { isIP } from 'node:net'

const PRIVATE_IPV4_RANGES: Array<[number, number, number]> = [
  // [octet1, octet2mask, octet2value] — simplified match rules
]

export class WebhookUrl {
  private constructor(public readonly value: string) {}

  static async create(raw: string, allowHttp = false): Promise<WebhookUrl> {
    const parsed = new URL(raw)  // throws on invalid
    if (parsed.protocol !== 'https:' && !(allowHttp && parsed.protocol === 'http:')) {
      throw new Error('Webhook URL must use HTTPS')
    }
    await WebhookUrl.assertSafeHost(parsed.hostname)
    return new WebhookUrl(parsed.toString())
  }

  private static async assertSafeHost(host: string): Promise<void> {
    // Short-circuit literal hostnames
    if (host === 'localhost' || host === '0.0.0.0') throw new Error('SSRF: localhost rejected')
    // Literal IP? check immediately
    if (isIP(host)) {
      WebhookUrl.assertIpNotPrivate(host)
      return
    }
    // Resolve and check every A/AAAA record (DNS rebinding guard)
    try {
      const records = await dns.lookup(host, { all: true })
      for (const r of records) WebhookUrl.assertIpNotPrivate(r.address)
    } catch {
      throw new Error('SSRF: DNS resolution failed')
    }
  }

  private static assertIpNotPrivate(ip: string): void {
    if (WebhookUrl.isPrivateOrLoopback(ip)) {
      throw new Error(`SSRF: ${ip} is private/loopback`)
    }
  }

  // Checks: 10/8, 172.16/12, 192.168/16, 127/8, 169.254/16, 0.0.0.0, ::1, fe80::/10, fc00::/7
  private static isPrivateOrLoopback(ip: string): boolean {
    // manual octet parsing per D-06 list
    // ... (implementation — ~30 lines)
    return false // placeholder
  }
}
```

**Dev-mode escape hatch:** `WEBHOOK_ALLOW_HTTP=1` env flag read by `RegisterWebhookEndpointService` and passed as `allowHttp=true`. Never bypass SSRF even in dev — only loosen the HTTPS requirement.

### Pattern 3: Per-(Channel, Target) Dedup via `alert_deliveries` Query (D-08, D-09)

**What:** Replace `AlertConfig.needsAlert()` org-wide check with a query against `alert_deliveries` filtered by `(alert_event.org_id, channel, target, month, tier)`. An alert needs dispatching to a channel+target if there's **no** row with `status='sent'` for that (org, month, tier, channel, target).

**Example:**
```typescript
// In DispatchAlertWebhooksService (and mirror logic for email in SendAlertService)
async hasAlreadyDelivered(
  orgId: string, month: string, tier: 'warning'|'critical',
  channel: 'email'|'webhook', target: string,
): Promise<boolean> {
  return this.deliveryRepo.existsSent({ orgId, month, tier, channel, target })
}
```

**Phase 13 migration:** `AlertConfig.lastAlertedTier/lastAlertedAt/lastAlertedMonth` columns become informational only (or removed in a cleanup plan). Dedup source of truth shifts to `alert_deliveries`. Backfill: one-time migration that reads existing `alert_events` + `alert_events.recipients` JSON → writes legacy rows into `alert_deliveries` with `channel='email'`, `status='sent'`, `target=<each email>` so history remains contiguous.

### Pattern 4: Test Dispatch Endpoint (D-07)

**What:** `POST /api/organizations/:orgId/alerts/webhooks/:endpointId/test` → synchronously dispatches a fake payload (`event: 'alert.test'`, `data: { message: 'Test webhook from Draupnir' }`), returns `{ success, statusCode, error, attempts }` to the UI.

**Claude's discretion choice:** **Do NOT write test dispatches to `alert_deliveries`.** Reason: test button is a setup-time diagnostic, not an alert delivery — mixing them would pollute the history timeline. The HTTP response suffices as feedback; users re-run on demand.

### Pattern 5: Parallel Fan-out with `Promise.allSettled` (D-03, D-17)

**What:** `SendAlertService.send()` orchestrates email + N webhook dispatches in parallel. Each settled result (fulfilled or rejected) writes its own `alert_deliveries` row. Rejections are caught and recorded as `status='failed'`.

**Example:**
```typescript
const results = await Promise.allSettled([
  this.dispatchEmail(event),
  ...endpoints.map((ep) => this.dispatchWebhook(event, ep)),
])
for (const r of results) {
  // each inner method has its own try/catch and writes alert_deliveries internally
  // allSettled guarantees no one failure aborts the others
}
```

### Pattern 6: Resend Flow (D-12)

**What:** `POST /api/organizations/:orgId/alerts/deliveries/:deliveryId/resend` → load original `alert_delivery` + its `alert_event` → rehydrate payload → dispatch → write a **new** `alert_deliveries` row (old row preserved; UI groups by `alert_event_id`).

**Constraint:** Only `status='failed'` rows are resendable. Endpoint must be gone-tolerant — if the `webhook_endpoints` row was deleted after the failure, the resend uses the snapshotted `target_url` + loads the secret from... **trap:** we need the secret. Solution: `alert_deliveries` stores `target_url` but NOT the secret. On resend, look up the current endpoint by `target` (endpoint_id). If the endpoint no longer exists, return a 410 Gone with a clear error. (Alternative: snapshot secret at dispatch time — but that duplicates a sensitive value and complicates rotation. Better to require the endpoint to still exist.)

### Anti-Patterns to Avoid

- **Mutating `WebhookEndpoint` aggregate:** `activate()` / `rotateSecret()` return new instances per project immutability rule.
- **Storing plaintext secret in logs or `alert_deliveries.error_message`:** Never include the secret in any log output or error field.
- **Signing the payload client-side in the frontend:** Signing happens server-side. Frontend only displays signature for debugging if ever needed.
- **Blocking BifrostSync on webhook dispatch:** D-17 mandates fire-and-forget. If the dispatch queue is slow, sync must return to the caller immediately. Use `queueMicrotask` or `setImmediate` pattern, or fully detach via the existing `DomainEventDispatcher` handler (already async).
- **Mixing DevPortal and Alerts envelopes:** Both use the same envelope *shape*, but `event` values live in different namespaces (`alert.*` vs `application.*` / `credit.*`). Do not reuse `WebhookEventType` enum from DevPortal — Alerts defines its own string literals.
- **Re-querying DNS on every dispatch:** DNS validation happens on **registration** (and on any URL update). Dispatch time trusts the stored URL. (Accept the DNS rebinding trade-off documented in Pitfall 3.)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC-SHA256 sign/verify | Custom `crypto.createHash('sha256')` | Existing `WebhookSecret` VO (Bun `crypto.createHmac`) | Already tested; `timingSafeEqual` prevents signature oracle attacks |
| HTTP retry with exponential backoff | Custom while loop | Existing `WebhookDispatcher` (100ms × 2^attempt, 3 attempts) | Proven in DevPortal tests |
| Webhook envelope structure | Custom payload format | Existing `{id, event, data, timestamp}` envelope | D-02 locks reuse; receivers already expect DevPortal format |
| URL parsing | Manual regex | `new URL(raw)` | Built-in, handles IDN/IPv6/userinfo correctly |
| IP literal detection | Regex | `net.isIP(str)` returns 4/6/0 | Built-in Bun/Node |
| DNS resolution | Custom DNS client | `dns/promises.lookup(host, {all: true})` | Native API; `{all:true}` returns every record so DNS rebinding is detectable |
| UUID for delivery id / webhook_id | Custom id generator | `crypto.randomUUID()` | Already project convention |
| Cost arithmetic in alert payload | Native `number` | `decimal.js` | Phase 13 precedent; preserves precision across the wire |

**Key insight:** Phase 15 is a **composition** phase. Almost every capability exists somewhere in the codebase or the runtime. The valuable engineering work is (a) correctly **promoting** existing assets, (b) writing the **SSRF guard** carefully (easy to get subtly wrong), and (c) designing `alert_deliveries` to be the clean authority for per-channel state.

## Common Pitfalls

### Pitfall 1: Forgetting to Update DevPortal Imports When Moving WebhookDispatcher

**What goes wrong:** Move `WebhookDispatcher` to Foundation but leave DevPortal importing the old path → TypeScript compile error, or worse, duplicate classes if the old file is copied instead of moved.

**Why it happens:** `git mv` is correct; `cp` + manual edit is not.

**How to avoid:** Grep all imports of `@/Modules/DevPortal/Infrastructure/Services/WebhookDispatcher` and `@/Modules/DevPortal/Domain/ValueObjects/WebhookSecret` across `src/` and `tests/` before the move. Update in a single commit. Move tests too: `WebhookDispatcher.test.ts` and `WebhookSecret.test.ts` belong with the code at the new Foundation location.

**Warning signs:** `bun run typecheck` fails after the move; tests in DevPortal reference a class that no longer lives there.

### Pitfall 2: SSRF Bypass via DNS Rebinding Between Registration and Dispatch

**What goes wrong:** At registration, `evil.com` resolves to a public IP and passes validation. At dispatch time, the attacker flips DNS to `127.0.0.1` and the webhook POST hits the internal metadata service / localhost service.

**Why it happens:** Node/Bun `fetch` resolves DNS at request time, independently of our validation at registration time.

**How to avoid:** Two-layer defense:
1. **Registration-time check** — the URL value object validation (Pattern 2) prevents the obvious case.
2. **Dispatch-time check (optional but recommended)** — resolve the hostname again right before `fetch` and assert the resolved IP is still non-private. If mismatched, write `status='failed'` with a specific `error_message: 'DNS rebinding detected'` and abort.

If we skip dispatch-time re-validation, document it as an accepted residual risk (SSRF risk is mitigated by outbound network egress policy in production). At minimum, the MVP must do registration-time validation.

**Warning signs:** A webhook URL whose DNS A record TTL is suspiciously low (<60s) should raise a flag during investigation.

### Pitfall 3: Secret Rotation Races with In-flight Dispatch

**What goes wrong:** User clicks "Rotate Secret" at the same moment an alert is firing. The dispatch uses the *old* secret; the receiver has already updated their verification logic to the *new* secret; signatures mismatch.

**Why it happens:** Rotation is a write against `webhook_endpoints.secret` and dispatch is a read — with no coordination, they can interleave.

**How to avoid:** Acceptable MVP answer: document that rotation immediately invalidates in-flight dispatches, and receivers should accept a short grace period by verifying against *both* the old and new secret during rotation. Alternatively (fancier, probably out of scope for MVP): support two active secrets per endpoint during a grace window. **Recommendation:** document the behavior, don't build multi-secret support.

**Warning signs:** User reports alerts stopped working right after clicking "Rotate".

### Pitfall 4: `Promise.allSettled` Swallowing Programming Errors

**What goes wrong:** A TypeError in `dispatchWebhook` (e.g., `endpoint.url.value` typo) becomes a rejected promise buried in the settled results — silently writes `status='failed'` with a confusing error message. Real bug never surfaces.

**Why it happens:** `Promise.allSettled` catches *all* rejections, including programmer errors.

**How to avoid:** Inside `dispatchWebhook`, wrap only the network call in try/catch. Let programming errors throw naturally — then they surface via the global unhandled rejection handler during dev/test. Specifically: do NOT wrap the entire body of `dispatchWebhook` in try/catch; only the actual I/O boundary.

**Warning signs:** Tests pass but production logs show cryptic `alert_deliveries.error_message` values referencing property access on undefined.

### Pitfall 5: `alert_events.recipients` Column Drift

**What goes wrong:** Phase 13 writes to `alert_events.recipients` JSON. Phase 15 introduces `alert_deliveries` as the authority. If we forget to stop writing `alert_events.recipients` (or forget to write `alert_deliveries` in one code path), history becomes inconsistent.

**Why it happens:** Two sources of truth is always a trap.

**How to avoid:** Pick one authority and stick to it. Recommendation: stop writing `alert_events.recipients` in Phase 15; backfill from it once during migration; mark it for removal in a Phase 16 cleanup. The `AlertEvent` entity should have the `recipients` getter either marked deprecated or removed.

**Warning signs:** History page shows email recipients in one format and webhook deliveries in another because they're pulled from different columns.

### Pitfall 6: Forgetting Max-5-Per-Org Enforcement on Race

**What goes wrong:** User clicks "Create Webhook" 6 times rapidly. Each request reads current count (4), passes the <5 check, and inserts. Now 10 endpoints exist.

**Why it happens:** Count-then-insert is not atomic.

**How to avoid:** Either (a) a DB unique index on `(org_id, ordinal_slot)` with slot 1..5, or (b) enforce inside a transaction that counts and inserts in one statement. Simpler for SQLite: `INSERT INTO ... WHERE (SELECT COUNT(*) FROM webhook_endpoints WHERE org_id = ?) < 5`. If Drizzle can't express that cleanly, use a BEGIN IMMEDIATE transaction.

**Warning signs:** An org has 6+ endpoints despite the MVP limit.

### Pitfall 7: UI Reveals Secret After Page Reload

**What goes wrong:** User creates a webhook, secret is shown in a modal. User reloads the page, expects to see it again — but we said "shown once". If the backend returns the secret on subsequent GETs, the one-time contract is broken and users come to rely on it.

**Why it happens:** Controllers often return the full entity including sensitive fields.

**How to avoid:** `WebhookEndpointDTO` for GET responses masks the secret (`secret: 'whsec_****...abc4'`, showing last 4 chars only). Only the immediate response of `POST /webhooks` and `POST /webhooks/:id/rotate` returns the plaintext — once. Rely on a separate DTO (`WebhookEndpointWithSecretDTO`) for those two endpoints.

**Warning signs:** Browser DevTools Network tab shows plaintext secret in a GET response.

## Code Examples

### Reused: `WebhookDispatcher.dispatch` (DevPortal, to be promoted)

```typescript
// Existing — src/Modules/DevPortal/Infrastructure/Services/WebhookDispatcher.ts
// Target location: src/Foundation/Infrastructure/Services/Webhook/WebhookDispatcher.ts
async dispatch(request: DispatchRequest): Promise<DispatchResult> {
  const webhookPayload = {
    id: crypto.randomUUID(),
    event: request.eventType,
    data: request.payload,
    timestamp: new Date().toISOString(),
  }
  const body = JSON.stringify(webhookPayload)
  const signature = request.secret.sign(body)

  for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
    try {
      const response = await fetch(request.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': request.eventType,
          'X-Webhook-Id': webhookPayload.id,
        },
        body,
      })
      if (response.ok) return { success: true, statusCode: response.status, attempts: attempt }
      if (attempt < this.maxRetries) await this.delay(attempt)
      else return { success: false, statusCode: response.status, error: `HTTP ${response.status}`, attempts: attempt }
    } catch (error: unknown) {
      if (attempt < this.maxRetries) await this.delay(attempt)
      else {
        const message = error instanceof Error ? error.message : 'Unknown'
        return { success: false, error: message, attempts: attempt }
      }
    }
  }
  return { success: false, error: 'Exceeded retries', attempts: this.maxRetries }
}
private delay(attempt: number) { return new Promise(r => setTimeout(r, 100 * 2 ** (attempt - 1))) }
```

**Adjustment for Phase 15:** Expose `webhookPayload.id` in the result (`webhookId`) so `alert_deliveries.target` can record which payload id landed at the receiver.

### New: `WebhookEndpoint` Aggregate

```typescript
// src/Modules/Alerts/Domain/Aggregates/WebhookEndpoint.ts
interface WebhookEndpointProps {
  readonly id: string
  readonly orgId: string
  readonly url: string
  readonly secret: string  // plaintext; never exposed via DTO except on create/rotate
  readonly active: boolean
  readonly description: string | null
  readonly createdAt: string
  readonly lastSuccessAt: string | null
  readonly lastFailureAt: string | null
}

export class WebhookEndpoint {
  private constructor(private readonly props: WebhookEndpointProps) {}

  static create(orgId: string, url: string, description?: string | null): WebhookEndpoint {
    return new WebhookEndpoint({
      id: crypto.randomUUID(),
      orgId,
      url,
      secret: 'whsec_' + [...crypto.getRandomValues(new Uint8Array(32))]
        .map(b => b.toString(16).padStart(2, '0')).join(''),
      active: true,
      description: description ?? null,
      createdAt: new Date().toISOString(),
      lastSuccessAt: null,
      lastFailureAt: null,
    })
  }

  activate(): WebhookEndpoint { return new WebhookEndpoint({ ...this.props, active: true }) }
  deactivate(): WebhookEndpoint { return new WebhookEndpoint({ ...this.props, active: false }) }

  rotateSecret(): WebhookEndpoint {
    const newSecret = 'whsec_' + [...crypto.getRandomValues(new Uint8Array(32))]
      .map(b => b.toString(16).padStart(2, '0')).join('')
    return new WebhookEndpoint({ ...this.props, secret: newSecret })
  }

  recordSuccess(at: string): WebhookEndpoint { return new WebhookEndpoint({ ...this.props, lastSuccessAt: at }) }
  recordFailure(at: string): WebhookEndpoint { return new WebhookEndpoint({ ...this.props, lastFailureAt: at }) }

  get id() { return this.props.id }
  get orgId() { return this.props.orgId }
  get url() { return this.props.url }
  get secret() { return this.props.secret }
  get active() { return this.props.active }
  get description() { return this.props.description }
  get createdAt() { return this.props.createdAt }
  get lastSuccessAt() { return this.props.lastSuccessAt }
  get lastFailureAt() { return this.props.lastFailureAt }
}
```

### New: Drizzle Schema Additions

```typescript
// Append to src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts
export const webhookEndpoints = sqliteTable(
  'webhook_endpoints',
  {
    id: text('id').primaryKey(),
    org_id: text('org_id').notNull(),
    url: text('url').notNull(),
    secret: text('secret').notNull(),           // plaintext; see Pitfall 7 for DTO masking
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    description: text('description'),
    created_at: text('created_at').notNull(),
    last_success_at: text('last_success_at'),
    last_failure_at: text('last_failure_at'),
  },
  (table) => [
    index('idx_webhook_endpoints_org_id').on(table.org_id),
    index('idx_webhook_endpoints_org_active').on(table.org_id, table.active),
  ],
)

export const alertDeliveries = sqliteTable(
  'alert_deliveries',
  {
    id: text('id').primaryKey(),
    alert_event_id: text('alert_event_id').notNull(),   // FK alert_events.id
    channel: text('channel').notNull(),                  // 'email' | 'webhook'
    target: text('target').notNull(),                    // email address OR webhook endpoint_id
    target_url: text('target_url'),                      // URL snapshot for webhooks (null for email)
    status: text('status').notNull(),                    // 'pending' | 'sent' | 'failed'
    attempts: integer('attempts').notNull().default(0),
    status_code: integer('status_code'),
    error_message: text('error_message'),
    dispatched_at: text('dispatched_at').notNull(),
    delivered_at: text('delivered_at'),
    created_at: text('created_at').notNull(),
  },
  (table) => [
    index('idx_alert_deliveries_event_id').on(table.alert_event_id),
    index('idx_alert_deliveries_channel_target').on(table.channel, table.target),
    index('idx_alert_deliveries_dedup').on(table.alert_event_id, table.channel, table.target, table.status),
  ],
)
```

**Migration note:** Use the existing migration pipeline (`bun orbit migrate`). Include a one-time backfill script that reads `alert_events.recipients` JSON and inserts `alert_deliveries` rows with `channel='email', status='sent'` so Phase 13 history appears correctly in the new History tab.

### New: Alert Webhook Envelope (D-02)

```typescript
// Assembled by DispatchAlertWebhooksService before handing to IWebhookDispatcher
const payload = {
  orgId: event.orgId,
  orgName,
  tier: event.tier,                // 'warning' | 'critical'
  budgetUsd: event.budgetUsd,
  actualCostUsd: event.actualCostUsd,
  percentage: event.percentage,
  month: event.month,
  alertEventId: event.id,
}
await dispatcher.dispatch({
  url: endpoint.url,
  secret: WebhookSecret.fromExisting(endpoint.secret),
  eventType: 'alert.threshold.breached',
  payload,
})
```

### New: Routes

```typescript
// src/Modules/Alerts/Presentation/Routes/alert.routes.ts (additions)
// Existing: /api/organizations/:orgId/alerts/budget (GET, PUT)

router.get('/api/organizations/:orgId/alerts/webhooks', orgAccess, (ctx) => webhookCtrl.list(ctx))
router.post('/api/organizations/:orgId/alerts/webhooks', orgAccess, RegisterWebhookEndpointRequest, (ctx) => webhookCtrl.create(ctx))
router.patch('/api/organizations/:orgId/alerts/webhooks/:endpointId', orgAccess, UpdateWebhookEndpointRequest, (ctx) => webhookCtrl.update(ctx))
router.post('/api/organizations/:orgId/alerts/webhooks/:endpointId/rotate-secret', orgAccess, (ctx) => webhookCtrl.rotateSecret(ctx))
router.post('/api/organizations/:orgId/alerts/webhooks/:endpointId/test', orgAccess, (ctx) => webhookCtrl.test(ctx))
router.delete('/api/organizations/:orgId/alerts/webhooks/:endpointId', orgAccess, (ctx) => webhookCtrl.delete(ctx))

router.get('/api/organizations/:orgId/alerts/history', orgAccess, (ctx) => historyCtrl.list(ctx))
router.post('/api/organizations/:orgId/alerts/deliveries/:deliveryId/resend', orgAccess, (ctx) => historyCtrl.resend(ctx))
```

All routes wrapped by `requireOrganizationContext()`. Additionally, service layer must assert manager role using the same `isManager()` check already used in `SendAlertService` (see Phase 13 `SendAlertService.ts`:34). Recommend a `requireManagerRole()` middleware helper to DRY this.

### Frontend: Tabs Container

```tsx
// resources/js/Pages/Member/Alerts/Index.tsx
export default function AlertsIndex(props: AlertsPageProps) {
  const [tab, setTab] = useState<'budgets'|'webhooks'|'history'>('budgets')
  return (
    <MemberLayout>
      <Tabs value={tab} onValueChange={setTab as any}>
        <TabsList>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="budgets"><BudgetsTab initial={props.budget} /></TabsContent>
        <TabsContent value="webhooks"><WebhooksTab endpoints={props.webhookEndpoints} /></TabsContent>
        <TabsContent value="history"><HistoryTab events={props.alertHistory} /></TabsContent>
      </Tabs>
    </MemberLayout>
  )
}
```

Register in `src/Pages/routing/member/memberPageKeys.ts` + `registerMemberPageBindings.ts` + `registerMemberPageRoutes.ts` following the same four-file pattern used by Phase 14's `CostBreakdown` page.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `alert_events.recipients` JSON column (Phase 13) | `alert_deliveries` table with per-row status (Phase 15) | This phase | Delivery authority moves to per-channel rows; enables accurate per-channel history and resend |
| Org-wide dedup in `AlertConfig.last_alerted_tier` (Phase 13) | Per-(channel, target) dedup via `alert_deliveries` queries (Phase 15) | This phase | Email success no longer masks webhook failure; each channel retries independently |
| DevPortal-only `WebhookDispatcher` | Foundation-shared `IWebhookDispatcher` port (D-01) | This phase | One signing implementation for all modules |
| No webhook alert channel | HMAC-signed webhook with 3× retry (ALRT-06, ALRT-07) | This phase | Machines can react to cost events, not just humans |

**Deprecated/outdated:**
- `alert_events.recipients` JSON column — stop writing in Phase 15; remove in a future cleanup plan.
- `AlertConfig.lastAlertedTier / lastAlertedAt / lastAlertedMonth` — dedup authority moves to `alert_deliveries`; these columns become observational metadata or get dropped in a future cleanup.

## Open Questions

1. **Where exactly does `WebhookDispatcher` live in Foundation?**
   - What we know: D-01 says Foundation or Shared.
   - What's unclear: `src/Foundation/Infrastructure/Services/Webhook/` vs `src/Shared/Infrastructure/Webhook/`.
   - Recommendation: **Foundation**. Webhook dispatch is a cross-cutting *capability*, analogous to `IMailer` which already lives at `src/Foundation/Infrastructure/Ports/IMailer.ts`. Follow the same pattern: port in `Foundation/Infrastructure/Ports/`, impl in `Foundation/Infrastructure/Services/Webhook/`, bind as `'webhookDispatcher'` singleton in `FoundationServiceProvider`.

2. **Should test dispatch write to `alert_deliveries`?**
   - What we know: D-07 allows either behavior.
   - What's unclear: Noise vs auditability.
   - Recommendation: **Do not write to `alert_deliveries`.** The HTTP response is sufficient UX feedback. The history timeline stays clean — it represents *real* alert events. If a future audit requirement arises, add a separate `webhook_test_dispatches` table.

3. **Dispatch-time DNS re-check (SSRF dispatch-layer defense)?**
   - What we know: Pitfall 2 describes the attack.
   - What's unclear: Complexity vs value for MVP.
   - Recommendation: **Ship registration-time validation only for MVP; open a v2 ticket** for dispatch-time re-check. Document the residual risk in ADR. In production, rely on network egress policy as defense-in-depth.

4. **`WebhookEndpoint`: Aggregate or Entity?**
   - What we know: Discretionary.
   - What's unclear: Purity of DDD.
   - Recommendation: **Aggregate.** It has its own invariants (max-5-per-org, HTTPS/SSRF, secret lifecycle) and its own repository. No child entities needed for MVP.

5. **Per-key breakdown in webhook payload?**
   - What we know: Phase 13 email templates include per-key breakdown (per `SendAlertService`).
   - What's unclear: Whether webhook `data` should also include it.
   - Recommendation: **Keep webhook payload minimal (D-02 spec as-is), no per-key breakdown.** Users who want per-key detail can hit the dashboard via `alertEventId`. Avoids payload bloat and schema drift between email and webhook.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun runtime (`crypto`, `fetch`, `dns/promises`, `net`) | All webhook logic | ✓ | Bun 1.x (project default) | — |
| `drizzle-orm` | New tables | ✓ | 0.45.1 | — |
| `decimal.js` | Cost math | ✓ | 10.6.0 | — |
| `@gravito/impulse` FormRequest + Zod | Request validation | ✓ | existing | — |
| SQLite (via existing adapter) | New tables | ✓ | existing | — |
| Upyo mailer binding | `mailer` singleton reused by email side of fan-out | ✓ | Phase 13 | — |
| `AlertsServiceProvider` registration in bootstrap | Boot-time subscription | ✓ | Phase 13 | — |
| `DomainEventDispatcher` (`bifrost.sync.completed`) | Fire-and-forget trigger | ✓ | Phase 13 | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

**Nothing additional to install.** All Phase 15 capabilities build on existing infrastructure.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (driven via Bun test runner) |
| Config file | `vitest.config.ts` (root) — existing |
| Quick run command | `bun test src/Modules/Alerts` |
| Full suite command | `bun test src tests/Unit packages` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ALRT-06 | Register webhook endpoint, HTTPS enforced | unit | `bun test src/Modules/Alerts/__tests__/WebhookUrl.test.ts` | ❌ Wave 0 |
| ALRT-06 | SSRF defense rejects private IPs + DNS-rebound hosts | unit | `bun test src/Modules/Alerts/__tests__/WebhookUrl.test.ts` | ❌ Wave 0 |
| ALRT-06 | Max 5 endpoints per org enforced | unit | `bun test src/Modules/Alerts/__tests__/RegisterWebhookEndpointService.test.ts` | ❌ Wave 0 |
| ALRT-06 | Secret generation is 32-byte hex with `whsec_` prefix | unit | `bun test src/Modules/Alerts/__tests__/WebhookEndpoint.test.ts` | ❌ Wave 0 |
| ALRT-07 | HMAC-SHA256 signature matches receiver-side verification | unit | `bun test src/Foundation/Infrastructure/Services/Webhook/__tests__/WebhookDispatcher.test.ts` | ✓ (migrated from DevPortal) |
| ALRT-07 | Alert payload envelope matches D-02 spec | unit | `bun test src/Modules/Alerts/__tests__/DispatchAlertWebhooksService.test.ts` | ❌ Wave 0 |
| ALRT-07 | 3× exponential backoff retry semantics | unit | `bun test src/Foundation/Infrastructure/Services/Webhook/__tests__/WebhookDispatcher.test.ts` | ✓ (migrated) |
| ALRT-08 | `alert_deliveries` row written on success and failure | unit | `bun test src/Modules/Alerts/__tests__/DispatchAlertWebhooksService.test.ts` | ❌ Wave 0 |
| ALRT-08 | History endpoint returns alert_events + embedded deliveries | integration | `bun test src/Modules/Alerts/__tests__/GetAlertHistoryService.test.ts` | ❌ Wave 0 |
| ALRT-08 | Manual resend creates new delivery row, preserves original | unit | `bun test src/Modules/Alerts/__tests__/ResendDeliveryService.test.ts` | ❌ Wave 0 |
| ALRT-08 | Per-(channel, target) dedup: email success does not suppress webhook retry | unit | `bun test src/Modules/Alerts/__tests__/DispatchAlertWebhooksService.test.ts` | ❌ Wave 0 |
| Cross | `Promise.allSettled` fan-out: one webhook failure doesn't abort others | unit | `bun test src/Modules/Alerts/__tests__/DispatchAlertWebhooksService.test.ts` | ❌ Wave 0 |
| Cross | Test dispatch returns response without writing `alert_deliveries` | unit | `bun test src/Modules/Alerts/__tests__/TestWebhookEndpointService.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `bun test src/Modules/Alerts src/Foundation/Infrastructure/Services/Webhook`
- **Per wave merge:** `bun test src tests/Unit packages`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/Foundation/Infrastructure/Services/Webhook/WebhookDispatcher.ts` — moved from DevPortal
- [ ] `src/Foundation/Infrastructure/Services/Webhook/WebhookSecret.ts` — moved from DevPortal
- [ ] `src/Foundation/Infrastructure/Ports/IWebhookDispatcher.ts` — new port
- [ ] `src/Foundation/Infrastructure/Services/Webhook/__tests__/WebhookDispatcher.test.ts` — moved from DevPortal
- [ ] `src/Foundation/Infrastructure/Services/Webhook/__tests__/WebhookSecret.test.ts` — moved from DevPortal
- [ ] `src/Modules/Alerts/Domain/Aggregates/WebhookEndpoint.ts`
- [ ] `src/Modules/Alerts/Domain/ValueObjects/WebhookUrl.ts`
- [ ] `src/Modules/Alerts/Domain/Repositories/IWebhookEndpointRepository.ts`
- [ ] `src/Modules/Alerts/Domain/Repositories/IAlertDeliveryRepository.ts`
- [ ] `src/Modules/Alerts/Domain/Entities/AlertDelivery.ts`
- [ ] `src/Modules/Alerts/Application/Services/RegisterWebhookEndpointService.ts` (+ Update/Rotate/Delete/Test)
- [ ] `src/Modules/Alerts/Application/Services/DispatchAlertWebhooksService.ts`
- [ ] `src/Modules/Alerts/Application/Services/GetAlertHistoryService.ts`
- [ ] `src/Modules/Alerts/Application/Services/ResendDeliveryService.ts`
- [ ] `src/Modules/Alerts/Infrastructure/Repositories/DrizzleWebhookEndpointRepository.ts`
- [ ] `src/Modules/Alerts/Infrastructure/Repositories/DrizzleAlertDeliveryRepository.ts`
- [ ] `src/Modules/Alerts/Infrastructure/Mappers/WebhookEndpointMapper.ts`
- [ ] `src/Modules/Alerts/Infrastructure/Mappers/AlertDeliveryMapper.ts`
- [ ] `src/Modules/Alerts/Presentation/Controllers/WebhookEndpointController.ts`
- [ ] `src/Modules/Alerts/Presentation/Controllers/AlertHistoryController.ts`
- [ ] `src/Modules/Alerts/Presentation/Requests/RegisterWebhookEndpointRequest.ts`
- [ ] `src/Modules/Alerts/Presentation/Requests/UpdateWebhookEndpointRequest.ts`
- [ ] `src/Modules/Alerts/__tests__/` — 7+ new test files (per Req map above)
- [ ] `resources/js/Pages/Member/Alerts/Index.tsx` + tabs + components
- [ ] `src/Pages/Member/MemberAlertsPage.ts` + 4-file page wiring (key, binding, route, page handler)
- [ ] Drizzle migration: `webhook_endpoints` + `alert_deliveries` + one-time backfill from `alert_events.recipients`

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **Language:** Commit messages and comments in Traditional Chinese (Taiwan); identifiers in English.
- **Immutability (CRITICAL):** All domain objects must return new instances — never mutate. Applies to `WebhookEndpoint.activate()`, `rotateSecret()`, `recordSuccess()`, etc.
- **File size:** 200–400 lines typical, 800 max. Functions < 50 lines.
- **Input validation:** All user inputs validated via Zod (via `@gravito/impulse` FormRequest pattern).
- **Error handling:** Typed service response `{ success, message, data?, error? }`.
- **No hardcoded secrets:** Webhook secret is generated, not hardcoded. Dev-mode allowances gated by env vars only.
- **Test coverage:** 80%+ target. TDD workflow preferred (RED → GREEN → REFACTOR).
- **No new deps unless necessary:** Per v1.2 optimization milestone + STATE.md. Phase 15 adds zero dependencies.
- **GSD workflow enforcement:** Per AGENTS.md — no direct repo edits outside a GSD command. Planner must wire tasks into `/gsd:execute-phase` flow.
- **Gravito skills:** Use `gravito-impulse` (FormRequest validation), `gravito-prism` (DI container), `gravito-sentinel` (middleware), `gravito-scaffold` (module structure) per their SKILL.md files.
- **Immutability applies to alerts:** `AlertConfig` already uses `.markAlerted()` → new instance; continue this pattern for `WebhookEndpoint` and `AlertDelivery`.

## Sources

### Primary (HIGH confidence)

- **Existing code (read directly):**
  - `src/Modules/DevPortal/Infrastructure/Services/WebhookDispatcher.ts` — current HMAC dispatcher impl (to be promoted)
  - `src/Modules/DevPortal/__tests__/WebhookDispatcher.test.ts` — proven test patterns (5 cases covering success, retry, failure, envelope)
  - `src/Modules/Alerts/Application/Services/SendAlertService.ts` — current email fan-out pattern + recipient resolution
  - `src/Modules/Alerts/Presentation/Routes/alert.routes.ts` — existing route style + middleware
  - `src/Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider.ts` — DI + `bifrost.sync.completed` subscription
  - `src/Modules/Alerts/Domain/Entities/AlertEvent.ts` — existing alert event entity
  - `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` — table conventions
  - `src/Foundation/Infrastructure/Ports/IMailer.ts` + `src/Foundation/Infrastructure/Services/Mail/` — template for where `IWebhookDispatcher` should live
- **Planning docs:**
  - `.planning/phases/15-webhook-alerts/15-CONTEXT.md` — locked decisions D-01 through D-17
  - `.planning/phases/13-alert-foundation-email-infrastructure/13-RESEARCH.md` — Phase 13 research (alerts module foundation)
  - `.planning/phases/13-alert-foundation-email-infrastructure/13-02-SUMMARY.md` — Phase 13 execution summary
  - `.planning/REQUIREMENTS.md` — ALRT-06, ALRT-07, ALRT-08 canonical definitions
  - `.planning/ROADMAP.md` — Phase 15 success criteria

### Secondary (MEDIUM confidence)

- Bun runtime API behavior (`crypto.randomUUID`, `crypto.getRandomValues`, `dns.lookup`, `net.isIP`) — matches Node.js Std API; verified by presence in existing code (`crypto.randomUUID()` used in `AlertEvent.create()` and `WebhookDispatcher.dispatch()`).
- DNS rebinding attack model — well-documented OWASP pattern; mitigations recommended above are standard.

### Tertiary (LOW confidence)

- `ipaddr.js@2.2.0` — version from training data; not recommended for adoption (hand-rolled check is simpler per D-06). Flagged as LOW; verify before using if plan changes direction.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all components are already in the codebase; zero new deps.
- Architecture: **HIGH** — patterns follow exactly the existing DDD module layout + Phase 13 precedent; integration points (DI, routes, domain events) are verified in source.
- Pitfalls: **HIGH** — derived from direct source inspection (`AlertConfig.recipients`, `WebhookDispatcher` envelope) and documented attack models (SSRF, DNS rebinding, signature rotation race).
- SSRF implementation specifics: **MEDIUM** — hand-rolled IP range check is straightforward but requires careful unit tests; confident the approach is correct, less confident about IPv6 edge cases without concrete testing.

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (30 days; domain is stable — signing + HTTP retry + DDD patterns don't churn fast).
