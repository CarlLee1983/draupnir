import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'
import type { RedisClientContract } from '@gravito/plasma'

/**
 * 適配器：將 Gravito Plasma RedisClientContract 適配為 IRedisService
 */
export class GravitoRedisAdapter implements IRedisService {
	constructor(private readonly redis: RedisClientContract) {}

	async ping(): Promise<string> {
		return this.redis.ping()
	}

	async get(key: string): Promise<string | null> {
		return this.redis.get(key)
	}

	async set(
		key: string,
		value: string,
		expiresInSeconds?: number,
	): Promise<void> {
		await this.redis.set(
			key,
			value,
			expiresInSeconds ? { ex: expiresInSeconds } : undefined,
		)
	}

	async del(key: string): Promise<void> {
		await this.redis.del(key)
	}

	async exists(key: string): Promise<boolean> {
		return (await this.redis.exists(key)) > 0
	}
}
