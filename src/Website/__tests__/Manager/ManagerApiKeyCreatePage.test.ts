import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ManagerApiKeyCreatePage } from '../../Manager/Pages/ManagerApiKeyCreatePage'

function makeCtx(body?: unknown, overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = {
    userId: 'mgr-1',
    email: 'm@x',
    role: 'manager',
    permissions: [],
    tokenType: 'access',
  }
  store.set('auth', auth)
  if (body) store.set('validated', body)
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
    getPathname: () => '/manager/api-keys/create',
    getParam: () => undefined,
    getQuery: () => undefined,
    getHeader: () => undefined,
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

describe('ManagerApiKeyCreatePage', () => {
  test('handle 渲染 Create 頁並提供可指派成員', async () => {
    const captured: { lastCall: { component: string; props: Record<string, unknown> } | null } = {
      lastCall: null,
    }
    const inertia = {
      render: (_c: IHttpContext, component: string, props: Record<string, unknown>) => {
        captured.lastCall = { component, props }
        return new Response(JSON.stringify({}))
      },
    } as any
    const page = new ManagerApiKeyCreatePage(
      inertia,
      { execute: mock() } as any,
      { execute: mock() } as any,
      {
        execute: mock(() =>
          Promise.resolve({
            success: true,
            message: 'OK',
            data: {
              members: [{ userId: 'u-1', role: 'member', email: 'm@example.com', joinedAt: '2026-01-01' }],
            },
          }),
        ),
      } as any,
      {
        execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
      } as any,
    )
    await page.handle(makeCtx())
    expect(captured.lastCall?.component).toBe('Manager/ApiKeys/Create')
    expect((captured.lastCall?.props as any).assignees.length).toBe(1)
  })

  test('store: create 成功 + assignee 非空 → 呼叫 assign 並 render 頁面含 newKeyValue', async () => {
    const createSvc = {
      execute: mock(() =>
        Promise.resolve({ success: true, message: 'OK', data: { id: 'k-1', rawKey: 'sk-bf-test' } }),
      ),
    }
    const assignSvc = { execute: mock(() => Promise.resolve({ success: true, message: 'OK' })) }
    const captured: { component?: string; props?: Record<string, unknown> } = {}
    const inertia = {
      render: mock((_c: IHttpContext, component: string, props: Record<string, unknown>) => {
        captured.component = component
        captured.props = props
        return new Response(JSON.stringify({}))
      }),
    } as any
    const body = {
      label: 'Prod',
      quotaAllocated: 100,
      budgetResetPeriod: '30d',
      assigneeUserId: 'u-1',
    }
    const page = new ManagerApiKeyCreatePage(
      inertia,
      createSvc as any,
      assignSvc as any,
      {
        execute: mock(() =>
          Promise.resolve({ success: true, message: 'OK', data: { members: [] } }),
        ),
      } as any,
      {
        execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
      } as any,
    )
    await page.store(makeCtx(body))
    expect(createSvc.execute).toHaveBeenCalled()
    expect(assignSvc.execute).toHaveBeenCalled()
    expect(captured.component).toBe('Manager/ApiKeys/Create')
    expect(captured.props?.newKeyValue).toBe('sk-bf-test')
  })

  test('store: quota 未設定時即使 period 有預設值也能成功建立', async () => {
    const createSvc = {
      execute: mock(() =>
        Promise.resolve({ success: true, message: 'OK', data: { id: 'k-2', rawKey: 'sk-bf-y' } }),
      ),
    }
    const assignSvc = { execute: mock(() => Promise.resolve({ success: true, message: 'OK' })) }
    const inertia = {
      render: mock(() => new Response(JSON.stringify({}))),
    } as any
    // 模擬表單預設：period='30d' 但 quota 未填（undefined）
    const body = { label: 'No-Budget Key', budgetResetPeriod: '30d', assigneeUserId: null }
    const page = new ManagerApiKeyCreatePage(
      inertia,
      createSvc as any,
      assignSvc as any,
      {
        execute: mock(() =>
          Promise.resolve({ success: true, message: 'OK', data: { members: [] } }),
        ),
      } as any,
      {
        execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
      } as any,
    )
    await page.store(makeCtx(body))
    expect(inertia.render).toHaveBeenCalled()
    const call = (createSvc.execute as ReturnType<typeof mock>).mock.calls[0]?.[0] as any
    expect(call.budgetResetPeriod).toBeUndefined()
    expect(call.budgetMaxLimit).toBeUndefined()
  })

  test('store: create 失敗時寫入 flash 並導回建立頁', async () => {
    const setCookieCalls: Array<{ name: string; value: string }> = []
    const createSvc = {
      execute: mock(() =>
        Promise.resolve({
          success: false,
          message: 'Gateway unavailable',
          error: 'NETWORK',
        }),
      ),
    }
    const assignSvc = { execute: mock(() => Promise.resolve({ success: true, message: 'OK' })) }
    const inertia = { render: mock() } as any
    const body = { label: 'Prod', quotaAllocated: 100, budgetResetPeriod: '30d' }
    const page = new ManagerApiKeyCreatePage(
      inertia,
      createSvc as any,
      assignSvc as any,
      {
        execute: mock(() =>
          Promise.resolve({ success: true, message: 'OK', data: { members: [] } }),
        ),
      } as any,
      {
        execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
      } as any,
    )
    const res = await page.store(
      makeCtx(body, {
        setCookie: (name: string, value: string) => {
          setCookieCalls.push({ name, value })
        },
      }),
    )
    expect(res.headers.get('location')).toBe('/manager/api-keys/create')
    const flashCookie = setCookieCalls.find((c) => c.name === 'flash:error')
    expect(flashCookie).toBeDefined()
    const parsed = JSON.parse(decodeURIComponent(flashCookie!.value)) as {
      key: string
      params?: { message?: string }
    }
    expect(parsed.key).toBe('manager.apiKeys.createFailed')
    expect(parsed.params?.message).toBe('Gateway unavailable')
  })

  test('store: assigneeUserId 為空時不呼叫 assign', async () => {
    const createSvc = {
      execute: mock(() =>
        Promise.resolve({ success: true, message: 'OK', data: { id: 'k-1', rawKey: 'sk-bf-x' } }),
      ),
    }
    const assignSvc = { execute: mock(() => Promise.resolve({ success: true, message: 'OK' })) }
    const inertia = { render: mock(() => new Response(JSON.stringify({}))) } as any
    const body = { label: 'Prod', quotaAllocated: 100, budgetResetPeriod: '30d' }
    const page = new ManagerApiKeyCreatePage(
      inertia,
      createSvc as any,
      assignSvc as any,
      {
        execute: mock(() =>
          Promise.resolve({ success: true, message: 'OK', data: { members: [] } }),
        ),
      } as any,
      {
        execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
      } as any,
    )
    await page.store(makeCtx(body))
    expect(assignSvc.execute).not.toHaveBeenCalled()
  })
})
