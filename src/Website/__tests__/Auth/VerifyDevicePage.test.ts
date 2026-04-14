import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { AuthorizeDeviceService } from '@/Modules/CliApi/Application/Services/AuthorizeDeviceService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { VerifyDevicePage } from '../../Auth/Pages/VerifyDevicePage'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  store.set('inertia:shared', { csrfToken: 'test-csrf-token-123' })
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/verify-device',
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

function createMockContextWithAuth(userCode?: string): IHttpContext {
  const store = new Map<string, unknown>()
  store.set('inertia:shared', { csrfToken: 'test-csrf-token-123' })
  store.set('auth', {
    userId: 'user-1',
    email: 'user@example.com',
    role: 'member',
    permissions: [],
    tokenType: 'access',
  })
  if (userCode !== undefined) {
    store.set('validated', { userCode })
  }
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/verify-device',
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
  }
}

describe('VerifyDevicePage', () => {
  let page: VerifyDevicePage
  let render: ReturnType<typeof mock>
  let inertia: InertiaService
  let authorizeDeviceService: AuthorizeDeviceService

  beforeEach(() => {
    render = mock(() => Promise.resolve(new Response('OK')))
    inertia = { render } as unknown as InertiaService
    authorizeDeviceService = {
      execute: mock(async () => ({
        success: true,
        message: 'CLI device authorized successfully, return to CLI to complete login',
      })),
    } as unknown as AuthorizeDeviceService
    page = new VerifyDevicePage(inertia, authorizeDeviceService)
  })

  describe('handle()', () => {
    test('renders Auth/VerifyDevice on GET with csrf and empty message/error', async () => {
      const ctx = createMockContext()
      const response = await page.handle(ctx)

      expect(render).toHaveBeenCalledWith(ctx, 'Auth/VerifyDevice', {
        csrfToken: 'test-csrf-token-123',
        message: undefined,
        error: undefined,
      })
      expect(response).toBeDefined()
    })

    test('uses empty csrfToken when shared data omits it', async () => {
      const store = new Map<string, unknown>()
      store.set('inertia:shared', {})
      const ctx = createMockContext({
        get: <T>(key: string) => store.get(key) as T | undefined,
      })

      await page.handle(ctx)

      const call = render.mock.calls[0] as unknown as [unknown, string, Record<string, unknown>]
      expect(call[2].csrfToken).toBe('')
    })
  })

  describe('authorize()', () => {
    test('returns error when user is not authenticated', async () => {
      const ctx = createMockContext()
      await page.authorize(ctx)

      expect(render).toHaveBeenCalledWith(ctx, 'Auth/VerifyDevice', {
        csrfToken: 'test-csrf-token-123',
        message: undefined,
        error: 'Authentication required',
      })
    })

    test('returns error when userCode is missing from validated body', async () => {
      const ctx = createMockContextWithAuth(undefined)
      await page.authorize(ctx)

      const call = render.mock.calls[0] as unknown as [unknown, string, Record<string, unknown>]
      expect(call[2].error).toBe('User code is required')
      expect(call[2].message).toBeUndefined()
    })

    test('returns error when userCode is an empty string', async () => {
      const ctx = createMockContextWithAuth('')
      await page.authorize(ctx)

      const call = render.mock.calls[0] as unknown as [unknown, string, Record<string, unknown>]
      expect(call[2].error).toBe('User code is required')
    })

    test('calls AuthorizeDeviceService and returns success message on valid request', async () => {
      const ctx = createMockContextWithAuth('ABCD-1234')
      await page.authorize(ctx)

      expect(authorizeDeviceService.execute as ReturnType<typeof mock>).toHaveBeenCalledWith({
        userCode: 'ABCD-1234',
        userId: 'user-1',
        email: 'user@example.com',
        role: 'member',
      })

      const call = render.mock.calls[0] as unknown as [unknown, string, Record<string, unknown>]
      expect(call[2].message).toBe(
        'CLI device authorized successfully, return to CLI to complete login',
      )
      expect(call[2].error).toBeUndefined()
    })

    test('surfaces service error message on authorization failure', async () => {
      ;(authorizeDeviceService.execute as ReturnType<typeof mock>).mockImplementation(async () => ({
        success: false,
        message: 'Invalid user code',
        error: 'INVALID_USER_CODE',
      }))

      const ctx = createMockContextWithAuth('WRONG-CODE')
      await page.authorize(ctx)

      const call = render.mock.calls[0] as unknown as [unknown, string, Record<string, unknown>]
      expect(call[2].error).toBe('Invalid user code')
      expect(call[2].message).toBeUndefined()
    })
  })
})
