import { describe, expect, mock, test } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../InertiaService'
import { ResetPasswordPage } from '../../Auth/ResetPasswordPage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
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
    get: () => undefined,
    set: () => {},
    ...overrides,
  }
}

describe('ResetPasswordPage', () => {
  test('should render reset password form with token on GET', async () => {
    const render = mock(() => new Response())
    const inertia = { render } as unknown as InertiaService
    const page = new ResetPasswordPage(inertia)
    const ctx = createMockContext()

    await page.handle(ctx)

    expect(render).toHaveBeenCalled()
    const call = render.mock.calls[0] as unknown as
      | [unknown, string, Record<string, unknown>]
      | undefined
    expect(call?.[1]).toBe('Auth/ResetPassword')
    expect(call?.[2]?.token).toBe('tok-1')
  })
})
