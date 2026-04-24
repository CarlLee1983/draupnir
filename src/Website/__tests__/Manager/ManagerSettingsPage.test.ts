import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ManagerSettingsPage } from '../../Manager/Pages/ManagerSettingsPage'

function makeCtx(body?: unknown): IHttpContext {
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
    getPathname: () => '/manager/settings',
    getParam: () => undefined,
    getQuery: () => undefined,
    getHeader: () => undefined,
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

describe('ManagerSettingsPage', () => {
  test('handle: 渲染 Manager/Settings/Index', async () => {
    const captured: { c?: string; p?: Record<string, unknown> } = {}
    const inertia = {
      render: (_: IHttpContext, c: string, p: Record<string, unknown>) => {
        captured.c = c
        captured.p = p
        return new Response()
      },
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    } as any
    const get = {
      execute: mock(() =>
        Promise.resolve({
          success: true,
          message: 'OK',
          data: { displayName: 'Mgr', timezone: 'Asia/Taipei', locale: 'zh-TW' },
        }),
      ),
    }
    const page = new ManagerSettingsPage(
      inertia,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      get as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock(() => Promise.resolve({ success: true, sessions: [] })) } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock(() => Promise.resolve({ success: true, message: 'OK' })) } as any,
    )
    await page.handle(makeCtx())
    expect(captured.c).toBe('Manager/Settings/Index')
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    expect((captured.p as any).profile.displayName).toBe('Mgr')
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    expect((captured.p as any).passwordRequirements.minLength).toBe(8)
  })

  test('handle: 使用 refreshedAuthTokenHash 作為 currentHash（silent refresh 後）', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const inertia = { render: () => new Response() } as any
    const listSessions = mock((_userId: string, hash?: string | null) =>
      Promise.resolve({ success: true, sessions: [], _hash: hash }),
    )
    const page = new ManagerSettingsPage(
      inertia,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock(() => Promise.resolve({ success: true, data: null })) } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: listSessions } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock(() => Promise.resolve({ success: true, message: 'OK' })) } as any,
    )

    const ctx = makeCtx()
    ctx.set('refreshedAuthTokenHash', 'refreshed-hash-abc')
    await page.handle(ctx)

    expect(listSessions).toHaveBeenCalledWith('mgr-1', 'refreshed-hash-abc')
  })

  test('update: 呼叫 UpdateProfileService 並導回 /manager/settings', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const inertia = { render: mock() } as any
    const update = { execute: mock(() => Promise.resolve({ success: true, message: 'OK' })) }
    const page = new ManagerSettingsPage(
      inertia,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      update as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock(() => Promise.resolve({ success: true, sessions: [] })) } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock(() => Promise.resolve({ success: true, message: 'OK' })) } as any,
    )
    const res = await page.update(makeCtx({ displayName: 'N' }))
    expect(res.headers.get('location')).toBe('/manager/settings')
    expect(update.execute).toHaveBeenCalledWith('mgr-1', { displayName: 'N' })
  })

  test('changePassword: 成功後導向 /login', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const inertia = { render: mock() } as any
    const changePw = {
      execute: mock(() => Promise.resolve({ success: true, message: 'OK' })),
    }
    const page = new ManagerSettingsPage(
      inertia,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock() } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      changePw as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock(() => Promise.resolve({ success: true, sessions: [] })) } as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      { execute: mock(() => Promise.resolve({ success: true, message: 'OK' })) } as any,
    )
    const res = await page.changePassword(
      makeCtx({
        currentPassword: 'old',
        password: 'NewPassword1',
        passwordConfirmation: 'NewPassword1',
      }),
    )
    expect(res.headers.get('location')).toBe('/login')
    expect(changePw.execute).toHaveBeenCalledWith('mgr-1', 'old', 'NewPassword1')
  })
})
