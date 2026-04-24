# 驗收測試層（Acceptance Layer）

> 目的：把單元測試與 Playwright E2E 之間的空白補起來，讓業務情境以真實 DI、真實 SQLite、真實 DomainEventDispatcher 來驗證。

這份文件是 PR-1 / PR-2 / PR-3 的整體方法論整理：

- PR-1 建立 harness 與 `IClock`
- PR-2 寫出 Credit pilot 的 Use Case / API Contract specs
- PR-3 收尾清理、文件化、把 acceptance 納入日常 `check` 與 CI

如果你要新增 Auth、Organization、ApiKey、Alerts、Reports 的 acceptance，先讀這份。

---

## 1. 為什麼需要 Acceptance Layer

單元測試很快，但太容易把真實 wiring 拆掉；E2E 很真實，但成本高、適合做少量關鍵路徑。

Acceptance Layer 的定位是中間層：

- 用真實容器啟動應用
- 用真實 SQLite tmp file 跑 migrations
- 用真實 DomainEventDispatcher 觀察跨模組事件
- 把外部 port（clock / gateway / scheduler / queue）保留為可注入 fake

它解決的是這些問題：

- DI 綁定壞掉，單元測試看不出來
- repository / service wiring 漏註冊，單元測試看不出來
- saga / event handler 順序錯了，單元測試看不出來
- 只靠 E2E 才驗證會太慢、太脆

核心原則只有一句：

> Domain / Repository / Event dispatcher 不 mock；外部 port 可以 rebind。

---

## 2. 這層測什麼，不測什麼

### 會測

- 主要 user story 的業務情境
- 跨模組流程
- 真實 DB state
- 真實事件發佈與事件處理
- API contract 的 happy path / auth 失敗 / validation 失敗

### 不測

- 低階 ORM 內部細節
- repository mock 的互動次數
- controller 內部 private 實作
- 瀏覽器行為

### 分層邊界

| 層級 | 典型位置 | 用途 |
|------|----------|------|
| 單元測試 | `src/**/__tests__/*.test.ts` | Domain / Application 純邏輯 |
| Acceptance Use Case | `tests/Acceptance/UseCases/<Module>/*.spec.ts` | 業務故事、跨模組 saga |
| Acceptance API Contract | `tests/Acceptance/ApiContract/*.spec.ts` | in-process HTTP 契約驗證 |
| E2E UI | `e2e/*.e2e.ts` | 只有真的需要瀏覽器才留在這裡 |

---

## 3. Harness 長什麼樣子

`tests/Acceptance/support/TestApp.ts` 是入口。

它會：

- 建立 per-worker SQLite tmp db
- 跑 acceptance migrations
- bootstrap 真實 app
- 重綁 `clock`、`llmGatewayClient`、`scheduler`、`queue`
- 收集 `DomainEventDispatcher` 的事件到 `app.events`
- 提供 `app.seed.*` 做資料準備
- 提供 `app.http` 做 in-process HTTP 呼叫
- 提供 `app.auth` 做 token / role helper

常見成員：

```ts
const app = await TestApp.boot()

await app.seed.organization({ id: 'org-1' })
await app.seed.user({ id: 'admin-1', role: 'admin' })
await app.seed.creditAccount({ orgId: 'org-1', balance: '100' })

const res = await app.http.post('/api/organizations/org-1/credits/topup', {
  body: { amount: '500' },
  auth: await app.auth.tokenFor({ userId: 'admin-1', role: 'admin' }),
})

expect(res.status).toBe(200)
await app.shutdown()
```

`TestApp` 的 reset 與 shutdown 一定要做：

```ts
beforeAll(async () => {
  app = await TestApp.boot()
})

afterAll(async () => {
  await app.shutdown()
})

beforeEach(async () => {
  await app.reset()
})
```

---

## 4. Use Case specs 的寫法

Use Case spec 用在「一個業務情境，跨多個 service / event / repository」的地方。

### 4.1 標準骨架

```ts
describe('Use Case: 扣款至餘額耗盡 → 自動封鎖所有 active keys', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await TestApp.boot()
  })

  afterAll(async () => {
    await app.shutdown()
  })

  beforeEach(async () => {
    await app.reset()
  })

  it('#6 餘額 100 扣 100 → 兩支 active key 均 suspend', async () => {
    // given / when / then
  })
})
```

### 4.2 什麼時候用 DSL

當故事有明確順序、跨模組、需要重複使用時，用 `given / when / then` DSL。

典型 helper 形式：

- `given.organization(...)`
- `given.activeApiKey(...)`
- `when.userDeductsCredit(...)`
- `when.userTopsUpCredit(...)`
- `then.apiKeyIsSuspended(...)`
- `then.gatewayKeyRateLimit(...)`

### 4.3 什麼時候不要硬抽 DSL

如果只有一支 spec 會用，直接在 `it` 裡 seed + 呼叫即可。
不要為了「看起來很整齊」硬造新的抽象。

### 4.4 一個真實例子

```ts
it('#6 餘額 100 扣 100 → 兩支 active key 均 suspend, Gateway rate limit 歸零', async () => {
  const org = await app.seed.organization({ id: 'org-1' })
  const [key1, key2] = await Promise.all([
    app.seed.activeApiKey({ orgId: org.id, label: 'key-1' }),
    app.seed.activeApiKey({ orgId: org.id, label: 'key-2' }),
  ])
  await app.seed.creditAccount({ orgId: org.id, balance: '100' })

  await app.when.userDeductsCredit({ orgId: org.id, amount: '100' })

  await app.then.apiKeyIsSuspended(key1.id)
  await app.then.apiKeyIsSuspended(key2.id)
  await app.then.gatewayKeyRateLimit(key1.gatewayKeyId, { tokenMaxLimit: 0, requestMaxLimit: 0 })
})
```

---

## 5. API Contract acceptance 的寫法

API Contract acceptance 只做三件事：

1. happy path
2. auth 失敗
3. validation 失敗

它比較樸素，重點是把真實 HTTP 與真實 DI wiring 串起來。

```ts
describe('POST /api/organizations/:orgId/credits/topup', () => {
  let app: TestApp

  beforeAll(async () => {
    app = await TestApp.boot()
  })

  afterAll(async () => {
    await app.shutdown()
  })

  beforeEach(async () => {
    await app.reset()
  })

  it('admin 充值 → 200 + 更新餘額', async () => {
    await app.seed.user({ id: 'admin-1', role: 'admin' })
    await app.seed.organization({ id: 'org-1' })
    await app.seed.creditAccount({ orgId: 'org-1', balance: '0' })

    const res = await app.http.post('/api/organizations/org-1/credits/topup', {
      body: { amount: '500' },
      auth: await app.auth.tokenFor({ userId: 'admin-1', role: 'admin' }),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      success: true,
      data: { balance: '500' },
    })
  })

  it('非 admin 角色 → 403', async () => {
    // ...
  })

  it('缺欄位 → 422', async () => {
    // ...
  })
})
```

---

## 6. 新增一支 spec 的 step-by-step

當你要為新模組開 acceptance spec，照這個順序走。

1. **挑檔名**
   - 用業務語言，不要用 service class 名稱。
   - 例：`tests/Acceptance/UseCases/Auth/device-login-success.spec.ts`
2. **決定是否需要 DSL**
   - 多步驟、跨模組、會重複的就抽。
   - 只用一次的 seed 直接寫在 spec。
3. **先列 given**
   - 需要的 user / org / key / contract / data。
   - 能用 `app.seed.*` 就先用。
4. **再寫 when**
   - 行為的主角應該封進 `when.*`。
   - 例如 `when.userLogsIn`、`when.userAdjustsQuota`
5. **最後寫 then**
   - 優先讀真實 DB。
   - 需要跨模組結果時，再讀 `app.events`。
6. **跑 acceptance**
   - `bun run test:acceptance`
   - 不過就先修 helper，再修 spec
7. **如果動了 helper**
   - 補 helper 自己的 round-trip 測試

### 檢核清單

- [ ] 檔名是業務語言
- [ ] `beforeEach` 有 `app.reset()`
- [ ] 沒有 `vi.fn()`
- [ ] 沒有 mock repository / application service
- [ ] 事件是讀 `app.events[]`
- [ ] 時間控制用 `app.clock`
- [ ] 不重複塞整段 seed 片段

---

## 7. FAQ

### Q1：為什麼用 SQLite tmp file，不直接用 Postgres？

Acceptance 的目標是「真實 DB 與真實 migrations」，不是「特定資料庫特性測試」。
SQLite tmp file 啟動快、成本低，足以驗證 wiring 與 saga。
Postgres 留給需要它的 job。

### Q2：為什麼不用 fake timers？

fake timers 很容易跟 HTTP、migration、driver 行為打架。
要控時間就注入 `IClock`，用 `TestClock`。

### Q3：會不會慢到不可用？

Credit pilot 的經驗是可用的。
只要維持「每個 user story 一檔」的粒度，通常還在可接受範圍。

### Q4：`app.lastResult` 是做什麼的？

它是幫 `when` 與 `then` 傳遞最近一次 application result 的暫存。
適合拿來做跨步驟比對，不用每個 helper 自己維護狀態。

### Q5：哪一層該留，哪一層該移走？

- Domain 純邏輯：保留在 `src/**/__tests__`
- Acceptance Use Case：保留
- Acceptance API Contract：保留
- 舊的手工 integration test：如果被 acceptance 完整取代，就刪
- Playwright E2E：只保留真的需要瀏覽器的場景

---

## 8. 實作對照與命名習慣

### 8.1 給其他模組的命名慣例

| 類型 | 建議命名 |
|------|----------|
| Use Case spec | `tests/Acceptance/UseCases/<Module>/<story>.spec.ts` |
| API Contract spec | `tests/Acceptance/ApiContract/<resource>.spec.ts` |
| DSL helper | `tests/Acceptance/support/scenarios/{given,when,then}/...` |
| Harness helper | `tests/Acceptance/support/...` |

### 8.2 路線切分

- **Use Case**：故事本體，偏 saga / workflow
- **API Contract**：HTTP 邊界與 schema
- **support**：提供 seed、fake、runner、測試 client

### 8.3 什麼時候升級成新 helper

只有當下列條件同時成立才抽：

- 已經重複兩次以上
- 名稱可以跨模組復用
- 抽出去後會讓 spec 更清楚

不要為了抽象而抽象。

---

## 9. 推廣路線

目前 Credit pilot 已完成，後續模組的推廣順序建議如下：

1. Auth
2. Organization
3. ApiKey
4. Alerts
5. Reports

每一階段都獨立開 PR。
先把 harness 與實作 pattern 搞穩，再把業務故事一個個搬進來。

---

**最後更新**：2026-04-25
