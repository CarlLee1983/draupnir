import type { PlanetCore } from '@gravito/core'
import type { RedisClientContract } from '@gravito/plasma'
import type { CacheManager } from '@gravito/stasis'
import { createGravitoModuleRouter } from './GravitoModuleRouter'
import { GravitoRedisAdapter } from './GravitoRedisAdapter'
import { GravitoCacheAdapter } from './GravitoCacheAdapter'
import { createGravitoDatabaseConnectivityCheck } from '../Database/Adapters/Atlas'
import { SystemHealthChecker } from '@/Modules/Health/Infrastructure/Services/SystemHealthChecker'
import { PerformHealthCheckService } from '@/Modules/Health/Application/Services/PerformHealthCheckService'
import { HealthController } from '@/Modules/Health/Presentation/Controllers/HealthController'
import { MemoryHealthCheckRepository } from '@/Modules/Health/Infrastructure/Repositories/MemoryHealthCheckRepository'

/**
 * Gravito Health Module Adapter
 *
 * Responsibilities:
 * 1. Retrieve Redis/Cache from PlanetCore (may be undefined).
 * 2. Adapt to IRedisService/ICacheService.
 * 3. Assemble SystemHealthChecker + PerformHealthCheckService + HealthController.
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
  const databaseCheck = createGravitoDatabaseConnectivityCheck()

  // Assemble Infrastructure health checker with port-based interfaces
  const healthChecker = new SystemHealthChecker(databaseCheck, redis, cache)

  // Assemble Application layer
  const repository = new MemoryHealthCheckRepository()
  const performHealthCheckService = new PerformHealthCheckService(repository, healthChecker)
  const controller = new HealthController(performHealthCheckService)

  // Establish framework-agnostic routing interface
  const router = createGravitoModuleRouter(core)

  // Register routes via IModuleRouter
  router.get('/health', (ctx) => controller.check(ctx), { name: 'health.check' })
  router.get('/health/history', (ctx) => controller.history(ctx), { name: 'health.history' })
}
