import { describe, expect, mock, test } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../InertiaService'
import { ForgotPasswordPage } from '../../Auth/ForgotPasswordPage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
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
    get: () => undefined,
    set: () => {},
    ...overrides,
  }
}

describe('ForgotPasswordPage', () => {
  test('should render forgot password form on GET', async () => {
    const render = mock(() => new Response())
    const inertia = { render } as unknown as InertiaService
    const page = new ForgotPasswordPage(inertia)
    const ctx = createMockContext()

    await page.handle(ctx)

    expect(render).toHaveBeenCalledWith(
      ctx,
      'Auth/ForgotPassword',
      expect.objectContaining({ csrfToken: expect.any(String) }),
    )
  })
})
