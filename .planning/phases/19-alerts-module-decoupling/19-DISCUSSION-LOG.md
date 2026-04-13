# Phase 19: Alerts Module Decoupling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 19-alerts-module-decoupling
**Areas discussed:** Drizzle 去除策略, 跨模組依賴收斂, Notification adapter 解耦, DI-less 可測性

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Drizzle 去除策略 | ALERTS-01 repos 遷移至 AggregateSpec/IQueryBuilder | ✓ |
| 跨模組依賴收斂 | ALERTS-02 SendAlertService 及 5 個外部 port 收斂 | ✓ |
| Notification adapter 解耦 | ALERTS-04 Webhook/Email notifier 統一 | ✓ |
| DI-less 可測性 | ALERTS-03 unit tests 脫離 container | ✓ |

**User's choice:** All four selected.

---

## Drizzle 去除策略

### Q1: 4 個 repos 如何遷至 ORM-agnostic？

| Option | Description | Selected |
|--------|-------------|----------|
| 全部走 IQueryBuilder + AggregateSpec | 與 Phase 17 UsageRepository 對齊 | ✓ |
| Repo port 抽象 + Drizzle adapter 專屬實作 | 保留 Drizzle imports 於 adapter 內 | |
| 混合：查詢走 AggregateSpec，寫入保留 Drizzle | | |
| 全部開源 Repo, Alerts 自行擴充 IQueryBuilder primitives | | |

### Q2: DI binding 命名如何處理？

| Option | Description | Selected |
|--------|-------------|----------|
| 全部去 Drizzle prefix | drizzleAlertConfigRepository → alertConfigRepository | ✓ |
| 保持現有命名 | | |
| 兩名並存 (alias) | | |

### Q3: 4 個 repos 的遷移節奏？

| Option | Description | Selected |
|--------|-------------|----------|
| 一個 Plan 內一次到位 | 對齊 Phase 17 做法 | ✓ |
| 拆兩個 Plans | config+event / webhook+delivery | |
| 遷移模式先立 + 每 repo 隨後跟進 | | |

### Q4: IQueryBuilder/AggregateSpec primitives 不足怎麼辦？

| Option | Description | Selected |
|--------|-------------|----------|
| 擴充 Foundation 層 primitives | Phase 17 canonical 方向 | ✓ |
| Alerts 內定義自己的 Repository Spec DSL | | |
| Researcher 評估後決定 | | |

---

## 跨模組依賴收斂

### Q1: SendAlertService 對 Org/OrgMember/Auth 3 個 repos 如何收斂？

| Option | Description | Selected |
|--------|-------------|----------|
| 新增 IAlertRecipientResolver port (Alerts 擁有) | 語意化收斂 | ✓ |
| 保留 3 個 repo 依賴但改為 Read-Model DTOs | | |
| 保持現狀不動 | | |

**Notes:** 使用者選擇新增 port（非 recommended）。CONTEXT.md D-05/D-06 已對應。

### Q2: EvaluateThresholdsService 依賴 IUsageRepository + IApiKeyRepository？

| Option | Description | Selected |
|--------|-------------|----------|
| 保留 | 兩者皆已 port | ✓ |
| 抽 IBudgetUsageReader port (Alerts 專用) | | |
| 生 apiKey read-only view port | | |

### Q3: AlertsServiceProvider.boot() 的 DomainEventDispatcher 訂閱？

| Option | Description | Selected |
|--------|-------------|----------|
| 保留 boot() 中訂閱 | | ✓ |
| 新增 registerSubscribers hook (Framework level) | | |
| 抽成 AlertEventRouter 內部 class | | |

### Q4: 跨模組依賴清單如何管理？

| Option | Description | Selected |
|--------|-------------|----------|
| README.md 或 MODULE.md 於 Alerts/ 樹狀根 | 可審查契約 | ✓ |
| 僅用 TypeScript port imports 退實 | | |
| 新增 lint rule (no-restricted-imports) | 留給 Phase 20 | |

---

## Notification adapter 解耦

### Q1: Email 與 Webhook 整合模型？

| Option | Description | Selected |
|--------|-------------|----------|
| 統一 IAlertNotifier port (channel strategy) | | ✓ |
| 雙 port 但改為 notifier registry | | |
| 維持現狀 | | |

### Q2: ResendDeliveryService 如何配合 notifier 統一？

| Option | Description | Selected |
|--------|-------------|----------|
| Resend 也走 IAlertNotifier | 一致路徑 | ✓ |
| Resend 保留雙分支 | | |
| Researcher 準備實作時決定 | | |

### Q3: Email 發送記錄怎麼處理？

| Option | Description | Selected |
|--------|-------------|----------|
| Email 也寫入 alert_deliveries (channel='email') | | ✓ |
| Email 保持僅靠 alert_events 的這訊 | | |
| Plan 時再定 | | |

### Q4: AlertEmailTemplates.ts 定位？

| Option | Description | Selected |
|--------|-------------|----------|
| 保持 Alerts/Infrastructure/Services/ | | ✓ |
| 移至 Alerts/Application/ | | |
| 抽成獨立 IAlertTemplateRenderer port | | |

---

## DI-less 可測性

### Q1: Fake repositories 如何提供？

| Option | Description | Selected |
|--------|-------------|----------|
| 建立共用 InMemory*Repository fixtures | __tests__/fakes/ | ✓ |
| 維持 per-test ad-hoc fakes | | |
| 根據 service 複雜度混搭 | | |

### Q2: 13 個現有 test 檔是否重構為 DI-less？

| Option | Description | Selected |
|--------|-------------|----------|
| 僅新 tests 走 DI-less，舊 tests 保留 | | ✓ |
| 所有 Application service tests 需 DI-less | | |
| Plan 時再判斷 | | |

### Q3: Constructor 風格統一？

| Option | Description | Selected |
|--------|-------------|----------|
| 統一為 object-literal ctor | 符合 CONVENTIONS.md | ✓ |
| 不動 constructor 風格 | | |
| 僅 SendAlertService 改造 | | |

### Q4: Test runner / pattern 有特別需求？

| Option | Description | Selected |
|--------|-------------|----------|
| 沒有，vitest 現行模式即可 | | ✓ |
| 新增 integration test suite for notifier wiring | | |
| 交給 plan 決定 | | |

---

## Claude's Discretion

- InMemory fakes 的具體 filter/sort 語意
- `IAlertRecipientResolver` 實作放置路徑
- `AlertPayload` DTO 精確欄位 schema
- 三個 plan 的分界建議（Plan 1 = ORM / Plan 2 = 依賴收斂 / Plan 3 = Notifier + DI-less）

## Deferred Ideas

- 引入 no-restricted-imports lint rule（Phase 20）
- notifier pipeline integration test suite
- registerSubscribers framework hook
- 新通知管道（Slack/Discord/Telegram）
- IAlertTemplateRenderer port 外部化
- Redis/BullMQ 持久化
- Alerts cooldown/throttle 統一
- 運行時通知管道切換
- notifier 並行策略細節（Promise.all vs allSettled）

---

*Discussion log generated: 2026-04-13*
