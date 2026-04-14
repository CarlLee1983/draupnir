import { describe, expect, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { requireAdmin } from '../Admin/middleware/requireAdmin'

describe('requireAdmin', () => {
  test('returns a localized 403 body', async () => {
    const store = new Map<string, unknown>()
    // 注入 auth（AuthMiddleware.getAuthContext 使用 ctx.get('auth')）
    store.set('auth', { userId: 'u1', email: 'u1@e.com', role: 'member' })
    // 注入 i18n shared（通常由 SharedDataMiddleware 注入）
    store.set('inertia:shared', { locale: 'en', messages: loadMessages('en') })

    const ctx: IHttpContext = {
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
    } as IHttpContext

    const result = requireAdmin(ctx)

    expect(result.ok).toBe(false)
    expect(result.response?.status).toBe(403)
    const text = await result.response!.text()
    expect(text).toContain('Admin access required')
  })
})
