import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ManagerMembersPage } from '../../Manager/Pages/ManagerMembersPage'

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
    getPathname: () => '/manager/members',
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
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    } as any,
    captured,
  }
}

describe('ManagerMembersPage', () => {
  test('handle: 渲染成員列表且附上指派 key 名稱對應', async () => {
    const { inertia, captured } = mkInertia()
    const page = new ManagerMembersPage(
      inertia,
      {
        execute: mock(() =>
          Promise.resolve({
            success: true,
            message: 'OK',
            data: {
              members: [
                {
                  id: 'm1',
                  userId: 'u-1',
                  email: 'one@example.com',
                  role: 'member',
                  joinedAt: '2026-01-01T00:00:00Z',
                },
                {
                  id: 'm2',
                  userId: 'u-2',
                  email: 'two@example.com',
                  role: 'member',
                  joinedAt: '2026-01-02T00:00:00Z',
                },
              ],
            },
          }),
        ),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      {
        execute: mock(() =>
          Promise.resolve({
            success: true,
            data: {
              keys: [{ id: 'k-1', label: 'Prod', assignedMemberId: 'u-1' }],
              meta: { total: 1, page: 1, limit: 1000, totalPages: 1 },
            },
          }),
        ),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      } as any,
      {
        execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      } as any,
      {
        execute: mock(() =>
          Promise.resolve({
            success: true,
            data: {
              invitations: [
                {
                  id: 'inv-1',
                  organizationId: 'org-A',
                  email: 'pending@example.com',
                  role: 'member',
                  status: 'pending',
                  expiresAt: new Date(Date.now() + 86400000).toISOString(),
                  createdAt: '2026-01-01T00:00:00.000Z',
                },
              ],
            },
          }),
        ),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      } as any,
    )
    await page.handle(makeCtx())
    expect(captured.lastCall?.component).toBe('Manager/Members/Index')
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const members = (captured.lastCall?.props as any).members as Array<{
      userId: string
      email: string
      assignedKeys: string[]
    }>
    expect(members[0].assignedKeys).toEqual(['Prod'])
    expect(members[1].assignedKeys).toEqual([])
    expect(members[0].email).toBe('one@example.com')
    const pending = (captured.lastCall?.props as { pendingInvitations: { email: string }[] })
      .pendingInvitations
    expect(pending).toHaveLength(1)
    expect(pending[0].email).toBe('pending@example.com')
  })

  test('invite: 成功後 redirect /manager/members', async () => {
    const { inertia } = mkInertia()
    const inviteSvc = {
      execute: mock(() =>
        Promise.resolve({ success: true, message: 'OK', data: { token: 'T', expiresAt: 'X' } }),
      ),
    }
    const ctx = makeCtx({
      get: <T>(k: string) => {
        if (k === 'validated') return { email: 'new@x', role: 'member' } as T
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
    const page = new ManagerMembersPage(
      inertia,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      inviteSvc as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      {
        execute: mock(() =>
          Promise.resolve({
            success: true,
            data: { keys: [], meta: { total: 0, page: 1, limit: 1000, totalPages: 0 } },
          }),
        ),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      } as any,
      {
        execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock(() => Promise.resolve({ success: true, data: { invitations: [] } })) } as any,
    )
    const res = await page.invite(ctx)
    expect(res.headers.get('location')).toBe('/manager/members')
    expect(inviteSvc.execute).toHaveBeenCalled()
  })

  test('remove: 不可移除自己時不呼叫 RemoveMemberService', async () => {
    const { inertia } = mkInertia()
    const removeSvc = { execute: mock(() => Promise.resolve({ success: true, message: 'OK' })) }
    const ctx = makeCtx({
      getParam: (k: string) => (k === 'userId' ? 'mgr-1' : undefined),
    })
    const page = new ManagerMembersPage(
      inertia,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      removeSvc as any,
      {
        execute: mock(() =>
          Promise.resolve({
            success: true,
            data: { keys: [], meta: { total: 0, page: 1, limit: 1000, totalPages: 0 } },
          }),
        ),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      } as any,
      {
        execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock(() => Promise.resolve({ success: true, data: { invitations: [] } })) } as any,
    )
    await page.remove(ctx)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    expect((removeSvc.execute as any).mock.calls.length).toBe(0)
  })

  test('remove: 取 userId 參數並呼叫 RemoveMemberService', async () => {
    const { inertia } = mkInertia()
    const removeSvc = { execute: mock(() => Promise.resolve({ success: true, message: 'OK' })) }
    const ctx = makeCtx({
      getParam: (k: string) => (k === 'userId' ? 'u-2' : undefined),
    })
    const page = new ManagerMembersPage(
      inertia,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      removeSvc as any,
      {
        execute: mock(() =>
          Promise.resolve({
            success: true,
            data: { keys: [], meta: { total: 0, page: 1, limit: 1000, totalPages: 0 } },
          }),
        ),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      } as any,
      {
        execute: mock(() => Promise.resolve({ orgId: 'org-A' })),
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock(() => Promise.resolve({ success: true, data: { invitations: [] } })) } as any,
    )
    const res = await page.remove(ctx)
    expect(res.headers.get('location')).toBe('/manager/members')
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const args = (removeSvc.execute as any).mock.calls[0]
    expect(args[0]).toBe('org-A')
    expect(args[1]).toBe('u-2')
  })
})
