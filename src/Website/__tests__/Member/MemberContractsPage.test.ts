import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'
import { MemberContractsPage } from '../../Member/Pages/MemberContractsPage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/member/contracts',
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

describe('MemberContractsPage', () => {
  test('authenticated member request renders correct Inertia component', async () => {
    const ctx = createMemberContext({
      getQuery: (key: string) => (key === 'orgId' ? 'org-123' : undefined),
    })
    const { inertia, captured } = createMockInertia()

    const mockListService = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          data: [
            {
              id: 'contract-1',
              status: 'active',
              terms: {
                creditQuota: 1000,
                validityPeriod: { startDate: '2026-01-01', endDate: '2026-12-31' },
              },
            },
          ],
        }),
      ),
    }

    const mockMemberRepository = { findByUserId: mock(() => Promise.resolve(null)) }
    const page = new MemberContractsPage(inertia, mockListService as any, mockMemberRepository as any)
    await page.handle(ctx)

    expect(captured.lastCall).not.toBe(null)
    expect(captured.lastCall?.component).toBe('Member/Contracts/Index')
    expect(captured.lastCall?.props.orgId).toBe('org-123')
    expect(captured.lastCall?.props.contracts).not.toBe(null)
  })

  test('without orgId renders with empty contracts and error message', async () => {
    const ctx = createMemberContext({
      getQuery: () => undefined,
    })
    const { inertia, captured } = createMockInertia()

    const mockListService = { execute: mock(() => Promise.resolve({ success: true, data: null })) }

    const mockMemberRepository = { findByUserId: mock(() => Promise.resolve(null)) }
    const page = new MemberContractsPage(inertia, mockListService as any, mockMemberRepository as any)
    await page.handle(ctx)

    expect(captured.lastCall?.component).toBe('Member/Contracts/Index')
    expect(captured.lastCall?.props.orgId).toBe(null)
    expect(captured.lastCall?.props.contracts).toEqual([])
    expect(captured.lastCall?.props.error).toEqual({ key: 'member.contracts.selectOrg' })
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
          message: 'Failed to load contracts',
        }),
      ),
    }

    const mockMemberRepository = { findByUserId: mock(() => Promise.resolve(null)) }
    const page = new MemberContractsPage(inertia, mockListService as any, mockMemberRepository as any)
    await page.handle(ctx)

    expect(captured.lastCall?.props.error).toEqual({ key: 'member.contracts.loadFailed' })
  })
})
