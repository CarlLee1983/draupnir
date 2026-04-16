import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ManagerApiKeysPage } from '../../Manager/Pages/ManagerApiKeysPage'

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
    getPathname: () => '/manager/api-keys',
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

describe('ManagerApiKeysPage', () => {
  test('handle: 渲染 Manager/ApiKeys/Index 並帶入 keys + 可指派成員（僅 role=member）', async () => {
    const { inertia, captured } = mkInertia()
    const listKeys = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          message: 'OK',
          data: {
            keys: [
              {
                id: 'k-1',
                label: 'Prod',
                quotaAllocated: 100,
                status: 'active',
                assignedMemberId: 'u-2',
              },
            ],
            meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
          },
        }),
      ),
    }
    const listMembers = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          message: 'OK',
          data: {
            members: [
              { userId: 'u-2', role: 'member', joinedAt: '2026-01-01' },
              { userId: 'mgr-1', role: 'manager', joinedAt: '2026-01-01' },
            ],
          },
        }),
      ),
    }
    const page = new ManagerApiKeysPage(
      inertia,
      listKeys as any,
      listMembers as any,
      { execute: mock() } as any,
      { execute: mock() } as any,
      {
        execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
      } as any,
    )
    await page.handle(makeCtx())
    expect(captured.lastCall?.component).toBe('Manager/ApiKeys/Index')
    expect((captured.lastCall?.props as any).keys.length).toBe(1)
    const assignees = (captured.lastCall?.props as any).assignees as Array<{ userId: string }>
    expect(assignees.map((a) => a.userId)).toEqual(['u-2'])
  })

  test('assign: POST 呼叫 AssignApiKeyService，null 代表取消指派', async () => {
    const assign = { execute: mock(() => Promise.resolve({ success: true, message: 'OK' })) }
    const ctx = makeCtx({
      getParam: (k: string) => (k === 'keyId' ? 'k-1' : undefined),
      get: <T>(k: string) => {
        if (k === 'validated') return { assigneeUserId: null } as T
        if (k === 'auth')
          return {
            userId: 'mgr-1',
            email: 'm',
            role: 'manager',
            permissions: [],
            tokenType: 'access',
          } as T
        return undefined
      },
    })
    const { inertia } = mkInertia()
    const page = new ManagerApiKeysPage(
      inertia,
      { execute: mock() } as any,
      { execute: mock() } as any,
      assign as any,
      { execute: mock() } as any,
      {
        execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
      } as any,
    )
    const res = await page.assign(ctx)
    expect(res.headers.get('location')).toBe('/manager/api-keys')
    const args = (assign.execute as any).mock.calls[0][0]
    expect(args.orgId).toBe('org-A')
    expect(args.keyId).toBe('k-1')
    expect(args.assigneeUserId).toBe(null)
  })

  test('revoke: POST 呼叫 RevokeApiKeyService', async () => {
    const revoke = { execute: mock(() => Promise.resolve({ success: true, message: 'OK' })) }
    const ctx = makeCtx({ getParam: (k: string) => (k === 'keyId' ? 'k-1' : undefined) })
    const { inertia } = mkInertia()
    const page = new ManagerApiKeysPage(
      inertia,
      { execute: mock() } as any,
      { execute: mock() } as any,
      { execute: mock() } as any,
      revoke as any,
      {
        execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
      } as any,
    )
    const res = await page.revoke(ctx)
    expect(res.headers.get('location')).toBe('/manager/api-keys')
    expect(revoke.execute).toHaveBeenCalled()
  })
})
