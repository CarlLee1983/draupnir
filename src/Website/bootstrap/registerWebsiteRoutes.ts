/**
 * Website route registration: composes Admin / Auth / Member declarative routes
 * and optional Vite build static assets under `/build/*`.
 *
 * Expects `WebsiteServiceProvider` to have registered page bindings on `container`.
 */
import { registerAdminRoutes } from '@/Website/Admin/routes/registerAdminRoutes'
import { registerAuthRoutes } from '@/Website/Auth/routes/registerAuthRoutes'
import { useBuiltFrontendAssets } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import { joinPath, normalizePath } from '@/Website/Http/Routing/routePath'
import { registerMemberRoutes } from '@/Website/Member/routes/registerMemberRoutes'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'

type WebsiteRouteRegistration = {
  label: string
  register: (router: IModuleRouter, container: IContainer) => void
}

function safeDecodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

function registerStaticAssets(router: Pick<IModuleRouter, 'get'>): void {
  if (!useBuiltFrontendAssets()) {
    return
  }

  const staticDir = joinPath(process.cwd(), 'public')

  router.get(
    '/build/*',
    async (ctx: IHttpContext) => {
      const pathname = safeDecodePathname(ctx.getPathname())
      if (!pathname.startsWith('/build/')) {
        return new Response('Not Found', { status: 404 })
      }
      const relative = pathname.replace(/^\/+/, '')
      const filePath = joinPath(staticDir, relative)
      const normalizedStatic = normalizePath(staticDir)
      const normalizedFilePath = normalizePath(filePath)
      if (!normalizedFilePath.startsWith(normalizedStatic)) {
        return new Response('Forbidden', { status: 403 })
      }
      try {
        const file = Bun.file(filePath)
        if (await file.exists()) {
          return new Response(file)
        }
      } catch {
        /* ignore */
      }
      return new Response('Not Found', { status: 404 })
    },
    { name: 'assets.vite.build' },
  )
}

/** Order matters: auth → admin → member → static assets. */
const WEBSITE_ROUTE_REGISTRATIONS: readonly WebsiteRouteRegistration[] = [
  { label: 'Auth Inertia page', register: registerAuthRoutes },
  { label: 'Admin Inertia page', register: registerAdminRoutes },
  { label: 'Member Inertia page', register: registerMemberRoutes },
  {
    label: 'Static page assets',
    register: (r) => {
      registerStaticAssets(r)
    },
  },
]

/**
 * Mounts all Inertia routes and static frontend assets on the module router.
 *
 * @param router - Framework-agnostic route registrar.
 * @param container - DI container holding page bindings from `WebsiteServiceProvider`.
 */
export function registerWebsiteRoutes(router: IModuleRouter, container: IContainer): void {
  let currentLabel = ''
  try {
    for (const { label, register } of WEBSITE_ROUTE_REGISTRATIONS) {
      currentLabel = label
      register(router, container)
      console.log(`✅ ${label} routes registered`)
    }
  } catch (error) {
    console.error(`❌ Failed to register ${currentLabel} routes:`, error)
    throw error
  }
}
