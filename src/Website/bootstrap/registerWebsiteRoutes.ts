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
import { registerManagerRoutes } from '@/Website/Manager/routes/registerManagerRoutes'
import { registerMemberRoutes } from '@/Website/Member/routes/registerMemberRoutes'
import { LocaleController } from '@/Shared/Infrastructure/I18n/LocaleController'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'

type WebsiteRouteRegistration = {
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

/** Order matters: auth → admin → manager → member → static assets. */
const WEBSITE_ROUTE_REGISTRATIONS: readonly WebsiteRouteRegistration[] = [
  { register: registerAuthRoutes },
  { register: registerAdminRoutes },
  { register: registerManagerRoutes },
  { register: registerMemberRoutes },
  { register: (r) => registerStaticAssets(r) },
]

/**
 * Mounts all Inertia routes and static frontend assets on the module router.
 *
 * @param router - Framework-agnostic route registrar.
 * @param container - DI container holding page bindings from `WebsiteServiceProvider`.
 */
export function registerWebsiteRoutes(router: IModuleRouter, container: IContainer): void {
  const localeController = new LocaleController()
  router.post('/lang', (ctx) => localeController.switchLocale(ctx))

  for (const { register } of WEBSITE_ROUTE_REGISTRATIONS) {
    register(router, container)
  }
}
