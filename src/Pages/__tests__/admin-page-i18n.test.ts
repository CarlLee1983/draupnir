import { describe, expect, test } from 'bun:test'
import { requireAdmin } from '../Admin/helpers/requireAdmin'
import type { IHttpContext } from '../../Shared/Presentation/IHttpContext'

// Copy createMockContext helper...
function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: (name: string) => (overrides.headers ? (overrides.headers as any)[name.toLowerCase()] : undefined),
    getParam: (name: string) => (overrides.params ? (overrides.params as any)[name] : undefined),
    getPathname: () => '/admin/dashboard',
    getQuery: (name: string) => (overrides.query ? (overrides.query as any)[name] : undefined),
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
    ...overrides,
  } as any
}

describe('requireAdmin', () => {
  test('returns a localized 403 body', async () => {
    const ctx = createMockContext({
      headers: { 'accept-language': 'en' },
    })
    
    // Mock authenticated non-admin user
    ctx.set('auth:context', { userId: 'u1', email: 'u1@e.com', role: 'member' })

    // Mock i18n data (normally done by middleware)
    const { loadMessages, resolvePageLocale } = await import('@/Shared/Infrastructure/I18n')
    const locale = resolvePageLocale(ctx)
    ctx.set('inertia:shared', { locale, messages: loadMessages(locale) })

    const result = requireAdmin(ctx)

    expect(result.ok).toBe(false)
    expect(result.response?.status).toBe(403)
    const text = await result.response!.text()
    expect(text).toContain('Admin access required')
  })
})
