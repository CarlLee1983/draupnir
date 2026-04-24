import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AdminContractCreatePage } from '../../Admin/Pages/AdminContractCreatePage'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/admin/contracts/create',
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
    getCookie: (_name: string) => undefined,
    getMethod: () => 'GET',
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

describe('AdminContractCreatePage', () => {
  test('authenticated admin request renders create form with formError=null (PAGE-01)', async () => {
    const { inertia, captured } = createMockInertia()
    const mockCreateContractService = { execute: mock(() => Promise.resolve({ success: true })) }

    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const page = new AdminContractCreatePage(inertia, mockCreateContractService as any)
    const ctx = createAdminContext()
    await page.handle(ctx)

    expect(captured.lastCall?.component).toBe('Admin/Contracts/Create')
    expect(captured.lastCall?.props.formError).toBeNull()
  })

  test('store with incomplete body re-renders with validation error', async () => {
    const { inertia, captured } = createMockInertia()
    const mockCreateContractService = { execute: mock(() => Promise.resolve({ success: true })) }

    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const page = new AdminContractCreatePage(inertia, mockCreateContractService as any)
    const ctx = createAdminContextWithBody({
      targetType: 'organization',
      // missing targetId
    })
    await page.store(ctx as IHttpContext)

    expect(captured.lastCall?.component).toBe('Admin/Contracts/Create')
    expect(captured.lastCall?.props.formError).toEqual({ key: 'admin.contracts.validationFailed' })
  })

  test('store with valid body and successful service call redirects', async () => {
    const { inertia } = createMockInertia()
    const mockCreateContractService = {
      execute: mock(() => Promise.resolve({ success: true, data: { id: 'contract-new-1' } })),
    }

    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const page = new AdminContractCreatePage(inertia, mockCreateContractService as any)
    const body = {
      targetType: 'organization',
      targetId: 'org-abc',
      terms: {
        creditQuota: 100,
        allowedModules: ['module-1'],
        rateLimit: { rpm: 60, tpm: 10000 },
        validityPeriod: { startDate: '2026-01-01', endDate: '2026-12-31' },
      },
    }
    const ctx = createAdminContextWithBody(body)
    ctx.set('validated', body)
    const response = await page.store(ctx as IHttpContext)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/admin/contracts/contract-new-1')
  })

  test('store with service failure re-renders with error message', async () => {
    const { inertia, captured } = createMockInertia()
    const mockCreateContractService = {
      execute: mock(() => Promise.resolve({ success: false, message: 'Service error' })),
    }

    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    const page = new AdminContractCreatePage(inertia, mockCreateContractService as any)
    const body = {
      targetType: 'organization',
      targetId: 'org-abc',
      terms: {
        creditQuota: 100,
        allowedModules: ['module-1'],
        rateLimit: { rpm: 60, tpm: 10000 },
        validityPeriod: { startDate: '2026-01-01', endDate: '2026-12-31' },
      },
    }
    const ctx = createAdminContextWithBody(body)
    ctx.set('validated', body)
    await page.store(ctx as IHttpContext)

    expect(captured.lastCall?.component).toBe('Admin/Contracts/Create')
    expect(captured.lastCall?.props.formError).toBeDefined()
  })
})
