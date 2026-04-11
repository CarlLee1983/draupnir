import { describe, expect, mock, test } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../InertiaService'
import { RegisterPage } from '../../Auth/RegisterPage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/register',
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
  }
}

const mockRegisterService = {
  execute: mock(async () => ({ success: true, message: '帳號建立成功' })),
}

describe('RegisterPage', () => {
  test('should render registration form on GET', async () => {
    const render = mock(() => new Response())
    const inertia = { render } as unknown as InertiaService
    const page = new RegisterPage(inertia, mockRegisterService as any)
    const ctx = createMockContext()
    ctx.set('inertia:shared', { csrfToken: 'csrf' })

    await page.handle(ctx)

    expect(render).toHaveBeenCalled()
    const call = render.mock.calls[0] as unknown as
      | [unknown, string, Record<string, unknown>]
      | undefined
    expect(call?.[1]).toBe('Auth/Register')
    expect(call?.[2]?.csrfToken).toBe('csrf')
    expect(call?.[2]?.passwordRequirements).toBeDefined()
    expect(typeof call?.[2]?.passwordRequirements).toBe('object')
  })

  test('should process registration on POST', async () => {
    const render = mock(() => new Response())
    const inertia = { render } as unknown as InertiaService
    const page = new RegisterPage(inertia, mockRegisterService as any)
    const ctx = createMockContext()
    ctx.set('validated', {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      passwordConfirmation: 'SecurePass123!',
      agreedToTerms: true,
    })

    const response = await page.store(ctx)
    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(302)
  })
})
