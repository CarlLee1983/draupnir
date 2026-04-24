import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'
import { MemberApiKeysPage } from '../../Member/Pages/MemberApiKeysPage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/member/api-keys',
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

describe('MemberApiKeysPage', () => {
  const mockBalanceService = {
    execute: mock(() => Promise.resolve({ success: true, data: { balance: '100.00' } })),
  }
  const mockPendingInvitationsService = {
    execute: mock(() => Promise.resolve([])),
  }

  test('authenticated member request renders correct Inertia component', async () => {
    const ctx = createMemberContext({
      getQuery: (key: string) => (key === 'orgId' ? 'org-123' : undefined),
    })
    const { inertia, captured } = createMockInertia()

    const mockListService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: {
            keys: [
              {
                id: 'key-1',
                label: 'Test Key',
                keyPrefix: 'sk_test_',
                gatewayKeyValue: 'drp_sk_full_secret',
                status: 'active',
                createdAt: '2026-01-01T00:00:00Z',
                lastUsedAt: null,
              },
            ],
            meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
          },
        }),
      ),
    }

    const mockMembershipService = { execute: mock(() => Promise.resolve({ orgId: 'org-123' })) }
    const page = new MemberApiKeysPage(
      inertia,
      mockListService as any,
      mockMembershipService as any,
      mockBalanceService as any,
      mockPendingInvitationsService as any,
    )
    await page.handle(ctx)

    expect(captured.lastCall).not.toBe(null)
    expect(captured.lastCall?.component).toBe('Member/ApiKeys/Index')
    expect(captured.lastCall?.props.orgId).toBe('org-123')
    expect(captured.lastCall?.props.balance).toEqual({ balance: '100.00' })
    expect(captured.lastCall?.props.hasOrganization).toBe(true)
    expect(captured.lastCall?.props.keys).not.toBe(null)
    const keys = captured.lastCall?.props.keys as Array<{ gatewayKeyValue?: string | null }>
    expect(keys[0]?.gatewayKeyValue).toBe('drp_sk_full_secret')
  })

  test('without membership renders onboarding state', async () => {
    const ctx = createMemberContext({
      getQuery: () => undefined,
    })
    const { inertia, captured } = createMockInertia()

    const mockListService = { execute: mock(() => Promise.resolve({ success: true, data: null })) }
    const mockMembershipService = { execute: mock(() => Promise.resolve(null)) }
    const mockInvitesService = {
      execute: mock(() => Promise.resolve([{ id: 'inv-1', orgName: 'Test Org' }])),
    }

    const page = new MemberApiKeysPage(
      inertia,
      mockListService as any,
      mockMembershipService as any,
      mockBalanceService as any,
      mockInvitesService as any,
    )
    await page.handle(ctx)

    expect(captured.lastCall?.component).toBe('Member/ApiKeys/Index')
    expect(captured.lastCall?.props.orgId).toBe(null)
    expect(captured.lastCall?.props.hasOrganization).toBe(false)
    expect(captured.lastCall?.props.pendingInvitations).toHaveLength(1)
    expect(captured.lastCall?.props.keys).toEqual([])
  })

  test('service failure passes error message to Inertia', async () => {
    const ctx = createMemberContext({
      getQuery: (key: string) => (key === 'orgId' ? 'org-123' : undefined),
    })
    const { inertia, captured } = createMockInertia()

    const mockListService = {
      execute: mock(() =>
        Promise.resolve({
          success: false,
          message: 'Failed to load API keys',
        }),
      ),
    }

    const mockMembershipService = { execute: mock(() => Promise.resolve({ orgId: 'org-123' })) }
    const page = new MemberApiKeysPage(
      inertia,
      mockListService as any,
      mockMembershipService as any,
      mockBalanceService as any,
      mockPendingInvitationsService as any,
    )
    await page.handle(ctx)

    expect(captured.lastCall?.props.error).toEqual({ key: 'member.dashboard.loadFailed' })
  })

  test('Member 列表呼叫 ListApiKeysService 並附帶 assignedMemberId filter', async () => {
    const ctx = createMemberContext({ getQuery: () => undefined })
    const { inertia } = createMockInertia()
    const mockListService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: { keys: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } },
        }),
      ),
    }
    const mockMembershipService = {
      execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
    }
    const page = new MemberApiKeysPage(
      inertia,
      mockListService as any,
      mockMembershipService as any,
      mockBalanceService as any,
      mockPendingInvitationsService as any,
    )
    await page.handle(ctx)

    const args = (mockListService.execute as any).mock.calls[0]
    expect(args[0]).toBe('org-A') // orgId
    expect(args[1]).toBe('member-1') // callerUserId
    expect(args[5]).toEqual({ assignedMemberId: 'member-1' })
  })
})
