# Roadmap: Draupnir

**Last Updated**: 2026-04-13

## Milestones

- ✅ **v1.0 LLM Gateway Abstraction** — Phases 1-5 (shipped 2026-04-10)
- ✅ **v1.1 Pages & Framework** — Phases 6-7 (shipped 2026-04-11)
- ✅ **v1.2 Dashboard 分析和報告** — Phases 8-12 (shipped 2026-04-12)
- ✅ **v1.3 Advanced Analytics & Alerts** — Phases 13-17 (shipped 2026-04-12)
- 🚧 **v1.4 Hardening & Refinement** — Phases 18-20 (planned)

## Phases

<details>
<summary>✅ v1.3 Advanced Analytics & Alerts (Phases 13-17) — SHIPPED 2026-04-12</summary>

- [x] Phase 13: Alert Foundation & Email Infrastructure
- [x] Phase 14: Per-Key Cost Breakdown
- [x] Phase 15: Webhook Alerts
- [x] Phase 16: Automated Reports
- [x] Phase 17: IQueryBuilder & UsageRepository Refactor

</details>

<details>
<summary>✅ v1.2 Dashboard 分析和報告 (Phases 8-12) — SHIPPED 2026-04-12</summary>

- [x] Phase 8: Data Correctness & Permission Foundation
- [x] Phase 9: Cached Sync Infrastructure
- [x] Phase 10: P1 Chart UI
- [x] Phase 11: Resilience & UX Polish
- [x] Phase 12: Differentiators

</details>

<details>
<summary>✅ v1.0 & v1.1 Foundation (Phases 1-7) — SHIPPED 2026-04-11</summary>

- [x] Phase 1: LLM Gateway Abstraction
- [x] Phase 2: Business Layer Migration
- [x] Phase 3: Domain Rename
- [x] Phase 4: SDK Extraction
- [x] Phase 5: Final Verification
- [x] Phase 6: Pages
- [x] Phase 7: Framework Capability Docs

</details>

### 🚧 v1.4 Hardening & Refinement (In Progress)

- [ ] **Phase 18: Uniform Background Jobs (2 plans)**
  **Requirements:** JOBS-01, JOBS-02, JOBS-03, JOBS-04
  **Goal:** 建立 IScheduler 抽象（Port/Adapter + retry/exponential backoff），將 BifrostSync setInterval 與 ScheduleReportService 的散佈定時邏輯全部遷移至統一 registerJobs() lifecycle hook；`bootstrap.ts` 零 setInterval、零 `new Cron(`。
  **Plans:** 2 plans
  Plans:
  - [x] 18-01-PLAN.md — Scheduler 抽象基礎：IScheduler port、CronerScheduler adapter（retry + backoff + runOnInit）、FakeScheduler 測試替身、DI `'scheduler'` singleton 綁定
  - [ ] 18-02-PLAN.md — 現有任務遷移：ScheduleReportService 改為 IScheduler 代理、ReportsServiceProvider 移除 boot()、DashboardServiceProvider.registerJobs() 接手 BifrostSync、bootstrap.ts registerJobs 迴圈、BIFROST_SYNC_CRON config
- [ ] Phase 19: Alerts Module Decoupling (3 plans)
- [ ] Phase 20: CI Verification Guardrails (2 plans)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 13. Alert Foundation | v1.3 | 2/2 | Complete | 2026-04-12 |
| 14. Cost Breakdown | v1.3 | 2/2 | Complete | 2026-04-12 |
| 15. Webhook Alerts | v1.3 | 4/4 | Complete | 2026-04-12 |
| 16. Automated Reports | v1.3 | 2/2 | Complete | 2026-04-12 |
| 17. Repository Refactor | v1.3 | 5/5 | Complete | 2026-04-12 |
| 18. Uniform Background Jobs | v1.4 | 1/2 | In Progress | - |
| 19. Alerts Decoupling | v1.4 | 0/3 | Not started | - |
| 20. CI Guardrails | v1.4 | 0/2 | Not started | - |
