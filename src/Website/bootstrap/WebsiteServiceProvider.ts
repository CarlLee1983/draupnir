import type { PlanetCore } from '@gravito/core'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import { registerWebsiteBindings } from './registerWebsiteBindings'
import { registerWebsiteRoutes } from './registerWebsiteRoutes'

export { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'

/**
 * WebsiteServiceProvider
 *
 * Gravito framework adapter for the Website module.
 * Delegates all DI registration to `registerWebsiteBindings` (pure function, independently testable).
 * Route registration happens later in `registerWebsiteRoutes`.
 */
export class WebsiteServiceProvider extends ModuleServiceProvider implements IRouteRegistrar {
  override register(container: IContainer): void {
    registerWebsiteBindings(container)
  }

  registerRoutes(core: PlanetCore): void {
    const router = createGravitoModuleRouter(core)
    registerWebsiteRoutes(router, core.container as IContainer)
  }

  override boot(_context: unknown): void {}
}
