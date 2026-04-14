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
    const adapter = new GravitoRedisAdapter(plasma as any)
    const count = await adapter.incr('test:key', 60)
    expect(count).toBe(1)
    expect(plasma.incr).toHaveBeenCalledWith('test:key')
    expect(plasma.expire).toHaveBeenCalledWith('test:key', 60)
  })

  it('既有 key（count > 1）→ 不呼叫 expire，回傳累加值', async () => {
    const plasma = createMockPlasmaRedis(2)
    const adapter = new GravitoRedisAdapter(plasma as any)
    const count = await adapter.incr('test:key', 60)
    expect(count).toBe(2)
    expect(plasma.expire).not.toHaveBeenCalled()
  })

  it('每次呼叫都觸發 redis.incr', async () => {
    const plasma = createMockPlasmaRedis(3)
    const adapter = new GravitoRedisAdapter(plasma as any)
    await adapter.incr('rate:login:127.0.0.1:100', 600)
    expect(plasma.incr).toHaveBeenCalledWith('rate:login:127.0.0.1:100')
  })
})
