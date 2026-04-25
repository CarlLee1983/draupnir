/**
 * TokenRefreshMiddleware
 *
 * Web middleware: when the access JWT is missing or not yet accepted as an authenticated session,
 * attempts a **refresh_token** cookie exchange via {@link RefreshTokenService}, then sets a new
 * **auth_token** cookie and injects `auth` / `user` on the request context so downstream guards
 * (`requireMember`, `requireAdmin`, etc.) succeed without re-running the full JWT attach path.
 *
 * Responsibilities:
 * - Skip immediately if `AuthMiddleware.isAuthenticated(ctx)` is already true
 * - Call `RefreshTokenService.execute` when a refresh cookie is present and the service was configured
 * - On success: set short-lived `auth_token`, verify JWT payload, populate `ctx` auth state
 *
 * Implementation note: `configureTokenRefresh` is invoked from `WebsiteServiceProvider.boot` after
 * the container can resolve `refreshTokenService`. Middleware order: this factory must run **after**
 * `attachJwt()` and **before** role-specific `require*` middleware (see `HttpKernel` `webBase()`).
 *
 * Further reading (decision tree, cookies vs API refresh): `docs/draupnir/architecture/http-middleware-stack.md`
 * (section: web access token silent refresh / `TokenRefreshMiddleware`).
 */

import type { IJwtTokenService } from '@/Modules/Auth/Application/Ports/IJwtTokenService'
import type { RefreshTokenService } from '@/Modules/Auth/Application/Services/RefreshTokenService'
import { sha256 } from '@/Modules/Auth/Application/Utils/sha256'
import { JwtTokenService } from '@/Modules/Auth/Infrastructure/Services/JwtTokenService'
import { isSecureRequest } from '@/Shared/Infrastructure/Http/isSecureRequest'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'

/**
 * Context key where the SHA-256 hash of the freshly-issued access token is stored
 * after a silent refresh. Handlers that need to identify the current session
 * (e.g. settings pages) should read this before falling back to the incoming request cookie.
 */
export const REFRESHED_AUTH_TOKEN_HASH_KEY = 'refreshedAuthTokenHash'

let refreshService: RefreshTokenService | null = null
let jwtService: IJwtTokenService = new JwtTokenService()

/**
 * Injects the application {@link RefreshTokenService} used by {@link createTokenRefreshMiddleware}.
 *
 * Call once at application boot (e.g. `WebsiteServiceProvider.boot`) after the container can
 * `make('refreshTokenService')`. If never called, the middleware no-ops when refresh would be needed.
 *
 * @param service - Bound `RefreshTokenService` instance from the DI container.
 * @param jwt - Optional clock-aware `IJwtTokenService` instance. When provided, replaces the default
 *   `JwtTokenService()` used internally to verify silently-refreshed access tokens. Acceptance tests
 *   pass the container-bound instance so verification respects the injected `TestClock`.
 */
export function configureTokenRefresh(service: RefreshTokenService, jwt?: IJwtTokenService): void {
  refreshService = service
  if (jwt) {
    jwtService = jwt
  }
}

/**
 * Builds middleware that silently refreshes the session access token from the refresh cookie.
 *
 * @returns Middleware compatible with `HttpKernel` / `withInertiaPage` composition.
 */
export function createTokenRefreshMiddleware(): Middleware {
  return async (ctx, next) => {
    if (AuthMiddleware.isAuthenticated(ctx)) return next()

    if (!refreshService) return next()

    const refreshToken = ctx.getCookie('refresh_token')
    if (!refreshToken) return next()

    const result = await refreshService.execute({ refreshToken })
    if (!result.success || !result.data) return next()

    const newAccessToken = result.data.accessToken

    ctx.setCookie('auth_token', newAccessToken, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 900,
      secure: isSecureRequest(ctx),
    })

    ctx.set(REFRESHED_AUTH_TOKEN_HASH_KEY, await sha256(newAccessToken))

    const payload = jwtService.verify(newAccessToken)
    if (payload) {
      ctx.set('auth', {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions,
        tokenType: payload.type,
      })
      ctx.set('user', { id: payload.userId, email: payload.email, role: payload.role })
    }

    return next()
  }
}
