import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import { requireOrganizationContext } from '@/Modules/Organization/Presentation/Middleware/OrganizationMiddleware'
import type { AlertController } from '../Controllers/AlertController'
import { SetBudgetRequest } from '../Requests/SetBudgetRequest'

export function registerAlertRoutes(router: IModuleRouter, controller: AlertController): void {
  const orgAccess = [requireOrganizationContext()]

  router.put(
    '/api/organizations/:orgId/alerts/budget',
    orgAccess,
    SetBudgetRequest,
    (ctx) => controller.setBudget(ctx),
  )

  router.get('/api/organizations/:orgId/alerts/budget', orgAccess, (ctx) =>
    controller.getBudget(ctx),
  )
}
