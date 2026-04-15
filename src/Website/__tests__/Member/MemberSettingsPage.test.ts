import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'
import { MemberSettingsPage } from '../../Member/Pages/MemberSettingsPage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/member/settings',
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

describe('MemberSettingsPage', () => {
  describe('handle (GET)', () => {
    test('authenticated member request renders settings page with profile', async () => {
      const ctx = createMemberContext()
      const { inertia, captured } = createMockInertia()

      const mockGetProfileService = {
        execute: mock(() =>
          Promise.resolve({
            success: true,
            data: { displayName: 'Test User', email: 'member@test.com' },
          }),
        ),
      }

      const page = new MemberSettingsPage(inertia, mockGetProfileService as any, {} as any)
      await page.handle(ctx)

      expect(captured.lastCall?.component).toBe('Member/Settings/Index')
      expect(captured.lastCall?.props.user).toMatchObject({ name: 'Test User', role: 'member' })
      expect(captured.lastCall?.props.formError).toBe(null)
    })

    test('get profile service failure renders with error', async () => {
      const ctx = createMemberContext()
      const { inertia, captured } = createMockInertia()

      const mockGetProfileService = {
        execute: mock(() =>
          Promise.resolve({
            success: false,
            message: 'Failed to load profile',
          }),
        ),
      }

      const page = new MemberSettingsPage(inertia, mockGetProfileService as any, {} as any)
      await page.handle(ctx)

      expect(captured.lastCall?.component).toBe('Member/Settings/Index')
      expect(captured.lastCall?.props.user).toMatchObject({ name: '', role: 'member' })
      expect(captured.lastCall?.props.formError).toEqual({ key: 'member.settings.loadFailed' })
    })
  })

  describe('update (PUT)', () => {
    test('update success renders with no formError', async () => {
      const body = { displayName: 'New Name' }
      const ctx = createMemberContextWithBody(body)
      const { inertia, captured } = createMockInertia()

      const mockGetProfileService = {
        execute: mock(() =>
          Promise.resolve({
            success: true,
            data: { displayName: 'New Name', email: 'member@test.com' },
          }),
        ),
      }
      const mockUpdateProfileService = {
        execute: mock(() => Promise.resolve({ success: true })),
      }

      const page = new MemberSettingsPage(
        inertia,
        mockGetProfileService as any,
        mockUpdateProfileService as any,
      )
      await page.update(ctx)

      expect(captured.lastCall?.component).toBe('Member/Settings/Index')
      expect(captured.lastCall?.props.formError).toBe(null)
      expect(captured.lastCall?.props.user).toMatchObject({ name: 'New Name', role: 'member' })
    })

    test('update failure renders with formError', async () => {
      const body = { displayName: 'X' }
      const ctx = createMemberContextWithBody(body)
      const { inertia, captured } = createMockInertia()

      const mockGetProfileService = {
        execute: mock(() =>
          Promise.resolve({
            success: true,
            data: { displayName: 'Old Name', email: 'member@test.com' },
          }),
        ),
      }
      const mockUpdateProfileService = {
        execute: mock(() =>
          Promise.resolve({
            success: false,
            message: 'Name is too short',
          }),
        ),
      }

      const page = new MemberSettingsPage(
        inertia,
        mockGetProfileService as any,
        mockUpdateProfileService as any,
      )
      await page.update(ctx)

      expect(captured.lastCall?.component).toBe('Member/Settings/Index')
      expect(captured.lastCall?.props.formError).toEqual({ key: 'member.settings.loadFailed' })
    })
  })
})
