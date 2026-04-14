import { describe, expect, mock, test } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { MemberApiKeyRevokeHandler } from '../../Member/Pages/MemberApiKeyRevokeHandler'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/member/api-keys/revoke',
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

function createMemberContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  return createMockContext({
    get: <T>(key: string) => {
      if (key === 'auth')
        return { userId: 'member-1', email: 'member@test.com', role: 'member' } as T
      return undefined
    },
    getCookie: (_name: string) => undefined,
    setCookie: (_name: string, _value: string, _options?: unknown) => {},
    ...overrides,
  })
}

describe('MemberApiKeyRevokeHandler', () => {
  test('unauthenticated request returns 302 redirect to /login', async () => {
    const ctx = createMockContext()
    const page = new MemberApiKeyRevokeHandler({} as any)

    const response = await page.handle(ctx)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/login')
  })

  test('authenticated request without keyId redirects to /member/api-keys', async () => {
    const ctx = createMemberContext()
    const mockRevokeService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new MemberApiKeyRevokeHandler(mockRevokeService as any)
    const response = await page.handle(ctx)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/member/api-keys')
  })

  test('authenticated request with keyId calls service and redirects', async () => {
    const ctx = createMemberContext({
      getParam: (name: string) => (name === 'keyId' ? 'key-abc' : undefined),
    })
    const mockRevokeService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new MemberApiKeyRevokeHandler(mockRevokeService as any)
    const response = await page.handle(ctx)

    expect(mockRevokeService.execute).toHaveBeenCalled()
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/member/api-keys')
  })

  test('authenticated request with keyId and orgId query preserves orgId in redirect', async () => {
    const ctx = createMemberContext({
      getParam: (name: string) => (name === 'keyId' ? 'key-abc' : undefined),
      getQuery: (key: string) => (key === 'orgId' ? 'org-123' : undefined),
    })
    const mockRevokeService = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new MemberApiKeyRevokeHandler(mockRevokeService as any)
    const response = await page.handle(ctx)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('/member/api-keys?orgId=org-123')
  })
})
