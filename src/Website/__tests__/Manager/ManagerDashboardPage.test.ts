import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ManagerDashboardPage } from '../../Manager/Pages/ManagerDashboardPage'

function makeCtx(): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = {
    userId: 'mgr-1',
    email: 'm@x',
    role: 'manager',
    permissions: [],
    tokenType: 'access',
  }
  store.set('auth', auth)
  store.set('inertia:shared', {
    locale: 'en',
    messages: loadMessages('en'),
    auth: { user: { id: auth.userId, email: auth.email, role: auth.role } },
    currentOrgId: null,
    flash: {},
  })
  return {
    get: <T>(k: string) => store.get(k) as T | undefined,
    set: (k: string, v: unknown) => {
      store.set(k, v)
    },
    getPathname: () => '/manager/dashboard',
    getQuery: () => undefined,
    getHeader: () => undefined,
    getParam: () => undefined,
    getMethod: () => 'GET',
    getCookie: () => undefined,
    setCookie: () => {},
    json: (d: unknown) => Response.json(d),
    text: (s: string) => new Response(s),
    redirect: (u: string) => new Response(null, { status: 302, headers: { location: u } }),
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    params: {},
    query: {},
    headers: {},
  } as unknown as IHttpContext
}

function mkInertia() {
  const captured: {
    lastCall: { component: string; props: Record<string, unknown> } | null
  } = { lastCall: null }
  return {
    inertia: {
      render: (_c: IHttpContext, component: string, props: Record<string, unknown>) => {
        captured.lastCall = { component, props }
        return new Response(JSON.stringify({ component, props }))
      },
    } as any,
    captured,
  }
}

describe('ManagerDashboardPage', () => {
  test('無 membership → 導向 /member/dashboard', async () => {
    const ctx = makeCtx()
    const { inertia } = mkInertia()
    const membershipService = { execute: mock(() => Promise.resolve(null)) }
    const page = new ManagerDashboardPage(
      inertia,
      { execute: mock() } as any,
      { execute: mock() } as any,
      { execute: mock() } as any,
      membershipService as any,
    )
    const res = await page.handle(ctx)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/member/dashboard')
  })

  test('有 membership → 渲染 Manager/Dashboard/Index 並注入 orgId + 合約配額 + 已配發 + keys', async () => {
    const ctx = makeCtx()
    const { inertia, captured } = mkInertia()
    const membershipService = {
      execute: mock(() => Promise.resolve({ orgId: 'org-A', userId: 'mgr-1' })),
    }
    const orgQuota = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          message: 'Success',
          data: { contractQuota: 500, contractId: 'ctr-1' },
        }),
      ),
    }
    const sumAllocated = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          message: 'OK',
          data: { totalAllocated: 120 },
        }),
      ),
    }
    const listKeys = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          message: 'OK',
          data: {
            keys: [
              {
                id: 'k1',
                label: 'Prod',
                quotaAllocated: 50,
                status: 'active',
                assignedMemberId: 'u-1',
              },
            ],
            meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
          },
        }),
      ),
    }
    const page = new ManagerDashboardPage(
      inertia,
      orgQuota as any,
      sumAllocated as any,
      listKeys as any,
      membershipService as any,
    )
    await page.handle(ctx)
    expect(captured.lastCall?.component).toBe('Manager/Dashboard/Index')
    expect((captured.lastCall?.props as any).orgId).toBe('org-A')
    expect((captured.lastCall?.props as any).contractQuota).toBe(500)
    expect((captured.lastCall?.props as any).totalAllocated).toBe(120)
    expect((captured.lastCall?.props as any).keys?.length).toBe(1)
  })
})
