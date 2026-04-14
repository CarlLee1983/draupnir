import { describe, expect, it } from 'vitest'
import { createCorsMiddleware } from '../CorsGlobalMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

const createMockContext = (opts: { method?: string; origin?: string } = {}): IHttpContext => {
  const state: Record<string, unknown> = {}
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: (name: string) => {
      if (name === 'origin') return opts.origin
      return undefined
    },
    getPathname: () => '/',
    getMethod: () => (opts.method ?? 'GET').toUpperCase(),
    getParam: () => undefined,
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: <T>(data: T, status = 200) => new Response(JSON.stringify(data), { status }),
    text: (content: string, status = 200) => new Response(content, { status }),
    redirect: (url: string, status = 302) => new Response(null, { status, headers: { Location: url } }),
    get: <T>(key: string): T | undefined => state[key] as T,
    set: (key: string, value: unknown) => { state[key] = value },
    getCookie: () => undefined,
    setCookie: () => {},
  } as IHttpContext
}

describe('CorsGlobalMiddleware', () => {
  const allowedOrigin = 'https://app.example.com'
  const mw = createCorsMiddleware({
    allowedOrigins: [allowedOrigin],
    allowCredentials: true,
  })

  it('OPTIONS preflight from allowed origin → 204 with CORS headers', async () => {
    const ctx = createMockContext({ method: 'OPTIONS', origin: allowedOrigin })
    const response = await mw(ctx, async () => new Response('should not be called'))
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin)
    expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy()
    expect(response.headers.get('Access-Control-Allow-Headers')).toBeTruthy()
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  it('OPTIONS preflight from disallowed origin → 204 without CORS headers', async () => {
    const ctx = createMockContext({ method: 'OPTIONS', origin: 'https://evil.com' })
    const response = await mw(ctx, async () => new Response('nope'))
    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('GET from allowed origin → CORS headers added to response', async () => {
    const ctx = createMockContext({ method: 'GET', origin: allowedOrigin })
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin)
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    expect(response.headers.get('Vary')).toBe('Origin')
  })

  it('GET from disallowed origin → no CORS headers', async () => {
    const ctx = createMockContext({ method: 'GET', origin: 'https://evil.com' })
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('request with no origin → passes through unchanged', async () => {
    const ctx = createMockContext({ method: 'GET' })
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('parseCorsAllowedOrigins: 空字串環境變數回傳 []', async () => {
    const { parseCorsAllowedOrigins } = await import('../CorsGlobalMiddleware')
    const original = process.env.CORS_ALLOWED_ORIGINS
    delete process.env.CORS_ALLOWED_ORIGINS
    expect(parseCorsAllowedOrigins()).toEqual([])
    process.env.CORS_ALLOWED_ORIGINS = original
  })

  it('parseCorsAllowedOrigins: 逗號分隔字串解析正確', async () => {
    const { parseCorsAllowedOrigins } = await import('../CorsGlobalMiddleware')
    process.env.CORS_ALLOWED_ORIGINS = ' https://a.com , https://b.com '
    expect(parseCorsAllowedOrigins()).toEqual(['https://a.com', 'https://b.com'])
    delete process.env.CORS_ALLOWED_ORIGINS
  })
})
