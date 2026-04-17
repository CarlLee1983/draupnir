import { type AuthContext, AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import { getInertiaShared } from '@/Website/Http/Inertia/SharedPropsBuilder'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/** Result of {@link requireAdmin}: either proceed with `auth` or return a ready `Response`. */
export interface AdminAuthResult {
  ok: boolean
  auth?: AuthContext
  response?: Response
}

/**
 * Ensures the caller is an authenticated user with role `admin`.
 *
 * @param ctx - Request context (JWT should already be attached by page middleware).
 * @returns `{ ok: true, auth }` on success; otherwise `{ ok: false, response }` where `response` is
 *   a redirect to `/login` (unauthenticated) or 403 HTML (non-admin).
 */
export function requireAdmin(ctx: IHttpContext): AdminAuthResult {
  const auth = AuthMiddleware.getAuthContext(ctx)

  if (!auth) {
    return { ok: false, response: ctx.redirect('/login') }
  }

  if (auth.role !== 'admin') {
    if (auth.role === 'manager') {
      return { ok: false, response: ctx.redirect('/manager/dashboard') }
    }
    return { ok: false, response: ctx.redirect('/member/dashboard') }
  }

  return { ok: true, auth }
}
