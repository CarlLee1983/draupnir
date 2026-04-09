import { describe, test, expect } from 'bun:test'
import { InertiaService } from '../InertiaService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/admin/dashboard',
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: (data: unknown, statusCode?: number) => Response.json(data, { status: statusCode ?? 200 }),
    text: (content: string, statusCode?: number) => new Response(content, { status: statusCode ?? 200 }),
    redirect: (url: string, statusCode?: number) => Response.redirect(url, statusCode ?? 302),
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => {
      store.set(key, value)
    },
    ...overrides,
  }
}

describe('InertiaService', () => {
  const renderHtml = (data: Record<string, unknown>) => {
    const page = data.page as string
    return `<html><body><script type="application/json" data-page="app">${page}</script><div id="app"></div></body></html>`
  }

  const viteTags = '<script type="module" src="http://localhost:5173/resources/js/app.tsx"></script>'

  test('首次訪問回傳 HTML 頁面', async () => {
    const service = new InertiaService(renderHtml, viteTags, '1.0')
    const ctx = createMockContext()

    const response = service.render(ctx, 'Admin/Dashboard/Index', { totalUsers: 42 })

    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    const html = await response.text()
    expect(html).toContain('<div id="app"></div>')
    expect(html).toContain('data-page="app"')
    expect(html).toContain('"component":"Admin/Dashboard/Index"')
    expect(html).toContain('"totalUsers":42')
  })

  test('Inertia XHR 請求回傳 JSON', async () => {
    const service = new InertiaService(renderHtml, viteTags, '1.0')
    const ctx = createMockContext({
      getHeader: (name: string) => {
        if (name.toLowerCase() === 'x-inertia') return 'true'
        return undefined
      },
      headers: { 'x-inertia': 'true' },
    })

    const response = service.render(ctx, 'Admin/Dashboard/Index', { totalUsers: 42 })

    expect(response.headers.get('X-Inertia')).toBe('true')
    const json = (await response.json()) as {
      component: string
      props: { totalUsers: number }
      url: string
    }
    expect(json.component).toBe('Admin/Dashboard/Index')
    expect(json.props.totalUsers).toBe(42)
    expect(json.url).toBe('/admin/dashboard')
  })

  test('version mismatch 回傳 409', async () => {
    const service = new InertiaService(renderHtml, viteTags, '2.0')
    const ctx = createMockContext({
      getHeader: (name: string) => {
        if (name.toLowerCase() === 'x-inertia') return 'true'
        if (name.toLowerCase() === 'x-inertia-version') return '1.0'
        return undefined
      },
      headers: { 'x-inertia': 'true', 'x-inertia-version': '1.0' },
    })

    const response = service.render(ctx, 'Admin/Dashboard/Index', {})
    expect(response.status).toBe(409)
  })
})
