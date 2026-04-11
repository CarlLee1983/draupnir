import { describe, expect, mock, test } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../InertiaService'
import { LoginPage } from '../../Auth/LoginPage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/login',
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
    setCookie: mock((_name: string, _value: string, _opts?: unknown) => {}),
    ...overrides,
  }
}

const mockLoginService = {
  execute: mock(async () => ({
    success: true,
    message: 'OK',
    data: {
      accessToken: 'tok',
      refreshToken: 'ref',
      user: { id: '1', email: 'a@b.com', role: 'member' },
    },
  })),
}

describe('LoginPage', () => {
  test('should render login form on GET', async () => {
    const render = mock(() => new Response())
    const inertia = { render } as unknown as InertiaService
    const page = new LoginPage(inertia, mockLoginService as any)
    const ctx = createMockContext()
    ctx.set('inertia:shared', { csrfToken: 'csrf-test' })

    await page.handle(ctx)

    expect(render).toHaveBeenCalled()
    const call = render.mock.calls[0] as unknown as
      | [unknown, string, Record<string, unknown>]
      | undefined
    expect(call?.[1]).toBe('Auth/Login')
    expect(call?.[2]?.csrfToken).toBe('csrf-test')
  })

  test('should process login form on POST', async () => {
    const render = mock(() => new Response())
    const inertia = { render } as unknown as InertiaService
    const page = new LoginPage(inertia, mockLoginService as any)
    const ctx = createMockContext()
    ctx.set('validated', { email: 'user@example.com', password: 'password123' })

    const response = await page.store(ctx)

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(302)
  })
})
