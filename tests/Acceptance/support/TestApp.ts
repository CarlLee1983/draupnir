import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import type { PlanetCore } from '@gravito/core'
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import { DomainEventDispatcher } from '@/Shared/Domain/DomainEventDispatcher'
import { adaptGravitoContainer } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { MockGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway/implementations/MockGatewayClient'
import type { IJwtTokenService } from '@/Modules/Auth/Application/Ports/IJwtTokenService'
import type { RefreshTokenService } from '@/Modules/Auth/Application/Services/RefreshTokenService'
import { configureAuthMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import { configureTokenRefresh } from '@/Website/Http/Middleware/TokenRefreshMiddleware'
import { joinPath } from '@/Website/Http/Routing/routePath'
import { createLastResultStore, type LastResultStore } from './lastResult'
import { InProcessHttpClient } from './http/InProcessHttpClient'
import { TestAuth } from './http/TestAuth'
import { TestSeed } from './seeds'
import { ManualQueue } from './fakes/ManualQueue'
import { ManualScheduler } from './fakes/ManualScheduler'
import { runAcceptanceMigrations } from './db/migrate'
import { truncateAcceptanceTables } from './db/truncate'
import { TestClock } from './TestClock'

export interface CapturedEvent {
  readonly eventType: string
  readonly data: Record<string, unknown>
  readonly occurredAt: Date
}

/**
 * Anchored to wall-clock at TestApp.boot() so token rows persisted with
 * TestClock-derived expires_at remain "in the future" relative to repository
 * filters that still use `new Date()` (e.g. AuthTokenRepository.findByUserId).
 * TestClock can still advance independently to drive expiry-controlled tests.
 */
function initialClockBaseline(): Date {
  return new Date()
}

export class TestApp {
  readonly container: IContainer
  readonly clock: TestClock
  readonly gateway: MockGatewayClient
  readonly scheduler: ManualScheduler
  readonly queue: ManualQueue
  readonly events: CapturedEvent[]
  readonly http: InProcessHttpClient
  readonly auth: TestAuth
  readonly seed: TestSeed
  readonly lastResult: LastResultStore

  private readonly core: PlanetCore
  private readonly dbPath: string
  private readonly unsubscribeObserver: () => void
  private readonly initialClock: Date

  private constructor(params: {
    core: PlanetCore
    container: IContainer
    clock: TestClock
    initialClock: Date
    gateway: MockGatewayClient
    scheduler: ManualScheduler
    queue: ManualQueue
    events: CapturedEvent[]
    http: InProcessHttpClient
    auth: TestAuth
    seed: TestSeed
    lastResult: LastResultStore
    dbPath: string
    unsubscribeObserver: () => void
  }) {
    this.core = params.core
    this.container = params.container
    this.clock = params.clock
    this.initialClock = params.initialClock
    this.gateway = params.gateway
    this.scheduler = params.scheduler
    this.queue = params.queue
    this.events = params.events
    this.http = params.http
    this.auth = params.auth
    this.seed = params.seed
    this.lastResult = params.lastResult
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

    const initialClock = initialClockBaseline()
    const clock = new TestClock(initialClock)
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

    // Wire the real authTokenRepository so the middleware revocation check uses the DB.
    // Pass the container-bound jwtTokenService so middleware verification honors the injected TestClock.
    const containerJwtService = container.make('jwtTokenService') as IJwtTokenService
    configureAuthMiddleware(
      container.make('authTokenRepository') as IAuthTokenRepository,
      containerJwtService,
    )
    configureTokenRefresh(
      container.make('refreshTokenService') as RefreshTokenService,
      containerJwtService,
    )
    const http = new InProcessHttpClient(core)
    const auth = new TestAuth(container)
    const seed = new TestSeed(() => container.make('database') as IDatabaseAccess, gateway)
    const lastResult = createLastResultStore()

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
      initialClock,
      gateway,
      scheduler,
      queue,
      events,
      http,
      auth,
      seed,
      lastResult,
      dbPath,
      unsubscribeObserver,
    })
  }

  get db(): IDatabaseAccess {
    return this.container.make('database') as IDatabaseAccess
  }

  async reset(): Promise<void> {
    this.lastResult.clear()
    await truncateAcceptanceTables(this.db)
    this.gateway.reset()
    this.scheduler.stopAll()
    this.queue.reset()
    this.events.length = 0
    this.clock.setNow(new Date(this.initialClock.getTime()))
  }

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
