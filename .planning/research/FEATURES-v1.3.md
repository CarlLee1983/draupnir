# Feature Landscape: v1.3 Advanced Analytics & Alerts

**Project:** Draupnir (LLM Gateway)  
**Domain:** API usage monitoring, cost control, proactive notifications  
**Researched:** 2026-04-12  
**Confidence:** MEDIUM — grounded in industry SaaS alert patterns (AWS, Azure, GCP, Stripe, Braze) + existing v1.2 dashboard architecture

---

## Context: What v1.3 Extends

v1.2 delivered cached usage analytics with role-scoped dashboards and six production charts (Cost, Tokens, Models). v1.3 adds **proactive cost control** features that shift from "observe what happened" to "prevent what might happen" + "report on what happened at scheduled intervals."

**Existing v1.3 dependencies:**
- `usage_records` SQLite table (populated by `BifrostSyncService` cron)
- Role-scoped analytics logic (`getRoleFilteredAnalytics()`)
- ILLMGatewayClient abstraction (alerts remain gateway-agnostic)
- i18n system (all alert templates must be localized)
- Email infrastructure placeholder (must add)
- Scheduler infrastructure placeholder (must add)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that every cost-aware SaaS expects from a budget-conscious LLM gateway. Missing = product feels incomplete for teams managing multiple API keys.

| Feature | Why Expected | Complexity | Existing Dependency | Notes |
|---------|--------------|------------|-------------------|-------|
| **Cost threshold alerts (email)** | Teams must catch runaway spend before it becomes expensive surprise; industry standard across AWS/Azure/GCP/cloud platforms | Med | `usage_records` table + role-scoped analytics | Replaces reactive monitoring with proactive thresholds; critical for multi-member orgs |
| **Per-key cost breakdown dashboard** | Users track spend per key to identify which integrations/customers consume budget; enables chargeback attribution | Med | `usage_records` table + existing 6-chart infrastructure | Extends existing dashboard system; filters by `gatewayKeyId` |
| **Alert delivery method (email)** | Admins/managers need async notifications outside the UI for escalation/integration with email workflows | Med | None (new service) | Must support per-member alert configuration; respects role-scoped access |
| **Automated monthly report (PDF)** | Finance + leadership expect summary PDF for budgeting, variance tracking, and audits; reduces manual data export friction | High | `usage_records` table + period-over-period comparison logic from v1.2 | v1.2 browser PDF export works; scheduled generation is new infrastructure |

### Differentiators (Competitive Advantage)

Features that set Draupnir apart from other gateways or generic cost dashboards. Deliver strategic value to users choosing between platforms.

| Feature | Value Proposition | Complexity | Dependency | Notes |
|---------|-------------------|------------|-----------|-------|
| **Real-time threshold crossing notifications** | Webhook events fire IMMEDIATELY when key crosses 80%/100% threshold; not hourly digests or batch reports | Med-High | Async event queue infrastructure, webhook retry logic | Requires event-driven hook into cost tracking pipeline; differs from batch email alerts |
| **Webhook signature verification (HMAC)** | All webhook payloads HMAC-signed with organization secret; matches industry best practices (Stripe, Slack, Twilio) | Med | Secrets store, HMAC service | Security-forward; prevents webhook spoofing attacks; customers can verify authenticity server-side |
| **Multi-threshold alerting system** | Soft limit (warning @ 80%), hard limit (action @ 100%). Soft fires on email + webhook; hard triggers manual key deactivation + email | High | Cost calculation service, graceful degradation handling | Requires two-phase cost tracking: aggregation + enforcement; prevents bill shock |
| **Per-recipient report customization** | Org admins assign report recipients by role (all ADMINS, or specific MANAGERS); supports multi-member ownership | Med | Email service + role-scoped access control | Reduces friction vs single blast email; enables role-specific report variants |
| **Cost attribution by API key** | Show exact cost per key per model within same period; bridges technical (engineering) + finance visibility gap | Med | `usage_records` table with key + model granularity | Most gateways show aggregate spend; Draupnir enables per-call granularity for chargeback |
| **Customizable report frequency** | Orgs choose daily/weekly/monthly cadence; not locked to monthly | Med | Scheduler service + template flexibility | Respects different financial cycles (weekly billing, monthly reconciliation, quarterly reviews) |

### Anti-Features (Commonly Requested, Often Problematic)

| Anti-Feature | Why Requested | Why Problematic | What to Do Instead |
|--------------|-----------|-------------------|---|
| **Real-time usage sparklines in alert emails** | "Looks modern"; gives recipients immediate visual context | Webhook payload size + network latency make real-time sparklines impractical; complex rendering on constrained email clients | Link alerts to dashboard with pre-filtered view (`?key=ABC&period=7d`); dashboard has full interactivity |
| **Custom alert logic (time windows, regex filters)** | Power users want fine-grained control | Scope creep; 80% of users need simple "when cost > X" threshold logic; custom rules are edge cases | Start with hard-coded thresholds (80%, 100%); defer custom rules + scheduling to v2 if demand emerges |
| **Hard cost enforcement at API request time** | "Prevent overspend before it happens"; appeals to finance | Adds latency to hot request path; requires real-time cost calculation (breaks low-latency gateway design); conflicts with Bifrost async usage reporting | Use soft alerts on `BifrostSyncService` cron (5-10 min lag acceptable for budget alerts); hard blocks are manual (org admin deactivates key) |
| **Multiple alert destinations (Slack, Teams, PagerDuty direct)** | Each tool integration feels native | Each integration is a new dependency, test matrix, and maintenance burden | Webhook-first; let customers route webhook payload to their tool via Zapier, AWS Lambda, or custom script; webhook is the integration point |
| **SMS alerts** | Mobile urgency; founders expect texting of budget overages | Adds carrier cost, third-party dependency, and complexity; email + webhook sufficient for non-emergency budget management | Not justified; email + webhook > SMS. If SMS urgently needed in future, use webhook + Twilio integration (customer's responsibility, not product) |
| **ML-based anomaly detection** | "Enterprise feature"; detects abnormal usage patterns | Requires background job, statistical modeling (minimum weeks of baseline data), notification infra; 90% of value comes from simple thresholds | Simple threshold alerts (cost > X) deliver 90% of value at 10% of complexity; defer to v2 if product traction justifies |
| **Automated key rotation on hard limit** | "Zero-touch compliance"; key deactivates automatically | Breaks user workflows; may be intended; operator should intentionally choose deactivation | Hard limit triggers alert; admin must manually deactivate key to confirm intent + impact |

---

## Feature Dependencies

### Dependency Graph

```
Email Service Infrastructure (new)
  ├── Cost Threshold Alerts (email)
  ├── Automated Monthly Reports
  └── Alert Delivery Endpoint

usage_records Table (v1.2) ◄ EXISTING
  ├── Cost Threshold Alerts (reads aggregates)
  ├── Per-Key Cost Breakdown (reads per-key sums)
  └── Automated Monthly Reports (reads period aggregates)

BifrostSyncService Cron (v1.2) ◄ EXISTING
  ├── Refreshes usage_records every 5-10 min
  ├── Alert check job piggybacks on sync cron
  └── Report generation job can coexist with sync cron

Role-Scoped Analytics (v1.2) ◄ EXISTING
  ├── Alert recipients = ADMIN + MANAGER members only
  └── Per-Key Dashboard = ADMIN + MANAGER role access

ILLMGatewayClient Abstraction (v1.0) ◄ EXISTING
  └── Alerts remain gateway-agnostic (no Bifrost-specific code)

i18n System (v1.1) ◄ EXISTING
  ├── Alert email templates (zh-TW + en)
  ├── Report titles and KPI labels
  └── Alert event messages

Webhook Infrastructure (new)
  ├── webhook_subscriptions table (org_id, url, secret, enabled)
  ├── Real-time threshold crossing events
  ├── HMAC signing service
  └── Retry queue + exponential backoff

Per-Key Dashboard (Phase 2)
  └── Requires usage_records + existing 6-chart infrastructure
  └── Extends time-window selector + role-based filtering
```

### Critical Ordering

1. **Email Service (first)** — Foundation for both alerts and reports
2. **Cost Threshold Alerts (second)** — Highest user value, leverages email service
3. **Automated Reports (third)** — Reuses email service, depends on chart templates
4. **Per-Key Dashboard (fourth)** — UI-heavy, low dependency
5. **Webhook Infrastructure (fifth)** — More complex, can ship as differentiator after MVP

---

## MVP Definition: Two Phases

### Phase 1 (v1.3a): Email Alerts + Scheduled Reports
**Scope:** Deliver proactive cost management via email. Highest ROI, lowest infrastructure complexity.

| Feature | Acceptance Criteria | Est. Effort | MVP |
|---------|-------------------|-------------|-----|
| **Alert Threshold Logic** | Cron job reads `usage_records` per (org, key), compares to threshold, fires at 80%/100% | 4h | ✓ |
| **Email Alert Delivery** | SMTP/SES integration; sends to all ADMIN + MANAGER members for soft/hard limit events | 8h | ✓ |
| **Monthly Report PDF** | Scheduled cron generates PDF with existing v1.2 charts (Cost, Tokens, Models), emails to admin(s) | 12h | ✓ |
| **Alert Configuration UI** | Org ADMIN sets soft/hard limit thresholds per key; persists to `alert_thresholds` table | 6h | ✓ |
| **Email Templates (i18n)** | Localized alert + report email templates with dashboard link filters | 4h | ✓ |
| **Alert Event Log** | Optional: audit table tracking all threshold crossings (no notifications, just auditing) | 4h | - |
| **Phase 1 Total** | — | **38h** | — |

### Phase 2 (v1.3b): Webhooks + Per-Key Dashboard
**Scope:** Add real-time webhooks and UI for granular cost visibility. Ship after MVP validation.

| Feature | Acceptance Criteria | Est. Effort | MVP |
|---------|-------------------|-------------|-----|
| **Webhook Infrastructure** | Org admins register webhook URL + auto-generated secret; signed HMAC payload on threshold cross | 10h | - |
| **Webhook Retry Logic** | Exponential backoff (1m, 5m, 30m); max 3 attempts; log all deliveries | 4h | - |
| **Per-Key Dashboard** | New `/analytics/keys` page (ADMIN/MANAGER only) with table: key name, 7/30/90d spend, % of total, sparkline | 10h | - |
| **Cost Attribution UI** | Sidebar pill "Cost by Key" + filter integration with existing charts | 4h | - |
| **Webhook Admin UI** | Register/test/view delivery history; regenerate secret; enable/disable | 6h | - |
| **Phase 2 Total** | — | **34h** | — |

**Total for full v1.3 (both phases): ~72h (assumes standard TypeScript + Bun + DDD patterns already established)**

---

## Complexity Breakdown by Domain

| Domain | Component | Est. Hours | Notes |
|--------|-----------|-----------|-------|
| **Backend Logic** | Cost threshold calculation | 4h | Reuses existing `getRoleFilteredAnalytics()` |
| | Alert event generator | 3h | Checks thresholds, queues email |
| | Email service (SMTP/SES) | 5h | Integration, templates, sending |
| | Report PDF generation | 8h | Server-side chart rendering (puppeteer or headless Chrome) |
| | Webhook signing (HMAC) | 3h | Key derivation, constant-time comparison |
| | Webhook retry queue | 4h | Exponential backoff, persistence, dead letter handling |
| **Database** | `alert_thresholds` schema | 1h | Migration, indexes on org_id + key_id |
| | `webhook_subscriptions` schema | 1h | Migration, org_id + enabled index |
| | `alert_events` schema (optional) | 1h | Audit table, created_at index |
| **Cron/Scheduler** | Alert check job | 2h | Piggyback on BifrostSyncService cron pattern |
| | Report generation job | 2h | Daily/weekly/monthly schedule, template rendering |
| **Frontend** | Threshold config UI | 6h | Form for soft/hard limits per key, table of active thresholds |
| | Per-key dashboard | 10h | New page, chart filtering, role gating |
| | Webhook admin UI | 6h | Register, test, view history, manage secrets |
| **Testing** | Unit tests (alert logic) | 4h | Threshold checks, role filtering, template rendering |
| | Integration tests (email) | 3h | SMTP mock, endpoint behavior |
| | Integration tests (webhook) | 4h | Signing, retry, persistence |
| | E2E tests (critical flows) | 4h | Threshold crossing → alert → user sees email |
| **Documentation** | Alert configuration guide | 2h | How to set thresholds, integrate webhook, read reports |
| | Webhook payload spec | 1h | Schema, signature verification, examples |
| **Total (MVP Phase 1)** | — | **38h** | — |
| **Total (Full v1.3, both phases)** | — | **72h** | — |

---

## Data Model Extensions

### New Tables

```typescript
// alert_thresholds
// Per-key budget targets for an organization
CREATE TABLE alert_thresholds (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  gateway_key_id UUID NOT NULL,
  soft_limit_usd FLOAT NOT NULL,           // 80% threshold, warning alert
  hard_limit_usd FLOAT NOT NULL,           // 100% threshold, action alert
  alerted_at TIMESTAMP,                    // Last alert timestamp (prevent spam)
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(organization_id, gateway_key_id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (gateway_key_id) REFERENCES app_api_keys(id)
);

// webhook_subscriptions
// Organization-level webhook endpoints for alert delivery
CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  url TEXT NOT NULL,                       // HTTPS only
  secret TEXT NOT NULL,                    // HMAC signing key
  enabled BOOLEAN DEFAULT true,
  last_delivered_at TIMESTAMP,             // Last successful delivery
  failure_count INT DEFAULT 0,             // Consecutive failures
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(organization_id),                 // One webhook per org
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

// alert_events (optional, recommended for audit)
// Audit trail of all threshold crossings
CREATE TABLE alert_events (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  gateway_key_id UUID,                     // NULL if org-level alert
  event_type ENUM('soft_limit', 'hard_limit') NOT NULL,
  cost_usd FLOAT NOT NULL,                 // Actual spend at time of alert
  threshold_usd FLOAT NOT NULL,            // Threshold that was crossed
  channels_sent TEXT[],                    // ['email', 'webhook']
  failed_channels TEXT[],                  // ['webhook'] if delivery failed
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (gateway_key_id) REFERENCES app_api_keys(id),
  INDEX (organization_id, created_at DESC)
};

// report_subscriptions (optional for scheduled reports)
// Who receives which reports and on what schedule
CREATE TABLE report_subscriptions (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  frequency ENUM('daily', 'weekly', 'monthly') DEFAULT 'monthly',
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(organization_id, recipient_email, frequency),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);
```

### Schema Additions

```typescript
// Extend app_api_keys or organizations
ALTER TABLE app_api_keys ADD COLUMN (
  alert_soft_limit_usd FLOAT,
  alert_hard_limit_usd FLOAT,
  alerted_at TIMESTAMP
);

// OR (cleaner): Separate alert_thresholds table as shown above
```

---

## Integration Points with v1.2 Infrastructure

All v1.3 features leverage existing v1.2 systems:

| System | v1.2 Component | v1.3 Usage |
|--------|---------------|-----------|
| **Data Layer** | `usage_records` table (BifrostSyncService populates every 5-10 min) | Alerts and reports query this table for cost aggregates |
| **Role Access** | `getRoleFilteredAnalytics()` service | Alert recipients = ADMIN + MANAGER only; per-key dashboard same role gate |
| **Dashboard Infra** | Recharts + 6 existing charts (Cost, Tokens, Models) | Report PDF renders same charts server-side; per-key dashboard reuses chart components |
| **Gateway Abstraction** | `ILLMGatewayClient` interface | Alerts remain gateway-agnostic; no new Bifrost-specific code |
| **i18n System** | English-only API + localized UI messages | Alert templates (zh-TW + en), report titles use existing translation keys |
| **Organization Scoping** | Multi-tenant isolation in all queries | Alerts scoped to org_id; webhooks per-org; role checks built-in |

---

## Critical Implementation Constraints

### 1. Email Service Selection
- **Constraint:** Bun runtime; must support TypeScript async
- **Candidates:** `nodemailer` (free SMTP), AWS SES, SendGrid, Postmark, Resend
- **Recommendation:** `nodemailer` + org-configured SMTP (or default to SES if AWS-first). Respects immutability; no SDK state mutations.

### 2. PDF Generation
- **Constraint:** Bun runtime; Puppeteer (headless Chrome) is heavy
- **Candidates:** `puppeteer` (industry standard but resource-intensive), `playwright` (lighter), `pdfkit` (pure JS, lower fidelity), `html2pdf` (browser only)
- **Recommendation:** `puppeteer` with aggressive memory management (spawn child process, destroy after render). v1.3 reports use same charts as v1.2 dashboard, so full rendering fidelity needed.

### 3. Scheduler
- **Constraint:** Bun's built-in `setTimeout` is fine for sub-minute jobs, but cron-like schedules need a library
- **Candidates:** `node-cron`, `bull` (Redis-based, overkill), `agenda` (MongoDB-backed), custom cron parser
- **Recommendation:** `node-cron` or extend `BifrostSyncService` pattern (if alert checks can piggyback on existing 5-10 min sync job)

### 4. Webhook Signing
- **Constraint:** HMAC-SHA256 is built into Node/Bun; must be constant-time comparison
- **Implementation:** Use `crypto.timingSafeEqual()` for secret comparison (prevents timing attacks)

### 5. Test Infrastructure
- **Constraint:** Existing tests use unit + integration pattern (no WebSocket/streaming tests)
- **Recommendation:** Extend existing test suite; mock email service (no actual SMTP); use SQLite in-memory for alert queries; stub Puppeteer with fake PDF bytes

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Email delivery failures (SMTP, rate limits) | HIGH | Users miss alerts | Retry queue with exponential backoff; alert_events table logs failures for debugging; monitor queue depth |
| PDF generation timeouts (Puppeteer crash) | MEDIUM | Report generation hangs | Process timeout (5-10s per PDF), kill child, queue for retry; circuit breaker pattern |
| Database query performance (usage_records aggregation) | MEDIUM | Alert checks slow down sync cron | Add indexes on (org_id, created_at) and (gateway_key_id, created_at); cache recent aggregates in-memory for 1 min |
| Alert spam (threshold crossed repeatedly) | MEDIUM | Users get 100 emails in 1 hour | Track last alert timestamp per key; minimum 1h between soft limit emails; manual hard limit reset required |
| Webhook URL is invalid (404, DNS fail) | MEDIUM | Webhook never delivered | Test webhook on save; retry with backoff; disable after 5 consecutive failures; send admin email "webhook disabled due to errors" |
| Cost calculation is wrong (token pricing stale) | LOW | Alerts fire at wrong thresholds | Use same calculation as v1.2 charts (already validated in production); audit alert_events table monthly |

---

## MVP Metrics for Success

After Phase 1 (email alerts + reports) ships, measure success by:

1. **Adoption:** % of orgs with at least one alert threshold configured
2. **Alert Velocity:** Number of threshold-crossing events per week (should be low; indicates good defaults)
3. **Email Engagement:** % of alert emails clicked-through to dashboard (ideal > 40%)
4. **Report Quality:** % of report PDF opens in email (ideal > 60% for monthly cadence)
5. **False Positives:** Threshold-crossing alerts that did not represent actual overspend (should be ~0%; indicates good threshold defaults)

---

## Deferred Features (v1.4+)

- **Custom threshold logic (time windows, percentage increases)** — Start with fixed $X thresholds; defer context-aware rules
- **Hard cost enforcement (blocks requests at gateway level)** — Soft alerts sufficient; hard blocks are org admin choice
- **Multi-destination routing (Slack, Teams native)** — Webhook is the integration point; customer configures downstream routing
- **SMS alerts** — Not justified; email + webhook sufficient
- **ML anomaly detection** — Requires baseline data; defer to v2+
- **Cost attribution by end-user ID** — Data model doesn't support; `LogEntry` has key_id only; Bifrost doesn't surface user identity

---

## Sources

**Alert & Notification Patterns:**
- [API Usage Alerts — Braze Docs](https://www.braze.com/docs/user_guide/analytics/dashboard/api_usage_alerts) — Notification frequency best practices (8-hour cooldown prevents alert fatigue)
- [Set up notifications using webhooks | Apigee Edge](https://docs.apigee.com/api-platform/monetization/set-up-notification-webhooks) — Webhook infrastructure for cost alerts in API gateways
- [Managing alerts and notifications using the API | Apigee](https://docs.apigee.com/api-monitoring/alerts-notifications-api) — Multi-channel alert routing patterns
- [How to Apply Webhook Best Practices to Business Processes](https://www.integrate.io/blog/apply-webhook-best-practices/) — Retry strategies, signature verification, reliability

**Cost Tracking & Attribution:**
- [The API Metrics Every SaaS Team Must Track In 2026](https://www.cloudzero.com/blog/api-metrics/) — Cost attribution per API call; bridging tech + finance visibility
- [LLM API Pricing 2026 - Compare 300+ AI Model Costs](https://pricepertoken.com/) — Per-token pricing models; cost calculation accuracy
- [Token & Cost Tracking — Langfuse](https://langfuse.com/docs/observability/features/token-and-cost-tracking) — Cost aggregation per model and use case

**Budget & Quota Management:**
- [How to Set Up BigQuery Custom Cost Controls with Quotas and Alerts](https://oneuptime.com/blog/post/2026-02-17-how-to-set-up-bigquery-custom-cost-controls-with-quotas-and-alerts/view) — Hard vs soft quota patterns; Google Cloud's two-tier threshold approach (soft warning, hard enforcement)
- [Differences among hard, soft, and threshold quotas — NetApp Docs](https://docs.netapp.com/us-en/ontap/volumes/differences-hard-soft-threshold-quotas-concept.html) — Industry definitions: soft = warning, hard = block

**Automated Email Reports:**
- [Schedule automatic report delivery | Looker Studio](https://docs.cloud.google.com/looker/docs/studio/schedule-automatic-report-delivery) — Scheduled report patterns
- [How to generate and email PDF reports automatically on a schedule — DEV Community](https://dev.to/custodiaadmin/how-to-generate-and-email-pdf-reports-automatically-on-a-schedule-555m) — Cron + PDF generation + email pipeline
- [The 11 best transactional email services for developers in 2026](https://knock.app/blog/the-top-transactional-email-services-for-developers) — Email service provider evaluation

**Webhook Security:**
- [Apply Webhook Best Practices to Business Processes | Integrate.io](https://www.integrate.io/blog/apply-webhook-best-practices/) — HMAC signing, exponential backoff, idempotency
- [Refgrow — Webhook Security Best Practices](https://refgrow.com/blog/webhook-security-best-practices) — Signature verification, constant-time comparison, replay attack prevention

---

*Feature research for: Draupnir v1.3 Advanced Analytics & Alerts*  
*Researched: 2026-04-12*  
*Target audience: Product, engineering leads, stakeholder planning*
