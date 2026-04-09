import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { DashboardController } from '../Controllers/DashboardController'
import { requireAuth } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { createModuleAccessMiddleware } from '@/Shared/Infrastructure/Middleware/ModuleAccessMiddleware'

export function registerDashboardRoutes(router: IModuleRouter, controller: DashboardController): void {
	const moduleAuth = [requireAuth(), createModuleAccessMiddleware('dashboard')]
	router.get('/api/organizations/:orgId/dashboard', moduleAuth, (ctx) => controller.summary(ctx))
	router.get('/api/organizations/:orgId/dashboard/usage', moduleAuth, (ctx) => controller.usage(ctx))
}
