import type { IShutdownHook } from '../IShutdownHook'
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'

export class RedisShutdownHook implements IShutdownHook {
  readonly name = 'Redis'

  constructor(private readonly redis: IRedisService) {}

  async shutdown(): Promise<void> {
    await this.redis.disconnect()
  }
}
