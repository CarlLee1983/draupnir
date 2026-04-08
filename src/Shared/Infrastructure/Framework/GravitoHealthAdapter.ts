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
 * Gravito Health 模組完整適配器
 *
 * 責任：
 * 1. 從 PlanetCore 取得 Redis/Cache（可能為 undefined）
 * 2. 適配為 IRedisService/ICacheService
 * 3. 組裝 PerformHealthCheckService + HealthController
 * 4. 透過 IModuleRouter 註冊路由
 *
 * 這是唯一知道 Gravito 如何組織服務的地方。
 * 所有底層模組完全無框架耦合。
 *
 * @example
 * registerHealthWithGravito(core)
 */
export function registerHealthWithGravito(core: PlanetCore): void {
	// 從 PlanetCore 取得原始服務（可能為 undefined）
	const rawRedis = core.container.make<RedisClientContract | undefined>('redis')
	const rawCache = core.container.make<CacheManager | undefined>('cache')

	// 適配為框架無關的介面（null 表示未設定）
	const redis = rawRedis ? new GravitoRedisAdapter(rawRedis) : null
	const cache = rawCache ? new GravitoCacheAdapter(rawCache) : null

	// 組裝應用層（由 Gravito DB 適配器注入，Repository 與 ORM 解耦）
	const repository = new MemoryHealthCheckRepository()
	const databaseCheck = createGravitoDatabaseConnectivityCheck()
	const performHealthCheckService = new PerformHealthCheckService(repository)
	const controller = new HealthController(performHealthCheckService)

	// 建立框架無關的路由介面
	const router = createGravitoModuleRouter(core)

	// 透過 IModuleRouter 註冊路由
	router.get('/health', (ctx) => {
		// 為了相容目前的 API，將適配器服務注入到 context
		ctx.set('__redis', redis)
		ctx.set('__cache', cache)
		ctx.set('__databaseCheck', databaseCheck)
		return controller.check(ctx)
	})

	router.get('/health/history', (ctx) => controller.history(ctx))
}
