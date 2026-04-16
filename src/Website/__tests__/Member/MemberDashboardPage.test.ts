import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'
import { MemberDashboardPage } from '../../Member/Pages/MemberDashboardPage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/member/dashboard',
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

describe('MemberDashboardPage', () => {
  test('authenticated member request renders correct Inertia component', async () => {
    const ctx = createMemberContext()
    const { inertia, captured } = createMockInertia()

    const mockBalanceService = {
      execute: mock(() => Promise.resolve({ success: true, data: { balance: 50 } })),
    }
    const mockMembershipService = {
      execute: mock(() => Promise.resolve({ orgId: 'org-123' })),
    }
    const mockPendingInvitationsService = {
      execute: mock(() => Promise.resolve([])),
    }

    const page = new MemberDashboardPage(
      inertia,
      mockBalanceService as any,
      mockMembershipService as any,
      mockPendingInvitationsService as any,
    )
    await page.handle(ctx)

    expect(captured.lastCall).not.toBe(null)
    expect(captured.lastCall?.component).toBe('Member/Dashboard/Index')
    expect(captured.lastCall?.props.orgId).toBe('org-123')
    expect(captured.lastCall?.props.hasOrganization).toBe(true)
  })

  test('without membership renders no-org dashboard props with empty pendingInvitations', async () => {
    const ctx = createMemberContext()
    const { inertia, captured } = createMockInertia()

    const mockBalanceService = {
      execute: mock(() => Promise.resolve({ success: true, data: null })),
    }
    const mockMembershipService = {
      execute: mock(() => Promise.resolve(null)),
    }
    const mockPendingInvitationsService = {
      execute: mock(() => Promise.resolve([])),
    }

    const page = new MemberDashboardPage(
      inertia,
      mockBalanceService as any,
      mockMembershipService as any,
      mockPendingInvitationsService as any,
    )
    await page.handle(ctx)

    expect(captured.lastCall?.props.hasOrganization).toBe(false)
    expect(captured.lastCall?.props.pendingInvitations).toEqual([])
  })

  test('without membership passes pending invitations to Inertia props', async () => {
    const ctx = createMemberContext()
    const { inertia, captured } = createMockInertia()

    const mockInvitation = {
      id: 'inv-1',
      organizationId: 'org-1',
      organizationName: 'Test Org',
      role: 'member',
      expiresAt: '2026-05-01T00:00:00.000Z',
    }

    const mockBalanceService = {
      execute: mock(() => Promise.resolve({ success: true, data: null })),
    }
    const mockMembershipService = {
      execute: mock(() => Promise.resolve(null)),
    }
    const mockPendingInvitationsService = {
      execute: mock(() => Promise.resolve([mockInvitation])),
    }

    const page = new MemberDashboardPage(
      inertia,
      mockBalanceService as any,
      mockMembershipService as any,
      mockPendingInvitationsService as any,
    )
    await page.handle(ctx)

    expect(captured.lastCall?.props.pendingInvitations).toEqual([mockInvitation])
  })

  test('pending invitations service failure returns empty array (graceful degradation)', async () => {
    const ctx = createMemberContext()
    const { inertia, captured } = createMockInertia()

    const mockBalanceService = {
      execute: mock(() => Promise.resolve({ success: true, data: null })),
    }
    const mockMembershipService = {
      execute: mock(() => Promise.resolve(null)),
    }
    const mockPendingInvitationsService = {
      execute: mock(() => Promise.reject(new Error('DB error'))),
    }

    const page = new MemberDashboardPage(
      inertia,
      mockBalanceService as any,
      mockMembershipService as any,
      mockPendingInvitationsService as any,
    )
    await page.handle(ctx)

    expect(captured.lastCall?.props.pendingInvitations).toEqual([])
    expect(captured.lastCall?.props.hasOrganization).toBe(false)
  })

  test('service failure passes error message to Inertia', async () => {
    const ctx = createMemberContext()
    const { inertia, captured } = createMockInertia()

    const mockBalanceService = {
      execute: mock(() => Promise.resolve({ success: false, message: '組織不存在' })),
    }
    const mockMembershipService = {
      execute: mock(() => Promise.resolve({ orgId: 'org-123' })),
    }
    const mockPendingInvitationsService = {
      execute: mock(() => Promise.resolve([])),
    }

    const page = new MemberDashboardPage(
      inertia,
      mockBalanceService as any,
      mockMembershipService as any,
      mockPendingInvitationsService as any,
    )
    await page.handle(ctx)

    expect(captured.lastCall?.props.error).toEqual({ key: 'member.dashboard.loadFailed' })
  })
})
