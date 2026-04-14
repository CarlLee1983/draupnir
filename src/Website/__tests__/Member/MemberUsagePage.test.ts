import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'
import { MemberUsagePage } from '../../Member/Pages/MemberUsagePage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/member/usage',
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
  }
}

function createMemberContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = { userId: 'member-1', email: 'member@test.com', role: 'member' }
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
    getCookie: (_name: string) => undefined,
    getMethod: () => 'GET',
    setCookie: (_name: string, _value: string, _options?: unknown) => {},
    ...overrides,
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

describe('MemberUsagePage', () => {
  test('unauthenticated request returns 302 redirect to /login', async () => {
    const ctx = createMockContext()
    const { inertia } = createMockInertia()
    const page = new MemberUsagePage(inertia, {} as any)

    const response = await page.handle(ctx)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/login')
  })

  test('authenticated member request renders correct Inertia component', async () => {
    const ctx = createMemberContext({
      getQuery: (key: string) => (key === 'orgId' ? 'org-123' : undefined),
    })
    const { inertia, captured } = createMockInertia()

    const mockUsageChartService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: {
            logs: [{ timestamp: '2026-01-01', requests: 100 }],
            stats: { totalRequests: 100 },
          },
        }),
      ),
    }

    const page = new MemberUsagePage(inertia, mockUsageChartService as any)
    await page.handle(ctx)

    expect(captured.lastCall).not.toBe(null)
    expect(captured.lastCall?.component).toBe('Member/Usage/Index')
    expect(captured.lastCall?.props.orgId).toBe('org-123')
    expect(captured.lastCall?.props.usageLogs).not.toBe(null)
  })

  test('without orgId renders with empty logs and error message', async () => {
    const ctx = createMemberContext({
      getQuery: () => undefined,
    })
    const { inertia, captured } = createMockInertia()

    const mockUsageChartService = {
      execute: mock(() => Promise.resolve({ success: true, data: null })),
    }

    const page = new MemberUsagePage(inertia, mockUsageChartService as any)
    await page.handle(ctx)

    expect(captured.lastCall?.component).toBe('Member/Usage/Index')
    expect(captured.lastCall?.props.orgId).toBe(null)
    expect(captured.lastCall?.props.usageLogs).toEqual([])
    expect(captured.lastCall?.props.usageStats).toBe(null)
    expect(captured.lastCall?.props.error).toBe('Please select an organization first')
  })

  test('service failure passes error message to Inertia', async () => {
    const ctx = createMemberContext({
      getQuery: (key: string) => (key === 'orgId' ? 'org-123' : undefined),
    })
    const { inertia, captured } = createMockInertia()

    const mockUsageChartService = {
      execute: mock(() =>
        Promise.resolve({
          success: false,
          message: 'Failed to load usage',
        }),
      ),
    }

    const page = new MemberUsagePage(inertia, mockUsageChartService as any)
    await page.handle(ctx)

    expect(captured.lastCall?.props.error).toBe('Failed to load usage')
  })
})
