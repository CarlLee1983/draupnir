# Requirements: Draupnir v1.3

**Defined:** 2026-04-12
**Core Value:** Proactive cost control — alerts, per-key attribution, and automated reports transform Draupnir from reactive observation to proactive cost management.

## v1.3 Requirements

Requirements for v1.3 milestone. Each maps to roadmap phases.

### Alerts

- [ ] **ALRT-01**: User can configure cost threshold alerts (soft 80% / hard 100%) per organization
- [ ] **ALRT-02**: User can configure cost threshold alerts per individual API key
- [ ] **ALRT-03**: System sends email notification when cost threshold is breached
- [ ] **ALRT-04**: System deduplicates alerts within a configurable window to prevent alert fatigue
- [ ] **ALRT-05**: Alerts include severity levels (warning / critical) based on threshold tier
- [ ] **ALRT-06**: User can register webhook endpoints for alert notifications (MVP)
- [ ] **ALRT-07**: Webhook payloads are signed with HMAC-SHA256 for verification
- [ ] **ALRT-08**: User can view alert history and delivery status

### Cost Breakdown

- [ ] **COST-01**: User can view per-key cost breakdown for a given time period
- [ ] **COST-02**: User can view per-key token usage efficiency metrics
- [ ] **COST-03**: User can view per-model cost distribution across the organization
- [ ] **COST-04**: User can view per-model aggregation with usage percentage

### Reports

- [ ] **REPT-01**: Admin can configure scheduled PDF report delivery (weekly / monthly)
- [ ] **REPT-02**: System generates server-side PDF reports with dashboard charts and cost data
- [ ] **REPT-03**: System emails PDF reports to configured recipients on schedule
- [ ] **REPT-04**: Report scheduling supports timezone selection to handle DST correctly

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Alerts

- **ALRT-09**: Advanced webhook retry with exponential backoff and dead-letter queue
- **ALRT-10**: Custom alert rule builder (beyond cost thresholds)

### Reports

- **REPT-05**: Report schedule management UI (create/edit/delete schedules from dashboard)
- **REPT-06**: On-demand report generation from dashboard

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| SMS/push notifications | High complexity, low ROI for B2B use case |
| ML anomaly detection | Excessive scope for v1.3; cost thresholds sufficient |
| Real-time WebSocket alerts | Post-sync evaluation (hourly) is acceptable latency |
| Multi-currency support | USD-only simplifies v1.3; revisit if needed |
| Hard enforcement (auto-disable keys) | Risk of disruption; alerts are informational only |
| Custom alert logic/rule builder | Premature complexity; fixed thresholds for v1.3 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ALRT-01 | Phase 13 | Pending |
| ALRT-02 | Phase 13 | Pending |
| ALRT-03 | Phase 13 | Pending |
| ALRT-04 | Phase 13 | Pending |
| ALRT-05 | Phase 13 | Pending |
| ALRT-06 | Phase 15 | Pending |
| ALRT-07 | Phase 15 | Pending |
| ALRT-08 | Phase 15 | Pending |
| COST-01 | Phase 14 | Pending |
| COST-02 | Phase 14 | Pending |
| COST-03 | Phase 14 | Pending |
| COST-04 | Phase 14 | Pending |
| REPT-01 | Phase 16 | Pending |
| REPT-02 | Phase 16 | Pending |
| REPT-03 | Phase 16 | Pending |
| REPT-04 | Phase 16 | Pending |

**Coverage:**
- v1.3 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-04-12*
*Last updated: 2026-04-12 after roadmap creation*
