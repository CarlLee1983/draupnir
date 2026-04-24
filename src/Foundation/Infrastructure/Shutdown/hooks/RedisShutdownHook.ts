import type { IShutdownHook } from '../IShutdownHook'

type RedisShutdownClient = {
  disconnect?: () => Promise<void> | void
  quit?: () => Promise<void> | void
}

/**
 * Shutdown hook for disconnecting from Redis.
 */
export class RedisShutdownHook implements IShutdownHook {
  /** Resource name. */
  readonly name = 'Redis'

  /**
   * Initializes the hook with a Redis client.
   * @param redis - Object exposing disconnect or quit methods
   */
  constructor(private readonly redis: RedisShutdownClient) {}

  /**
   * Disconnects the Redis client.
   * @returns A promise that resolves when disconnected
   * @throws Error if the client does not expose standard shutdown methods
   */
  async shutdown(): Promise<void> {
    if (typeof this.redis.disconnect === 'function') {
      await this.redis.disconnect()
      return
    }

    if (typeof this.redis.quit === 'function') {
      await this.redis.quit()
      return
    }

    throw new Error('Redis client does not expose disconnect() or quit().')
  }
}
