import { describe, expect, mock, test } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../InertiaService'
import { EmailVerificationPage } from '../../Auth/EmailVerificationPage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => 'verify-tok',
    getPathname: () => '/verify-email/verify-tok',
    getQuery: () => undefined,
    params: { token: 'verify-tok' },
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

describe('EmailVerificationPage', () => {
  test('should render email verification result on GET', async () => {
    const render = mock(() => new Response())
    const inertia = { render } as unknown as InertiaService
    const page = new EmailVerificationPage(inertia)
    const ctx = createMockContext()

    await page.handle(ctx)

    expect(render).toHaveBeenCalledWith(
      ctx,
      'Auth/EmailVerification',
      expect.objectContaining({
        status: 'success',
        message: expect.any(String),
      }),
    )
  })
})
