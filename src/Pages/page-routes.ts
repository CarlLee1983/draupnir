/**
 * Inertia page route registration for the HTTP server.
 *
 * Composes admin/member declarative routes (DI-resolved page handlers) and optional Vite build static
 * assets under `/build/*`. Expects `PagesServiceProvider` to have registered page bindings on `container`.
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'

import { registerAdminPageRoutes } from './routing/registerAdminPageRoutes'
import { registerMemberPageRoutes } from './routing/registerMemberPageRoutes'
import { registerPageStaticRoutes } from './routing/registerPageStaticRoutes'

/**
 * Mounts all Inertia routes and static frontend assets on the module router.
 *
 * The host wires `IModuleRouter` (e.g. via `createGravitoModuleRouter`) so this module stays free of
 * framework core types.
 *
 * @param router - Framework-agnostic route registrar (typically Gravito-backed).
 * @param container - DI container holding page bindings from `PagesServiceProvider`.
 */
export function registerPageRoutes(router: IModuleRouter, container: IContainer): void {
  registerAdminPageRoutes(router, container)
  registerMemberPageRoutes(router, container)
  registerPageStaticRoutes(router)
}
