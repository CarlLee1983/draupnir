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
    ...overrides,
  }
}

describe('RegisterPage', () => {
  test('should render registration form on GET', async () => {
    const render = mock(() => new Response())
    const inertia = { render } as unknown as InertiaService
    const page = new RegisterPage(inertia)
    const ctx = createMockContext()

    await page.handle(ctx)

    expect(render).toHaveBeenCalled()
    const call = render.mock.calls[0] as unknown as
      | [unknown, string, Record<string, unknown>]
      | undefined
    expect(call?.[1]).toBe('Auth/Register')
    expect(typeof call?.[2]?.csrfToken).toBe('string')
    expect(call?.[2]?.passwordRequirements).toBeDefined()
    expect(typeof call?.[2]?.passwordRequirements).toBe('object')
  })

  test('should process registration on POST', async () => {
    const render = mock(() => new Response())
    const inertia = { render } as unknown as InertiaService
    const page = new RegisterPage(inertia)
    const ctx = createMockContext({
      get: <T>(key: string) =>
        (key === 'validated'
          ? ({
              email: 'newuser@example.com',
              password: 'SecurePass123!',
              passwordConfirmation: 'SecurePass123!',
              agreedToTerms: true,
            } as T)
          : undefined),
    })

    const response = await page.store(ctx)
    expect(response).toBeInstanceOf(Response)
  })
})
