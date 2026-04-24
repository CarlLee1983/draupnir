import { describe, expect, it, mock } from 'bun:test'
import { RedisShutdownHook } from '../hooks/RedisShutdownHook'

const makeRedis = () => {
  const disconnect = mock(async () => {})
  return {
    disconnect,
  }
}

describe('RedisShutdownHook', () => {
  it('name 為 "Redis"', () => {
    expect(new RedisShutdownHook(makeRedis()).name).toBe('Redis')
  })

  it('shutdown() 呼叫 redis.disconnect()', async () => {
    const redis = makeRedis()
    await new RedisShutdownHook(redis).shutdown()
    expect(redis.disconnect).toHaveBeenCalled()
  })

  it('shutdown() 在 raw client 上呼叫 quit()', async () => {
    const quit = mock(async () => {})
    await new RedisShutdownHook({ quit }).shutdown()
    expect(quit).toHaveBeenCalled()
  })
})
