# Phase 13: Alert Foundation & Email Infrastructure - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users receive proactive email notifications when organization costs exceed configured thresholds. This phase delivers: budget configuration, threshold evaluation pipeline, email infrastructure (Upyo), alert deduplication, and the alert events audit trail. Per-key budgets, webhook delivery, and automated reports belong in later phases.

</domain>

<decisions>
## Implementation Decisions

### Threshold Configuration Model
- **D-01:** Budget + percentage tiers model — user sets a monthly dollar budget per org, system alerts at fixed 80% (warning) and 100% (critical) thresholds
- **D-02:** Org-level budgets only for v1.3 — no per-key independent budgets. Per-key alerts fire based on org budget context
- **D-03:** Fixed 80% / 100% percentage tiers — not user-configurable. Matches AWS/GCP industry pattern
- **D-04:** Calendar month budget period — resets on 1st of each month. Threshold state resets automatically

### Alert Evaluation Trigger
- **D-05:** Post-BifrostSync hook — after each sync run completes, fire a domain event that triggers threshold evaluation. No separate cron needed
- **D-06:** Evaluate only orgs with new usage data — BifrostSyncService passes affected org IDs to the evaluator, skipping inactive orgs

### Email Service Architecture
- **D-07:** Shared IMailer port in Foundation — generic `send(to, subject, html)` interface. Auth's IEmailService and Alert's email sender both use it underneath. Upyo implementation in Infrastructure
- **D-08:** Plain HTML string templates — simple template functions returning HTML strings for alert emails. No React Email dependency
- **D-09:** All org ADMINs receive alert emails — no per-recipient configuration UI needed for v1.3

### Deduplication Strategy
- **D-10:** Per-threshold state tracking — track `(org, threshold_tier)` with `last_alerted_at` + `last_alerted_tier`. Don't re-alert for same tier until budget resets (next calendar month)
- **D-11:** No re-alert within same month — once 80% fires, it's done for that month. Only escalation to 100% triggers a new alert
- **D-12:** Only highest breached tier sent — if cost jumps from 50% past both 80% and 100% in one sync, send only the critical (100%) alert

### Claude's Discretion
- DB schema design for alert_configs and alert_events tables
- Internal structure of the Alerts module (aggregates, value objects, services)
- How IMailer port integrates with existing ConsoleEmailService for dev mode
- Domain event naming and payload structure for post-sync hook

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Research
- `.planning/REQUIREMENTS.md` — ALRT-01 through ALRT-05 acceptance criteria for this phase
- `.planning/research/FEATURES-v1.3.md` — Feature landscape, anti-features, dependency graph
- `.planning/research/ARCHITECTURE.md` — Recommended module topology for Alerts module
- `.planning/research/STACK.md` — Upyo email stack selection rationale + integration patterns
- `.planning/research/PITFALLS-v1.3.md` — Alert fatigue pitfall (#1), deduplication design guidance

### Existing Code
- `src/Modules/Auth/Application/Ports/IEmailService.ts` — Existing email port interface (to be superseded by shared IMailer)
- `src/Modules/Auth/Infrastructure/Services/ConsoleEmailService.ts` — Dev stub pattern to replicate for alerts
- `src/Modules/Dashboard/Infrastructure/Services/BifrostSyncService.ts` — Sync service to hook post-sync domain event into
- `src/Modules/Dashboard/Application/Ports/IUsageRepository.ts` — Usage data port for cost aggregation queries
- `src/Shared/Domain/DomainEventDispatcher.ts` — Event bus pattern for post-sync hook
- `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` — Schema file for new alert tables

### Codebase Maps
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, DDD module structure, error handling
- `.planning/codebase/ARCHITECTURE.md` — Four-layer DDD architecture, data flow, key abstractions
- `.planning/codebase/STACK.md` — Technology stack, Bun runtime, Drizzle ORM

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DomainEventDispatcher` (src/Shared/Domain/): Proven cross-module event bus — use for post-sync → evaluate-thresholds hook
- `IUsageRepository` (Dashboard module): Already provides cost aggregation queries on `usage_records` — extend with org-level monthly sum
- `ConsoleEmailService` pattern: Dev/prod email stub approach — replicate for IMailer dev mode
- `ModuleServiceProvider` base class: Standard DI registration pattern for new Alerts module
- `FormRequest` + Zod validation: Established input validation for budget configuration endpoints
- Existing role-scoped access middleware: `createRoleMiddleware()`, `createModuleAccessMiddleware()` — reuse for alert config endpoints

### Established Patterns
- **DDD Module Structure:** Domain/Application/Infrastructure/Presentation layers with port-based repositories
- **Immutable Aggregates:** State changes return new instances (AlertConfig, UsageAlert should follow this)
- **ServiceProvider DI:** All services registered in `*ServiceProvider.register()`, events subscribed in `boot()`
- **Typed Service Response:** `{ success: boolean, message: string, data?, error? }` pattern
- **Value Objects:** Validate at creation time, throw on invalid state (ThresholdTier, BudgetAmount)

### Integration Points
- `src/bootstrap.ts` — Register new AlertsServiceProvider
- `src/routes.ts` / `src/wiring/index.ts` — Register alert routes via `registerAlerts(core)`
- `BifrostSyncService` — Add domain event dispatch after sync completion
- `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` — Add `alert_configs` + `alert_events` tables

</code_context>

<specifics>
## Specific Ideas

User noted: "先把 alert pipeline 建好，再來優化 alert 規則" — Build the alert pipeline first, optimize alert rules later. This confirms the approach of shipping a simple, working pipeline (fixed thresholds, email-only, org-level) before adding flexibility.

</specifics>

<deferred>
## Deferred Ideas

- Per-key independent budgets — potential future enhancement beyond org-level budgets
- User-configurable percentage tiers — fixed 80%/100% for now
- Configurable alert recipients — all ADMINs for now, per-recipient config later
- React Email templates — plain HTML sufficient for v1.3
- Rolling 30-day budget windows — calendar month only for v1.3

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-alert-foundation-email-infrastructure*
*Context gathered: 2026-04-12*
