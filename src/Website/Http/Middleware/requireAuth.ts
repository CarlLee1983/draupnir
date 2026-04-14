import { type AuthContext, AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/** Result of {@link requireAuth}: either proceed with `auth` or return a ready `Response`. */
export interface AuthResult {
  ok: boolean
  auth?: AuthContext
  response?: Response
}

/**
 * Cross-slice HTTP guard: ensures the caller is authenticated (any role).
 *
 * Use this in presentation handlers that require a logged-in user but have no
 * slice-specific role requirement. For role-specific guards, use the slice's own
 * middleware (e.g. `requireAdmin`, `requireMember`).
 *
 * @param ctx - Request context (JWT should already be attached by `withInertiaPageHandler`).
 * @returns `{ ok: true, auth }` on success; `{ ok: false, response }` with a `/login` redirect
 *   when no authenticated user is found.
 */
export function requireAuth(ctx: IHttpContext): AuthResult {
  const auth = AuthMiddleware.getAuthContext(ctx)

  if (!auth) {
    return { ok: false, response: ctx.redirect('/login') }
  }

  return { ok: true, auth }
}
