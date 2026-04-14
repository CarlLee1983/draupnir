import { describe, expect, mock, test } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ForgotPasswordPage } from '../../Auth/Pages/ForgotPasswordPage'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/forgot-password',
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
    getMethod: () => 'GET',
    setCookie: (_name: string, _value: string, _options?: unknown) => {},
    ...overrides,
  }
}

const mockForgotService = {
  execute: mock(async () => ({ success: true, message: '' })),
}

describe('ForgotPasswordPage', () => {
  test('should render forgot password form on GET', async () => {
    const render = mock(() => new Response())
    const inertia = { render } as unknown as InertiaService
    const page = new ForgotPasswordPage(inertia, mockForgotService as any)
    const ctx = createMockContext()
    ctx.set('inertia:shared', { csrfToken: 'csrf' })

    await page.handle(ctx)

    expect(render).toHaveBeenCalledWith(
      ctx,
      'Auth/ForgotPassword',
      expect.objectContaining({ csrfToken: expect.any(String) }),
    )
  })
})
