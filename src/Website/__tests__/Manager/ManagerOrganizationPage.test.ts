import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ManagerOrganizationPage } from '../../Manager/Pages/ManagerOrganizationPage'

function makeCtx(overrides: Partial<IHttpContext> = {}): IHttpContext {
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
    getPathname: () => '/manager/organization',
    getQuery: () => undefined,
    getHeader: () => undefined,
    getParam: () => undefined,
    getMethod: () => 'GET',
    getCookie: () => undefined,
    setCookie: () => {},
    json: (d: unknown, s?: number) => Response.json(d, { status: s ?? 200 }),
    text: (s: string) => new Response(s),
    redirect: (u: string) => new Response(null, { status: 302, headers: { location: u } }),
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    params: {},
    query: {},
    headers: {},
    ...overrides,
  } as unknown as IHttpContext
}

function mkInertia() {
  const captured: { lastCall: { component: string; props: Record<string, unknown> } | null } = {
    lastCall: null,
  }
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

describe('ManagerOrganizationPage', () => {
  test('handle: 無 membership → redirect /member/dashboard', async () => {
    const { inertia } = mkInertia()
    const page = new ManagerOrganizationPage(
      inertia,
      { execute: mock() } as any,
      { execute: mock() } as any,
      { execute: mock() } as any,
      { execute: mock(() => Promise.resolve(null)) } as any,
    )
    const res = await page.handle(makeCtx())
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/member/dashboard')
  })

  test('handle: 有 membership 渲染 Manager/Organization/Index', async () => {
    const { inertia, captured } = mkInertia()
    const page = new ManagerOrganizationPage(
      inertia,
      {
        execute: mock(() =>
          Promise.resolve({
            success: true,
            message: 'OK',
            data: { id: 'org-A', name: 'Org', description: 'D', slug: 'o' },
          }),
        ),
      } as any,
      {
        execute: mock(() =>
          Promise.resolve({
            success: true,
            message: 'OK',
            data: [{ id: 'c1', status: 'active', terms: { creditQuota: 1000 } }],
          }),
        ),
      } as any,
      { execute: mock() } as any,
      {
        execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
      } as any,
    )
    await page.handle(makeCtx())
    expect(captured.lastCall?.component).toBe('Manager/Organization/Index')
    expect((captured.lastCall?.props as any).organization.id).toBe('org-A')
    expect((captured.lastCall?.props as any).contracts.length).toBe(1)
  })

  test('update: 更新名稱後重導回 /manager/organization', async () => {
    const { inertia } = mkInertia()
    const updateSvc = {
      execute: mock(() =>
        Promise.resolve({ success: true, message: 'OK', data: { id: 'org-A' } }),
      ),
    }
    const ctx = makeCtx({
      getJsonBody: async <T>() => ({ name: 'NewName', description: 'nd' }) as T,
    })
    const page = new ManagerOrganizationPage(
      inertia,
      { execute: mock() } as any,
      { execute: mock() } as any,
      updateSvc as any,
      {
        execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
      } as any,
    )
    const res = await page.update(ctx)
    expect(res.headers.get('location')).toBe('/manager/organization')
    expect(updateSvc.execute).toHaveBeenCalled()
  })
})
