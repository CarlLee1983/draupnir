import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AdminApiKeysPage } from '../../Admin/Pages/AdminApiKeysPage'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/admin/api-keys',
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
    getMethod: () => 'GET',
    setCookie: (_name: string, _value: string, _options?: unknown) => {},
    ...overrides,
    getMethod: overrides.getMethod ?? (() => 'GET'),
  }
}

function createAdminContext(): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' }
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
  })
}

function createMemberContext(): IHttpContext {
  return createMockContext({
    get: <T>(key: string) => {
      if (key === 'auth') return { userId: 'user-1', email: 'user@test.com', role: 'member' } as T
      return undefined
    },
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

describe('AdminApiKeysPage', () => {
  test('unauthenticated request returns 302 redirect to /login (PAGE-03)', async () => {
    const { inertia } = createMockInertia()
    const mockListKeysService = {
      execute: mock(() => Promise.resolve({ success: true, data: { keys: [] } })),
    }
    const mockListOrgsService = {
      execute: mock(() => Promise.resolve({ success: true, data: { organizations: [] } })),
    }

    const page = new AdminApiKeysPage(
      inertia,
      mockListKeysService as any,
      mockListOrgsService as any,
    )
    const ctx = createMockContext()
    const response = await page.handle(ctx)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/login')
  })

  test('authenticated non-admin request returns 403 (PAGE-04)', async () => {
    const { inertia } = createMockInertia()
    const mockListKeysService = {
      execute: mock(() => Promise.resolve({ success: true, data: { keys: [] } })),
    }
    const mockListOrgsService = {
      execute: mock(() => Promise.resolve({ success: true, data: { organizations: [] } })),
    }

    const page = new AdminApiKeysPage(
      inertia,
      mockListKeysService as any,
      mockListOrgsService as any,
    )
    const ctx = createMemberContext()
    const response = await page.handle(ctx)

    expect(response.status).toBe(403)
  })

  test('authenticated admin request without orgId renders with correct component (PAGE-01)', async () => {
    const { inertia, captured } = createMockInertia()
    const mockListKeysService = {
      execute: mock(() => Promise.resolve({ success: true, data: { keys: [] } })),
    }
    const mockListOrgsService = {
      execute: mock(() => Promise.resolve({ success: true, data: { organizations: [] } })),
    }

    const page = new AdminApiKeysPage(
      inertia,
      mockListKeysService as any,
      mockListOrgsService as any,
    )
    const ctx = createAdminContext()
    await page.handle(ctx)

    expect(captured.lastCall?.component).toBe('Admin/ApiKeys/Index')
    expect(captured.lastCall?.props.selectedOrgId).toBeNull()
    expect(captured.lastCall?.props.keys).toBeDefined()
  })

  test('authenticated admin request with orgId calls listKeysService', async () => {
    const { inertia, captured } = createMockInertia()
    const mockListKeysService = {
      execute: mock(() => Promise.resolve({ success: true, data: { keys: [] } })),
    }
    const mockListOrgsService = {
      execute: mock(() => Promise.resolve({ success: true, data: { organizations: [] } })),
    }

    const page = new AdminApiKeysPage(
      inertia,
      mockListKeysService as any,
      mockListOrgsService as any,
    )
    const ctx = createAdminContext()
    const ctxWithQuery = {
      ...ctx,
      getQuery: (key: string) => (key === 'orgId' ? 'org-123' : undefined),
    }
    await page.handle(ctxWithQuery as IHttpContext)

    expect(captured.lastCall?.component).toBe('Admin/ApiKeys/Index')
    expect(captured.lastCall?.props.selectedOrgId).toBe('org-123')
    expect(mockListKeysService.execute).toHaveBeenCalled()
  })
})
