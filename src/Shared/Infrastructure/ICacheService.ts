/**
 * Cache Service Interface (Port)
 *
 * The application layer depends on this interface rather than specific 
 * framework implementations (e.g., Gravito Stasis). 
 * Supports substitution with testing frameworks or other cache implementations.
 */

export interface ICacheService {
  /**
   * Retrieves a value from the cache.
   *
   * @param key - Cache key.
   * @returns Cache value or null (if non-existent or expired).
   */
  get<T = unknown>(key: string): Promise<T | null>

  /**
   * Sets a cache value.
   *
   * @param key - Cache key.
   * @param value - Cache value.
   * @param ttlSeconds - Time-to-live in seconds (optional).
   */
  set<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void>

  /**
   * Deletes a cache key.
   */
  forget(key: string): Promise<void>

  /**
   * Flushes all cache entries.
   */
  flush(): Promise<void>
}

