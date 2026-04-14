import { attachJwt } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { applyPendingCookies } from '@/Shared/Presentation/cookieUtils'
import type { IHttpContext, PendingCookie } from '@/Shared/Presentation/IHttpContext'
import type { RouteHandler } from '@/Shared/Presentation/IModuleRouter'

import { injectSharedData } from '../SharedDataMiddleware'
import { attachWebCsrf } from './webCsrfMiddleware'

/**
 * Wraps an Inertia page handler with JWT attachment and shared Inertia props.
 *
 * Matches the module route pattern (`registerXxxRoutes(router, controller)`) but for functional handlers.
 *
 * @param handler - Inner handler after auth, CSRF, and `inertia:shared` are populated.
 * @returns A `RouteHandler` safe to pass to `IModuleRouter.get` / `post` / `put`.
 */
export function withInertiaPageHandler(
  handler: (ctx: IHttpContext) => Promise<Response>,
): RouteHandler {
  const jwtMw = attachJwt()
  const csrfMw = attachWebCsrf()
  return (ctx) =>
    jwtMw(ctx, async () =>
      csrfMw(ctx, async () => {
        injectSharedData(ctx)
        const response = await handler(ctx)
        const pending = ctx.get<PendingCookie[]>('__pending_cookies__') ?? []
        return applyPendingCookies(response, pending)
      }),
    )
}
