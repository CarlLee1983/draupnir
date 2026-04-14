import { describe, expect, test } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { injectSharedData, resolveCsrfTokenForInertia } from '../SharedDataMiddleware'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/admin/dashboard',
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
    setCookie: (_name: string, _value: string, _options?: unknown) => {},
    ...overrides,
    getMethod: overrides.getMethod ?? (() => 'GET'),
  }
}

describe('injectSharedData', () => {
  test('exposes the page locale and message catalog', () => {
    const ctx = createMockContext({
      getHeader: (name: string) => {
        if (name.toLowerCase() === 'accept-language') return 'en'
        return undefined
      },
      headers: { 'accept-language': 'en' },
    })

    injectSharedData(ctx)

    const shared = ctx.get('inertia:shared') as { locale: string; messages: Record<string, string> }
    expect(shared.locale).toBe('en')
    expect(shared.messages).toBeDefined()
    expect(typeof shared.messages['member.dashboard.selectOrg']).toBe('string')
  })

  test('puts csrfToken on inertia:shared from ctx csrfToken', () => {
    const ctx = createMockContext()
    ctx.set('csrfToken', 'from-middleware')
    injectSharedData(ctx)
    const shared = ctx.get('inertia:shared') as { csrfToken: string }
    expect(shared.csrfToken).toBe('from-middleware')
  })

  test('puts csrfToken on inertia:shared from XSRF-TOKEN cookie when ctx has no csrfToken', () => {
    const ctx = createMockContext({
      getCookie: (name: string) => (name === 'XSRF-TOKEN' ? encodeURIComponent('cookie-val') : undefined),
    })
    injectSharedData(ctx)
    const shared = ctx.get('inertia:shared') as { csrfToken: string }
    expect(shared.csrfToken).toBe('cookie-val')
  })

  test('defaults csrfToken to empty string when unavailable', () => {
    const ctx = createMockContext()
    injectSharedData(ctx)
    const shared = ctx.get('inertia:shared') as { csrfToken: string }
    expect(shared.csrfToken).toBe('')
  })
})

describe('resolveCsrfTokenForInertia', () => {
  test('prefers ctx csrfToken over cookies', () => {
    const ctx = createMockContext({
      getCookie: () => 'from-cookie',
    })
    ctx.set('csrfToken', 'from-ctx')
    expect(resolveCsrfTokenForInertia(ctx)).toBe('from-ctx')
  })
})
