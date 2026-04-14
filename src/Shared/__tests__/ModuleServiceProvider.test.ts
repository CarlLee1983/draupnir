import { describe, expect, it, vi } from 'vitest'
import type { IContainer } from '../Infrastructure/IServiceProvider'
import { ModuleServiceProvider } from '../Infrastructure/IServiceProvider'

const mockContainer = (): IContainer => ({
  singleton: vi.fn(),
  bind: vi.fn(),
  make: vi.fn(),
})

describe('ModuleServiceProvider', () => {
  it('register() 以固定順序呼叫四個 hooks', () => {
    const callOrder: string[] = []
    class TestProvider extends ModuleServiceProvider {
      protected override registerRepositories() { callOrder.push('repos') }
      protected override registerInfraServices() { callOrder.push('infra') }
      protected override registerApplicationServices() { callOrder.push('services') }
      protected override registerControllers() { callOrder.push('controllers') }
    }
    const provider = new TestProvider()
    provider.register(mockContainer())
    expect(callOrder).toEqual(['repos', 'infra', 'services', 'controllers'])
  })

  it('未 override 的 hook 預設為空操作，不拋出錯誤', () => {
    class MinimalProvider extends ModuleServiceProvider {}
    const provider = new MinimalProvider()
    expect(() => provider.register(mockContainer())).not.toThrow()
  })

  it('boot() 預設為空操作，不拋出錯誤', () => {
    class MinimalProvider extends ModuleServiceProvider {}
    const provider = new MinimalProvider()
    expect(() => provider.boot(mockContainer())).not.toThrow()
  })

  it('register() 將 container 傳遞給所有 hooks', () => {
    const c = mockContainer()
    let receivedContainer: IContainer | undefined
    class TestProvider extends ModuleServiceProvider {
      protected override registerRepositories(container: IContainer) {
        receivedContainer = container
      }
    }
    new TestProvider().register(c)
    expect(receivedContainer).toBe(c)
  })
})
