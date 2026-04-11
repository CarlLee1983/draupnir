import { describe, expect, test, mock } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../InertiaService'
import { AdminModuleCreatePage } from '../../Admin/AdminModuleCreatePage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/admin/modules/create',
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

function createAdminContext(): IHttpContext {
  return createMockContext({
    get: <T>(key: string) => {
      if (key === 'auth') return { userId: 'admin-1', email: 'admin@test.com', role: 'admin' } as T
      return undefined
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

function createAdminContextWithBody(body: unknown, overrides: Partial<IHttpContext> = {}): IHttpContext {
  return createMockContext({
    get: <T>(key: string) => {
      if (key === 'auth') return { userId: 'admin-1', email: 'admin@test.com', role: 'admin' } as T
      return undefined
    },
    getJsonBody: async <T>() => body as T,
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

describe('AdminModuleCreatePage', () => {
  test('unauthenticated request returns 302 redirect to /login (PAGE-03)', async () => {
    const { inertia } = createMockInertia()
    const mockRegisterModuleService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminModuleCreatePage(inertia, mockRegisterModuleService as any)
    const ctx = createMockContext()
    const response = await page.handle(ctx)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/login')
  })

  test('authenticated non-admin request returns 403 (PAGE-04)', async () => {
    const { inertia } = createMockInertia()
    const mockRegisterModuleService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminModuleCreatePage(inertia, mockRegisterModuleService as any)
    const ctx = createMemberContext()
    const response = await page.handle(ctx)

    expect(response.status).toBe(403)
  })

  test('authenticated admin request renders create form with formError=null (PAGE-01)', async () => {
    const { inertia, captured } = createMockInertia()
    const mockRegisterModuleService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminModuleCreatePage(inertia, mockRegisterModuleService as any)
    const ctx = createAdminContext()
    await page.handle(ctx)

    expect(captured.lastCall?.component).toBe('Admin/Modules/Create')
    expect(captured.lastCall?.props.formError).toBeNull()
  })

  test('store with empty name re-renders with validation error', async () => {
    const { inertia, captured } = createMockInertia()
    const mockRegisterModuleService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminModuleCreatePage(inertia, mockRegisterModuleService as any)
    const ctx = createAdminContextWithBody(
      {
        name: '',
        description: 'Test module',
      },
      {
        get: <T>(key: string) => {
          if (key === 'auth') return { userId: 'admin-1', email: 'admin@test.com', role: 'admin' } as T
          if (key === 'inertia:shared') return { messages: { 'admin.modules.nameRequired': '模組識別名稱為必填' } } as T
          return undefined
        },
      }
    )
    await page.store(ctx as IHttpContext)

    expect(captured.lastCall?.component).toBe('Admin/Modules/Create')
    expect(captured.lastCall?.props.formError).toBe('模組識別名稱為必填')
  })

  test('store with valid name and successful service call redirects', async () => {
    const { inertia } = createMockInertia()
    const mockRegisterModuleService = { execute: mock(() => Promise.resolve({ success: true, data: { id: 'module-1' } })) }

    const page = new AdminModuleCreatePage(inertia, mockRegisterModuleService as any)
    const ctx = createAdminContextWithBody({
      name: 'test-module',
      description: 'Test module',
      type: 'free',
    })
    const response = await page.store(ctx as IHttpContext)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/admin/modules')
  })

  test('store with service failure re-renders with error message', async () => {
    const { inertia, captured } = createMockInertia()
    const mockRegisterModuleService = { execute: mock(() => Promise.resolve({ success: false, message: 'Module already exists' })) }

    const page = new AdminModuleCreatePage(inertia, mockRegisterModuleService as any)
    const ctx = createAdminContextWithBody({
      name: 'test-module',
      description: 'Test module',
      type: 'free',
    })
    await page.store(ctx as IHttpContext)

    expect(captured.lastCall?.component).toBe('Admin/Modules/Create')
    expect(captured.lastCall?.props.formError).toBeDefined()
  })
})
