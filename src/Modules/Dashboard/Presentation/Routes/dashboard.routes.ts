import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { DashboardController } from '../Controllers/DashboardController'
import { requireAuth } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'

export function registerDashboardRoutes(router: IModuleRouter, controller: DashboardController): void {
	router.get('/api/organizations/:orgId/dashboard', [requireAuth()], (ctx) => controller.summary(ctx))
	router.get('/api/organizations/:orgId/dashboard/usage', [requireAuth()], (ctx) => controller.usage(ctx))
}
