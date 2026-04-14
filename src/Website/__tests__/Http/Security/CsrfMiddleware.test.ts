import { describe, expect, test } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import {
  attachWebCsrf,
  issueWebCsrfToken,
  validateWebCsrf,
  WEB_CSRF_COOKIE_NAME,
} from '@/Website/Http/Security/CsrfMiddleware'

function createCtx(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  const pending: { name: string; value: string }[] = []
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/login',
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: (data: unknown, statusCode?: number) =>
      Response.json(data, { status: statusCode ?? 200 }),
    text: (content: string, statusCode?: number) =>
      new Response(content, { status: statusCode ?? 200 }),
    redirect: (url: string, statusCode?: number) => Response.redirect(url, statusCode ?? 302),
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => {
      store.set(key, value)
    },
    getCookie: (_name: string) => undefined,
    setCookie: (name: string, value: string) => {
      pending.push({ name, value })
    },
    ...overrides,
    getMethod: overrides.getMethod ?? (() => 'GET'),
  }
}

describe('validateWebCsrf', () => {
  test('returns true when cookie matches X-XSRF-TOKEN', () => {
    const token = 'abc123'
    const ctx = createCtx({
      getCookie: (n) => (n === WEB_CSRF_COOKIE_NAME ? encodeURIComponent(token) : undefined),
      getHeader: (n) => (n.toLowerCase() === 'x-xsrf-token' ? token : undefined),
    })
    expect(validateWebCsrf(ctx)).toBe(true)
  })

  test('returns false when header missing', () => {
    const ctx = createCtx({
      getCookie: (n) => (n === WEB_CSRF_COOKIE_NAME ? encodeURIComponent('x') : undefined),
    })
    expect(validateWebCsrf(ctx)).toBe(false)
  })
})

describe('attachWebCsrf', () => {
  test('GET issues csrfToken and skips validation', async () => {
    const mw = attachWebCsrf()
    const ctx = createCtx()
    let ran = false
    await mw(ctx, async () => {
      ran = true
      return new Response('ok')
    })
    expect(ran).toBe(true)
    expect(typeof ctx.get('csrfToken')).toBe('string')
    expect((ctx.get('csrfToken') as string).length).toBeGreaterThan(10)
  })

  test('POST without matching cookie/header returns 419', async () => {
    const mw = attachWebCsrf()
    const ctx = createCtx({ getMethod: () => 'POST' })
    const res = await mw(ctx, async () => new Response('should-not-run'))
    expect(res.status).toBe(419)
  })

  test('POST with valid double-submit calls next', async () => {
    const token = 'same-token-value'
    const mw = attachWebCsrf()
    const ctx = createCtx({
      getMethod: () => 'POST',
      getCookie: (n) => (n === WEB_CSRF_COOKIE_NAME ? encodeURIComponent(token) : undefined),
      getHeader: (n) => (n === 'X-CSRF-Token' ? token : undefined),
    })
    const res = await mw(ctx, async () => new Response('next'))
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('next')
  })
})

describe('issueWebCsrfToken', () => {
  test('sets ctx csrfToken', () => {
    const ctx = createCtx()
    issueWebCsrfToken(ctx)
    expect(ctx.get('csrfToken')).toBeDefined()
  })
})
