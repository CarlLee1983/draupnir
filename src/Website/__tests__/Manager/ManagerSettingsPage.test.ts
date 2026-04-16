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
    const page = new ManagerSettingsPage(inertia, get as any, { execute: mock() } as any, {
      execute: mock(),
    } as any)
    await page.handle(makeCtx())
    expect(captured.c).toBe('Manager/Settings/Index')
    expect((captured.p as any).profile.displayName).toBe('Mgr')
    expect((captured.p as any).passwordRequirements.minLength).toBe(8)
  })

  test('update: 呼叫 UpdateProfileService 並導回 /manager/settings', async () => {
    const inertia = { render: mock() } as any
    const update = { execute: mock(() => Promise.resolve({ success: true, message: 'OK' })) }
    const page = new ManagerSettingsPage(inertia, { execute: mock() } as any, update as any, {
      execute: mock(),
    } as any)
    const res = await page.update(makeCtx({ displayName: 'N' }))
    expect(res.headers.get('location')).toBe('/manager/settings')
    expect(update.execute).toHaveBeenCalledWith('mgr-1', { displayName: 'N' })
  })

  test('changePassword: 成功後導向 /login', async () => {
    const inertia = { render: mock() } as any
    const changePw = {
      execute: mock(() => Promise.resolve({ success: true, message: 'OK' })),
    }
    const page = new ManagerSettingsPage(
      inertia,
      { execute: mock() } as any,
      { execute: mock() } as any,
      changePw as any,
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
