# Phase 19: Alerts Module Decoupling — Research

**Researched:** 2026-04-13
**Domain:** ORM-agnostic repository refactor (Phase 17 pattern extension) + cross-module coupling reduction via dedicated ports + notifier strategy unification + DI-less testability
**Confidence:** HIGH (direct code inspection of every target file; no external library choices required)

## Summary

Phase 19 is a **pure internal decoupling phase** built on three stacked refactors, all of which extend patterns already proven in Phase 17 and Phase 18. No new external dependencies, no feature behavior changes, no framework-lifecycle additions.

1. **ORM decoupling (ALERTS-01 / D-01..D-04):** 4 Alerts repos still import `drizzle-orm` directly (except `AlertConfigRepository`, which is already Phase 17-aligned and serves as the in-module template). Rewrite `DrizzleAlertEventRepository`, `DrizzleAlertDeliveryRepository`, `DrizzleWebhookEndpointRepository` to route through `IDatabaseAccess.table(...)`. Rename DI bindings to drop the `drizzle` prefix.
2. **Cross-module coupling reduction (ALERTS-02 / D-05..D-09):** Introduce `IAlertRecipientResolver` port owned by Alerts Domain. `SendAlertService` drops its three cross-module repository dependencies (`IOrganizationRepository`, `IOrganizationMemberRepository`, `IAuthRepository`) and consumes the resolver instead. Publish `src/Modules/Alerts/MODULE.md` as the audit contract.
3. **Notifier unification + DI-less fakes (ALERTS-03 / ALERTS-04 / D-10..D-19):** Replace ad-hoc `mailer.send` + `DispatchAlertWebhooksService.execute` calls with a unified `IAlertNotifier` strategy port. Two implementations: `EmailAlertNotifier`, `WebhookAlertNotifier`. Email deliveries now flow through `alert_deliveries` with `channel='email'`. Establish `src/Modules/Alerts/__tests__/fakes/` with shared `InMemory*Repository` / `FakeAlertNotifier` fixtures so new Application-service tests instantiate services without any DI container.

Critical finding: **`alert_deliveries.channel` column already exists** (schema.ts:267). D-14 requires **no migration** — just write email rows with `channel='email'` through the already-typed `DeliveryChannel` VO. One minor gap: `IQueryBuilder` does not yet support JOIN, and `DrizzleAlertDeliveryRepository.existsSent()` + `listByOrg()` both use `innerJoin(alertEvents, ...)`. This is the single Foundation primitive gap under D-04 — see Pitfall 1 below for mitigation options.

`DrizzleAlertConfigRepository` is **already compliant** (Phase 17 style, no drizzle-orm import, uses `this.db.table('alert_configs')`). It needs only the DI binding rename.

**Primary recommendation:** Plan in the 3-plan split CONTEXT suggests (Plan 1 = ORM; Plan 2 = RecipientResolver + MODULE.md + object-literal ctors; Plan 3 = Notifier strategy + InMemory fakes). Inside Plan 1, Wave 0 must decide the JOIN strategy for `existsSent`/`listByOrg` before repo rewrites land — recommended: **denormalize `org_id` onto `alert_deliveries`** via migration and drop the join entirely (cleanest, matches the Phase 17 "pushdown where you own the schema" ethos). Alternative: add minimal `join()` primitive to `IQueryBuilder`. The first is preferred because it's scoped to this phase's schema and avoids extending cross-cutting Foundation surface.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Drizzle 去除策略**
- **D-01:** 4 個 repos 全部遷至 IQueryBuilder + AggregateSpec 模式（Phase 17 對齊），完成 ALERTS-01。Application layer 與 Domain layer 零 `drizzle-orm` import.
- **D-02:** DI binding 全面去除 `drizzle` prefix：`drizzleAlertConfigRepository` → `alertConfigRepository`、`drizzleAlertEventRepository` → `alertEventRepository`（`alertDeliveryRepository` / `webhookEndpointRepository` 已符合命名）。AlertsServiceProvider 與所有呼叫端同步更新.
- **D-03:** 4 個 repos 在同一個 Plan 內一次遷移到位（對齊 Phase 17 的 UsageRepository 做法），不拆分階段.
- **D-04:** 現有 IQueryBuilder / AggregateSpec primitives 若不足以表達 Alerts 查詢（例如 delivery history 的 filter+pagination、alert_events group-by 等），則擴充 Foundation 層 port（承接 Phase 17 已建立的方向），不在 Alerts 內發明 module-local DSL.

**跨模組依賴收斂**
- **D-05:** 新增 `IAlertRecipientResolver` port（Alerts Domain 擁有）：`resolveByOrg(orgId) → { emails: string[], locale?: string, ... }`. SendAlertService 改只消費此 port，不再直接握 `IOrganizationRepository` / `IOrganizationMemberRepository` / `IAuthRepository`.
- **D-06:** Resolver 實作放在 composition root（bootstrap or dedicated `AlertRecipientResolverImpl` 於 Alerts/Infrastructure），內部聚合三個跨模組 repo 查詢。Alerts Application 層只看到 port.
- **D-07:** EvaluateThresholdsService 對 `IUsageRepository` 與 `IApiKeyRepository` 的依賴保留不動 — 兩者已為 Phase 17 port / Domain repository port，符合 ALERTS-02「不依賴實作細節」的精神，無需新包裝.
- **D-08:** AlertsServiceProvider.boot() 保留現有 `DomainEventDispatcher.on('bifrost.sync.completed', ...)` wiring 位置（非 cron，不適用 Phase 18 `registerJobs` hook）。不引入新的 `registerSubscribers` framework lifecycle（scope creep）.
- **D-09:** 新增 `src/Modules/Alerts/MODULE.md` 列出此模組所有跨模組依賴 port 與原因，作為 ALERTS-02 的可審查契約.

**Notification adapter 解耦 (ALERTS-04)**
- **D-10:** 定義 `IAlertNotifier` port（Alerts Domain 擁有）：`notify(payload: AlertPayload): Promise<DeliveryResult>`，payload 包含 channel-agnostic 欄位（orgId, tier, budget, actualCost, keyBreakdown, month, recipientContext）.
- **D-11:** 兩個實作：`EmailAlertNotifier`（持有 `IMailer` + `AlertEmailTemplates`）與 `WebhookAlertNotifier`（持有 `IWebhookDispatcher` + `IWebhookEndpointRepository` + delivery log repo）.
- **D-12:** SendAlertService 改為持有 `readonly notifiers: IAlertNotifier[]`，並行 dispatch。不再 hardcode `mailer.send` + `dispatchAlertWebhooksService.execute`。DispatchAlertWebhooksService 現有邏輯搬入 WebhookAlertNotifier.
- **D-13:** ResendDeliveryService 同樣走 `IAlertNotifier`：依 `delivery.channel` 從 notifier registry 選取對應 notifier 重試，統一入口.
- **D-14:** 擴充 `alert_deliveries` schema 支援 `channel` 欄位（若尚未有），email 發送後也寫入此表（channel='email'）。對應 migration 由 planner 指派 task. **研究發現 channel 欄位已存在 — 無需 schema migration，只需語義對齊.**
- **D-15:** `AlertEmailTemplates.ts` 維持在 `src/Modules/Alerts/Infrastructure/Services/`，作為 EmailAlertNotifier 的內部依賴，不抽 IAlertTemplateRenderer port（避免過度工程化）.

**DI-less 可測性 (ALERTS-03)**
- **D-16:** 在 `src/Modules/Alerts/__tests__/fakes/` 建立共用 `InMemoryAlertConfigRepository` / `InMemoryAlertEventRepository` / `InMemoryAlertDeliveryRepository` / `InMemoryWebhookEndpointRepository` / `InMemoryAlertRecipientResolver` / `FakeAlertNotifier`，提供新 tests 直接 `new Service({ repo: new InMemory*, ... })` 的能力，完全無需 container.
- **D-17:** Phase 19 只保證「新/改動的 Application service tests」符合 DI-less。現有 13 個 test 檔若已 isolated 則不動（避免 scope creep）；改動 constructor 的 service（SendAlertService / EvaluateThresholdsService / DispatchAlertWebhooksService）tests 需相應更新.
- **D-18:** Application Service constructor 全面統一為 object-literal readonly 參數風格（CONVENTIONS.md 已規定）。SendAlertService 從 7 個 positional args 改為 `{ mailer, orgMemberRepo, ... }` 風格，之後再由 D-05/D-12 進一步收斂.
- **D-19:** Test runner 維持 vitest 現行模式（`__tests__/`, `.test.ts`）。不新增 notifier pipeline integration test suite（交給 planner 於 plan 時依改動面評估）.

### Claude's Discretion
- InMemory fakes 的具體 filter/sort 語意（是否完整模擬 spec primitives vs 只實作 tests 當前用到的路徑）— 交由 planner 決定.
- `IAlertRecipientResolver` 實作的放置路徑（`Alerts/Infrastructure/Services/AlertRecipientResolverImpl.ts` vs composition-root composite）— 交由 researcher 依 CONVENTIONS.md 決定. **Research recommendation: `src/Modules/Alerts/Infrastructure/Services/AlertRecipientResolverImpl.ts`** (matches module boundary; composition-root composite adds wiring spread for no testability benefit since Application layer only sees the port).
- `AlertPayload` DTO 的精確欄位 schema（interface 或 zod）— 交給 planner. **Research recommendation:** pure TypeScript `interface` (Alerts has no runtime-input validation here — payload is server-constructed from typed domain values; zod would be dead weight).
- 三個 plan 的分界建議：Plan 1 = ORM 解耦（D-01~D-04）；Plan 2 = 依賴收斂（D-05~D-09）；Plan 3 = Notifier 統一 + DI-less fakes（D-10~D-19）. planner 可視複雜度微調. **Research endorses this split** — see "Architecture Patterns → Recommended Plan Split" for risk/rationale.

### Deferred Ideas (OUT OF SCOPE)
- **引入 lint rule（no-restricted-imports）禁 Alerts 跨模組 imports** — 留給 Phase 20 CI Guardrails 討論.
- **新增 notifier pipeline integration test suite** — planner 可於 plan 階段視改動面評估；若 DI-less unit tests 已能驗證則不必.
- **registerSubscribers 框架 lifecycle hook**（統一 DomainEventDispatcher wiring）— v1.5+ 再評估，Phase 19 不擴 Framework.
- **新通知管道（Slack/Discord/Telegram）** — 明確 out-of-scope (REQUIREMENTS.md).
- **IAlertTemplateRenderer port 外部化** — 過度工程化，目前 template 無多租戶定制需求.
- **Redis 持久化 / BullMQ** — 明確 out-of-scope.
- **Alerts cooldown/throttle 定時邏輯統一** — Phase 18 deferred；若 Phase 19 未觸及則繼續 defer.
- **運行時通知管道切換** — 明確 out-of-scope.
- **SendAlertService 的 notifier 並行策略（Promise.all vs Promise.allSettled、單 channel 失敗是否整體失敗）** — 交由 planner 與 researcher 依錯誤語意決定. **Research recommendation:** `Promise.allSettled` — matches existing `DispatchAlertWebhooksService.dispatchAll` line 35 behavior; one notifier failing must not block the others (email-sent alongside webhook-failed is observable in `alert_deliveries` and re-dispatchable via ResendDeliveryService).

### Folded Todo
- **Fix pre-existing regressions in AtlasQueryBuilder (Phase 17)**：若 Phase 19 擴充 IQueryBuilder primitives（D-04）時碰觸到 AtlasQueryBuilder，順手修補；若未碰觸則仍為獨立 todo 留在 STATE.md. **Research note:** this phase should NOT need to touch AtlasQueryBuilder — the only potential primitive extension is a JOIN helper and the recommended denormalization path (see Pitfall 1) avoids it entirely. Folded todo likely remains deferred.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ALERTS-01 | 重構 Alerts 倉庫使用 ORM-agnostic `AggregateSpec` 模式（參考 Phase 17） | Phase 17 established `IDatabaseAccess` / `IQueryBuilder` / `AggregateSpec` (src/Shared/Infrastructure/IDatabaseAccess.ts, Database/AggregateSpec.ts). `DrizzleAlertConfigRepository` already applies the pattern; `DrizzleUsageRepository` is the canonical example to mirror. 3 of 4 Alerts repos still import drizzle-orm directly — verified via `grep "from 'drizzle-orm'" src/Modules/Alerts/`. None of the 3 use aggregations, but 2 use `innerJoin` which IQueryBuilder does not yet support (see Pitfall 1). |
| ALERTS-02 | Alerts 模組不依賴任何核心業務邏輯層的實現細節 | `SendAlertService` currently imports `IOrganizationRepository`, `IOrganizationMemberRepository`, `IAuthRepository` — 3 cross-module Domain repository ports. `IAlertRecipientResolver` (D-05) collapses them into one Alerts-owned port. EvaluateThresholdsService's deps on `IUsageRepository` / `IApiKeyRepository` remain (D-07: both are already abstract Domain/Application ports, not implementation details). `MODULE.md` (D-09) serves as the audit artifact. |
| ALERTS-03 | Alerts 系統可在無 DI 容器的情況下進行單元測試 | Existing tests (e.g., SendAlertService.test.ts) already hand-build `vi.fn()` stubs per test — functionally DI-less but not reusable. D-16's shared `__tests__/fakes/` fixtures formalize this so new tests can do `new SendAlertService({ notifiers: [new FakeAlertNotifier()], deliveryRepo: new InMemoryAlertDeliveryRepository(), ... })` with zero container. D-18 unifies Application service constructors to object-literal form (SendAlertService / EvaluateThresholdsService are the two that currently use positional args). |
| ALERTS-04 | Webhook 和 Email 適配器實現完全解耦 | Today: SendAlertService hardcodes `mailer.send(...)` AND calls `DispatchAlertWebhooksService.dispatchAll(...)` directly (line 92 + line 111). D-10..D-13 replace both with an `IAlertNotifier[]` strategy. `WebhookAlertNotifier` swallows DispatchAlertWebhooksService's current logic. `EmailAlertNotifier` owns the template render + mailer + delivery-log write that currently live inline in SendAlertService. ResendDeliveryService (D-13) routes via `notifierRegistry[delivery.channel]` instead of the current channel if/else (ResendDeliveryService.ts lines 64/112). |
| ALERTS-05 | 警報配置、歷史記錄和發送日誌完全隔離 | Three repos today represent these three concerns cleanly: `alert_configs` (budget + last-alerted state), `alert_events` (audit of firings), `alert_deliveries` (per-channel send attempts). After Phase 19, all three remain ORM-agnostic through `IDatabaseAccess`, each with its own Domain repository interface and DI binding. Email deliveries (currently not persisted as rows — just logged via mailer) start landing in `alert_deliveries` with `channel='email'` (D-14), making the delivery log complete and uniform. |

**Mapping to plan split:**
- ALERTS-01 + ALERTS-05's "ORM-agnostic" facet → Plan 1
- ALERTS-02 (cross-module coupling) + D-18 (ctor unification) + MODULE.md → Plan 2
- ALERTS-03 (DI-less fakes) + ALERTS-04 (notifier strategy) + ALERTS-05's "delivery log uniformity" (email rows) → Plan 3
</phase_requirements>

## Project Constraints (from CLAUDE.md / AGENTS.md)

- **Language:** 繁體中文 (Taiwan) for commit messages, documentation, comments, natural conversation. Code is English.
- **Immutability:** Never mutate — always create new objects (AlertConfig / AlertEvent / AlertDelivery / WebhookEndpoint entities already follow this pattern).
- **File size:** prefer many small files (200-400 lines typical, 800 max).
- **Error handling:** comprehensive try/catch, detailed user-friendly error messages.
- **No hardcoded secrets:** use `process.env`; existing `webhookDispatcher` and `mailer` ports already abstract transport secrets.
- **Commit format:** `<type>: [ <scope> ] <subject>` (e.g., `refactor: [alerts] 引入 IAlertRecipientResolver port`). Types: feat / fix / docs / style / refactor / perf / test / chore. Git commit attribution disabled globally.
- **Testing:** TDD approach; minimum 80% coverage; unit + integration + e2e.
- **GSD workflow:** All file-changing work must go through a GSD command (`/gsd:execute-phase`). No direct edits outside the workflow.
- **Constructor style (CONVENTIONS.md + project rule):** object-literal `readonly` parameters — D-18 enforcement scope.
- **DDD layering (ARCHITECTURE.md):** Domain has zero infra imports; Application depends only on Domain ports + Foundation abstractions; Infrastructure owns adapters. `IAlertRecipientResolver` port goes in `src/Modules/Alerts/Domain/` (not Application); resolver **implementation** goes in `src/Modules/Alerts/Infrastructure/Services/`. `IAlertNotifier` port also lives in `src/Modules/Alerts/Domain/` (D-10 says "Alerts Domain 擁有").
- **Must not add new dependencies** (package.json unchanged).

## Standard Stack

This phase introduces **zero new external dependencies**. Every library / abstraction needed already exists.

### Core (in-repo, already present)

| Abstraction | Location | Role In This Phase |
|-------------|----------|--------------------|
| `IDatabaseAccess` / `IQueryBuilder` | `src/Shared/Infrastructure/IDatabaseAccess.ts` | The ORM-agnostic seam. All 4 Alerts repos will route through `table(...).where(...).aggregate<T>(...)` etc. |
| `AggregateSpec` + builder functions (`sum`/`count`/`col`/...) | `src/Shared/Infrastructure/Database/AggregateSpec.ts` | Only needed if a repo requires GROUP BY. None of the 4 Alerts repos currently do (they are CRUD + list/count) — so most refactor work uses plain `where/first/select/insert/update/delete/orderBy/limit/count`, not aggregate. |
| `DrizzleQueryBuilder` (adapter) | `src/Shared/Infrastructure/Database/Adapters/Drizzle/DrizzleQueryBuilder.ts` (421 lines) | Already implements `insertOrIgnore`, `update`, `count`, `orderBy`, `limit`, `offset`, `whereBetween`, `aggregate`. **Missing: JOIN primitive.** See Pitfall 1. |
| `MemoryDatabaseAccess` (adapter) | `src/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess.ts` (365 lines) | Exists with full parity for aggregate surface. Used by `__tests__/fakes/` if the plan chooses the "real Memory adapter" path instead of bespoke InMemory repos. Research recommends **bespoke InMemory* repos** (see "Don't Hand-Roll" — simpler contract, fewer moving parts). |
| `IAlertConfigRepository` / `IAlertEventRepository` / `IAlertDeliveryRepository` / `IWebhookEndpointRepository` | `src/Modules/Alerts/Domain/Repositories/` | **Interfaces do not change** (D-01 is about implementations). Verified IAlertDeliveryRepository signature matches current Drizzle behavior; other 3 similarly stable. |
| `IMailer`, `IWebhookDispatcher` | `src/Foundation/Infrastructure/Ports/` | `EmailAlertNotifier` wraps IMailer; `WebhookAlertNotifier` wraps IWebhookDispatcher. Interfaces unchanged. |
| `DomainEventDispatcher` | `src/Shared/Domain/DomainEventDispatcher.ts` | `AlertsServiceProvider.boot()` retains `on('bifrost.sync.completed', ...)` subscription (D-08). No change. |

### Existing reference implementations to mirror

| File | Pattern Demonstrated |
|------|----------------------|
| `src/Modules/Alerts/Infrastructure/Repositories/DrizzleAlertConfigRepository.ts` | **Already the target state** for plain CRUD: `constructor(private readonly db: IDatabaseAccess)`, uses `this.db.table('alert_configs').where(...).first()`. 37 lines. All 3 other Alerts repos should end up looking like this (modulo their extra methods). |
| `src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts` | Canonical aggregate + `insertOrIgnore` + spec-based GROUP BY. Relevant only if planner chooses to add a `queryEventsPerMonth` or similar group-by to IAlertEventRepository (not currently required). |
| `src/Modules/Alerts/Application/Services/DispatchAlertWebhooksService.ts` | **Already** object-literal ctor (line 23–30) — use as the template for SendAlertService's D-18 refactor. |
| `src/Modules/Alerts/Application/Services/ResendDeliveryService.ts` | **Already** object-literal ctor. Channel-branching logic (lines 64 vs 112) is the D-13 target — collapse into `notifierRegistry[delivery.channel].notify(...)`. |

### Installation

```bash
# No packages to install. Verify clean state:
grep -R "from 'drizzle-orm'" src/Modules/Alerts/ | grep -v '.test.ts'  # should be empty after Plan 1
```

## Architecture Patterns

### Recommended Project Structure (post-Phase 19)

```
src/Modules/Alerts/
├── MODULE.md                              # NEW — cross-module dep contract (D-09)
├── Domain/
│   ├── Aggregates/                        # unchanged
│   ├── Entities/                          # unchanged (AlertEvent, AlertDelivery, ...)
│   ├── ValueObjects/                      # unchanged
│   ├── Repositories/                      # unchanged interfaces
│   └── Services/                          # NEW directory if not present
│       ├── IAlertRecipientResolver.ts     # NEW port (D-05)
│       └── IAlertNotifier.ts              # NEW port (D-10) + AlertPayload DTO + DeliveryResult DTO
├── Application/
│   └── Services/
│       ├── SendAlertService.ts            # REWRITTEN: ctor object-literal; deps = { notifiers, recipientResolver, alertEventRepo, deliveryRepo }
│       ├── EvaluateThresholdsService.ts   # ctor object-literal (D-18); deps unchanged
│       ├── DispatchAlertWebhooksService.ts # DELETE after logic moves to WebhookAlertNotifier (Plan 3)
│       ├── ResendDeliveryService.ts       # REWRITTEN: consumes notifierRegistry: Record<DeliveryChannel, IAlertNotifier>
│       └── (all other services unchanged)
├── Infrastructure/
│   ├── Repositories/
│   │   ├── AlertConfigRepository.ts          # RENAMED from DrizzleAlertConfigRepository; Phase 17 style already
│   │   ├── AlertEventRepository.ts           # REWRITTEN (new file, replaces DrizzleAlertEventRepository)
│   │   ├── AlertDeliveryRepository.ts        # REWRITTEN (new file, replaces DrizzleAlertDeliveryRepository)
│   │   └── WebhookEndpointRepository.ts      # REWRITTEN (new file, replaces DrizzleWebhookEndpointRepository)
│   ├── Services/
│   │   ├── AlertEmailTemplates.ts            # unchanged (D-15)
│   │   ├── AlertRecipientResolverImpl.ts     # NEW — composes 3 cross-module repos (D-06)
│   │   ├── EmailAlertNotifier.ts             # NEW (D-11)
│   │   └── WebhookAlertNotifier.ts           # NEW — absorbs DispatchAlertWebhooksService logic (D-11/D-12)
│   ├── Mappers/                              # unchanged
│   └── Providers/
│       └── AlertsServiceProvider.ts          # RENAMED bindings (D-02); new notifier/resolver wirings
├── Presentation/                             # unchanged
└── __tests__/
    ├── fakes/                                # NEW (D-16)
    │   ├── InMemoryAlertConfigRepository.ts
    │   ├── InMemoryAlertEventRepository.ts
    │   ├── InMemoryAlertDeliveryRepository.ts
    │   ├── InMemoryWebhookEndpointRepository.ts
    │   ├── InMemoryAlertRecipientResolver.ts
    │   └── FakeAlertNotifier.ts
    └── (existing tests — updated per D-17 only if constructor signature changed)
```

Rename question: the repo files are currently prefixed `Drizzle*`. D-02 removes the binding prefix; the file rename is implicit — **research recommends dropping `Drizzle` from filenames** (e.g., `AlertEventRepository.ts`) because after the refactor they no longer carry any Drizzle semantics. The class is still a concrete adapter but its only ORM coupling is via `IDatabaseAccess`. This matches the post-Phase-17 direction (see how `DrizzleUsageRepository.ts` was kept named — but Phase 17's CONTEXT explicitly scoped the filename rename out; Phase 19's CONTEXT is silent, which is planner discretion). **Recommendation: rename** — it's a one-line change per file plus import updates and the names become honest.

### Recommended Plan Split (endorsed)

```
Plan 1: ORM Decoupling (D-01..D-04, ALERTS-01, most of ALERTS-05)
  Wave 0: 
    - Decide JOIN strategy for existsSent/listByOrg (see Pitfall 1 — recommend denormalize org_id)
    - If denormalize: author migration `add_org_id_to_alert_deliveries.ts` + backfill
    - Update IAlertDeliveryRepository signature? NO — interface is stable; implementation just reads own column.
  Wave 1: Rewrite DrizzleAlertEventRepository as AlertEventRepository via IDatabaseAccess
  Wave 2: Rewrite DrizzleWebhookEndpointRepository (includes onConflictDoUpdate→?) — see Pitfall 2
  Wave 3: Rewrite DrizzleAlertDeliveryRepository (depends on Wave 0 outcome)
  Wave 4: Rename AlertsServiceProvider bindings (drizzle prefix drop); update all consumers
  Wave 5: grep verification + full test suite

Plan 2: Dependency Consolidation (D-05..D-09, D-18 for EvaluateThresholdsService, ALERTS-02, most of MODULE.md)
  Wave 0: Add src/Modules/Alerts/__tests__/fakes/ scaffold with InMemoryAlertRecipientResolver (only — other fakes come in Plan 3)
  Wave 1: Define IAlertRecipientResolver port in Domain/Services/
  Wave 2: Implement AlertRecipientResolverImpl composing Org + OrgMember + Auth repos (D-06)
  Wave 3: Refactor SendAlertService to drop 3 cross-module deps + adopt object-literal ctor (D-18)
  Wave 4: EvaluateThresholdsService object-literal ctor (D-18) — constructor refactor only, semantic behavior unchanged
  Wave 5: Write MODULE.md (D-09)
  Wave 6: AlertsServiceProvider wires the resolver; update tests that touched SendAlertService ctor

Plan 3: Notifier Unification + DI-less Fakes (D-10..D-17, D-19, ALERTS-03, ALERTS-04, completes ALERTS-05)
  Wave 0: Flesh out __tests__/fakes/ (all InMemory* repos + FakeAlertNotifier)
  Wave 1: Define IAlertNotifier port + AlertPayload + DeliveryResult in Domain/Services/
  Wave 2: Implement WebhookAlertNotifier (move DispatchAlertWebhooksService logic in)
  Wave 3: Implement EmailAlertNotifier (extract email path from SendAlertService; writes to alert_deliveries with channel='email')
  Wave 4: Refactor SendAlertService to consume IAlertNotifier[]; delete DispatchAlertWebhooksService file
  Wave 5: Refactor ResendDeliveryService to use notifierRegistry keyed by delivery.channel
  Wave 6: AlertsServiceProvider: add notifier bindings, remove DispatchAlertWebhooksService binding
  Wave 7: Update tests (SendAlertService / DispatchAlertWebhooksService → now test notifiers directly / ResendDeliveryService)
```

**Dependency order between plans:** Plan 1 is standalone. Plan 2 depends on Plan 1 only for the binding-name consistency (MODULE.md needs the new names). Plan 3 depends on Plan 2 for the SendAlertService ctor shape (object-literal already) and the IAlertRecipientResolver port (so EmailAlertNotifier can take it as a dep rather than re-wiring Org/Member/Auth). Planner may run Plan 1 and Plan 2 partially in parallel in different branches; Plan 3 must land last.

### Pattern 1: IQueryBuilder-based Repository (ALERTS-01 target)

**What:** Replace direct `drizzle-orm` imports with `IDatabaseAccess.table(name).chain(...)` calls.

**When to use:** Every repo in the Alerts module.

**Example — AlertEventRepository rewrite:**
```ts
// Source: pattern mirrored from src/Modules/Alerts/Infrastructure/Repositories/DrizzleAlertConfigRepository.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { AlertEvent } from '../../Domain/Entities/AlertEvent'
import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'

export class AlertEventRepository implements IAlertEventRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async save(event: AlertEvent): Promise<void> {
    await this.db.table('alert_events').insert(event.toInsert() as Record<string, unknown>)
  }

  async findByOrgAndMonth(orgId: string, month: string): Promise<readonly AlertEvent[]> {
    const rows = await this.db.table('alert_events')
      .where('org_id', '=', orgId)
      .where('month', '=', month)
      .orderBy('created_at', 'DESC')
      .select()
    return rows.map(AlertEvent.fromDatabase)
  }

  async findById(id: string): Promise<AlertEvent | null> {
    const row = await this.db.table('alert_events').where('id', '=', id).first()
    return row ? AlertEvent.fromDatabase(row) : null
  }

  async listByOrg(orgId: string, opts?: { limit?: number; offset?: number }): Promise<readonly AlertEvent[]> {
    const rows = await this.db.table('alert_events')
      .where('org_id', '=', orgId)
      .orderBy('created_at', 'DESC')
      .limit(opts?.limit ?? 50)
      .offset(opts?.offset ?? 0)
      .select()
    return rows.map((row) => AlertEvent.fromDatabase(row))
  }
}
```

### Pattern 2: IAlertRecipientResolver port (ALERTS-02)

**What:** Alerts-owned Domain port that collapses Org + OrgMember + Auth queries into one call.

**Port shape (recommended):**
```ts
// src/Modules/Alerts/Domain/Services/IAlertRecipientResolver.ts

export interface AlertRecipientContext {
  readonly orgId: string
  readonly orgName: string
  readonly emails: readonly string[]
  readonly locale?: string           // reserved for v2 i18n; not consumed today
}

export interface IAlertRecipientResolver {
  resolveByOrg(orgId: string): Promise<AlertRecipientContext>
}
```

**Implementation (composition):**
```ts
// src/Modules/Alerts/Infrastructure/Services/AlertRecipientResolverImpl.ts

import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IAlertRecipientResolver, AlertRecipientContext } from '../../Domain/Services/IAlertRecipientResolver'

export class AlertRecipientResolverImpl implements IAlertRecipientResolver {
  constructor(
    private readonly deps: {
      readonly orgRepo: IOrganizationRepository
      readonly orgMemberRepo: IOrganizationMemberRepository
      readonly authRepo: IAuthRepository
    },
  ) {}

  async resolveByOrg(orgId: string): Promise<AlertRecipientContext> {
    const org = await this.deps.orgRepo.findById(orgId)
    const members = await this.deps.orgMemberRepo.findByOrgId(orgId)
    const managers = members.filter((member) => member.isManager())

    const emailSet = new Set<string>()
    for (const manager of managers) {
      const user = await this.deps.authRepo.findById(manager.userId)
      const email = user?.emailValue?.trim()
      if (email) emailSet.add(email)
    }

    return {
      orgId,
      orgName: org?.name ?? 'Unknown',
      emails: [...emailSet],
    }
  }
}
```

**SendAlertService surface after refactor (excerpt):**
```ts
export class SendAlertService {
  constructor(
    private readonly deps: {
      readonly recipientResolver: IAlertRecipientResolver
      readonly alertEventRepo: IAlertEventRepository
      readonly deliveryRepo: IAlertDeliveryRepository
      readonly notifiers: readonly IAlertNotifier[]
    },
  ) {}

  async send(params: SendAlertParams): Promise<void> {
    const context = await this.deps.recipientResolver.resolveByOrg(params.orgId)
    const alertEvent = AlertEvent.create({ ... })
    await this.deps.alertEventRepo.save(alertEvent)

    const payload: AlertPayload = { ...params, ...context, alertEventId: alertEvent.id }
    await Promise.allSettled(this.deps.notifiers.map((n) => n.notify(payload)))
  }
}
```

### Pattern 3: IAlertNotifier Strategy (ALERTS-04)

**Port (recommended shape):**
```ts
// src/Modules/Alerts/Domain/Services/IAlertNotifier.ts

export type DeliveryChannel = 'email' | 'webhook'

export interface AlertPayload {
  readonly orgId: string
  readonly orgName: string
  readonly alertEventId: string
  readonly tier: 'warning' | 'critical'
  readonly budgetUsd: string
  readonly actualCostUsd: string
  readonly percentage: string
  readonly month: string
  readonly keyBreakdown: readonly AlertKeyBreakdownItem[]
  readonly emails: readonly string[]   // primary use: EmailAlertNotifier
  // Webhook notifier reads orgId → fetches endpoints; no extra field needed.
}

export interface DeliveryResult {
  readonly channel: DeliveryChannel
  readonly successes: number
  readonly failures: number
  // Individual AlertDelivery rows are written by the notifier itself; this DTO is for logging/metrics.
}

export interface IAlertNotifier {
  readonly channel: DeliveryChannel   // exposed for registry lookup in ResendDeliveryService
  notify(payload: AlertPayload): Promise<DeliveryResult>
}
```

**Critical notifier responsibility split:**
- **EmailAlertNotifier.notify(payload):** for each email in `payload.emails`, check `deliveryRepo.existsSent({ channel: 'email', target: email, ... })` → if not sent, render template (warning vs critical), `mailer.send(...)`, write `AlertDelivery` row with `channel='email'`. Mirrors current SendAlertService lines 70–108 exactly — just relocated.
- **WebhookAlertNotifier.notify(payload):** `endpointRepo.findActiveByOrg(payload.orgId)` → for each endpoint, check dedup, `dispatcher.dispatch(...)`, write `AlertDelivery` with `channel='webhook'`, update endpoint success/failure timestamps. This is literally `DispatchAlertWebhooksService.dispatchAll` relocated.

### Pattern 4: DI-less Application service test (ALERTS-03)

**Before (current SendAlertService.test.ts lines 30–48):** 7 `vi.fn()` stubs with `as never` casts per test.

**After (target):**
```ts
// src/Modules/Alerts/__tests__/SendAlertService.test.ts

import { InMemoryAlertEventRepository } from './fakes/InMemoryAlertEventRepository'
import { InMemoryAlertDeliveryRepository } from './fakes/InMemoryAlertDeliveryRepository'
import { InMemoryAlertRecipientResolver } from './fakes/InMemoryAlertRecipientResolver'
import { FakeAlertNotifier } from './fakes/FakeAlertNotifier'

it('dispatches to all notifiers and records the alert event', async () => {
  const alertEventRepo = new InMemoryAlertEventRepository()
  const deliveryRepo = new InMemoryAlertDeliveryRepository()
  const recipientResolver = new InMemoryAlertRecipientResolver({
    'org-1': { orgId: 'org-1', orgName: 'Acme', emails: ['a@x.com', 'b@x.com'] },
  })
  const emailNotifier = new FakeAlertNotifier('email')
  const webhookNotifier = new FakeAlertNotifier('webhook')

  const service = new SendAlertService({
    recipientResolver,
    alertEventRepo,
    deliveryRepo,
    notifiers: [emailNotifier, webhookNotifier],
  })

  await service.send({ orgId: 'org-1', tier: 'warning', ... })

  expect(alertEventRepo.all()).toHaveLength(1)
  expect(emailNotifier.calls).toHaveLength(1)
  expect(webhookNotifier.calls).toHaveLength(1)
})
```

### Anti-Patterns to Avoid
- **Don't invent an Alerts-module-local DSL** for queries that current `IQueryBuilder` can't express (D-04). Extend Foundation primitives OR denormalize schema.
- **Don't leak `drizzle-orm` types into Domain/Application.** Port signatures must use plain TS types (`string`, `Date`, Domain entities). Post-refactor grep: `from 'drizzle-orm'` must appear nowhere in `src/Modules/Alerts/`.
- **Don't make `IAlertNotifier` implementations responsible for template choice externally.** Template logic stays inside `EmailAlertNotifier` (D-15 — no `IAlertTemplateRenderer` port).
- **Don't delete `DispatchAlertWebhooksService.test.ts` — migrate its assertions** into a new `WebhookAlertNotifier.test.ts`. Same for the email-path assertions currently living in `SendAlertService.test.ts` — they become `EmailAlertNotifier.test.ts`.
- **Don't skip the DI binding rename**: any consumer that currently does `c.make('drizzleAlertEventRepository')` will break silently (container returns undefined which type-casts to anything). Post-rename grep `drizzleAlert\|drizzleWebhook` in `src/` must be zero.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-repo user-email aggregation inside every caller | Inline Org + Member + Auth query loops | `IAlertRecipientResolver.resolveByOrg(orgId)` | One seam to test, one place to change when recipient rules evolve (e.g., "also notify billing owner") |
| Channel branching in resend/dispatch flow | `if (delivery.channel === 'webhook') { ... } else { ... }` | `notifierRegistry: Record<DeliveryChannel, IAlertNotifier>` | Adding Slack = new notifier class, zero touch to SendAlertService/ResendDeliveryService |
| In-repo JOIN emulation in `alert_deliveries` queries | Loop + N+1 fetches from alert_events | **Denormalize `org_id` onto `alert_deliveries`** OR extend IQueryBuilder with join primitive | Denormalize is simpler (one migration, zero cross-cutting API) and aligns with SQLite's strengths — see Pitfall 1 |
| Per-test fake repository scaffolding | `vi.fn()` piles in every `beforeEach` with `as never` casts | `InMemoryAlertConfigRepository` etc. shared under `__tests__/fakes/` | DRY; type-safe; fakes can implement realistic filter/sort for property tests in the future |
| Ad-hoc in-memory DB for tests | Instantiate `MemoryDatabaseAccess` and seed | Bespoke `InMemoryAlertDeliveryRepository` implementing `IAlertDeliveryRepository` directly | Tests speak Domain types (AlertDelivery) not rows; bespoke fakes skip the mapper round-trip |

**Key insight:** The Alerts module has exactly one interesting cross-table read (`alert_deliveries JOIN alert_events ON alert_event_id` in `existsSent` and `listByOrg`). Every other repo method is single-table CRUD. That means **the minimum-viable path for Plan 1 is just five IDatabaseAccess methods: `where`, `first`, `select`, `insert`, `update`, `delete`, plus `orderBy`/`limit`/`offset`** — all already in `IQueryBuilder`. The JOIN is the only snag; denormalizing `org_id` onto `alert_deliveries` makes it a non-issue.

## Runtime State Inventory

This phase is a **refactor**, not a rename — string identifiers don't change. But one migration may be needed (JOIN denormalization) and DI binding renames touch the container at runtime.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | (a) `alert_deliveries` rows currently have no `org_id` column (confirmed via schema.ts:262–283). If denormalization path (recommended for Pitfall 1) is chosen: migration adds nullable `org_id`, backfills via `UPDATE alert_deliveries SET org_id = (SELECT org_id FROM alert_events WHERE alert_events.id = alert_deliveries.alert_event_id)`, then flips NOT NULL. (b) `alert_deliveries.channel` column already exists (confirmed schema.ts:267) — **no migration needed for D-14**. (c) Existing email alerts today do NOT write to `alert_deliveries` (SendAlertService.ts lines 91–107 show it writes rows, but this is already Phase 13 behavior — confirmed the repo writes `channel='email'` rows). After Phase 19, same rows are still written, just from inside `EmailAlertNotifier`. | Data migration: 1 migration file if denormalization chosen. Code edit: all 3 channel-aware notifier paths. |
| Live service config | None — Alerts has no external-service registration. `mailer` and `webhookDispatcher` services are configured at `src/bootstrap.ts` via env vars; unchanged. | None |
| OS-registered state | None — `DomainEventDispatcher.on('bifrost.sync.completed', ...)` is an in-process subscription, not OS-level. No cron / systemd / launchd artifact. | None |
| Secrets/env vars | Resolver and notifier ports consume existing env-configured services (`IMailer`, `IWebhookDispatcher`). No new env var; no secret rename. `WEBHOOK_ALLOW_HTTP` reference in AlertsServiceProvider.ts:75 unchanged. | None |
| Build artifacts / installed packages | None — no pyproject.toml / pip egg-info / compiled binaries / docker image rename. DI binding keys are in-memory container state, not persisted. Reinstall / rebuild not needed. | None (standard `bun install` already covers any touched package.json metadata — but no package changes) |

**The canonical question answered:** After every file in `src/Modules/Alerts/` is updated, (a) the `alert_deliveries` table needs one schema migration IF the denormalization path is chosen (research's recommendation), (b) no other runtime state holds stale references. DI binding names are recreated at process boot from code — they're not cached.

## Environment Availability

No new external dependencies. Verified existing toolchain (every item confirmed from `package.json` and the Phase 17 research file that validated these same tools 24 hours ago):

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Bun runtime | All scripts + `bun test` + `bun orbit migrate` | ✓ | pinned in project | — |
| `@libsql/client` | Drizzle adapter `:memory:` tests | ✓ | ^0.17.0 | — |
| `drizzle-orm` | Schema.ts + DrizzleQueryBuilder (adapter internals only — **forbidden** inside `src/Modules/Alerts/` post-Plan 1) | ✓ | existing | — |
| `@gravito/atlas` | Migrations (only needed if denormalization path chosen for JOIN) | ✓ | ^2.0.0 | Raw SQL fallback identical to Phase 17 pattern |
| `vitest` | All test files | ✓ | existing | — |
| `@gravito/core` (`PlanetCore`) | `AlertsServiceProvider.boot(context: PlanetCore)` signature | ✓ | existing | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Common Pitfalls

### Pitfall 1: `alert_deliveries` needs a JOIN; `IQueryBuilder` has none

**What goes wrong:** Two methods rely on `innerJoin(alertEvents, eq(alertDeliveries.alert_event_id, alertEvents.id))`:
- `DrizzleAlertDeliveryRepository.existsSent()` (line 47) — joins to filter by `alertEvents.org_id / month / tier`.
- `DrizzleAlertDeliveryRepository.listByOrg()` (line 71) — joins to filter by `alertEvents.org_id` and orders by `alertEvents.created_at` first.

After Plan 1 removes the `drizzle-orm` import, these methods need an equivalent through `IDatabaseAccess`. But grepping `/Users/carl/Dev/CMG/Draupnir/src/Shared/Infrastructure/Database/Adapters/Drizzle/DrizzleQueryBuilder.ts` and `MemoryDatabaseAccess.ts` confirms **no join / innerJoin / leftJoin method exists on IQueryBuilder today** (verified — zero matches).

**Why it happens:** The Alerts delivery table is conceptually a child of alert_events. Filters and sorts that semantically belong to the event live on the parent table, forcing a join at read time.

**How to avoid — two options:**

1. **Denormalization (RESEARCH RECOMMENDATION):** Add `org_id TEXT NOT NULL` to `alert_deliveries`. Migration order:
   - Atlas migration `2026_04_13_NNNNNN_add_org_id_to_alert_deliveries.ts`: add nullable column, `UPDATE alert_deliveries SET org_id = (SELECT org_id FROM alert_events WHERE alert_events.id = alert_deliveries.alert_event_id)`, then in a second migration step (or raw-SQL `ALTER TABLE`-style dance — SQLite 3.35+ supports `ALTER TABLE ADD COLUMN NOT NULL` only via table recreation) flip NOT NULL.
   - Also denormalize `month` and `tier` if `existsSent` is to be pure single-table — they are tiny strings. (The join is filtering by exactly `org_id + month + tier`, which are all event-level.)
   - Schema change also adds `month: text('month').notNull()` and `tier: text('tier').notNull()` to `alert_deliveries`.
   - Backfill from `alert_events` during migration.
   - `existsSent` becomes pure `.where('org_id', '=', orgId).where('month', '=', month).where('tier', '=', tier).where('channel', '=', channel).where('target', '=', target).where('status', '=', 'sent').count() > 0`.
   - `listByOrg` becomes `.where('org_id', '=', orgId).orderBy('created_at', 'DESC').limit(...).offset(...).select()`.
   - Pros: zero Foundation API surface change; simplest adapter logic; matches ClickHouse/OLAP-friendly shape the app may head toward; removes an entire class of pitfall (orphaned deliveries referencing deleted events).
   - Cons: 3 new columns adding ~60 bytes per delivery row (negligible at current scale); denormalization is "extra" data.

2. **Extend IQueryBuilder with `join()`:** Add a minimal join primitive: `join(table: string, onLeft: string, onRight: string): IQueryBuilder`. Implement on both DrizzleQueryBuilder and MemoryQueryBuilder.
   - Pros: keeps schema normalized.
   - Cons: touches Foundation API; requires parity in both adapters; likely forces new `select({ prefix: 'table.col' })` semantics for disambiguation; invites further join extensions from other modules. Scope creep risk. AtlasQueryBuilder may also need an implementation (touches the folded todo).

**Planner decision required in Plan 1 Wave 0.** Research strongly recommends Option 1 — it delivers ALERTS-01 cleanly, honors D-04's spirit (only extend Foundation when truly needed; denormalizing a single module's table is a module-scope change, not a Foundation extension), and mirrors how OrgId-scoped queries work in `alert_events` itself.

### Pitfall 2: `onConflictDoUpdate` in WebhookEndpointRepository.save has no IQueryBuilder equivalent

**What goes wrong:** `DrizzleWebhookEndpointRepository.save()` (lines 49–67) uses `onConflictDoUpdate({ target: webhookEndpoints.id, set: {...} })`. `IQueryBuilder` has `insert` and `insertOrIgnore` but no `insertOrUpdate` / upsert.

**Why it happens:** `save()` semantics are "insert new or update existing by primary key" — idempotent upsert. `insertOrIgnore` would silently drop updates to existing endpoints (wrong).

**How to avoid — three options:**

1. **Split into insert vs update at the repo layer:** `save()` does `findById(id)` first, then either `insert(...)` or `where('id','=',id).update(...)`. Two roundtrips per save but trivially correct.
2. **Use `table('webhook_endpoints').where('id','=',id).update(...)` first; if update affected zero rows, `insert(...)`:** same logic inverted. Requires update to return affected count — **check IQueryBuilder.update return type** (currently `Promise<void>`, line 74 of IDatabaseAccess.ts). So this requires a signature change.
3. **Extend IQueryBuilder with `insertOrUpdate(data, { conflictTarget, updateSet })`:** mirrors the existing `insertOrIgnore` primitive. Small, consistent, testable.

**Research recommendation:** Option 1 (select-then-insert-or-update). It keeps IQueryBuilder stable this phase (D-04 is about aggregate primitives; the phrase "不在 Alerts 內發明 module-local DSL" applies — but select-then-branch is not a DSL, it's a standard idempotency pattern). The double roundtrip is irrelevant for webhook endpoint saves (rare, org-admin triggered).

### Pitfall 3: `DrizzleAlertDeliveryRepository.save` uses `onConflictDoNothing` on `id`

**What goes wrong:** Line 16 uses `.onConflictDoNothing({ target: alertDeliveries.id })`. The refactored repo must use `insertOrIgnore(data, { conflictTarget: 'id' })` — **this is a direct 1:1 mapping to the existing IQueryBuilder primitive**, no extension needed. Mirror DrizzleUsageRepository.ts line 17 (`insertOrIgnore(data, { conflictTarget: 'bifrost_log_id' })`).

**Why it matters:** Unlike Pitfall 2's upsert, this pattern is already fully supported.

### Pitfall 4: `DeliveryChannel` VO type vs schema `text`

`AlertDeliveryMapper.toPersistence(delivery)` already maps the VO to a string (confirmed via mapper file existence). When refactoring repo to `insertOrIgnore(..., { conflictTarget: 'id' })`, the row-shape must remain identical. **Do not bypass the mapper** — keep `AlertDeliveryMapper.toPersistence(delivery)` in the new implementation.

### Pitfall 5: DomainEventDispatcher singleton state in tests

**What goes wrong:** `AlertsServiceProvider.boot()` registers a listener on `DomainEventDispatcher.getInstance()` — a module-level singleton. Multiple tests that boot the provider in sequence would stack listeners (observed pattern elsewhere in the codebase).

**Why it happens:** Singleton + idempotent subscription discipline not enforced.

**How to avoid:** Not a Phase 19 regression (existing code). But: if any new test file boots AlertsServiceProvider (Plan 2/3 resolver wiring tests may be tempted to), use `DomainEventDispatcher.getInstance().removeAllListeners()` in `afterEach`. Research recommendation: **do not boot AlertsServiceProvider in unit tests** — unit-test services via direct `new Service({...})` with fakes (the whole point of ALERTS-03). Boot only happens in integration / smoke tests.

### Pitfall 6: `SendAlertService.send` does `queueMicrotask(() => void Promise.resolve(webhookDispatch.dispatchAll(...)))` (line 110–114)

**What goes wrong:** The current impl fires webhook dispatch **asynchronously** via microtask and **does not await** it. This means `send()` resolves before webhook delivery even starts. If the refactor to `await Promise.allSettled(notifiers.map(n => n.notify(...)))` awaits all notifiers, the behavior changes: `send()` now blocks until webhooks complete.

**Why it happens:** Original design wanted email flush before dispatch returns (to avoid user-blocking). Webhook dispatch is network-slow.

**How to avoid:** Preserve behavior OR explicitly change it with a plan-level decision. Research recommendation: **preserve fire-and-forget** by having `SendAlertService.send` do:
```ts
await this.deps.emailNotifier.notify(payload)   // await email (critical path)
queueMicrotask(() => {
  void Promise.allSettled(this.deps.asyncNotifiers.map((n) => n.notify(payload)))
    .catch((e) => console.error('[Alerts] notifier error', e))
})
```
OR model it more cleanly: split notifier list into `syncNotifiers: IAlertNotifier[]` (awaited) and `asyncNotifiers: IAlertNotifier[]` (fire-and-forget). The payload contract is the same, just the dispatch policy differs.

Alternative: make this a property on `IAlertNotifier` (`readonly dispatch: 'sync' | 'async'`) so the registry/bootstrap decides. Planner should decide at Plan 3 design time; either way, **call out this behavior preservation in the task plan's acceptance criteria**, otherwise tests will silently pass while user-visible latency regresses.

### Pitfall 7: `recipients: []` hardcoded in AlertEvent.create (SendAlertService.ts line 60)

**What goes wrong:** Current code creates the `AlertEvent` with `recipients: []` (empty array), even though recipients are computed just above. This may be intentional (events audit tier/budget, not recipient list — delivery-level audit lives in alert_deliveries) or a bug. The refactor should not silently "fix" this — preserve it. Verified by test SendAlertService.test.ts line 91: `expect(savedEvent.recipients).toEqual([])`.

**How to avoid:** The refactored SendAlertService passes `recipients: []` to `AlertEvent.create` unchanged. If a future phase wants to populate this, that's a separate change with its own test update.

## Code Examples

### Example 1: Repo refactor (AlertEventRepository) — before/after

**Before** (src/Modules/Alerts/Infrastructure/Repositories/DrizzleAlertEventRepository.ts lines 32–46):
```ts
async listByOrg(orgId: string, opts?: {...}): Promise<readonly AlertEvent[]> {
  const db = getDrizzleInstance()
  const rows = await db.select().from(alertEvents)
    .where(eq(alertEvents.org_id, orgId))
    .orderBy(desc(alertEvents.created_at))
    .limit(opts?.limit ?? 50).offset(opts?.offset ?? 0)
  return rows.map((row) => AlertEvent.fromDatabase(row as Record<string, unknown>))
}
```

**After:**
```ts
async listByOrg(orgId: string, opts?: {...}): Promise<readonly AlertEvent[]> {
  const rows = await this.db.table('alert_events')
    .where('org_id', '=', orgId)
    .orderBy('created_at', 'DESC')
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0)
    .select()
  return rows.map((row) => AlertEvent.fromDatabase(row))
}
```

### Example 2: WebhookEndpointRepository.save — Pitfall 2 resolution

```ts
async save(endpoint: WebhookEndpoint): Promise<void> {
  const existing = await this.db.table('webhook_endpoints').where('id', '=', endpoint.id).first()
  const data = WebhookEndpointMapper.toPersistence(endpoint)
  if (existing) {
    await this.db.table('webhook_endpoints').where('id', '=', endpoint.id).update(data)
  } else {
    await this.db.table('webhook_endpoints').insert(data)
  }
}
```

### Example 3: FakeAlertNotifier fixture

```ts
// src/Modules/Alerts/__tests__/fakes/FakeAlertNotifier.ts
import type { IAlertNotifier, AlertPayload, DeliveryResult, DeliveryChannel } from '../../Domain/Services/IAlertNotifier'

export class FakeAlertNotifier implements IAlertNotifier {
  public readonly calls: AlertPayload[] = []
  public nextResult: DeliveryResult
  public shouldThrow = false

  constructor(public readonly channel: DeliveryChannel) {
    this.nextResult = { channel, successes: 1, failures: 0 }
  }

  async notify(payload: AlertPayload): Promise<DeliveryResult> {
    this.calls.push(payload)
    if (this.shouldThrow) throw new Error('FakeAlertNotifier forced error')
    return this.nextResult
  }
}
```

### Example 4: InMemoryAlertDeliveryRepository fixture (immutable)

```ts
// src/Modules/Alerts/__tests__/fakes/InMemoryAlertDeliveryRepository.ts
import type { IAlertDeliveryRepository } from '../../Domain/Repositories/IAlertDeliveryRepository'
import type { AlertDelivery } from '../../Domain/Entities/AlertDelivery'

export class InMemoryAlertDeliveryRepository implements IAlertDeliveryRepository {
  private deliveries: readonly AlertDelivery[] = []

  async save(delivery: AlertDelivery): Promise<void> {
    // upsert by id (immutable replace)
    this.deliveries = [...this.deliveries.filter((d) => d.id !== delivery.id), delivery]
  }

  async findById(id: string): Promise<AlertDelivery | null> {
    return this.deliveries.find((d) => d.id === id) ?? null
  }

  async findByAlertEventId(alertEventId: string): Promise<AlertDelivery[]> {
    return this.deliveries.filter((d) => d.alertEventId === alertEventId)
  }

  async existsSent(params: {...}): Promise<boolean> {
    // After denormalization (Pitfall 1 path), fake filters on delivery's own orgId/month/tier
    return this.deliveries.some((d) =>
      d.channel === params.channel && d.target === params.target && d.status === 'sent'
      // + org/month/tier when those fields land on AlertDelivery
    )
  }

  async listByOrg(orgId: string, opts?: {...}): Promise<AlertDelivery[]> {
    // Same caveat — depends on denormalization
    return [...this.deliveries].slice(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 50))
  }

  // Test helpers (not in interface):
  all(): readonly AlertDelivery[] { return this.deliveries }
  reset(): void { this.deliveries = [] }
}
```

Note: if planner rejects the denormalization (Pitfall 1 Option 2 chosen), `existsSent`/`listByOrg` in the fake need an `AlertEvent` dependency. Simplest: accept an injected `InMemoryAlertEventRepository` reference. Research recommends denormalization precisely because the fake stays self-contained.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct `drizzle-orm` imports per repo (`eq`, `and`, `desc`, `sql`) | `IDatabaseAccess.table(...).where(...)...` fluent API via `IQueryBuilder` | Phase 17 (2026-04-12) | Unit tests drop libsql; adapter swap possible |
| `constructor(private mailer: IMailer, private repoA: IRepoA, ...)` positional params | `constructor(private readonly deps: { mailer: IMailer, repoA: IRepoA, ... })` object-literal readonly | CONVENTIONS.md (already codified); DispatchAlertWebhooksService / ResendDeliveryService already compliant | Easier to add deps without cascading refactors; clearer test setup |
| Hardcoded channel branching in dispatchers | `IAlertNotifier` strategy + notifier registry | **This phase (D-10..D-13)** | New channels = new class, zero cross-cutting touch |
| `vi.fn()` stubs per test, piles in beforeEach | Shared `InMemory*Repository` / `FakeAlertNotifier` fixtures | **This phase (D-16)** | Reusable, type-safe, DI-less |

**Deprecated after this phase:**
- `DispatchAlertWebhooksService` class — logic moves to `WebhookAlertNotifier`.
- `drizzle*` DI binding prefix — renamed (D-02).
- `Drizzle*Repository.ts` filenames — renamed to drop Drizzle prefix (research recommendation within planner discretion).

## Open Questions

1. **Denormalize `alert_deliveries` with `org_id + month + tier`, or add `join()` to IQueryBuilder?**
   - What we know: Both paths deliver ALERTS-01. Denormalization is simpler; JOIN is more general.
   - What's unclear: Whether other modules (e.g., future analytics) will soon need IQueryBuilder.join too, which would tip to Option 2.
   - Recommendation: Plan 1 Wave 0 decision. Default to denormalization.

2. **`SendAlertService.send` — preserve fire-and-forget webhook dispatch, or make it fully awaited?**
   - What we know: Current behavior is fire-and-forget (queueMicrotask, no await). Tests don't assert timing.
   - What's unclear: Whether the original design was intentional or an accident.
   - Recommendation: Preserve via `sync/async` notifier split; flag explicitly in Plan 3 acceptance criteria.

3. **Rename `DrizzleAlertConfigRepository.ts` → `AlertConfigRepository.ts`?**
   - What we know: Already Phase 17-compliant; only DI binding rename is forced by D-02.
   - What's unclear: Whether planner wants filename-level consistency (recommended) or minimal surface.
   - Recommendation: Rename all 4 repo filenames in Plan 1 Wave 4 alongside the binding rename; commit the rename atomically via `git mv`.

4. **Should MODULE.md also enumerate the Phase 18 IScheduler non-use as rationale?**
   - What we know: AlertsServiceProvider.boot() does not use `registerJobs` because the trigger is event-based, not cron-based.
   - Recommendation: Yes — include a "Deliberate non-dependencies" section in MODULE.md to pre-empt future review questions.

## Validation Architecture

> `.planning/config.json` has no `workflow.nyquist_validation` override — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (via `bun test`) |
| Config file | None dedicated for vitest; test files use `describe/it/expect/vi` from `vitest` |
| Quick run command | `bun test src/Modules/Alerts` |
| Full suite command | `bun run check` (typecheck + lint + all tests) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| ALERTS-01 | Zero `drizzle-orm` imports in `src/Modules/Alerts/` (except `.test.ts` helpers if any) | smoke (grep) | `! grep -R "from 'drizzle-orm'" src/Modules/Alerts/ --include='*.ts' --exclude='*.test.ts'` | ✅ shell |
| ALERTS-01 | Each rewritten repo satisfies its existing `I*Repository` Domain contract | integration | `bun test src/Modules/Alerts/__tests__/AlertEventRepository.integration.test.ts` etc. | ❌ Wave 0 (Plan 1) |
| ALERTS-01 (denormalization if chosen) | Migration backfill preserves `org_id/month/tier` values on every pre-existing row | integration | `bun test tests/Integration/migrations/AlertDeliveriesDenormalization.test.ts` | ❌ Wave 0 (Plan 1) |
| ALERTS-02 | `SendAlertService` imports zero cross-module Domain repos | smoke (grep) | `! grep -E "Organization/Domain\|Auth/Domain" src/Modules/Alerts/Application/Services/SendAlertService.ts` | ✅ shell |
| ALERTS-02 | `AlertRecipientResolverImpl` aggregates Org + Member + Auth correctly | unit | `bun test src/Modules/Alerts/__tests__/AlertRecipientResolverImpl.test.ts` | ❌ Wave 0 (Plan 2) |
| ALERTS-02 | `MODULE.md` exists and lists exactly the expected cross-module ports | manual review / smoke | `test -f src/Modules/Alerts/MODULE.md && grep -q "IUsageRepository" src/Modules/Alerts/MODULE.md` | ❌ Wave 0 (Plan 2) |
| ALERTS-03 | All new/changed service tests instantiate via `new Service({...})` with zero container calls | unit | `bun test src/Modules/Alerts/__tests__/SendAlertService.test.ts src/Modules/Alerts/__tests__/EvaluateThresholdsService.test.ts src/Modules/Alerts/__tests__/ResendDeliveryService.test.ts` (verify no `IContainer.make` in test sources) | ✅ existing (to update) |
| ALERTS-03 | `__tests__/fakes/` fixtures satisfy `I*Repository` signatures (compile) | compile | `bun run typecheck` | ✅ tsc |
| ALERTS-04 | `IAlertNotifier` has exactly 2 impls (`EmailAlertNotifier`, `WebhookAlertNotifier`) | smoke (grep) | `grep -l "implements IAlertNotifier" src/Modules/Alerts/Infrastructure/Services/` yields exactly 2 files | ✅ shell |
| ALERTS-04 | `SendAlertService` produces identical `AlertDelivery` row shape regardless of channel | unit | `bun test src/Modules/Alerts/__tests__/EmailAlertNotifier.test.ts src/Modules/Alerts/__tests__/WebhookAlertNotifier.test.ts` | ❌ Wave 0 (Plan 3) |
| ALERTS-04 | `ResendDeliveryService` selects notifier by `delivery.channel` and no longer has email/webhook if-else | unit | `bun test src/Modules/Alerts/__tests__/ResendDeliveryService.test.ts` | ✅ existing (to update) |
| ALERTS-05 | `alert_deliveries` has a row per email send with `channel='email'` | integration | `bun test src/Modules/Alerts/__tests__/EmailAlertNotifier.test.ts` (asserts row written) | ❌ Wave 0 (Plan 3) |
| Regression | Existing 13 Alerts tests remain green | full | `bun test src/Modules/Alerts` | ✅ existing |

### Sampling Rate
- **Per task commit:** `bun test src/Modules/Alerts src/Shared/Infrastructure/Database` (+ `bun run typecheck` if touching ports)
- **Per wave merge:** `bun test src/Modules/Alerts && bun run typecheck`
- **Per plan merge:** `bun run check`
- **Phase gate (before `/gsd:verify-work`):** `bun run check` green AND `grep -R "from 'drizzle-orm'" src/Modules/Alerts/ --include='*.ts'` is empty AND `src/Modules/Alerts/MODULE.md` exists AND `grep "drizzleAlert\|drizzleWebhook" src/` only matches legitimate historical content (test fixtures expecting old names, if any — should be zero).

### Wave 0 Gaps

**Plan 1 (ORM Decoupling):**
- [ ] Decision: JOIN denormalization migration OR IQueryBuilder.join extension (before any repo rewrite)
- [ ] `database/migrations/2026_04_13_NNNNNN_denormalize_alert_deliveries.ts` — IF denormalization path chosen
- [ ] `src/Modules/Alerts/__tests__/AlertEventRepository.integration.test.ts` — tests against real `DrizzleDatabaseAdapter + :memory: libsql`
- [ ] `src/Modules/Alerts/__tests__/AlertDeliveryRepository.integration.test.ts` — same
- [ ] `src/Modules/Alerts/__tests__/WebhookEndpointRepository.integration.test.ts` — same (covers Pitfall 2 save semantics)
- [ ] `tests/Integration/migrations/AlertDeliveriesDenormalization.test.ts` — IF migration added

**Plan 2 (Dependency Consolidation):**
- [ ] `src/Modules/Alerts/__tests__/fakes/InMemoryAlertRecipientResolver.ts`
- [ ] `src/Modules/Alerts/__tests__/AlertRecipientResolverImpl.test.ts`
- [ ] `src/Modules/Alerts/MODULE.md` (structure agreed in research recommendation — see Open Question 4)

**Plan 3 (Notifier Unification + DI-less Fakes):**
- [ ] `src/Modules/Alerts/__tests__/fakes/InMemoryAlertConfigRepository.ts`
- [ ] `src/Modules/Alerts/__tests__/fakes/InMemoryAlertEventRepository.ts`
- [ ] `src/Modules/Alerts/__tests__/fakes/InMemoryAlertDeliveryRepository.ts`
- [ ] `src/Modules/Alerts/__tests__/fakes/InMemoryWebhookEndpointRepository.ts`
- [ ] `src/Modules/Alerts/__tests__/fakes/FakeAlertNotifier.ts`
- [ ] `src/Modules/Alerts/__tests__/EmailAlertNotifier.test.ts`
- [ ] `src/Modules/Alerts/__tests__/WebhookAlertNotifier.test.ts`
- [ ] Update: `src/Modules/Alerts/__tests__/SendAlertService.test.ts` (new ctor shape + fakes)
- [ ] Update: `src/Modules/Alerts/__tests__/ResendDeliveryService.test.ts` (notifier registry)
- [ ] Delete: `src/Modules/Alerts/__tests__/DispatchAlertWebhooksService.test.ts` (logic absorbed into WebhookAlertNotifier.test.ts)

Framework install: **none** — `vitest` + `bun test` already in project.

## Sources

### Primary (HIGH confidence) — direct code inspection
- `.planning/phases/19-alerts-module-decoupling/19-CONTEXT.md` — all D-01..D-19 decisions, suggested plan split, deferred items
- `.planning/REQUIREMENTS.md` — ALERTS-01..05 definitions (lines 17–21)
- `.planning/STATE.md` — confirms Phase 18 complete, 19 ready
- `.planning/ROADMAP.md` — confirms 3-plan target
- `.planning/phases/17-iquerybuilder-usagerepository-drizzle/17-RESEARCH.md` — AggregateSpec / IQueryBuilder pattern basis
- `src/Modules/Alerts/Infrastructure/Repositories/DrizzleAlertConfigRepository.ts` — **already-compliant reference implementation** (37 lines, zero drizzle-orm import)
- `src/Modules/Alerts/Infrastructure/Repositories/DrizzleAlertEventRepository.ts` (47 lines) — target rewrite
- `src/Modules/Alerts/Infrastructure/Repositories/DrizzleAlertDeliveryRepository.ts` (79 lines) — target rewrite; contains the only join usage (existsSent, listByOrg)
- `src/Modules/Alerts/Infrastructure/Repositories/DrizzleWebhookEndpointRepository.ts` (73 lines) — target rewrite; contains `onConflictDoUpdate` (Pitfall 2)
- `src/Modules/Alerts/Application/Services/SendAlertService.ts` (118 lines) — 7 positional ctor args, 3 cross-module repos, inline channel dispatch, queueMicrotask fire-and-forget (Pitfall 6)
- `src/Modules/Alerts/Application/Services/EvaluateThresholdsService.ts` (121 lines) — 4 positional ctor args; D-18 refactor target
- `src/Modules/Alerts/Application/Services/DispatchAlertWebhooksService.ts` (92 lines) — already object-literal; absorbed into WebhookAlertNotifier in Plan 3
- `src/Modules/Alerts/Application/Services/ResendDeliveryService.ts` (162 lines) — already object-literal; channel if-else on line 64 vs line 112 → collapse via notifierRegistry
- `src/Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider.ts` (182 lines) — 17 bindings; lines 41–55 need rename; boot() line 172 retains DomainEventDispatcher
- `src/Modules/Alerts/Domain/Repositories/IAlertDeliveryRepository.ts` — confirms interface stability
- `src/Shared/Infrastructure/IDatabaseAccess.ts` (190 lines) — confirms no join primitive; aggregate/insertOrIgnore already present
- `src/Shared/Infrastructure/Database/AggregateSpec.ts` — builder surface ready; only needed if GROUP BY emerges in Alerts (not currently the case)
- `src/Shared/Infrastructure/Database/Adapters/Drizzle/schema.ts` lines 203–283 — confirms `alert_deliveries.channel` column exists (D-14 is schema-no-op); no `org_id/month/tier` on `alert_deliveries` (Pitfall 1 migration target)
- `src/Shared/Infrastructure/Database/Adapters/Drizzle/DrizzleQueryBuilder.ts` (421 lines) — confirms `insertOrIgnore` present (line 187), no join
- `src/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess.ts` (365 lines) — confirms parity surface; no join
- `src/Modules/Alerts/__tests__/SendAlertService.test.ts` lines 1–100 — current `vi.fn()` stub pattern (D-16 replacement target)
- `.planning/codebase/CONVENTIONS.md` lines 1–60 — naming conventions, object-literal ctor rule
- `src/Foundation/Infrastructure/Ports/IMailer.ts` / `IWebhookDispatcher.ts` (directory listing) — confirmed present, unchanged

### Secondary (MEDIUM confidence)
- `src/Modules/Dashboard/Infrastructure/Repositories/DrizzleUsageRepository.ts` — Phase 17 reference; pattern is directly applicable but Alerts repos don't require its aggregate complexity.

### Tertiary (LOW confidence)
None — zero WebSearch or Context7 queries needed for this phase. Every claim is grounded in repository code inspected today.

## Metadata

**Confidence breakdown:**
- Standard stack & scope: HIGH — every referenced file was opened and its relevant lines verified
- Architecture (3-plan split, notifier strategy, resolver port placement): HIGH — CONTEXT explicitly endorses 3-plan split; placement rules derive from project CONVENTIONS.md
- Pitfalls 1–7: HIGH — each pitfall is tied to a specific code file and line number
- JOIN resolution strategy (denormalization vs IQueryBuilder.join): MEDIUM — both paths are technically sound; research recommends denormalization on simplicity grounds but planner may pick differently based on module roadmap
- DI-less fakes approach (bespoke InMemory* vs MemoryDatabaseAccess-backed): MEDIUM — both work; research recommends bespoke for test ergonomics

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (30 days — target code is stable; only expected change is from this phase itself)
