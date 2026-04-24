import { describe, expect, test } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { requireManager } from '../../Manager/middleware/requireManager'

function makeCtx(
  auth: unknown,
  redirects: { calls: { url: string; status?: number }[] },
): IHttpContext {
  const store = new Map<string, unknown>()
  if (auth) store.set('auth', auth)
  return {
    get: <T>(k: string) => store.get(k) as T | undefined,
    set: (k: string, v: unknown) => {
      store.set(k, v)
    },
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/manager/dashboard',
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    redirect: (url: string, status?: number) => {
      redirects.calls.push({ url, status })
      return new Response(null, { status: status ?? 302, headers: { location: url } })
    },
    json: (d: unknown) => Response.json(d),
    text: (s: string) => new Response(s),
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getMethod: () => 'GET',
    getCookie: () => undefined,
    setCookie: () => {},
  } as unknown as IHttpContext
}

describe('requireManager', () => {
  test('未登入 → redirect /login', () => {
    const redirects = { calls: [] as { url: string; status?: number }[] }
    const ctx = makeCtx(null, redirects)
    const r = requireManager(ctx)
    expect(r.ok).toBe(false)
    expect(redirects.calls[0]?.url).toBe('/login')
  })

  test('admin → redirect /admin/dashboard', () => {
    const redirects = { calls: [] as { url: string; status?: number }[] }
    const ctx = makeCtx(
      { userId: 'a', email: 'a', role: 'admin', permissions: [], tokenType: 'access' },
      redirects,
    )
    const r = requireManager(ctx)
    expect(r.ok).toBe(false)
    expect(redirects.calls[0]?.url).toBe('/admin/dashboard')
  })

  test('member → redirect /member/dashboard', () => {
    const redirects = { calls: [] as { url: string; status?: number }[] }
    const ctx = makeCtx(
      { userId: 'm', email: 'm', role: 'member', permissions: [], tokenType: 'access' },
      redirects,
    )
    const r = requireManager(ctx)
    expect(r.ok).toBe(false)
    expect(redirects.calls[0]?.url).toBe('/member/dashboard')
  })

  test('manager → ok', () => {
    const redirects = { calls: [] as { url: string; status?: number }[] }
    const ctx = makeCtx(
      { userId: 'mg', email: 'mg', role: 'manager', permissions: [], tokenType: 'access' },
      redirects,
    )
    const r = requireManager(ctx)
    expect(r.ok).toBe(true)
    expect(r.auth?.role).toBe('manager')
  })
})
