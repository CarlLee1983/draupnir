import { describe, expect, it } from 'vitest'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import { toGravitoMiddleware } from '../GravitoKernelAdapter'

/** Minimal GravitoContext mock matching what fromGravitoContext needs */
function createMockGravitoContext(opts: { method?: string } = {}): any {
  const state: Record<string, unknown> = {}
  return {
    req: {
      url: 'http://localhost/',
      method: opts.method ?? 'GET',
      header: (_name: string) => undefined,
      param: (_name: string) => undefined,
      params: () => ({}),
      text: async () => '',
    },
    res: undefined as Response | undefined,
    get: (key: string) => state[key],
    set: (key: string, value: unknown) => {
      state[key] = value
    },
    json: (data: unknown, status = 200) => new Response(JSON.stringify(data), { status }),
    text: (content: string, status = 200) => new Response(content, { status }),
    redirect: (url: string, status = 302) =>
      new Response(null, { status, headers: { Location: url } }),
  }
}

describe('GravitoKernelAdapter', () => {
  describe('toGravitoMiddleware', () => {
    it('middleware 的回傳 Response 寫入 gravitoCtx.res', async () => {
      const mw: Middleware = async (_ctx, next) => next()
      const wrapped = toGravitoMiddleware(mw)
      const gravitoCtx = createMockGravitoContext()

      await wrapped(gravitoCtx, async () => {
        gravitoCtx.res = new Response('from-handler', { status: 200 })
      })

      expect(gravitoCtx.res).toBeInstanceOf(Response)
      expect(gravitoCtx.res?.status).toBe(200)
    })

    it('middleware 可短路回傳，不呼叫 next', async () => {
      const mw: Middleware = async (_ctx, _next) => new Response('short-circuit', { status: 403 })
      const wrapped = toGravitoMiddleware(mw)
      const gravitoCtx = createMockGravitoContext()

      let nextCalled = false
      await wrapped(gravitoCtx, async () => {
        nextCalled = true
        gravitoCtx.res = new Response('should not reach', { status: 200 })
      })

      expect(nextCalled).toBe(false)
      expect(gravitoCtx.res?.status).toBe(403)
      expect(await gravitoCtx.res?.text()).toBe('short-circuit')
    })

    it('middleware 可修改 Response（如加 headers）', async () => {
      const mw: Middleware = async (_ctx, next) => {
        const res = await next()
        const headers = new Headers(res.headers)
        headers.set('X-Test', 'injected')
        return new Response(res.body, { status: res.status, headers })
      }
      const wrapped = toGravitoMiddleware(mw)
      const gravitoCtx = createMockGravitoContext()

      await wrapped(gravitoCtx, async () => {
        gravitoCtx.res = new Response('ok', { status: 200 })
      })

      expect(gravitoCtx.res?.headers.get('X-Test')).toBe('injected')
    })
  })
})
