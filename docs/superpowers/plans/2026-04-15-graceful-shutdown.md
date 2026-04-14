# Graceful Shutdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Bun HTTP server 收到 SIGTERM / SIGINT 時，有序排乾 in-flight 請求並關閉所有資源（Scheduler、Redis、Database），支援 Kubernetes rolling update 零停機。

**Architecture:** `GracefulShutdown` 類別封裝信號監聽與 hook 清單；每個資源實作 `IShutdownHook` 介面；`src/index.ts` 組裝並呼叫 `shutdown.listen()`。Hook 依序執行，每個 hook 有獨立 timeout，單一失敗不中斷整體流程。

**Tech Stack:** Bun（`Bun.Server.stop()`）、Vitest（測試框架）、croner（排程器）、@libsql/client（SQLite via Drizzle）、@gravito/plasma（Redis）

---

## 檔案結構

### 新建

| 路徑 | 職責 |
|------|------|
| `src/Foundation/Infrastructure/Shutdown/IShutdownHook.ts` | 介面定義 |
| `src/Foundation/Infrastructure/Shutdown/GracefulShutdown.ts` | 核心類別：信號監聽、hook 排程、timeout race |
| `src/Foundation/Infrastructure/Shutdown/hooks/BunServerShutdownHook.ts` | Bun Server drain |
| `src/Foundation/Infrastructure/Shutdown/hooks/SchedulerShutdownHook.ts` | CronerScheduler 停止所有 job |
| `src/Foundation/Infrastructure/Shutdown/hooks/RedisShutdownHook.ts` | Redis 斷線 |
| `src/Foundation/Infrastructure/Shutdown/hooks/DatabaseShutdownHook.ts` | Database 連線池關閉（callback 注入） |
| `src/Foundation/Infrastructure/Shutdown/hooks/MessageQueueShutdownHook.ts` | MQ drain 占位（目前 no-op） |
| `src/Foundation/Infrastructure/Shutdown/hooks/WebhookShutdownHook.ts` | Webhook 占位（目前 no-op） |
| `src/Foundation/Infrastructure/Shutdown/__tests__/GracefulShutdown.test.ts` | GracefulShutdown 單元測試 |
| `src/Foundation/Infrastructure/Shutdown/__tests__/BunServerShutdownHook.test.ts` | BunServerShutdownHook 單元測試 |
| `src/Foundation/Infrastructure/Shutdown/__tests__/SchedulerShutdownHook.test.ts` | SchedulerShutdownHook 單元測試 |
| `src/Foundation/Infrastructure/Shutdown/__tests__/RedisShutdownHook.test.ts` | RedisShutdownHook 單元測試 |
| `src/Foundation/Infrastructure/Shutdown/__tests__/DatabaseShutdownHook.test.ts` | DatabaseShutdownHook 單元測試 |

### 修改

| 路徑 | 變更 |
|------|------|
| `src/Foundation/Infrastructure/Ports/Scheduler/IScheduler.ts` | 新增 `stopAll(): void` |
| `src/Foundation/Infrastructure/Services/Scheduler/CronerScheduler.ts` | 實作 `stopAll()` |
| `src/Shared/Infrastructure/IRedisService.ts` | 新增 `disconnect(): Promise<void>` |
| `src/Shared/Infrastructure/Framework/GravitoRedisAdapter.ts` | 實作 `disconnect()` |
| `src/Shared/Infrastructure/Database/Adapters/Drizzle/config.ts` | 新增 `closeDrizzleConnection()` |
| `src/index.ts` | 組裝 GracefulShutdown、呼叫 `.listen()` |

---

## Task 1: 擴充 IScheduler — 新增 stopAll()

**Files:**
- Modify: `src/Foundation/Infrastructure/Ports/Scheduler/IScheduler.ts`
- Modify: `src/Foundation/Infrastructure/Services/Scheduler/CronerScheduler.ts`
- Test: `src/Foundation/Infrastructure/Services/Scheduler/__tests__/CronerScheduler.stopAll.test.ts`

- [ ] **Step 1: 寫失敗測試**

建立 `src/Foundation/Infrastructure/Services/Scheduler/__tests__/CronerScheduler.stopAll.test.ts`：

```typescript
import { describe, expect, it, vi } from 'vitest'
import { CronerScheduler } from '../CronerScheduler'

describe('CronerScheduler.stopAll()', () => {
  it('stopAll() 停止所有已排程的 job', () => {
    const scheduler = new CronerScheduler()
    let called = 0
    scheduler.schedule({ name: 'job-a', cron: '* * * * *' }, async () => { called++ })
    scheduler.schedule({ name: 'job-b', cron: '* * * * *' }, async () => { called++ })

    expect(scheduler.has('job-a')).toBe(true)
    expect(scheduler.has('job-b')).toBe(true)

    scheduler.stopAll()

    expect(scheduler.has('job-a')).toBe(false)
    expect(scheduler.has('job-b')).toBe(false)
  })

  it('stopAll() 在沒有 job 時不拋出錯誤', () => {
    const scheduler = new CronerScheduler()
    expect(() => scheduler.stopAll()).not.toThrow()
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
bun test src/Foundation/Infrastructure/Services/Scheduler/__tests__/CronerScheduler.stopAll.test.ts
```

預期：FAIL — `scheduler.stopAll is not a function`

- [ ] **Step 3: 在 IScheduler 新增 stopAll()**

`src/Foundation/Infrastructure/Ports/Scheduler/IScheduler.ts` 末尾加一行：

```typescript
export interface IScheduler {
  schedule(spec: JobSpec, handler: () => Promise<void>): void
  unschedule(name: string): void
  has(name: string): boolean
  /** 停止所有已排程的 job（用於 graceful shutdown）。 */
  stopAll(): void
}
```

- [ ] **Step 4: 在 CronerScheduler 實作 stopAll()**

在 `has()` 方法後新增：

```typescript
stopAll(): void {
  for (const name of [...this.registry.keys()]) {
    this.unschedule(name)
  }
}
```

- [ ] **Step 5: 執行測試，確認通過**

```bash
bun test src/Foundation/Infrastructure/Services/Scheduler/__tests__/CronerScheduler.stopAll.test.ts
```

預期：PASS

- [ ] **Step 6: Commit**

```bash
git add src/Foundation/Infrastructure/Ports/Scheduler/IScheduler.ts \
        src/Foundation/Infrastructure/Services/Scheduler/CronerScheduler.ts \
        src/Foundation/Infrastructure/Services/Scheduler/__tests__/CronerScheduler.stopAll.test.ts
git commit -m "feat: [scheduler] IScheduler 新增 stopAll()，CronerScheduler 實作"
```

---

## Task 2: 擴充 IRedisService — 新增 disconnect()

**Files:**
- Modify: `src/Shared/Infrastructure/IRedisService.ts`
- Modify: `src/Shared/Infrastructure/Framework/GravitoRedisAdapter.ts`
- Test: `src/Shared/Infrastructure/Framework/__tests__/GravitoRedisAdapter.test.ts`（已存在，新增 disconnect 測試）

- [ ] **Step 1: 寫失敗測試**

在 `src/Shared/Infrastructure/Framework/__tests__/GravitoRedisAdapter.test.ts` 末尾新增：

```typescript
describe('GravitoRedisAdapter.disconnect()', () => {
  it('呼叫底層 redis 的 quit()', async () => {
    const mockRedis = {
      ping: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      incr: vi.fn(),
      expire: vi.fn(),
      quit: vi.fn().mockResolvedValue(undefined),
    }
    const adapter = new GravitoRedisAdapter(mockRedis as any)
    await adapter.disconnect()
    expect(mockRedis.quit).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
bun test src/Shared/Infrastructure/Framework/__tests__/GravitoRedisAdapter.test.ts
```

預期：FAIL — `adapter.disconnect is not a function`

- [ ] **Step 3: 在 IRedisService 新增 disconnect()**

`src/Shared/Infrastructure/IRedisService.ts` 末尾加一個 method：

```typescript
export interface IRedisService {
  ping(): Promise<string>
  get(key: string): Promise<string | null>
  set(key: string, value: string, expiresInSeconds?: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  incr(key: string, ttlSeconds: number): Promise<number>
  /** 關閉 Redis 連線（用於 graceful shutdown）。 */
  disconnect(): Promise<void>
}
```

- [ ] **Step 4: 在 GravitoRedisAdapter 實作 disconnect()**

在 `incr()` 方法後新增：

```typescript
async disconnect(): Promise<void> {
  // RedisClientContract 底層為 ioredis-compatible client，提供 quit()
  await (this.redis as any).quit?.()
}
```

- [ ] **Step 5: 執行測試，確認通過**

```bash
bun test src/Shared/Infrastructure/Framework/__tests__/GravitoRedisAdapter.test.ts
```

預期：PASS

- [ ] **Step 6: Commit**

```bash
git add src/Shared/Infrastructure/IRedisService.ts \
        src/Shared/Infrastructure/Framework/GravitoRedisAdapter.ts \
        src/Shared/Infrastructure/Framework/__tests__/GravitoRedisAdapter.test.ts
git commit -m "feat: [redis] IRedisService 新增 disconnect()，GravitoRedisAdapter 實作"
```

---

## Task 3: 新增 closeDrizzleConnection() 到 Drizzle config

**Files:**
- Modify: `src/Shared/Infrastructure/Database/Adapters/Drizzle/config.ts`
- Test: `src/Shared/Infrastructure/Database/Adapters/Drizzle/__tests__/config.test.ts`（已存在，新增 close 測試）

- [ ] **Step 1: 寫失敗測試**

在 `src/Shared/Infrastructure/Database/Adapters/Drizzle/__tests__/config.test.ts` 末尾新增：

```typescript
describe('closeDrizzleConnection()', () => {
  it('呼叫後再次取得 instance 會重新初始化', async () => {
    // 先初始化
    const before = getDrizzleInstance()
    await closeDrizzleConnection()
    resetDrizzleForTest()
    // 重新初始化後應該是新的 instance（本測試環境用 memory db，不真正關閉）
    expect(before).toBeDefined()
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
bun test src/Shared/Infrastructure/Database/Adapters/Drizzle/__tests__/config.test.ts
```

預期：FAIL — `closeDrizzleConnection is not a function`

- [ ] **Step 3: 修改 config.ts 儲存 client 參考並匯出 closeDrizzleConnection()**

用以下內容取代 `src/Shared/Infrastructure/Database/Adapters/Drizzle/config.ts`：

```typescript
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

let db: ReturnType<typeof drizzle> | null = null
let libsqlClient: ReturnType<typeof createClient> | null = null

export function initializeDrizzle() {
  if (db) {
    return db
  }

  const databaseUrl = process.env.DATABASE_URL || 'file:local.db'
  libsqlClient = createClient({ url: databaseUrl })
  db = drizzle(libsqlClient, { schema })

  return db
}

export function getDrizzleInstance() {
  if (!db) {
    return initializeDrizzle()
  }
  return db
}

/** 關閉 libsql 連線（用於 graceful shutdown）。 */
export async function closeDrizzleConnection(): Promise<void> {
  libsqlClient?.close()
  libsqlClient = null
  db = null
}

/** 僅供測試使用的資料庫重置 @internal */
export function resetDrizzleForTest() {
  db = null
  libsqlClient = null
}
```

- [ ] **Step 4: 更新 config.test.ts 的 import**

確認 `config.test.ts` import 中加入 `closeDrizzleConnection`：

```typescript
import { getDrizzleInstance, resetDrizzleForTest, closeDrizzleConnection } from '../config'
```

- [ ] **Step 5: 執行測試，確認通過**

```bash
bun test src/Shared/Infrastructure/Database/Adapters/Drizzle/__tests__/config.test.ts
```

預期：PASS

- [ ] **Step 6: Commit**

```bash
git add src/Shared/Infrastructure/Database/Adapters/Drizzle/config.ts \
        src/Shared/Infrastructure/Database/Adapters/Drizzle/__tests__/config.test.ts
git commit -m "feat: [db] closeDrizzleConnection() — 提供 libsql client 關閉入口"
```

---

## Task 4: IShutdownHook 介面 + GracefulShutdown 核心類別

**Files:**
- Create: `src/Foundation/Infrastructure/Shutdown/IShutdownHook.ts`
- Create: `src/Foundation/Infrastructure/Shutdown/GracefulShutdown.ts`
- Create: `src/Foundation/Infrastructure/Shutdown/__tests__/GracefulShutdown.test.ts`

- [ ] **Step 1: 建立 IShutdownHook.ts**

```typescript
// src/Foundation/Infrastructure/Shutdown/IShutdownHook.ts

/**
 * Graceful shutdown hook 介面。
 *
 * 每個需要在關閉時清理的資源都實作此介面，
 * 並透過 GracefulShutdown.register() 註冊。
 */
export interface IShutdownHook {
  /** 顯示在 log 中的資源名稱。 */
  readonly name: string
  /**
   * 執行清理邏輯。
   * - 應在 drainTimeout 內完成；超時由 GracefulShutdown 強制終止
   * - 丟出的 error 會被 catch 並 log，不影響其他 hook 執行
   */
  shutdown(): Promise<void>
}
```

- [ ] **Step 2: 寫失敗測試**

建立 `src/Foundation/Infrastructure/Shutdown/__tests__/GracefulShutdown.test.ts`：

```typescript
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { GracefulShutdown } from '../GracefulShutdown'
import type { IShutdownHook } from '../IShutdownHook'

const makeHook = (name: string, impl?: () => Promise<void>): IShutdownHook => ({
  name,
  shutdown: impl ?? vi.fn().mockResolvedValue(undefined),
})

describe('GracefulShutdown', () => {
  it('execute() 依序呼叫所有 hook', async () => {
    const order: string[] = []
    const a = makeHook('A', async () => { order.push('A') })
    const b = makeHook('B', async () => { order.push('B') })

    const shutdown = new GracefulShutdown(5000)
    shutdown.register(a, b)

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
    await shutdown.execute('SIGTERM')

    expect(order).toEqual(['A', 'B'])
    expect(exitSpy).toHaveBeenCalledWith(0)
    exitSpy.mockRestore()
  })

  it('單一 hook 失敗不中斷後續 hook', async () => {
    const order: string[] = []
    const bad = makeHook('BAD', async () => { throw new Error('boom') })
    const good = makeHook('GOOD', async () => { order.push('GOOD') })

    const shutdown = new GracefulShutdown(5000)
    shutdown.register(bad, good)

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
    await shutdown.execute('SIGTERM')

    expect(order).toEqual(['GOOD'])
    expect(exitSpy).toHaveBeenCalledWith(0)
    exitSpy.mockRestore()
  })

  it('hook 超時時不等待，繼續執行下一個 hook', async () => {
    const order: string[] = []
    const slow = makeHook('SLOW', () => new Promise(() => {})) // 永不 resolve
    const fast = makeHook('FAST', async () => { order.push('FAST') })

    const shutdown = new GracefulShutdown(50) // 50ms timeout
    shutdown.register(slow, fast)

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
    await shutdown.execute('SIGTERM')

    expect(order).toEqual(['FAST'])
    expect(exitSpy).toHaveBeenCalledWith(0)
    exitSpy.mockRestore()
  })

  it('register() 支援鏈式呼叫', () => {
    const shutdown = new GracefulShutdown(5000)
    const result = shutdown.register(makeHook('A'))
    expect(result).toBe(shutdown)
  })
})
```

- [ ] **Step 3: 執行測試，確認失敗**

```bash
bun test src/Foundation/Infrastructure/Shutdown/__tests__/GracefulShutdown.test.ts
```

預期：FAIL — Cannot find module `../GracefulShutdown`

- [ ] **Step 4: 建立 GracefulShutdown.ts**

```typescript
// src/Foundation/Infrastructure/Shutdown/GracefulShutdown.ts
import type { IShutdownHook } from './IShutdownHook'

export class GracefulShutdown {
  private readonly hooks: IShutdownHook[] = []

  constructor(private readonly drainTimeoutMs: number) {}

  register(...hooks: IShutdownHook[]): this {
    this.hooks.push(...hooks)
    return this
  }

  listen(signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT']): void {
    for (const signal of signals) {
      process.once(signal, () => {
        void this.execute(signal)
      })
    }
  }

  async execute(signal: string): Promise<never> {
    console.log(`[shutdown] ${signal} received — drainTimeout=${this.drainTimeoutMs}ms`)
    for (const hook of this.hooks) {
      await this.runHook(hook)
    }
    console.log('[shutdown] All hooks completed — exiting with code 0')
    return process.exit(0)
  }

  private async runHook(hook: IShutdownHook): Promise<void> {
    console.log(`[shutdown] ${hook.name} closing...`)
    const start = Date.now()

    const timeout = new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), this.drainTimeoutMs),
    )
    const task = hook
      .shutdown()
      .then(() => 'done' as const)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[shutdown] ${hook.name} failed: ${msg}`)
        return 'error' as const
      })

    const result = await Promise.race([task, timeout])
    const elapsed = Date.now() - start

    if (result === 'timeout') {
      console.warn(`[shutdown] ${hook.name} timed out after ${this.drainTimeoutMs}ms, forcing`)
    } else if (result === 'done') {
      console.log(`[shutdown] ${hook.name} closed (${elapsed}ms)`)
    }
  }
}
```

- [ ] **Step 5: 執行測試，確認通過**

```bash
bun test src/Foundation/Infrastructure/Shutdown/__tests__/GracefulShutdown.test.ts
```

預期：PASS（4 tests）

- [ ] **Step 6: Commit**

```bash
git add src/Foundation/Infrastructure/Shutdown/IShutdownHook.ts \
        src/Foundation/Infrastructure/Shutdown/GracefulShutdown.ts \
        src/Foundation/Infrastructure/Shutdown/__tests__/GracefulShutdown.test.ts
git commit -m "feat: [shutdown] IShutdownHook 介面 + GracefulShutdown 核心類別"
```

---

## Task 5: BunServerShutdownHook

**Files:**
- Create: `src/Foundation/Infrastructure/Shutdown/hooks/BunServerShutdownHook.ts`
- Create: `src/Foundation/Infrastructure/Shutdown/__tests__/BunServerShutdownHook.test.ts`

- [ ] **Step 1: 寫失敗測試**

```typescript
// src/Foundation/Infrastructure/Shutdown/__tests__/BunServerShutdownHook.test.ts
import { describe, expect, it, vi } from 'vitest'
import { BunServerShutdownHook } from '../hooks/BunServerShutdownHook'

describe('BunServerShutdownHook', () => {
  it('name 為 "BunServer"', () => {
    const server = { stop: vi.fn().mockResolvedValue(undefined) }
    const hook = new BunServerShutdownHook(server as any)
    expect(hook.name).toBe('BunServer')
  })

  it('shutdown() 呼叫 server.stop()', async () => {
    const server = { stop: vi.fn().mockResolvedValue(undefined) }
    const hook = new BunServerShutdownHook(server as any)
    await hook.shutdown()
    expect(server.stop).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
bun test src/Foundation/Infrastructure/Shutdown/__tests__/BunServerShutdownHook.test.ts
```

預期：FAIL

- [ ] **Step 3: 建立 BunServerShutdownHook.ts**

```typescript
// src/Foundation/Infrastructure/Shutdown/hooks/BunServerShutdownHook.ts
import type { IShutdownHook } from '../IShutdownHook'

export class BunServerShutdownHook implements IShutdownHook {
  readonly name = 'BunServer'

  constructor(private readonly server: { stop(): void | Promise<void> }) {}

  async shutdown(): Promise<void> {
    await this.server.stop()
  }
}
```

- [ ] **Step 4: 執行測試，確認通過**

```bash
bun test src/Foundation/Infrastructure/Shutdown/__tests__/BunServerShutdownHook.test.ts
```

預期：PASS

- [ ] **Step 5: Commit**

```bash
git add src/Foundation/Infrastructure/Shutdown/hooks/BunServerShutdownHook.ts \
        src/Foundation/Infrastructure/Shutdown/__tests__/BunServerShutdownHook.test.ts
git commit -m "feat: [shutdown] BunServerShutdownHook"
```

---

## Task 6: SchedulerShutdownHook

**Files:**
- Create: `src/Foundation/Infrastructure/Shutdown/hooks/SchedulerShutdownHook.ts`
- Create: `src/Foundation/Infrastructure/Shutdown/__tests__/SchedulerShutdownHook.test.ts`

- [ ] **Step 1: 寫失敗測試**

```typescript
// src/Foundation/Infrastructure/Shutdown/__tests__/SchedulerShutdownHook.test.ts
import { describe, expect, it, vi } from 'vitest'
import { SchedulerShutdownHook } from '../hooks/SchedulerShutdownHook'
import type { IScheduler } from '@/Foundation/Infrastructure/Ports/Scheduler/IScheduler'

describe('SchedulerShutdownHook', () => {
  it('name 為 "Scheduler"', () => {
    const scheduler: IScheduler = {
      schedule: vi.fn(),
      unschedule: vi.fn(),
      has: vi.fn(),
      stopAll: vi.fn(),
    }
    expect(new SchedulerShutdownHook(scheduler).name).toBe('Scheduler')
  })

  it('shutdown() 呼叫 scheduler.stopAll()', async () => {
    const scheduler: IScheduler = {
      schedule: vi.fn(),
      unschedule: vi.fn(),
      has: vi.fn(),
      stopAll: vi.fn(),
    }
    await new SchedulerShutdownHook(scheduler).shutdown()
    expect(scheduler.stopAll).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
bun test src/Foundation/Infrastructure/Shutdown/__tests__/SchedulerShutdownHook.test.ts
```

預期：FAIL

- [ ] **Step 3: 建立 SchedulerShutdownHook.ts**

```typescript
// src/Foundation/Infrastructure/Shutdown/hooks/SchedulerShutdownHook.ts
import type { IShutdownHook } from '../IShutdownHook'
import type { IScheduler } from '@/Foundation/Infrastructure/Ports/Scheduler/IScheduler'

export class SchedulerShutdownHook implements IShutdownHook {
  readonly name = 'Scheduler'

  constructor(private readonly scheduler: IScheduler) {}

  async shutdown(): Promise<void> {
    this.scheduler.stopAll()
  }
}
```

- [ ] **Step 4: 執行測試，確認通過**

```bash
bun test src/Foundation/Infrastructure/Shutdown/__tests__/SchedulerShutdownHook.test.ts
```

預期：PASS

- [ ] **Step 5: Commit**

```bash
git add src/Foundation/Infrastructure/Shutdown/hooks/SchedulerShutdownHook.ts \
        src/Foundation/Infrastructure/Shutdown/__tests__/SchedulerShutdownHook.test.ts
git commit -m "feat: [shutdown] SchedulerShutdownHook"
```

---

## Task 7: RedisShutdownHook

**Files:**
- Create: `src/Foundation/Infrastructure/Shutdown/hooks/RedisShutdownHook.ts`
- Create: `src/Foundation/Infrastructure/Shutdown/__tests__/RedisShutdownHook.test.ts`

- [ ] **Step 1: 寫失敗測試**

```typescript
// src/Foundation/Infrastructure/Shutdown/__tests__/RedisShutdownHook.test.ts
import { describe, expect, it, vi } from 'vitest'
import { RedisShutdownHook } from '../hooks/RedisShutdownHook'
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'

const makeRedis = (): IRedisService => ({
  ping: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  incr: vi.fn(),
  disconnect: vi.fn().mockResolvedValue(undefined),
})

describe('RedisShutdownHook', () => {
  it('name 為 "Redis"', () => {
    expect(new RedisShutdownHook(makeRedis()).name).toBe('Redis')
  })

  it('shutdown() 呼叫 redis.disconnect()', async () => {
    const redis = makeRedis()
    await new RedisShutdownHook(redis).shutdown()
    expect(redis.disconnect).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
bun test src/Foundation/Infrastructure/Shutdown/__tests__/RedisShutdownHook.test.ts
```

預期：FAIL

- [ ] **Step 3: 建立 RedisShutdownHook.ts**

```typescript
// src/Foundation/Infrastructure/Shutdown/hooks/RedisShutdownHook.ts
import type { IShutdownHook } from '../IShutdownHook'
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'

export class RedisShutdownHook implements IShutdownHook {
  readonly name = 'Redis'

  constructor(private readonly redis: IRedisService) {}

  async shutdown(): Promise<void> {
    await this.redis.disconnect()
  }
}
```

- [ ] **Step 4: 執行測試，確認通過**

```bash
bun test src/Foundation/Infrastructure/Shutdown/__tests__/RedisShutdownHook.test.ts
```

預期：PASS

- [ ] **Step 5: Commit**

```bash
git add src/Foundation/Infrastructure/Shutdown/hooks/RedisShutdownHook.ts \
        src/Foundation/Infrastructure/Shutdown/__tests__/RedisShutdownHook.test.ts
git commit -m "feat: [shutdown] RedisShutdownHook"
```

---

## Task 8: DatabaseShutdownHook

**Files:**
- Create: `src/Foundation/Infrastructure/Shutdown/hooks/DatabaseShutdownHook.ts`
- Create: `src/Foundation/Infrastructure/Shutdown/__tests__/DatabaseShutdownHook.test.ts`

- [ ] **Step 1: 寫失敗測試**

```typescript
// src/Foundation/Infrastructure/Shutdown/__tests__/DatabaseShutdownHook.test.ts
import { describe, expect, it, vi } from 'vitest'
import { DatabaseShutdownHook } from '../hooks/DatabaseShutdownHook'

describe('DatabaseShutdownHook', () => {
  it('name 為 "Database"', () => {
    expect(new DatabaseShutdownHook(vi.fn()).name).toBe('Database')
  })

  it('shutdown() 呼叫傳入的 close 函式', async () => {
    const close = vi.fn().mockResolvedValue(undefined)
    await new DatabaseShutdownHook(close).shutdown()
    expect(close).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: 執行測試，確認失敗**

```bash
bun test src/Foundation/Infrastructure/Shutdown/__tests__/DatabaseShutdownHook.test.ts
```

預期：FAIL

- [ ] **Step 3: 建立 DatabaseShutdownHook.ts**

`IDatabaseAccess` 沒有 `close()` 方法，因此 hook 接受 callback 注入，解耦於 ORM 具體實作。

```typescript
// src/Foundation/Infrastructure/Shutdown/hooks/DatabaseShutdownHook.ts
import type { IShutdownHook } from '../IShutdownHook'

export class DatabaseShutdownHook implements IShutdownHook {
  readonly name = 'Database'

  constructor(private readonly close: () => Promise<void>) {}

  async shutdown(): Promise<void> {
    await this.close()
  }
}
```

- [ ] **Step 4: 執行測試，確認通過**

```bash
bun test src/Foundation/Infrastructure/Shutdown/__tests__/DatabaseShutdownHook.test.ts
```

預期：PASS

- [ ] **Step 5: Commit**

```bash
git add src/Foundation/Infrastructure/Shutdown/hooks/DatabaseShutdownHook.ts \
        src/Foundation/Infrastructure/Shutdown/__tests__/DatabaseShutdownHook.test.ts
git commit -m "feat: [shutdown] DatabaseShutdownHook（callback 注入，ORM 無關）"
```

---

## Task 9: MessageQueueShutdownHook + WebhookShutdownHook 占位

**Files:**
- Create: `src/Foundation/Infrastructure/Shutdown/hooks/MessageQueueShutdownHook.ts`
- Create: `src/Foundation/Infrastructure/Shutdown/hooks/WebhookShutdownHook.ts`

這兩個 hook 目前無對應的底層資源（MQ 尚未實作；WebhookDispatcher 是無狀態的 fetch client），先建立占位實作，保留擴充點。

- [ ] **Step 1: 建立 MessageQueueShutdownHook.ts**

```typescript
// src/Foundation/Infrastructure/Shutdown/hooks/MessageQueueShutdownHook.ts
import type { IShutdownHook } from '../IShutdownHook'

/**
 * Message Queue drain hook（占位）。
 *
 * 當 MQ 實作完成後，傳入支援 drain 的 MQ client，
 * 並在此呼叫「停止消費 → 等處理中訊息完成」的邏輯。
 */
export class MessageQueueShutdownHook implements IShutdownHook {
  readonly name = 'MessageQueue'

  async shutdown(): Promise<void> {
    // 占位：MQ 尚未實作，直接結束
  }
}
```

- [ ] **Step 2: 建立 WebhookShutdownHook.ts**

```typescript
// src/Foundation/Infrastructure/Shutdown/hooks/WebhookShutdownHook.ts
import type { IShutdownHook } from '../IShutdownHook'

/**
 * Webhook long-lived connection 關閉 hook（占位）。
 *
 * WebhookDispatcher 目前為無狀態 fetch client，無持久連線需關閉。
 * 未來若引入 WebSocket 或持久連線，在此實作關閉邏輯。
 */
export class WebhookShutdownHook implements IShutdownHook {
  readonly name = 'WebhookClient'

  async shutdown(): Promise<void> {
    // 占位：WebhookDispatcher 無持久連線，直接結束
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Foundation/Infrastructure/Shutdown/hooks/MessageQueueShutdownHook.ts \
        src/Foundation/Infrastructure/Shutdown/hooks/WebhookShutdownHook.ts
git commit -m "feat: [shutdown] MessageQueueShutdownHook + WebhookShutdownHook 占位實作"
```

---

## Task 10: 整合 src/index.ts

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: 閱讀目前的 src/index.ts**

確認 `Bun.serve()` 的返回值目前未被保留，且無任何信號處理。

- [ ] **Step 2: 決定 Redis 資源的容器鍵名**

在 `src/Foundation/Infrastructure/Providers/FoundationServiceProvider.ts` 中確認 `container.singleton` 的 key。目前 `redis` 是透過 `@gravito/plasma` 由 Gravito 自動註冊，key 可能是 `'redis'`。執行以下確認（開發模式）：

```bash
grep -r "singleton.*redis\|make.*redis" src/ --include="*.ts" -l
```

若 key 確認，繼續下一步。若找不到，先跳過 `RedisShutdownHook`（條件式加入）。

- [ ] **Step 3: 修改 src/index.ts**

```typescript
import { createApp } from './app'
import { GracefulShutdown } from './Foundation/Infrastructure/Shutdown/GracefulShutdown'
import { BunServerShutdownHook } from './Foundation/Infrastructure/Shutdown/hooks/BunServerShutdownHook'
import { SchedulerShutdownHook } from './Foundation/Infrastructure/Shutdown/hooks/SchedulerShutdownHook'
import { RedisShutdownHook } from './Foundation/Infrastructure/Shutdown/hooks/RedisShutdownHook'
import { DatabaseShutdownHook } from './Foundation/Infrastructure/Shutdown/hooks/DatabaseShutdownHook'
import { MessageQueueShutdownHook } from './Foundation/Infrastructure/Shutdown/hooks/MessageQueueShutdownHook'
import { WebhookShutdownHook } from './Foundation/Infrastructure/Shutdown/hooks/WebhookShutdownHook'
import { closeDrizzleConnection } from './Shared/Infrastructure/Database/Adapters/Drizzle/config'
import type { IScheduler } from './Foundation/Infrastructure/Ports/Scheduler/IScheduler'
import type { IRedisService } from './Shared/Infrastructure/IRedisService'

async function start() {
  const core = await createApp()

  const port = Number(core.config.get('PORT') ?? 3000)
  const drainTimeoutMs = Number(process.env.DRAIN_TIMEOUT_MS ?? 25_000)
  const baseUrl = `http://localhost:${port}`

  const { core: _liftoffCore, ...serveConfig } = core.liftoff(port)
  const server = Bun.serve(serveConfig as any)

  // ─── Graceful Shutdown ─────────────────────────────────────────
  const scheduler = core.container.make('scheduler') as IScheduler
  const redis = core.container.make('redis') as IRedisService | undefined

  const shutdown = new GracefulShutdown(drainTimeoutMs)
    .register(new BunServerShutdownHook(server))
    .register(new MessageQueueShutdownHook())
    .register(new SchedulerShutdownHook(scheduler))
    .register(new WebhookShutdownHook())

  if (redis) {
    shutdown.register(new RedisShutdownHook(redis))
  }

  shutdown.register(new DatabaseShutdownHook(closeDrizzleConnection))
  shutdown.listen()
  // ──────────────────────────────────────────────────────────────

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║          🚀 Gravito DDD Starter - Running                      ║
╚════════════════════════════════════════════════════════════════╝

✨ Server started successfully!

📍 Base URL:       ${baseUrl}
🔧 Environment:    ${process.env.APP_ENV || 'development'}
🗂️  Database:       ${process.env.ENABLE_DB !== 'false' ? 'Enabled ✓' : 'Disabled ✗'}
💾 Cache Driver:   ${process.env.CACHE_DRIVER || 'memory'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Available Endpoints:

  Health Check:
    curl ${baseUrl}/health

  API Root:
    curl ${baseUrl}/api

  User Module (Example):
    curl ${baseUrl}/api/users

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 Next Steps:

  1. Review the module structure:
     open src/Modules/Profile/

  2. Read the documentation:
     open docs/ARCHITECTURE.md
     open docs/MODULE_GENERATION_WITH_ADAPTERS.md

  3. Create your first module:
     bun scripts/generate-module.ts MyFeature [--redis] [--cache] [--db]

  4. Run tests:
     bun test

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 Resources:
   - Gravito Docs:         https://github.com/gravito-framework/gravito
   - DDD Guide:            https://domaindriven.org/
   - Framework-Agnostic:   docs/ADAPTER_INFRASTRUCTURE_GUIDE.md
   - Module Generation:    docs/MODULE_GENERATION_WITH_ADAPTERS.md
   - Bun Docs:             https://bun.sh/docs

	🐛 Having trouble? Check docs/TROUBLESHOOTING.md for common issues.
`)

  return server
}

await start().catch((error) => {
  console.error('❌ Application startup failed:', error)
  process.exit(1)
})
```

- [ ] **Step 4: 執行全套測試確認無回歸**

```bash
bun test
```

預期：所有測試通過

- [ ] **Step 5: 手動冒煙測試**

```bash
# Terminal 1 — 啟動伺服器
bun run dev &
SERVER_PID=$!

# Terminal 2 — 確認健康
curl http://localhost:3000/health

# 送 SIGTERM，觀察 shutdown log
kill -TERM $SERVER_PID
```

預期 log：
```
[shutdown] SIGTERM received — drainTimeout=25000ms
[shutdown] BunServer closing...
[shutdown] BunServer closed (Xms)
...
[shutdown] All hooks completed — exiting with code 0
```

- [ ] **Step 6: Commit**

```bash
git add src/index.ts
git commit -m "feat: [shutdown] src/index.ts 整合 GracefulShutdown — SIGTERM 優雅關閉"
```

---

## 完成標準

- [ ] `bun test` 全部通過
- [ ] 收到 SIGTERM 後 log 正確輸出關閉順序
- [ ] 無 TypeScript 型別錯誤（`bun tsc --noEmit`）
