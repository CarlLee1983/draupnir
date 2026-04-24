import { describe, expect, it } from 'vitest'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { createInMemoryRateLimit } from '../InMemoryRateLimitMiddleware'

const createMockContext = (ip?: string): IHttpContext => {
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

describe('InMemoryRateLimitMiddleware', () => {
  it('請求數在限制內 → next() 執行，回傳 200', async () => {
    const mw = createInMemoryRateLimit({ scope: 'test', max: 3, windowMs: 60_000 })
    const ctx = createMockContext('1.2.3.4')
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })

  it('請求數超過限制 → 429，不執行 next()', async () => {
    const mw = createInMemoryRateLimit({ scope: 'test', max: 2, windowMs: 60_000 })
    const ctx = createMockContext('1.2.3.4')
    await mw(ctx, async () => new Response('ok'))
    await mw(ctx, async () => new Response('ok'))
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
    const mw = createInMemoryRateLimit({ scope: 'test', max: 1, windowMs: 60_000 })
    const ctx = createMockContext('1.2.3.4')
    await mw(ctx, async () => new Response('ok'))
    const response = await mw(ctx, async () => new Response('ok'))
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBeTruthy()
  })

  it('窗口到期後計數重置 → next() 執行', async () => {
    const mw = createInMemoryRateLimit({ scope: 'reset', max: 1, windowMs: 50 })
    const ctx = createMockContext('1.2.3.4')
    await mw(ctx, async () => new Response('ok'))
    // 等窗口過期
    await new Promise((r) => setTimeout(r, 60))
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })

  it('不同 scope 互不干擾', async () => {
    const mw1 = createInMemoryRateLimit({ scope: 'login', max: 1, windowMs: 60_000 })
    const mw2 = createInMemoryRateLimit({ scope: 'forgot', max: 1, windowMs: 60_000 })
    const ctx = createMockContext('1.2.3.4')
    await mw1(ctx, async () => new Response('ok'))
    // mw1 已滿，mw2 應仍可通過
    const response = await mw2(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })

  it('不同 IP 互不干擾', async () => {
    const mw = createInMemoryRateLimit({ scope: 'test', max: 1, windowMs: 60_000 })
    const ctx1 = createMockContext('1.1.1.1')
    const ctx2 = createMockContext('2.2.2.2')
    await mw(ctx1, async () => new Response('ok'))
    // ctx1 已滿，ctx2 應仍可通過
    const response = await mw(ctx2, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })

  it('無 IP header → 歸入 unknown，正常計數', async () => {
    const mw = createInMemoryRateLimit({ scope: 'test', max: 1, windowMs: 60_000 })
    const ctx = createMockContext(undefined)
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })
})
