// src/Modules/Auth/Presentation/Middleware/RoleMiddleware.ts

import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { Middleware } from '@/Shared/Presentation/IModuleRouter'
import type { IJwtTokenService } from '../../Application/Ports/IJwtTokenService'
import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'

/** Static instance of the auth middleware parser. */
let jwtParser: AuthMiddleware | null = null

/**
 * Global configuration hook to inject the token repository into the middleware.
 * Should be called during module registration in the Service Provider.
 */
export function configureAuthMiddleware(
  tokenRepository: IAuthTokenRepository,
  jwtService?: IJwtTokenService,
): void {
  jwtParser = new AuthMiddleware(tokenRepository, jwtService)
}

/**
 * Lazily retrieves or creates the singleton JWT parser instance.
 */
function getJwtParser(): AuthMiddleware {
  if (!jwtParser) {
    jwtParser = new AuthMiddleware()
  }
  return jwtParser
}

/**
 * Middleware that attempts to parse the JWT into the context if present.
 * Does not throw errors if missing or invalid, useful for routes with optional auth (like logout).
 */
export function attachJwt(): Middleware {
  return async (ctx, next) => {
    await getJwtParser().handle(ctx)
    return next()
  }
}

/**
 * Middleware that mandates a valid authentication token.
 * Rejects requests with 401 Unauthorized if the token is missing, invalid, or expired.
 */
export function requireAuth(): Middleware {
  return async (ctx, next) => {
    await getJwtParser().handle(ctx)
    if (!AuthMiddleware.isAuthenticated(ctx)) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }
    return next()
  }
}

/**
 * Middleware that mandates a valid token and specific role(s).
 * Rejects requests with 403 Forbidden if the user's role is not included in the allowed list.
 */
export function createRoleMiddleware(...roles: string[]): Middleware {
  return async (ctx, next) => {
    await getJwtParser().handle(ctx)
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }
    if (!roles.includes(auth.role)) {
      return ctx.json(
        { success: false, message: 'Insufficient permissions', error: 'FORBIDDEN' },
        403,
      )
    }
    return next()
  }
}
