import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { DashboardController } from '../Controllers/DashboardController'
import { requireAuth } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { createModuleAccessMiddleware } from '@/Shared/Infrastructure/Middleware/ModuleAccessMiddleware'

export function registerDashboardRoutes(
  router: IModuleRouter,
  controller: DashboardController,
): void {
  const moduleAuth = [requireAuth(), createModuleAccessMiddleware('dashboard')]
  router.get('/api/organizations/:orgId/dashboard', moduleAuth, (ctx) => controller.summary(ctx))
  router.get('/api/organizations/:orgId/dashboard/usage', moduleAuth, (ctx) =>
    controller.usage(ctx),
  )
  router.get('/api/organizations/:orgId/dashboard/kpi-summary', moduleAuth, (ctx) =>
    controller.kpiSummary(ctx),
  )
  router.get('/api/organizations/:orgId/dashboard/cost-trends', moduleAuth, (ctx) =>
    controller.costTrends(ctx),
  )
  router.get('/api/organizations/:orgId/dashboard/model-comparison', moduleAuth, (ctx) =>
    controller.modelComparison(ctx),
  )
  router.get('/api/organizations/:orgId/dashboard/per-key-cost', moduleAuth, (ctx) =>
    controller.perKeyCost(ctx),
  )
}
