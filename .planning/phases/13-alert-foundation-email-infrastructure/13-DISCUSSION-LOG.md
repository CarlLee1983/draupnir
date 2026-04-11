# Phase 13: Alert Foundation & Email Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 13-alert-foundation-email-infrastructure
**Areas discussed:** Threshold Configuration Model, Alert Evaluation Trigger, Email Service Architecture, Deduplication Strategy

---

## Threshold Configuration Model

### Q1: How should cost thresholds be defined?

| Option | Description | Selected |
|--------|-------------|----------|
| Budget + percentage tiers | User sets monthly budget, system alerts at 80%/100%. Matches AWS/GCP pattern. | ✓ |
| Absolute dollar amounts | User sets exact dollar thresholds. More flexible but user does math. | |
| Both options available | User picks either model. More UI complexity. | |

**User's choice:** Budget + percentage tiers (Recommended)
**Notes:** None

### Q2: Should per-key thresholds inherit from org budget or be independent?

| Option | Description | Selected |
|--------|-------------|----------|
| Org-level only for v1.3 | One budget per org. Simplest MVP. | ✓ |
| Independent per-key budgets | Each key gets own budget. More granular but complex. | |
| Org budget + per-key override | Default from org, keys can override. Most complex. | |

**User's choice:** Org-level only for v1.3 (Recommended)
**Notes:** None

### Q3: Should percentage tiers be fixed or user-configurable?

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 80% / 100% | Hardcoded. Matches industry standard. Simpler schema. | ✓ |
| User-configurable | User picks warning/critical %. More flexible. | |
| You decide | Claude picks simplest approach. | |

**User's choice:** Fixed 80% / 100% (Recommended)
**Notes:** None

### Q4: What period does the budget cover?

| Option | Description | Selected |
|--------|-------------|----------|
| Calendar month | Resets on 1st. Matches billing cycles. | ✓ |
| Rolling 30-day window | Always last 30 days. Harder for users to reason about. | |
| You decide | Claude picks based on usage_records table. | |

**User's choice:** Calendar month (Recommended)
**Notes:** None

---

## Alert Evaluation Trigger

### Q1: When should the system evaluate cost thresholds?

| Option | Description | Selected |
|--------|-------------|----------|
| Post-sync hook | After BifrostSyncService completes, fire domain event. No new scheduler. | ✓ |
| Separate dedicated cron | Independent cron reads usage_records. Decoupled but more processes. | |
| You decide | Claude picks cleanest integration. | |

**User's choice:** Post-sync hook (Recommended)
**Notes:** None

### Q2: Should evaluation check ALL orgs or only orgs with new data?

| Option | Description | Selected |
|--------|-------------|----------|
| Only orgs with new data | BifrostSyncService passes affected org IDs. Efficient. | ✓ |
| All orgs every time | Evaluate every org. Simpler but wasteful. | |
| You decide | Claude picks based on BifrostSyncService return data. | |

**User's choice:** Only orgs with new data (Recommended)
**Notes:** None

---

## Email Service Architecture

### Q1: How should alert email fit with existing IEmailService?

| Option | Description | Selected |
|--------|-------------|----------|
| Shared IMailer in Foundation | Generic IMailer port. Auth and Alerts both use it. Clean separation. | ✓ |
| Extend existing IEmailService | Add sendAlertNotification() to Auth's interface. Couples concerns. | |
| Separate IAlertNotifier port | Alert module defines own port. Independent but may duplicate setup. | |

**User's choice:** Shared IMailer in Foundation (Recommended)
**Notes:** None

### Q2: How should alert email templates be built?

| Option | Description | Selected |
|--------|-------------|----------|
| Plain HTML string templates | Simple template functions. No new deps. Fast to implement. | ✓ |
| React Email components | Type-safe components. More maintainable but adds dependency. | |
| You decide | Claude picks simplest approach. | |

**User's choice:** Plain HTML string templates (Recommended)
**Notes:** None

### Q3: Who receives the alert email?

| Option | Description | Selected |
|--------|-------------|----------|
| All org ADMINs | Alert goes to every ADMIN in org. No config UI needed. | ✓ |
| Configurable recipient list | Admin selects who gets alerts. Requires UI. | |
| Budget creator only | Only the user who set budget. Simplest but may miss stakeholders. | |

**User's choice:** All org ADMINs (Recommended)
**Notes:** None

---

## Deduplication Strategy

### Q1: How should the system prevent duplicate alerts?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-threshold state tracking | Track (org, tier) with last_alerted_at. Don't re-alert until month resets. | ✓ |
| Time-window cooldown | Suppress same alert for N hours. Re-sends after cooldown. | |
| You decide | Claude picks based on calendar-month model. | |

**User's choice:** Per-threshold state tracking (Recommended)
**Notes:** None

### Q2: Should system re-alert if cost drops then re-crosses threshold?

| Option | Description | Selected |
|--------|-------------|----------|
| No re-alert within same month | Once 80% fires, done for that month. Only escalation to 100% triggers new alert. | ✓ |
| Re-alert on re-crossing | If cost dips and re-crosses, fire new alert. More accurate but noisier. | |
| You decide | Claude picks for calendar-month model. | |

**User's choice:** No re-alert within same month (Recommended)
**Notes:** None

### Q3: Should 80% and 100% alerts be independent when both breach simultaneously?

| Option | Description | Selected |
|--------|-------------|----------|
| Only highest breached tier | If both crossed, send only critical (100%). Reduces noise. | ✓ |
| Send both in order | Always send 80% first, then 100%. Clear progression but more emails. | |
| You decide | Claude picks to minimize alert fatigue. | |

**User's choice:** Only highest breached tier (Recommended)
**Notes:** None

---

## Claude's Discretion

- DB schema design for alert_configs and alert_events tables
- Internal Alerts module structure (aggregates, value objects, services)
- IMailer integration with existing ConsoleEmailService for dev mode
- Domain event naming and payload structure for post-sync hook

## Deferred Ideas

- Per-key independent budgets
- User-configurable percentage tiers
- Configurable alert recipients
- React Email templates
- Rolling 30-day budget windows
