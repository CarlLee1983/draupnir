import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { createRequestLoggerMiddleware } from '../RequestLoggerMiddleware'

const createMockContext = (
  opts: {
    method?: string
    path?: string
    requestId?: string
    ip?: string
    userAgent?: string
  } = {},
): IHttpContext => {
  const state: Record<string, unknown> = {
    requestId: opts.requestId ?? 'test-id',
  }
  const headers: Record<string, string | undefined> = {
    'x-forwarded-for': opts.ip,
    'user-agent': opts.userAgent,
  }
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: (name: string) => headers[name.toLowerCase()],
    getPathname: () => opts.path ?? '/test',
    getMethod: () => (opts.method ?? 'GET').toUpperCase(),
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

describe('RequestLoggerMiddleware', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.LOG_LEVEL
    delete process.env.NODE_ENV
  })

  describe('LOG_LEVEL=error (production default)', () => {
    it('200 response → 不輸出 log', async () => {
      process.env.LOG_LEVEL = 'error'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext()
      await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('404 response → 不輸出 log', async () => {
      process.env.LOG_LEVEL = 'error'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext()
      await mw(ctx, async () => new Response('not found', { status: 404 }))
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('500 response → 輸出 JSON log', async () => {
      process.env.LOG_LEVEL = 'error'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext({ method: 'POST', path: '/api/test', requestId: 'req-abc' })
      await mw(ctx, async () => new Response('error', { status: 500 }))
      expect(consoleSpy).toHaveBeenCalledOnce()
      const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
      expect(logged.requestId).toBe('req-abc')
      expect(logged.method).toBe('POST')
      expect(logged.path).toBe('/api/test')
      expect(logged.status).toBe(500)
      expect(logged.level).toBe('error')
      expect(typeof logged.durationMs).toBe('number')
      expect(logged.durationMs).toBeGreaterThanOrEqual(0)
      expect(logged.timestamp).toBeDefined()
      expect(logged.env).toBeDefined()
    })
  })

  describe('LOG_LEVEL=warn', () => {
    it('200 response → 不輸出 log', async () => {
      process.env.LOG_LEVEL = 'warn'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext()
      await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('400 response → 輸出 JSON log', async () => {
      process.env.LOG_LEVEL = 'warn'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext()
      await mw(ctx, async () => new Response('bad request', { status: 400 }))
      expect(consoleSpy).toHaveBeenCalledOnce()
      const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
      expect(logged.status).toBe(400)
      expect(logged.level).toBe('warn')
    })
  })

  describe('LOG_LEVEL=info', () => {
    it('200 response → 不輸出 log', async () => {
      process.env.LOG_LEVEL = 'info'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext()
      await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(consoleSpy).not.toHaveBeenCalled()
    })

    it('301 response → 輸出 JSON log', async () => {
      process.env.LOG_LEVEL = 'info'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext()
      await mw(ctx, async () => new Response(null, { status: 301 }))
      expect(consoleSpy).toHaveBeenCalledOnce()
      const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
      expect(logged.status).toBe(301)
      expect(logged.level).toBe('info')
    })
  })

  describe('LOG_LEVEL=debug', () => {
    it('200 response → 輸出 colored text log', async () => {
      process.env.LOG_LEVEL = 'debug'
      const mw = createRequestLoggerMiddleware()
      const ctx = createMockContext({ method: 'GET', path: '/health' })
      await mw(ctx, async () => new Response('ok', { status: 200 }))
      expect(consoleSpy).toHaveBeenCalledOnce()
      const output = consoleSpy.mock.calls[0][0] as string
      expect(output).toContain('GET')
      expect(output).toContain('/health')
      expect(output).toContain('200')
    })
  })

  it('handler throws → log 5xx 後 re-throw', async () => {
    process.env.LOG_LEVEL = 'error'
    const mw = createRequestLoggerMiddleware()
    const ctx = createMockContext({ path: '/broken' })
    const err = new Error('DB exploded')
    await expect(
      mw(ctx, async () => {
        throw err
      }),
    ).rejects.toThrow('DB exploded')
    expect(consoleSpy).toHaveBeenCalledOnce()
    const logged = JSON.parse(consoleSpy.mock.calls[0][0] as string)
    expect(logged.status).toBe(500)
    expect(logged.msg).toBe('DB exploded')
    expect(logged.error).toBe('Error')
  })

  it('JSON log 格式可完整 parse', async () => {
    process.env.LOG_LEVEL = 'error'
    const mw = createRequestLoggerMiddleware()
    const ctx = createMockContext()
    await mw(ctx, async () => new Response('error', { status: 500 }))
    expect(() => JSON.parse(consoleSpy.mock.calls[0][0] as string)).not.toThrow()
  })
})
