import { describe, expect, it, vi } from 'vitest'
import type { IRedisService } from '@/Shared/Infrastructure/IRedisService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { createRedisRateLimit } from '../RedisRateLimitMiddleware'

const createMockRedis = (incrReturn: number | Error = 1): IRedisService =>
  ({
    ping: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    incr: vi
      .fn()
      .mockImplementation(() =>
        incrReturn instanceof Error ? Promise.reject(incrReturn) : Promise.resolve(incrReturn),
      ),
    disconnect: vi.fn(),
  }) as unknown as IRedisService

const createMockContext = (ip = '1.2.3.4'): IHttpContext => {
  const state: Record<string, unknown> = {}
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: (name: string) => {
      if (name === 'x-forwarded-for') return ip
      return undefined
    },
    getPathname: () => '/',
    getMethod: () => 'POST',
    getParam: () => undefined,
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: <T>(data: T, status = 200) => new Response(JSON.stringify(data), { status }),
    text: (content: string, status = 200) => new Response(content, { status }),
    redirect: (url: string, status = 302) =>
      new Response(null, { status, headers: { Location: url } }),
    get: <T>(key: string): T | undefined => state[key] as T,
    set: (key: string, value: unknown) => {
      state[key] = value
    },
    getCookie: () => undefined,
    setCookie: () => {},
  } as IHttpContext
}

describe('RedisRateLimitMiddleware', () => {
  const config = { scope: 'auth:login', max: 10, windowMs: 60_000 }

  it('Redis count 在限制內 → next() 執行，回傳 200', async () => {
    const redis = createMockRedis(5)
    const mw = createRedisRateLimit(redis, config)
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })

  it('Redis count 超過限制 → 429，不執行 next()', async () => {
    const redis = createMockRedis(11)
    const mw = createRedisRateLimit(redis, config)
    const ctx = createMockContext()
    let called = false
    const response = await mw(ctx, async () => {
      called = true
      return new Response('ok')
    })
    expect(response.status).toBe(429)
    expect(called).toBe(false)
    const body = await response.json()
    expect(body).toEqual({ success: false, message: 'Too many requests', error: 'RATE_LIMITED' })
  })

  it('429 回應包含 Retry-After header', async () => {
    const redis = createMockRedis(999)
    const mw = createRedisRateLimit(redis, config)
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('ok'))
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBeTruthy()
  })

  it('Redis.incr 拋錯（fail-open）→ next() 執行，回傳 200', async () => {
    const redis = createMockRedis(new Error('Redis connection refused'))
    const mw = createRedisRateLimit(redis, config)
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })

  it('呼叫 redis.incr 時 key 包含 scope 和 IP', async () => {
    const redis = createMockRedis(1)
    const mw = createRedisRateLimit(redis, { scope: 'auth:login', max: 10, windowMs: 60_000 })
    const ctx = createMockContext('10.0.0.1')
    await mw(ctx, async () => new Response('ok'))
    expect(redis.incr).toHaveBeenCalledWith(
      expect.stringContaining('auth:login'),
      expect.any(Number),
    )
    expect(redis.incr).toHaveBeenCalledWith(expect.stringContaining('10.0.0.1'), expect.any(Number))
  })

  it('count 等於 max（邊界值）→ next() 執行', async () => {
    const redis = createMockRedis(10) // count === max
    const mw = createRedisRateLimit(redis, config)
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })
})
