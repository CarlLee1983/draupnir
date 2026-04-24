import type { IShutdownHook } from '../IShutdownHook'

type RedisShutdownClient = {
  disconnect?: () => Promise<void> | void
  quit?: () => Promise<void> | void
}

export class RedisShutdownHook implements IShutdownHook {
  readonly name = 'Redis'

  constructor(private readonly redis: RedisShutdownClient) {}

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
