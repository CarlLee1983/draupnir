# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.3 — Advanced Analytics & Alerts

**Shipped:** 2026-04-12
**Phases:** 5 | **Plans:** 15 | **Sessions:** ~4

### What Was Built
- **Proactive Alerts:** Cost threshold notifications (80% warning / 100% critical) with email deduplication and signed Webhooks.
- **Granular Attribution:** Per-key and per-model cost/token breakdown dashboard with efficiency metrics.
- **Automated Reports:** Scheduled server-side PDF generation via Playwright and Croner-driven delivery.
- **Infrastructure Abstraction:** Decoupled `UsageRepository` from Drizzle ORM using a declarative `AggregateSpec` engine.

### What Worked
- **Decoupled Aggregation:** The `AggregateSpec` pattern enabled 100% query parity testing between in-memory and SQLite adapters, eliminating "it works on my machine" SQL bugs.
- **Visual Reuse:** Using Playwright to render existing dashboard views as PDFs avoided redundant chart rendering implementation.
- **Event-Driven Alerts:** Wiring alerts to the `BifrostSyncCompletedEvent` ensured evaluation only happens when fresh data is available, preventing duplicate notifications.

### What Was Inefficient
- **Partial Refactoring:** Refactoring the `Usage` repository while leaving `Alerts` repositories on direct Drizzle dependencies created a temporary "architectural split" within the codebase.
- **Migration Overhead:** Text-to-Real migration for credit costs required manual SQL script testing because the ORM was abstracted halfway through.

### Patterns Established
- **Declarative DSLs:** Use of tagged objects (`AggregateSpec`) for database primitives to keep domain logic pure.
- **Shared Mailer Port:** Standardized email delivery across alerts and reports via a singleton port.

### Key Lessons
1. **Spec-first Database Logic:** Defining the aggregation DSL before implementing the repository refactor forced a clean interface that didn't leak SQLite specifics.
2. **Standardized Context:** Standardizing all gateway field names to "gatewayKeyId" before building analytics simplified the multi-tenant metrics logic.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Date | Phases | Key Change |
|-----------|------|--------|------------|
| v1.0 | 2026-04-10 | 5 | Gateway abstraction & SDK extraction |
| v1.1 | 2026-04-11 | 2 | Unit test coverage for all handlers |
| v1.2 | 2026-04-12 | 5 | Local SQLite sync for high-speed dashboard |
| v1.3 | 2026-04-12 | 5 | Proactive alerting & architectural decoupling |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 450+ | - | 1 (bifrost-sdk) |
| v1.1 | 912 | 100% | 0 |
| v1.2 | 950+ | High | 1 (Nav-hidden UI) |
| v1.3 | 1020+ | High | 1 (AggregateSpec) |

### Top Lessons (Verified Across Milestones)

1. **Local-First Analytics:** Fetching usage data asynchronously and reading from a local SQLite cache is the only way to achieve < 100ms dashboard latency for multi-organization keys.
2. **Composition over inheritance:** Standardizing ports/adapters for all external services (Gateway, Database, Mailer) makes the Bun + DDD architecture highly resilient to infrastructure shifts.
