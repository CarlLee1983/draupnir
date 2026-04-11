import { describe, expect, test, mock } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../InertiaService'
import { AdminUserDetailPage } from '../../Admin/AdminUserDetailPage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/admin/users/detail',
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
    getParam: (name: string) => {
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

describe('AdminUserDetailPage', () => {
  test('unauthenticated request returns 302 redirect to /login (PAGE-03)', async () => {
    const { inertia } = createMockInertia()
    const mockGetProfileService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockGetUserDetailService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockChangeUserStatusService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminUserDetailPage(
      inertia,
      mockGetProfileService as any,
      mockGetUserDetailService as any,
      mockChangeUserStatusService as any,
    )
    const ctx = createMockContext()
    const response = await page.handle(ctx)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/login')
  })

  test('authenticated non-admin request returns 403 (PAGE-04)', async () => {
    const { inertia } = createMockInertia()
    const mockGetProfileService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockGetUserDetailService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockChangeUserStatusService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminUserDetailPage(
      inertia,
      mockGetProfileService as any,
      mockGetUserDetailService as any,
      mockChangeUserStatusService as any,
    )
    const ctx = createMemberContext()
    const response = await page.handle(ctx)

    expect(response.status).toBe(403)
  })

  test('authenticated admin request renders with correct component (PAGE-01)', async () => {
    const { inertia, captured } = createMockInertia()
    const mockGetProfileService = { execute: mock(() => Promise.resolve({ success: true, data: { displayName: 'Test User' } })) }
    const mockGetUserDetailService = { execute: mock(() => Promise.resolve({ success: true, data: { id: 'user-1', email: 'user@test.com', status: 'active', role: 'member', createdAt: '2026-01-01', updatedAt: '2026-01-01' } })) }
    const mockChangeUserStatusService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminUserDetailPage(
      inertia,
      mockGetProfileService as any,
      mockGetUserDetailService as any,
      mockChangeUserStatusService as any,
    )
    const ctx = createAdminContext()
    const ctxWithId = {
      ...ctx,
      getParam: (name: string) => name === 'id' ? 'user-1' : undefined,
    }
    await page.handle(ctxWithId as IHttpContext)

    expect(captured.lastCall?.component).toBe('Admin/Users/Show')
    expect(captured.lastCall?.props.user).toBeDefined()
  })

  test('postStatus redirects after successful status change', async () => {
    const { inertia } = createMockInertia()
    const mockGetProfileService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockGetUserDetailService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockChangeUserStatusService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminUserDetailPage(
      inertia,
      mockGetProfileService as any,
      mockGetUserDetailService as any,
      mockChangeUserStatusService as any,
    )
    const ctx = createAdminContextWithBody({ status: 'suspended' }, {
      getParam: (name: string) => name === 'id' ? 'user-1' : undefined,
    })
    const response = await page.postStatus(ctx as IHttpContext)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/admin/users/user-1')
  })

  test('postStatus with invalid status still redirects', async () => {
    const { inertia } = createMockInertia()
    const mockGetProfileService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockGetUserDetailService = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockChangeUserStatusService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminUserDetailPage(
      inertia,
      mockGetProfileService as any,
      mockGetUserDetailService as any,
      mockChangeUserStatusService as any,
    )
    const ctx = createAdminContextWithBody({ status: 'invalid' }, {
      getParam: (name: string) => name === 'id' ? 'user-1' : undefined,
    })
    const response = await page.postStatus(ctx as IHttpContext)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/admin/users/user-1')
  })
})
