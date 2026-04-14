import { attachJwt } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { applyPendingCookies } from '@/Shared/Presentation/cookieUtils'
import type { IHttpContext, PendingCookie } from '@/Shared/Presentation/IHttpContext'
import type { RouteHandler } from '@/Shared/Presentation/IModuleRouter'
import { requireAdmin } from '@/Website/Admin/middleware/requireAdmin'
import { requireMember } from '@/Website/Member/middleware/requireMember'

import { attachWebCsrf } from '../Security/CsrfMiddleware'
import { injectSharedData } from './SharedPropsBuilder'

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

/**
 * Variant of {@link withInertiaPageHandler} for admin-only pages.
 *
 * Runs the admin role check (after JWT + CSRF + shared props) so individual
 * admin page handlers do not need to call `requireAdmin(ctx)` themselves.
 *
 * @param handler - Inner admin page handler.
 * @returns A `RouteHandler` that enforces admin access before invoking the handler.
 */
export function withAdminInertiaPageHandler(
  handler: (ctx: IHttpContext) => Promise<Response>,
): RouteHandler {
  const jwtMw = attachJwt()
  const csrfMw = attachWebCsrf()
  return (ctx) =>
    jwtMw(ctx, async () =>
      csrfMw(ctx, async () => {
        injectSharedData(ctx)
        const check = requireAdmin(ctx)
        if (!check.ok) return check.response!
        const response = await handler(ctx)
        const pending = ctx.get<PendingCookie[]>('__pending_cookies__') ?? []
        return applyPendingCookies(response, pending)
      }),
    )
}

/**
 * Variant of {@link withInertiaPageHandler} for member-only pages.
 *
 * Redirects unauthenticated users to `/login` so individual member page
 * handlers do not need to call `requireMember(ctx)` themselves.
 *
 * @param handler - Inner member page handler.
 * @returns A `RouteHandler` that enforces authentication before invoking the handler.
 */
export function withMemberInertiaPageHandler(
  handler: (ctx: IHttpContext) => Promise<Response>,
): RouteHandler {
  const jwtMw = attachJwt()
  const csrfMw = attachWebCsrf()
  return (ctx) =>
    jwtMw(ctx, async () =>
      csrfMw(ctx, async () => {
        injectSharedData(ctx)
        const check = requireMember(ctx)
        if (!check.ok) return check.response!
        const response = await handler(ctx)
        const pending = ctx.get<PendingCookie[]>('__pending_cookies__') ?? []
        return applyPendingCookies(response, pending)
      }),
    )
}
