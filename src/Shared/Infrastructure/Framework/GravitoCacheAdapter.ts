import type { ICacheService } from '@/Shared/Infrastructure/ICacheService'
import type { CacheManager } from '@gravito/stasis'

/**
 * 適配器：將 Gravito Stasis CacheManager 適配為 ICacheService
 */
export class GravitoCacheAdapter implements ICacheService {
	constructor(private readonly cache: CacheManager) {}

	async get<T = unknown>(key: string): Promise<T | null> {
		return this.cache.get<T>(key)
	}

	async set<T = unknown>(
		key: string,
		value: T,
		ttlSeconds?: number,
	): Promise<void> {
		await this.cache.set(key, value, ttlSeconds)
	}

	async forget(key: string): Promise<void> {
		await this.cache.forget(key)
	}

	async flush(): Promise<void> {
		await this.cache.flush()
	}
}
