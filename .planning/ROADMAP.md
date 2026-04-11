# Roadmap: Draupnir

**Last Updated**: 2026-04-12

## Milestones

- ✅ **v1.0 LLM Gateway Abstraction** — Phases 1-5 (shipped 2026-04-10)
- ✅ **v1.1 Pages & Framework** — Phases 6-7 (shipped 2026-04-11)
- ✅ **v1.2 Dashboard 分析和報告** — Phases 8-12 (shipped 2026-04-12)

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
**Success Criteria**:
  1. ✅ User can click "Download Report" to trigger a PDF printout.
  2. ✅ KPI cards show % change badges vs prior period.
  3. ✅ PDF hides nav/sidebar and focuses on analytics.

</details>

---

## 🚧 Next Milestones (Planned)

### v1.3 Advanced Analytics & Alerts
- [ ] Phase 13: Usage Alerts (Webhooks/Email)
- [ ] Phase 14: Per-Key Token Cost Analysis
- [ ] Phase 15: Admin User Management Refactor
