/**
 * Gravito ServiceProvider 適配器
 *
 * 將框架無關的 ModuleServiceProvider 適配為 Gravito 的 ServiceProvider
 * 這是框架耦合的唯一地點。
 */

import { type Container as GravitoContainer, type PlanetCore, ServiceProvider } from '@gravito/core'
import type { IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'

/**
 * 將 Gravito 的 Container 適配為框架無關的 IContainer
 */
class GravitoContainerAdapter implements IContainer {
  constructor(private gravitoContainer: GravitoContainer) {}

  singleton(name: string, factory: (container: IContainer) => any): void {
    this.gravitoContainer.singleton(name, (c: GravitoContainer) => {
      return factory(new GravitoContainerAdapter(c))
    })
  }

  bind(name: string, factory: (container: IContainer) => any): void {
    // bind implementation in Gravito creates a new instance each time
    this.gravitoContainer.bind(name, (c: GravitoContainer) => {
      return factory(new GravitoContainerAdapter(c))
    })
  }

  make(name: string): any {
    return this.gravitoContainer.make(name)
  }
}

/**
 * Adapts framework-agnostic ModuleServiceProvider to Gravito's ServiceProvider.
 */
export class GravitoServiceProviderAdapter extends ServiceProvider {
  constructor(private moduleProvider: ModuleServiceProvider) {
    super()
  }

  register(container: GravitoContainer): void {
    // Adapt Gravito's Container to framework-agnostic IContainer
    const adaptedContainer = new GravitoContainerAdapter(container)

    // Call module's registration method
    this.moduleProvider.register(adaptedContainer)
  }

  boot(core: PlanetCore): void {
    // Call module's boot method
    this.moduleProvider.boot(core)
  }
}

/**
 * Factory function: creates an adapter.
 *
 * @param moduleProvider - Framework-agnostic module service provider.
 * @returns Gravito framework ServiceProvider.
 *
 * @example
 * app.register(createGravitoServiceProvider(new UserServiceProvider()))
 */
export function createGravitoServiceProvider(
  moduleProvider: ModuleServiceProvider,
): ServiceProvider {
  return new GravitoServiceProviderAdapter(moduleProvider)
}

/**
 * 可選介面：模組實作此介面以自我管理路由。
 * 刻意放在 Gravito 適配層而非 IServiceProvider.ts，保持 ModuleServiceProvider 框架無關。
 */
export interface IRouteRegistrar {
  registerRoutes(core: PlanetCore): void | Promise<void>
}

/**
 * 型別守衛：判斷 ModuleServiceProvider 是否實作了 IRouteRegistrar。
 */
export function isRouteRegistrar(value: unknown): value is IRouteRegistrar {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as IRouteRegistrar).registerRoutes === 'function'
  )
}
