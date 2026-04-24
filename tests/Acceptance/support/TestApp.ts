import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import type { PlanetCore } from '@gravito/core'
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { adaptGravitoContainer } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import { joinPath } from '@/Website/Http/Routing/routePath'
import { ManualQueue } from './fakes/ManualQueue'
import { ManualScheduler } from './fakes/ManualScheduler'
import { runAcceptanceMigrations } from './db/migrate'
import { truncateAcceptanceTables } from './db/truncate'
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
 */
export class TestApp {
  readonly container: IContainer
  readonly clock: TestClock
  readonly gateway: MockGatewayClient
  readonly scheduler: ManualScheduler
  readonly queue: ManualQueue
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
    queue: ManualQueue
    events: CapturedEvent[]
    dbPath: string
    unsubscribeObserver: () => void
  }) {
    this.core = params.core
    this.container = params.container
    this.clock = params.clock
    this.gateway = params.gateway
    this.scheduler = params.scheduler
    this.queue = params.queue
    this.events = params.events
    this.dbPath = params.dbPath
    this.unsubscribeObserver = params.unsubscribeObserver
  }

  static async boot(): Promise<TestApp> {
    const workerId = process.env.VITEST_WORKER_ID ?? String(process.pid)
    const tmpRoot = joinPath(tmpdir(), 'draupnir-acceptance')
    mkdirSync(tmpRoot, { recursive: true })
    const dbPath = joinPath(tmpRoot, `worker-${workerId}.db`)

    process.env.ORM = 'atlas'
    process.env.ENABLE_DB = 'true'
    process.env.DB_CONNECTION = 'sqlite'
    process.env.DB_DATABASE = dbPath
    process.env.BIFROST_API_URL ??= 'http://localhost:8080'
    process.env.BIFROST_MASTER_KEY ??= 'acceptance-test-key'
    process.env.JWT_SECRET ??= 'acceptance-test-secret'

    rmSync(dbPath, { force: true })
    await runAcceptanceMigrations(dbPath)

    DomainEventDispatcher.resetForTesting()

    const clock = new TestClock(new Date(INITIAL_CLOCK_ISO))
    const gateway = new MockGatewayClient()
    const scheduler = new ManualScheduler()
    const queue = new ManualQueue()

    const { bootstrap } = await import('@/bootstrap')
    const core = await bootstrap(0, {
      afterRegister: (c) => {
        const nativeContainer = c.container as unknown as {
          forget?: (name: string) => void
          instance?: (name: string, value: unknown) => void
          singleton: (name: string, factory: () => unknown) => void
        }

        const rebind = (name: string, value: unknown) => {
          nativeContainer.forget?.(name)
          if (typeof nativeContainer.instance === 'function') {
            nativeContainer.instance(name, value)
          } else {
            nativeContainer.singleton(name, () => value)
          }
        }

        rebind('clock', clock)
        rebind('llmGatewayClient', gateway)
        rebind('scheduler', scheduler)
        rebind('queue', queue)
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
      queue,
      events,
      dbPath,
      unsubscribeObserver,
    })
  }

  /** Raw DB handle — use for state assertions. */
  get db(): IDatabaseAccess {
    return this.container.make('database') as IDatabaseAccess
  }

  /** Per-test cleanup. */
  async reset(): Promise<void> {
    await truncateAcceptanceTables(this.db)
    this.gateway.reset()
    this.scheduler.stopAll()
    this.queue.reset()
    this.events.length = 0
    this.clock.setNow(new Date(INITIAL_CLOCK_ISO))
  }

  /** Per-file cleanup. */
  async shutdown(): Promise<void> {
    this.unsubscribeObserver()
    DomainEventDispatcher.resetForTesting()
    await this.core.shutdown()
    this.scheduler.stopAll()
    await this.queue.close()
    rmSync(this.dbPath, { force: true })
    rmSync(`${this.dbPath}-journal`, { force: true })
    rmSync(`${this.dbPath}-shm`, { force: true })
    rmSync(`${this.dbPath}-wal`, { force: true })
  }
}
