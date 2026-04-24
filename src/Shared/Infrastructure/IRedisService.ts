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

  /**
   * Closes the Redis connection (used for graceful shutdown).
   *
   * @returns A promise that resolves when the connection is closed.
   */
  disconnect(): Promise<void>

  /**
   * Redis Stream: Adds an entry to a stream.
   *
   * @param key - Stream key.
   * @param data - Field-value pairs to add.
   * @param maxlen - Optional maximum length of the stream.
   * @returns The generated entry ID.
   */
  xadd(key: string, data: Record<string, string>, maxlen?: number): Promise<string>

  /**
   * Redis Stream: Reads entries from a stream using a consumer group.
   *
   * @param group - Consumer group name.
   * @param consumer - Consumer name.
   * @param streams - Record of stream keys to IDs (e.g., { 'mystream': '>' }).
   * @param count - Maximum number of entries to read.
   * @param block - Milliseconds to block if no data is available.
   * @returns The raw result from Redis.
   */
  xreadgroup(
    group: string,
    consumer: string,
    streams: Record<string, string>,
    count?: number,
    block?: number,
  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  ): Promise<any>

  /**
   * Redis Stream: Acknowledges one or more entries in a stream.
   *
   * @param key - Stream key.
   * @param group - Consumer group name.
   * @param ids - Entry IDs to acknowledge.
   * @returns The number of entries successfully acknowledged.
   */
  xack(key: string, group: string, ...ids: string[]): Promise<number>

  /**
   * Redis Stream: Creates a consumer group.
   *
   * @param key - Stream key.
   * @param group - Group name to create.
   * @param id - Starting ID (defaults to '$' for new entries only).
   * @param mkstream - Whether to create the stream if it doesn't exist.
   * @returns True if the group was created.
   */
  xgroupCreate(key: string, group: string, id?: string, mkstream?: boolean): Promise<boolean>
}
