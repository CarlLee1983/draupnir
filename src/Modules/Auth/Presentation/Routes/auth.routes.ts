import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { AuthController } from '../Controllers/AuthController'
import { attachJwt } from '../Middleware/RoleMiddleware'
import { LoginRequest, RegisterRequest, RefreshTokenRequest } from '../Requests'

export async function registerAuthRoutes(router: IModuleRouter, controller: AuthController): Promise<void> {
  router.post('/api/auth/register', RegisterRequest, (ctx) => controller.register(ctx))
  router.post('/api/auth/login', LoginRequest, (ctx) => controller.login(ctx))
  router.post('/api/auth/refresh', RefreshTokenRequest, (ctx) => controller.refresh(ctx))
  router.post('/api/auth/logout', [attachJwt()], (ctx) => controller.logout(ctx))
}
