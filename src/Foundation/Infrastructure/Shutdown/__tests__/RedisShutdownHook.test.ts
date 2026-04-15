import { describe, expect, it, vi } from 'vitest'
import { RedisShutdownHook } from '../hooks/RedisShutdownHook'
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'

const makeRedis = (): IRedisService => ({
  ping: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  incr: vi.fn(),
  disconnect: vi.fn().mockResolvedValue(undefined),
})

describe('RedisShutdownHook', () => {
  it('name 為 "Redis"', () => {
    expect(new RedisShutdownHook(makeRedis()).name).toBe('Redis')
  })

  it('shutdown() 呼叫 redis.disconnect()', async () => {
    const redis = makeRedis()
    await new RedisShutdownHook(redis).shutdown()
    expect(redis.disconnect).toHaveBeenCalledOnce()
  })
})
