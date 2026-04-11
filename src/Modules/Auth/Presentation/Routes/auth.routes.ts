import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { AuthController } from '../Controllers/AuthController'
import { attachJwt } from '../Middleware/RoleMiddleware'
import { LoginRequest, RefreshTokenRequest, RegisterRequest } from '../Requests'
import { registerOAuthRoutes } from './oauth.routes'

/**
 * Registers authentication-related routes with the module router.
 */
export async function registerAuthRoutes(
  router: IModuleRouter,
  controller: AuthController,
): Promise<void> {
  registerOAuthRoutes(router)

  /** POST /api/auth/register - Register a new user */
  router.post('/api/auth/register', RegisterRequest, (ctx) => controller.register(ctx))

  /** POST /api/auth/login - User sign-in */
  router.post('/api/auth/login', LoginRequest, (ctx) => controller.login(ctx))

  /** POST /api/auth/refresh - Exchange refresh token for access token */
  router.post('/api/auth/refresh', RefreshTokenRequest, (ctx) => controller.refresh(ctx))

  /** POST /api/auth/logout - Sign out and revoke token */
  router.post('/api/auth/logout', [attachJwt()], (ctx) => controller.logout(ctx))
}
