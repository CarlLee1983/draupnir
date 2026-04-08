/**
 * HealthCheckService
 * 領域服務：執行系統健康檢查
 */

export interface SystemChecks {
  database: boolean
  redis?: boolean
  cache?: boolean
}

/**
 * 執行系統健康檢查的領域服務
 * 返回每個系統元件的狀態
 */
export class HealthCheckService {
  /**
   * 檢查數據庫連接
   */
  async checkDatabase(db: any): Promise<boolean> {
    try {
      if (!db) return false
      // 嘗試執行簡單查詢
      await db.raw('SELECT 1')
      return true
    } catch (error) {
      console.error('Database health check failed:', error)
      return false
    }
  }

  /**
   * 檢查 Redis 連接
   */
  async checkRedis(redis: any): Promise<boolean> {
    try {
      if (!redis) return true // Redis 是可選的
      await redis.ping()
      return true
    } catch (error) {
      console.error('Redis health check failed:', error)
      return false
    }
  }

  /**
   * 檢查快取服務
   */
  async checkCache(cache: any): Promise<boolean> {
    try {
      if (!cache) return true // Cache 是可選的
      // 嘗試寫入和讀取
      const testKey = `health-check-${Date.now()}`
      await cache.set(testKey, 'ok', 10) // 10 秒 TTL
      const value = await cache.get(testKey)
      await cache.delete(testKey)
      return value === 'ok'
    } catch (error) {
      console.error('Cache health check failed:', error)
      return false
    }
  }

  /**
   * 執行完整的系統健康檢查
   */
  async checkSystem(db: any, redis?: any, cache?: any): Promise<SystemChecks> {
    const [dbOk, redisOk, cacheOk] = await Promise.all([
      this.checkDatabase(db),
      this.checkRedis(redis),
      this.checkCache(cache)
    ])

    return {
      database: dbOk,
      redis: redisOk,
      cache: cacheOk
    }
  }
}
