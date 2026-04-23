import { describe, expect, mock, test } from 'bun:test'
import type { GoogleOAuthService } from '@/Modules/Auth/Application/Services/GoogleOAuthService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { GoogleOAuthCallbackPage } from '../../Auth/Pages/GoogleOAuthCallbackPage'

function createOAuthContext(options: {
  code?: string
  state?: string
  expectedState?: string
}): IHttpContext {
  const { code = 'test-code', state = 'test-state', expectedState = 'test-state' } = options
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    
    getPathname: () => '/oauth/google/callback',
    getQuery: (name: string) => {
      if (name === 'code') return code
      if (name === 'state') return state
      return undefined
    },
    params: {},
    query: {},
    headers: {},
    json: mock((data: unknown, statusCode?: number) =>
      Response.json(data, { status: statusCode ?? 200 }),
    ),
    text: (content: string, statusCode?: number) =>
      new Response(content, { status: statusCode ?? 200 }),
    redirect: mock((url: string, statusCode?: number) => Response.redirect(url, statusCode ?? 302)),
    get: <T>(key: string) => (key === 'oauthExpectedState' ? (expectedState as T) : undefined),
    set: () => {},
    getCookie: (_name: string) => undefined,
    getMethod: () => 'GET',
    setCookie: (_name: string, _value: string, _options?: unknown) => {},
  }
}

describe('GoogleOAuthCallbackPage', () => {
  test('should exchange code and redirect to member dashboard on success (member role)', async () => {
    const exchange = mock(() =>
      Promise.resolve({ success: true, jwt: 'jwt-token', userId: 'user-123', role: 'member' }),
    )
    const oauthService = { exchange } as unknown as GoogleOAuthService
    const page = new GoogleOAuthCallbackPage(oauthService)
    const ctx = createOAuthContext({})

    await page.handle(ctx)

    expect(exchange).toHaveBeenCalledWith('test-code')
    expect(ctx.redirect).toHaveBeenCalledWith('/member/api-keys', 302)
  })

  test('should redirect to admin dashboard when role is admin', async () => {
    const exchange = mock(() =>
      Promise.resolve({ success: true, jwt: 'jwt-token', userId: 'admin-456', role: 'admin' }),
    )
    const oauthService = { exchange } as unknown as GoogleOAuthService
    const page = new GoogleOAuthCallbackPage(oauthService)
    const ctx = createOAuthContext({})

    await page.handle(ctx)

    expect(exchange).toHaveBeenCalledWith('test-code')
    expect(ctx.redirect).toHaveBeenCalledWith('/admin/dashboard', 302)
  })

  test('should redirect to manager dashboard when role is manager', async () => {
    const exchange = mock(() =>
      Promise.resolve({ success: true, jwt: 'jwt-token', userId: 'manager-789', role: 'manager' }),
    )
    const oauthService = { exchange } as unknown as GoogleOAuthService
    const page = new GoogleOAuthCallbackPage(oauthService)
    const ctx = createOAuthContext({})

    await page.handle(ctx)

    expect(exchange).toHaveBeenCalledWith('test-code')
    expect(ctx.redirect).toHaveBeenCalledWith('/manager/dashboard', 302)
  })

  test('should return error on CSRF validation failure', async () => {
    const exchange = mock(() => Promise.resolve({ success: true }))
    const oauthService = { exchange } as unknown as GoogleOAuthService
    const page = new GoogleOAuthCallbackPage(oauthService)
    const ctx = createOAuthContext({ state: 'mismatched-state' })

    await page.handle(ctx)

    expect(ctx.json).toHaveBeenCalled()
    const jsonMock = ctx.json as ReturnType<typeof mock>
    expect(jsonMock.mock.calls.length).toBeGreaterThan(0)
    const payload = jsonMock.mock.calls[0]?.[0] as { error?: string }
    expect(payload.error).toBeDefined()
  })
})
