# DDD 驗收測試 PR-2（Credit Pilot Specs + DSL Helpers）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 PR-1 已建立的 acceptance harness 之上,補齊 `app.http` / `app.auth` / `app.seed`、業務語言 given/when/then helpers,並撰寫 9 支 Credit Use Case specs(集中於 6 個 spec 檔)+ 1 支 Credit API Contract spec(3 endpoints × 3 場景),覆蓋 spec §9 Pilot 範圍。

**Architecture:**
- `app.http`:in-process HTTP — 透過 `core.liftoff(0).fetch(request)` 用同一個 container 直接打 Request → Response,不需要實際 `Bun.serve`。
- `app.auth`:直接呼叫容器內的 `jwtTokenService` 簽發 access token,避免走 login endpoint 的雜訊。
- `app.seed`:低階種子函式(raw `db.table(...).insert(...)`),共用給 given.* 與 API Contract 兩層。
- `ScenarioRunner` 的 `given` / `when` / `then` 改成在 constructor 內掛入 typed namespace;每支 helper 為一個小檔案,pure function 形式 `(builder, args) => builder` — 內部 `__pushStep` 並回傳 builder。
- Spec 檔放在 `tests/Acceptance/UseCases/Credit/` 與 `tests/Acceptance/ApiContract/`,沿用 PR-1 的 `bun test` runner(spec 檔仍從 `vitest` import API,bun:test runtime drop-in 相容)。

**Tech Stack:** TypeScript 5.x / Bun runtime(`bun test`)/ vitest API(drop-in via bun:test)/ Atlas + libsql SQLite / `@gravito/core` `PlanetCore.liftoff()` / 既有 `MockGatewayClient` / 既有 `JwtTokenService`。

---

## 範圍確認(Scope Note)

本計畫實作 spec §13 的 **PR-2**。「不在 PR-2」清單:
- 刪除 `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts`、新增 `docs/draupnir/specs/5-testing-validation/acceptance-layer.md`、CI workflow、把 `test:acceptance` 加進 `check` script — 全部歸 PR-3。
- pilot 推廣到其他模組(Auth / Organization / Alerts 等)— spec §10 後續階段。

PR-1 已交付物(**不在本計畫修改**):`IClock` / `SystemClock` / `TestClock` / `DomainEventDispatcher` observer API / `bootstrap.ts.afterRegister` / `CreditServiceProvider` 註冊 `clock` / `TestApp.boot/reset/shutdown` 骨架 / `ManualScheduler` / `ManualQueue` / `db/{migrate,truncate,tables}.ts` / scenarios runner 骨架(空 g/w/t)/ `package.json` 的 `test:acceptance`。

---

## 與 spec §9.2 API Contract 場景的對齊修正

Spec §9.2 描述的若干場景與實際實作有出入,本計畫以實際行為為準:

| Endpoint | 實際 path(credit.routes.ts) | 場景 A | 場景 B | 場景 C |
|----------|------------------------------|--------|--------|--------|
| `POST /api/organizations/:orgId/credits/topup` | 既有 | admin → 200 + 餘額更新 | 非 admin(user)→ 403 + FORBIDDEN | 缺欄位(無 amount)→ 422 + Zod 細節 |
| `GET /api/organizations/:orgId/credits/balance` | 既有 | 組織成員 → 200 + 正確 balance | 未認證 → 401 + UNAUTHORIZED | 非組織成員 → 200 + `success:false` + `NOT_ORG_MEMBER`(取代 spec 寫的 404 — `GetBalanceService` 對不存在帳戶會回 default zeros,不會 404) |
| `GET /api/organizations/:orgId/credits/transactions` | 既有 | 成員 → 200 + 分頁 | 未認證 → 401 | 非組織成員 → 200 + `NOT_ORG_MEMBER`(取代 spec 寫的 422 — controller 對 page/limit 用 `parseInt` 寬鬆解析,無 Zod 驗證) |

scenario 9(ApplyUsageCharges)在 PR-1 已驗證**不需要** `IClock` 注入(service 不依賴目前時間)— 改用「先 seed 好 usage_records 並指定 occurred_at」的策略。`TestClock` 在 PR-2 暫不被任何 spec 使用(仍保留供未來模組)。

---

## File Structure

### 修改檔案

| Path | 修改內容 |
|------|---------|
| `tests/Acceptance/support/TestApp.ts` | 新增 `http: InProcessHttpClient`、`auth: TestAuth`、`seed: TestSeed`、`lastResult: LastResultStore` 四個欄位;boot 時建立、reset 時清 lastResult、shutdown 時釋放。 |
| `tests/Acceptance/support/scenarios/runner.ts` | `given`/`when`/`then` 從 `Record<string, never>` 改為強型別 namespace;於 constructor 內注入。 |
| `tests/Acceptance/support/scenarios/index.ts` | 順便 re-export namespace 型別。 |
| `tests/Acceptance/support/scenarios/given/index.ts` | re-export & assemble `defineGiven(builder)` |
| `tests/Acceptance/support/scenarios/when/index.ts` | 同上 `defineWhen(builder)` |
| `tests/Acceptance/support/scenarios/then/index.ts` | 同上 `defineThen(builder)` |

### 新檔案 — Harness 擴充

| Path | 責任 |
|------|------|
| `tests/Acceptance/support/lastResult.ts` | `LastResultStore` — when.* 寫入、then.* 讀取的型別化暫存。 |
| `tests/Acceptance/support/http/InProcessHttpClient.ts` | `app.http` — wrap `core.liftoff(0).fetch(req)`,提供 `get/post/patch/delete(path, { body?, auth?, headers? })`。 |
| `tests/Acceptance/support/http/TestAuth.ts` | `app.auth` — `tokenFor({ userId, email, role, permissions? })` 直接呼叫容器 `jwtTokenService.signAccessToken(...)`. 也提供 `bearerHeaderFor(args)`。 |
| `tests/Acceptance/support/seeds/index.ts` | `TestSeed` class — 集中 `user/organization/orgMember/creditAccount/apiKey/appModule/moduleSubscription/usageRecord` 8 個 seed 方法。 |
| `tests/Acceptance/support/seeds/user.ts` | `seedUser(db, props)` — raw insert into `users`。 |
| `tests/Acceptance/support/seeds/organization.ts` | `seedOrganization(db, props)` — insert into `organizations`,`slug` 預設帶 random 後綴。 |
| `tests/Acceptance/support/seeds/orgMember.ts` | `seedOrgMember(db, props)` — insert into `organization_members`。 |
| `tests/Acceptance/support/seeds/creditAccount.ts` | `seedCreditAccount(db, props)` — insert into `credit_accounts`。 |
| `tests/Acceptance/support/seeds/apiKey.ts` | `seedApiKey(db, gateway, props)` — insert into `api_keys` 並(若需要)呼叫 `gateway.createKey(...)` 取得 `gatewayKeyId`。 |
| `tests/Acceptance/support/seeds/appModule.ts` | `seedAppModule(db, props)` 與 `seedAllCoreAppModules(db)` shortcut。 |
| `tests/Acceptance/support/seeds/moduleSubscription.ts` | `seedModuleSubscription(db, props)`。 |
| `tests/Acceptance/support/seeds/usageRecord.ts` | `seedUsageRecord(db, props)`。 |
| `tests/Acceptance/support/__tests__/seeds.test.ts` | 驗證 8 個 seed 函式 round-trip 正確(每個 seed → DB row 存在)。 |
| `tests/Acceptance/support/__tests__/InProcessHttpClient.test.ts` | 透過 `/health` 已存在的 endpoint 驗證 `app.http.get('/health')` 回 200。 |
| `tests/Acceptance/support/__tests__/TestAuth.test.ts` | 簽出 token → 用 `jwtTokenService.verify` 確認 payload。 |

### 新檔案 — Scenarios DSL Helpers

| Path | 責任 |
|------|------|
| `tests/Acceptance/support/scenarios/given/organization.ts` | `(builder, id, opts?)` 種一個 organization。 |
| `tests/Acceptance/support/scenarios/given/admin.ts` | `(builder, opts?)` 種一個 system admin user。 |
| `tests/Acceptance/support/scenarios/given/member.ts` | `(builder, opts)` 種一個 user 並 join 指定 org(role 預設 `member`)。 |
| `tests/Acceptance/support/scenarios/given/creditAccount.ts` | `(builder, opts)` 種一個 credit_account。 |
| `tests/Acceptance/support/scenarios/given/activeApiKey.ts` | `(builder, opts)` 先 `app.gateway.createKey(...)` 取得 gatewayKeyId、再 seed `api_keys` row 為 `active`。 |
| `tests/Acceptance/support/scenarios/given/suspendedApiKey.ts` | `(builder, opts)` 同上但 status `suspended_no_credit` 並寫入 `pre_freeze_rate_limit`。 |
| `tests/Acceptance/support/scenarios/given/coreAppModulesProvisioned.ts` | `(builder, orgId)` 種四個 core modules 並把 orgId 訂閱完整(避免 `ModuleAccessMiddleware` 擋 user role 的請求)。 |
| `tests/Acceptance/support/scenarios/given/usageRecords.ts` | `(builder, opts)` 種多筆 usage_records(用於 #9)。 |
| `tests/Acceptance/support/scenarios/when/userTopsUpCredit.ts` | `(builder, opts)` 從 container 取 `topUpCreditService`,呼叫 `.execute(...)`,把 result 存到 `app.lastResult`。 |
| `tests/Acceptance/support/scenarios/when/userDeductsCredit.ts` | 同上 → `deductCreditService`。 |
| `tests/Acceptance/support/scenarios/when/userRefundsCredit.ts` | 同上 → `refundCreditService`。 |
| `tests/Acceptance/support/scenarios/when/applyUsageCharges.ts` | 同上 → `applyUsageChargesService`。 |
| `tests/Acceptance/support/scenarios/then/creditBalanceIs.ts` | 讀 `credit_accounts` 比對 balance。 |
| `tests/Acceptance/support/scenarios/then/creditTransactionExists.ts` | 讀 `credit_transactions` 用 `accountId` + 篩選條件。 |
| `tests/Acceptance/support/scenarios/then/apiKeyIsSuspended.ts` | 讀 `api_keys` row → status === `suspended_no_credit` 且 `suspension_reason` match。 |
| `tests/Acceptance/support/scenarios/then/apiKeyIsActive.ts` | 同上但 status === `active`。 |
| `tests/Acceptance/support/scenarios/then/gatewayKeyRateLimit.ts` | 讀 `app.gateway.calls.updateKey` 對指定 keyId 的最後一次 call。 |
| `tests/Acceptance/support/scenarios/then/domainEventsInclude.ts` | 讀 `app.events`,逐個檢查 eventType +(optional)partial data match。 |
| `tests/Acceptance/support/scenarios/__tests__/given.test.ts` | given.* helpers 的整合驗證。 |
| `tests/Acceptance/support/scenarios/__tests__/when.test.ts` | when.* helpers 的整合驗證。 |
| `tests/Acceptance/support/scenarios/__tests__/then.test.ts` | then.* helpers 的整合驗證。 |

### 新檔案 — Spec Files

| Path | 場景 |
|------|------|
| `tests/Acceptance/UseCases/Credit/top-up-credit.spec.ts` | #1 充值成功 / #2 金額 ≤ 0 拒絕 / #3 充值到不存在帳戶 → 自動建立 |
| `tests/Acceptance/UseCases/Credit/deduct-credit.spec.ts` | #4 成功扣款 / #5 扣超過餘額拒絕 |
| `tests/Acceptance/UseCases/Credit/deduct-until-depleted.spec.ts` | #6 扣到 0 → suspend keys + gateway rate limit 歸零 |
| `tests/Acceptance/UseCases/Credit/credit-topped-up-restores-keys.spec.ts` | #7 充值後 → reactivate suspended keys |
| `tests/Acceptance/UseCases/Credit/refund-credit.spec.ts` | #8 退款 → 餘額回填 + 反向交易 |
| `tests/Acceptance/UseCases/Credit/apply-usage-charges.spec.ts` | #9 批次 ApplyUsageCharges → 扣 credit、達閾值 suspend keys |
| `tests/Acceptance/ApiContract/credit-endpoints.spec.ts` | 3 endpoints × 3 scenarios = 9 it()s |

---

## Task 1: 新增 `lastResult` 暫存器

**Files:**
- Create: `tests/Acceptance/support/lastResult.ts`

**為何:** when.* 助手呼叫 service 後拿到 result(如 TopUpResponse),then.* 助手經常需要讀(如要拿 transactionId 比對)。把它型別化暫存到 `app.lastResult`,避免到處傳遞。

- [ ] **Step 1: 新建檔**

```typescript
// tests/Acceptance/support/lastResult.ts

/**
 * Tagged container for the most recent service result captured by a `when.*`
 * helper. `then.*` helpers can read this without scenarios needing to thread
 * the value through chain methods.
 *
 * The shape is intentionally generic: the test author casts at the read site.
 */
export interface LastResultStore {
  readonly value: unknown
  /** Read with a runtime-narrowed type. Throws if no result has been recorded. */
  expect<T>(): T
  /** Replace the stored value (used by when.* helpers). */
  set(value: unknown): void
  /** Clear (called by reset). */
  clear(): void
}

export function createLastResultStore(): LastResultStore {
  let stored: unknown = undefined
  return {
    get value() {
      return stored
    },
    expect<T>(): T {
      if (stored === undefined) {
        throw new Error('lastResult: no result captured. Did a when.* helper run before this then.*?')
      }
      return stored as T
    },
    set(value: unknown) {
      stored = value
    },
    clear() {
      stored = undefined
    },
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add tests/Acceptance/support/lastResult.ts
git commit -m "feat: [acceptance] 新增 lastResult 暫存器供 when/then 共享 service result"
```

---

## Task 2: 新增 `TestAuth`(JWT helper)

**Files:**
- Create: `tests/Acceptance/support/http/TestAuth.ts`
- Test: `tests/Acceptance/support/__tests__/TestAuth.test.ts`
- Modify: `tests/Acceptance/support/TestApp.ts`

**說明:** 直接從 container 取 `jwtTokenService`(已由 `AuthServiceProvider` 註冊)簽 access token。避免走 login endpoint 的雜訊。

- [ ] **Step 1: 寫 failing test**

File: `tests/Acceptance/support/__tests__/TestAuth.test.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../TestApp'

describe('TestAuth', () => {
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

  it('tokenFor 簽出可被 jwtTokenService.verify 還原的 access token', () => {
    const token = app.auth.tokenFor({
      userId: 'user-1',
      email: 'user-1@example.com',
      role: 'user',
    })

    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(20)

    const jwt = app.container.make('jwtTokenService') as {
      verify(t: string): { userId: string; role: string; email: string } | null
    }
    const payload = jwt.verify(token)
    expect(payload).not.toBeNull()
    expect(payload?.userId).toBe('user-1')
    expect(payload?.role).toBe('user')
    expect(payload?.email).toBe('user-1@example.com')
  })

  it('bearerHeaderFor 回傳 { Authorization: "Bearer <token>" }', () => {
    const headers = app.auth.bearerHeaderFor({
      userId: 'user-2',
      email: 'u2@example.com',
      role: 'admin',
    })
    expect(headers.Authorization).toMatch(/^Bearer .+/)
  })

  it('permissions 預設為 [],可由參數覆寫', () => {
    const jwt = app.container.make('jwtTokenService') as {
      verify(t: string): { permissions: string[] } | null
    }

    const tokenA = app.auth.tokenFor({ userId: 'a', email: 'a@e.com', role: 'user' })
    expect(jwt.verify(tokenA)?.permissions).toEqual([])

    const tokenB = app.auth.tokenFor({
      userId: 'b',
      email: 'b@e.com',
      role: 'user',
      permissions: ['credit.read'],
    })
    expect(jwt.verify(tokenB)?.permissions).toEqual(['credit.read'])
  })
})
```

- [ ] **Step 2: Run — verify failure**

Run: `bun test tests/Acceptance/support/__tests__/TestAuth.test.ts`
Expected: FAIL(`app.auth` undefined)

- [ ] **Step 3: 建立 TestAuth**

File: `tests/Acceptance/support/http/TestAuth.ts`

```typescript
import type { IJwtTokenService } from '@/Modules/Auth/Application/Ports/IJwtTokenService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'

export interface TokenForArgs {
  readonly userId: string
  readonly email: string
  readonly role: string
  readonly permissions?: readonly string[]
}

/**
 * Test helper for issuing JWTs against the booted container's JwtTokenService.
 * Bypasses the login endpoint to avoid coupling auth setup to user-table seeding.
 */
export class TestAuth {
  constructor(private readonly container: IContainer) {}

  tokenFor(args: TokenForArgs): string {
    const jwt = this.container.make('jwtTokenService') as IJwtTokenService
    const token = jwt.signAccessToken({
      userId: args.userId,
      email: args.email,
      role: args.role,
      permissions: [...(args.permissions ?? [])],
    })
    return token.value
  }

  bearerHeaderFor(args: TokenForArgs): { Authorization: string } {
    return { Authorization: `Bearer ${this.tokenFor(args)}` }
  }
}
```

**注意:** `AuthToken` value object 的 raw token getter 在 `src/Modules/Auth/Domain/ValueObjects/AuthToken.ts`;如真實 accessor 名稱不是 `value`,請依該檔調整(read 該檔確認 — JwtTokenService 回傳 `new AuthToken(token, ...)` 第一個參數就是 raw string)。

- [ ] **Step 4: 在 TestApp 接 wire**

File: `tests/Acceptance/support/TestApp.ts`(修改)

於 import 區下方加入:

```typescript
import { TestAuth } from './http/TestAuth'
```

於 class 欄位加入:

```typescript
  readonly auth: TestAuth
```

於 `private constructor` 參數與賦值加入 `auth: TestAuth`:

```typescript
  private constructor(params: {
    // ...既有...
    auth: TestAuth
  }) {
    // ...既有...
    this.auth = params.auth
  }
```

於 `boot()` 末段(建立 events / unsubscribeObserver 之後、`return new TestApp(...)` 之前)加入:

```typescript
    const auth = new TestAuth(container)
```

並在 `return new TestApp({ ... })` 物件 literal 加入 `auth`。

- [ ] **Step 5: Run test — verify it passes**

Run: `bun test tests/Acceptance/support/__tests__/TestAuth.test.ts`
Expected: PASS(3 tests)

- [ ] **Step 6: Commit**

```bash
git add tests/Acceptance/support/http/TestAuth.ts tests/Acceptance/support/__tests__/TestAuth.test.ts tests/Acceptance/support/TestApp.ts
git commit -m "feat: [acceptance] 新增 TestAuth 與 TestApp.auth 整合"
```

---

## Task 3: 新增 `InProcessHttpClient`(app.http)

**Files:**
- Create: `tests/Acceptance/support/http/InProcessHttpClient.ts`
- Test: `tests/Acceptance/support/__tests__/InProcessHttpClient.test.ts`
- Modify: `tests/Acceptance/support/TestApp.ts`

**說明:** `PlanetCore.liftoff(0)` 回傳 `{ port, fetch, core, websocket? }`,其中 `fetch(request)` 接 `Request` 回 `Response`,無需實際 `Bun.serve`。本 helper 包成 method-style API。

- [ ] **Step 1: 寫 failing test**

File: `tests/Acceptance/support/__tests__/InProcessHttpClient.test.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../TestApp'

describe('InProcessHttpClient', () => {
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

  it('GET /health 回 200', async () => {
    const res = await app.http.get('/health')
    expect(res.status).toBe(200)
  })

  it('未認證 POST → 401 + UNAUTHORIZED', async () => {
    const res = await app.http.post('/api/organizations/org-x/credits/topup', {
      body: { amount: '100' },
    })
    expect(res.status).toBe(401)
    const json = (await res.json()) as { error?: string }
    expect(json.error).toBe('UNAUTHORIZED')
  })

  it('帶 admin Authorization header 通過 auth + role middleware', async () => {
    const headers = app.auth.bearerHeaderFor({
      userId: 'admin-1',
      email: 'admin@e.com',
      role: 'admin',
    })
    const res = await app.http.post('/api/organizations/org-x/credits/topup', {
      body: { amount: '100' },
      headers,
    })
    // admin 通過 auth + role;ModuleAccess 對 admin 直接放行 →
    // TopUpCreditService 對不存在的 account 會自動建立 → 預期 200。
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run — verify failure**

Run: `bun test tests/Acceptance/support/__tests__/InProcessHttpClient.test.ts`
Expected: FAIL(`app.http` undefined)

- [ ] **Step 3: 建立 InProcessHttpClient**

File: `tests/Acceptance/support/http/InProcessHttpClient.ts`

```typescript
import type { PlanetCore } from '@gravito/core'

export interface RequestOptions {
  readonly body?: unknown
  readonly headers?: Readonly<Record<string, string>>
  readonly query?: Readonly<Record<string, string | number | boolean>>
}

type FetchHandler = (request: Request) => Response | Promise<Response>

const BASE_URL = 'http://acceptance.test'

/**
 * In-process HTTP client.
 *
 * Wraps PlanetCore.liftoff(0).fetch — the same handler Bun.serve would call —
 * so requests traverse the real middleware stack (AuthMiddleware, ModuleAccess,
 * Zod validation, controllers) without any TCP listener.
 */
export class InProcessHttpClient {
  private readonly fetch: FetchHandler

  constructor(core: PlanetCore) {
    const lift = core.liftoff(0)
    this.fetch = lift.fetch
  }

  get(path: string, options?: RequestOptions): Promise<Response> {
    return this.send('GET', path, options)
  }

  post(path: string, options?: RequestOptions): Promise<Response> {
    return this.send('POST', path, options)
  }

  patch(path: string, options?: RequestOptions): Promise<Response> {
    return this.send('PATCH', path, options)
  }

  delete(path: string, options?: RequestOptions): Promise<Response> {
    return this.send('DELETE', path, options)
  }

  private async send(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<Response> {
    const url = this.buildUrl(path, options.query)
    const headers: Record<string, string> = { ...(options.headers ?? {}) }
    let body: BodyInit | undefined

    if (options.body !== undefined) {
      headers['content-type'] ??= 'application/json'
      body = JSON.stringify(options.body)
    }

    const request = new Request(url, { method, headers, body })
    return Promise.resolve(this.fetch(request))
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(path, BASE_URL)
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        url.searchParams.set(k, String(v))
      }
    }
    return url.toString()
  }
}
```

- [ ] **Step 4: 在 TestApp 接 wire**

File: `tests/Acceptance/support/TestApp.ts`(修改)

import 加入:

```typescript
import { InProcessHttpClient } from './http/InProcessHttpClient'
```

class 欄位加入 `readonly http: InProcessHttpClient`,constructor 接收 `http`,於 `boot()` 末段在建立 `auth` 之後加:

```typescript
    const http = new InProcessHttpClient(core)
```

`return new TestApp({ ... })` 加入 `http`。

- [ ] **Step 5: Run test — verify it passes**

Run: `bun test tests/Acceptance/support/__tests__/InProcessHttpClient.test.ts`
Expected: PASS(3 tests)

如「Authorization → 200」失敗:
1. 看 `ModuleAccessMiddleware.ts`,admin 應有 `if (auth.role === 'admin') return next()` 短路。
2. TopUp service 內 `try` 包覆,DB 寫入失敗會回 `success:false` 但 status 為 400 — 確認 reset 後 DB 乾淨;orgId 不存在不影響 TopUp 因為 service 會自動建立 account。

- [ ] **Step 6: Commit**

```bash
git add tests/Acceptance/support/http/InProcessHttpClient.ts tests/Acceptance/support/__tests__/InProcessHttpClient.test.ts tests/Acceptance/support/TestApp.ts
git commit -m "feat: [acceptance] 新增 InProcessHttpClient 與 TestApp.http 整合"
```

---

## Task 4: 新增 8 個 seed primitives 與 TestApp.seed 整合

**Files:**
- Create: `tests/Acceptance/support/seeds/user.ts`
- Create: `tests/Acceptance/support/seeds/organization.ts`
- Create: `tests/Acceptance/support/seeds/orgMember.ts`
- Create: `tests/Acceptance/support/seeds/creditAccount.ts`
- Create: `tests/Acceptance/support/seeds/apiKey.ts`
- Create: `tests/Acceptance/support/seeds/appModule.ts`
- Create: `tests/Acceptance/support/seeds/moduleSubscription.ts`
- Create: `tests/Acceptance/support/seeds/usageRecord.ts`
- Create: `tests/Acceptance/support/seeds/index.ts`
- Test: `tests/Acceptance/support/__tests__/seeds.test.ts`
- Modify: `tests/Acceptance/support/TestApp.ts`

- [ ] **Step 1: 寫 failing test**

File: `tests/Acceptance/support/__tests__/seeds.test.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../TestApp'

describe('seeds — round-trip', () => {
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

  it('user', async () => {
    const u = await app.seed.user({ id: 'u-1', email: 'u1@e.com', role: 'user' })
    expect(u.id).toBe('u-1')
    const row = await app.db.table('users').where('id', '=', 'u-1').first()
    expect(row).toBeTruthy()
    expect((row as { email: string }).email).toBe('u1@e.com')
  })

  it('organization (slug 自動唯一化)', async () => {
    const org = await app.seed.organization({ id: 'org-1', name: 'Acme' })
    expect(org.id).toBe('org-1')
    expect(typeof org.slug).toBe('string')
    const row = await app.db.table('organizations').where('id', '=', 'org-1').first()
    expect(row).toBeTruthy()
  })

  it('orgMember', async () => {
    await app.seed.user({ id: 'u-1', email: 'u1@e.com' })
    await app.seed.organization({ id: 'org-1', name: 'Acme' })
    const m = await app.seed.orgMember({ orgId: 'org-1', userId: 'u-1', role: 'member' })
    expect(m.id).toMatch(/.+/)
    const row = await app.db.table('organization_members').where('id', '=', m.id).first()
    expect((row as { role: string }).role).toBe('member')
  })

  it('creditAccount', async () => {
    await app.seed.organization({ id: 'org-1', name: 'Acme' })
    const acc = await app.seed.creditAccount({ orgId: 'org-1', balance: '500' })
    expect(acc.balance).toBe('500')
    const row = await app.db.table('credit_accounts').where('org_id', '=', 'org-1').first()
    expect((row as { balance: string }).balance).toBe('500')
  })

  it('apiKey active — 同步 seed gateway', async () => {
    await app.seed.organization({ id: 'org-1', name: 'Acme' })
    await app.seed.user({ id: 'creator', email: 'c@e.com' })
    const key = await app.seed.apiKey({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'creator',
      label: 'Test Key',
      status: 'active',
      scope: { rateLimitRpm: 60, rateLimitTpm: 100000 },
    })
    expect(key.id).toBe('key-1')
    expect(key.gatewayKeyId).toMatch(/^mock_vk_/)
    expect(app.gateway.calls.createKey).toHaveLength(1)

    const row = await app.db.table('api_keys').where('id', '=', 'key-1').first()
    expect((row as { status: string }).status).toBe('active')
  })

  it('apiKey suspended — pre_freeze_rate_limit JSON 寫入', async () => {
    await app.seed.organization({ id: 'org-1', name: 'Acme' })
    await app.seed.user({ id: 'creator', email: 'c@e.com' })
    await app.seed.apiKey({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'creator',
      label: 'Test Key',
      status: 'suspended_no_credit',
      suspensionReason: 'CREDIT_DEPLETED',
      preFreezeRateLimit: { rpm: 60, tpm: 100000 },
      scope: { rateLimitRpm: 60, rateLimitTpm: 100000 },
    })
    const row = await app.db.table('api_keys').where('id', '=', 'key-1').first()
    expect((row as { suspension_reason: string }).suspension_reason).toBe('CREDIT_DEPLETED')
    expect(JSON.parse((row as { pre_freeze_rate_limit: string }).pre_freeze_rate_limit)).toEqual({
      rpm: 60,
      tpm: 100000,
    })
  })

  it('appModule + moduleSubscription', async () => {
    await app.seed.organization({ id: 'org-1', name: 'Acme' })
    const mod = await app.seed.appModule({ id: 'mod-1', name: 'credit' })
    const sub = await app.seed.moduleSubscription({ orgId: 'org-1', moduleId: mod.id })
    expect(sub.id).toMatch(/.+/)
    const row = await app.db
      .table('module_subscriptions')
      .where('org_id', '=', 'org-1')
      .first()
    expect((row as { status: string }).status).toBe('active')
  })

  it('usageRecord', async () => {
    await app.seed.organization({ id: 'org-1', name: 'Acme' })
    await app.seed.user({ id: 'creator', email: 'c@e.com' })
    const key = await app.seed.apiKey({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'creator',
      label: 'k',
      status: 'active',
    })
    const usage = await app.seed.usageRecord({
      id: 'u-1',
      bifrostLogId: 'b-1',
      orgId: 'org-1',
      apiKeyId: key.id,
      model: 'gpt-4',
      inputTokens: 100,
      outputTokens: 50,
      creditCost: 0.5,
      occurredAt: '2026-04-01T00:00:00.000Z',
    })
    expect(usage.id).toBe('u-1')
    const row = await app.db.table('usage_records').where('id', '=', 'u-1').first()
    expect((row as { credit_cost: number }).credit_cost).toBe(0.5)
  })
})
```

- [ ] **Step 2: Run — verify failure**

Run: `bun test tests/Acceptance/support/__tests__/seeds.test.ts`
Expected: FAIL(`app.seed` undefined)

- [ ] **Step 3: 實作 8 個 seed 函式**

File: `tests/Acceptance/support/seeds/user.ts`

```typescript
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedUserInput {
  readonly id: string
  readonly email: string
  readonly password?: string
  readonly role?: string
  readonly status?: string
}

export interface SeedUserResult {
  readonly id: string
  readonly email: string
  readonly role: string
}

const NOW = '2026-01-01T00:00:00.000Z'

/**
 * Insert a row into `users`. Password is a placeholder hash — acceptance tests
 * don't run real login flows; use `app.auth.tokenFor(...)` to forge JWTs instead.
 */
export async function seedUser(
  db: IDatabaseAccess,
  input: SeedUserInput,
): Promise<SeedUserResult> {
  const role = input.role ?? 'user'
  await db.table('users').insert({
    id: input.id,
    email: input.email,
    password: input.password ?? '$acceptance$placeholder',
    role,
    status: input.status ?? 'active',
    created_at: NOW,
    updated_at: NOW,
  })
  return { id: input.id, email: input.email, role }
}
```

File: `tests/Acceptance/support/seeds/organization.ts`

```typescript
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedOrganizationInput {
  readonly id: string
  readonly name: string
  readonly slug?: string
  readonly description?: string
  readonly status?: string
}

export interface SeedOrganizationResult {
  readonly id: string
  readonly name: string
  readonly slug: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedOrganization(
  db: IDatabaseAccess,
  input: SeedOrganizationInput,
): Promise<SeedOrganizationResult> {
  const slug = input.slug ?? `${input.id}-${Math.random().toString(36).slice(2, 8)}`
  await db.table('organizations').insert({
    id: input.id,
    name: input.name,
    slug,
    description: input.description ?? null,
    status: input.status ?? 'active',
    created_at: NOW,
    updated_at: NOW,
  })
  return { id: input.id, name: input.name, slug }
}
```

File: `tests/Acceptance/support/seeds/orgMember.ts`

```typescript
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedOrgMemberInput {
  readonly id?: string
  readonly orgId: string
  readonly userId: string
  readonly role?: 'member' | 'manager'
}

export interface SeedOrgMemberResult {
  readonly id: string
  readonly orgId: string
  readonly userId: string
  readonly role: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedOrgMember(
  db: IDatabaseAccess,
  input: SeedOrgMemberInput,
): Promise<SeedOrgMemberResult> {
  const id = input.id ?? `mem-${input.orgId}-${input.userId}`
  const role = input.role ?? 'member'
  await db.table('organization_members').insert({
    id,
    organization_id: input.orgId,
    user_id: input.userId,
    role,
    joined_at: NOW,
    created_at: NOW,
  })
  return { id, orgId: input.orgId, userId: input.userId, role }
}
```

File: `tests/Acceptance/support/seeds/creditAccount.ts`

```typescript
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedCreditAccountInput {
  readonly id?: string
  readonly orgId: string
  readonly balance?: string
  readonly lowBalanceThreshold?: string
  readonly status?: 'active' | 'frozen'
}

export interface SeedCreditAccountResult {
  readonly id: string
  readonly orgId: string
  readonly balance: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedCreditAccount(
  db: IDatabaseAccess,
  input: SeedCreditAccountInput,
): Promise<SeedCreditAccountResult> {
  const id = input.id ?? `acc-${input.orgId}`
  const balance = input.balance ?? '0'
  await db.table('credit_accounts').insert({
    id,
    org_id: input.orgId,
    balance,
    low_balance_threshold: input.lowBalanceThreshold ?? '100',
    status: input.status ?? 'active',
    created_at: NOW,
    updated_at: NOW,
  })
  return { id, orgId: input.orgId, balance }
}
```

File: `tests/Acceptance/support/seeds/apiKey.ts`

```typescript
import type { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { KeyScope } from '@/Modules/ApiKey/Domain/ValueObjects/KeyScope'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedApiKeyInput {
  readonly id: string
  readonly orgId: string
  readonly createdByUserId: string
  readonly label: string
  readonly status: 'pending' | 'active' | 'suspended_no_credit' | 'revoked'
  readonly suspensionReason?: string | null
  readonly preFreezeRateLimit?: { rpm: number | null; tpm: number | null } | null
  readonly scope?: { allowedModels?: readonly string[]; rateLimitRpm?: number; rateLimitTpm?: number }
  readonly keyHash?: string
  /** When omitted, gateway createKey is called and the returned id is used. */
  readonly gatewayKeyId?: string
  readonly quotaAllocated?: number
}

export interface SeedApiKeyResult {
  readonly id: string
  readonly orgId: string
  readonly gatewayKeyId: string
  readonly status: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedApiKey(
  db: IDatabaseAccess,
  gateway: MockGatewayClient,
  input: SeedApiKeyInput,
): Promise<SeedApiKeyResult> {
  let gatewayKeyId = input.gatewayKeyId
  if (!gatewayKeyId) {
    const res = await gateway.createKey({ name: input.label, isActive: input.status === 'active' })
    gatewayKeyId = res.id
  }

  const scope = KeyScope.create({
    allowedModels: input.scope?.allowedModels ?? ['*'],
    rateLimitRpm: input.scope?.rateLimitRpm ?? null,
    rateLimitTpm: input.scope?.rateLimitTpm ?? null,
  })

  await db.table('api_keys').insert({
    id: input.id,
    org_id: input.orgId,
    created_by_user_id: input.createdByUserId,
    label: input.label,
    key_hash: input.keyHash ?? `acceptance_hash_${input.id}`,
    bifrost_virtual_key_id: gatewayKeyId,
    bifrost_key_value: null,
    status: input.status,
    scope: JSON.stringify(scope.toJSON()),
    quota_allocated: input.quotaAllocated ?? 0,
    assigned_member_id: null,
    suspension_reason: input.suspensionReason ?? null,
    pre_freeze_rate_limit:
      input.preFreezeRateLimit !== undefined && input.preFreezeRateLimit !== null
        ? JSON.stringify(input.preFreezeRateLimit)
        : null,
    suspended_at: input.status === 'suspended_no_credit' ? NOW : null,
    expires_at: null,
    revoked_at: null,
    created_at: NOW,
    updated_at: NOW,
  })

  return {
    id: input.id,
    orgId: input.orgId,
    gatewayKeyId,
    status: input.status,
  }
}
```

File: `tests/Acceptance/support/seeds/appModule.ts`

```typescript
import { CORE_APP_MODULE_SPECS } from '@/Modules/AppModule/Domain/CoreAppModules'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedAppModuleInput {
  readonly id: string
  readonly name: string
  readonly description?: string
  readonly type?: string
  readonly status?: string
}

export interface SeedAppModuleResult {
  readonly id: string
  readonly name: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedAppModule(
  db: IDatabaseAccess,
  input: SeedAppModuleInput,
): Promise<SeedAppModuleResult> {
  await db.table('app_modules').insert({
    id: input.id,
    name: input.name,
    description: input.description ?? null,
    type: input.type ?? 'free',
    status: input.status ?? 'active',
    created_at: NOW,
    updated_at: NOW,
  })
  return { id: input.id, name: input.name }
}

/** Insert all four CORE_APP_MODULE_SPECS modules. Idempotent guard not needed — call once per test after reset. */
export async function seedAllCoreAppModules(
  db: IDatabaseAccess,
): Promise<readonly SeedAppModuleResult[]> {
  const out: SeedAppModuleResult[] = []
  for (const spec of CORE_APP_MODULE_SPECS) {
    out.push(await seedAppModule(db, { id: spec.id, name: spec.name, description: spec.description }))
  }
  return out
}
```

File: `tests/Acceptance/support/seeds/moduleSubscription.ts`

```typescript
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedModuleSubscriptionInput {
  readonly id?: string
  readonly orgId: string
  readonly moduleId: string
  readonly status?: string
}

export interface SeedModuleSubscriptionResult {
  readonly id: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedModuleSubscription(
  db: IDatabaseAccess,
  input: SeedModuleSubscriptionInput,
): Promise<SeedModuleSubscriptionResult> {
  const id = input.id ?? `sub-${input.orgId}-${input.moduleId}`
  await db.table('module_subscriptions').insert({
    id,
    org_id: input.orgId,
    module_id: input.moduleId,
    status: input.status ?? 'active',
    subscribed_at: NOW,
    updated_at: NOW,
  })
  return { id }
}
```

File: `tests/Acceptance/support/seeds/usageRecord.ts`

```typescript
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

export interface SeedUsageRecordInput {
  readonly id: string
  readonly bifrostLogId: string
  readonly orgId: string
  readonly apiKeyId: string
  readonly model: string
  readonly inputTokens?: number
  readonly outputTokens?: number
  /** Stored as REAL in sqlite (see migration 2026_04_12_000003). */
  readonly creditCost: number
  readonly occurredAt: string
}

export interface SeedUsageRecordResult {
  readonly id: string
}

const NOW = '2026-01-01T00:00:00.000Z'

export async function seedUsageRecord(
  db: IDatabaseAccess,
  input: SeedUsageRecordInput,
): Promise<SeedUsageRecordResult> {
  await db.table('usage_records').insert({
    id: input.id,
    bifrost_log_id: input.bifrostLogId,
    api_key_id: input.apiKeyId,
    org_id: input.orgId,
    model: input.model,
    input_tokens: input.inputTokens ?? 0,
    output_tokens: input.outputTokens ?? 0,
    credit_cost: input.creditCost,
    occurred_at: input.occurredAt,
    created_at: NOW,
  })
  return { id: input.id }
}
```

File: `tests/Acceptance/support/seeds/index.ts`

```typescript
import type { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import {
  type SeedAppModuleInput,
  type SeedAppModuleResult,
  seedAllCoreAppModules,
  seedAppModule,
} from './appModule'
import { type SeedApiKeyInput, type SeedApiKeyResult, seedApiKey } from './apiKey'
import {
  type SeedCreditAccountInput,
  type SeedCreditAccountResult,
  seedCreditAccount,
} from './creditAccount'
import {
  type SeedModuleSubscriptionInput,
  type SeedModuleSubscriptionResult,
  seedModuleSubscription,
} from './moduleSubscription'
import { type SeedOrgMemberInput, type SeedOrgMemberResult, seedOrgMember } from './orgMember'
import {
  type SeedOrganizationInput,
  type SeedOrganizationResult,
  seedOrganization,
} from './organization'
import {
  type SeedUsageRecordInput,
  type SeedUsageRecordResult,
  seedUsageRecord,
} from './usageRecord'
import { type SeedUserInput, type SeedUserResult, seedUser } from './user'

export class TestSeed {
  constructor(
    private readonly getDb: () => IDatabaseAccess,
    private readonly gateway: MockGatewayClient,
  ) {}

  user(input: SeedUserInput): Promise<SeedUserResult> {
    return seedUser(this.getDb(), input)
  }

  organization(input: SeedOrganizationInput): Promise<SeedOrganizationResult> {
    return seedOrganization(this.getDb(), input)
  }

  orgMember(input: SeedOrgMemberInput): Promise<SeedOrgMemberResult> {
    return seedOrgMember(this.getDb(), input)
  }

  creditAccount(input: SeedCreditAccountInput): Promise<SeedCreditAccountResult> {
    return seedCreditAccount(this.getDb(), input)
  }

  apiKey(input: SeedApiKeyInput): Promise<SeedApiKeyResult> {
    return seedApiKey(this.getDb(), this.gateway, input)
  }

  appModule(input: SeedAppModuleInput): Promise<SeedAppModuleResult> {
    return seedAppModule(this.getDb(), input)
  }

  allCoreAppModules(): Promise<readonly SeedAppModuleResult[]> {
    return seedAllCoreAppModules(this.getDb())
  }

  moduleSubscription(input: SeedModuleSubscriptionInput): Promise<SeedModuleSubscriptionResult> {
    return seedModuleSubscription(this.getDb(), input)
  }

  usageRecord(input: SeedUsageRecordInput): Promise<SeedUsageRecordResult> {
    return seedUsageRecord(this.getDb(), input)
  }
}
```

- [ ] **Step 4: 在 TestApp 接 wire**

File: `tests/Acceptance/support/TestApp.ts`(修改)

import 加入:

```typescript
import { TestSeed } from './seeds'
```

class 欄位加入 `readonly seed: TestSeed`,constructor 接收,於 `boot()` 末段加入:

```typescript
    const seed = new TestSeed(() => container.make('database') as IDatabaseAccess, gateway)
```

並將 `seed` 帶入 `new TestApp({ ... })`。

- [ ] **Step 5: Run test — verify it passes**

Run: `bun test tests/Acceptance/support/__tests__/seeds.test.ts`
Expected: PASS(8 tests)

如某 test 失敗,常見原因:
- FK 違反 — 檢查依賴順序(user/org 必須先於 orgMember/apiKey/creditAccount)。
- 欄位名稱拼錯 — 對照各 migration 的 column 名稱。
- credit_cost 型別 — sqlite 欄位是 REAL,傳 number 即可。

- [ ] **Step 6: Commit**

```bash
git add tests/Acceptance/support/seeds/ tests/Acceptance/support/__tests__/seeds.test.ts tests/Acceptance/support/TestApp.ts
git commit -m "feat: [acceptance] 新增 8 個 seed primitives 與 TestApp.seed 整合"
```

---

## Task 5: TestApp 整合 lastResult store

**Files:**
- Modify: `tests/Acceptance/support/TestApp.ts`

**為何:** 既然有 `lastResult`,需在 per-test reset 時清空,避免上一個 test 的殘值汙染。

- [ ] **Step 1: 修改 TestApp**

File: `tests/Acceptance/support/TestApp.ts`

import 加入:

```typescript
import { createLastResultStore, type LastResultStore } from './lastResult'
```

class 欄位加入:

```typescript
  readonly lastResult: LastResultStore
```

constructor 接收 `lastResult`,於 `boot()` 中建立:

```typescript
    const lastResult = createLastResultStore()
```

並在 `new TestApp({ ... })` 帶入。

於 `reset()` 開頭加:

```typescript
    this.lastResult.clear()
```

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: 跑既有 acceptance 測試確認沒破壞**

Run: `bun run test:acceptance`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add tests/Acceptance/support/TestApp.ts
git commit -m "feat: [acceptance] TestApp 整合 lastResult store"
```

---

## Task 6: 改造 `ScenarioRunner` 支援 typed namespaces

**Files:**
- Modify: `tests/Acceptance/support/scenarios/runner.ts`
- Modify: `tests/Acceptance/support/scenarios/index.ts`
- Modify: `tests/Acceptance/support/scenarios/given/index.ts`
- Modify: `tests/Acceptance/support/scenarios/when/index.ts`
- Modify: `tests/Acceptance/support/scenarios/then/index.ts`

**為何:** PR-1 將 `given/when/then` 設成 `Record<string, never>`。PR-2 需要把它換成 `GivenNamespace` / `WhenNamespace` / `ThenNamespace`,內含具體 helper methods,且每個 helper 回傳 builder 本身以支援 chain。

- [ ] **Step 1: 寫 namespace 骨架(暫時為空 method)**

File: `tests/Acceptance/support/scenarios/given/index.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export interface GivenNamespace {
  // PR-2 後續 task 會逐一補入;此處先給空型別,避免循環匯入。
}

export function defineGiven(_builder: ScenarioRunner): GivenNamespace {
  return {}
}
```

File: `tests/Acceptance/support/scenarios/when/index.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export interface WhenNamespace {}

export function defineWhen(_builder: ScenarioRunner): WhenNamespace {
  return {}
}
```

File: `tests/Acceptance/support/scenarios/then/index.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export interface ThenNamespace {}

export function defineThen(_builder: ScenarioRunner): ThenNamespace {
  return {}
}
```

File: `tests/Acceptance/support/scenarios/runner.ts`

```typescript
import type { TestApp } from '../TestApp'
import { defineGiven, type GivenNamespace } from './given'
import { defineThen, type ThenNamespace } from './then'
import { defineWhen, type WhenNamespace } from './when'

export type Step = () => Promise<void>

/**
 * Scenario builder. The given/when/then namespaces are filled by
 * the helper modules under `./given/`, `./when/`, `./then/`.
 *
 * Chain pattern: every helper pushes a deferred step and returns the
 * containing ScenarioRunner so calls can be fluently chained.
 */
export class ScenarioRunner {
  private readonly steps: Step[] = []

  readonly given: GivenNamespace
  readonly when: WhenNamespace
  // biome-ignore lint/suspicious/noThenProperty: scenario DSL intentionally exposes a `then` namespace
  readonly then: ThenNamespace

  constructor(readonly app: TestApp) {
    this.given = defineGiven(this)
    this.when = defineWhen(this)
    this.then = defineThen(this)
  }

  /** Enqueue a raw step. Helpers under given/when/then call this internally. */
  __pushStep(step: Step): this {
    this.steps.push(step)
    return this
  }

  async run(): Promise<void> {
    for (let i = 0; i < this.steps.length; i++) {
      try {
        await this.steps[i]()
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`scenario step ${i + 1} failed: ${message}`, {
          cause: error instanceof Error ? error : undefined,
        })
      }
    }
  }
}
```

File: `tests/Acceptance/support/scenarios/index.ts`

```typescript
import type { TestApp } from '../TestApp'
import { ScenarioRunner } from './runner'

export { ScenarioRunner } from './runner'
export type { GivenNamespace } from './given'
export type { WhenNamespace } from './when'
export type { ThenNamespace } from './then'

export function scenario(app: TestApp): ScenarioRunner {
  return new ScenarioRunner(app)
}
```

- [ ] **Step 2: 既有 runner test 確認仍通過**

Run: `bun test tests/Acceptance/support/__tests__/scenarioRunner.test.ts`
Expected: PASS(3 tests — `__pushStep`、step error wrapping 行為不變)

- [ ] **Step 3: Typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add tests/Acceptance/support/scenarios/
git commit -m "refactor: [acceptance] ScenarioRunner 改用 typed given/when/then namespace 工廠"
```

---

## Task 7: 實作 `given.*` helpers

**Files:**
- Create: `tests/Acceptance/support/scenarios/given/organization.ts`
- Create: `tests/Acceptance/support/scenarios/given/admin.ts`
- Create: `tests/Acceptance/support/scenarios/given/member.ts`
- Create: `tests/Acceptance/support/scenarios/given/creditAccount.ts`
- Create: `tests/Acceptance/support/scenarios/given/activeApiKey.ts`
- Create: `tests/Acceptance/support/scenarios/given/suspendedApiKey.ts`
- Create: `tests/Acceptance/support/scenarios/given/coreAppModulesProvisioned.ts`
- Create: `tests/Acceptance/support/scenarios/given/usageRecords.ts`
- Modify: `tests/Acceptance/support/scenarios/given/index.ts`
- Test: `tests/Acceptance/support/scenarios/__tests__/given.test.ts`

- [ ] **Step 1: 寫 failing test**

File: `tests/Acceptance/support/scenarios/__tests__/given.test.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../TestApp'
import { scenario } from '../index'

describe('given.* helpers', () => {
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

  it('organization 寫入 row', async () => {
    await scenario(app).given.organization('org-1').run()
    const row = await app.db.table('organizations').where('id', '=', 'org-1').first()
    expect(row).toBeTruthy()
  })

  it('admin + creditAccount + activeApiKey chain', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '100' })
      .given.activeApiKey({
        orgId: 'org-1',
        keyId: 'key-1',
        createdByUserId: 'admin-1',
      })
      .run()

    const u = await app.db.table('users').where('id', '=', 'admin-1').first()
    expect((u as { role: string }).role).toBe('admin')

    const acc = await app.db.table('credit_accounts').where('org_id', '=', 'org-1').first()
    expect((acc as { balance: string }).balance).toBe('100')

    const key = await app.db.table('api_keys').where('id', '=', 'key-1').first()
    expect((key as { status: string }).status).toBe('active')
    expect(app.gateway.calls.createKey).toHaveLength(1)
  })

  it('member 把使用者加入組織', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.member({ userId: 'u-1', orgId: 'org-1' })
      .run()
    const m = await app.db
      .table('organization_members')
      .where('user_id', '=', 'u-1')
      .first()
    expect((m as { role: string }).role).toBe('member')
  })

  it('suspendedApiKey 寫 status=suspended_no_credit', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-1')
      .given.suspendedApiKey({
        orgId: 'org-1',
        keyId: 'key-1',
        createdByUserId: 'admin-1',
        preFreezeRateLimit: { rpm: 60, tpm: 100000 },
      })
      .run()
    const key = await app.db.table('api_keys').where('id', '=', 'key-1').first()
    expect((key as { status: string }).status).toBe('suspended_no_credit')
    expect((key as { suspension_reason: string }).suspension_reason).toBe('CREDIT_DEPLETED')
  })

  it('coreAppModulesProvisioned 種 4 modules + 4 subscriptions', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.coreAppModulesProvisioned('org-1')
      .run()
    const mods = await app.db.table('app_modules').select()
    expect(mods).toHaveLength(4)
    const subs = await app.db
      .table('module_subscriptions')
      .where('org_id', '=', 'org-1')
      .select()
    expect(subs).toHaveLength(4)
  })

  it('usageRecords 寫多筆', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-1')
      .given.activeApiKey({ orgId: 'org-1', keyId: 'key-1', createdByUserId: 'admin-1' })
      .given.usageRecords({
        orgId: 'org-1',
        apiKeyId: 'key-1',
        records: [
          { creditCost: 10, occurredAt: '2026-04-01T00:00:00.000Z' },
          { creditCost: 20, occurredAt: '2026-04-02T00:00:00.000Z' },
        ],
      })
      .run()
    const rows = await app.db.table('usage_records').where('org_id', '=', 'org-1').select()
    expect(rows).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run — verify failure**

Run: `bun test tests/Acceptance/support/scenarios/__tests__/given.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 helpers**

File: `tests/Acceptance/support/scenarios/given/organization.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export interface OrganizationOptions {
  readonly name?: string
  readonly slug?: string
}

export function organizationStep(
  builder: ScenarioRunner,
  id: string,
  opts?: OrganizationOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    await builder.app.seed.organization({ id, name: opts?.name ?? `Org ${id}`, slug: opts?.slug })
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/given/admin.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export interface AdminOptions {
  readonly userId: string
  readonly email?: string
}

export function adminStep(builder: ScenarioRunner, opts: AdminOptions): ScenarioRunner {
  builder.__pushStep(async () => {
    await builder.app.seed.user({
      id: opts.userId,
      email: opts.email ?? `${opts.userId}@admin.test`,
      role: 'admin',
    })
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/given/member.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export interface MemberOptions {
  readonly userId: string
  readonly orgId: string
  readonly email?: string
  readonly role?: 'member' | 'manager'
}

export function memberStep(builder: ScenarioRunner, opts: MemberOptions): ScenarioRunner {
  builder.__pushStep(async () => {
    await builder.app.seed.user({
      id: opts.userId,
      email: opts.email ?? `${opts.userId}@member.test`,
      role: 'user',
    })
    await builder.app.seed.orgMember({
      orgId: opts.orgId,
      userId: opts.userId,
      role: opts.role ?? 'member',
    })
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/given/creditAccount.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export interface CreditAccountOptions {
  readonly orgId: string
  readonly id?: string
  readonly balance?: string
  readonly lowBalanceThreshold?: string
  readonly status?: 'active' | 'frozen'
}

export function creditAccountStep(
  builder: ScenarioRunner,
  opts: CreditAccountOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    await builder.app.seed.creditAccount(opts)
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/given/activeApiKey.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export interface ActiveApiKeyOptions {
  readonly orgId: string
  readonly keyId: string
  readonly createdByUserId: string
  readonly label?: string
  readonly scope?: { rateLimitRpm?: number; rateLimitTpm?: number }
}

export function activeApiKeyStep(
  builder: ScenarioRunner,
  opts: ActiveApiKeyOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    await builder.app.seed.apiKey({
      id: opts.keyId,
      orgId: opts.orgId,
      createdByUserId: opts.createdByUserId,
      label: opts.label ?? `Key ${opts.keyId}`,
      status: 'active',
      scope: opts.scope ?? { rateLimitRpm: 60, rateLimitTpm: 100000 },
    })
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/given/suspendedApiKey.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export interface SuspendedApiKeyOptions {
  readonly orgId: string
  readonly keyId: string
  readonly createdByUserId: string
  readonly label?: string
  readonly preFreezeRateLimit: { rpm: number | null; tpm: number | null }
  readonly suspensionReason?: string
}

export function suspendedApiKeyStep(
  builder: ScenarioRunner,
  opts: SuspendedApiKeyOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    await builder.app.seed.apiKey({
      id: opts.keyId,
      orgId: opts.orgId,
      createdByUserId: opts.createdByUserId,
      label: opts.label ?? `Key ${opts.keyId}`,
      status: 'suspended_no_credit',
      suspensionReason: opts.suspensionReason ?? 'CREDIT_DEPLETED',
      preFreezeRateLimit: opts.preFreezeRateLimit,
      scope: {
        rateLimitRpm: opts.preFreezeRateLimit.rpm ?? undefined,
        rateLimitTpm: opts.preFreezeRateLimit.tpm ?? undefined,
      },
    })
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/given/coreAppModulesProvisioned.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export function coreAppModulesProvisionedStep(
  builder: ScenarioRunner,
  orgId: string,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const mods = await builder.app.seed.allCoreAppModules()
    for (const m of mods) {
      await builder.app.seed.moduleSubscription({ orgId, moduleId: m.id })
    }
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/given/usageRecords.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export interface UsageRecordsOptions {
  readonly orgId: string
  readonly apiKeyId: string
  readonly records: ReadonlyArray<{
    readonly id?: string
    readonly bifrostLogId?: string
    readonly model?: string
    readonly inputTokens?: number
    readonly outputTokens?: number
    readonly creditCost: number
    readonly occurredAt: string
  }>
}

export function usageRecordsStep(
  builder: ScenarioRunner,
  opts: UsageRecordsOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    let i = 0
    for (const r of opts.records) {
      i++
      await builder.app.seed.usageRecord({
        id: r.id ?? `usage-${opts.orgId}-${i}`,
        bifrostLogId: r.bifrostLogId ?? `bif-${opts.orgId}-${i}`,
        orgId: opts.orgId,
        apiKeyId: opts.apiKeyId,
        model: r.model ?? 'gpt-4',
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        creditCost: r.creditCost,
        occurredAt: r.occurredAt,
      })
    }
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/given/index.ts`(覆寫骨架)

```typescript
import type { ScenarioRunner } from '../runner'
import { type ActiveApiKeyOptions, activeApiKeyStep } from './activeApiKey'
import { type AdminOptions, adminStep } from './admin'
import { coreAppModulesProvisionedStep } from './coreAppModulesProvisioned'
import { type CreditAccountOptions, creditAccountStep } from './creditAccount'
import { type MemberOptions, memberStep } from './member'
import { type OrganizationOptions, organizationStep } from './organization'
import { type SuspendedApiKeyOptions, suspendedApiKeyStep } from './suspendedApiKey'
import { type UsageRecordsOptions, usageRecordsStep } from './usageRecords'

export interface GivenNamespace {
  organization(id: string, opts?: OrganizationOptions): ScenarioRunner
  admin(opts: AdminOptions): ScenarioRunner
  member(opts: MemberOptions): ScenarioRunner
  creditAccount(opts: CreditAccountOptions): ScenarioRunner
  activeApiKey(opts: ActiveApiKeyOptions): ScenarioRunner
  suspendedApiKey(opts: SuspendedApiKeyOptions): ScenarioRunner
  coreAppModulesProvisioned(orgId: string): ScenarioRunner
  usageRecords(opts: UsageRecordsOptions): ScenarioRunner
}

export function defineGiven(builder: ScenarioRunner): GivenNamespace {
  return {
    organization: (id, opts) => organizationStep(builder, id, opts),
    admin: (opts) => adminStep(builder, opts),
    member: (opts) => memberStep(builder, opts),
    creditAccount: (opts) => creditAccountStep(builder, opts),
    activeApiKey: (opts) => activeApiKeyStep(builder, opts),
    suspendedApiKey: (opts) => suspendedApiKeyStep(builder, opts),
    coreAppModulesProvisioned: (orgId) => coreAppModulesProvisionedStep(builder, orgId),
    usageRecords: (opts) => usageRecordsStep(builder, opts),
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `bun test tests/Acceptance/support/scenarios/__tests__/given.test.ts`
Expected: PASS(6 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/Acceptance/support/scenarios/given/ tests/Acceptance/support/scenarios/__tests__/given.test.ts
git commit -m "feat: [acceptance] 新增 given.* helpers(organization/admin/member/creditAccount/activeApiKey/suspendedApiKey/coreAppModulesProvisioned/usageRecords)"
```

---

## Task 8: 實作 `when.*` helpers

**Files:**
- Create: `tests/Acceptance/support/scenarios/when/userTopsUpCredit.ts`
- Create: `tests/Acceptance/support/scenarios/when/userDeductsCredit.ts`
- Create: `tests/Acceptance/support/scenarios/when/userRefundsCredit.ts`
- Create: `tests/Acceptance/support/scenarios/when/applyUsageCharges.ts`
- Modify: `tests/Acceptance/support/scenarios/when/index.ts`
- Test: `tests/Acceptance/support/scenarios/__tests__/when.test.ts`

**為何:** 4 個 use-case service 各對應一個 when helper;每個 helper 把 service result 寫進 `app.lastResult`,then.* 可讀。

- [ ] **Step 1: 寫 failing test**

File: `tests/Acceptance/support/scenarios/__tests__/when.test.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { CreditResponse } from '@/Modules/Credit/Application/DTOs/CreditDTO'
import { TestApp } from '../../TestApp'
import { scenario } from '../index'

describe('when.* helpers', () => {
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

  it('userTopsUpCredit 把 result 存入 lastResult', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '0' })
      .when.userTopsUpCredit({
        orgId: 'org-1',
        amount: '500',
        callerUserId: 'admin-1',
      })
      .run()

    const result = app.lastResult.expect<CreditResponse>()
    expect(result.success).toBe(true)
    expect(result.data?.balance).toBe('500')
  })

  it('userDeductsCredit', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '500' })
      .when.userDeductsCredit({ orgId: 'org-1', amount: '100' })
      .run()

    const result = app.lastResult.expect<{ success: boolean; newBalance?: string }>()
    expect(result.success).toBe(true)
    expect(result.newBalance).toBe('400')
  })

  it('userRefundsCredit', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '0' })
      .when.userRefundsCredit({
        orgId: 'org-1',
        amount: '50',
        callerUserId: 'admin-1',
      })
      .run()

    const result = app.lastResult.expect<CreditResponse>()
    expect(result.success).toBe(true)
    expect(result.data?.balance).toBe('50')
  })

  it('applyUsageCharges 走 service', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '1000' })
      .given.activeApiKey({ orgId: 'org-1', keyId: 'key-1', createdByUserId: 'admin-1' })
      .given.usageRecords({
        orgId: 'org-1',
        apiKeyId: 'key-1',
        records: [
          { creditCost: 10, occurredAt: '2026-04-01T00:00:00.000Z' },
          { creditCost: 20, occurredAt: '2026-04-02T00:00:00.000Z' },
        ],
      })
      .when.applyUsageCharges({ orgIds: ['org-1'] })
      .run()

    const result = app.lastResult.expect<{ chargedCount: number; processedOrgs: number }>()
    expect(result.processedOrgs).toBe(1)
    expect(result.chargedCount).toBe(2)
  })
})
```

- [ ] **Step 2: Run — verify failure**

Run: `bun test tests/Acceptance/support/scenarios/__tests__/when.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 helpers**

File: `tests/Acceptance/support/scenarios/when/userTopsUpCredit.ts`

```typescript
import type { TopUpCreditService } from '@/Modules/Credit/Application/Services/TopUpCreditService'
import type { ScenarioRunner } from '../runner'

export interface UserTopsUpCreditOptions {
  readonly orgId: string
  readonly amount: string
  readonly callerUserId: string
  readonly callerSystemRole?: string
  readonly description?: string
}

export function userTopsUpCreditStep(
  builder: ScenarioRunner,
  opts: UserTopsUpCreditOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const service = builder.app.container.make('topUpCreditService') as TopUpCreditService
    const result = await service.execute({
      orgId: opts.orgId,
      amount: opts.amount,
      description: opts.description,
      callerUserId: opts.callerUserId,
      callerSystemRole: opts.callerSystemRole ?? 'admin',
    })
    builder.app.lastResult.set(result)
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/when/userDeductsCredit.ts`

```typescript
import type { DeductCreditService } from '@/Modules/Credit/Application/Services/DeductCreditService'
import type { ScenarioRunner } from '../runner'

export interface UserDeductsCreditOptions {
  readonly orgId: string
  readonly amount: string
  readonly referenceType?: string
  readonly referenceId?: string
  readonly description?: string
}

export function userDeductsCreditStep(
  builder: ScenarioRunner,
  opts: UserDeductsCreditOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const service = builder.app.container.make('deductCreditService') as DeductCreditService
    const result = await service.execute(opts)
    builder.app.lastResult.set(result)
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/when/userRefundsCredit.ts`

```typescript
import type { RefundCreditService } from '@/Modules/Credit/Application/Services/RefundCreditService'
import type { ScenarioRunner } from '../runner'

export interface UserRefundsCreditOptions {
  readonly orgId: string
  readonly amount: string
  readonly callerUserId: string
  readonly callerSystemRole?: string
  readonly referenceType?: string
  readonly referenceId?: string
  readonly description?: string
}

export function userRefundsCreditStep(
  builder: ScenarioRunner,
  opts: UserRefundsCreditOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const service = builder.app.container.make('refundCreditService') as RefundCreditService
    const result = await service.execute({
      orgId: opts.orgId,
      amount: opts.amount,
      callerUserId: opts.callerUserId,
      callerSystemRole: opts.callerSystemRole ?? 'admin',
      referenceType: opts.referenceType,
      referenceId: opts.referenceId,
      description: opts.description,
    })
    builder.app.lastResult.set(result)
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/when/applyUsageCharges.ts`

```typescript
import type { ApplyUsageChargesService } from '@/Modules/Credit/Application/Services/ApplyUsageChargesService'
import type { ScenarioRunner } from '../runner'

export interface ApplyUsageChargesOptions {
  readonly orgIds: readonly string[]
  readonly startTime?: string
  readonly endTime?: string
}

export function applyUsageChargesStep(
  builder: ScenarioRunner,
  opts: ApplyUsageChargesOptions,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const service = builder.app.container.make(
      'applyUsageChargesService',
    ) as ApplyUsageChargesService
    const result = await service.execute(opts)
    builder.app.lastResult.set(result)
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/when/index.ts`(覆寫)

```typescript
import type { ScenarioRunner } from '../runner'
import { type ApplyUsageChargesOptions, applyUsageChargesStep } from './applyUsageCharges'
import { type UserDeductsCreditOptions, userDeductsCreditStep } from './userDeductsCredit'
import { type UserRefundsCreditOptions, userRefundsCreditStep } from './userRefundsCredit'
import { type UserTopsUpCreditOptions, userTopsUpCreditStep } from './userTopsUpCredit'

export interface WhenNamespace {
  userTopsUpCredit(opts: UserTopsUpCreditOptions): ScenarioRunner
  userDeductsCredit(opts: UserDeductsCreditOptions): ScenarioRunner
  userRefundsCredit(opts: UserRefundsCreditOptions): ScenarioRunner
  applyUsageCharges(opts: ApplyUsageChargesOptions): ScenarioRunner
}

export function defineWhen(builder: ScenarioRunner): WhenNamespace {
  return {
    userTopsUpCredit: (opts) => userTopsUpCreditStep(builder, opts),
    userDeductsCredit: (opts) => userDeductsCreditStep(builder, opts),
    userRefundsCredit: (opts) => userRefundsCreditStep(builder, opts),
    applyUsageCharges: (opts) => applyUsageChargesStep(builder, opts),
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `bun test tests/Acceptance/support/scenarios/__tests__/when.test.ts`
Expected: PASS(4 tests)

- [ ] **Step 5: Commit**

```bash
git add tests/Acceptance/support/scenarios/when/ tests/Acceptance/support/scenarios/__tests__/when.test.ts
git commit -m "feat: [acceptance] 新增 when.* helpers(userTopsUpCredit/userDeductsCredit/userRefundsCredit/applyUsageCharges)"
```

---

## Task 9: 實作 `then.*` helpers

**Files:**
- Create: `tests/Acceptance/support/scenarios/then/creditBalanceIs.ts`
- Create: `tests/Acceptance/support/scenarios/then/creditTransactionExists.ts`
- Create: `tests/Acceptance/support/scenarios/then/apiKeyIsSuspended.ts`
- Create: `tests/Acceptance/support/scenarios/then/apiKeyIsActive.ts`
- Create: `tests/Acceptance/support/scenarios/then/gatewayKeyRateLimit.ts`
- Create: `tests/Acceptance/support/scenarios/then/domainEventsInclude.ts`
- Modify: `tests/Acceptance/support/scenarios/then/index.ts`
- Test: `tests/Acceptance/support/scenarios/__tests__/then.test.ts`

- [ ] **Step 1: 寫 failing test**

File: `tests/Acceptance/support/scenarios/__tests__/then.test.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../../TestApp'
import { scenario } from '../index'

describe('then.* helpers', () => {
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

  it('creditBalanceIs 通過 + 失敗時錯誤訊息有 expected/actual', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '500' })
      .then.creditBalanceIs('org-1', '500')
      .run()

    await app.reset()
    await app.seed.organization({ id: 'org-2', name: 'B' })
    await app.seed.creditAccount({ orgId: 'org-2', balance: '300' })
    await expect(
      scenario(app).then.creditBalanceIs('org-2', '999').run(),
    ).rejects.toThrow(/expected.*999.*actual.*300/i)
  })

  it('apiKeyIsSuspended / apiKeyIsActive', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-1')
      .given.activeApiKey({ orgId: 'org-1', keyId: 'k-1', createdByUserId: 'admin-1' })
      .then.apiKeyIsActive('k-1')
      .run()

    await app.reset()
    await app.seed.user({ id: 'admin-1', email: 'a@e.com', role: 'admin' })
    await app.seed.organization({ id: 'org-1', name: 'A' })
    await app.seed.apiKey({
      id: 'k-2',
      orgId: 'org-1',
      createdByUserId: 'admin-1',
      label: 'k-2',
      status: 'suspended_no_credit',
      suspensionReason: 'CREDIT_DEPLETED',
      preFreezeRateLimit: { rpm: 60, tpm: 100000 },
    })
    await scenario(app).then.apiKeyIsSuspended('k-2', { reason: 'CREDIT_DEPLETED' }).run()
  })

  it('gatewayKeyRateLimit 找最後一次 updateKey', async () => {
    await app.gateway.createKey({ name: 'k', isActive: true })
    await app.gateway.updateKey('mock_vk_000001', {
      rateLimit: {
        tokenMaxLimit: 0,
        tokenResetDuration: '1h',
        requestMaxLimit: 0,
        requestResetDuration: '1h',
      },
    })

    await scenario(app)
      .then.gatewayKeyRateLimit('mock_vk_000001', { tokenMaxLimit: 0, requestMaxLimit: 0 })
      .run()

    await expect(
      scenario(app)
        .then.gatewayKeyRateLimit('mock_vk_000001', { tokenMaxLimit: 999 })
        .run(),
    ).rejects.toThrow(/tokenMaxLimit/)
  })

  it('domainEventsInclude — 順序與 partial data', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '0' })
      .when.userTopsUpCredit({ orgId: 'org-1', amount: '100', callerUserId: 'admin-1' })
      .then.domainEventsInclude([
        { eventType: 'credit.topped_up', data: { orgId: 'org-1', amount: '100' } },
      ])
      .run()

    await app.reset()
    await expect(
      scenario(app).then.domainEventsInclude([{ eventType: 'never.happens' }]).run(),
    ).rejects.toThrow(/never\.happens/)
  })

  it('creditTransactionExists', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '0' })
      .when.userTopsUpCredit({ orgId: 'org-1', amount: '100', callerUserId: 'admin-1' })
      .then.creditTransactionExists({ orgId: 'org-1', type: 'topup', amount: '100' })
      .run()
  })
})
```

- [ ] **Step 2: Run — verify failure**

Run: `bun test tests/Acceptance/support/scenarios/__tests__/then.test.ts`
Expected: FAIL

- [ ] **Step 3: 實作 helpers**

File: `tests/Acceptance/support/scenarios/then/creditBalanceIs.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export function creditBalanceIsStep(
  builder: ScenarioRunner,
  orgId: string,
  expected: string,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const row = (await builder.app.db
      .table('credit_accounts')
      .where('org_id', '=', orgId)
      .first()) as { balance?: string } | null
    if (!row) {
      throw new Error(`creditBalanceIs(${orgId}, ${expected}): no credit account row`)
    }
    if (row.balance !== expected) {
      throw new Error(
        `creditBalanceIs(${orgId}): expected ${expected}, actual ${row.balance ?? 'undefined'}`,
      )
    }
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/then/creditTransactionExists.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export interface CreditTransactionMatcher {
  readonly orgId: string
  readonly type: 'topup' | 'deduction' | 'refund' | 'expiry' | 'adjustment'
  readonly amount?: string
  readonly referenceType?: string
  readonly referenceId?: string
}

export function creditTransactionExistsStep(
  builder: ScenarioRunner,
  match: CreditTransactionMatcher,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const acc = (await builder.app.db
      .table('credit_accounts')
      .where('org_id', '=', match.orgId)
      .first()) as { id?: string } | null
    if (!acc?.id) {
      throw new Error(`creditTransactionExists: no account for org ${match.orgId}`)
    }
    let q = builder.app.db
      .table('credit_transactions')
      .where('credit_account_id', '=', acc.id)
      .where('type', '=', match.type)
    if (match.amount !== undefined) q = q.where('amount', '=', match.amount)
    if (match.referenceType !== undefined) q = q.where('reference_type', '=', match.referenceType)
    if (match.referenceId !== undefined) q = q.where('reference_id', '=', match.referenceId)
    const rows = await q.select()
    if (rows.length === 0) {
      throw new Error(
        `creditTransactionExists: no row matched ${JSON.stringify(match)} (account ${acc.id})`,
      )
    }
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/then/apiKeyIsSuspended.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export interface ApiKeySuspendedMatcher {
  readonly reason?: string
}

export function apiKeyIsSuspendedStep(
  builder: ScenarioRunner,
  keyId: string,
  match?: ApiKeySuspendedMatcher,
): ScenarioRunner {
  builder.__pushStep(async () => {
    const row = (await builder.app.db.table('api_keys').where('id', '=', keyId).first()) as {
      status?: string
      suspension_reason?: string
    } | null
    if (!row) throw new Error(`apiKeyIsSuspended(${keyId}): no row`)
    if (row.status !== 'suspended_no_credit') {
      throw new Error(
        `apiKeyIsSuspended(${keyId}): expected status suspended_no_credit, actual ${row.status}`,
      )
    }
    if (match?.reason !== undefined && row.suspension_reason !== match.reason) {
      throw new Error(
        `apiKeyIsSuspended(${keyId}): expected reason ${match.reason}, actual ${row.suspension_reason ?? 'null'}`,
      )
    }
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/then/apiKeyIsActive.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export function apiKeyIsActiveStep(builder: ScenarioRunner, keyId: string): ScenarioRunner {
  builder.__pushStep(async () => {
    const row = (await builder.app.db.table('api_keys').where('id', '=', keyId).first()) as {
      status?: string
    } | null
    if (!row) throw new Error(`apiKeyIsActive(${keyId}): no row`)
    if (row.status !== 'active') {
      throw new Error(`apiKeyIsActive(${keyId}): expected active, actual ${row.status}`)
    }
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/then/gatewayKeyRateLimit.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export interface GatewayKeyRateLimitMatcher {
  readonly tokenMaxLimit?: number
  readonly requestMaxLimit?: number
  readonly tokenResetDuration?: string
  readonly requestResetDuration?: string
}

export function gatewayKeyRateLimitStep(
  builder: ScenarioRunner,
  gatewayKeyId: string,
  expected: GatewayKeyRateLimitMatcher,
): ScenarioRunner {
  builder.__pushStep(() => {
    const calls = builder.app.gateway.calls.updateKey.filter((c) => c.keyId === gatewayKeyId)
    if (calls.length === 0) {
      throw new Error(`gatewayKeyRateLimit(${gatewayKeyId}): no updateKey call captured`)
    }
    const last = calls[calls.length - 1]
    const actual = last.request.rateLimit ?? {}
    for (const k of Object.keys(expected) as (keyof GatewayKeyRateLimitMatcher)[]) {
      const e = expected[k]
      const a = (actual as Record<string, unknown>)[k]
      if (e !== undefined && a !== e) {
        throw new Error(
          `gatewayKeyRateLimit(${gatewayKeyId}): ${k} expected ${String(e)}, actual ${String(a)}`,
        )
      }
    }
    return Promise.resolve()
  })
  return builder
}
```

File: `tests/Acceptance/support/scenarios/then/domainEventsInclude.ts`

```typescript
import type { ScenarioRunner } from '../runner'

export interface DomainEventMatcher {
  readonly eventType: string
  readonly data?: Readonly<Record<string, unknown>>
}

export function domainEventsIncludeStep(
  builder: ScenarioRunner,
  matchers: readonly DomainEventMatcher[],
): ScenarioRunner {
  builder.__pushStep(() => {
    for (const m of matchers) {
      const found = builder.app.events.find(
        (e) =>
          e.eventType === m.eventType &&
          (!m.data || matchPartial(e.data, m.data as Record<string, unknown>)),
      )
      if (!found) {
        throw new Error(
          `domainEventsInclude: missing event ${m.eventType}${m.data ? ` data=${JSON.stringify(m.data)}` : ''}. Captured: ${builder.app.events
            .map((e) => e.eventType)
            .join(', ')}`,
        )
      }
    }
    return Promise.resolve()
  })
  return builder
}

function matchPartial(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
  for (const k of Object.keys(expected)) {
    if (actual[k] !== expected[k]) return false
  }
  return true
}
```

File: `tests/Acceptance/support/scenarios/then/index.ts`(覆寫)

```typescript
import type { ScenarioRunner } from '../runner'
import { apiKeyIsActiveStep } from './apiKeyIsActive'
import { type ApiKeySuspendedMatcher, apiKeyIsSuspendedStep } from './apiKeyIsSuspended'
import { creditBalanceIsStep } from './creditBalanceIs'
import {
  type CreditTransactionMatcher,
  creditTransactionExistsStep,
} from './creditTransactionExists'
import { type DomainEventMatcher, domainEventsIncludeStep } from './domainEventsInclude'
import {
  type GatewayKeyRateLimitMatcher,
  gatewayKeyRateLimitStep,
} from './gatewayKeyRateLimit'

export interface ThenNamespace {
  creditBalanceIs(orgId: string, expected: string): ScenarioRunner
  creditTransactionExists(match: CreditTransactionMatcher): ScenarioRunner
  apiKeyIsSuspended(keyId: string, match?: ApiKeySuspendedMatcher): ScenarioRunner
  apiKeyIsActive(keyId: string): ScenarioRunner
  gatewayKeyRateLimit(gatewayKeyId: string, expected: GatewayKeyRateLimitMatcher): ScenarioRunner
  domainEventsInclude(matchers: readonly DomainEventMatcher[]): ScenarioRunner
}

export function defineThen(builder: ScenarioRunner): ThenNamespace {
  return {
    creditBalanceIs: (orgId, expected) => creditBalanceIsStep(builder, orgId, expected),
    creditTransactionExists: (m) => creditTransactionExistsStep(builder, m),
    apiKeyIsSuspended: (keyId, m) => apiKeyIsSuspendedStep(builder, keyId, m),
    apiKeyIsActive: (keyId) => apiKeyIsActiveStep(builder, keyId),
    gatewayKeyRateLimit: (id, e) => gatewayKeyRateLimitStep(builder, id, e),
    domainEventsInclude: (m) => domainEventsIncludeStep(builder, m),
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `bun test tests/Acceptance/support/scenarios/__tests__/then.test.ts`
Expected: PASS(5 tests)

- [ ] **Step 5: 全量 acceptance 跑一輪確認沒回歸**

Run: `bun run test:acceptance`
Expected: 全綠

- [ ] **Step 6: Commit**

```bash
git add tests/Acceptance/support/scenarios/then/ tests/Acceptance/support/scenarios/__tests__/then.test.ts
git commit -m "feat: [acceptance] 新增 then.* helpers(creditBalanceIs/creditTransactionExists/apiKeyIsSuspended/apiKeyIsActive/gatewayKeyRateLimit/domainEventsInclude)"
```

---

## Task 10: Spec — `top-up-credit.spec.ts`(場景 #1, #2, #3)

**Files:**
- Create: `tests/Acceptance/UseCases/Credit/top-up-credit.spec.ts`

**對應 spec §9.1**:
- #1 成功充值 → 餘額更新 + 交易紀錄 → DSL
- #2 充值金額 ≤ 0 拒絕 → 單步驟(不用 DSL)
- #3 充值到不存在帳戶 → 自動建立 → DSL

- [ ] **Step 1: 寫 spec**

File: `tests/Acceptance/UseCases/Credit/top-up-credit.spec.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { TopUpCreditService } from '@/Modules/Credit/Application/Services/TopUpCreditService'
import { scenario } from '../../support/scenarios'
import { TestApp } from '../../support/TestApp'

describe('Use Case: 充值 Credit', () => {
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

  it('#1 admin 充值 500 → 餘額更新且記錄一筆 topup 交易,並派發 credit.topped_up', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '0' })

      .when.userTopsUpCredit({ orgId: 'org-1', amount: '500', callerUserId: 'admin-1' })

      .then.creditBalanceIs('org-1', '500')
      .then.creditTransactionExists({ orgId: 'org-1', type: 'topup', amount: '500' })
      .then.domainEventsInclude([
        { eventType: 'credit.topped_up', data: { orgId: 'org-1', amount: '500' } },
      ])
      .run()
  })

  it('#2 充值金額為 0 → 拒絕、餘額不變、無交易、無事件', async () => {
    await app.seed.organization({ id: 'org-2', name: 'Org2' })
    await app.seed.creditAccount({ orgId: 'org-2', balance: '100' })

    const service = app.container.make('topUpCreditService') as TopUpCreditService
    const result = await service.execute({
      orgId: 'org-2',
      amount: '0',
      callerUserId: 'admin-1',
      callerSystemRole: 'admin',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_AMOUNT')

    const acc = await app.db.table('credit_accounts').where('org_id', '=', 'org-2').first()
    expect((acc as { balance: string }).balance).toBe('100')

    const txs = await app.db
      .table('credit_transactions')
      .where('credit_account_id', '=', (acc as { id: string }).id)
      .select()
    expect(txs).toHaveLength(0)

    expect(app.events.filter((e) => e.eventType === 'credit.topped_up')).toHaveLength(0)
  })

  it('#3 充值到不存在帳戶 → 自動建立並寫入餘額', async () => {
    await scenario(app)
      .given.admin({ userId: 'admin-1' })
      .given.organization('org-3')
      // 不 seed creditAccount

      .when.userTopsUpCredit({ orgId: 'org-3', amount: '300', callerUserId: 'admin-1' })

      .then.creditBalanceIs('org-3', '300')
      .then.creditTransactionExists({ orgId: 'org-3', type: 'topup', amount: '300' })
      .run()
  })
})
```

- [ ] **Step 2: Run — expect PASS**

Run: `bun test tests/Acceptance/UseCases/Credit/top-up-credit.spec.ts`
Expected: PASS(3 tests)

- [ ] **Step 3: Commit**

```bash
git add tests/Acceptance/UseCases/Credit/top-up-credit.spec.ts
git commit -m "test: [acceptance] Credit pilot — top-up-credit 三個場景"
```

---

## Task 11: Spec — `deduct-credit.spec.ts`(場景 #4, #5)

**Files:**
- Create: `tests/Acceptance/UseCases/Credit/deduct-credit.spec.ts`

- [ ] **Step 1: 寫 spec**

File: `tests/Acceptance/UseCases/Credit/deduct-credit.spec.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { scenario } from '../../support/scenarios'
import { TestApp } from '../../support/TestApp'

describe('Use Case: 扣款 Credit', () => {
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

  it('#4 餘額 500 扣 100 → 餘額 400 且記錄 deduction', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '500' })

      .when.userDeductsCredit({ orgId: 'org-1', amount: '100' })

      .then.creditBalanceIs('org-1', '400')
      .then.creditTransactionExists({ orgId: 'org-1', type: 'deduction', amount: '100' })
      .run()

    // 餘額 400 > threshold 100 → 不應派發 balance_low / balance_depleted
    expect(app.events.filter((e) => e.eventType === 'credit.balance_low')).toHaveLength(0)
    expect(app.events.filter((e) => e.eventType === 'credit.balance_depleted')).toHaveLength(0)
  })

  it('#5 扣款超過餘額 → 拒絕,餘額不變', async () => {
    // DeductCreditService 對「金額 > 餘額」的失敗路徑視 Balance.subtract 行為而定:
    // - 若 throw → service.execute 會 reject,需用 expect(...).rejects 接
    // - 若回 success:false → 直接讀 lastResult 即可
    // 預設按「reject 」寫法;若實際是 success:false,改下面 try/catch 為 lastResult 斷言。
    await app.seed.organization({ id: 'org-2', name: 'Org2' })
    await app.seed.creditAccount({ orgId: 'org-2', balance: '50' })

    let threw = false
    try {
      await scenario(app)
        .when.userDeductsCredit({ orgId: 'org-2', amount: '100' })
        .run()
    } catch {
      threw = true
    }

    if (!threw) {
      const result = app.lastResult.expect<{ success: boolean }>()
      expect(result.success).toBe(false)
    }

    // 不論 throw 與否,餘額必須維持 50
    const row = await app.db.table('credit_accounts').where('org_id', '=', 'org-2').first()
    expect((row as { balance: string }).balance).toBe('50')
  })
})
```

- [ ] **Step 2: Run — expect PASS**

Run: `bun test tests/Acceptance/UseCases/Credit/deduct-credit.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/Acceptance/UseCases/Credit/deduct-credit.spec.ts
git commit -m "test: [acceptance] Credit pilot — deduct-credit 兩個場景"
```

---

## Task 12: Spec — `deduct-until-depleted.spec.ts`(場景 #6,跨模組)

**Files:**
- Create: `tests/Acceptance/UseCases/Credit/deduct-until-depleted.spec.ts`

**驗收目標:** 扣到 0 → DomainEventDispatcher 派發 `credit.balance_depleted` → CreditServiceProvider.boot 註冊的 handler 觸發 → `HandleBalanceDepletedService` 跑 `findActiveByOrgId` 找出該 org 的所有 active key → ApiKey suspend + Gateway updateKey rate limit 為 0。

- [ ] **Step 1: 寫 spec**

File: `tests/Acceptance/UseCases/Credit/deduct-until-depleted.spec.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { scenario } from '../../support/scenarios'
import { TestApp } from '../../support/TestApp'

describe('Use Case: 扣款至餘額耗盡 → 自動封鎖該 Org 所有 active Keys', () => {
  let app: TestApp
  let key1Gateway: string
  let key2Gateway: string

  beforeAll(async () => {
    app = await TestApp.boot()
  })

  afterAll(async () => {
    await app.shutdown()
  })

  beforeEach(async () => {
    await app.reset()
    await app.seed.user({ id: 'admin-1', email: 'a@e.com', role: 'admin' })
    await app.seed.organization({ id: 'org-1', name: 'Org1' })
    await app.seed.creditAccount({ orgId: 'org-1', balance: '100' })
    const k1 = await app.seed.apiKey({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'admin-1',
      label: 'k1',
      status: 'active',
      scope: { rateLimitRpm: 60, rateLimitTpm: 100000 },
    })
    const k2 = await app.seed.apiKey({
      id: 'key-2',
      orgId: 'org-1',
      createdByUserId: 'admin-1',
      label: 'k2',
      status: 'active',
      scope: { rateLimitRpm: 30, rateLimitTpm: 50000 },
    })
    key1Gateway = k1.gatewayKeyId
    key2Gateway = k2.gatewayKeyId
  })

  it('#6 餘額 100 扣 100 → 兩支 active key 均 suspend,Gateway rate limit 歸零,派發 credit.balance_depleted', async () => {
    await scenario(app)
      .when.userDeductsCredit({ orgId: 'org-1', amount: '100' })

      .then.creditBalanceIs('org-1', '0')
      .then.apiKeyIsSuspended('key-1', { reason: 'CREDIT_DEPLETED' })
      .then.apiKeyIsSuspended('key-2', { reason: 'CREDIT_DEPLETED' })
      .then.gatewayKeyRateLimit(key1Gateway, {
        tokenMaxLimit: 0,
        requestMaxLimit: 0,
        tokenResetDuration: '1h',
        requestResetDuration: '1h',
      })
      .then.gatewayKeyRateLimit(key2Gateway, { tokenMaxLimit: 0, requestMaxLimit: 0 })
      .then.domainEventsInclude([
        { eventType: 'credit.balance_depleted', data: { orgId: 'org-1' } },
      ])
      .run()

    const k1 = (await app.db.table('api_keys').where('id', '=', 'key-1').first()) as {
      pre_freeze_rate_limit: string
    }
    expect(JSON.parse(k1.pre_freeze_rate_limit)).toEqual({ rpm: 60, tpm: 100000 })
  })
})
```

- [ ] **Step 2: Run — expect PASS**

Run: `bun test tests/Acceptance/UseCases/Credit/deduct-until-depleted.spec.ts`
Expected: PASS

如失敗:
- Gateway updateKey 沒被呼叫 → 確認 `CreditServiceProvider.boot` 的 `dispatcher.on('credit.balance_depleted', ...)` 真的被執行了(PR-1 smoke 應已驗)。
- ApiKey 沒 suspend → `findActiveByOrgId` repository SQL 篩選條件可能有差,到 `ApiKeyRepository.ts` 看 — 應為 `where status = 'active' and revoked_at is null`。

- [ ] **Step 3: Commit**

```bash
git add tests/Acceptance/UseCases/Credit/deduct-until-depleted.spec.ts
git commit -m "test: [acceptance] Credit pilot — deduct-until-depleted 跨模組 saga"
```

---

## Task 13: Spec — `credit-topped-up-restores-keys.spec.ts`(場景 #7,跨模組)

**Files:**
- Create: `tests/Acceptance/UseCases/Credit/credit-topped-up-restores-keys.spec.ts`

**驗收目標:** 充值後 → `credit.topped_up` 派發 → handler 跑 `findSuspendedByOrgId` → 對每支 suspended key 呼叫 `gatewayClient.updateKey` 恢復 rate limit + repository update 為 active。

- [ ] **Step 1: 寫 spec**

File: `tests/Acceptance/UseCases/Credit/credit-topped-up-restores-keys.spec.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { scenario } from '../../support/scenarios'
import { TestApp } from '../../support/TestApp'

describe('Use Case: 充值後 → 自動恢復所有 suspended Keys', () => {
  let app: TestApp
  let key1Gateway: string

  beforeAll(async () => {
    app = await TestApp.boot()
  })

  afterAll(async () => {
    await app.shutdown()
  })

  beforeEach(async () => {
    await app.reset()
    await app.seed.user({ id: 'admin-1', email: 'a@e.com', role: 'admin' })
    await app.seed.organization({ id: 'org-1', name: 'Org1' })
    await app.seed.creditAccount({ orgId: 'org-1', balance: '0' })
    const k1 = await app.seed.apiKey({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'admin-1',
      label: 'k1',
      status: 'suspended_no_credit',
      suspensionReason: 'CREDIT_DEPLETED',
      preFreezeRateLimit: { rpm: 60, tpm: 100000 },
      scope: { rateLimitRpm: 60, rateLimitTpm: 100000 },
    })
    key1Gateway = k1.gatewayKeyId
  })

  it('#7 admin 充值 500 → suspended key 恢復為 active 且 Gateway rate limit 還原為 pre-freeze 值', async () => {
    await scenario(app)
      .when.userTopsUpCredit({ orgId: 'org-1', amount: '500', callerUserId: 'admin-1' })

      .then.creditBalanceIs('org-1', '500')
      .then.apiKeyIsActive('key-1')
      .then.gatewayKeyRateLimit(key1Gateway, {
        tokenMaxLimit: 100000,
        requestMaxLimit: 60,
      })
      .then.domainEventsInclude([{ eventType: 'credit.topped_up', data: { orgId: 'org-1' } }])
      .run()

    const row = (await app.db.table('api_keys').where('id', '=', 'key-1').first()) as {
      pre_freeze_rate_limit: string | null
      suspension_reason: string | null
      suspended_at: string | null
    }
    expect(row.pre_freeze_rate_limit).toBeNull()
    expect(row.suspension_reason).toBeNull()
    expect(row.suspended_at).toBeNull()
  })
})
```

- [ ] **Step 2: Run — expect PASS**

Run: `bun test tests/Acceptance/UseCases/Credit/credit-topped-up-restores-keys.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/Acceptance/UseCases/Credit/credit-topped-up-restores-keys.spec.ts
git commit -m "test: [acceptance] Credit pilot — credit-topped-up-restores-keys 跨模組 saga"
```

---

## Task 14: Spec — `refund-credit.spec.ts`(場景 #8)

**Files:**
- Create: `tests/Acceptance/UseCases/Credit/refund-credit.spec.ts`

- [ ] **Step 1: 寫 spec**

File: `tests/Acceptance/UseCases/Credit/refund-credit.spec.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { scenario } from '../../support/scenarios'
import { TestApp } from '../../support/TestApp'

describe('Use Case: 退款 Credit', () => {
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

  it('#8 admin 退款 50 → 餘額回填且記錄一筆 refund 交易', async () => {
    await scenario(app)
      .given.organization('org-1')
      .given.creditAccount({ orgId: 'org-1', balance: '100' })

      .when.userRefundsCredit({
        orgId: 'org-1',
        amount: '50',
        callerUserId: 'admin-1',
        referenceType: 'usage_record',
        referenceId: 'usage-x',
        description: 'Test refund',
      })

      .then.creditBalanceIs('org-1', '150')
      .then.creditTransactionExists({
        orgId: 'org-1',
        type: 'refund',
        amount: '50',
        referenceType: 'usage_record',
        referenceId: 'usage-x',
      })
      .run()
  })

  it('退款金額 ≤ 0 → 拒絕、餘額不變', async () => {
    await app.seed.organization({ id: 'org-2', name: 'Org2' })
    await app.seed.creditAccount({ orgId: 'org-2', balance: '100' })

    await scenario(app)
      .when.userRefundsCredit({ orgId: 'org-2', amount: '0', callerUserId: 'admin-1' })
      .then.creditBalanceIs('org-2', '100')
      .run()

    const result = app.lastResult.expect<{ success: boolean; error?: string }>()
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_AMOUNT')
  })

  it('退款不存在帳戶 → ACCOUNT_NOT_FOUND', async () => {
    await app.seed.organization({ id: 'org-3', name: 'Org3' })
    // no creditAccount seeded

    await scenario(app)
      .when.userRefundsCredit({ orgId: 'org-3', amount: '50', callerUserId: 'admin-1' })
      .run()

    const result = app.lastResult.expect<{ success: boolean; error?: string }>()
    expect(result.success).toBe(false)
    expect(result.error).toBe('ACCOUNT_NOT_FOUND')
  })
})
```

**註:** spec §9.1 #8 只列了 happy path,但這支 spec 順手把 0 與 not-found 兩條 negative 也驗了 — `RefundCreditService` 程式碼覆蓋率順帶完整。

- [ ] **Step 2: Run — expect PASS**

Run: `bun test tests/Acceptance/UseCases/Credit/refund-credit.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/Acceptance/UseCases/Credit/refund-credit.spec.ts
git commit -m "test: [acceptance] Credit pilot — refund-credit 場景"
```

---

## Task 15: Spec — `apply-usage-charges.spec.ts`(場景 #9,跨模組)

**Files:**
- Create: `tests/Acceptance/UseCases/Credit/apply-usage-charges.spec.ts`

**驗收目標:** ApplyUsageChargesService 處理多個 org 的 usage_records,逐筆呼叫 DeductCreditService;當扣到 0 時觸發 Credit ↔ ApiKey 跨模組 flow(與 #6 相同 handler)。

**TestClock 不需要:** PR-1 已驗證 service 不依賴目前時間;occurred_at 用 seed 帶入即可。

- [ ] **Step 1: 寫 spec**

File: `tests/Acceptance/UseCases/Credit/apply-usage-charges.spec.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { scenario } from '../../support/scenarios'
import { TestApp } from '../../support/TestApp'

describe('Use Case: ApplyUsageCharges 批次扣費', () => {
  let app: TestApp
  let keyGateway: string

  beforeAll(async () => {
    app = await TestApp.boot()
  })

  afterAll(async () => {
    await app.shutdown()
  })

  beforeEach(async () => {
    await app.reset()
    await app.seed.user({ id: 'admin-1', email: 'a@e.com', role: 'admin' })
    await app.seed.organization({ id: 'org-1', name: 'Org1' })
    await app.seed.creditAccount({ orgId: 'org-1', balance: '100' })
    const k = await app.seed.apiKey({
      id: 'key-1',
      orgId: 'org-1',
      createdByUserId: 'admin-1',
      label: 'k1',
      status: 'active',
      scope: { rateLimitRpm: 60, rateLimitTpm: 100000 },
    })
    keyGateway = k.gatewayKeyId
  })

  it('#9 三筆 usage 共 100 → 全部扣完、key 被自動 suspend、gateway rate limit 歸零', async () => {
    await scenario(app)
      .given.usageRecords({
        orgId: 'org-1',
        apiKeyId: 'key-1',
        records: [
          { creditCost: 30, occurredAt: '2026-04-01T00:00:00.000Z' },
          { creditCost: 30, occurredAt: '2026-04-02T00:00:00.000Z' },
          { creditCost: 40, occurredAt: '2026-04-03T00:00:00.000Z' },
        ],
      })

      .when.applyUsageCharges({ orgIds: ['org-1'] })

      .then.creditBalanceIs('org-1', '0')
      .then.apiKeyIsSuspended('key-1', { reason: 'CREDIT_DEPLETED' })
      .then.gatewayKeyRateLimit(keyGateway, { tokenMaxLimit: 0, requestMaxLimit: 0 })
      .then.domainEventsInclude([
        { eventType: 'credit.balance_depleted', data: { orgId: 'org-1' } },
      ])
      .run()

    const result = app.lastResult.expect<{
      processedOrgs: number
      chargedCount: number
      skippedCount: number
    }>()
    expect(result.processedOrgs).toBe(1)
    expect(result.chargedCount).toBe(3)
    expect(result.skippedCount).toBe(0)
  })

  it('idempotency — 第二次跑相同 usage 不重複扣', async () => {
    await app.seed.usageRecord({
      id: 'u-1',
      bifrostLogId: 'b-1',
      orgId: 'org-1',
      apiKeyId: 'key-1',
      model: 'gpt-4',
      creditCost: 20,
      occurredAt: '2026-04-01T00:00:00.000Z',
    })

    await scenario(app)
      .when.applyUsageCharges({ orgIds: ['org-1'] })
      .then.creditBalanceIs('org-1', '80')
      .run()

    await scenario(app)
      .when.applyUsageCharges({ orgIds: ['org-1'] })
      .then.creditBalanceIs('org-1', '80')
      .run()

    const result = app.lastResult.expect<{ chargedCount: number; skippedCount: number }>()
    expect(result.chargedCount).toBe(0)
    expect(result.skippedCount).toBe(1)
  })

  it('未存在帳戶的 org → 進入 missingAccountOrgIds', async () => {
    await scenario(app).when.applyUsageCharges({ orgIds: ['org-not-exists'] }).run()
    const result = app.lastResult.expect<{
      missingAccountOrgIds: readonly string[]
      chargedCount: number
    }>()
    expect(result.missingAccountOrgIds).toEqual(['org-not-exists'])
    expect(result.chargedCount).toBe(0)
  })
})
```

- [ ] **Step 2: Run — expect PASS**

Run: `bun test tests/Acceptance/UseCases/Credit/apply-usage-charges.spec.ts`
Expected: PASS

如失敗常見原因:
- idempotency unique index 沒生效 → 看 migration `2026_04_18_000001_add_unique_usage_deduction_index_to_credit_transactions`,應 create 了 `uniq_credit_usage_deduction`。
- usage_records.credit_cost REAL 型別 — seed 傳 number;service 內 `normalizeAmount(0.5)` 回傳 `'0.5'`,與 Balance string 比對 OK。

- [ ] **Step 3: Commit**

```bash
git add tests/Acceptance/UseCases/Credit/apply-usage-charges.spec.ts
git commit -m "test: [acceptance] Credit pilot — apply-usage-charges(含 idempotency 與 missing account)"
```

---

## Task 16: Spec — `credit-endpoints.spec.ts`(API Contract,3 endpoints × 3 scenarios)

**Files:**
- Create: `tests/Acceptance/ApiContract/credit-endpoints.spec.ts`

**對應 spec §9.2**(已依實際行為調整 — 見本計畫 §「與 spec §9.2 對齊修正」)。

- [ ] **Step 1: 寫 spec**

File: `tests/Acceptance/ApiContract/credit-endpoints.spec.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from '../support/TestApp'

describe('API Contract: /api/organizations/:orgId/credits/*', () => {
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

  // ──────────────────────────────────────────────────────────────────────────────
  describe('POST /api/organizations/:orgId/credits/topup', () => {
    it('admin → 200 + balance 更新', async () => {
      await app.seed.user({ id: 'admin-1', email: 'a@e.com', role: 'admin' })
      await app.seed.organization({ id: 'org-1', name: 'O' })
      await app.seed.creditAccount({ orgId: 'org-1', balance: '0' })

      const res = await app.http.post('/api/organizations/org-1/credits/topup', {
        body: { amount: '500' },
        headers: app.auth.bearerHeaderFor({
          userId: 'admin-1',
          email: 'a@e.com',
          role: 'admin',
        }),
      })

      expect(res.status).toBe(200)
      const json = (await res.json()) as { success: boolean; data?: { balance: string } }
      expect(json.success).toBe(true)
      expect(json.data?.balance).toBe('500')

      const acc = await app.db.table('credit_accounts').where('org_id', '=', 'org-1').first()
      expect((acc as { balance: string }).balance).toBe('500')
    })

    it('非 admin(user role)→ 403 FORBIDDEN', async () => {
      await app.seed.user({ id: 'u-1', email: 'u@e.com', role: 'user' })
      await app.seed.organization({ id: 'org-1', name: 'O' })
      await app.seed.creditAccount({ orgId: 'org-1', balance: '0' })
      // user 必須通過 ModuleAccess (對非 admin 需要 module subscription)
      await app.seed.allCoreAppModules()
      const mods = await app.db.table('app_modules').where('name', '=', 'credit').first()
      await app.seed.moduleSubscription({ orgId: 'org-1', moduleId: (mods as { id: string }).id })

      const res = await app.http.post('/api/organizations/org-1/credits/topup', {
        body: { amount: '500' },
        headers: app.auth.bearerHeaderFor({ userId: 'u-1', email: 'u@e.com', role: 'user' }),
      })

      expect(res.status).toBe(403)
      const json = (await res.json()) as { error?: string }
      expect(json.error).toBe('FORBIDDEN')
    })

    it('缺欄位(無 amount)→ 422 含 Zod 訊息', async () => {
      await app.seed.user({ id: 'admin-1', email: 'a@e.com', role: 'admin' })
      await app.seed.organization({ id: 'org-1', name: 'O' })
      await app.seed.creditAccount({ orgId: 'org-1', balance: '0' })

      const res = await app.http.post('/api/organizations/org-1/credits/topup', {
        body: {}, // 無 amount
        headers: app.auth.bearerHeaderFor({
          userId: 'admin-1',
          email: 'a@e.com',
          role: 'admin',
        }),
      })

      expect(res.status).toBe(422)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  describe('GET /api/organizations/:orgId/credits/balance', () => {
    it('組織成員 → 200 + 正確 balance', async () => {
      await app.seed.user({ id: 'u-1', email: 'u@e.com', role: 'user' })
      await app.seed.organization({ id: 'org-1', name: 'O' })
      await app.seed.orgMember({ orgId: 'org-1', userId: 'u-1', role: 'member' })
      await app.seed.creditAccount({ orgId: 'org-1', balance: '777' })
      await app.seed.allCoreAppModules()
      const mods = await app.db.table('app_modules').where('name', '=', 'credit').first()
      await app.seed.moduleSubscription({ orgId: 'org-1', moduleId: (mods as { id: string }).id })

      const res = await app.http.get('/api/organizations/org-1/credits/balance', {
        headers: app.auth.bearerHeaderFor({ userId: 'u-1', email: 'u@e.com', role: 'user' }),
      })

      expect(res.status).toBe(200)
      const json = (await res.json()) as { success: boolean; data?: { balance: string } }
      expect(json.success).toBe(true)
      expect(json.data?.balance).toBe('777')
    })

    it('未認證 → 401 UNAUTHORIZED', async () => {
      const res = await app.http.get('/api/organizations/org-1/credits/balance')
      expect(res.status).toBe(401)
      const json = (await res.json()) as { error?: string }
      expect(json.error).toBe('UNAUTHORIZED')
    })

    it('非組織成員 → 200 + success:false + NOT_ORG_MEMBER', async () => {
      await app.seed.user({ id: 'u-2', email: 'x@e.com', role: 'user' })
      await app.seed.organization({ id: 'org-1', name: 'O' })
      await app.seed.creditAccount({ orgId: 'org-1', balance: '500' })
      await app.seed.allCoreAppModules()
      const mods = await app.db.table('app_modules').where('name', '=', 'credit').first()
      await app.seed.moduleSubscription({ orgId: 'org-1', moduleId: (mods as { id: string }).id })

      const res = await app.http.get('/api/organizations/org-1/credits/balance', {
        headers: app.auth.bearerHeaderFor({ userId: 'u-2', email: 'x@e.com', role: 'user' }),
      })

      expect(res.status).toBe(200)
      const json = (await res.json()) as { success: boolean; error?: string }
      expect(json.success).toBe(false)
      expect(json.error).toBe('NOT_ORG_MEMBER')
    })
  })

  // ──────────────────────────────────────────────────────────────────────────────
  describe('GET /api/organizations/:orgId/credits/transactions', () => {
    it('組織成員 → 200 + 分頁', async () => {
      await app.seed.user({ id: 'u-1', email: 'u@e.com', role: 'user' })
      await app.seed.organization({ id: 'org-1', name: 'O' })
      await app.seed.orgMember({ orgId: 'org-1', userId: 'u-1', role: 'member' })
      await app.seed.creditAccount({ orgId: 'org-1', balance: '500' })
      await app.seed.allCoreAppModules()
      const mods = await app.db.table('app_modules').where('name', '=', 'credit').first()
      await app.seed.moduleSubscription({ orgId: 'org-1', moduleId: (mods as { id: string }).id })

      const res = await app.http.get('/api/organizations/org-1/credits/transactions', {
        headers: app.auth.bearerHeaderFor({ userId: 'u-1', email: 'u@e.com', role: 'user' }),
        query: { page: 1, limit: 10 },
      })

      expect(res.status).toBe(200)
      const json = (await res.json()) as {
        success: boolean
        data?: { transactions: unknown[]; total: number; page: number; limit: number }
      }
      expect(json.success).toBe(true)
      expect(json.data?.page).toBe(1)
      expect(json.data?.limit).toBe(10)
      expect(Array.isArray(json.data?.transactions)).toBe(true)
    })

    it('未認證 → 401', async () => {
      const res = await app.http.get('/api/organizations/org-1/credits/transactions')
      expect(res.status).toBe(401)
    })

    it('非組織成員 → 200 + NOT_ORG_MEMBER', async () => {
      await app.seed.user({ id: 'u-2', email: 'x@e.com', role: 'user' })
      await app.seed.organization({ id: 'org-1', name: 'O' })
      await app.seed.creditAccount({ orgId: 'org-1', balance: '500' })
      await app.seed.allCoreAppModules()
      const mods = await app.db.table('app_modules').where('name', '=', 'credit').first()
      await app.seed.moduleSubscription({ orgId: 'org-1', moduleId: (mods as { id: string }).id })

      const res = await app.http.get('/api/organizations/org-1/credits/transactions', {
        headers: app.auth.bearerHeaderFor({ userId: 'u-2', email: 'x@e.com', role: 'user' }),
      })

      expect(res.status).toBe(200)
      const json = (await res.json()) as { error?: string }
      expect(json.error).toBe('NOT_ORG_MEMBER')
    })
  })
})
```

**注意事項:**
- ModuleAccess middleware 對 admin 直接放行;對 user role 則需要該 org 訂閱了 `credit` module。所以非 admin 場景一律要 seed `app_modules` + `module_subscriptions`。
- 422 由 `@gravito/impulse` Zod validator 回;如實際是 400,請看 `TopUpRequest` schema 與 framework wiring(`SchemaCache.registerValidators(...)` 在 bootstrap 內)。若 framework 預設回 400 而非 422,本 task **改為驗 400** 並更新本文件 §「與 spec 對齊修正」表格 — 以實際為準。

- [ ] **Step 2: Run — expect PASS**

Run: `bun test tests/Acceptance/ApiContract/credit-endpoints.spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/Acceptance/ApiContract/credit-endpoints.spec.ts
git commit -m "test: [acceptance] Credit API contract — 3 endpoints × 3 scenarios"
```

---

## Task 17: 全量驗證 + lint + typecheck

**Files:**(無新檔)

- [ ] **Step 1: 全量 acceptance**

Run: `bun run test:acceptance`
Expected: 所有 spec 全綠

- [ ] **Step 2: 既有 unit / integration 測試**

Run: `bun run test`
Expected: PASS(包含 PR-1 期間留下的 `CreditEventFlow.integration.test.ts` — PR-3 才會刪)

- [ ] **Step 3: typecheck + lint**

Run: `bun run typecheck && bun run lint`
Expected: PASS

- [ ] **Step 4: 全量 `check`**

Run: `bun run check`
Expected: PASS(PR-1 階段 `check` 尚未把 acceptance 加入;本步驟只跑 typecheck + lint + test)

- [ ] **Step 5: Commit(若有 lint auto-fix)**

```bash
git status
# 如有 lint 自動修正過的檔案:
git add -u
git commit -m "chore: [acceptance] lint fixes after PR-2"
```

---

## Self-Review 備忘

執行完所有 task 後,逐條對照 spec §13 PR-2:

| Spec 交付物 | 計畫中的 Task |
|------------|---------------|
| `tests/Acceptance/UseCases/Credit/*.spec.ts`(9 場景) | Tasks 10–15(共 6 spec 檔涵蓋 9 場景;Task 14 順帶補了 refund 的 negative case) |
| `tests/Acceptance/ApiContract/credit-endpoints.spec.ts`(3 endpoint × 3 場景)| Task 16 |
| 補齊 given/when/then helpers(credit、apiKey、organization、gateway、events) | Tasks 7、8、9 |

加分項:
- `app.http`、`app.auth`、`app.seed` — Tasks 2、3、4(spec §4.2 的 handle API 完整實作)
- `lastResult` — Tasks 1 + 5(避免 then.* 從 chain 取值的耦合)

PR-3 仍保留:
- 刪除 `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts`
- 寫 `docs/draupnir/specs/5-testing-validation/acceptance-layer.md`
- 在 `check` script 加入 `test:acceptance`
- CI workflow 更新

---

## 執行後的驗收門檻

```bash
bun run typecheck                       # PASS
bun run lint                            # PASS
bun run test                            # 既有單元測試 PASS(含 PR-1 新增)
bun run test:acceptance                 # smoke + smoke-db + 6 use case + 1 api contract + helpers tests 全綠
```

PR-3 開工前,acceptance 套件需穩定跑通數次(`bun run test:acceptance` 連跑 3 次無 flake)。
