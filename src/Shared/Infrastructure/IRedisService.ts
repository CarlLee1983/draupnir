/**
 * Redis Service Interface (Port)
 *
 * Completely unaware of Gravito/Plasma, allowing future framework changes
 * or testing with InMemory implementations.
 */

export interface IRedisService {
  /**
   * Connection test, returns PONG or throws an exception.
   */
  ping(): Promise<string>

  /**
   * Retrieves a string value; returns null if the key does not exist.
   */
  get(key: string): Promise<string | null>

  /**
   * Sets a string value with an optional expiration in seconds.
   *
   * @param key - Redis key.
   * @param value - String value.
   * @param expiresInSeconds - Optional expiration time in seconds.
   */
  set(key: string, value: string, expiresInSeconds?: number): Promise<void>

  /**
   * Deletes a key.
   */
  del(key: string): Promise<void>

  /**
   * Checks if a key exists.
   */
  exists(key: string): Promise<boolean>

  /**
   * Atomically increments the value of a key. If the key does not exist,
   * it is set to 1. Sets the TTL only when the key is first created (count === 1).
   *
   * @param key - Redis key.
   * @param ttlSeconds - Time-to-live in seconds, applied only on first creation. Must be a positive integer.
   * @returns The value after increment.
   */
  incr(key: string, ttlSeconds: number): Promise<number>

  /** 關閉 Redis 連線（用於 graceful shutdown）。 */
  disconnect(): Promise<void>
}
