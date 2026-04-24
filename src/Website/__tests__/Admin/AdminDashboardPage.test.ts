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
    const mockAdminUsageTrendService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: {
            points: [{ date: '2026-04-20T12:00:00.000Z', requests: 2, tokens: 100 }],
          },
        }),
      ),
    }

    const page = new AdminDashboardPage(
      inertia,
      mockListUsersService as any,
      mockListOrgsService as any,
      mockListAdminContractsService as any,
      mockAdminUsageTrendService as any,
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
    const trend = captured.lastCall?.props.usageTrend as
      | { date: string; requests: number; tokens: number }[]
      | undefined
    expect(trend).toEqual([{ date: '2026-04-20T12:00:00.000Z', requests: 2, tokens: 100 }])
    expect(captured.lastCall?.props.usageWindowDays).toBe(15)
    expect(mockListUsersService.execute).toHaveBeenCalled()
    expect(mockListOrgsService.execute).toHaveBeenCalled()
    expect(mockListAdminContractsService.execute).toHaveBeenCalled()
    expect(mockAdminUsageTrendService.execute).toHaveBeenCalledWith(15)
  })

  test('uses days=30 from query for usage trend', async () => {
    const { inertia, captured } = createMockInertia()
    const mockListUsersService = {
      execute: mock(() => Promise.resolve({ success: true, data: { meta: { total: 0 } } })),
    }
    const mockListOrgsService = {
      execute: mock(() => Promise.resolve({ success: true, data: { meta: { total: 0 } } })),
    }
    const mockListAdminContractsService = {
      execute: mock(() => Promise.resolve({ success: true, data: { meta: { total: 0 } } })),
    }
    const mockAdminUsageTrendService = {
      execute: mock(() => Promise.resolve({ success: true, data: { points: [] } })),
    }

    const page = new AdminDashboardPage(
      inertia,
      mockListUsersService as any,
      mockListOrgsService as any,
      mockListAdminContractsService as any,
      mockAdminUsageTrendService as any,
    )

    const ctx = createAdminContext()
    const withDays = {
      ...ctx,
      getQuery: (key: string) => (key === 'days' ? '30' : undefined),
    } as IHttpContext
    await page.handle(withDays)

    expect(captured.lastCall?.props.usageWindowDays).toBe(30)
    expect(mockAdminUsageTrendService.execute).toHaveBeenCalledWith(30)
  })

  test('generates demo usage trend data when all real data points are zero', async () => {
    const { inertia, captured } = createMockInertia()
    const mockListUsersService = {
      execute: mock(() => Promise.resolve({ success: true, data: { meta: { total: 0 } } })),
    }
    const mockListOrgsService = {
      execute: mock(() => Promise.resolve({ success: true, data: { meta: { total: 0 } } })),
    }
    const mockListAdminContractsService = {
      execute: mock(() => Promise.resolve({ success: true, data: { meta: { total: 0 } } })),
    }

    // Return a trend where all points are 0
    const mockAdminUsageTrendService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: {
            points: [
              { date: '2026-04-20T12:00:00.000Z', requests: 0, tokens: 0 },
              { date: '2026-04-21T12:00:00.000Z', requests: 0, tokens: 0 },
            ],
          },
        }),
      ),
    }

    const page = new AdminDashboardPage(
      inertia,
      mockListUsersService as any,
      mockListOrgsService as any,
      mockListAdminContractsService as any,
      mockAdminUsageTrendService as any,
    )

    const ctx = createAdminContext()
    await page.handle(ctx)

    const props = captured.lastCall?.props as any
    expect(props.isUsageTrendDemo).toBe(true)
    expect(props.usageTrend.length).toBe(2)
    expect(props.usageTrend[0].requests).toBeGreaterThan(0)
    expect(props.usageTrend[0].tokens).toBeGreaterThan(0)
    expect(props.usageTrend[0].date).toBe('2026-04-20T12:00:00.000Z')
  })
})
