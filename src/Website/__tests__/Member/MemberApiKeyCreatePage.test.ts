import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'
import { MemberApiKeyCreatePage } from '../../Member/Pages/MemberApiKeyCreatePage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/member/api-keys/create',
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
  }
}

function createMemberContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = { userId: 'member-1', email: 'member@test.com', role: 'member' }
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
    getCookie: (_name: string) => undefined,
    getMethod: () => 'GET',
    setCookie: (_name: string, _value: string, _options?: unknown) => {},
    ...overrides,
  })
}

function createMemberContextWithBody(
  body: unknown,
  overrides: Partial<IHttpContext> = {},
): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = { userId: 'member-1', email: 'member@test.com', role: 'member' }
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

describe('MemberApiKeyCreatePage', () => {
  describe('handle (GET)', () => {
    test('unauthenticated request returns 302 redirect to /login', async () => {
      const ctx = createMockContext()
      const { inertia } = createMockInertia()
      const page = new MemberApiKeyCreatePage(inertia, {} as any)

      const response = await page.handle(ctx)

      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toBe('/login')
    })

    test('authenticated member request renders create form', async () => {
      const ctx = createMemberContext()
      const { inertia, captured } = createMockInertia()

      const page = new MemberApiKeyCreatePage(inertia, {} as any)
      await page.handle(ctx)

      expect(captured.lastCall?.component).toBe('Member/ApiKeys/Create')
      expect(captured.lastCall?.props.orgId).toBe(null)
      expect(captured.lastCall?.props.createdKey).toBe(null)
      expect(captured.lastCall?.props.formError).toBe(null)
    })

    test('handle with orgId query renders with orgId', async () => {
      const ctx = createMemberContext({
        getQuery: (key: string) => (key === 'orgId' ? 'org-123' : undefined),
      })
      const { inertia, captured } = createMockInertia()

      const page = new MemberApiKeyCreatePage(inertia, {} as any)
      await page.handle(ctx)

      expect(captured.lastCall?.component).toBe('Member/ApiKeys/Create')
      expect(captured.lastCall?.props.orgId).toBe('org-123')
    })
  })

  describe('store (POST)', () => {
    test('unauthenticated request returns 302 redirect to /login', async () => {
      const ctx = createMockContext()
      const { inertia } = createMockInertia()
      const page = new MemberApiKeyCreatePage(inertia, {} as any)

      const response = await page.store(ctx)

      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toBe('/login')
    })

    test('missing orgId in body renders with error message', async () => {
      const body = {
        label: 'My Key',
        rateLimitRpm: 60,
        rateLimitTpm: 10000,
      }
      const ctx = createMemberContextWithBody(body)
      const { inertia, captured } = createMockInertia()

      const page = new MemberApiKeyCreatePage(inertia, {} as any)
      await page.store(ctx)

      expect(captured.lastCall?.component).toBe('Member/ApiKeys/Create')
      expect(captured.lastCall?.props.formError).toBe('Missing orgId')
    })

    test('valid body with service success renders with createdKey', async () => {
      const body = {
        orgId: 'org-123',
        label: 'My Key',
        rateLimitRpm: 60,
        rateLimitTpm: 10000,
      }
      const ctx = createMemberContextWithBody(body)
      const { inertia, captured } = createMockInertia()

      const mockCreateService = {
        execute: mock(() =>
          Promise.resolve({
            success: true,
            data: { rawKey: 'raw-key-value-12345' },
          }),
        ),
      }

      const page = new MemberApiKeyCreatePage(inertia, mockCreateService as any)
      await page.store(ctx)

      expect(captured.lastCall?.component).toBe('Member/ApiKeys/Create')
      expect(captured.lastCall?.props.createdKey).toBe('raw-key-value-12345')
      expect(captured.lastCall?.props.formError).toBe(null)
    })

    test('service failure renders with error message', async () => {
      const body = {
        orgId: 'org-123',
        label: 'My Key',
        rateLimitRpm: 60,
        rateLimitTpm: 10000,
      }
      const ctx = createMemberContextWithBody(body)
      const { inertia, captured } = createMockInertia()

      const mockCreateService = {
        execute: mock(() =>
          Promise.resolve({
            success: false,
            message: 'Create failed',
          }),
        ),
      }

      const page = new MemberApiKeyCreatePage(inertia, mockCreateService as any)
      await page.store(ctx)

      expect(captured.lastCall?.component).toBe('Member/ApiKeys/Create')
      expect(captured.lastCall?.props.formError).toBe('Create failed')
      expect(captured.lastCall?.props.createdKey).toBe(null)
    })
  })
})
