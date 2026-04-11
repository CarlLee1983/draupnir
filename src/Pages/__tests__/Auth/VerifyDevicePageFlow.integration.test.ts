import { beforeEach, describe, expect, mock, test } from 'bun:test'
import { PAGE_CONTAINER_KEYS } from '@/Pages/pageContainerKeys'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { VerifyDevicePage } from '../../Auth/VerifyDevicePage'
import type { InertiaService } from '../../InertiaService'
import { AUTH_PAGE_KEYS } from '../../routing/auth/authPageKeys'
import { registerAuthPageBindings } from '../../routing/auth/registerAuthPageBindings'

describe('VerifyDevicePage integration', () => {
  let mockInertia: InertiaService
  let mockContext: IHttpContext

  beforeEach(() => {
    mockInertia = {
      render: mock(() => Promise.resolve(new Response('OK'))),
    } as unknown as InertiaService

    const store = new Map<string, unknown>()
    store.set('inertia:shared', { csrfToken: 'test-csrf-token' })
    mockContext = {
      get: <T>(key: string) => store.get(key) as T | undefined,
    } as unknown as IHttpContext
  })

  test('registers VerifyDevicePage binding in container', () => {
    const keys: string[] = []
    const container = {
      singleton: mock((key: string) => {
        keys.push(key)
      }),
      make: mock(() => undefined),
    } as unknown as IContainer

    registerAuthPageBindings(container)

    expect(keys).toContain(AUTH_PAGE_KEYS.verifyDevice)
  })

  test('binding factory produces VerifyDevicePage', () => {
    let factory: ((c: IContainer) => unknown) | undefined
    const container = {
      singleton: mock((key: string, fn: (c: IContainer) => unknown) => {
        if (key === AUTH_PAGE_KEYS.verifyDevice) {
          factory = fn
        }
      }),
      make: mock((key: string) => {
        if (key === PAGE_CONTAINER_KEYS.inertiaService) {
          return mockInertia
        }
        return undefined
      }),
    } as unknown as IContainer

    registerAuthPageBindings(container)
    expect(factory).toBeDefined()
    const instance = factory!(container)
    expect(instance).toBeInstanceOf(VerifyDevicePage)
  })

  test('handle matches GET /verify-device behavior', async () => {
    const page = new VerifyDevicePage(mockInertia)
    await page.handle(mockContext)
    const render = mockInertia.render as ReturnType<typeof mock>
    expect(render).toHaveBeenCalledWith(
      mockContext,
      'Auth/VerifyDevice',
      expect.objectContaining({
        csrfToken: 'test-csrf-token',
      }),
    )
  })

  test('authorize matches POST /verify-device behavior', async () => {
    const page = new VerifyDevicePage(mockInertia)
    await page.authorize(mockContext)
    const render = mockInertia.render as ReturnType<typeof mock>
    expect(render).toHaveBeenCalledWith(
      mockContext,
      'Auth/VerifyDevice',
      expect.objectContaining({
        message: expect.stringContaining('Device authorization completed'),
      }),
    )
  })
})
