import { describe, expect, it } from 'vitest'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import { composePageHandler } from '../Inertia/withInertiaPage'

const createMockContext = (): IHttpContext => {
  const state: Record<string, unknown> = {}
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
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

describe('composePageHandler', () => {
  it('middleware 依 onion 順序執行', async () => {
    const order: string[] = []
    const mw1: Middleware = async (_ctx, next) => {
      order.push('mw1-before')
      const r = await next()
      order.push('mw1-after')
      return r
    }
    const mw2: Middleware = async (_ctx, next) => {
      order.push('mw2-before')
      const r = await next()
      order.push('mw2-after')
      return r
    }
    const handler = async (_ctx: IHttpContext) => {
      order.push('handler')
      return new Response('ok')
    }

    const composed = composePageHandler([mw1, mw2], handler)
    await composed(createMockContext())

    expect(order).toEqual(['mw1-before', 'mw2-before', 'handler', 'mw2-after', 'mw1-after'])
  })

  it('middleware 可短路，後面的 middleware 和 handler 不執行', async () => {
    const order: string[] = []
    const shortCircuit: Middleware = async (_ctx, _next) => {
      order.push('short-circuit')
      return new Response('blocked', { status: 403 })
    }
    const shouldNotRun: Middleware = async (_ctx, next) => {
      order.push('should-not-run')
      return next()
    }

    const composed = composePageHandler([shortCircuit, shouldNotRun], async () => {
      order.push('handler')
      return new Response('ok')
    })
    const response = await composed(createMockContext())

    expect(order).toEqual(['short-circuit'])
    expect(response.status).toBe(403)
  })

  it('空 middleware 陣列 → 直接執行 handler', async () => {
    const handler = async (_ctx: IHttpContext) => new Response('direct', { status: 200 })
    const composed = composePageHandler([], handler)
    const response = await composed(createMockContext())
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('direct')
  })

  it('middleware 可修改 handler 回傳的 Response', async () => {
    const addHeader: Middleware = async (_ctx, next) => {
      const res = await next()
      const headers = new Headers(res.headers)
      headers.set('X-Added', 'yes')
      return new Response(res.body, { status: res.status, headers })
    }
    const composed = composePageHandler([addHeader], async () => new Response('ok'))
    const response = await composed(createMockContext())
    expect(response.headers.get('X-Added')).toBe('yes')
  })
})
