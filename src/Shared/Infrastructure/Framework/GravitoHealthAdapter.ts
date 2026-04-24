import type { RedisClientContract } from '@gravito/plasma'
import type { CacheManager } from '@gravito/stasis'
import { PerformHealthCheckService } from '@/Modules/Health/Application/Services/PerformHealthCheckService'
import { MemoryHealthCheckRepository } from '@/Modules/Health/Infrastructure/Repositories/MemoryHealthCheckRepository'
import { SystemHealthChecker } from '@/Modules/Health/Infrastructure/Services/SystemHealthChecker'
import { HealthController } from '@/Modules/Health/Presentation/Controllers/HealthController'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import { createGravitoDatabaseConnectivityCheck } from '../Database/Adapters/Atlas'
import { GravitoCacheAdapter } from './GravitoCacheAdapter'
import { GravitoRedisAdapter } from './GravitoRedisAdapter'

/**
 * Gravito Health Module Adapter
 *
 * Responsibilities:
 * 1. Retrieve Redis/Cache from IContainer (may be undefined).
 * 2. Adapt to IRedisService/ICacheService.
 * 3. Assemble SystemHealthChecker + PerformHealthCheckService + HealthController.
 * 4. Register routes via IModuleRouter.
 *
 * This is the only location that knows how Gravito organizes services.
 * All underlying modules are completely decoupled from the framework.
 *
 * @example
 * registerHealthWithGravito(context)
 */
function tryMake<T>(container: IContainer, key: string): T | undefined {
  try {
    return container.make(key) as T
  } catch {
    return undefined
  }
}

export function registerHealthWithGravito(context: IRouteContext): void {
  // Retrieve raw services from container (might not be registered, e.g., lightweight startup with ORM=memory)
  const rawRedis = tryMake<RedisClientContract>(context.container, 'redis')
  const rawCache = tryMake<CacheManager>(context.container, 'cache')

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

  // Register routes via IModuleRouter
  context.router.get('/health', (ctx) => controller.check(ctx), { name: 'health.check' })
  context.router.get('/health/history', (ctx) => controller.history(ctx), {
    name: 'health.history',
  })
}
