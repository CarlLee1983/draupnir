import { describe, expect, it } from 'vitest'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { createSecurityHeadersMiddleware } from '../SecurityHeadersGlobalMiddleware'

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

describe('SecurityHeadersGlobalMiddleware', () => {
  it('response 加上所有安全 headers', async () => {
    const mw = createSecurityHeadersMiddleware()
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(response.headers.get('X-XSS-Protection')).toBe('0')
  })

  it('保留原始 response 的 status 和 body', async () => {
    const mw = createSecurityHeadersMiddleware()
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('hello', { status: 201 }))
    expect(response.status).toBe(201)
    expect(await response.text()).toBe('hello')
  })

  it('保留原始 response 既有的 headers', async () => {
    const mw = createSecurityHeadersMiddleware()
    const ctx = createMockContext()
    const response = await mw(
      ctx,
      async () => new Response('ok', { headers: { 'Content-Type': 'application/json' } }),
    )
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })
})
