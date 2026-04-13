import { describe, expect, mock, test } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ResetPasswordPage } from '../../Auth/ResetPasswordPage'
import type { InertiaService } from '../../InertiaService'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => 'tok-1',
    getPathname: () => '/reset-password/tok-1',
    getQuery: () => undefined,
    params: { token: 'tok-1' },
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
  }
}

const mockResetPasswordService = {
  validateToken: mock(async () => ({ valid: true })),
  execute: mock(async () => ({ success: true, message: 'ok' })),
}

describe('ResetPasswordPage', () => {
  test('should render reset password form with token on GET', async () => {
    const render = mock(() => new Response())
    const inertia = { render } as unknown as InertiaService
    const page = new ResetPasswordPage(inertia, mockResetPasswordService as any)
    const ctx = createMockContext()
    ctx.set('inertia:shared', { csrfToken: 'c' })

    await page.handle(ctx)

    expect(render).toHaveBeenCalled()
    const call = render.mock.calls[0] as unknown as
      | [unknown, string, Record<string, unknown>]
      | undefined
    expect(call?.[1]).toBe('Auth/ResetPassword')
    expect(call?.[2]?.token).toBe('tok-1')
  })
})
