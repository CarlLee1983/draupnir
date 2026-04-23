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

  async xadd(key: string, data: Record<string, string>, maxlen?: number): Promise<string> {
    return (this.redis as any).xadd(key, data, maxlen ? { maxlen, approximate: true } : undefined)
  }

  async xreadgroup(
    group: string,
    consumer: string,
    streams: Record<string, string>,
    count?: number,
    block?: number
  ): Promise<any> {
    return (this.redis as any).xreadgroup(group, consumer, streams, { count, block })
  }

  async xack(key: string, group: string, ...ids: string[]): Promise<number> {
    return (this.redis as any).xack(key, group, ...ids)
  }

  async xgroupCreate(key: string, group: string, id = '$', mkstream = true): Promise<boolean> {
    try {
      await (this.redis as any).xgroup('CREATE', key, group, id, mkstream)
      return true
    } catch (err: any) {
      if (err.message?.includes('BUSYGROUP')) return true // Group already exists
      throw err
    }
  }
}
