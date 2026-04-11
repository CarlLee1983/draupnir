import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../InertiaService'
import { VerifyDevicePage } from '../../Auth/VerifyDevicePage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  store.set('inertia:shared', { csrfToken: 'test-csrf-token-123' })
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/verify-device',
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

describe('VerifyDevicePage', () => {
  let page: VerifyDevicePage
  let render: ReturnType<typeof mock>
  let inertia: InertiaService

  beforeEach(() => {
    render = mock(() => Promise.resolve(new Response('OK')))
    inertia = { render } as unknown as InertiaService
    page = new VerifyDevicePage(inertia)
  })

  describe('handle()', () => {
    test('renders Auth/VerifyDevice on GET with csrf and empty message/error', async () => {
      const ctx = createMockContext()
      const response = await page.handle(ctx)

      expect(render).toHaveBeenCalledWith(ctx, 'Auth/VerifyDevice', {
        csrfToken: 'test-csrf-token-123',
        message: undefined,
        error: undefined,
      })
      expect(response).toBeDefined()
    })

    test('uses empty csrfToken when shared data omits it', async () => {
      const store = new Map<string, unknown>()
      store.set('inertia:shared', {})
      const ctx = createMockContext({
        get: <T>(key: string) => store.get(key) as T | undefined,
      })

      await page.handle(ctx)

      const call = render.mock.calls[0] as unknown as [unknown, string, Record<string, unknown>]
      expect(call[2].csrfToken).toBe('')
    })
  })

  describe('authorize()', () => {
    test('renders success message on POST handler', async () => {
      const ctx = createMockContext()
      const response = await page.authorize(ctx)

      expect(render).toHaveBeenCalledWith(ctx, 'Auth/VerifyDevice', {
        csrfToken: 'test-csrf-token-123',
        message: 'Device authorization completed. Please return to your CLI.',
        error: undefined,
      })
      expect(response).toBeDefined()
    })
  })
})
