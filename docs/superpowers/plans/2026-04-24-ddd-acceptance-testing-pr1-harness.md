# DDD 驗收測試 PR-1（Harness + Port 基礎建設）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Draupnir 驗收測試層的 harness 與 port 基礎建設，讓後續 PR-2 的 Credit pilot specs 能在真實 DI wiring + 真實 SQLite DB 上運行。

**Architecture:**
- 新增 `IClock` port（`src/Shared/Application/Ports/IClock.ts`），配對 production `SystemClock` 與 test `TestClock`；在 `CreditServiceProvider` 註冊 `clock` singleton。
- `DomainEventDispatcher` 擴充 observer API，讓 harness 能觀察所有 dispatch 事件而不攔截既有 handlers。
- `src/bootstrap.ts` 新增 `afterRegister` hook，讓 TestApp 能在所有 provider register 完畢、但 `core.bootstrap()` 的 boot hooks 尚未觸發前，rebind 外部 port 為 fakes。
- `TestApp.boot/reset/shutdown`：per-worker SQLite tmp 檔 + Atlas migrator、per-test `PRAGMA foreign_keys=OFF` + delete、rebind `clock`/`llmGatewayClient`/`scheduler` 為 fakes、觀察 domain events 進 `app.events[]`。
- 兩支 smoke spec 驗 harness 本身；PR-1 **不含** `app.http` 與業務 DSL helpers（那是 PR-2 範圍）。

**Tech Stack:** TypeScript 5.x / Bun runtime / vitest（acceptance layer）/ @gravito/atlas（Migrator、SQLite connection）/ @libsql/client / 現有 `MockGatewayClient`。

---

## 範圍確認（Scope Note）

本計畫僅涵蓋 spec §13 的 **PR-1**。PR-2（9 支 Use Case specs + 3 支 API Contract specs + given/when/then helpers）與 PR-3（刪除過時 integration test + 方法論文件 + CI）為後續獨立計畫。

「不在 PR-1」清單：
- `app.http`（in-process HTTP 客戶端）— PR-2
- `app.auth` / `app.seed`（API contract 用的 seed helper）— PR-2
- 業務語言的 given/when/then helpers（`given.creditAccount` 等實作）— PR-2
- 刪除 `CreditEventFlow.integration.test.ts`、新增 `docs/draupnir/specs/5-testing-validation/acceptance-layer.md`、CI workflow — PR-3

---

## File Structure

### 新建檔案

| Path | 責任 |
|------|------|
| `src/Shared/Application/Ports/IClock.ts` | `IClock` interface — `now(): Date`、`nowIso(): string` |
| `src/Shared/Infrastructure/Services/SystemClock.ts` | `SystemClock implements IClock` — 直接走 `new Date()` |
| `src/Shared/Infrastructure/Services/__tests__/SystemClock.test.ts` | `SystemClock` 單元測試 |
| `src/Shared/Domain/__tests__/DomainEventDispatcher.test.ts` | 擴充後 observer 行為的單元測試 |
| `src/Modules/Credit/__tests__/CreditServiceProvider.clock.test.ts` | 驗證 Credit ServiceProvider 註冊 `clock` singleton |
| `tests/Acceptance/support/TestApp.ts` | Harness 入口；`boot()/reset()/shutdown()` |
| `tests/Acceptance/support/TestClock.ts` | `TestClock implements IClock`；`setNow(date)`、`advance(ms)` |
| `tests/Acceptance/support/__tests__/TestClock.test.ts` | `TestClock` 單元測試 |
| `tests/Acceptance/support/fakes/ManualScheduler.ts` | `ManualScheduler implements IScheduler`；不真跑 cron，提供 `trigger(name)` |
| `tests/Acceptance/support/__tests__/ManualScheduler.test.ts` | `ManualScheduler` 單元測試 |
| `tests/Acceptance/support/db/migrate.ts` | 接收 sqlite 連線設定，跑 Atlas Migrator 到最新 |
| `tests/Acceptance/support/db/truncate.ts` | 以 FK-off + delete 清空所有表 |
| `tests/Acceptance/support/db/tables.ts` | 列出要清空的資料表（集中管理，方便新增） |
| `tests/Acceptance/support/scenarios/index.ts` | `scenario(app)` 入口 |
| `tests/Acceptance/support/scenarios/runner.ts` | Builder 骨架：`given/when/then` namespace + `.run()` |
| `tests/Acceptance/support/scenarios/given/index.ts` | Empty given namespace（PR-2 填內容） |
| `tests/Acceptance/support/scenarios/when/index.ts` | Empty when namespace |
| `tests/Acceptance/support/scenarios/then/index.ts` | Empty then namespace |
| `tests/Acceptance/support/__tests__/scenarioRunner.test.ts` | Scenario runner 單元測試 |
| `tests/Acceptance/smoke.spec.ts` | Harness smoke：boot/reset/shutdown、container、events、clock |
| `tests/Acceptance/smoke-db.spec.ts` | DB smoke：migrate + truncate 真實行為 |

### 要修改的檔案

| Path | 修改內容 |
|------|---------|
| `src/Shared/Domain/DomainEventDispatcher.ts` | 新增 observer API（`addObserver`/`removeObserver`/`clearObservers`），`dispatch()` 在呼叫 handlers 前通知所有 observers |
| `src/bootstrap.ts` | 新增 optional `hooks.afterRegister(core)` 參數，在所有 provider `core.register(...)` 完畢後、`core.bootstrap()` 之前呼叫 |
| `src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts` | 新增 `registerInfraServices` override，註冊 `container.singleton('clock', () => new SystemClock())` |
| `package.json` | 新增 `test:acceptance` 與 `test:acceptance:watch` script |

---

## Task 1: 新增 `IClock` port interface

**Files:**
- Create: `src/Shared/Application/Ports/IClock.ts`

**說明：** 純 TypeScript interface，沒有可執行的行為；無需 TDD。後續 Task 2 的 SystemClock 會 `implements IClock`，TypeScript 會幫我們驗 shape。

- [ ] **Step 1: 建立 `src/Shared/Application/Ports/IClock.ts`**

```typescript
/**
 * Clock abstraction — test 可以注入 TestClock 以控制時間。
 *
 * 只放「目前時間」這件事；週期排程請走 IScheduler。
 */
export interface IClock {
  /** Current wall-clock time as a Date instance. */
  now(): Date
  /** Current time formatted as ISO-8601 string (convenience — equivalent to `now().toISOString()`). */
  nowIso(): string
}
```

- [ ] **Step 2: 執行 typecheck 驗證**

Run: `bun run typecheck`
Expected: PASS（新增純 interface 不會造成錯誤）

- [ ] **Step 3: Commit**

```bash
git add src/Shared/Application/Ports/IClock.ts
git commit -m "feat: [shared] 新增 IClock port interface"
```

---

## Task 2: 實作 `SystemClock`（TDD）

**Files:**
- Create: `src/Shared/Infrastructure/Services/SystemClock.ts`
- Test: `src/Shared/Infrastructure/Services/__tests__/SystemClock.test.ts`

- [ ] **Step 1: 建立 test 目錄（若不存在）並寫 failing test**

File: `src/Shared/Infrastructure/Services/__tests__/SystemClock.test.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { SystemClock } from '../SystemClock'

describe('SystemClock', () => {
  it('now() 回傳接近系統時間的 Date', () => {
    const clock = new SystemClock()
    const before = Date.now()
    const result = clock.now()
    const after = Date.now()

    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBeGreaterThanOrEqual(before)
    expect(result.getTime()).toBeLessThanOrEqual(after)
  })

  it('nowIso() 回傳 ISO-8601 字串並與 now() 一致', () => {
    const clock = new SystemClock()
    const iso = clock.nowIso()

    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/)
    // 再呼叫一次 now() 並比較（允許毫秒級飄移）
    expect(Math.abs(new Date(iso).getTime() - clock.now().getTime())).toBeLessThan(100)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `bun test src/Shared/Infrastructure/Services/__tests__/SystemClock.test.ts`
Expected: FAIL（`Cannot find module '../SystemClock'`）

- [ ] **Step 3: 建立實作**

File: `src/Shared/Infrastructure/Services/SystemClock.ts`

```typescript
import type { IClock } from '@/Shared/Application/Ports/IClock'

/**
 * Production clock — delegates to the system wall clock.
 *
 * @remarks
 * Tests must not depend on this class directly; inject `IClock` and use `TestClock` in acceptance tests.
 */
export class SystemClock implements IClock {
  now(): Date {
    return new Date()
  }

  nowIso(): string {
    return new Date().toISOString()
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `bun test src/Shared/Infrastructure/Services/__tests__/SystemClock.test.ts`
Expected: PASS（2 tests）

- [ ] **Step 5: Commit**

```bash
git add src/Shared/Infrastructure/Services/SystemClock.ts src/Shared/Infrastructure/Services/__tests__/SystemClock.test.ts
git commit -m "feat: [shared] 新增 SystemClock 實作 IClock"
```

---

## Task 3: 擴充 `DomainEventDispatcher` observer API（TDD）

**Files:**
- Modify: `src/Shared/Domain/DomainEventDispatcher.ts`
- Test: `src/Shared/Domain/__tests__/DomainEventDispatcher.test.ts`

**為何需要：** TestApp 要捕捉所有 dispatch 的 event 進 `app.events[]`，不該攔截或改變原本 handlers 的 dispatch 行為（spec §6.5 原則）。新增 observer API 是最少侵入性的作法，也順帶解 spec §15 第二項 open question。

- [ ] **Step 1: 建立 test 檔並寫 failing tests**

File: `src/Shared/Domain/__tests__/DomainEventDispatcher.test.ts`

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DomainEvent } from '../DomainEvent'
import { DomainEventDispatcher } from '../DomainEventDispatcher'

function makeEvent(eventType: string, data: Record<string, unknown> = {}): DomainEvent {
  return {
    eventType,
    occurredAt: new Date(),
    data,
  } as DomainEvent
}

describe('DomainEventDispatcher — observer API', () => {
  beforeEach(() => {
    DomainEventDispatcher.resetForTesting()
  })

  it('addObserver 註冊後，dispatch 會將 event 傳給 observer', async () => {
    const dispatcher = DomainEventDispatcher.getInstance()
    const observer = vi.fn()
    dispatcher.addObserver(observer)

    const event = makeEvent('credit.topped_up', { orgId: 'org-1' })
    await dispatcher.dispatch(event)

    expect(observer).toHaveBeenCalledTimes(1)
    expect(observer).toHaveBeenCalledWith(event)
  })

  it('observer 錯誤不影響既有 handler 執行', async () => {
    const dispatcher = DomainEventDispatcher.getInstance()
    const handler = vi.fn().mockResolvedValue(undefined)
    const badObserver = vi.fn().mockRejectedValue(new Error('boom'))

    dispatcher.on('x.y', handler)
    dispatcher.addObserver(badObserver)

    await dispatcher.dispatch(makeEvent('x.y'))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(badObserver).toHaveBeenCalledTimes(1)
  })

  it('addObserver 回傳的 unsubscribe 函式會移除 observer', async () => {
    const dispatcher = DomainEventDispatcher.getInstance()
    const observer = vi.fn()
    const unsubscribe = dispatcher.addObserver(observer)

    await dispatcher.dispatch(makeEvent('a.b'))
    unsubscribe()
    await dispatcher.dispatch(makeEvent('a.b'))

    expect(observer).toHaveBeenCalledTimes(1)
  })

  it('clearObservers 移除所有 observers 但保留 handlers', async () => {
    const dispatcher = DomainEventDispatcher.getInstance()
    const observer = vi.fn()
    const handler = vi.fn().mockResolvedValue(undefined)

    dispatcher.addObserver(observer)
    dispatcher.on('a.b', handler)
    dispatcher.clearObservers()

    await dispatcher.dispatch(makeEvent('a.b'))

    expect(observer).not.toHaveBeenCalled()
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `bun test src/Shared/Domain/__tests__/DomainEventDispatcher.test.ts`
Expected: FAIL（`dispatcher.addObserver is not a function`）

- [ ] **Step 3: 修改 `DomainEventDispatcher` 新增 observer API**

File: `src/Shared/Domain/DomainEventDispatcher.ts`（完整覆寫；保留既有 JSDoc 主體）

```typescript
// src/Shared/Domain/DomainEventDispatcher.ts
import type { DomainEvent } from './DomainEvent'

type EventHandler = (event: DomainEvent) => Promise<void>
type EventObserver = (event: DomainEvent) => void | Promise<void>

/**
 * Synchronous Domain Event Dispatcher (Singleton).
 *
 * After registering handlers, call dispatch() to trigger the corresponding
 * handlers in sequence. Designed as fire-and-forget: handler failures are
 * logged but do not interrupt the flow.
 *
 * Observers are a non-intrusive side channel — they receive every dispatched
 * event (for test capture, debug logging, etc.) without affecting handler
 * invocation order or outcome.
 */
export class DomainEventDispatcher {
  private static instance: DomainEventDispatcher | null = null
  private readonly handlers = new Map<string, EventHandler[]>()
  private observers: readonly EventObserver[] = []

  private constructor() {}

  static getInstance(): DomainEventDispatcher {
    if (!DomainEventDispatcher.instance) {
      DomainEventDispatcher.instance = new DomainEventDispatcher()
    }
    return DomainEventDispatcher.instance
  }

  /** @internal Only for testing purposes. */
  static resetForTesting(): void {
    DomainEventDispatcher.instance = null
  }

  on(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? []
    this.handlers.set(eventType, [...existing, handler])
  }

  /**
   * Register an observer that receives every dispatched event.
   *
   * @returns unsubscribe function to remove this observer.
   */
  addObserver(observer: EventObserver): () => void {
    this.observers = [...this.observers, observer]
    return () => this.removeObserver(observer)
  }

  removeObserver(observer: EventObserver): void {
    this.observers = this.observers.filter((o) => o !== observer)
  }

  clearObservers(): void {
    this.observers = []
  }

  async dispatch(event: DomainEvent): Promise<void> {
    for (const observer of this.observers) {
      try {
        await observer(event)
      } catch (error: unknown) {
        console.error(`Event observer failed [${event.eventType}]:`, error)
      }
    }
    const handlers = this.handlers.get(event.eventType) ?? []
    for (const handler of handlers) {
      try {
        await handler(event)
      } catch (error: unknown) {
        console.error(`Event handler failed [${event.eventType}]:`, error)
      }
    }
  }

  async dispatchAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.dispatch(event)
    }
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `bun test src/Shared/Domain/__tests__/DomainEventDispatcher.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: 執行 typecheck + 既有 Shared 測試，確認未破壞**

Run: `bun run typecheck && bun test src/Shared`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/Shared/Domain/DomainEventDispatcher.ts src/Shared/Domain/__tests__/DomainEventDispatcher.test.ts
git commit -m "feat: [shared] DomainEventDispatcher 新增 observer API"
```

---

## Task 4: 在 `bootstrap.ts` 新增 `afterRegister` hook

**Files:**
- Modify: `src/bootstrap.ts`

**為何需要：** TestApp 必須在「providers 全部 register 完、但 boot hooks 尚未跑」的時機 rebind 外部 port 為 fakes。`CreditServiceProvider.boot()` 會 `DomainEventDispatcher.on('credit.balance_depleted', ...)`，handler 內部用 `container.make('handleBalanceDepletedService')` 延遲解析。雖然延遲解析仍會讀到最新 binding，但把 rebind 移到 boot 之前可以避免任何 boot 自身就會觸發的 side effect 用到 prod fake。

**不寫獨立單元測試：** hook 行為由 Task 12 的 smoke spec 端到端驗證（端到端 bootstrap 是 integration 層面）。

- [ ] **Step 1: 修改 `src/bootstrap.ts`**

於檔案頂部（import 區下方、`function isJobRegistrar(...)` 之前）新增型別匯出：

```typescript
export interface BootstrapHooks {
  /**
   * Runs after every provider's `register()` has populated the container but
   * before `core.bootstrap()` fires `boot()` hooks. Use this to rebind external
   * Port bindings to test fakes.
   */
  readonly afterRegister?: (core: PlanetCore) => void | Promise<void>
}
```

修改 `bootstrap` 函式 signature 與實作：

```typescript
export async function bootstrap(port = 3000, hooks?: BootstrapHooks): Promise<PlanetCore> {
  // ... 既有程式碼直到 for (const module of modules) { core.register(...) } 結束 ...

  for (const module of modules) {
    core.register(createGravitoServiceProvider(module))
  }

  if (hooks?.afterRegister) {
    await hooks.afterRegister(core)
  }

  await core.bootstrap()

  // ... 其餘既有程式碼（middleware、warmInertia、routes、jobs、queue、errorHandlers）保持不變 ...
}
```

`export default bootstrap` 保持不變。

- [ ] **Step 2: Typecheck + 既有 wiring 測試確認不破壞**

Run: `bun run typecheck && bun test src/wiring`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/bootstrap.ts
git commit -m "feat: [bootstrap] 新增 afterRegister hook 供 acceptance harness rebind 測試 fakes"
```

---

## Task 5: `CreditServiceProvider` 註冊 `clock` singleton（TDD）

**Files:**
- Modify: `src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts`
- Test: `src/Modules/Credit/__tests__/CreditServiceProvider.clock.test.ts`

**說明：** 依 spec §13 PR-1 要求，由 Credit ServiceProvider 註冊 `clock` binding。不改 `ApplyUsageChargesService` constructor — 那是 PR-2 的工作（或依風險 §14 結論放棄注入）。

- [ ] **Step 1: 寫 failing test**

File: `src/Modules/Credit/__tests__/CreditServiceProvider.clock.test.ts`

```typescript
import { describe, expect, it } from 'vitest'
import type { IClock } from '@/Shared/Application/Ports/IClock'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { SystemClock } from '@/Shared/Infrastructure/Services/SystemClock'
import { CreditServiceProvider } from '../Infrastructure/Providers/CreditServiceProvider'

function makeContainer(): IContainer & {
  readonly singletons: Map<string, () => unknown>
  readonly binds: Map<string, () => unknown>
} {
  const singletons = new Map<string, () => unknown>()
  const binds = new Map<string, () => unknown>()
  const container: IContainer = {
    singleton(name, factory) {
      singletons.set(name, () => factory(container))
    },
    bind(name, factory) {
      binds.set(name, () => factory(container))
    },
    make(name) {
      const s = singletons.get(name)
      if (s) return s()
      const b = binds.get(name)
      if (b) return b()
      throw new Error(`not registered: ${name}`)
    },
  }
  return Object.assign(container, { singletons, binds })
}

describe('CreditServiceProvider — clock binding', () => {
  it('registerInfraServices 註冊 clock singleton 為 SystemClock', () => {
    const container = makeContainer()
    const provider = new CreditServiceProvider()
    provider.register(container)

    expect(container.singletons.has('clock')).toBe(true)
    const clock = container.make('clock') as IClock
    expect(clock).toBeInstanceOf(SystemClock)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `bun test src/Modules/Credit/__tests__/CreditServiceProvider.clock.test.ts`
Expected: FAIL（`not registered: clock`）

- [ ] **Step 3: 新增 `registerInfraServices` override**

在 `src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts` 最上方 import 區加入：

```typescript
import { SystemClock } from '@/Shared/Infrastructure/Services/SystemClock'
```

在 class 內、`registerRepositories` 與 `registerApplicationServices` 之間加入：

```typescript
  protected override registerInfraServices(container: IContainer): void {
    container.singleton('clock', () => new SystemClock())
  }
```

- [ ] **Step 4: Run test — verify it passes**

Run: `bun test src/Modules/Credit/__tests__/CreditServiceProvider.clock.test.ts`
Expected: PASS

- [ ] **Step 5: 跑 Credit 全部單元測試，確認未破壞**

Run: `bun test src/Modules/Credit`
Expected: 所有既有測試仍然 PASS

- [ ] **Step 6: Commit**

```bash
git add src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider.ts src/Modules/Credit/__tests__/CreditServiceProvider.clock.test.ts
git commit -m "feat: [credit] ServiceProvider 註冊 clock singleton"
```

---

## Task 6: 實作 `TestClock`（TDD）

**Files:**
- Create: `tests/Acceptance/support/TestClock.ts`
- Test: `tests/Acceptance/support/__tests__/TestClock.test.ts`

**說明：** 測試專用 fake clock。不用 `vi.useFakeTimers`（與 real DB / HTTP 衝突）。

- [ ] **Step 1: 建 test 目錄並寫 failing test**

File: `tests/Acceptance/support/__tests__/TestClock.test.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { TestClock } from '../TestClock'

describe('TestClock', () => {
  it('預設 now 為 constructor 傳入的時間', () => {
    const initial = new Date('2026-01-01T00:00:00.000Z')
    const clock = new TestClock(initial)

    expect(clock.now().toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect(clock.nowIso()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('setNow 會改變 now()', () => {
    const clock = new TestClock(new Date('2026-01-01T00:00:00.000Z'))
    clock.setNow(new Date('2026-06-15T12:00:00.000Z'))

    expect(clock.nowIso()).toBe('2026-06-15T12:00:00.000Z')
  })

  it('advance(ms) 會往前推進指定毫秒', () => {
    const clock = new TestClock(new Date('2026-01-01T00:00:00.000Z'))
    clock.advance(1000 * 60 * 60 * 24) // 1 day

    expect(clock.nowIso()).toBe('2026-01-02T00:00:00.000Z')
  })

  it('now() 每次回傳新的 Date 實例（避免 caller mutate）', () => {
    const clock = new TestClock(new Date('2026-01-01T00:00:00.000Z'))
    const a = clock.now()
    const b = clock.now()

    expect(a).not.toBe(b)
    expect(a.getTime()).toBe(b.getTime())
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `bun test tests/Acceptance/support/__tests__/TestClock.test.ts`
Expected: FAIL（module not found）

- [ ] **Step 3: 建立實作**

File: `tests/Acceptance/support/TestClock.ts`

```typescript
import type { IClock } from '@/Shared/Application/Ports/IClock'

/**
 * Test fake for IClock. Controlled explicitly via setNow / advance — never
 * drifts unless the test asks it to.
 *
 * @remarks
 * Do not use `vi.useFakeTimers()` alongside TestClock — it interferes with the
 * real DB driver (libsql) and HTTP in-process harness.
 */
export class TestClock implements IClock {
  private current: Date

  constructor(initial: Date = new Date('2026-01-01T00:00:00.000Z')) {
    this.current = new Date(initial.getTime())
  }

  now(): Date {
    return new Date(this.current.getTime())
  }

  nowIso(): string {
    return this.current.toISOString()
  }

  setNow(date: Date): void {
    this.current = new Date(date.getTime())
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms)
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `bun test tests/Acceptance/support/__tests__/TestClock.test.ts`
Expected: PASS（4 tests）

- [ ] **Step 5: Commit**

```bash
git add tests/Acceptance/support/TestClock.ts tests/Acceptance/support/__tests__/TestClock.test.ts
git commit -m "feat: [acceptance] 新增 TestClock fake"
```

---

## Task 7: 實作 `ManualScheduler`（TDD）

**Files:**
- Create: `tests/Acceptance/support/fakes/ManualScheduler.ts`
- Test: `tests/Acceptance/support/__tests__/ManualScheduler.test.ts`

**說明：** 取代 `CronerScheduler`，不實際啟動 cron。儲存註冊的 handler，測試可手動 `trigger(name)` 執行。

- [ ] **Step 1: 寫 failing test**

File: `tests/Acceptance/support/__tests__/ManualScheduler.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest'
import { ManualScheduler } from '../fakes/ManualScheduler'

describe('ManualScheduler', () => {
  it('schedule 註冊的 handler 不會自動執行', async () => {
    const scheduler = new ManualScheduler()
    const handler = vi.fn().mockResolvedValue(undefined)

    scheduler.schedule({ name: 'nightly', cron: '0 0 * * *' }, handler)

    // 等一個 microtask 也不該觸發
    await Promise.resolve()
    expect(handler).not.toHaveBeenCalled()
  })

  it('trigger(name) 會執行對應 handler', async () => {
    const scheduler = new ManualScheduler()
    const handler = vi.fn().mockResolvedValue(undefined)
    scheduler.schedule({ name: 'nightly', cron: '0 0 * * *' }, handler)

    await scheduler.trigger('nightly')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('trigger(name) 對未註冊 job 拋清楚錯誤', async () => {
    const scheduler = new ManualScheduler()
    await expect(scheduler.trigger('no-such-job')).rejects.toThrow(/no-such-job/)
  })

  it('has / unschedule 正確運作', () => {
    const scheduler = new ManualScheduler()
    scheduler.schedule({ name: 'nightly', cron: '0 0 * * *' }, async () => {})

    expect(scheduler.has('nightly')).toBe(true)
    scheduler.unschedule('nightly')
    expect(scheduler.has('nightly')).toBe(false)
  })

  it('stopAll 清空所有 jobs', () => {
    const scheduler = new ManualScheduler()
    scheduler.schedule({ name: 'a', cron: '* * * * *' }, async () => {})
    scheduler.schedule({ name: 'b', cron: '* * * * *' }, async () => {})

    scheduler.stopAll()

    expect(scheduler.has('a')).toBe(false)
    expect(scheduler.has('b')).toBe(false)
    expect(scheduler.registeredJobs()).toEqual([])
  })

  it('registeredJobs 回傳目前已註冊 job 名稱（依註冊順序）', () => {
    const scheduler = new ManualScheduler()
    scheduler.schedule({ name: 'b', cron: '* * * * *' }, async () => {})
    scheduler.schedule({ name: 'a', cron: '* * * * *' }, async () => {})

    expect(scheduler.registeredJobs()).toEqual(['b', 'a'])
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `bun test tests/Acceptance/support/__tests__/ManualScheduler.test.ts`
Expected: FAIL（module not found）

- [ ] **Step 3: 建立實作**

File: `tests/Acceptance/support/fakes/ManualScheduler.ts`

```typescript
import type {
  IScheduler,
  JobSpec,
} from '@/Foundation/Infrastructure/Ports/Scheduler/IScheduler'

interface Registration {
  readonly spec: JobSpec
  readonly handler: () => Promise<void>
}

/**
 * Test fake for IScheduler. Registration is captured; jobs never run automatically.
 * Tests invoke `trigger(name)` to execute a handler on demand.
 */
export class ManualScheduler implements IScheduler {
  private readonly registrations = new Map<string, Registration>()

  schedule(spec: JobSpec, handler: () => Promise<void>): void {
    this.registrations.set(spec.name, { spec, handler })
  }

  unschedule(name: string): void {
    this.registrations.delete(name)
  }

  has(name: string): boolean {
    return this.registrations.has(name)
  }

  stopAll(): void {
    this.registrations.clear()
  }

  /** Manually fire a registered job's handler. */
  async trigger(name: string): Promise<void> {
    const reg = this.registrations.get(name)
    if (!reg) {
      throw new Error(`ManualScheduler: job not registered: ${name}`)
    }
    await reg.handler()
  }

  /** Inspection helper for tests. */
  registeredJobs(): readonly string[] {
    return [...this.registrations.keys()]
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `bun test tests/Acceptance/support/__tests__/ManualScheduler.test.ts`
Expected: PASS（6 tests）

- [ ] **Step 5: Commit**

```bash
git add tests/Acceptance/support/fakes/ManualScheduler.ts tests/Acceptance/support/__tests__/ManualScheduler.test.ts
git commit -m "feat: [acceptance] 新增 ManualScheduler fake"
```

---

## Task 8: DB helpers — `migrate` + `tables` + `truncate`

**Files:**
- Create: `tests/Acceptance/support/db/migrate.ts`
- Create: `tests/Acceptance/support/db/tables.ts`
- Create: `tests/Acceptance/support/db/truncate.ts`

**說明：** 這三個檔案由 Task 13（smoke-db spec）做端到端驗證，此處不寫獨立單元測試（Atlas Migrator 與 SQLite 行為仰賴真 DB，獨立 mock 沒意義）。

- [ ] **Step 1: 建立資料表清單**

File: `tests/Acceptance/support/db/tables.ts`

```typescript
/**
 * List of tables that `truncate()` must empty between tests.
 *
 * @remarks
 * `truncate()` runs with `PRAGMA foreign_keys = OFF`, so FK ordering does not
 * matter at runtime. Keep this list in sync with `database/migrations/*.ts`.
 *
 * Exclude Atlas's own bookkeeping tables (`migrations`, `seeders`); those are
 * populated once per worker when migrations run and must survive `reset()`.
 */
export const ACCEPTANCE_TABLES: readonly string[] = [
  // Auth / user
  'users',
  'user_profiles',
  'auth_tokens',
  'email_verification_tokens',
  'password_reset_tokens',
  // Organization
  'organizations',
  'organization_members',
  'organization_managers',
  // ApiKey
  'api_keys',
  'app_api_keys',
  // Credit
  'credit_accounts',
  'credit_transactions',
  'usage_records',
  'sync_cursors',
  'pricing_rules',
  'quarantined_logs',
  // Alerts
  'alert_configs',
  'alert_events',
  'alert_deliveries',
  'webhook_endpoints',
  'webhook_configs',
  // Reports
  'report_schedules',
  // Health
  'health_checks',
  // Applications / contracts / app modules
  'applications',
  'contracts',
  'module_subscriptions',
  'app_modules',
]
```

**執行前檢查點：** 比對 `database/migrations/*.ts` 的所有 `create_xxx_table` migrations，確認此清單覆蓋全部實際建立的表；漏表會導致下一個測試看到上一個測試殘留資料。（執行本 task 時，用 `ls database/migrations/` 再次對照。）

- [ ] **Step 2: 建立 migrate helper**

File: `tests/Acceptance/support/db/migrate.ts`

```typescript
import { DB, Migrator } from '@gravito/atlas'
import { joinPath } from '@/Website/Http/Routing/routePath'

const MIGRATIONS_PATH = joinPath(process.cwd(), 'database/migrations')

/**
 * Configure Atlas DB and run all pending migrations against the given sqlite file.
 *
 * Must be called once per vitest worker before the first test boots TestApp.
 *
 * @param dbPath Absolute path to the sqlite file (e.g. `/tmp/draupnir-acceptance-worker-1.db`).
 */
export async function runAcceptanceMigrations(dbPath: string): Promise<void> {
  DB.configure({
    default: 'sqlite',
    connections: {
      sqlite: {
        driver: 'sqlite',
        database: dbPath,
      },
    },
  })

  const connection = DB.getDefaultConnection()
  const migrator = new Migrator({ path: MIGRATIONS_PATH, connection })
  await migrator.run()
}
```

- [ ] **Step 3: 建立 truncate helper**

File: `tests/Acceptance/support/db/truncate.ts`

```typescript
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { ACCEPTANCE_TABLES } from './tables'

/**
 * Raw-SQL escape hatch on IDatabaseAccess. Atlas adapter exposes `raw` or
 * `execute`; we probe for whichever is present at runtime.
 */
type RawSql = (sql: string) => Promise<unknown>

function getRawExecutor(db: IDatabaseAccess): RawSql {
  const candidate =
    (db as unknown as { raw?: RawSql }).raw ??
    (db as unknown as { execute?: RawSql }).execute ??
    (db as unknown as { query?: RawSql }).query
  if (typeof candidate !== 'function') {
    throw new Error(
      'truncateAcceptanceTables: IDatabaseAccess lacks raw/execute/query method. Use the Atlas adapter, not Memory.',
    )
  }
  return candidate.bind(db) as RawSql
}

/**
 * Empty every known acceptance-layer table.
 *
 * SQLite lacks `TRUNCATE`; uses `DELETE FROM <table>` inside a
 * `PRAGMA foreign_keys = OFF` block to avoid ordering headaches.
 */
export async function truncateAcceptanceTables(db: IDatabaseAccess): Promise<void> {
  const run = getRawExecutor(db)

  await run('PRAGMA foreign_keys = OFF')
  try {
    for (const table of ACCEPTANCE_TABLES) {
      await run(`DELETE FROM ${table}`)
      // Reset AUTOINCREMENT counters for tables that have them.
      await run(`DELETE FROM sqlite_sequence WHERE name = '${table}'`)
    }
  } finally {
    await run('PRAGMA foreign_keys = ON')
  }
}
```

**執行注意：** `IDatabaseAccess` 的實際 raw-SQL 介面名稱請執行前快速檢視 `src/Shared/Infrastructure/IDatabaseAccess.ts` 與 `src/Shared/Infrastructure/Database/Adapters/Atlas/`。若實際介面只提供 `table(...).select/insert` 型 builder 而無 raw 入口，改成用 builder 逐表 `.delete().from(table)`：

```typescript
for (const table of ACCEPTANCE_TABLES) {
  // Atlas builder-style fallback if raw() isn't available:
  // await db.table(table).delete()
}
```

選用哪種以實際型別檢查通過為準。

- [ ] **Step 4: Typecheck**

Run: `bun run typecheck`
Expected: PASS（若 `IDatabaseAccess` 介面不符，typecheck 會報錯 — 此時依錯誤訊息在 truncate.ts 調整方法名）

- [ ] **Step 5: Commit**

```bash
git add tests/Acceptance/support/db/
git commit -m "feat: [acceptance] 新增 DB migrate + truncate helper"
```

---

## Task 9: 實作 `TestApp.boot / reset / shutdown`

**Files:**
- Create: `tests/Acceptance/support/TestApp.ts`

**說明：** 由 Task 12 的 `smoke.spec.ts` 驗證。不寫獨立單元測試（TestApp 本質是 integration harness）。

- [ ] **Step 1: 建立 `TestApp.ts`**

File: `tests/Acceptance/support/TestApp.ts`

```typescript
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { PlanetCore } from '@gravito/core'
import { bootstrap } from '@/bootstrap'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { adaptGravitoContainer } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { runAcceptanceMigrations } from './db/migrate'
import { truncateAcceptanceTables } from './db/truncate'
import { ManualScheduler } from './fakes/ManualScheduler'
import { TestClock } from './TestClock'

/** Captured DomainEvent snapshot — tests can assert ordering and payload. */
export interface CapturedEvent {
  readonly eventType: string
  readonly data: Record<string, unknown>
  readonly occurredAt: Date
}

const INITIAL_CLOCK_ISO = '2026-01-01T00:00:00.000Z'

/**
 * Acceptance-layer test harness. One instance per vitest test file.
 *
 * Lifecycle:
 * 1. `beforeAll`: `app = await TestApp.boot()` — runs migrations (once per worker), boots real bootstrap(), rebinds fakes.
 * 2. `beforeEach`: `await app.reset()` — truncates DB + resets fakes + clock.
 * 3. `afterAll`: `await app.shutdown()` — closes DB, deletes tmp file.
 */
export class TestApp {
  private static migratedPaths = new Set<string>()

  readonly container: IContainer
  readonly clock: TestClock
  readonly gateway: MockGatewayClient
  readonly scheduler: ManualScheduler
  readonly events: CapturedEvent[]

  private readonly core: PlanetCore
  private readonly dbPath: string
  private readonly unsubscribeObserver: () => void

  private constructor(params: {
    core: PlanetCore
    container: IContainer
    clock: TestClock
    gateway: MockGatewayClient
    scheduler: ManualScheduler
    events: CapturedEvent[]
    dbPath: string
    unsubscribeObserver: () => void
  }) {
    this.core = params.core
    this.container = params.container
    this.clock = params.clock
    this.gateway = params.gateway
    this.scheduler = params.scheduler
    this.events = params.events
    this.dbPath = params.dbPath
    this.unsubscribeObserver = params.unsubscribeObserver
  }

  static async boot(): Promise<TestApp> {
    const workerId = process.env.VITEST_WORKER_ID ?? String(process.pid)
    const tmpRoot = join(tmpdir(), 'draupnir-acceptance')
    mkdirSync(tmpRoot, { recursive: true })
    const dbPath = join(tmpRoot, `worker-${workerId}.db`)

    // Env has to be set before bootstrap reads it.
    process.env.ORM = 'atlas'
    process.env.ENABLE_DB = 'true'
    process.env.DB_CONNECTION = 'sqlite'
    process.env.DB_DATABASE = dbPath
    process.env.BIFROST_API_URL ??= 'http://localhost:8080'
    process.env.BIFROST_MASTER_KEY ??= 'acceptance-test-key'
    process.env.JWT_SECRET ??= 'acceptance-test-secret'

    // Clean slate per worker/file: remove any previous DB file and re-migrate.
    if (!TestApp.migratedPaths.has(dbPath)) {
      rmSync(dbPath, { force: true })
      await runAcceptanceMigrations(dbPath)
      TestApp.migratedPaths.add(dbPath)
    }

    // Reset domain event dispatcher singleton so handler list is clean per file.
    DomainEventDispatcher.resetForTesting()

    const clock = new TestClock(new Date(INITIAL_CLOCK_ISO))
    const gateway = new MockGatewayClient()
    const scheduler = new ManualScheduler()

    const core = await bootstrap(0, {
      afterRegister: (c) => {
        c.container.singleton('clock', () => clock)
        c.container.singleton('llmGatewayClient', () => gateway)
        c.container.singleton('scheduler', () => scheduler)
      },
    })

    const container = adaptGravitoContainer(core.container)

    const events: CapturedEvent[] = []
    const dispatcher = DomainEventDispatcher.getInstance()
    const unsubscribeObserver = dispatcher.addObserver((event: DomainEvent) => {
      events.push({
        eventType: event.eventType,
        data: { ...event.data },
        occurredAt: event.occurredAt,
      })
    })

    return new TestApp({
      core,
      container,
      clock,
      gateway,
      scheduler,
      events,
      dbPath,
      unsubscribeObserver,
    })
  }

  /** Raw DB handle — use for state assertions. */
  get db(): IDatabaseAccess {
    return this.container.make('database') as IDatabaseAccess
  }

  /**
   * Per-test cleanup.
   * - Truncate tables
   * - Reset fakes
   * - Clear captured events
   * - Reset TestClock to INITIAL_CLOCK_ISO
   */
  async reset(): Promise<void> {
    await truncateAcceptanceTables(this.db)
    this.gateway.reset()
    this.scheduler.stopAll()
    this.events.length = 0
    this.clock.setNow(new Date(INITIAL_CLOCK_ISO))
  }

  /** Per-file cleanup; removes DB file and observer. */
  async shutdown(): Promise<void> {
    this.unsubscribeObserver()
    DomainEventDispatcher.resetForTesting()
    // Best effort to clean up tmp file + SQLite sidecars.
    rmSync(this.dbPath, { force: true })
    rmSync(`${this.dbPath}-journal`, { force: true })
    rmSync(`${this.dbPath}-shm`, { force: true })
    rmSync(`${this.dbPath}-wal`, { force: true })
  }
}
```

**實作注意事項：**
- `bootstrap(0, ...)` 傳 port=0（bootstrap 本身不 `listen()`，port 只進 config）。
- `ManualScheduler.stopAll()` 會在 `reset()` 中清空。Credit 模組本身沒 job registrar（可 `grep -r "registerJobs" src/Modules/Credit/` 確認）；Reports / Foundation 等會註冊，但 reset 後 handlers 被 `ManualScheduler.stopAll` 清空 — 若 pilot 後續需要保留某個 job 註冊，到時候再放寬此處。
- `MockGatewayClient` 已實作 `reset()`（見 `src/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient.ts`）。
- `events.length = 0` 是 in-place 清空 — 陣列參考不變，observer 仍指到同一個陣列（不需要重新 addObserver）。
- 若 `bootstrap()` 因為特定環境 dependency（Redis / Inertia warm / JWT secret）在測試環境噴錯，請在本 task 執行時依錯誤訊息補對應 env default 或在 afterRegister 內 rebind 問題 service 為 stub。Task 12 smoke spec 是發現這類問題的回饋 loop。

- [ ] **Step 2: Typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/Acceptance/support/TestApp.ts
git commit -m "feat: [acceptance] 新增 TestApp harness（boot/reset/shutdown）"
```

---

## Task 10: Scenarios skeleton（空 given/when/then）

**Files:**
- Create: `tests/Acceptance/support/scenarios/index.ts`
- Create: `tests/Acceptance/support/scenarios/runner.ts`
- Create: `tests/Acceptance/support/scenarios/given/index.ts`
- Create: `tests/Acceptance/support/scenarios/when/index.ts`
- Create: `tests/Acceptance/support/scenarios/then/index.ts`
- Test: `tests/Acceptance/support/__tests__/scenarioRunner.test.ts`

**說明：** PR-1 只提供 runner 骨架；PR-2 在同一 folder 填具體 `given.creditAccount(...)` 等 helpers。

- [ ] **Step 1: 寫 failing test**

File: `tests/Acceptance/support/__tests__/scenarioRunner.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest'
import type { TestApp } from '../TestApp'
import { scenario } from '../scenarios'

describe('scenario runner', () => {
  it('empty chain .run() resolves without throwing', async () => {
    // Pass a minimal fake app; runner must not require specific container shape
    // in PR-1. PR-2 extends given/when/then.
    const fakeApp = {} as TestApp
    await expect(scenario(fakeApp).run()).resolves.toBeUndefined()
  })

  it('registered step fires once on .run()', async () => {
    const fakeApp = {} as TestApp
    const builder = scenario(fakeApp)
    const step = vi.fn().mockResolvedValue(undefined)
    builder.__pushStep(step)

    await builder.run()

    expect(step).toHaveBeenCalledTimes(1)
  })

  it('.run() rethrows step failure with step index for debugging', async () => {
    const fakeApp = {} as TestApp
    const builder = scenario(fakeApp)
    builder.__pushStep(async () => {})
    builder.__pushStep(async () => {
      throw new Error('boom')
    })

    await expect(builder.run()).rejects.toThrow(/step 2/)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `bun test tests/Acceptance/support/__tests__/scenarioRunner.test.ts`
Expected: FAIL

- [ ] **Step 3: 建立 runner 與 namespace 骨架**

File: `tests/Acceptance/support/scenarios/runner.ts`

```typescript
import type { TestApp } from '../TestApp'

export type Step = () => Promise<void>

/**
 * Scenario builder skeleton. PR-2 extends `given`, `when`, `then` namespaces
 * with business-language helpers (see spec §7.4).
 *
 * @remarks
 * The `__pushStep` method is intentionally low-level — it's used by helpers
 * in `./given/*`, `./when/*`, `./then/*` to enqueue work onto the chain.
 */
export class ScenarioRunner {
  private readonly steps: Step[] = []

  constructor(readonly app: TestApp) {}

  /** Enqueue a raw step. Prefer business-language helpers in PR-2. */
  __pushStep(step: Step): this {
    this.steps.push(step)
    return this
  }

  // Namespaces — PR-2 extends these via module augmentation / helper wiring.
  readonly given = {} as Record<string, never>
  readonly when = {} as Record<string, never>
  readonly then = {} as Record<string, never>

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

export function scenario(app: TestApp): ScenarioRunner {
  return new ScenarioRunner(app)
}
```

File: `tests/Acceptance/support/scenarios/given/index.ts`

```typescript
// PR-2: add business-language setup helpers (`organization`, `creditAccount`, `activeApiKey`, ...).
// Intentionally empty in PR-1.
export {}
```

File: `tests/Acceptance/support/scenarios/when/index.ts`

```typescript
// PR-2: add action helpers (`userDeductsCredit`, `userTopsUpCredit`, ...).
export {}
```

File: `tests/Acceptance/support/scenarios/then/index.ts`

```typescript
// PR-2: add assertion helpers (`creditBalanceIs`, `apiKeyIsSuspended`, `domainEventsInclude`, ...).
export {}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `bun test tests/Acceptance/support/__tests__/scenarioRunner.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: Commit**

```bash
git add tests/Acceptance/support/scenarios/ tests/Acceptance/support/__tests__/scenarioRunner.test.ts
git commit -m "feat: [acceptance] 新增 scenario runner 骨架（PR-2 補 given/when/then helpers）"
```

---

## Task 11: 新增 `test:acceptance` scripts 到 `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 在 `package.json` `scripts` 區塊新增兩條**

於現有 `"test:e2e:debug"` 之後（或任意 test script 附近）加入：

```json
    "test:acceptance": "vitest run tests/Acceptance",
    "test:acceptance:watch": "vitest tests/Acceptance",
```

（**不要** 在 PR-1 修改 `check` script — spec §13 PR-3 明確將「`check` 組合加入 `test:acceptance`」列為 PR-3 交付物。）

- [ ] **Step 2: 執行一次驗證**

Run: `bun run test:acceptance`
Expected: 能啟動 vitest；此時僅會跑到 `support/__tests__/*.test.ts` 內已合併的 TestClock / ManualScheduler / scenarioRunner — 只要 vitest 不報「unknown flag」或「no tests found」即算此步通過。

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: [scripts] 新增 test:acceptance scripts"
```

---

## Task 12: Smoke spec — harness 本身

**Files:**
- Create: `tests/Acceptance/smoke.spec.ts`

**驗收目標：**
- `TestApp.boot()` 不 throw
- Container 能 resolve critical Credit-module services
- Rebind 成功：`clock` / `llmGatewayClient` / `scheduler` 是 fakes 且與 `app.clock` / `app.gateway` / `app.scheduler` 同實例
- Observer 捕捉到 dispatch 的 event
- `reset()` 清空 events + gateway calls + clock
- `shutdown()` 不 throw

- [ ] **Step 1: 建立 spec**

File: `tests/Acceptance/smoke.spec.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { ManualScheduler } from './support/fakes/ManualScheduler'
import { TestApp } from './support/TestApp'
import { TestClock } from './support/TestClock'

describe('Acceptance harness smoke', () => {
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

  it('container resolves critical Credit-module services', () => {
    expect(app.container.make('creditController')).toBeDefined()
    expect(app.container.make('topUpCreditService')).toBeDefined()
    expect(app.container.make('deductCreditService')).toBeDefined()
    expect(app.container.make('creditAccountRepository')).toBeDefined()
  })

  it('rebinds clock / llmGatewayClient / scheduler to fakes', () => {
    expect(app.container.make('clock')).toBeInstanceOf(TestClock)
    expect(app.container.make('llmGatewayClient')).toBeInstanceOf(MockGatewayClient)
    expect(app.container.make('scheduler')).toBeInstanceOf(ManualScheduler)

    // identity: container returns the same fake that TestApp exposes
    expect(app.container.make('clock')).toBe(app.clock)
    expect(app.container.make('llmGatewayClient')).toBe(app.gateway)
    expect(app.container.make('scheduler')).toBe(app.scheduler)
  })

  it('observer captures dispatched domain events into app.events', async () => {
    const dispatcher = DomainEventDispatcher.getInstance()
    await dispatcher.dispatch({
      eventType: 'smoke.test',
      occurredAt: new Date(),
      data: { note: 'hello' },
    })

    expect(app.events).toHaveLength(1)
    expect(app.events[0].eventType).toBe('smoke.test')
    expect(app.events[0].data).toEqual({ note: 'hello' })
  })

  it('reset() clears events and gateway call log', async () => {
    const dispatcher = DomainEventDispatcher.getInstance()
    await dispatcher.dispatch({
      eventType: 'smoke.test',
      occurredAt: new Date(),
      data: {},
    })
    await app.gateway.createKey({ name: 'k', isActive: true })
    expect(app.events.length).toBeGreaterThan(0)
    expect(app.gateway.calls.createKey.length).toBeGreaterThan(0)

    await app.reset()

    expect(app.events).toHaveLength(0)
    expect(app.gateway.calls.createKey).toHaveLength(0)
  })

  it('reset() resets clock to 2026-01-01T00:00:00Z', async () => {
    app.clock.advance(60_000)
    expect(app.clock.nowIso()).not.toBe('2026-01-01T00:00:00.000Z')

    await app.reset()

    expect(app.clock.nowIso()).toBe('2026-01-01T00:00:00.000Z')
  })
})
```

- [ ] **Step 2: 執行 smoke — 預期能通過或揭露 bootstrap 環境問題**

Run: `bun run test:acceptance -- tests/Acceptance/smoke.spec.ts`
Expected: PASS。若失敗，常見原因：
1. 環境變數缺（Redis / JWT_SECRET / BIFROST_*）→ 在 `TestApp.boot` 頂部補 `process.env.X ??= '...'` default。
2. Inertia warm 失敗 → 視錯誤決定是否在 afterRegister 內 rebind 為 stub。
3. `container.make('database')` 回傳的型別與 `truncate.ts` 假設不符 → 依錯誤訊息修 truncate helper 的 method probing。

每修一次，重跑同一指令直到 PASS。修補 `TestApp.ts` / `truncate.ts` 的改動與本 spec 一併 commit。

- [ ] **Step 3: Commit**

```bash
git add tests/Acceptance/smoke.spec.ts
# 若因 Step 2 需要微調 TestApp / truncate，一起加：
git add -u tests/Acceptance/support/TestApp.ts tests/Acceptance/support/db/
git commit -m "test: [acceptance] 新增 harness smoke spec"
```

---

## Task 13: Smoke spec — DB migrate + truncate 往返

**Files:**
- Create: `tests/Acceptance/smoke-db.spec.ts`

**驗收目標：**
- migrations 跑完後 `credit_accounts` 表存在且為空
- Insert 一筆後 select 得到；`reset()` 後 select 為空
- 連續多次 `reset()` 不報錯

- [ ] **Step 1: 建立 spec**

File: `tests/Acceptance/smoke-db.spec.ts`

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { TestApp } from './support/TestApp'

describe('Acceptance harness — DB migrate + truncate', () => {
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

  it('credit_accounts 表已由 migrate 建立', async () => {
    const rows = await app.db.table('credit_accounts').select()
    expect(Array.isArray(rows)).toBe(true)
    expect(rows).toHaveLength(0)
  })

  it('insert 後能讀到；reset 後為空', async () => {
    await app.db.table('credit_accounts').insert({
      id: 'acc-smoke-1',
      org_id: 'org-smoke-1',
      balance: '0',
      low_balance_threshold: '0',
      status: 'active',
      created_at: app.clock.nowIso(),
      updated_at: app.clock.nowIso(),
    })

    const before = await app.db.table('credit_accounts').where('id', '=', 'acc-smoke-1').select()
    expect(before).toHaveLength(1)

    await app.reset()

    const after = await app.db.table('credit_accounts').select()
    expect(after).toHaveLength(0)
  })

  it('連續多次 reset 不報錯', async () => {
    for (let i = 0; i < 3; i++) {
      await app.reset()
    }
    const rows = await app.db.table('credit_accounts').select()
    expect(rows).toHaveLength(0)
  })
})
```

**執行注意：** 若 `db.table(...).insert/select/where` 介面名稱與 Atlas adapter 實際不同（例如是 `create` / `find` / 另一 builder 入口），請先讀 `src/Modules/Credit/Infrastructure/Repositories/CreditAccountRepository.ts` 看它如何呼叫 `this.db`，再對應調整本 spec 的 query 寫法。repository 是產品端唯一真相來源。

- [ ] **Step 2: 執行 — 預期 PASS**

Run: `bun run test:acceptance -- tests/Acceptance/smoke-db.spec.ts`
Expected: PASS。若 truncate 漏表，第二個 test 在 `after reset` 會看到殘留 → 回頭檢查 `tests/Acceptance/support/db/tables.ts` 是否涵蓋了你 insert 的表。

- [ ] **Step 3: 最後一次全量執行 acceptance 層**

Run: `bun run test:acceptance`
Expected: 所有 `tests/Acceptance/` 下的 spec 全部 PASS（smoke + smoke-db + support `__tests__`）。

- [ ] **Step 4: 執行整體 `check`（PR-1 不動此 script 內容）**

Run: `bun run check`
Expected: PASS（typecheck + lint + 原有 test）。

- [ ] **Step 5: Commit**

```bash
git add tests/Acceptance/smoke-db.spec.ts
git commit -m "test: [acceptance] 新增 DB migrate + truncate smoke spec"
```

---

## Self-Review 備忘（for implementing agent）

執行完所有 task 後，對照 spec §13 PR-1 逐條對照：

| Spec 交付物 | 計畫中的 Task |
|------------|-------------|
| `src/Shared/Application/Ports/IClock.ts` | Task 1 |
| `src/Shared/Infrastructure/Services/SystemClock.ts` | Task 2 |
| Credit ServiceProvider 注入 `IClock` | Task 5 |
| `tests/Acceptance/support/TestApp.ts` | Task 9 |
| `tests/Acceptance/support/TestClock.ts` | Task 6 |
| `tests/Acceptance/support/fakes/ManualScheduler.ts` | Task 7 |
| `tests/Acceptance/support/db/{migrate,truncate}.ts` | Task 8 |
| `tests/Acceptance/support/scenarios/**`（runner + 空 g/w/t 骨架）| Task 10 |
| `package.json`：`test:acceptance` script | Task 11 |
| 1–2 支 smoke spec 驗 harness 本身 | Task 12 + Task 13 |

同時解決 spec §15 的兩個開放問題：
1. **Observer 注入方式** → Task 3 新增 `addObserver` API（仍為 singleton，但透過訂閱/退訂管理生命週期）。
2. **SQLite 儲存策略** → Task 9 採 tmp file（per-worker 獨立命名，對每個 `TestApp.boot` 先 `rmSync` 再 migrate）。

仍為 PR-2 保留的項目：
- `app.http` / `app.auth` / `app.seed`
- 業務語言 given/when/then helpers（具體實作內容）
- `DomainEventDispatcher` container-managed 化（目前仍是 singleton；如 PR-2 發現 singleton 會跨 spec 互相干擾再處理）

---

## 執行後的驗收門檻

所有 task 完成後，以下指令必須全綠：

```bash
bun run typecheck
bun run lint
bun run test                 # 既有單元測試 + Clock binding + DomainEventDispatcher observer + SystemClock
bun run test:acceptance      # smoke.spec.ts + smoke-db.spec.ts + support __tests__
```

PR-2 開工前，必須確認 `test:acceptance` 能穩定跑通 — 本 PR 的價值全押在「給 PR-2 一個可信的底」。
