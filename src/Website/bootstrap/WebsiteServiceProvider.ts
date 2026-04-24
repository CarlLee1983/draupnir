import type { RefreshTokenService } from '@/Modules/Auth/Application/Services/RefreshTokenService'
import type { IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import { configureTokenRefresh } from '@/Website/Http/Middleware/TokenRefreshMiddleware'
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
  protected override registerInfraServices(container: IContainer): void {
    registerWebsiteBindings(container)
  }

  registerRoutes(context: IRouteContext): void {
    registerWebsiteRoutes(context.router, context.container)
  }

  override boot(container: IContainer): void {
    configureTokenRefresh(container.make('refreshTokenService') as RefreshTokenService)
  }
}
