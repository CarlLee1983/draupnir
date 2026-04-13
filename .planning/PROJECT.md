# Draupnir — LLM Gateway Abstraction

## What This Is

Draupnir is an existing TypeScript + Bun + DDD service that currently speaks directly to Bifrost API Gateway for LLM virtual-key management, usage tracking, and chat-completion proxying. This project introduces an `ILLMGatewayClient` abstraction so business logic no longer imports Bifrost types, and extracts the `BifrostClient` into a standalone `packages/bifrost-sdk/` workspace package so future gateway backends (OpenRouter, Gemini, mocks) can be swapped in at build time without touching the application layer.

## Core Value

**No file under `src/Modules/` or `src/Foundation/Application/` may import a Bifrost-specific symbol after this milestone ships (v1.0 achieved); v1.3 delivers proactive cost control via alerts, per-key attribution, and automated reports.**

## Requirements

### Validated

- ✓ `ILLMGatewayClient` interface with camelCase DTOs, adapter, mock, barrel export — v1.0
- ✓ All 7 application services migrated to `ILLMGatewayClient` with tests — v1.0
- ✓ `bifrostVirtualKeyId` → `gatewayKeyId` renamed across domain and repos — v1.0
- ✓ `packages/bifrost-sdk/` workspace package with BifrostClient, config, types, errors — v1.0
- ✓ All 19 page handler classes unit-tested; all 25 Inertia page routes covered — v1.1
- ✓ Complete i18n migration and standardizing all API responses to English — v1.1
- ✓ `BifrostSyncService` + `usage_records` SQLite schema for local analytics reads — v1.2
- ✓ Six production dashboard charts (Cost, Tokens, Models) using Recharts — v1.2
- ✓ Role-scoped analytics (ADMIN/MANAGER/MEMBER) with key-level isolation — v1.2
- ✓ Period-over-period comparison badges and PDF export via browser print — v1.2
- ✓ Usage alerts foundation, webhook alerts CRUD/history/resend, and signed delivery persistence — v1.3
- ✓ Per-key/per-model cost breakdown with token efficiency metrics — v1.3
- ✓ Scheduled server-side PDF usage reports via Croner + Playwright — v1.3
- ✓ ORM-agnostic `UsageRepository` with declarative `AggregateSpec` and `IQueryBuilder.aggregate` — v1.3

### Active

- [ ] Implement `OpenRouterGatewayAdapter` (v2)
- [ ] Extend `ILLMGatewayClient` to cover raw chat-completion proxying (v2)
- [ ] Standardize background job runners (move scheduled reports to sync-style interval) (v1.4)
- [ ] Refactor Alerts repositories to ORM-agnostic pattern (v1.4)

### Out of Scope

- **Abstracting `ProxyModelCall` behind `ILLMGatewayClient`** — Raw chat-completion proxying is a different concern than virtual-key management.
- **Runtime gateway switching** — Gateway is a compile-time/ServiceProvider decision.
- **Database schema migration for `bifrost_virtual_key_id` column** — TS-only rename.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| `ProxyModelCall` stays on Bifrost | Chat-completion proxying is out of scope for key management | ✅ Completed |
| `bifrost-sdk` lives as a workspace package | Keeps development loop in one repo, versioned together | ✅ Completed |
| i18n migration for all page handlers | Ensures consistent English-only API and localized UI | ✅ Completed |
| Cached aggregation (SQLite local reads) | Avoids 500ms-5s Bifrost API latency; enables sub-100ms UI | ✅ Completed |
| PDF export via `window.print()` | Simplest implementation with high visual fidelity; no new deps | ✅ Completed |
| HMAC-SHA256 Webhook Signing | Standard industry pattern for message integrity and authenticity | ✅ Completed |
| Declarative `AggregateSpec` | Decouples repository logic from ORM-specific syntax (Drizzle/Atlas) | ✅ Completed |
| Playwright for Server-side PDF | Native headless browser support; consistent layout with dashboard | ✅ Completed |

---
*Last updated: 2026-04-12 after v1.3 milestone completion*

## Shipped Milestones

### v1.0: LLM Gateway Abstraction ✓
**Completed 2026-04-10**

### v1.1: Pages & Framework ✓
**Completed 2026-04-11**

### v1.2: Dashboard 分析和報告 ✓
**Completed 2026-04-12**

### v1.3: Advanced Analytics & Alerts ✓
**Completed 2026-04-12**
- **Alerting System:** Multi-tier thresholds (80%/100%) with deduplicated email and signed webhook notifications.
- **Analytics Depth:** Per-key cost attribution, token efficiency tracking, and model-level distribution charts.
- **Automated Reports:** Server-side PDF generation and scheduled delivery via internal mailer.
- **Storage Evolution:** ORM-agnostic aggregation engine allows testing without SQLite dependencies.

## Current Milestone: v1.4 Hardening & Refinement

**Goal:** 核心架構加固與技術債清償 — 統一背景任務機制、Alerts 模組去耦合、提升 CI 驗證強度。

**Core Value:** 提高系統穩定性、簡化維護流程、為未來功能擴展奠定基礎。

**Success Criteria:**
- ✅ 背景任務統一化：所有 cron/scheduled 任務使用統一的任務運行器
- ✅ 警報模組完全解耦：Alerts 系統不依賴核心業務邏輯層，可獨立維護和擴展
- ✅ CI 防護欄就位：自動化檢查防止不穩定代碼合併到 main
- ✅ 全部 Phase 驗證通過：Phase 18-20 的 UAT 測試 100% 通過

**Target features:**
- **Phase 18 - 背景任務統一化:** 將 `ScheduleReportService` 和其他定時任務遷至統一的任務運行器，移除 `boot()` 中的零散定時邏輯。
- **Phase 19 - Alerts 模組解耦:** 應用 Phase 17 建立的 ORM-agnostic 模式重構 Alerts 倉庫，完全隔離警報系統。
- **Phase 20 - CI 驗證加固:** 將 Playwright PDF 生成、type checking、測試覆蓋率驗證整合進 CI pipeline。

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
