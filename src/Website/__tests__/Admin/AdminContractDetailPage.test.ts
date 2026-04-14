import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AdminContractDetailPage } from '../../Admin/Pages/AdminContractDetailPage'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/admin/contracts/detail',
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
    ...overrides,
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

function createAdminContextWithBody(
  body: unknown,
  overrides: Partial<IHttpContext> = {},
): IHttpContext {
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
    getJsonBody: async <T>() => body as T,
    getParam: (_name: string) => {
      return undefined
    },
    getCookie: (_name: string) => undefined,
    setCookie: (_name: string, _value: string, _options?: unknown) => {},
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

describe('AdminContractDetailPage', () => {
  test('unauthenticated request returns 302 redirect to /login (PAGE-03)', async () => {
    const { inertia } = createMockInertia()
    const mockGetDetailService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockActivateService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockTerminateService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminContractDetailPage(
      inertia,
      mockGetDetailService as any,
      mockActivateService as any,
      mockTerminateService as any,
    )
    const ctx = createMockContext()
    const response = await page.handle(ctx)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/login')
  })

  test('authenticated non-admin request returns 403 (PAGE-04)', async () => {
    const { inertia } = createMockInertia()
    const mockGetDetailService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockActivateService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockTerminateService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminContractDetailPage(
      inertia,
      mockGetDetailService as any,
      mockActivateService as any,
      mockTerminateService as any,
    )
    const ctx = createMemberContext()
    const response = await page.handle(ctx)

    expect(response.status).toBe(403)
  })

  test('authenticated admin request renders with correct component (PAGE-01)', async () => {
    const { inertia, captured } = createMockInertia()
    const mockGetDetailService = {
      execute: mock(() =>
        Promise.resolve({ success: true, data: { id: 'contract-1', status: 'active' } }),
      ),
    }
    const mockActivateService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockTerminateService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminContractDetailPage(
      inertia,
      mockGetDetailService as any,
      mockActivateService as any,
      mockTerminateService as any,
    )
    const ctx = createAdminContext()
    const ctxWithId = {
      ...ctx,
      getParam: (name: string) => (name === 'id' ? 'contract-1' : undefined),
    }
    await page.handle(ctxWithId as IHttpContext)

    expect(captured.lastCall?.component).toBe('Admin/Contracts/Show')
    expect(captured.lastCall?.props.contract).toBeDefined()
  })

  test('handle with missing contractId returns contract: null', async () => {
    const { inertia, captured } = createMockInertia()
    const mockGetDetailService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockActivateService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockTerminateService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminContractDetailPage(
      inertia,
      mockGetDetailService as any,
      mockActivateService as any,
      mockTerminateService as any,
    )
    const ctx = createAdminContext()
    await page.handle(ctx)

    expect(captured.lastCall?.props.contract).toBeNull()
  })

  test('postAction with activate action calls activateContractService and redirects', async () => {
    const { inertia } = createMockInertia()
    const mockGetDetailService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockActivateService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockTerminateService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminContractDetailPage(
      inertia,
      mockGetDetailService as any,
      mockActivateService as any,
      mockTerminateService as any,
    )
    const ctx = createAdminContextWithBody(
      { action: 'activate' },
      {
        getParam: (name: string) => (name === 'id' ? 'contract-123' : undefined),
      },
    )
    const response = await page.postAction(ctx as IHttpContext)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/admin/contracts/contract-123')
    expect(mockActivateService.execute).toHaveBeenCalled()
  })

  test('postAction with terminate action calls terminateContractService and redirects', async () => {
    const { inertia } = createMockInertia()
    const mockGetDetailService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockActivateService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockTerminateService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminContractDetailPage(
      inertia,
      mockGetDetailService as any,
      mockActivateService as any,
      mockTerminateService as any,
    )
    const ctx = createAdminContextWithBody(
      { action: 'terminate' },
      {
        getParam: (name: string) => (name === 'id' ? 'contract-123' : undefined),
      },
    )
    const response = await page.postAction(ctx as IHttpContext)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/admin/contracts/contract-123')
    expect(mockTerminateService.execute).toHaveBeenCalled()
  })

  test('postAction with unknown action redirects without calling services', async () => {
    const { inertia } = createMockInertia()
    const mockGetDetailService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockActivateService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockTerminateService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminContractDetailPage(
      inertia,
      mockGetDetailService as any,
      mockActivateService as any,
      mockTerminateService as any,
    )
    const ctx = createAdminContextWithBody(
      { action: 'unknown' },
      {
        getParam: (name: string) => (name === 'id' ? 'contract-123' : undefined),
      },
    )
    const response = await page.postAction(ctx as IHttpContext)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/admin/contracts/contract-123')
    expect(mockActivateService.execute).not.toHaveBeenCalled()
    expect(mockTerminateService.execute).not.toHaveBeenCalled()
  })
})
