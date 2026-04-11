# Phase 13: Alert Foundation & Email Infrastructure - Research

**Researched:** 2026-04-12
**Domain:** Cost threshold alerting, email infrastructure, domain event pipeline
**Confidence:** HIGH

## Summary

Phase 13 builds a new Alerts DDD module with org-level budget configuration (fixed 80%/100% thresholds), a post-BifrostSync evaluation pipeline, email delivery via Upyo, and alert deduplication. The existing codebase provides all necessary integration points: `DomainEventDispatcher` for the post-sync hook, `IUsageRepository` for cost aggregation, `IOrganizationMemberRepository.findByOrgId()` to resolve alert recipients, and the Drizzle schema file for new tables.

The primary technical challenge is wiring a new domain event into the existing `BifrostSyncService` (which currently has no event dispatch), building a shared `IMailer` port that supersedes the Auth-specific `IEmailService`, and designing the deduplication state tracking to prevent duplicate alerts within a calendar month.

**Primary recommendation:** Create a new `src/Modules/Alerts/` module following existing DDD conventions. Add `@upyo/core` + `@upyo/smtp` for email. Hook threshold evaluation into `BifrostSyncService.sync()` completion via `DomainEventDispatcher`. Store budget configs and alert events in two new SQLite tables.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Budget + percentage tiers model -- user sets a monthly dollar budget per org, system alerts at fixed 80% (warning) and 100% (critical) thresholds
- **D-02:** Org-level budgets only for v1.3 -- no per-key independent budgets. Per-key alerts fire based on org budget context
- **D-03:** Fixed 80% / 100% percentage tiers -- not user-configurable. Matches AWS/GCP industry pattern
- **D-04:** Calendar month budget period -- resets on 1st of each month. Threshold state resets automatically
- **D-05:** Post-BifrostSync hook -- after each sync run completes, fire a domain event that triggers threshold evaluation. No separate cron needed
- **D-06:** Evaluate only orgs with new usage data -- BifrostSyncService passes affected org IDs to the evaluator, skipping inactive orgs
- **D-07:** Shared IMailer port in Foundation -- generic `send(to, subject, html)` interface. Auth's IEmailService and Alert's email sender both use it underneath. Upyo implementation in Infrastructure
- **D-08:** Plain HTML string templates -- simple template functions returning HTML strings for alert emails. No React Email dependency
- **D-09:** All org ADMINs receive alert emails -- no per-recipient configuration UI needed for v1.3
- **D-10:** Per-threshold state tracking -- track `(org, threshold_tier)` with `last_alerted_at` + `last_alerted_tier`. Don't re-alert for same tier until budget resets (next calendar month)
- **D-11:** No re-alert within same month -- once 80% fires, it's done for that month. Only escalation to 100% triggers a new alert
- **D-12:** Only highest breached tier sent -- if cost jumps from 50% past both 80% and 100% in one sync, send only the critical (100%) alert

### Claude's Discretion
- DB schema design for alert_configs and alert_events tables
- Internal structure of the Alerts module (aggregates, value objects, services)
- How IMailer port integrates with existing ConsoleEmailService for dev mode
- Domain event naming and payload structure for post-sync hook

### Deferred Ideas (OUT OF SCOPE)
- Per-key independent budgets -- potential future enhancement beyond org-level budgets
- User-configurable percentage tiers -- fixed 80%/100% for now
- Configurable alert recipients -- all ADMINs for now, per-recipient config later
- React Email templates -- plain HTML sufficient for v1.3
- Rolling 30-day budget windows -- calendar month only for v1.3
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ALRT-01 | User can configure cost threshold alerts (soft 80% / hard 100%) per organization | D-01/D-03 lock fixed thresholds; user sets only the budget amount. AlertConfig aggregate + `alert_configs` table + PUT endpoint |
| ALRT-02 | User can configure cost threshold alerts per individual API key | D-02 scopes to org-level only for v1.3. Per-key budgets deferred. ALRT-02 is partially addressed: per-key alerts fire based on org budget context |
| ALRT-03 | System sends email notification when cost threshold is breached | IMailer port + Upyo SMTP transport + post-sync domain event pipeline + `EvaluateThresholdsService` |
| ALRT-04 | System deduplicates alerts within a configurable window to prevent alert fatigue | D-10/D-11/D-12 define dedup: per-threshold state tracking, no re-alert same month, only highest tier |
| ALRT-05 | Alerts include severity levels (warning / critical) based on threshold tier | D-03 fixed tiers: 80% = warning, 100% = critical. ThresholdTier value object |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @upyo/core | 0.4.0 | Email sending abstraction | Cross-runtime (Bun/Node/Deno), zero deps, pluggable transports |
| @upyo/smtp | 0.4.0 | SMTP transport for dev/prod | Local SMTP for dev, production SMTP for deployment |
| drizzle-orm | 0.45.1 (existing) | Database schema + queries | Already in project, SQLite adapter configured |
| decimal.js | 10.6.0 | Precise cost calculations | STATE.md decision: "Use Decimal.js for all cost calculations from the start" |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @upyo/resend | 0.4.0 | Resend cloud transport | Production email delivery when `EMAIL_TRANSPORT=resend` |
| zod | 4.3.6 (existing via @gravito/impulse) | Input validation | Budget configuration endpoint validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Upyo | Nodemailer | Nodemailer does NOT work on Bun runtime; Node.js only |
| Upyo | Resend SDK directly | Loses transport abstraction; can't swap to SMTP for dev |
| Plain HTML templates | React Email | Decision D-08 locks plain HTML; React Email adds dep + complexity |

**Installation:**
```bash
bun add @upyo/core @upyo/smtp decimal.js
# Optional for production:
# bun add @upyo/resend
```

**Version verification:** All versions confirmed via `npm view` on 2026-04-12.

## Architecture Patterns

### Recommended Module Structure
```
src/Modules/Alerts/
├── Domain/
│   ├── Aggregates/
│   │   └── AlertConfig.ts          # Org budget config (immutable)
│   ├── Entities/
│   │   └── AlertEvent.ts           # Fired alert record (audit trail)
│   ├── ValueObjects/
│   │   ├── ThresholdTier.ts         # 'warning' | 'critical' enum-like VO
│   │   ├── BudgetAmount.ts          # Decimal-backed positive dollar amount
│   │   └── MonthlyPeriod.ts         # Calendar month period (year + month)
│   └── Repositories/
│       ├── IAlertConfigRepository.ts
│       └── IAlertEventRepository.ts
├── Application/
│   ├── Services/
│   │   ├── SetBudgetService.ts          # Create/update org budget
│   │   ├── GetBudgetService.ts          # Read org budget config
│   │   ├── EvaluateThresholdsService.ts # Core: compare cost vs budget
│   │   └── SendAlertService.ts          # Dispatch email to org admins
│   ├── Ports/
│   │   └── IMailer.ts                   # Shared email port (Foundation)
│   └── DTOs/
│       └── AlertDTO.ts
├── Infrastructure/
│   ├── Repositories/
│   │   ├── DrizzleAlertConfigRepository.ts
│   │   └── DrizzleAlertEventRepository.ts
│   ├── Services/
│   │   ├── UpyoMailer.ts            # IMailer impl using Upyo
│   │   ├── ConsoleMailer.ts         # IMailer impl for dev (console.log)
│   │   └── AlertEmailTemplates.ts   # HTML template functions
│   └── Providers/
│       └── AlertsServiceProvider.ts
├── Presentation/
│   ├── Controllers/
│   │   └── AlertController.ts
│   ├── Routes/
│   │   └── alert.routes.ts
│   └── Requests/
│       └── SetBudgetRequest.ts
└── __tests__/
    ├── EvaluateThresholdsService.test.ts
    ├── AlertConfig.test.ts
    ├── BudgetAmount.test.ts
    └── ThresholdTier.test.ts
```

### Pattern 1: Post-Sync Domain Event Hook

**What:** After `BifrostSyncService.sync()` completes, dispatch a `BifrostSyncCompleted` event carrying the affected org IDs. The `AlertsServiceProvider.boot()` subscribes `EvaluateThresholdsService` as a handler.

**When to use:** Every sync cycle that processes > 0 records.

**Example:**
```typescript
// src/Modules/Dashboard/Domain/Events/BifrostSyncCompletedEvent.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class BifrostSyncCompletedEvent extends DomainEvent {
  constructor(affectedOrgIds: readonly string[]) {
    super(
      'bifrost-sync',              // aggregateId
      'bifrost.sync.completed',     // eventType
      { orgIds: affectedOrgIds },   // data payload
    )
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      orgIds: this.data.orgIds,
      occurredAt: this.occurredAt.toISOString(),
    }
  }
}
```

**Integration point in BifrostSyncService:**
```typescript
// At end of syncInternal(), after cursor advance:
if (synced > 0) {
  const uniqueOrgIds = [...new Set(affectedOrgIds)]
  await DomainEventDispatcher.getInstance().dispatch(
    new BifrostSyncCompletedEvent(uniqueOrgIds)
  )
}
```

**Key detail:** `BifrostSyncService` currently does NOT track affected org IDs. The sync loop processes each log with `apiKey.orgId` -- collect these into a Set during the loop.

### Pattern 2: Threshold Evaluation Pipeline

**What:** `EvaluateThresholdsService` receives affected org IDs, queries monthly cost sum, compares against budget, checks dedup state, and dispatches alerts.

**Example:**
```typescript
// Pseudocode for core logic
async evaluateOrg(orgId: string, currentMonth: MonthlyPeriod): Promise<void> {
  const config = await this.alertConfigRepo.findByOrgId(orgId)
  if (!config) return  // no budget set

  const monthlyCost = await this.usageRepo.queryMonthlyCostByOrg(
    orgId,
    currentMonth.startDate,
    currentMonth.endDate,
  )

  const costDecimal = new Decimal(monthlyCost)
  const budgetDecimal = new Decimal(config.budgetUsd)
  const percentage = costDecimal.div(budgetDecimal).times(100)

  // D-12: Only highest breached tier
  if (percentage.gte(100) && config.lastAlertedTier !== 'critical') {
    await this.sendAlert(orgId, config, 'critical', costDecimal)
  } else if (percentage.gte(80) && !config.lastAlertedTier) {
    await this.sendAlert(orgId, config, 'warning', costDecimal)
  }
}
```

### Pattern 3: Shared IMailer Port

**What:** Generic email interface in Foundation, implemented by UpyoMailer (prod) and ConsoleMailer (dev). Auth module's IEmailService delegates to IMailer underneath.

**Example:**
```typescript
// src/Foundation/Infrastructure/Ports/IMailer.ts
export interface MailMessage {
  readonly to: string | readonly string[]
  readonly subject: string
  readonly html: string
  readonly from?: string
}

export interface IMailer {
  send(message: MailMessage): Promise<void>
}
```

**Integration with existing Auth IEmailService:**
```typescript
// Refactored ConsoleEmailService (or new EmailServiceAdapter)
export class EmailServiceAdapter implements IEmailService {
  constructor(private readonly mailer: IMailer) {}

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.mailer.send({
      to,
      subject: 'Password Reset',
      html: passwordResetTemplate(resetUrl),
    })
  }
  // ... same for sendEmailVerification
}
```

### Pattern 4: Alert Deduplication State

**What:** Track `(org_id, monthly_period, last_alerted_tier)` in `alert_configs` table. Reset on month boundary.

**Example schema approach:**
```typescript
// In alert_configs table
last_alerted_tier: text('last_alerted_tier'),    // null | 'warning' | 'critical'
last_alerted_at: text('last_alerted_at'),         // ISO timestamp
last_alerted_month: text('last_alerted_month'),   // '2026-04' format
```

**Reset logic:** When evaluating, if `last_alerted_month !== currentMonth`, treat as fresh (no prior alerts this month).

### Anti-Patterns to Avoid
- **Registering timer/cron in ServiceProvider.boot():** Per existing codebase convention (see bootstrap.ts), timers MUST be registered in bootstrap.ts after `core.bootstrap()` completes, never in ServiceProvider
- **Mutating AlertConfig:** All domain objects follow immutability pattern -- `AlertConfig.setBudget()` returns new instance
- **Querying Bifrost API for cost:** Alert evaluation must query local `usage_records` table (SQLite), not live Bifrost API. Ensures data consistency with dashboard
- **Using JavaScript `number` for cost:** All cost math must use `Decimal.js` per STATE.md decision

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email sending | Custom SMTP client | @upyo/core + @upyo/smtp | SMTP protocol complexity, TLS, auth, encoding edge cases |
| Cost arithmetic | Native JS `number` ops | Decimal.js | IEEE 754 floating-point precision loss compounds over thousands of calculations |
| HTML email layout | Custom CSS + div layout | Table-based HTML templates | Email clients (Outlook) don't support Flexbox/Grid; must use table layout with inline styles |
| UUID generation | Custom ID generator | `crypto.randomUUID()` | Built into Bun runtime, cryptographically secure |
| Domain event bus | Custom pub/sub | Existing `DomainEventDispatcher` | Already proven in codebase, handles error isolation |

**Key insight:** The existing codebase provides nearly all infrastructure needed. The only net-new external dependency is Upyo for email transport and Decimal.js for cost math.

## Common Pitfalls

### Pitfall 1: BifrostSyncService Does Not Track Affected Org IDs
**What goes wrong:** The current `syncInternal()` method processes logs but doesn't collect which org IDs were affected. You need this Set to pass to the threshold evaluator.
**Why it happens:** v1.2 had no downstream consumers of sync results beyond the cursor update.
**How to avoid:** Collect `apiKey.orgId` into a `Set<string>` during the sync loop. Pass the Set to the domain event payload. This is a small, targeted change to BifrostSyncService.
**Warning signs:** Threshold evaluation runs on ALL orgs instead of just affected ones (performance problem).

### Pitfall 2: Monthly Cost Aggregation Query Missing
**What goes wrong:** `IUsageRepository` has `queryDailyCostByOrg()` and `queryStatsByOrg()` but no method for "sum of all costs in current calendar month." You need this for threshold comparison.
**Why it happens:** v1.2 dashboard uses date-range queries, not monthly aggregates.
**How to avoid:** Add `queryMonthlyCostByOrg(orgId: string, startDate: string, endDate: string): Promise<number>` to `IUsageRepository`. Or reuse `queryStatsByOrg()` with month start/end dates -- it returns `totalCost` which is the sum. **Recommendation:** Reuse existing `queryStatsByOrg()` with calendar month date range. No new repository method needed.
**Warning signs:** Creating a separate query when the existing one works with the right date range.

### Pitfall 3: Alert Dedup State Not Resetting on Month Boundary
**What goes wrong:** January alert state persists into February. No alerts fire in February because dedup logic still sees "already alerted."
**Why it happens:** Checking only `last_alerted_tier` without comparing the month.
**How to avoid:** Always compare `last_alerted_month` against current month. If different, treat as fresh state.
**Warning signs:** Tests pass in a single month but fail across month boundaries.

### Pitfall 4: Email Template Rendering in Outlook
**What goes wrong:** Alert email looks fine in Gmail but breaks in Outlook Desktop.
**Why it happens:** Outlook uses Word rendering engine, ignoring most CSS.
**How to avoid:** Use table-based layout with inline styles only. No `<div>`, no `display: flex/grid`, no `<style>` tags. All styles must be inline on the element.
**Warning signs:** No testing in Outlook or Apple Mail before shipping.

### Pitfall 5: Org Member Role Mapping
**What goes wrong:** CONTEXT says "All org ADMINs" but codebase has `admin` (system role) and `manager` (org member role). Alert emails go to wrong recipients.
**Why it happens:** CONTEXT.md uses "ADMIN" loosely. The codebase distinguishes system `admin` role (in `users` table) from org `manager` role (in `organization_members` table).
**How to avoid:** Alert recipients = org members with `role === 'manager'`. Use `IOrganizationMemberRepository.findByOrgId()` then filter by role. Additionally look up each member's email from the users table.
**Warning signs:** Sending alerts to system admins who aren't part of the org.

## Code Examples

### Alert Config Aggregate (Immutable Pattern)
```typescript
// Source: Existing Organization.ts immutability pattern
interface AlertConfigProps {
  readonly id: string
  readonly orgId: string
  readonly budgetUsd: string         // Stored as string for Decimal precision
  readonly lastAlertedTier: string | null  // null | 'warning' | 'critical'
  readonly lastAlertedAt: string | null
  readonly lastAlertedMonth: string | null // '2026-04'
  readonly createdAt: string
  readonly updatedAt: string
}

export class AlertConfig {
  private readonly props: AlertConfigProps

  private constructor(props: AlertConfigProps) {
    this.props = props
  }

  static create(id: string, orgId: string, budgetUsd: string): AlertConfig {
    return new AlertConfig({
      id,
      orgId,
      budgetUsd,
      lastAlertedTier: null,
      lastAlertedAt: null,
      lastAlertedMonth: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  updateBudget(newBudgetUsd: string): AlertConfig {
    return new AlertConfig({
      ...this.props,
      budgetUsd: newBudgetUsd,
      updatedAt: new Date().toISOString(),
    })
  }

  markAlerted(tier: 'warning' | 'critical', month: string): AlertConfig {
    return new AlertConfig({
      ...this.props,
      lastAlertedTier: tier,
      lastAlertedAt: new Date().toISOString(),
      lastAlertedMonth: month,
      updatedAt: new Date().toISOString(),
    })
  }

  needsAlert(currentMonth: string): boolean {
    return this.props.lastAlertedMonth !== currentMonth
      || this.props.lastAlertedTier === null
  }

  get id(): string { return this.props.id }
  get orgId(): string { return this.props.orgId }
  get budgetUsd(): string { return this.props.budgetUsd }
  get lastAlertedTier(): string | null { return this.props.lastAlertedTier }
  get lastAlertedMonth(): string | null { return this.props.lastAlertedMonth }
}
```

### Drizzle Schema for New Tables
```typescript
// Source: Existing schema.ts patterns
export const alertConfigs = sqliteTable(
  'alert_configs',
  {
    id: text('id').primaryKey(),
    org_id: text('org_id').notNull().unique(),   // One config per org
    budget_usd: text('budget_usd').notNull(),     // Decimal string
    last_alerted_tier: text('last_alerted_tier'), // null | 'warning' | 'critical'
    last_alerted_at: text('last_alerted_at'),
    last_alerted_month: text('last_alerted_month'), // '2026-04'
    created_at: text('created_at').notNull(),
    updated_at: text('updated_at').notNull(),
  },
  (table) => [
    index('idx_alert_configs_org_id').on(table.org_id),
  ],
)

export const alertEvents = sqliteTable(
  'alert_events',
  {
    id: text('id').primaryKey(),
    org_id: text('org_id').notNull(),
    tier: text('tier').notNull(),           // 'warning' | 'critical'
    budget_usd: text('budget_usd').notNull(),
    actual_cost_usd: text('actual_cost_usd').notNull(),
    percentage: text('percentage').notNull(),
    month: text('month').notNull(),          // '2026-04'
    recipients: text('recipients').notNull(), // JSON array of emails
    created_at: text('created_at').notNull(),
  },
  (table) => [
    index('idx_alert_events_org_id').on(table.org_id),
    index('idx_alert_events_month').on(table.month),
  ],
)
```

### Email Template Function (Plain HTML)
```typescript
// Source: D-08 plain HTML decision
export function warningAlertTemplate(params: {
  readonly orgName: string
  readonly budgetUsd: string
  readonly actualCostUsd: string
  readonly percentage: string
  readonly month: string
}): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding: 20px; background-color: #f5f5f5;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0">
          <tr><td style="padding: 20px; background-color: #fff;">
            <h1 style="font-size: 20px; color: #f59e0b;">Warning: Budget Alert</h1>
            <p style="font-size: 14px; color: #333;">
              Organization <strong>${params.orgName}</strong> has reached
              <strong>${params.percentage}%</strong> of the monthly budget.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Monthly Budget</td>
                <td style="padding: 8px; border: 1px solid #ddd;">$${params.budgetUsd}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;">Current Spend</td>
                <td style="padding: 8px; border: 1px solid #ddd;">$${params.actualCostUsd}</td>
              </tr>
            </table>
            <p style="font-size: 12px; color: #999;">
              Period: ${params.month} | Alert Level: Warning (80%)
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  `
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nodemailer for Bun | Upyo cross-runtime email | 2025-2026 | Nodemailer explicitly dropped Bun support; Upyo fills the gap |
| `number` for money | Decimal.js for all currency math | Industry standard | Prevents floating-point precision errors in cost thresholds |
| Separate email cron | Post-sync domain event hook | Design decision D-05 | Eliminates extra timer; alerts evaluate only when new data arrives |

## Open Questions

1. **IMailer Port Location**
   - What we know: D-07 says "Shared IMailer port in Foundation"
   - What's unclear: Whether to put the interface in `src/Foundation/Infrastructure/Ports/` (following existing patterns) or `src/Foundation/Application/Ports/`
   - Recommendation: Use `src/Foundation/Infrastructure/Ports/IMailer.ts` consistent with existing `ILLMGatewayClient` location pattern

2. **Auth IEmailService Migration**
   - What we know: Current `IEmailService` has 2 methods: `sendPasswordReset` and `sendEmailVerification`. D-07 says IMailer supersedes it.
   - What's unclear: Whether to refactor Auth module to use IMailer directly (breaking change) or wrap IMailer inside existing IEmailService (adapter pattern)
   - Recommendation: Adapter pattern -- `EmailServiceAdapter` implements `IEmailService` and delegates to `IMailer`. No breaking changes to Auth module.

3. **Org Member Email Resolution**
   - What we know: `IOrganizationMemberRepository.findByOrgId()` returns members with `userId` but not email. Need to join with users table.
   - What's unclear: Whether to add a new repository method or compose in the service layer
   - Recommendation: Compose in `SendAlertService` -- fetch members, then batch-lookup emails from user repository. Keeps repositories focused.

4. **ALRT-02 Scope**
   - What we know: ALRT-02 says "per individual API key" but D-02 says "org-level budgets only for v1.3"
   - What's unclear: Whether to implement ALRT-02 as "per-key alerts that fire based on org budget context" or defer entirely
   - Recommendation: Implement as "per-key cost contribution shown in alert email" without independent per-key budgets. The alert fires at org level; email body includes per-key breakdown if a key contributes disproportionately.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0.18 + Bun test runner |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `bun test src/Modules/Alerts` |
| Full suite command | `bun test src tests/Unit packages` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ALRT-01 | Set org budget config | unit | `bun test src/Modules/Alerts/__tests__/AlertConfig.test.ts` | Wave 0 |
| ALRT-01 | Budget validation (positive amount, Decimal) | unit | `bun test src/Modules/Alerts/__tests__/BudgetAmount.test.ts` | Wave 0 |
| ALRT-03 | Threshold evaluation triggers email | unit | `bun test src/Modules/Alerts/__tests__/EvaluateThresholdsService.test.ts` | Wave 0 |
| ALRT-04 | Dedup prevents re-alert same month | unit | `bun test src/Modules/Alerts/__tests__/EvaluateThresholdsService.test.ts` | Wave 0 |
| ALRT-05 | Warning vs critical tier logic | unit | `bun test src/Modules/Alerts/__tests__/ThresholdTier.test.ts` | Wave 0 |
| ALRT-03 | IMailer sends via Upyo | integration | `bun test src/Modules/Alerts/__tests__/UpyoMailer.integration.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `bun test src/Modules/Alerts`
- **Per wave merge:** `bun test src tests/Unit packages`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/Modules/Alerts/__tests__/AlertConfig.test.ts` -- covers ALRT-01
- [ ] `src/Modules/Alerts/__tests__/BudgetAmount.test.ts` -- covers ALRT-01 validation
- [ ] `src/Modules/Alerts/__tests__/ThresholdTier.test.ts` -- covers ALRT-05
- [ ] `src/Modules/Alerts/__tests__/EvaluateThresholdsService.test.ts` -- covers ALRT-03, ALRT-04

## Project Constraints (from CLAUDE.md)

- **Language:** Commit messages and code comments in Traditional Chinese (Taiwan); code identifiers in English
- **Immutability (CRITICAL):** All domain objects must create new instances, never mutate
- **File organization:** Many small files (200-400 lines typical, 800 max)
- **Function size:** Target < 50 lines
- **Error handling:** Typed Service Response pattern (`{ success, message, data?, error? }`)
- **Input validation:** Zod schemas via FormRequest pattern
- **No console.log:** Use structured logging (console.error for log lines is existing pattern in codebase)
- **GSD Workflow:** No direct repo edits outside GSD workflow
- **Test coverage:** 80% minimum
- **Biome formatting:** 2 spaces, single quotes, 100 char line width

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/Shared/Domain/DomainEventDispatcher.ts`, `src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts`, `src/Modules/Auth/Application/Ports/IEmailService.ts`
- Drizzle schema: `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` -- table patterns
- `.planning/research/STACK.md` -- Upyo selection rationale with Bun compatibility verification
- `.planning/research/PITFALLS-v1.3.md` -- Alert fatigue, email deliverability, dedup design
- `.planning/research/ARCHITECTURE.md` -- Alerts module topology recommendation
- npm registry verification: @upyo/core@0.4.0, @upyo/smtp@0.4.0, decimal.js@10.6.0

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES-v1.3.md` -- Feature landscape, anti-features, dependency graph
- Existing OrganizationMember entity -- role model (`manager` vs `member`)

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or npm registry

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- verified against npm, Bun compatibility confirmed in STACK.md research
- Architecture: HIGH -- follows existing DDD patterns exactly, all integration points verified in source code
- Pitfalls: HIGH -- identified from codebase analysis (missing org ID tracking, missing monthly query) and prior research (PITFALLS-v1.3.md)

**Research date:** 2026-04-12
**Valid until:** 2026-05-12 (stable domain, low churn risk)
