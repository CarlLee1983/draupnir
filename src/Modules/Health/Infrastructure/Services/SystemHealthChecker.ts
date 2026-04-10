/**
 * SystemHealthChecker
 * Infrastructure implementation of system health checking.
 * Handles actual DB/Redis/Cache connectivity via framework-agnostic port interfaces.
 */

import type { ISystemHealthChecker } from '../../Domain/Ports/ISystemHealthChecker'
import type { IDatabaseConnectivityCheck } from '@/Shared/Infrastructure/IDatabaseConnectivityCheck'
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'
import type { ICacheService } from '@/Shared/Infrastructure/ICacheService'

export class SystemHealthChecker implements ISystemHealthChecker {
  constructor(
    private readonly db: IDatabaseConnectivityCheck | null,
    private readonly redis?: IRedisService | null,
    private readonly cache?: ICacheService | null,
  ) {}

  async checkDatabase(): Promise<boolean> {
    try {
      if (!this.db) return false
      return await this.db.ping()
    } catch {
      return false
    }
  }

  async checkRedis(): Promise<boolean> {
    try {
      if (!this.redis) return true
      await this.redis.ping()
      return true
    } catch {
      return false
    }
  }

  async checkCache(): Promise<boolean> {
    try {
      if (!this.cache) return true
      const testKey = `health-check-${Date.now()}`
      await this.cache.set(testKey, 'ok', 10)
      const value = await this.cache.get<string>(testKey)
      await this.cache.forget(testKey)
      return value === 'ok'
    } catch {
      return false
    }
  }
}
