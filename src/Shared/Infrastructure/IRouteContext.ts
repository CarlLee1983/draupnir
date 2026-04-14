/**
 * Route registration context - Framework Agnostic.
 *
 * @public - Passed to IRouteRegistrar.registerRoutes so modules can register
 *   HTTP routes without depending on any specific web framework.
 *
 * The framework adapter layer is responsible for assembling this context from
 * its concrete core/app instance (e.g. Gravito PlanetCore) before invoking
 * `registerRoutes`. Modules must only interact with IContainer + IModuleRouter.
 */
import type { IContainer } from './IServiceProvider'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'

export interface IRouteContext {
  /** Framework-agnostic DI container for resolving already-registered services. */
  readonly container: IContainer
  /** Framework-agnostic module router for declaring HTTP endpoints. */
  readonly router: IModuleRouter
}
