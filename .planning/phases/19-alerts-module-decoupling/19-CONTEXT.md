# Phase 19: Alerts Module Decoupling - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

讓 Alerts 模組遵循 Phase 17 建立的 ORM-agnostic 模式，徹底斷絕與 Drizzle 的直接耦合、收斂跨模組依賴面、確保 Application service 可在無 DI 容器下進行單元測試。

本階段交付：
- 4 個 Drizzle repos（AlertConfig / AlertEvent / AlertDelivery / WebhookEndpoint）全面改用 Phase 17 IQueryBuilder + AggregateSpec 模式，無任何 `import 'drizzle-orm'`
- DI bindings 全面去除 `drizzle` prefix
- 新增 `IAlertRecipientResolver` port（Alerts 擁有），收斂 SendAlertService 對 Org/OrgMember/Auth 三個 repo 的直接依賴
- 統一 `IAlertNotifier` port（channel strategy），WebhookAlertNotifier 與 EmailAlertNotifier 分別實作
- Email 發送記錄納入 `alert_deliveries`（channel='email'）
- Application service constructors 統一為 object-literal 風格（特別是 SendAlertService / EvaluateThresholdsService）
- `src/Modules/Alerts/__tests__/fakes/` 提供共用 InMemory*Repository fixtures
- `src/Modules/Alerts/MODULE.md` 明列本模組跨模組依賴清單

**不涵蓋：**
- 新增通知管道（v2+）
- 功能行為變更（threshold 規則、評估頻率、cooldown 邏輯）
- Dashboard / Auth / Organization / ApiKey 模組內部重構
- 新增 lint rule 或 CI guardrail（留給 Phase 20）
- cron-based alert 排程（Phase 18 IScheduler 已就位，本階段不涉及）

</domain>

<decisions>
## Implementation Decisions

### Drizzle 去除策略
- **D-01:** 4 個 repos 全部遷至 IQueryBuilder + AggregateSpec 模式（Phase 17 對齊），完成 ALERTS-01。Application layer 與 Domain layer 零 `drizzle-orm` import
- **D-02:** DI binding 全面去除 `drizzle` prefix：`drizzleAlertConfigRepository` → `alertConfigRepository`、`drizzleAlertEventRepository` → `alertEventRepository`（`alertDeliveryRepository` / `webhookEndpointRepository` 已符合命名）。AlertsServiceProvider 與所有呼叫端同步更新
- **D-03:** 4 個 repos 在同一個 Plan 內一次遷移到位（對齊 Phase 17 的 UsageRepository 做法），不拆分階段
- **D-04:** 現有 IQueryBuilder / AggregateSpec primitives 若不足以表達 Alerts 查詢（例如 delivery history 的 filter+pagination、alert_events group-by 等），則擴充 Foundation 層 port（承接 Phase 17 已建立的方向），不在 Alerts 內發明 module-local DSL

### 跨模組依賴收斂
- **D-05:** 新增 `IAlertRecipientResolver` port（Alerts Domain 擁有）：`resolveByOrg(orgId) → { emails: string[], locale?: string, ... }`。SendAlertService 改只消費此 port，不再直接握 `IOrganizationRepository` / `IOrganizationMemberRepository` / `IAuthRepository`
- **D-06:** Resolver 實作放在 composition root（bootstrap or dedicated `AlertRecipientResolverImpl` 於 Alerts/Infrastructure），內部聚合三個跨模組 repo 查詢。Alerts Application 層只看到 port
- **D-07:** EvaluateThresholdsService 對 `IUsageRepository` 與 `IApiKeyRepository` 的依賴保留不動 — 兩者已為 Phase 17 port / Domain repository port，符合 ALERTS-02「不依賴實作細節」的精神，無需新包裝
- **D-08:** AlertsServiceProvider.boot() 保留現有 `DomainEventDispatcher.on('bifrost.sync.completed', ...)` wiring 位置（非 cron，不適用 Phase 18 `registerJobs` hook）。不引入新的 `registerSubscribers` framework lifecycle（scope creep）
- **D-09:** 新增 `src/Modules/Alerts/MODULE.md` 列出此模組所有跨模組依賴 port 與原因，作為 ALERTS-02 的可審查契約

### Notification adapter 解耦 (ALERTS-04)
- **D-10:** 定義 `IAlertNotifier` port（Alerts Domain 擁有）：`notify(payload: AlertPayload): Promise<DeliveryResult>`，payload 包含 channel-agnostic 欄位（orgId, tier, budget, actualCost, keyBreakdown, month, recipientContext）
- **D-11:** 兩個實作：`EmailAlertNotifier`（持有 `IMailer` + `AlertEmailTemplates`）與 `WebhookAlertNotifier`（持有 `IWebhookDispatcher` + `IWebhookEndpointRepository` + delivery log repo）
- **D-12:** SendAlertService 改為持有 `readonly notifiers: IAlertNotifier[]`，並行 dispatch。不再 hardcode `mailer.send` + `dispatchAlertWebhooksService.execute`。DispatchAlertWebhooksService 現有邏輯搬入 WebhookAlertNotifier
- **D-13:** ResendDeliveryService 同樣走 `IAlertNotifier`：依 `delivery.channel` 從 notifier registry 選取對應 notifier 重試，統一入口
- **D-14:** 擴充 `alert_deliveries` schema 支援 `channel` 欄位（若尚未有），email 發送後也寫入此表（channel='email'）。對應 migration 由 planner 指派 task
- **D-15:** `AlertEmailTemplates.ts` 維持在 `src/Modules/Alerts/Infrastructure/Services/`，作為 EmailAlertNotifier 的內部依賴，不抽 IAlertTemplateRenderer port（避免過度工程化）

### DI-less 可測性 (ALERTS-03)
- **D-16:** 在 `src/Modules/Alerts/__tests__/fakes/` 建立共用 `InMemoryAlertConfigRepository` / `InMemoryAlertEventRepository` / `InMemoryAlertDeliveryRepository` / `InMemoryWebhookEndpointRepository` / `InMemoryAlertRecipientResolver` / `FakeAlertNotifier`，提供新 tests 直接 `new Service({ repo: new InMemory*, ... })` 的能力，完全無需 container
- **D-17:** Phase 19 只保證「新/改動的 Application service tests」符合 DI-less。現有 13 個 test 檔若已 isolated 則不動（避免 scope creep）；改動 constructor 的 service（SendAlertService / EvaluateThresholdsService / DispatchAlertWebhooksService）tests 需相應更新
- **D-18:** Application Service constructor 全面統一為 object-literal readonly 參數風格（CONVENTIONS.md 已規定）。SendAlertService 從 7 個 positional args 改為 `{ mailer, orgMemberRepo, ... }` 風格，之後再由 D-05/D-12 進一步收斂
- **D-19:** Test runner 維持 vitest 現行模式（`__tests__/`, `.test.ts`）。不新增 notifier pipeline integration test suite（交給 planner 於 plan 時依改動面評估）

### Folded Todos
- **Fix pre-existing regressions in AtlasQueryBuilder (Phase 17)**：若 Phase 19 擴充 IQueryBuilder primitives（D-04）時碰觸到 AtlasQueryBuilder，順手修補；若未碰觸則仍為獨立 todo 留在 STATE.md

### Claude's Discretion
- InMemory fakes 的具體 filter/sort 語意（是否完整模擬 spec primitives vs 只實作 tests 當前用到的路徑）— 交由 planner 決定
- `IAlertRecipientResolver` 實作的放置路徑（`Alerts/Infrastructure/Services/AlertRecipientResolverImpl.ts` vs composition-root composite）— 交由 researcher 依 CONVENTIONS.md 決定
- `AlertPayload` DTO 的精確欄位 schema（interface 或 zod）— 交給 planner
- 三個 plan 的分界建議：Plan 1 = ORM 解耦（D-01~D-04）；Plan 2 = 依賴收斂（D-05~D-09）；Plan 3 = Notifier 統一 + DI-less fakes（D-10~D-19）。planner 可視複雜度微調

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 17 模式（ALERTS-01 的直接參考，必讀）
- `.planning/phases/17-iquerybuilder-usagerepository-drizzle/` — IQueryBuilder / AggregateSpec 的建立過程、決策與 trade-offs
- `src/Modules/Dashboard/Infrastructure/Repositories/` — Phase 17 重構後的 UsageRepository 實作範例（AggregateSpec 使用樣板）
- `src/Modules/Dashboard/Application/Ports/IUsageRepository.ts` — port 設計範式，Alerts repos 將對齊此風格
- `src/Foundation/Infrastructure/Database/` — IQueryBuilder / IDatabaseAccess 目前提供的 primitives 範圍

### 現有實作（必讀，重構對象）
- `src/Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider.ts` — 17 個 bindings、5 個跨模組 port 的 wiring
- `src/Modules/Alerts/Infrastructure/Repositories/DrizzleAlertConfigRepository.ts` (37 行)
- `src/Modules/Alerts/Infrastructure/Repositories/DrizzleAlertEventRepository.ts` (47 行)
- `src/Modules/Alerts/Infrastructure/Repositories/DrizzleAlertDeliveryRepository.ts` (79 行) — 最複雜，需 filter+pagination
- `src/Modules/Alerts/Infrastructure/Repositories/DrizzleWebhookEndpointRepository.ts` (73 行)
- `src/Modules/Alerts/Application/Services/SendAlertService.ts` (118 行) — 7 個 positional args，D-05/D-12/D-18 全部碰觸
- `src/Modules/Alerts/Application/Services/EvaluateThresholdsService.ts` (121 行) — threshold 邏輯入口
- `src/Modules/Alerts/Application/Services/DispatchAlertWebhooksService.ts` (92 行) — 將遷入 WebhookAlertNotifier
- `src/Modules/Alerts/Application/Services/ResendDeliveryService.ts` (162 行) — D-13 重點
- `src/Modules/Alerts/Infrastructure/Services/AlertEmailTemplates.ts` — EmailAlertNotifier 內部依賴

### 跨模組依賴的 port 定義
- `src/Foundation/Infrastructure/Ports/IMailer.ts`
- `src/Foundation/Infrastructure/Ports/IWebhookDispatcher.ts`
- `src/Modules/Organization/Domain/Repositories/IOrganizationRepository.ts`
- `src/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository.ts`
- `src/Modules/Auth/Domain/Repositories/IAuthRepository.ts`
- `src/Modules/ApiKey/Domain/Repositories/IApiKeyRepository.ts`

### 框架與慣例
- `.planning/codebase/CONVENTIONS.md` — naming、constructor object pattern、immutability
- `.planning/codebase/STRUCTURE.md` — DDD 分層
- `.planning/codebase/STACK.md`
- `src/Shared/Infrastructure/IServiceProvider.ts` — ServiceProvider 介面
- `skills/gravito-prism/SKILL.md` — DI 綁定慣例

### 規格與需求
- `.planning/REQUIREMENTS.md` §Alerts 模組解耦 — ALERTS-01..05
- `.planning/PROJECT.md` — v1.4 Hardening & Refinement 核心價值
- `.planning/phases/18-uniform-background-jobs/18-CONTEXT.md` — Phase 18 registerJobs 決策（本階段解釋為何 alerts event subscription 不走 Phase 18 hook）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 17 AggregateSpec / IQueryBuilder 基礎設施（Foundation 層） — 直接沿用
- `IMailer` (`@/Foundation`) / `IWebhookDispatcher` (`@/Foundation`) — 作為 EmailAlertNotifier / WebhookAlertNotifier 的底層依賴
- 現有 `IAlertConfigRepository` / `IAlertEventRepository` / `IAlertDeliveryRepository` / `IWebhookEndpointRepository` Domain port — 介面不改，只換實作
- 13 個現有 `__tests__/` 測試 — 提供 DI-less pattern 參考（Domain + VO 層大多已是）
- `DomainEventDispatcher` (`Shared/Domain`) — boot() 中保留現有 subscription wiring

### Established Patterns
- Phase 17 已建立：Foundation port → Drizzle adapter → Application service 的 ORM-agnostic 三層
- Application service constructor object-literal 風格（DispatchAlertWebhooksService / ResendDeliveryService 已是範例）
- `DomainEventDispatcher` 為跨模組事件通道（Alerts 訂閱、BifrostSync 發佈）
- `[ModuleName]` logging prefix — 本階段仍用 `[Alerts]`

### Integration Points
- `AlertsServiceProvider.register()` — 新增 `alertRecipientResolver`、`emailAlertNotifier`、`webhookAlertNotifier` 3 個 bindings；重命名 4 個 repo bindings
- `AlertsServiceProvider.boot()` — wiring 邏輯不動；若 resolver 需跨模組組合則在此處拼裝
- `src/bootstrap.ts` — 無需新增邏輯（provider 內部處理）
- `alert_deliveries` schema (Drizzle) — 若尚未有 `channel` 欄位，需新增 migration 支援 channel='email'
- 所有 DI binding name 使用方（AlertController / WebhookEndpointController / 呼叫端 service factory） — 隨 D-02 同步更新

</code_context>

<specifics>
## Specific Ideas

- **Phase 17 對齊是底線，不是目標**：ALERTS-01 直接延續既有模式，不重新設計 spec DSL。Foundation primitives 若不足由 D-04 延伸，不在 Alerts 內發明
- **IAlertRecipientResolver 是本階段最有價值的抽象**：它把 Alerts 與 Org/Auth 兩個大模組的 coupling 從「三個 repo + 複雜組合邏輯」收斂成一個語意化 port，ALERTS-02 最直接的體現
- **IAlertNotifier 的 channel map 未來延展性**：Slack、Discord、Telegram 等新管道只需實作新 notifier，SendAlertService / ResendDeliveryService 零改動
- **MODULE.md 是 ALERTS-02 的「可審查」實體**：列出依賴契約，下個人 review 時可一眼看出有沒有違反
- **Test fakes 集中管理**：現在各 test 自己建 stub 是維護成本來源。InMemory* fixtures 寫一次，所有 service tests 受益
- **SendAlertService 從 7 個 positional args → object ctor**：單純改造但對可讀性、可測性、未來加依賴的漸進成本都有明顯收益

</specifics>

<deferred>
## Deferred Ideas

- **引入 lint rule（no-restricted-imports）禁 Alerts 跨模組 imports** — 留給 Phase 20 CI Guardrails 討論
- **新增 notifier pipeline integration test suite** — planner 可於 plan 階段視改動面評估；若 DI-less unit tests 已能驗證則不必
- **registerSubscribers 框架 lifecycle hook**（統一 DomainEventDispatcher wiring）— v1.5+ 再評估，Phase 19 不擴 Framework
- **新通知管道（Slack/Discord/Telegram）** — 明確 out-of-scope（REQUIREMENTS.md）
- **IAlertTemplateRenderer port 外部化** — 過度工程化，目前 template 無多租戶定制需求
- **Redis 持久化 / BullMQ** — 明確 out-of-scope
- **Alerts cooldown/throttle 定時邏輯統一** — Phase 18 deferred；若 Phase 19 未觸及則繼續 defer
- **運行時通知管道切換** — 明確 out-of-scope
- **SendAlertService 的 notifier 並行策略（Promise.all vs Promise.allSettled、單 channel 失敗是否整體失敗）** — 交由 planner 與 researcher 依錯誤語意決定；context 不強制

</deferred>

---

*Phase: 19-alerts-module-decoupling*
*Context gathered: 2026-04-13*
