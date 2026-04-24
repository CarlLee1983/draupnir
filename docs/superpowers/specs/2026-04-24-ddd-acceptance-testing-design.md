# Draupnir DDD 驗收測試層設計

**Date**: 2026-04-24
**Status**: Draft（待 review）
**Author**: brainstorming with Carl
**Scope**: 測試體系改造——在單元測試與 E2E 之間建立「驗收層」，涵蓋 Credit 模組為 pilot

**與既有文件的關係**：本文與 `docs/draupnir/specs/5-testing-validation/api-functional-testing.md` 並存、範圍不同。後者描述現行 `tests/Feature/` 的 OpenAPI-driven API 自動測試；本文提出新的兩層驗收架構（Use Case + API Contract），見 §11 對既有測試的處置。

---

## 1. 背景與動機

### 1.1 現況測試體系

| 分層 | 位置 | 特性 |
|------|------|------|
| 單元測試 | `src/Modules/*/__tests__/*.test.ts`（vitest） | 用 `MemoryDatabaseAccess`，跨模組依賴用 `vi.fn()` mock |
| 整合測試（稀少） | `*.integration.test.ts`、`tests/Integration/` | 僅 1 支 `CreditEventFlow.integration.test.ts`，仍手動 `new` service 並 mock port |
| Feature 測試 | `tests/Feature/api-*.e2e.ts`（bun:test） | OpenAPI spec-driven，真 HTTP 打 `test:feature` 啟的伺服器 |
| E2E | `e2e/*.e2e.ts`（Playwright） | 啟 `ORM=memory` 完整 build，含 UI 與 raw HTTP |
| 基礎設施 | `tests/Unit/Adapters/` 等 | Adapter / Foundation 工具 |

### 1.2 識別的缺口

1. **真實 DI wiring 沒驗**：單元測試 mock 太多，ServiceProvider 綁錯、event handler 沒註冊這類問題抓不到
2. **沒有按業務情境組織**：測試都是按 class 組織（`TopUpCreditService.test.ts`），無法快速看出「某個 user story 有無覆蓋」
3. **跨模組 saga 沒自動覆蓋**：Credit 扣款 → ApiKey 封鎖這類 flow 只能靠 E2E 驗
4. **缺乏「HTTP-in DB-out」快速切片**：E2E 太慢、單元測試貼不到真實行為
5. **Drizzle / SQL path 未被測試覆蓋**：Repository 實作 bug 只會在 production 才浮出（memory adapter 繞過了真 DB）

---

## 2. 設計目標

建立「**驗收層**」，單一方法論同時覆蓋：

- **(a) 真實 DI wiring 驗證**：透過 real `ServiceProvider` boot，container resolve 所有依賴
- **(b) 業務情境驗收**：按 user story / use case 組織，檔名即場景名
- **(c) 跨模組 saga / Domain Event flow**：真實 `DomainEventDispatcher`、真實 handler 註冊
- **(d) HTTP-in DB-out 切片**：in-process app，不需 Playwright 或前端 build

**非目標**：不取代 Playwright UI E2E、不取代 Domain 層純邏輯單元測試、不取代 Bifrost gateway 真實 contract 驗證。

---

## 3. 總體架構：兩層驗收

```
tests/
├── Acceptance/
│   ├── UseCases/                                    ← 主要戰場（80% 場景）
│   │   └── Credit/
│   │       ├── top-up-credit.spec.ts
│   │       ├── deduct-credit.spec.ts
│   │       ├── deduct-until-depleted.spec.ts       ← 跨 Credit ↔ ApiKey
│   │       ├── credit-topped-up-restores-keys.spec.ts
│   │       ├── refund-credit.spec.ts
│   │       └── apply-usage-charges.spec.ts          ← 需 TestClock
│   ├── ApiContract/                                  ← 關鍵 API 驗證
│   │   └── credit-endpoints.spec.ts                 ← 200/403/422
│   └── support/
│       ├── TestApp.ts
│       ├── TestClock.ts
│       ├── fakes/
│       ├── scenarios/
│       └── db/
└── …（既有 Unit / Feature / e2e 保留）
```

### 3.1 兩層分工

| 項目 | Use Case Acceptance | API Contract Acceptance |
|------|--------------------|-----------------------|
| 入口 | Application Service method call | In-process HTTP fetch |
| 描述風格 | Given / When / Then DSL | `describe + it`（樸素） |
| 覆蓋 | Domain + Event + 跨模組 saga + DI wiring | + Routes / Auth middleware / Zod validation / HTTP 語意 |
| 數量 | 多（每 user story 一支） | 少（每 endpoint 3 個關鍵場景） |
| 速度 | 最快（無 HTTP） | 稍慢（同 container，仍快） |
| 不覆蓋 | HTTP、auth middleware | UI / 前端 JS |

---

## 4. `TestApp` Harness

共用於兩層，位置：`tests/Acceptance/support/TestApp.ts`。

### 4.1 啟動流程

1. 讀真實 `ServiceProvider` 鏈（含所有 Module providers）
2. Container rebind 外部 Port 為 test fakes（見 §6）
3. 暴露 app handle

### 4.2 Handle API

```ts
const app = await TestApp.boot()

app.container         // 真實 DI container，container.get(ServiceToken)
app.http              // in-process fetch：app.http.post('/api/...', { body, auth })
app.db                // raw DB helper：app.db.getCreditBalance('org-1')
app.clock             // TestClock 實例
app.gateway           // MockGatewayClient 實例
app.events            // captured DomainEvent（for 'then.domainEventsInclude'）
app.mailbox           // InMemoryMailer 暴露的訊息陣列（後續引入）
app.webhooks          // captured webhook deliveries（後續引入）

await app.reset()     // truncate DB + reset fakes
await app.shutdown()  // afterAll 收乾淨
```

### 4.3 Lifecycle

| 階段 | 行為 |
|------|------|
| Per worker（vitest worker boot） | 建立 SQLite tmp file、跑 migrations 一次 |
| Per test file（`beforeAll`） | `app = await TestApp.boot()` |
| Per test（`beforeEach`） | `await app.reset()` — truncate 所有表 + reset fakes |
| Per test file（`afterAll`） | `await app.shutdown()` |

**不 reboot 條件**：container 在同 file 內 reuse；schema 在同 worker 內 reuse。

### 4.4 並行

- Vitest 預設 per-file parallelism；每 worker 各自一份 SQLite 檔
- 禁止共享全域狀態；所有單例都 container-resolve

### 4.5 效能目標

- 單 spec（5 test）< 500ms
- Credit pilot 全部（12 spec，約 40 test）< 10s

---

## 5. 資料庫策略

### 5.1 決策：真實 SQLite + 真實 migrations

- 使用 `@libsql/client` + Drizzle（與 production 同 path）
- Per worker 一份 tmp file（`/tmp/draupnir-acceptance-${pid}.db`）或 `:memory:`（擇一、benchmark 決定）
- Migrations 只在 worker boot 時跑一次；per-test 以 truncate 清資料

### 5.2 驅動理由

1. Drizzle / SQL mapping bug 由 acceptance 層抓（memory adapter 繞過，名不符實）
2. Migration 自動被每次測試覆蓋，順便解決 migration drift
3. SQLite 夠快，per-worker 攤提後可忽略
4. 不再 per-test reboot DB，transaction 隔離也不需要（truncate 就夠）

### 5.3 既有 `MemoryDatabaseAccess` 處置

- 保留，繼續服務 Domain 純邏輯單元測試
- 不在 Acceptance 層使用

---

## 6. 外部 Port 與 Fakes

### 6.1 原則

**只有「本專案控制不到的外部邊界」才 fake。**

**絕對不 fake**：
- Domain Repository（`ICreditAccountRepository` 等）
- 其他 Module 的 Application Service
- `DomainEventDispatcher`
- Zod validation
- Drizzle / `@libsql/client` / SQLite

### 6.2 既有可重用

| Port | 既有 Fake | 動作 |
|------|-----------|------|
| `IGatewayClient` | `MockGatewayClient`（已於 `src/Foundation/.../LLMGateway/implementations/`） | 沿用、在 `TestApp.boot()` 時 bind |

### 6.3 驗收測試帶入的新 Port

| Port | 位置 | 生產實作 | Test fake | Pilot 必要？ |
|------|------|---------|-----------|-------------|
| `IClock` | `src/Shared/Application/Ports/IClock.ts` | `SystemClock` | `TestClock`（`advance(ms)` / `setNow(date)`） | ✅ pilot #9 需要 |
| `IScheduler` fake | 保留既有 port，新增 test fake `ManualScheduler` | 原 Croner-based | `ManualScheduler`（register 不觸發，手動 `trigger(jobName)`） | ✅ 若 pilot #9 涉及排程 |
| `IMailer` | `src/Shared/Application/Ports/IMailer.ts` | `UpyoSmtpMailer` | `InMemoryMailer` | ❌ 延後到 Auth/Organization 階段 |
| `IWebhookDeliverer` | `src/Modules/Alerts/Application/Ports/*` | `HttpWebhookDeliverer` | `CapturingWebhookDeliverer` | ❌ 延後到 Alerts 階段 |

### 6.4 Clock 遷移策略

- 只在 pilot 必要之處引入 `IClock` 注入（預期僅 `ApplyUsageChargesService`）
- 其他模組目前的 `Date.now()` 不動；各模組寫自己的 Acceptance 時再視需要遷移
- 禁止 `vi.useFakeTimers`（與 real DB / HTTP harness 衝突）

### 6.5 Event 捕捉（非 fake，為觀察者）

`DomainEventDispatcher` 真實運作；`TestApp.boot` 時註冊一個觀察者 listener，把所有派發的 event 記錄到 `app.events[]`，供 `then.domainEventsInclude(...)` 斷言。不攔截、不改變 dispatch 行為。

---

## 7. Given-When-Then DSL（Use Case 層）

### 7.1 形狀

```ts
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { TestApp } from '../../support/TestApp'
import { scenario } from '../../support/scenarios'

describe('扣款至餘額耗盡 → 自動封鎖該 Org 所有 active Keys', () => {
  let app: TestApp
  beforeAll(async () => { app = await TestApp.boot() })
  afterAll(async () => { await app.shutdown() })
  beforeEach(async () => { await app.reset() })

  it('餘額 100 扣 100 後 key 被 suspend 且 Gateway rate limit 歸零', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '100' })
      .given.activeApiKey({
        orgId: 'org-1',
        keyId: 'key-1',
        gatewayKeyId: 'mock_vk_000001',
      })

      .when.userDeductsCredit({ orgId: 'org-1', amount: '100' })

      .then.creditBalanceIs('org-1', '0')
      .then.apiKeyIsSuspended('key-1', { reason: 'CREDIT_DEPLETED' })
      .then.gatewayKeyRateLimit('mock_vk_000001', { tokenMaxLimit: 0 })
      .then.domainEventsInclude('credit.balance_depleted')
      .run()
  })
})
```

### 7.2 三個 Namespace 的責任

| Namespace | 語意 | 實作原則 |
|-----------|------|---------|
| `given.*` | 建立前提 state（真實寫 DB） | 呼叫 Repository 或直接 insert；**不 overwrite**（重複呼叫拋錯） |
| `when.*` | 執行被測試的動作 | 呼叫真實 Application Service |
| `then.*` | 斷言結果（讀真實 state） | 查 DB 或 captured fakes |

### 7.3 DSL 約束

- 全部回傳 builder 自身（fluent chain）
- 最後必須 `.run()` 才執行；run 失敗時輸出整個 scenario 軌跡（所有 call + 實際 state）方便 debug
- 命名用**業務語言**（`activeApiKey`、`userDeductsCredit`），禁用技術語言（`creditAccountRepositorySave`）
- 每個 helper 一個小檔案，依模組分目錄（見 §7.4）

### 7.4 Helpers 目錄

```
support/scenarios/
├── index.ts              ← export scenario()
├── runner.ts             ← builder + .run() 實作
├── given/
│   ├── credit.ts
│   ├── apiKey.ts
│   └── organization.ts
├── when/
│   └── credit.ts
└── then/
    ├── credit.ts
    ├── apiKey.ts
    ├── gateway.ts
    └── events.ts
```

### 7.5 不使用 DSL 的場景

單步驟、純 Application Service 單點驗證允許直接 `it`：

```ts
it('充值金額為 0 應拒絕', async () => {
  const res = await app.container.get(TopUpCreditService).execute({
    orgId: 'org-1', amount: '0', callerUserId: 'admin-1', callerSystemRole: 'admin'
  })
  expect(res.success).toBe(false)
})
```

DSL 只用在「需要說故事」的場景（多步驟、跨模組、有時間順序）。

---

## 8. API Contract Acceptance（樸素 describe/it）

```ts
import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest'
import { TestApp } from '../support/TestApp'

describe('POST /api/credits/top-up', () => {
  let app: TestApp
  beforeAll(async () => { app = await TestApp.boot() })
  afterAll(async () => { await app.shutdown() })
  beforeEach(async () => { await app.reset() })

  it('admin 充值成功回 200 + 更新餘額', async () => {
    await app.seed.admin({ userId: 'admin-1' })
    await app.seed.organization({ id: 'org-1' })
    await app.seed.creditAccount({ orgId: 'org-1', balance: '0' })

    const res = await app.http.post('/api/credits/top-up', {
      body: { orgId: 'org-1', amount: '500' },
      auth: await app.auth.as('admin-1'),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      success: true,
      data: { balance: '500' },
    })
    expect(await app.db.getCreditBalance('org-1')).toBe('500')
  })

  it('非 admin 角色回 403', async () => { /* ... */ })
  it('缺欄位回 422 含 Zod error 細節', async () => { /* ... */ })
})
```

每 endpoint 至少三場景：
1. Happy path（正確 auth + 合法 body）
2. Auth 失敗 / 角色不符
3. Validation 失敗

---

## 9. Pilot 範圍：Credit 模組

### 9.1 Use Case Acceptance（9 個場景，集中於 6 支 spec 檔）

> 檔案對應：場景 1–3 共置於 `top-up-credit.spec.ts`；場景 4–5 共置於 `deduct-credit.spec.ts`；場景 6 獨立 `deduct-until-depleted.spec.ts`；場景 7 獨立 `credit-topped-up-restores-keys.spec.ts`；場景 8 獨立 `refund-credit.spec.ts`；場景 9 獨立 `apply-usage-charges.spec.ts`。

| # | 場景 | 跨模組 | 用 DSL？ | 需 TestClock |
|---|------|--------|---------|-------------|
| 1 | 成功充值 → 餘額更新 + 交易紀錄 | - | ✅ | - |
| 2 | 充值金額 ≤ 0 拒絕 | - | ❌ 單步驟 | - |
| 3 | 充值到不存在帳戶 → 自動建立 | - | ✅ | - |
| 4 | 成功扣款 | - | ✅ | - |
| 5 | 扣款超過餘額 → 拒絕，餘額不變 | - | ✅ | - |
| 6 | **扣款至 0 → 所有 active key suspend + Gateway rate limit 歸零** | Credit ↔ ApiKey | ✅ | - |
| 7 | **充值後 → 所有 suspended key reactivate** | Credit ↔ ApiKey | ✅ | - |
| 8 | 退款成功 → 餘額回填 + 交易紀錄反向 | - | ✅ | - |
| 9 | **ApplyUsageCharges：批次匯入用量 → 扣除 credit + 達閾值 suspend** | Credit ↔ ApiKey | ✅ | ✅ |

### 9.2 API Contract Acceptance（3 支 spec）

| Endpoint | 場景 A | 場景 B | 場景 C |
|----------|--------|--------|--------|
| `POST /api/credits/top-up` | admin 成功 200 | 非 admin 403 | 缺欄位 422 |
| `GET /api/credits/balance` | 200 + 正確 balance | 401 未認證 | 404 帳戶不存在 |
| `GET /api/credits/transactions` | 200 + 分頁 | 401 未認證 | query param 非法 422 |

### 9.3 既有測試處置（時機見 §13 PR-3）

- **刪除** `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts`（被 #6、#7 取代，寫法是反面教材）→ 在 PR-3 執行
- **保留**其餘 Credit `__tests__/*.test.ts`（Application Service 單元測試）暫不動；pilot 驗收後另評估去留

---

## 10. 推廣策略（pilot 後）

| 階段 | 模組 | 重點 | 需新 Port |
|------|------|------|----------|
| Pilot | **Credit** | 建立 harness + DSL | `IClock`、`ManualScheduler` |
| 階段 2 | Auth | JWT、device flow、密碼雜湊 | `IClock` 重用、可能 `IMailer` |
| 階段 3 | Organization | multi-member、invitation 信 | `IMailer` |
| 階段 4 | ApiKey | Gateway 交互邊界 | - |
| 階段 5 | Alerts | Webhook 外送 | `IWebhookDeliverer` |
| 階段 6 | Reports | 時間驅動批次任務 | `IClock`、`ManualScheduler` |

每階段獨立 PR；前後階段不互鎖。

---

## 11. 既有測試處置表

| 既有 | 處置 | 理由 |
|------|------|------|
| `src/**/__tests__/*.test.ts`（Domain 純邏輯） | **保留** | 純邏輯測試有價值、速度最快 |
| `src/Modules/Credit/__tests__/*.test.ts`（Application Service 單元） | **pilot 期保留；後續評估** | 看與 Acceptance 是否重疊 |
| `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts` | **刪除**（§13 PR-3 清理階段） | 被 pilot #6、#7 取代 |
| `tests/Unit/` | **保留** | Adapter / Foundation 低階測試 |
| `tests/Feature/api-*.e2e.ts`（OpenAPI） | **暫留，3 個月後評估** | 考慮用 OpenAPI 自動生成 API Contract spec 吸收 |
| `e2e/*.e2e.ts`（Playwright） | **瘦身**：HTTP-only 移往 API Contract；UI 保留 | Playwright 只留「需瀏覽器」場景 |

---

## 12. CI 整合

`package.json` 新增：

```json
{
  "scripts": {
    "test:acceptance": "vitest run tests/Acceptance",
    "test:acceptance:watch": "vitest tests/Acceptance",
    "check": "bun run typecheck && bun run lint && bun run test && bun run test:acceptance"
  }
}
```

CI workflow（若有）加入 `bun run test:acceptance` 作為必過關卡。

---

## 13. Deliverables

拆成三個 PR，降低 review 負擔：

### PR-1：Harness + Port 基礎建設
- `src/Shared/Application/Ports/IClock.ts`
- `src/Shared/Infrastructure/Services/SystemClock.ts`
- Credit ServiceProvider 注入 `IClock`
- `tests/Acceptance/support/TestApp.ts`
- `tests/Acceptance/support/TestClock.ts`
- `tests/Acceptance/support/fakes/ManualScheduler.ts`
- `tests/Acceptance/support/db/{migrate,truncate}.ts`
- `tests/Acceptance/support/scenarios/**`（runner + 空 given/when/then 骨架）
- `package.json`：`test:acceptance` script
- 1–2 支 smoke spec 驗 harness 本身

### PR-2：Pilot Specs
- `tests/Acceptance/UseCases/Credit/*.spec.ts`（9 支）
- `tests/Acceptance/ApiContract/credit-endpoints.spec.ts`（3 endpoint × 3 場景）
- 補齊 given/when/then helpers（credit、apiKey、organization、gateway、events）

### PR-3：清理 + 文件
- 刪除 `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts`
- `docs/draupnir/specs/5-testing-validation/acceptance-layer.md`（方法論 + 貢獻者指南）
- `check` 組合加入 `test:acceptance`
- CI workflow 更新

---

## 14. 風險與緩解

| 風險 | 緩解 |
|------|------|
| Drizzle migrations 在測試環境執行不穩 | PR-1 smoke spec 先確認；SQLite 若有 pragma 差異於 harness 初始化時統一設定 |
| `IClock` 引入造成 Credit 現有單元測試失敗 | Credit 單元測試中 `ApplyUsageChargesService` 注入位置需同步更新；PR-1 一起改 |
| DSL 冗長、反而難讀 | 單步驟場景不強制用 DSL；helper 粒度以「業務動詞」為準，不過度細分 |
| Per-test truncate 不夠乾淨（如 `sqlite_sequence` / FK 順序） | 明確列出 truncate 順序；FK 改 `PRAGMA foreign_keys=OFF` 再 truncate 再 ON |
| Credit 模組實際沒有 `IClock` 需求 | PR-1 驗證；若確認不需要，pilot #9 改用「先 seed 好 usage records」替代需要控制時間的場景 |

---

## 15. 開放問題（後續 implementation plan 再處理）

- `:memory:` SQLite 還是 tmp file？→ benchmark 決定
- `DomainEventDispatcher` 的 observer 如何注入？→ 既有 singleton 需要支援 `addObserver` 或改走 container-managed
- `app.http` in-process 實作方式：直接呼叫 Gravito app 的 listener function 還是包一個 test-only server？→ 看 `@gravito/photon` / `@gravito/core` 提供的 API
- Auth token 產生方式：直接呼叫 JWT service 還是經 login endpoint？→ 效率考量直接呼叫 JWT service，headers 手動組

---

## 16. 下一步

1. Commit 本 design doc
2. User review
3. 通過後進入 writing-plans skill 產出 PR-1 implementation plan
