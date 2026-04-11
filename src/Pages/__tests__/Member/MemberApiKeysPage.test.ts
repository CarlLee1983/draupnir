import { describe, expect, test, mock } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../InertiaService'
import { MemberApiKeysPage } from '../../Member/MemberApiKeysPage'

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
    ...overrides,
  }
}

function createMemberContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  return createMockContext({
    get: <T>(key: string) => {
      if (key === 'auth') return { userId: 'member-1', email: 'member@test.com', role: 'member' } as T
      return undefined
    },
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
  test('unauthenticated request returns 302 redirect to /login', async () => {
    const ctx = createMockContext()
    const { inertia } = createMockInertia()
    const page = new MemberApiKeysPage(inertia, {} as any)

    const response = await page.handle(ctx)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/login')
  })

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
                status: 'active',
                createdAt: '2026-01-01T00:00:00Z',
                lastUsedAt: null,
              },
            ],
            meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
          },
        })
      ),
    }

    const page = new MemberApiKeysPage(inertia, mockListService as any)
    await page.handle(ctx)

    expect(captured.lastCall).not.toBe(null)
    expect(captured.lastCall?.component).toBe('Member/ApiKeys/Index')
    expect(captured.lastCall?.props.orgId).toBe('org-123')
    expect(captured.lastCall?.props.keys).not.toBe(null)
  })

  test('without orgId renders with empty keys and error message', async () => {
    const ctx = createMemberContext({
      get: <T>(key: string) => {
        if (key === 'auth') return { userId: 'member-1', email: 'member@test.com', role: 'member' } as T
        if (key === 'inertia:shared')
          return {
            locale: 'zh-TW',
            messages: { 'member.apiKeys.selectOrg': '請先選擇組織' },
          } as T
        return undefined
      },
    })
    const { inertia, captured } = createMockInertia()

    const mockListService = { execute: mock(() => Promise.resolve({ success: true, data: null })) }

    const page = new MemberApiKeysPage(inertia, mockListService as any)
    await page.handle(ctx)

    expect(captured.lastCall?.component).toBe('Member/ApiKeys/Index')
    expect(captured.lastCall?.props.orgId).toBe(null)
    expect(captured.lastCall?.props.keys).toEqual([])
    expect(captured.lastCall?.props.error).toContain('請先選擇組織')
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
          message: '列表查詢失敗',
        })
      ),
    }

    const page = new MemberApiKeysPage(inertia, mockListService as any)
    await page.handle(ctx)

    expect(captured.lastCall?.props.error).toBe('列表查詢失敗')
  })
})
