import { describe, expect, mock, test } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { EmailVerificationPage } from '../../Auth/EmailVerificationPage'
import type { InertiaService } from '../../InertiaService'

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
    getCookie: (_name: string) => undefined,
    setCookie: (_name: string, _value: string, _options?: unknown) => {},
    ...overrides,
    getMethod: overrides.getMethod ?? (() => 'GET'),
  }
}

const mockEmailVerificationService = {
  execute: mock(async () => ({
    success: true,
    message: '電子郵件驗證成功',
    redirectUrl: '/member/dashboard',
  })),
}

describe('EmailVerificationPage', () => {
  test('should render email verification result on GET', async () => {
    const render = mock(() => new Response())
    const inertia = { render } as unknown as InertiaService
    const page = new EmailVerificationPage(inertia, mockEmailVerificationService as any)
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
