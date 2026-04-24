import { describe, expect, it, vi } from 'vitest'
import { GravitoRedisAdapter } from '../GravitoRedisAdapter'

const createMockPlasmaRedis = (incrReturn = 1) => ({
  ping: vi.fn().mockResolvedValue('PONG'),
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(1),
  exists: vi.fn().mockResolvedValue(0),
  incr: vi.fn().mockResolvedValue(incrReturn),
  expire: vi.fn().mockResolvedValue(true),
})

describe('GravitoRedisAdapter.incr', () => {
  it('新 key（count = 1）→ 呼叫 expire 設定 TTL，回傳 1', async () => {
    const plasma = createMockPlasmaRedis(1)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const adapter = new GravitoRedisAdapter(plasma as any)
    const count = await adapter.incr('test:key', 60)
    expect(count).toBe(1)
    expect(plasma.incr).toHaveBeenCalledWith('test:key')
    expect(plasma.expire).toHaveBeenCalledWith('test:key', 60)
  })

  it('既有 key（count > 1）→ 不呼叫 expire，回傳累加值', async () => {
    const plasma = createMockPlasmaRedis(2)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const adapter = new GravitoRedisAdapter(plasma as any)
    const count = await adapter.incr('test:key', 60)
    expect(count).toBe(2)
    expect(plasma.expire).not.toHaveBeenCalled()
  })

  it('每次呼叫都觸發 redis.incr', async () => {
    const plasma = createMockPlasmaRedis(3)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const adapter = new GravitoRedisAdapter(plasma as any)
    await adapter.incr('rate:login:127.0.0.1:100', 600)
    expect(plasma.incr).toHaveBeenCalledWith('rate:login:127.0.0.1:100')
  })
})

describe('GravitoRedisAdapter.disconnect()', () => {
  it('呼叫底層 redis 的 quit()', async () => {
    const mockRedis = {
      ping: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      incr: vi.fn(),
      expire: vi.fn(),
      quit: vi.fn().mockResolvedValue(undefined),
    }
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const adapter = new GravitoRedisAdapter(mockRedis as any)
    await adapter.disconnect()
    expect(mockRedis.quit).toHaveBeenCalledOnce()
  })
})
