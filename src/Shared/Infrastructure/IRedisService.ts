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
   * 原子遞增 key 的值，若 key 不存在則設為 1，同時設定 TTL。
   * 回傳遞增後的值。
   *
   * @param key - Redis key
   * @param ttlSeconds - key 的存活時間（秒），僅在 key 首次建立（count = 1）時設定
   */
  incr(key: string, ttlSeconds: number): Promise<number>
}
