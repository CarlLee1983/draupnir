# Roadmap: Draupnir

**Last Updated**: 2026-04-12

## Milestones

- ✅ **v1.0 LLM Gateway Abstraction** — Phases 1-5 (shipped 2026-04-10)
- ✅ **v1.1 Pages & Framework** — Phases 6-7 (shipped 2026-04-11)
- ✅ **v1.2 Dashboard 分析和報告** — Phases 8-12 (shipped 2026-04-12)
- 🚧 **v1.3 Advanced Analytics & Alerts** — Phases 13-16 (in progress)

<details>
<summary><strong>v1.2 Dashboard 分析和報告</strong> (Phases 8-12) — SHIPPED 2026-04-12</summary>

### Phase 8: Data Correctness & Permission Foundation
**Goal**: The dashboard reads real data and respects role boundaries.
**Status**: ✅ COMPLETED 2026-04-11

### Phase 9: Cached Sync Infrastructure
**Goal**: SQLite local reads populate dashboard metrics.
**Status**: ✅ COMPLETED 2026-04-11

### Phase 10: P1 Chart UI
**Goal**: KPI cards, trend area charts, model comparison charts/tables.
**Status**: ✅ COMPLETED 2026-04-11

### Phase 11: Resilience & UX Polish
**Goal**: Timeout handling, staleness UX, indexed query performance.
**Status**: ✅ COMPLETED 2026-04-11

### Phase 12: Differentiators
**Goal**: Period-over-period change badges, PDF export via `window.print()`.
**Status**: ✅ COMPLETED 2026-04-12

</details>

---

## 🚧 v1.3 Advanced Analytics & Alerts (In Progress)

**Milestone Goal:** Proactive cost control — alerts, per-key attribution, and automated reports transform Draupnir from reactive observation to proactive cost management.

## Phases

- [ ] **Phase 13: Alert Foundation & Email Infrastructure** - Cost threshold alerts with email notifications and deduplication
- [ ] **Phase 14: Per-Key Cost Breakdown** - Granular per-key and per-model cost attribution dashboard
- [ ] **Phase 15: Webhook Alerts** - Webhook endpoint registration with HMAC signing and alert history
- [ ] **Phase 16: Automated Reports** - Scheduled PDF report generation and email delivery

## Phase Details

### Phase 13: Alert Foundation & Email Infrastructure
**Goal**: Users receive proactive email notifications when API key or organization costs exceed configured thresholds
**Depends on**: Phase 12 (v1.2 usage_records + analytics infrastructure)
**Requirements**: ALRT-01, ALRT-02, ALRT-03, ALRT-04, ALRT-05
**Success Criteria** (what must be TRUE):
  1. User can set soft (warning) and hard (critical) cost thresholds for an organization
  2. User can set soft and hard cost thresholds for individual API keys
  3. System sends an email when a threshold is breached, with correct severity level indicated
  4. System does not send duplicate alerts for the same threshold breach within the deduplication window
  5. Alert emails distinguish between warning (soft limit) and critical (hard limit) severity
**Plans**: TBD
**UI hint**: yes

### Phase 14: Per-Key Cost Breakdown
**Goal**: Users can analyze cost attribution per API key and per model to identify spending patterns
**Depends on**: Phase 12 (v1.2 usage_records + chart infrastructure)
**Requirements**: COST-01, COST-02, COST-03, COST-04
**Success Criteria** (what must be TRUE):
  1. User can view a table showing each API key's cost for a selected time period (7/30/90 days)
  2. User can see token usage efficiency metrics (cost per token, tokens per request) for each key
  3. User can view cost distribution across models with percentage breakdowns
  4. User can view per-model aggregation showing each model's share of total organization usage
**Plans**: TBD
**UI hint**: yes

### Phase 15: Webhook Alerts
**Goal**: Users can receive alert notifications via webhook endpoints with cryptographic verification
**Depends on**: Phase 13 (alert infrastructure and threshold logic)
**Requirements**: ALRT-06, ALRT-07, ALRT-08
**Success Criteria** (what must be TRUE):
  1. User can register a webhook URL to receive alert notifications when thresholds are breached
  2. All webhook payloads include an HMAC-SHA256 signature that receivers can verify
  3. User can view a history of all alerts with delivery status (sent, failed) per channel
**Plans**: TBD
**UI hint**: yes

### Phase 16: Automated Reports
**Goal**: Admins receive scheduled PDF usage reports via email without manual intervention
**Depends on**: Phase 13 (email infrastructure), Phase 14 (cost breakdown data)
**Requirements**: REPT-01, REPT-02, REPT-03, REPT-04
**Success Criteria** (what must be TRUE):
  1. Admin can configure weekly or monthly PDF report delivery for their organization
  2. System generates a server-side PDF containing dashboard charts and cost summary data
  3. System emails the generated PDF to configured recipients on the scheduled cadence
  4. Report scheduling respects the admin's selected timezone, including DST transitions
**Plans**: TBD

## Progress

**Execution Order:** Phases 13 → 14 → 15 → 16
(Phase 14 can begin in parallel with Phase 13 if needed — no hard dependency)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 13. Alert Foundation & Email Infrastructure | v1.3 | 0/? | Not started | - |
| 14. Per-Key Cost Breakdown | v1.3 | 0/? | Not started | - |
| 15. Webhook Alerts | v1.3 | 0/? | Not started | - |
| 16. Automated Reports | v1.3 | 0/? | Not started | - |
