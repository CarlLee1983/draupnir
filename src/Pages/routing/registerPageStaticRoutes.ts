/**
 * Registers production static file serving for Vite output under `/build/*`.
 *
 * No-ops in development unless `SERVE_VITE_BUILD` forces built assets; uses path normalization to block
 * directory traversal outside `public/`.
 */
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'

import { useBuiltFrontendAssets } from './inertiaFactory'
import { joinPath, normalizePath } from './pathUtils'

function safeDecodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

/**
 * @param router - HTTP router; only `get` is required.
 */
export function registerPageStaticRoutes(router: Pick<IModuleRouter, 'get'>): void {
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
