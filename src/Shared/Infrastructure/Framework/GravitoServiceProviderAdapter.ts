/**
 * Gravito ServiceProvider 適配器
 *
 * 將框架無關的 ModuleServiceProvider 適配為 Gravito 的 ServiceProvider
 * 這是框架耦合的唯一地點。
 */

import { type Container as GravitoContainer, type PlanetCore, ServiceProvider } from '@gravito/core'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import type { IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'

/**
 * 將 Gravito 的 Container 適配為框架無關的 IContainer
 */
class GravitoContainerAdapter implements IContainer {
  constructor(private gravitoContainer: GravitoContainer) {}

  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  singleton(name: string, factory: (container: IContainer) => any): void {
    this.gravitoContainer.singleton(name, (c: GravitoContainer) => {
      return factory(new GravitoContainerAdapter(c))
    })
  }

  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  bind(name: string, factory: (container: IContainer) => any): void {
    // bind implementation in Gravito creates a new instance each time
    this.gravitoContainer.bind(name, (c: GravitoContainer) => {
      return factory(new GravitoContainerAdapter(c))
    })
  }

  // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
  make(name: string): any {
    return this.gravitoContainer.make(name)
  }
}

/**
 * Factory: wraps a Gravito Container in the framework-agnostic IContainer adapter.
 * Kept as a factory so GravitoContainerAdapter stays private.
 *
 * @param gravitoContainer - The native Gravito container.
 * @returns An implementation of IContainer.
 */
export function adaptGravitoContainer(gravitoContainer: GravitoContainer): IContainer {
  return new GravitoContainerAdapter(gravitoContainer)
}

/**
 * Adapts framework-agnostic ModuleServiceProvider to Gravito's ServiceProvider.
 *
 * This bridge allows modules to be registered with the Gravito framework while
 * remaining decoupled from its specific DI container API.
 */
export class GravitoServiceProviderAdapter extends ServiceProvider {
  constructor(private moduleProvider: ModuleServiceProvider) {
    super()
  }

  /**
   * Registers module services into the Gravito container.
   *
   * @param container - The native Gravito container.
   */
  override register(container: GravitoContainer): void {
    // Adapt Gravito's Container to framework-agnostic IContainer
    const adaptedContainer = new GravitoContainerAdapter(container)

    // Call module's registration method
    this.moduleProvider.register(adaptedContainer)
  }

  /**
   * Boots the module.
   *
   * @param core - The Gravito PlanetCore instance.
   */
  override boot(core: PlanetCore): void {
    // Wrap core.container in our adapter so moduleProvider.boot receives an IContainer
    const adaptedContainer = new GravitoContainerAdapter(core.container)
    this.moduleProvider.boot(adaptedContainer)
  }
}

/**
 * Factory function: creates a Gravito-compatible ServiceProvider from a ModuleServiceProvider.
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
 * Optional interface: modules implement this to self-manage route registration.
 *
 * Kept in the adapter layer to maintain ModuleServiceProvider's framework independence.
 */
export interface IRouteRegistrar {
  /**
   * Registers HTTP routes for the module.
   *
   * @param context - The route registration context (router + container).
   */
  registerRoutes(context: IRouteContext): void | Promise<void>
}

/**
 * Type guard: determines if a provider implements IRouteRegistrar.
 *
 * @param value - The object to check.
 * @returns True if the object implements registerRoutes.
 */
export function isRouteRegistrar(value: unknown): value is IRouteRegistrar {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as IRouteRegistrar).registerRoutes === 'function'
  )
}
