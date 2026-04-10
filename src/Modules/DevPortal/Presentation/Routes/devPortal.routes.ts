import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { DevPortalController } from '../Controllers/DevPortalController'
import { requireAuth } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'

export function registerDevPortalRoutes(
  router: IModuleRouter,
  controller: DevPortalController,
): void {
  const auth = [requireAuth()]

  router.post('/api/dev-portal/apps', auth, (ctx) => controller.registerApp(ctx))
  router.get('/api/dev-portal/apps', auth, (ctx) => controller.listApps(ctx))

  router.post('/api/dev-portal/apps/:appId/keys', auth, (ctx) => controller.issueKey(ctx))
  router.get('/api/dev-portal/apps/:appId/keys', auth, (ctx) => controller.listKeys(ctx))
  router.post('/api/dev-portal/apps/:appId/keys/:keyId/revoke', auth, (ctx) =>
    controller.revokeKey(ctx),
  )

  router.put('/api/dev-portal/apps/:appId/webhook', auth, (ctx) => controller.configureWebhook(ctx))

  router.get('/api/dev-portal/docs', (ctx) => controller.getApiDocs(ctx))
}
