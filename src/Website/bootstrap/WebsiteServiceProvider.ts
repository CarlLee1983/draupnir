import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { registerWebsiteBindings } from './registerWebsiteBindings'

export { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'

/**
 * WebsiteServiceProvider
 *
 * Gravito framework adapter for the Website module.
 * Delegates all DI registration to `registerWebsiteBindings` (pure function, independently testable).
 * Route registration happens later in `registerWebsiteRoutes`.
 */
export class WebsiteServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
    registerWebsiteBindings(container)
  }

  override boot(_context: unknown): void {}
}
