import { type AuthContext, AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/** Result of {@link requireMember}: either proceed with `auth` or return a ready `Response`. */
export interface MemberAuthResult {
  ok: boolean
  auth?: AuthContext
  response?: Response
}

/**
 * Ensures the caller is an authenticated user (any role).
 *
 * @param ctx - Request context (JWT should already be attached by page middleware).
 * @returns `{ ok: true, auth }` on success; otherwise `{ ok: false, response }` where `response` is
 *   a redirect to `/login` (unauthenticated).
 */
export function requireMember(ctx: IHttpContext): MemberAuthResult {
  const auth = AuthMiddleware.getAuthContext(ctx)

  if (!auth) {
    return { ok: false, response: ctx.redirect('/login') }
  }

  return { ok: true, auth }
}
