import type { RedisClientContract } from '@gravito/plasma'
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'

/**
 * Adapter: Adapts Gravito Plasma RedisClientContract to IRedisService.
 */
export class GravitoRedisAdapter implements IRedisService {
  constructor(private readonly redis: RedisClientContract) {}

  async ping(): Promise<string> {
    return this.redis.ping()
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key)
  }

  async set(key: string, value: string, expiresInSeconds?: number): Promise<void> {
    await this.redis.set(key, value, expiresInSeconds ? { ex: expiresInSeconds } : undefined)
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key)
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) > 0
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const count = await (this.redis as any).incr(key)
    if (count === 1) {
      await (this.redis as any).expire(key, ttlSeconds)
    }
    return count
  }

  async disconnect(): Promise<void> {
    // RedisClientContract 底層為 ioredis-compatible client，提供 quit()。
    // 因 @gravito/plasma 型別未宣告 quit()，使用窄型別轉換代替 as any。
    await (this.redis as { quit?: () => Promise<void> }).quit?.()
  }
}
