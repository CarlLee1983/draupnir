import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/** Result of {@link requireGuest}: either proceed or return a ready `Response`. */
export interface GuestResult {
  ok: boolean
  response?: Response
}

/**
 * Cross-slice HTTP guard: ensures the caller is NOT authenticated (guest only).
 *
 * Use this in presentation handlers that must be inaccessible to logged-in users
 * (e.g. login, register, forgot-password pages). Authenticated users are redirected
 * to `/dashboard`.
 *
 * @param ctx - Request context.
 * @returns `{ ok: true }` when no authenticated session is found; `{ ok: false, response }` with
 *   a `/dashboard` redirect when a valid session exists.
 */
export function requireGuest(ctx: IHttpContext): GuestResult {
  const auth = AuthMiddleware.getAuthContext(ctx)

  if (auth) {
    return { ok: false, response: ctx.redirect('/dashboard') }
  }

  return { ok: true }
}
