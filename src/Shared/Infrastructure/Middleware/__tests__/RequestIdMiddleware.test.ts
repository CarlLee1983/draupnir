import { describe, expect, it } from 'vitest'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { createRequestIdMiddleware } from '../RequestIdMiddleware'

const createMockContext = (opts: { requestId?: string } = {}): IHttpContext => {
  const state: Record<string, unknown> = {}
  const headers: Record<string, string | undefined> = {
    'x-request-id': opts.requestId,
  }
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: (name: string) => headers[name.toLowerCase()],
    getPathname: () => '/',
    getMethod: () => 'GET',
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

describe('RequestIdMiddleware', () => {
  const mw = createRequestIdMiddleware()

  it('上游有 x-request-id → 透傳並存入 ctx', async () => {
    const upstream = 'upstream-id-123'
    const ctx = createMockContext({ requestId: upstream })
    const response = await mw(ctx, async () => new Response('ok'))
    expect(ctx.get('requestId')).toBe(upstream)
    expect(response.headers.get('x-request-id')).toBe(upstream)
  })

  it('上游無 x-request-id → 產生新 UUID 存入 ctx', async () => {
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('ok'))
    const id = ctx.get<string>('requestId')
    expect(id).toBeDefined()
    expect(typeof id).toBe('string')
    expect(id?.length).toBeGreaterThan(0)
    expect(response.headers.get('x-request-id')).toBe(id)
  })

  it('每次產生的 ID 不重複', async () => {
    const mw2 = createRequestIdMiddleware()
    const ctx1 = createMockContext()
    const ctx2 = createMockContext()
    await mw(ctx1, async () => new Response('ok'))
    await mw2(ctx2, async () => new Response('ok'))
    expect(ctx1.get('requestId')).not.toBe(ctx2.get('requestId'))
  })

  it('response header x-request-id 保留原有 response headers', async () => {
    const ctx = createMockContext()
    const response = await mw(
      ctx,
      async () => new Response('ok', { headers: { 'content-type': 'application/json' } }),
    )
    expect(response.headers.get('content-type')).toBe('application/json')
    expect(response.headers.get('x-request-id')).toBeTruthy()
  })
})
