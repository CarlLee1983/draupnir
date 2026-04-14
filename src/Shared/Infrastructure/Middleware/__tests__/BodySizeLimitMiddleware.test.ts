import { describe, expect, it } from 'vitest'
import { createBodySizeLimitMiddleware } from '../BodySizeLimitMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

const createMockContext = (opts: {
  headers?: Record<string, string | undefined>
  bodyText?: string
} = {}): IHttpContext => {
  const state: Record<string, unknown> = {}
  const headers = opts.headers ?? {}
  const bodyText = opts.bodyText ?? ''
  return {
    getBodyText: async () => bodyText,
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
    set: (key: string, value: unknown) => { state[key] = value },
    getCookie: () => undefined,
    setCookie: () => {},
  } as IHttpContext
}

describe('BodySizeLimitMiddleware', () => {
  describe('Content-Length header 存在時', () => {
    it('Content-Length 在限制內 → next() 執行，回傳 200', async () => {
      const mw = createBodySizeLimitMiddleware(512 * 1024)
      const ctx = createMockContext({ headers: { 'content-length': '1024' } })
      const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(response.status).toBe(200)
    })

    it('Content-Length 超過限制 → 回傳 413，不執行 next()', async () => {
      const mw = createBodySizeLimitMiddleware(512 * 1024)
      const ctx = createMockContext({ headers: { 'content-length': String(600 * 1024) } })
      let called = false
      const response = await mw(ctx, async () => {
        called = true
        return new Response('ok')
      })
      expect(response.status).toBe(413)
      expect(called).toBe(false)
      const body = await response.json()
      expect(body).toEqual({
        success: false,
        message: 'Request too large',
        error: 'PAYLOAD_TOO_LARGE',
      })
    })

    it('Content-Length 等於限制（邊界值）→ next() 執行', async () => {
      const limit = 512 * 1024
      const mw = createBodySizeLimitMiddleware(limit)
      const ctx = createMockContext({ headers: { 'content-length': String(limit) } })
      const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(response.status).toBe(200)
    })

    it('Content-Length 為 1（遠小於限制）→ next() 執行', async () => {
      const mw = createBodySizeLimitMiddleware(512 * 1024)
      const ctx = createMockContext({ headers: { 'content-length': '1' } })
      const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(response.status).toBe(200)
    })

    it('Content-Length 無法解析（NaN）→ 改用 body-read 路徑，空 body 允許通過', async () => {
      const mw = createBodySizeLimitMiddleware(512 * 1024)
      const ctx = createMockContext({ headers: { 'content-length': 'invalid' } })
      const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(response.status).toBe(200)
    })
  })

  describe('Content-Length header 不存在時（chunked transfer）', () => {
    it('實際 body 在限制內 → next() 執行，回傳 200', async () => {
      const mw = createBodySizeLimitMiddleware(512 * 1024)
      const smallBody = 'hello world'
      const ctx = createMockContext({ bodyText: smallBody })
      const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(response.status).toBe(200)
    })

    it('實際 body 超過限制 → 回傳 413，不執行 next()', async () => {
      const limit = 100
      const mw = createBodySizeLimitMiddleware(limit)
      const largeBody = 'x'.repeat(200)
      const ctx = createMockContext({ bodyText: largeBody })
      let called = false
      const response = await mw(ctx, async () => {
        called = true
        return new Response('ok')
      })
      expect(response.status).toBe(413)
      expect(called).toBe(false)
      const body = await response.json()
      expect(body).toEqual({
        success: false,
        message: 'Request too large',
        error: 'PAYLOAD_TOO_LARGE',
      })
    })

    it('實際 body 等於限制（邊界值）→ next() 執行', async () => {
      const limit = 100
      const mw = createBodySizeLimitMiddleware(limit)
      const body = 'x'.repeat(limit)
      const ctx = createMockContext({ bodyText: body })
      const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(response.status).toBe(200)
    })

    it('空 body → next() 執行', async () => {
      const mw = createBodySizeLimitMiddleware(512 * 1024)
      const ctx = createMockContext({ bodyText: '' })
      const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(response.status).toBe(200)
    })

    it('Unicode/多位元組字符 → 計算正確的 byte 長度', async () => {
      const limit = 10
      const mw = createBodySizeLimitMiddleware(limit)
      // 中文字符「你」佔 3 bytes
      const body = '你你'  // 6 bytes
      const ctx = createMockContext({ bodyText: body })
      const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(response.status).toBe(200)
    })

    it('Unicode/多位元組字符超過限制 → 回傳 413', async () => {
      const limit = 6
      const mw = createBodySizeLimitMiddleware(limit)
      // 中文字符「你」佔 3 bytes，5 個字就是 15 bytes
      const body = '你你你你你'
      const ctx = createMockContext({ bodyText: body })
      const response = await mw(ctx, async () => new Response('ok'))
      expect(response.status).toBe(413)
    })
  })

  describe('邊界情況與錯誤路徑', () => {
    it('Context 狀態隔離 → 多個請求不共享 state', async () => {
      const mw = createBodySizeLimitMiddleware(512 * 1024)
      const ctx1 = createMockContext()
      const ctx2 = createMockContext()

      ctx1.set('data', 'value1')
      ctx2.set('data', 'value2')

      expect(ctx1.get('data')).toBe('value1')
      expect(ctx2.get('data')).toBe('value2')
    })

    it('Middleware 實例可複用多次', async () => {
      const mw = createBodySizeLimitMiddleware(512 * 1024)
      const ctx1 = createMockContext({ headers: { 'content-length': '100' } })
      const ctx2 = createMockContext({ headers: { 'content-length': '200' } })

      const resp1 = await mw(ctx1, async () => new Response('ok'))
      const resp2 = await mw(ctx2, async () => new Response('ok'))

      expect(resp1.status).toBe(200)
      expect(resp2.status).toBe(200)
    })
  })
})
