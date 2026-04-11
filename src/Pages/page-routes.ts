/**
 * Inertia page route registration for the HTTP server.
 *
 * Composes admin/member declarative routes (DI-resolved page handlers) and optional Vite build static
 * assets under `/build/*`. Expects `PagesServiceProvider` to have registered page bindings on `container`.
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'

import { registerAdminPageRoutes } from './routing/registerAdminPageRoutes'
import { registerAuthPageRoutes } from './routing/registerAuthPageRoutes'
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
  try {
    registerAuthPageRoutes(router, container)
    console.log('✅ Auth Inertia page routes registered')
  } catch (error) {
    console.error('❌ Failed to register auth page routes:', error)
    throw error
  }

  try {
    registerAdminPageRoutes(router, container)
    console.log('✅ Admin Inertia page routes registered')
  } catch (error) {
    console.error('❌ Failed to register admin page routes:', error)
    throw error
  }

  try {
    registerMemberPageRoutes(router, container)
    console.log('✅ Member Inertia page routes registered')
  } catch (error) {
    console.error('❌ Failed to register member page routes:', error)
    throw error
  }

  try {
    registerPageStaticRoutes(router)
    console.log('✅ Static page assets routes registered')
  } catch (error) {
    console.error('❌ Failed to register static page routes:', error)
    throw error
  }
}
