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

type PageRouteRegistration = {
  label: string
  register: (router: IModuleRouter, container: IContainer) => void
}

/** Order matters: auth → admin → member → static assets. */
const PAGE_ROUTE_REGISTRATIONS: readonly PageRouteRegistration[] = [
  { label: 'Auth Inertia page', register: registerAuthPageRoutes },
  { label: 'Admin Inertia page', register: registerAdminPageRoutes },
  { label: 'Member Inertia page', register: registerMemberPageRoutes },
  {
    label: 'Static page assets',
    register: (r) => {
      registerPageStaticRoutes(r)
    },
  },
]

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
  let currentLabel = ''
  try {
    for (const { label, register } of PAGE_ROUTE_REGISTRATIONS) {
      currentLabel = label
      register(router, container)
      console.log(`✅ ${label} routes registered`)
    }
  } catch (error) {
    console.error(`❌ Failed to register ${currentLabel} routes:`, error)
    throw error
  }
}
