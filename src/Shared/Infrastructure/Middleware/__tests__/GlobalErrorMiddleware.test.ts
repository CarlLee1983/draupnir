import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { createGlobalErrorMiddleware } from '../GlobalErrorMiddleware'

const createMockContext = (
  opts: { isInertia?: boolean; acceptJson?: boolean; requestId?: string } = {},
): IHttpContext => {
  const state: Record<string, unknown> = {
    requestId: opts.requestId ?? 'test-id',
  }
  const headers: Record<string, string | undefined> = {
    'x-inertia': opts.isInertia ? 'true' : undefined,
    accept: opts.acceptJson ? 'application/json' : 'text/html',
  }
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: (name: string) => headers[name.toLowerCase()],
    getPathname: () => '/',
    getMethod: () => 'GET',
    getParam: () => undefined,
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: <T>(data: T, status = 200) => new Response(JSON.stringify(data), { status }),
    text: (content: string, status = 200) => new Response(content, { status }),
    redirect: (url: string, status = 302) =>
      new Response(null, { status, headers: { Location: url } }),
    get: <T>(key: string): T | undefined => state[key] as T,
    set: (key: string, value: unknown) => {
      state[key] = value
    },
    getCookie: () => undefined,
    setCookie: () => {},
  } as IHttpContext
}

describe('GlobalErrorMiddleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('handler 正常回應 → pass-through，不攔截', async () => {
    const mw = createGlobalErrorMiddleware()
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('ok', { status: 200 }))
    expect(response.status).toBe(200)
  })

  it('handler 回傳 4xx Response → pass-through，不攔截', async () => {
    const mw = createGlobalErrorMiddleware()
    const ctx = createMockContext()
    const response = await mw(ctx, async () => new Response('not found', { status: 404 }))
    expect(response.status).toBe(404)
  })

  it('handler throw Response → pass-through', async () => {
    const mw = createGlobalErrorMiddleware()
    const ctx = createMockContext()
    const thrown = new Response('custom', { status: 422 })
    const response = await mw(ctx, async () => {
      throw thrown
    })
    expect(response.status).toBe(422)
  })

  it('JSON 請求 throw Error → JSON 500，不含 stack trace', async () => {
    const mw = createGlobalErrorMiddleware()
    const ctx = createMockContext({ acceptJson: true })
    const response = await mw(ctx, async () => {
      throw new Error('DB failed')
    })
    expect(response.status).toBe(500)
    const body = (await response.json()) as Record<string, unknown>
    expect(body.success).toBe(false)
    expect(body.error).toBe('INTERNAL_ERROR')
    expect(JSON.stringify(body)).not.toContain('DB failed')
    expect(JSON.stringify(body)).not.toContain('stack')
  })

  it('Inertia 請求 throw Error → Inertia 格式 JSON 500', async () => {
    const mw = createGlobalErrorMiddleware()
    const ctx = createMockContext({ isInertia: true })
    const response = await mw(ctx, async () => {
      throw new Error('crash')
    })
    expect(response.status).toBe(500)
    const body = (await response.json()) as Record<string, unknown>
    expect(body.component).toBeDefined()
    expect(JSON.stringify(body)).not.toContain('crash')
    expect(JSON.stringify(body)).not.toContain('stack')
  })

  it('一般 HTML 請求 throw Error → 500 text/html', async () => {
    const mw = createGlobalErrorMiddleware()
    const ctx = createMockContext()
    const response = await mw(ctx, async () => {
      throw new Error('boom')
    })
    expect(response.status).toBe(500)
    expect(response.headers.get('content-type')).toContain('text/html')
    const text = await response.text()
    expect(text).not.toContain('boom')
    expect(text).not.toContain('stack')
  })

  it('server-side error log 包含 requestId', async () => {
    const errorSpy = vi.spyOn(console, 'error')
    const mw = createGlobalErrorMiddleware()
    const ctx = createMockContext({ requestId: 'req-xyz', acceptJson: true })
    await mw(ctx, async () => {
      throw new Error('something')
    })
    expect(errorSpy).toHaveBeenCalled()
    const logArg = JSON.stringify(errorSpy.mock.calls[0])
    expect(logArg).toContain('req-xyz')
  })
})
