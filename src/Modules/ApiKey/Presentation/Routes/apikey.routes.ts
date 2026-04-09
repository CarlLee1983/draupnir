import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { ApiKeyController } from '../Controllers/ApiKeyController'
import { requireAuth } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { createModuleAccessMiddleware } from '@/Shared/Infrastructure/Middleware/ModuleAccessMiddleware'

export function registerApiKeyRoutes(router: IModuleRouter, controller: ApiKeyController): void {
	const keysAccess = [requireAuth(), createModuleAccessMiddleware('api_keys')]
	router.post('/api/organizations/:orgId/keys', keysAccess, (ctx) => controller.create(ctx))
	router.get('/api/organizations/:orgId/keys', keysAccess, (ctx) => controller.list(ctx))
	router.post('/api/keys/:keyId/revoke', [requireAuth()], (ctx) => controller.revoke(ctx))
	router.patch('/api/keys/:keyId/label', [requireAuth()], (ctx) => controller.updateLabel(ctx))
	router.put('/api/keys/:keyId/permissions', [requireAuth()], (ctx) => controller.setPermissions(ctx))
}
