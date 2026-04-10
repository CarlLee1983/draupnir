import { type AuthContext, AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
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
    return {
      ok: false,
      response: new Response(
        '<html><body><h1>403 Forbidden</h1><p>需要管理員權限</p></body></html>',
        { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      ),
    }
  }

  return { ok: true, auth }
}
