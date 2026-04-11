import { describe, expect, test, mock } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../InertiaService'
import { MemberUsagePage } from '../../Member/MemberUsagePage'

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
    ...overrides,
  }
}

function createMemberContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  return createMockContext({
    get: <T>(key: string) => {
      if (key === 'auth') return { userId: 'member-1', email: 'member@test.com', role: 'member' } as T
      return undefined
    },
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
        })
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
      get: <T>(key: string) => {
        if (key === 'auth') return { userId: 'member-1', email: 'member@test.com', role: 'member' } as T
        if (key === 'inertia:shared')
          return {
            locale: 'zh-TW',
            messages: { 'member.usage.selectOrg': '請先選擇組織' },
          } as T
        return undefined
      },
    })
    const { inertia, captured } = createMockInertia()

    const mockUsageChartService = { execute: mock(() => Promise.resolve({ success: true, data: null })) }

    const page = new MemberUsagePage(inertia, mockUsageChartService as any)
    await page.handle(ctx)

    expect(captured.lastCall?.component).toBe('Member/Usage/Index')
    expect(captured.lastCall?.props.orgId).toBe(null)
    expect(captured.lastCall?.props.usageLogs).toEqual([])
    expect(captured.lastCall?.props.usageStats).toBe(null)
    expect(captured.lastCall?.props.error).toContain('請先選擇組織')
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
          message: '使用量查詢失敗',
        })
      ),
    }

    const page = new MemberUsagePage(inertia, mockUsageChartService as any)
    await page.handle(ctx)

    expect(captured.lastCall?.props.error).toBe('使用量查詢失敗')
  })
})
