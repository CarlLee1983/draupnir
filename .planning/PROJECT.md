# Draupnir — LLM Gateway Abstraction

## What This Is

Draupnir is an existing TypeScript + Bun + DDD service that currently speaks directly to Bifrost API Gateway for LLM virtual-key management, usage tracking, and chat-completion proxying. This project introduces an `ILLMGatewayClient` abstraction so business logic no longer imports Bifrost types, and extracts the `BifrostClient` into a standalone `packages/bifrost-sdk/` workspace package so future gateway backends (OpenRouter, Gemini, mocks) can be swapped in at build time without touching the application layer.

## Core Value

**No file under `src/Modules/` or `src/Foundation/Application/` may import a Bifrost-specific symbol after this milestone ships (v1.0 achieved); v1.2 delivers high-performance dashboard analytics with period-over-period comparisons.**

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

### Active

- [ ] Implement `OpenRouterGatewayAdapter` (v2)
- [ ] Extend `ILLMGatewayClient` to cover raw chat-completion proxying (v2)
- [ ] Implement automated email reports for monthly usage (v1.3)

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

---
*Last updated: 2026-04-12 after v1.3 milestone start*

## Shipped Milestones

### v1.0: LLM Gateway Abstraction ✓
**Completed 2026-04-10**
- Introduced `ILLMGatewayClient` abstraction layer
- Decoupled application logic from Bifrost-specific types
- Extracted `bifrost-sdk` into workspace package

### v1.1: Pages & Framework ✓
**Completed 2026-04-11**
- 100% unit test coverage for page handlers
- Standardized i18n and English API responses
- 912+ tests passing, 0 failures

### v1.2: Dashboard 分析和報告 ✓
**Completed 2026-04-12**
- **Cached Sync:** `BifrostSyncService` populates local SQLite table for high-performance reads.
- **Analytics UI:** Six production charts (Cost, Tokens, Models) with 7/30/90 day windows.
- **Role Isolation:** Multi-member security logic ensures users only see authorized usage.
- **Differentiators:** Period-over-period % change badges and nav-hidden PDF export.

## Current Milestone: v1.3 Advanced Analytics & Alerts

**Goal:** 增強分析深度並引入主動通知機制 — 使用警報、金鑰成本細分、自動化報表。

**Target features:**
- 使用警報 — 當組織或特定金鑰成本超過預算時發送 Webhook/Email
- 按金鑰成本細分 — 詳細顯示每個 API Key 的具體花費和 Token 效率
- 自動化報表 — 定期（每週/每月）自動發送決算 PDF 至管理員郵箱

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
