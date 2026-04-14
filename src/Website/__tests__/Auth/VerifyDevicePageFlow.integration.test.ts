import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { AuthorizeDeviceService } from '@/Modules/CliApi/Application/Services/AuthorizeDeviceService'
import { PAGE_CONTAINER_KEYS } from '../../Http/Inertia/createInertiaRequestHandler'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { VerifyDevicePage } from '../../Auth/Pages/VerifyDevicePage'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'
import { AUTH_PAGE_KEYS } from '../../Auth/keys'
import { registerAuthBindings as registerAuthPageBindings } from '../../Auth/bindings/registerAuthBindings'

describe('VerifyDevicePage integration', () => {
  let mockInertia: InertiaService
  let mockAuthorizeDeviceService: AuthorizeDeviceService
  let mockContext: IHttpContext

  beforeEach(() => {
    mockInertia = {
      render: mock(() => Promise.resolve(new Response('OK'))),
    } as unknown as InertiaService

    mockAuthorizeDeviceService = {
      execute: mock(async () => ({
        success: true,
        message: 'CLI device authorized successfully, return to CLI to complete login',
      })),
    } as unknown as AuthorizeDeviceService

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
        if (key === 'authorizeDeviceService') {
          return mockAuthorizeDeviceService
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
    const page = new VerifyDevicePage(mockInertia, mockAuthorizeDeviceService)
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

  test('authorize without auth returns Authentication required error', async () => {
    const page = new VerifyDevicePage(mockInertia, mockAuthorizeDeviceService)
    await page.authorize(mockContext)
    const render = mockInertia.render as ReturnType<typeof mock>
    expect(render).toHaveBeenCalledWith(
      mockContext,
      'Auth/VerifyDevice',
      expect.objectContaining({
        error: 'Authentication required',
        message: undefined,
      }),
    )
  })
})
