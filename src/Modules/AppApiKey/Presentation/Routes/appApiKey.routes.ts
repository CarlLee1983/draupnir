import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { AppApiKeyController } from '../Controllers/AppApiKeyController'
import { requireAuth } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { createModuleAccessMiddleware } from '@/Shared/Infrastructure/Middleware/ModuleAccessMiddleware'

export function registerAppApiKeyRoutes(
  router: IModuleRouter,
  controller: AppApiKeyController,
): void {
  const appKeysAccess = [requireAuth(), createModuleAccessMiddleware('app_api_keys')]

  router.post('/api/organizations/:orgId/app-keys', appKeysAccess, (ctx) => controller.issue(ctx))
  router.get('/api/organizations/:orgId/app-keys', appKeysAccess, (ctx) => controller.list(ctx))

  router.post('/api/app-keys/:keyId/rotate', [requireAuth()], (ctx) => controller.rotate(ctx))
  router.post('/api/app-keys/:keyId/revoke', [requireAuth()], (ctx) => controller.revoke(ctx))
  router.put('/api/app-keys/:keyId/scope', [requireAuth()], (ctx) => controller.setScope(ctx))
  router.get('/api/app-keys/:keyId/usage', [requireAuth()], (ctx) => controller.getUsage(ctx))
}
