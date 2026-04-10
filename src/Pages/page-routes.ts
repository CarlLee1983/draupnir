/**
 * Inertia page route registration for the HTTP server.
 *
 * Composes admin/member declarative routes (DI-resolved page handlers) and optional Vite build static
 * assets under `/build/*`. Expects `PagesServiceProvider` to have registered page bindings on `core.container`.
 */
import type { PlanetCore } from '@gravito/core'

import { createGravitoModuleRouter } from '@/Shared/Infrastructure/Framework/GravitoModuleRouter'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'

import { registerAdminPageRoutes } from './routing/registerAdminPageRoutes'
import { registerMemberPageRoutes } from './routing/registerMemberPageRoutes'
import { registerPageStaticRoutes } from './routing/registerPageStaticRoutes'

/**
 * Mounts all Inertia routes and static frontend assets on the Gravito router.
 *
 * @param core - Bootstrapped application core (router + container).
 */
export function registerPageRoutes(core: PlanetCore): void {
  const router = createGravitoModuleRouter(core)
  const container = core.container as IContainer
  registerAdminPageRoutes(router, container)
  registerMemberPageRoutes(router, container)
  registerPageStaticRoutes(router)
}
