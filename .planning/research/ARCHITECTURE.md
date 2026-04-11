# Architecture Patterns: v1.3 Advanced Analytics & Alerts

**Project:** Draupnir LLM Gateway  
**Current Architecture:** Bun + TypeScript + DDD (Foundation/Modules pattern)  
**Researched:** 2026-04-12  
**Focus:** Integration points for usage alerts, per-key cost breakdown, automated PDF reports

## Executive Summary

v1.3 adds three interconnected features to the existing DDD architecture:

1. **Usage Alerts** — Organization and per-key cost thresholds triggering webhook/email notifications
2. **Per-Key Cost Breakdown** — Detailed cost analysis dashboard showing cost per API key
3. **Automated PDF Reports** — Scheduled monthly/weekly usage reports delivered to org admins

All three features integrate cleanly with the existing architecture by:
- Creating a new **Alerts module** following DDD conventions
- Extending **Dashboard** services for cost breakdown queries
- Extending **Auth/IEmailService** for alert-specific email templates
- Hooking into existing **BifrostSyncService** post-sync workflow

No architectural refactoring is required. New components follow proven patterns already in use (ServiceProvider DI, port-based repositories, value objects).

---

## Recommended Architecture

### Module Topology for v1.3

```
Draupnir v1.3 Integration Points
│
├─ Foundation (unchanged)
│  └─ ILLMGatewayClient abstraction (stable via v1.0)
│
├─ Modules/Dashboard (extends with cost breakdown)
│  ├─ Application/Services/
│  │  ├─ (existing) GetDashboardSummaryService
│  │  └─ [NEW] PerKeyAnalyticsService, CostBreakdownService
│  ├─ Application/Ports/
│  │  └─ (existing) IUsageRepository (reused for per-key queries)
│  └─ Presentation/Controllers/
│     └─ [NEW methods] costBreakdown(), keyUsageDetails()
│
├─ Modules/Alerts [BRAND NEW]
│  ├─ Domain/Aggregates/
│  │  ├─ AlertConfig.ts — Alert rule (threshold, channels, schedule)
│  │  └─ UsageAlert.ts — Fired alert event (audit trail)
│  ├─ Domain/Repositories/
│  │  ├─ IAlertConfigRepository.ts
│  │  └─ IAlertEventRepository.ts
│  ├─ Domain/ValueObjects/
│  │  ├─ AlertType.ts (usage_threshold, cost_limit, key_expiring)
│  │  ├─ NotificationChannel.ts (webhook, email)
│  │  └─ ThresholdValue.ts (numeric constraint)
│  ├─ Application/Services/
│  │  ├─ ConfigureAlertService.ts
│  │  ├─ EvaluateAlertThresholdsService.ts
│  │  ├─ SendAlertNotificationService.ts
│  │  └─ ListAlertsService.ts
│  ├─ Application/Ports/
│  │  └─ INotificationSender.ts (abstraction for webhook/email)
│  ├─ Infrastructure/Services/
│  │  ├─ AlertEvaluator.ts (core logic: compare usage vs thresholds)
│  │  ├─ WebhookNotificationSender.ts (HTTP POST + HMAC signing)
│  │  └─ EmailAlertSender.ts (extends IEmailService)
│  ├─ Infrastructure/Repositories/
│  │  ├─ DrizzleAlertConfigRepository.ts
│  │  └─ DrizzleAlertEventRepository.ts
│  ├─ Infrastructure/Providers/
│  │  └─ AlertsServiceProvider.ts (DI wiring)
│  ├─ Presentation/Controllers/
│  │  └─ AlertController.ts (REST endpoints)
│  ├─ Presentation/Routes/
│  │  └─ alert.routes.ts
│  └─ Presentation/Requests/
│     └─ ConfigureAlertRequest.ts
│
└─ Shared/Infrastructure
   ├─ Database/Adapters/Drizzle/schema.ts
   │  └─ [NEW tables] alert_configs, alert_events, alert_webhooks, report_schedules
   └─ Services/
      └─ [NEW] PDFReportGenerator.ts (Bun-based PDF generation)
```

---

## Component Boundaries & Data Relationships

### Alerts Module Components

| Component | Responsibility | Dependencies | Communicates With |
|-----------|---|---|---|
| **AlertConfig** (Domain) | Alert rule: threshold, trigger type, notification channels, enabled status | — | IAlertConfigRepository |
| **UsageAlert** (Domain) | Single fired alert: org/key, actual usage, timestamp, status | — | IAlertEventRepository |
| **AlertEvaluator** | Core logic: fetch current usage, compare vs threshold, emit alerts | IUsageRepository (Dashboard), IAlertEventRepository | EvaluateAlertThresholdsService |
| **EvaluateAlertThresholdsService** | Orchestrator: triggered post-sync, evaluates all org/key alerts, dispatches | AlertEvaluator, SendAlertNotificationService | BifrostSyncService |
| **WebhookNotificationSender** | HTTP POST to webhook URL with HMAC signature | Crypto API | fetch() |
| **EmailAlertSender** | Extends IEmailService to send alert emails | IEmailService (Auth module) | ConsoleEmailService or Resend |
| **SendAlertNotificationService** | Fan-out dispatcher: route alert to webhook and/or email | WebhookNotificationSender, EmailAlertSender | (called by EvaluateAlertThresholdsService) |
| **AlertController** | REST endpoints: CRUD alert rules, list events | All services above | HTTP Router |

### Database Schema for Alerts

```sql
-- alert_configs: Stores alert rules per organization or API key
CREATE TABLE alert_configs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  api_key_id TEXT, -- nullable: if null, applies to entire org
  alert_type TEXT NOT NULL, -- 'usage.threshold' | 'cost.limit' | 'key.expiring'
  threshold_value TEXT NOT NULL, -- stored as text, parsed as Decimal for precision
  notification_channels TEXT NOT NULL, -- JSON: ["webhook", "email"]
  email_recipients TEXT, -- JSON: ["admin@org.com"]
  webhook_config_id TEXT, -- fk to alert_webhooks
  enabled BOOLEAN NOT NULL DEFAULT 1,
  period TEXT NOT NULL DEFAULT 'month', -- 'day' | 'week' | 'month'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(org_id, api_key_id, alert_type) -- prevent duplicate rules
);

-- alert_webhooks: Registered webhook endpoints per org
CREATE TABLE alert_webhooks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL, -- hashed with bcrypt or similar
  active BOOLEAN NOT NULL DEFAULT 1,
  last_tested_at TEXT,
  test_result TEXT, -- 'success' | 'failed' | 'timeout'
  created_at TEXT NOT NULL,
  UNIQUE(org_id, url) -- prevent duplicate URLs per org
);

-- alert_events: Audit trail of fired alerts
CREATE TABLE alert_events (
  id TEXT PRIMARY KEY,
  alert_config_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  api_key_id TEXT, -- denormalized for fast filtering
  triggered_value REAL NOT NULL, -- actual cost that triggered alert
  message TEXT NOT NULL,
  notification_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed'
  fired_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(alert_config_id) REFERENCES alert_configs(id),
  INDEX idx_org_id_fired_at (org_id, fired_at)
);

-- report_schedules: Scheduled PDF report delivery (v1.3 phase 2)
CREATE TABLE report_schedules (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  frequency TEXT NOT NULL, -- 'weekly' | 'monthly'
  day_of_week INTEGER, -- 0-6 for weekly (0=Sunday)
  day_of_month INTEGER, -- 1-28 for monthly
  recipients TEXT NOT NULL, -- JSON: ["admin@org.com", "finance@org.com"]
  enabled BOOLEAN NOT NULL DEFAULT 1,
  last_sent_at TEXT,
  next_run_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## Data Flow Diagrams

### Flow 1: Alert Configuration (User Setup)

```
┌──────────────────────┐
│ POST /api/v1/alerts  │ ← User configures alert rule
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────┐
│  AlertController.configure() │
└──────────┬───────────────────┘
           │
           ▼
┌────────────────────────────────────────────┐
│  ConfigureAlertService.execute()            │
│  • Authorize org membership                 │
│  • Validate threshold value (positive, <1M) │
│  • Validate notification channels           │
└──────────┬─────────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  AlertConfig.create()        │ ← Immutable domain aggregate
└──────────┬───────────────────┘
           │
           ▼
┌───────────────────────────────────────────────┐
│  IAlertConfigRepository.save(config)          │
└──────────┬────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────┐
│  SQLite: alert_configs table   │ ← Persisted rule
└────────────────────────────────┘
           │
           ▼
┌──────────────────────┐
│ 201 Created Response │
└──────────────────────┘
```

### Flow 2: Threshold Evaluation (Post-Sync Trigger)

```
┌────────────────────────────────────────────┐
│  BifrostSyncService.sync() completes       │
│  (synced N usage logs to usage_records)    │
└──────────┬─────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│  EvaluateAlertThresholdsService.execute(orgIds)         │
│  (triggered asynchronously post-sync)                   │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  For each affected org:                                 │
│    AlertEvaluator.evaluateThresholds(orgId)            │
└──────────┬────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  AlertEvaluator logic:                                  │
│  1. Fetch active AlertConfigs for orgId                │
│  2. For each config:                                    │
│     a. Query current usage from IUsageRepository       │
│        (queryStatsByKey or queryStatsByOrg)            │
│     b. Compare: usage.cost >= config.thresholdValue?   │
│     c. If YES → create UsageAlert domain object        │
└──────────┬────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│  For each fired alert:                                  │
│    1. IAlertEventRepository.record(alert)              │
│       → SQLite alert_events table (immutable log)      │
│    2. SendAlertNotificationService.execute(alert)      │
└──────────┬────────────────────────────────────────────┘
           │
      ┌────┴────┐
      │          │
      ▼          ▼
┌─────────────┐ ┌──────────────────┐
│  Webhook    │ │  Email           │
│  Dispatch   │ │  Dispatch        │
└─────────────┘ └──────────────────┘
      │                │
      │                ▼
      │         ┌───────────────────┐
      │         │ IEmailService     │
      │         │ .sendAlert(...)   │
      │         └─────────┬─────────┘
      │                   │
      ▼                   ▼
┌─────────────────────────────────────┐
│  Alert delivered (webhook + email)  │
│  Event status recorded in alert_events
└─────────────────────────────────────┘
```

### Flow 3: Per-Key Cost Breakdown (Dashboard Query)

```
┌───────────────────────────────────────────────────────────────┐
│  GET /api/v1/:orgId/dashboard/keys/cost-breakdown?period=7d   │
└──────────┬────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────┐
│  DashboardController.costBreakdown()             │
│  • Extract orgId, period from request            │
│  • Check AuthMiddleware context                  │
└──────────┬─────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────┐
│  PerKeyAnalyticsService.execute()                    │
│  • Authorize org membership (OrgAuthorizationHelper) │
│  • Resolve visible keys (DashboardKeyScopeResolver) │
└──────────┬─────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│  For each visible key:                                   │
│    IUsageRepository.queryStatsByKey(                     │
│      keyId, { startDate, endDate }                      │
│    )                                                     │
│    → DailyCostBucket[] from usage_records table         │
└──────────┬─────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│  Aggregate results:                                      │
│  [                                                       │
│    { keyId, label, totalCost, totalTokens, avgLatency }, │
│    { keyId, label, totalCost, totalTokens, avgLatency }  │
│  ]                                                       │
└──────────┬─────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│  200 OK + JSON response                  │
│  (rendered in React dashboard)           │
└──────────────────────────────────────────┘
```

### Flow 4: Scheduled PDF Reports (Cron Job)

```
┌──────────────────────────────────┐
│  [Cron Trigger: Daily 00:00 UTC] │
│  (Bun.serve or external scheduler)
└──────────┬───────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────┐
│  GenerateScheduledReportsJob.execute()             │
│  • Query report_schedules table (WHERE next_run_at │
│    <= NOW and enabled = true)                      │
└──────────┬─────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────┐
│  For each due schedule:                            │
│    1. Fetch org usage data from IUsageRepository   │
│    2. Generate PDF via PDFReportGenerator          │
│    3. Compose email with PDF attachment           │
│    4. Send via IEmailService.sendMonthlyReport()  │
│    5. Update schedule.next_run_at                 │
└──────────┬─────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────┐
│  Email with PDF attachment sent to recipients     │
│  Report_schedules table updated with next_run_at  │
└────────────────────────────────────────────────────┘
```

---

## Integration Points with Existing Architecture

### 1. DDD Module Pattern ✅

The Alerts module follows the same structure as Organization, ApiKey, Dashboard:

```
Alerts/
├─ Domain/
│  ├─ Aggregates/ (AlertConfig, UsageAlert)
│  ├─ Repositories/ (IAlertConfigRepository, IAlertEventRepository)
│  ├─ ValueObjects/ (AlertType, NotificationChannel, ThresholdValue)
│  └─ Entities/ (if needed)
├─ Application/
│  ├─ Services/ (ConfigureAlertService, EvaluateAlertThresholdsService, etc.)
│  ├─ Ports/ (IAlertConfigRepository, IAlertEventRepository)
│  ├─ DTOs/ (ConfigureAlertRequest, AlertResponse)
│  └─ (no Application/Repositories — Infrastructure provides via Ports)
├─ Infrastructure/
│  ├─ Providers/ (AlertsServiceProvider for DI)
│  ├─ Repositories/ (DrizzleAlertConfigRepository, DrizzleAlertEventRepository)
│  ├─ Services/ (AlertEvaluator, WebhookNotificationSender, EmailAlertSender)
│  └─ Mappers/ (if needed)
└─ Presentation/
   ├─ Controllers/ (AlertController)
   ├─ Routes/ (alert.routes.ts)
   └─ Requests/ (ConfigureAlertRequest)
```

### 2. Dependency Injection (gravito-prism) ✅

Alerts module registers with DI container via AlertsServiceProvider:

```typescript
// Alerts/Infrastructure/Providers/AlertsServiceProvider.ts
import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/IServiceProvider'

export class AlertsServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    // Repositories
    container.singleton('alertConfigRepository', (c: IContainer) => {
      return new DrizzleAlertConfigRepository(c.make('database') as IDatabaseAccess)
    })

    container.singleton('alertEventRepository', (c: IContainer) => {
      return new DrizzleAlertEventRepository(c.make('database') as IDatabaseAccess)
    })

    // Services
    container.singleton('alertEvaluator', (c: IContainer) => {
      return new AlertEvaluator(
        c.make('drizzleUsageRepository') as IUsageRepository, // from Dashboard
        c.make('alertEventRepository') as IAlertEventRepository,
        c.make('alertConfigRepository') as IAlertConfigRepository,
      )
    })

    container.singleton('sendAlertNotificationService', (c: IContainer) => {
      return new SendAlertNotificationService(
        new WebhookNotificationSender(c.make('database') as IDatabaseAccess),
        new EmailAlertSender(c.make('emailService') as IEmailService), // from Auth
      )
    })

    container.singleton('evaluateAlertThresholdsService', (c: IContainer) => {
      return new EvaluateAlertThresholdsService(
        c.make('alertEvaluator') as AlertEvaluator,
        c.make('sendAlertNotificationService') as SendAlertNotificationService,
      )
    })

    // Transient services (new instance per request)
    container.bind('configureAlertService', (c: IContainer) => {
      return new ConfigureAlertService(
        c.make('alertConfigRepository') as IAlertConfigRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })

    container.bind('listAlertsService', (c: IContainer) => {
      return new ListAlertsService(
        c.make('alertConfigRepository') as IAlertConfigRepository,
        c.make('alertEventRepository') as IAlertEventRepository,
        c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
      )
    })
  }

  override boot(_context: unknown): void {
    console.log('🚨 [Alerts] Module loaded')
  }
}
```

### 3. Database Layer (Drizzle) ✅

New tables extend existing SQLite schema:

```typescript
// Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts
export const alertConfigs = sqliteTable('alert_configs', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  apiKeyId: text('api_key_id'), // nullable
  alertType: text('alert_type').notNull(),
  thresholdValue: text('threshold_value').notNull(),
  notificationChannels: text('notification_channels').notNull(), // JSON
  emailRecipients: text('email_recipients'), // JSON
  webhookConfigId: text('webhook_config_id'),
  enabled: integer('enabled').notNull().default(1),
  period: text('period').notNull().default('month'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [
  index('idx_alert_configs_org_id').on(table.orgId),
  index('idx_alert_configs_api_key_id').on(table.apiKeyId),
  uniqueIndex('unique_org_key_type').on(table.orgId, table.apiKeyId, table.alertType),
])

export const alertEvents = sqliteTable('alert_events', {
  id: text('id').primaryKey(),
  alertConfigId: text('alert_config_id').notNull(),
  orgId: text('org_id').notNull(),
  apiKeyId: text('api_key_id'),
  triggeredValue: real('triggered_value').notNull(),
  message: text('message').notNull(),
  notificationStatus: text('notification_status').notNull().default('pending'),
  firedAt: text('fired_at').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('idx_alert_events_org_id_fired_at').on(table.orgId, table.firedAt),
])

export const alertWebhooks = sqliteTable('alert_webhooks', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().unique(),
  url: text('url').notNull(),
  secret: text('secret').notNull(), // hashed
  active: integer('active').notNull().default(1),
  lastTestedAt: text('last_tested_at'),
  testResult: text('test_result'),
  createdAt: text('created_at').notNull(),
})

export const reportSchedules = sqliteTable('report_schedules', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  frequency: text('frequency').notNull(), // 'weekly' | 'monthly'
  dayOfWeek: integer('day_of_week'), // 0-6
  dayOfMonth: integer('day_of_month'), // 1-28
  recipients: text('recipients').notNull(), // JSON
  enabled: integer('enabled').notNull().default(1),
  lastSentAt: text('last_sent_at'),
  nextRunAt: text('next_run_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

### 4. Authorization & Access Control ✅

Reuse existing patterns from Organization module:

```typescript
// AlertController: Protect all endpoints with OrgAuthorizationHelper
export class AlertController {
  constructor(
    private readonly configureAlertService: ConfigureAlertService,
    private readonly listAlertsService: ListAlertsService,
  ) {}

  async configure(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, error: 'UNAUTHORIZED' }, 401)

    const orgId = ctx.getParam('orgId')
    const result = await this.configureAlertService.execute({
      orgId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      // ... alert config fields
    })
    return ctx.json(result)
  }

  async list(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, error: 'UNAUTHORIZED' }, 401)

    const orgId = ctx.getParam('orgId')
    const result = await this.listAlertsService.execute({
      orgId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    return ctx.json(result)
  }
}
```

### 5. Email Service Extension ✅

Extend Auth/IEmailService for alert-specific templates:

```typescript
// Auth/Application/Ports/IEmailService.ts (updated)
export interface IEmailService {
  sendPasswordReset(to: string, resetUrl: string): Promise<void>
  sendEmailVerification(to: string, verifyUrl: string): Promise<void>
  // NEW v1.3
  sendUsageAlert(to: string, alertDetails: UsageAlertDTO): Promise<void>
  sendMonthlyReport(to: string, reportData: MonthlyReportDTO, pdfBuffer: Buffer): Promise<void>
}

// Alerts/Infrastructure/Services/EmailAlertSender.ts
export class EmailAlertSender {
  constructor(private readonly emailService: IEmailService) {}

  async send(recipients: string[], alert: UsageAlert): Promise<void> {
    for (const recipient of recipients) {
      await this.emailService.sendUsageAlert(recipient, {
        alertType: alert.alertType,
        orgId: alert.orgId,
        apiKeyId: alert.apiKeyId,
        triggeredValue: alert.triggeredValue,
        thresholdValue: alert.thresholdValue,
        message: alert.message,
      })
    }
  }
}
```

### 6. BifrostSyncService Integration ✅

Hook alert evaluation into post-sync workflow:

```typescript
// Dashboard/Infrastructure/Services/BifrostSyncService.ts (updated)
export class BifrostSyncService {
  constructor(
    // ... existing deps
    private readonly evaluateAlertThresholdsService?: EvaluateAlertThresholdsService,
  ) {}

  async sync(): Promise<SyncResult> {
    // ... existing sync logic
    const result = await this.syncInternal()

    // NEW: Evaluate alerts after sync completes (fire and forget)
    if (this.evaluateAlertThresholdsService) {
      try {
        const affectedOrgs = new Set<string>()
        // Collect affected org IDs from synced logs
        for (const log of logs) {
          const apiKey = await this.apiKeyRepo.findByBifrostVirtualKeyId(log.keyId)
          if (apiKey) affectedOrgs.add(apiKey.orgId)
        }
        
        // Evaluate thresholds for each org (async, non-blocking)
        for (const orgId of affectedOrgs) {
          this.evaluateAlertThresholdsService.execute(orgId).catch((err) => {
            console.error(`[BifrostSyncService] Alert evaluation failed for org ${orgId}:`, err)
          })
        }
      } catch (error) {
        console.error('[BifrostSyncService] Alert evaluation setup failed:', error)
      }
    }

    return result
  }
}
```

### 7. Wiring & Module Registration ✅

Add Alerts module registration to app.ts wiring:

```typescript
// src/wiring/index.ts (add new registration)
import { AlertController, registerAlertRoutes } from '@/Modules/Alerts'

/**
 * 註冊 Alerts 模組
 */
export const registerAlerts = (core: PlanetCore): void => {
  const router = createGravitoModuleRouter(core)
  const controller = new AlertController(
    core.container.make('configureAlertService') as any,
    core.container.make('listAlertsService') as any,
  )
  registerAlertRoutes(router, controller)
}

// app.ts or main entry point
core.registerProvider(AlertsServiceProvider)
registerAlerts(core)
```

### 8. Dashboard Module Extensions ✅

Add cost breakdown services to DashboardServiceProvider:

```typescript
// Dashboard/Infrastructure/Providers/DashboardServiceProvider.ts (add)
container.bind('perKeyAnalyticsService', (c: IContainer) => {
  return new PerKeyAnalyticsService(
    c.make('apiKeyRepository') as IApiKeyRepository,
    c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    c.make('drizzleUsageRepository') as IUsageRepository,
  )
})

container.bind('costBreakdownService', (c: IContainer) => {
  return new CostBreakdownService(
    c.make('apiKeyRepository') as IApiKeyRepository,
    c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    c.make('drizzleUsageRepository') as IUsageRepository,
  )
})

// Dashboard/Presentation/Controllers/DashboardController.ts (add methods)
constructor(
  // ... existing
  private readonly perKeyAnalyticsService: PerKeyAnalyticsService,
  private readonly costBreakdownService: CostBreakdownService,
) {}

async costBreakdown(ctx: IHttpContext): Promise<Response> {
  const auth = AuthMiddleware.getAuthContext(ctx)
  if (!auth) return ctx.json({ success: false, error: 'UNAUTHORIZED' }, 401)
  
  const orgId = ctx.getParam('orgId')
  const period = ctx.getQuery('period') ?? '7d'
  
  const result = await this.perKeyAnalyticsService.execute({
    orgId,
    callerUserId: auth.userId,
    callerSystemRole: auth.role,
    period,
  })
  return ctx.json(result)
}
```

---

## Key Design Decisions

### Decision 1: Post-Sync Alert Evaluation (Not Real-Time)
**Why:** Alert evaluation is I/O-bound (queries IUsageRepository, posts webhooks). Running synchronously in request handler blocks user. Running post-sync is non-blocking and naturally debounced (once per sync cycle, typically hourly).

**Trade-off:** Alerts fire with ~1-hour latency instead of real-time. Acceptable for cost monitoring.

### Decision 2: Separate alert_webhooks Table
**Why:** Each org can register only one webhook endpoint. Storing webhook URL + secret in alert_webhooks allows rotation without modifying every alert_config row. Follows DRY principle.

**Trade-off:** Extra table + FK, but cleaner schema.

### Decision 3: HMAC Signature for Webhooks
**Why:** Webhook consumers (external apps) need proof that alerts came from Draupnir, not an attacker spoofing alerts. HMAC-SHA256 is industry standard.

**Implementation:** WebhookNotificationSender signs payload with org's webhook secret; consumer verifies signature.

### Decision 4: Use Existing IEmailService
**Why:** Auth module already has email abstraction. Extending it (adding alert methods) avoids creating a new email service interface.

**Trade-off:** IEmailService becomes slightly larger, but still single responsibility.

### Decision 5: Store alert_events (Immutable Audit Log)
**Why:** When alerts fire, we must log the fact. Enables debugging ("why didn't I get notified?"), prevents silent failures.

**Trade-off:** Additional storage (alert_events table grows), but negligible overhead.

---

## API Routes (v1.3)

### Alert Management
```
POST   /api/v1/:orgId/alerts/configure
       Create new alert rule
       Body: { apiKeyId?, alertType, thresholdValue, notificationChannels, emailRecipients? }
       Response: 201 { success, data: { alertId, ... } }

GET    /api/v1/:orgId/alerts
       List all active alerts for org
       Query: ?type=cost_limit&apiKeyId=...
       Response: 200 { success, data: [AlertConfig, ...] }

PUT    /api/v1/:orgId/alerts/:alertId
       Update alert rule (threshold, channels, etc.)
       Body: { alertType?, thresholdValue?, notificationChannels? }
       Response: 200 { success, data: AlertConfig }

DELETE /api/v1/:orgId/alerts/:alertId
       Deactivate alert
       Response: 204 No Content

GET    /api/v1/:orgId/alerts/events
       Fetch fired alerts (audit trail)
       Query: ?limit=50&offset=0&since=2026-04-01T00:00:00Z
       Response: 200 { success, data: [UsageAlert, ...], meta: { total, limit, offset } }

POST   /api/v1/:orgId/alerts/:alertId/test
       Test webhook delivery
       Response: 200 { success, message: "Webhook test successful" }
```

### Cost Breakdown (Dashboard Extension)
```
GET    /api/v1/:orgId/dashboard/keys/cost-breakdown?period=7d
       Per-key cost breakdown
       Response: 200 { success, data: [
         { keyId, label, totalCost, totalTokens, avgLatency, status },
         ...
       ]}

GET    /api/v1/:orgId/dashboard/keys/:keyId/usage
       Single key detailed usage (daily buckets)
       Query: ?start=2026-04-01T00:00:00Z&end=2026-04-12T23:59:59Z
       Response: 200 { success, data: DailyCostBucket[] }
```

### Scheduled Reports
```
GET    /api/v1/:orgId/reports/schedules
       List configured report schedules
       Response: 200 { success, data: [ReportSchedule, ...] }

POST   /api/v1/:orgId/reports/schedules
       Create scheduled report
       Body: { frequency: 'weekly'|'monthly', dayOfWeek?, dayOfMonth?, recipients: string[] }
       Response: 201 { success, data: ReportSchedule }

DELETE /api/v1/:orgId/reports/schedules/:scheduleId
       Cancel scheduled report
       Response: 204 No Content
```

---

## Patterns to Follow

### Pattern 1: AlertEvaluator (Stateless Threshold Comparison)

```typescript
export class AlertEvaluator {
  constructor(
    private readonly usageRepository: IUsageRepository,
    private readonly alertEventRepository: IAlertEventRepository,
    private readonly alertConfigRepository: IAlertConfigRepository,
  ) {}

  async evaluateThresholds(orgId: string): Promise<UsageAlert[]> {
    const configs = await this.alertConfigRepository.findActiveByOrgId(orgId)
    const firedAlerts: UsageAlert[] = []

    for (const config of configs) {
      // Determine query scope: org-wide or single key
      const usage = config.apiKeyId
        ? await this.usageRepository.queryStatsByKey(config.apiKeyId, {
            startDate: this.getPeriodStart(config.period),
            endDate: new Date().toISOString(),
          })
        : await this.usageRepository.queryStatsByOrg(orgId, {
            startDate: this.getPeriodStart(config.period),
            endDate: new Date().toISOString(),
          })

      // Compare: has threshold been exceeded?
      if (new Decimal(usage.totalCost).gte(new Decimal(config.thresholdValue))) {
        const alert = UsageAlert.create({
          configId: config.id,
          orgId,
          apiKeyId: config.apiKeyId ?? null,
          triggeredValue: usage.totalCost,
          message: `Usage cost (${usage.totalCost}) exceeded threshold (${config.thresholdValue})`,
        })

        // Record fired event
        await this.alertEventRepository.record(alert)
        firedAlerts.push(alert)
      }
    }

    return firedAlerts
  }

  private getPeriodStart(period: string): string {
    const now = new Date()
    const start = new Date(now)
    
    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0)
        break
      case 'week':
        start.setDate(now.getDate() - now.getDay())
        start.setHours(0, 0, 0, 0)
        break
      case 'month':
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        break
    }
    
    return start.toISOString()
  }
}
```

### Pattern 2: Multi-Channel Notification Dispatch

```typescript
export class SendAlertNotificationService {
  constructor(
    private readonly webhookSender: WebhookNotificationSender,
    private readonly emailSender: EmailAlertSender,
  ) {}

  async execute(alert: UsageAlert, config: AlertConfig): Promise<void> {
    const results: Array<{ channel: string; success: boolean; error?: string }> = []

    // Dispatch to webhook (if enabled)
    if (config.notificationChannels.includes('webhook') && config.webhookConfigId) {
      try {
        await this.webhookSender.send(alert, config.webhookConfigId)
        results.push({ channel: 'webhook', success: true })
      } catch (error) {
        results.push({
          channel: 'webhook',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Dispatch to email (if enabled)
    if (config.notificationChannels.includes('email') && config.emailRecipients?.length) {
      try {
        await this.emailSender.send(config.emailRecipients, alert)
        results.push({ channel: 'email', success: true })
      } catch (error) {
        results.push({
          channel: 'email',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Log results (for debugging)
    console.log(`[SendAlertNotificationService] Dispatch results for alert ${alert.id}:`, results)
  }
}
```

### Pattern 3: Webhook HMAC Signature

```typescript
export class WebhookNotificationSender {
  constructor(private readonly database: IDatabaseAccess) {}

  async send(alert: UsageAlert, webhookConfigId: string): Promise<void> {
    // Fetch webhook config (URL + secret)
    const webhook = await this.database.table('alert_webhooks')
      .select('*')
      .where('id', webhookConfigId)
      .first()
    
    if (!webhook) throw new Error(`Webhook config not found: ${webhookConfigId}`)
    if (!webhook.active) throw new Error(`Webhook is disabled: ${webhookConfigId}`)

    const payload = JSON.stringify(alert.toJSON())
    const timestamp = new Date().toISOString()
    const signature = await this.signPayload(payload, webhook.secret)

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Draupnir-Signature': `sha256=${signature}`,
        'X-Draupnir-Timestamp': timestamp,
      },
      body: payload,
      signal: AbortSignal.timeout(10_000), // 10s timeout
    })

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`)
    }
  }

  private async signPayload(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
}
```

### Pattern 4: BifrostSyncService Post-Sync Hook

```typescript
// Dashboard/Infrastructure/Services/BifrostSyncService.ts
export class BifrostSyncService {
  constructor(
    // ... existing deps
    private readonly evaluateAlertThresholdsService?: EvaluateAlertThresholdsService,
  ) {}

  async sync(): Promise<SyncResult> {
    const TIMEOUT_MS = 30_000
    // ... existing timeout setup

    try {
      return await Promise.race([this.syncInternal(), timeoutPromise])
    } catch (error: unknown) {
      console.error('[BifrostSyncService] Sync failed:', error)
      return { synced: 0, quarantined: 0 }
    } finally {
      // ... timeout cleanup
    }
  }

  private async syncInternal(): Promise<SyncResult> {
    // ... existing sync logic (fetch logs, upsert to usage_records, advance cursor)
    const cursor = await this.cursorRepository.get('bifrost_logs')
    const since = cursor?.lastSyncedAt ?? new Date(0).toISOString()
    const logs = await this.gatewayClient.getUsageLogs([], { startTime: since, limit: 500 })

    let synced = 0
    let quarantined = 0
    const affectedOrgs = new Set<string>()

    for (const log of logs) {
      const apiKey = await this.apiKeyRepository.findByBifrostVirtualKeyId(log.keyId)
      if (!apiKey) {
        await this.quarantineLog(log, 'virtual_key_not_found')
        quarantined++
        continue
      }

      // Track org for later alert evaluation
      affectedOrgs.add(apiKey.orgId)

      await this.usageRepository.upsert({
        id: crypto.randomUUID(),
        bifrostLogId: log.logId ?? `${log.timestamp}:${log.keyId}`,
        apiKeyId: apiKey.id,
        orgId: apiKey.orgId,
        // ... other fields
      })
      synced++
    }

    await this.cursorRepository.advance('bifrost_logs', {
      lastSyncedAt: new Date().toISOString(),
      lastBifrostLogId: lastProcessedLogId,
    })

    // NEW: Post-sync alert evaluation (non-blocking, fire and forget)
    if (this.evaluateAlertThresholdsService && affectedOrgs.size > 0) {
      this.triggerAlertEvaluation(affectedOrgs).catch((err) => {
        console.error('[BifrostSyncService] Alert evaluation failed:', err)
      })
    }

    return { synced, quarantined }
  }

  private async triggerAlertEvaluation(orgIds: Set<string>): Promise<void> {
    for (const orgId of orgIds) {
      await this.evaluateAlertThresholdsService!.execute(orgId)
    }
  }
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Evaluating Alerts in Request Handler
**Bad:**
```typescript
// DO NOT DO THIS
async configure(ctx): Promise<Response> {
  const alert = await this.configureAlertService.execute(...)
  
  // Blocking webhook call in request handler!
  await this.sendAlertNotificationService.execute(alert)
  
  return ctx.json({ success: true })
}
```

**Good:**
```typescript
// Alert evaluation triggered asynchronously post-sync
// User gets immediate response; alerts fire separately
async configure(ctx): Promise<Response> {
  const alert = await this.configureAlertService.execute(...)
  return ctx.json({ success: true, data: alert })
  // Alerts evaluate post-sync, asynchronously
}
```

### Anti-Pattern 2: No Audit Trail
**Bad:**
```typescript
async evaluateThresholds(orgId): Promise<void> {
  // Fire alerts but don't record them
  if (usage.cost >= threshold) {
    await this.webhookSender.send(alert)
    // Silent success — no way to audit or debug
  }
}
```

**Good:**
```typescript
async evaluateThresholds(orgId): Promise<UsageAlert[]> {
  const firedAlerts: UsageAlert[] = []
  
  if (usage.cost >= threshold) {
    const alert = UsageAlert.create(...)
    await this.alertEventRepository.record(alert) // Immutable log
    await this.sendAlertNotificationService.execute(alert)
    firedAlerts.push(alert)
  }
  
  return firedAlerts // Caller can verify what fired
}
```

### Anti-Pattern 3: Storing Secrets Plaintext
**Bad:**
```typescript
// DO NOT: Store webhook secret plaintext
export const alertWebhooks = sqliteTable('alert_webhooks', {
  secret: text('secret').notNull(), // Plaintext!
})
```

**Good:**
```typescript
// Hash secrets with bcrypt or Argon2
import * as bcrypt from 'bcrypt'

class AlertWebhookRepository {
  async save(webhook: AlertWebhook): Promise<void> {
    const hashedSecret = await bcrypt.hash(webhook.secret, 12)
    await this.database.table('alert_webhooks').insert({
      secret: hashedSecret,
    })
  }

  async verifySecret(webhookId: string, plainSecret: string): Promise<boolean> {
    const stored = await this.database.table('alert_webhooks')
      .select('secret')
      .where('id', webhookId)
      .first()
    return bcrypt.compare(plainSecret, stored.secret)
  }
}
```

### Anti-Pattern 4: Ignoring Notification Failures Silently
**Bad:**
```typescript
try {
  await this.webhookSender.send(alert)
} catch (error) {
  // Swallow error, alert never gets delivered
}
```

**Good:**
```typescript
try {
  await this.webhookSender.send(alert)
} catch (error) {
  // Update alert event status to 'failed'
  await this.alertEventRepository.updateStatus(alert.id, 'failed', error.message)
  // Admin can see in UI that webhook delivery failed
  console.error(`[SendAlertNotification] Webhook delivery failed: ${error.message}`)
}
```

### Anti-Pattern 5: Tight Coupling to Webhook Implementation
**Bad:**
```typescript
// AlertEvaluator directly calls WebhookNotificationSender
export class AlertEvaluator {
  constructor(
    private readonly webhookSender: WebhookNotificationSender,
  ) {}

  async evaluate(): Promise<void> {
    this.webhookSender.send(...) // Direct coupling
  }
}
```

**Good:**
```typescript
// Use abstraction via ServiceProvider
export class EvaluateAlertThresholdsService {
  constructor(
    private readonly alertEvaluator: AlertEvaluator,
    private readonly sendAlertNotificationService: SendAlertNotificationService,
  ) {}

  async execute(orgId: string): Promise<void> {
    const firedAlerts = await this.alertEvaluator.evaluateThresholds(orgId)
    for (const alert of firedAlerts) {
      await this.sendAlertNotificationService.execute(alert)
    }
  }
}
```

---

## Scalability Considerations

| Concern | At 100 Users | At 10K Users | At 1M Users |
|---------|--------------|--------------|-------------|
| **Alert Evaluation Frequency** | Post-sync hourly | Post-sync hourly | Post-sync hourly (O(configs), negligible) |
| **Webhook Delivery** | Synchronous (blocking) acceptable | Async queue recommended (BullMQ) | Async queue + retry policy + DLQ |
| **Alert Config Table** | ~100 configs | ~10K configs | 100K+ configs; add indexes on (org_id, enabled) |
| **Alert Events Table** | ~1K events/month | ~10K events/month | 100K+ events/month; implement retention policy |
| **Email Sending** | ConsoleEmailService (dev) | Resend/SendGrid with templating | Batched send + rate limiting (100/min) |
| **PDF Report Generation** | On-demand (browser print) | Cron job daily 00:00 UTC | Cron + memoization of heavy aggregation queries |
| **Database Queries** | IUsageRepository queries <100ms | Add indexes on (org_id, api_key_id, occurred_at) | Partition usage_records by month; archive old data |

**At 10K+ users, recommended optimizations:**
1. Move webhook delivery to async queue (BullMQ on Redis or database-backed)
2. Add query indexes on alert evaluation paths
3. Implement alert_events retention policy (keep last 90 days; archive older)
4. Cache org-level usage stats (5-minute TTL) to reduce repeated IUsageRepository calls
5. Batch email sending (max 100/min to avoid rate limits)

---

## New vs Modified Components Summary

### NEW (v1.3 Phase 1-2)
**Alerts Module (entire):**
- Domain: AlertConfig, UsageAlert aggregates
- Services: ConfigureAlertService, EvaluateAlertThresholdsService, SendAlertNotificationService, ListAlertsService
- Infrastructure: AlertEvaluator, DrizzleAlertConfigRepository, DrizzleAlertEventRepository, WebhookNotificationSender, EmailAlertSender
- Presentation: AlertController, alert.routes.ts
- Providers: AlertsServiceProvider

**Database:**
- Tables: alert_configs, alert_events, alert_webhooks, report_schedules (4 new)

**Shared Utilities:**
- PDFReportGenerator (for scheduled reports, phase 2)

### MODIFIED (Minimal)
**Dashboard Module:**
- Add: PerKeyAnalyticsService, CostBreakdownService
- Add: costBreakdown(), keyUsageDetails() controller methods
- DashboardServiceProvider: register new services
- Routes: add cost-breakdown endpoints

**Auth Module:**
- Extend: IEmailService with sendUsageAlert(), sendMonthlyReport()

**BifrostSyncService:**
- Hook: Post-sync call to EvaluateAlertThresholdsService (optional dependency)

**Wiring (src/wiring/index.ts):**
- Add: registerAlerts() function
- Add: AlertsServiceProvider registration

### UNTOUCHED
- Organization, ApiKey, Credit, DevPortal, Profile, Health modules
- Foundation (ILLMGatewayClient, BifrostGatewayAdapter)
- Auth authentication/authorization logic

---

## Build Order & Parallelization

```
Week 1 (Phase 1 - Alert Config & Evaluation)
├─ Day 1-2: Domain layer (AlertConfig, UsageAlert aggregates, ValueObjects)
├─ Day 2-3: Repositories (DrizzleAlertConfigRepository, DrizzleAlertEventRepository)
├─ Day 3-4: AlertEvaluator + EvaluateAlertThresholdsService
├─ Day 4: Integration into BifrostSyncService
└─ Day 5: Tests + QA

Week 2 (Phase 2 - Notification Dispatch, Cost Breakdown)
├─ Day 1-2: WebhookNotificationSender + EmailAlertSender
├─ Day 2-3: SendAlertNotificationService + AlertController
├─ Day 3-4: Dashboard cost breakdown services (parallel with above)
├─ Day 4-5: Routes + wiring
└─ Day 5: Tests + QA

Week 3 (Phase 3 - Scheduled Reports)
├─ Day 1-2: report_schedules table + repository
├─ Day 2-3: GenerateScheduledReportsJob + PDFReportGenerator
├─ Day 3-4: UI components + report schedule management
└─ Day 4-5: Tests + QA + deployment
```

**Parallelization:**
- Phase 1 (Domain + Repos) can run independently
- Phase 2A (WebhookSender) and Phase 2B (CostBreakdown) can run in parallel
- Phase 3 (Reports) depends only on IEmailService availability (already in place)

---

## Sources

**Existing Patterns (from codebase review):**
- Organization module: Domain aggregates (Organization.ts), repositories, authorization pattern
- ApiKey module: Domain aggregates (ApiKey.ts), value objects (KeyStatus, KeyScope)
- Dashboard module: IUsageRepository pattern, DashboardKeyScopeResolver, service composition
- Auth module: IEmailService pattern, ConsoleEmailService implementation
- DevPortal module: WebhookEventType, WebhookConfig entities
- Foundation: FoundationServiceProvider DI pattern, ILLMGatewayClient abstraction
- Drizzle schema: Database patterns (indexes, unique constraints, relationships)
- Wiring: Module registration pattern (src/wiring/index.ts)

**Architecture principles:**
- DDD module structure (Foundation/Modules pattern)
- Port-based repositories (IRepository interfaces)
- ServiceProvider DI pattern (gravito-prism)
- Immutability constraint (no mutations)
- Authorization via OrgAuthorizationHelper + AuthMiddleware
