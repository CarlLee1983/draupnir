import { describe, expect, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { MemberDashboardPage } from '../Member/Pages/MemberDashboardPage'

describe('MemberDashboardPage i18n', () => {
  test('returns no-org dashboard props when user has no manager membership', async () => {
    // 建立一個帶有 auth 的 mock context（模擬已登入的 member）
    const store = new Map<string, unknown>()
    store.set('inertia:shared', {
      locale: 'en',
      messages: loadMessages('en'),
      auth: { user: { id: 'u1', email: 'test@test.com', role: 'member' } },
      currentOrgId: null,
      flash: {},
    })
    // 設定 auth context（模擬 AuthMiddleware 已執行的結果）
    store.set('auth', {
      userId: 'u1',
      email: 'test@test.com',
      role: 'member',
      permissions: [],
      tokenType: 'access',
    })

    const ctx: IHttpContext = {
      getBodyText: async () => '',
      getJsonBody: async <T>() => ({}) as T,
      getBody: async <T>() => ({}) as T,
      getHeader: () => undefined,
      getParam: () => undefined,
      getMethod: () => 'GET',
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
    }

    // Mock inertia render 來擷取 props
    let capturedProps: Record<string, unknown> = {}
    const mockInertia = {
      render: (_ctx: IHttpContext, _component: string, props: Record<string, unknown>) => {
        capturedProps = props
        return new Response(JSON.stringify({ props }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    } as any

    const mockMemberRepo = {
      findByUserId: async () => null,
    }

    const page = new MemberDashboardPage(mockInertia, {} as any, mockMemberRepo as any)
    await page.handle(ctx)

    expect(capturedProps.hasOrganization).toBe(false)
    expect(capturedProps.error).toBe(null)
  })
})
