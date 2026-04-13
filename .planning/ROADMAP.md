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

- [x] **Phase 18: Uniform Background Jobs (2 plans)** (completed 2026-04-13)
  **Requirements:** JOBS-01, JOBS-02, JOBS-03, JOBS-04
  **Goal:** 建立 IScheduler 抽象（Port/Adapter + retry/exponential backoff），將 BifrostSync setInterval 與 ScheduleReportService 的散佈定時邏輯全部遷移至統一 registerJobs() lifecycle hook；`bootstrap.ts` 零 setInterval、零 `new Cron(`。
  **Plans:** 2 plans
  Plans:
  - [x] 18-01-PLAN.md — Scheduler 抽象基礎：IScheduler port、CronerScheduler adapter（retry + backoff + runOnInit）、FakeScheduler 測試替身、DI `'scheduler'` singleton 綁定
  - [x] 18-02-PLAN.md — 現有任務遷移：ScheduleReportService 改為 IScheduler 代理、ReportsServiceProvider 移除 boot()、DashboardServiceProvider.registerJobs() 接手 BifrostSync、bootstrap.ts registerJobs 迴圈、BIFROST_SYNC_CRON config
- [ ] **Phase 19: Alerts Module Decoupling (3 plans)**
  **Requirements:** ALERTS-01, ALERTS-02, ALERTS-03, ALERTS-04, ALERTS-05
  **Goal:** 讓 Alerts 模組遵循 Phase 17 建立的 ORM-agnostic 模式，徹底斷絕與 Drizzle 的直接耦合、收斂跨模組依賴面、建立統一 IAlertNotifier 策略與可在無 DI 容器下運行的測試 fixtures。
  **Plans:** 3 plans
  Plans:
  - [ ] 19-01-PLAN.md — ORM 解耦：4 個 Alerts repos 改用 IDatabaseAccess + IQueryBuilder；denormalize alert_deliveries 的 org_id/month/tier；DI binding 去除 drizzle 前綴
  - [ ] 19-02-PLAN.md — 依賴收斂：IAlertRecipientResolver port + 實作；SendAlertService / EvaluateThresholdsService object-literal ctor；MODULE.md
  - [ ] 19-03-PLAN.md — Notifier 統一 + DI-less fakes：IAlertNotifier port + Email/Webhook notifiers；ResendDeliveryService 接 notifierRegistry；`__tests__/fakes/` 共用 InMemory fixtures；刪除 DispatchAlertWebhooksService
- [ ] Phase 20: CI Verification Guardrails (2 plans)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 13. Alert Foundation | v1.3 | 2/2 | Complete | 2026-04-12 |
| 14. Cost Breakdown | v1.3 | 2/2 | Complete | 2026-04-12 |
| 15. Webhook Alerts | v1.3 | 4/4 | Complete | 2026-04-12 |
| 16. Automated Reports | v1.3 | 2/2 | Complete | 2026-04-12 |
| 17. Repository Refactor | v1.3 | 5/5 | Complete | 2026-04-12 |
| 18. Uniform Background Jobs | v1.4 | 2/2 | Complete   | 2026-04-13 |
| 19. Alerts Decoupling | v1.4 | 0/3 | Planned | - |
| 20. CI Guardrails | v1.4 | 0/2 | Not started | - |
