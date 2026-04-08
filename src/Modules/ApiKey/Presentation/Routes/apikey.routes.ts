import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { ApiKeyController } from '../Controllers/ApiKeyController'
import { requireAuth } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'

export function registerApiKeyRoutes(router: IModuleRouter, controller: ApiKeyController): void {
	router.post('/api/organizations/:orgId/keys', [requireAuth()], (ctx) => controller.create(ctx))
	router.get('/api/organizations/:orgId/keys', [requireAuth()], (ctx) => controller.list(ctx))
	router.post('/api/keys/:keyId/revoke', [requireAuth()], (ctx) => controller.revoke(ctx))
	router.patch('/api/keys/:keyId/label', [requireAuth()], (ctx) => controller.updateLabel(ctx))
	router.put('/api/keys/:keyId/permissions', [requireAuth()], (ctx) => controller.setPermissions(ctx))
}
