import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AdminDashboardPage } from '../../Admin/Pages/AdminDashboardPage'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/admin/dashboard',
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
    getMethod: () => 'GET',
    setCookie: (_name: string, _value: string, _options?: unknown) => {},
    ...overrides,
    getMethod: overrides.getMethod ?? (() => 'GET'),
  }
}

function createAdminContext(): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' }
  store.set('auth', auth)
  store.set('inertia:shared', {
    locale: 'en',
    messages: loadMessages('en'),
    auth: { user: { id: auth.userId, email: auth.email, role: auth.role } },
    currentOrgId: null,
    flash: {},
  })

  return createMockContext({
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => {
      store.set(key, value)
    },
  })
}

function createMemberContext(): IHttpContext {
  return createMockContext({
    get: <T>(key: string) => {
      if (key === 'auth') return { userId: 'user-1', email: 'user@test.com', role: 'member' } as T
      return undefined
    },
  })
}

type InertiaCapture = { component: string; props: Record<string, unknown> } | null

function createMockInertia(): { inertia: InertiaService; captured: { lastCall: InertiaCapture } } {
  const captured = { lastCall: null as InertiaCapture }
  const inertia = {
    render: (_ctx: IHttpContext, component: string, props: Record<string, unknown>) => {
      captured.lastCall = { component, props }
      return new Response(JSON.stringify({ component, props }), {
        headers: { 'Content-Type': 'application/json' },
      })
    },
  } as unknown as InertiaService
  return { inertia, captured }
}

describe('AdminDashboardPage', () => {
  test('unauthenticated request returns 302 redirect to /login (PAGE-03)', async () => {
    const { inertia } = createMockInertia()
    const mockListUsersService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: { meta: { total: 0, page: 1, limit: 1, totalPages: 0 } },
        }),
      ),
    }
    const mockListOrgsService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: { meta: { total: 0, page: 1, limit: 1, totalPages: 0 } },
        }),
      ),
    }
    const mockListAdminContractsService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: { meta: { total: 0, page: 1, limit: 1, totalPages: 0 } },
        }),
      ),
    }

    const page = new AdminDashboardPage(
      inertia,
      mockListUsersService as any,
      mockListOrgsService as any,
      mockListAdminContractsService as any,
    )

    const ctx = createMockContext()
    const response = await page.handle(ctx)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/login')
  })

  test('authenticated non-admin request returns 403 (PAGE-04)', async () => {
    const { inertia } = createMockInertia()
    const mockListUsersService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: { meta: { total: 0, page: 1, limit: 1, totalPages: 0 } },
        }),
      ),
    }
    const mockListOrgsService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: { meta: { total: 0, page: 1, limit: 1, totalPages: 0 } },
        }),
      ),
    }
    const mockListAdminContractsService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: { meta: { total: 0, page: 1, limit: 1, totalPages: 0 } },
        }),
      ),
    }

    const page = new AdminDashboardPage(
      inertia,
      mockListUsersService as any,
      mockListOrgsService as any,
      mockListAdminContractsService as any,
    )

    const ctx = createMemberContext()
    const response = await page.handle(ctx)

    expect(response.status).toBe(403)
  })

  test('authenticated admin request renders with correct component and totals (PAGE-01)', async () => {
    const { inertia, captured } = createMockInertia()
    const mockListUsersService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: { meta: { total: 10, page: 1, limit: 1, totalPages: 10 } },
        }),
      ),
    }
    const mockListOrgsService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: { meta: { total: 5, page: 1, limit: 1, totalPages: 5 } },
        }),
      ),
    }
    const mockListAdminContractsService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: { meta: { total: 3, page: 1, limit: 1, totalPages: 3 } },
        }),
      ),
    }

    const page = new AdminDashboardPage(
      inertia,
      mockListUsersService as any,
      mockListOrgsService as any,
      mockListAdminContractsService as any,
    )

    const ctx = createAdminContext()
    await page.handle(ctx)

    const totals = captured.lastCall?.props.totals as
      | { users: number; organizations: number; contracts: number }
      | undefined

    expect(captured.lastCall?.component).toBe('Admin/Dashboard/Index')
    expect(totals).toBeDefined()
    expect(totals?.users).toBe(10)
    expect(totals?.organizations).toBe(5)
    expect(totals?.contracts).toBe(3)
    expect(mockListUsersService.execute).toHaveBeenCalled()
    expect(mockListOrgsService.execute).toHaveBeenCalled()
    expect(mockListAdminContractsService.execute).toHaveBeenCalled()
  })
})
