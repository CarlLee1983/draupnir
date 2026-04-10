import type { PlanetCore } from '@gravito/core'
import type { RedisClientContract } from '@gravito/plasma'
import type { CacheManager } from '@gravito/stasis'
import { createGravitoModuleRouter } from './GravitoModuleRouter'
import { GravitoRedisAdapter } from './GravitoRedisAdapter'
import { GravitoCacheAdapter } from './GravitoCacheAdapter'
import { createGravitoDatabaseConnectivityCheck } from '../Database/Adapters/Atlas'
import { PerformHealthCheckService } from '@/Modules/Health/Application/Services/PerformHealthCheckService'
import { HealthController } from '@/Modules/Health/Presentation/Controllers/HealthController'
import { MemoryHealthCheckRepository } from '@/Modules/Health/Infrastructure/Repositories/MemoryHealthCheckRepository'

/**
 * Gravito Health Module Adapter
 *
 * Responsibilities:
 * 1. Retrieve Redis/Cache from PlanetCore (may be undefined).
 * 2. Adapt to IRedisService/ICacheService.
 * 3. Assemble PerformHealthCheckService + HealthController.
 * 4. Register routes via IModuleRouter.
 *
 * This is the only location that knows how Gravito organizes services.
 * All underlying modules are completely decoupled from the framework.
 *
 * @example
 * registerHealthWithGravito(core)
 */
function tryMake<T>(core: PlanetCore, key: string): T | undefined {
  try {
    return core.container.make<T>(key as never)
  } catch {
    return undefined
  }
}

export function registerHealthWithGravito(core: PlanetCore): void {
  // Retrieve raw services from PlanetCore (might not be registered, e.g., lightweight startup with ORM=memory)
  const rawRedis = tryMake<RedisClientContract>(core, 'redis')
  const rawCache = tryMake<CacheManager>(core, 'cache')

  // Adapt to framework-agnostic interfaces (null indicates NOT set)
  const redis = rawRedis ? new GravitoRedisAdapter(rawRedis) : null
  const cache = rawCache ? new GravitoCacheAdapter(rawCache) : null

  // Assemble Application layer (Injected by Gravito DB adapter, Repository decoupled from ORM)
  const repository = new MemoryHealthCheckRepository()
  const databaseCheck = createGravitoDatabaseConnectivityCheck()
  const performHealthCheckService = new PerformHealthCheckService(repository)
  const controller = new HealthController(performHealthCheckService)

  // Establish framework-agnostic routing interface
  const router = createGravitoModuleRouter(core)

  // Register routes via IModuleRouter
  router.get('/health', (ctx) => {
    // For compatibility with current APIs, inject adapter services into context
    ctx.set('__redis', redis)
    ctx.set('__cache', cache)
    ctx.set('__databaseCheck', databaseCheck)
    return controller.check(ctx)
  })

  router.get('/health/history', (ctx) => controller.history(ctx))
}

