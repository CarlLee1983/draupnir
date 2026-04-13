import {
  requireOrganizationContext,
  requireOrganizationManager,
} from '@/Modules/Organization/Presentation/Middleware/OrganizationMiddleware'
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { AlertController } from '../Controllers/AlertController'
import type { AlertHistoryController } from '../Controllers/AlertHistoryController'
import type { WebhookEndpointController } from '../Controllers/WebhookEndpointController'
import { RegisterWebhookEndpointRequest } from '../Requests/RegisterWebhookEndpointRequest'
import { SetBudgetRequest } from '../Requests/SetBudgetRequest'
import { UpdateWebhookEndpointRequest } from '../Requests/UpdateWebhookEndpointRequest'

export function registerAlertRoutes(
  router: IModuleRouter,
  controller: AlertController,
  webhookController: WebhookEndpointController,
  historyController: AlertHistoryController,
): void {
  const orgAccess = [requireOrganizationContext()]
  const managerAccess = [requireOrganizationManager()]

  router.put('/api/organizations/:orgId/alerts/budget', managerAccess, SetBudgetRequest, (ctx) =>
    controller.setBudget(ctx),
  )

  router.get('/api/organizations/:orgId/alerts/budget', orgAccess, (ctx) =>
    controller.getBudget(ctx),
  )

  router.get('/api/organizations/:orgId/alerts/webhooks', managerAccess, (ctx) =>
    webhookController.list(ctx),
  )

  router.post(
    '/api/organizations/:orgId/alerts/webhooks',
    managerAccess,
    RegisterWebhookEndpointRequest,
    (ctx) => webhookController.create(ctx),
  )

  router.patch(
    '/api/organizations/:orgId/alerts/webhooks/:endpointId',
    managerAccess,
    UpdateWebhookEndpointRequest,
    (ctx) => webhookController.update(ctx),
  )

  router.post(
    '/api/organizations/:orgId/alerts/webhooks/:endpointId/rotate-secret',
    managerAccess,
    (ctx) => webhookController.rotateSecret(ctx),
  )

  router.post('/api/organizations/:orgId/alerts/webhooks/:endpointId/test', managerAccess, (ctx) =>
    webhookController.test(ctx),
  )

  router.delete('/api/organizations/:orgId/alerts/webhooks/:endpointId', managerAccess, (ctx) =>
    webhookController.delete(ctx),
  )

  router.get('/api/organizations/:orgId/alerts/history', managerAccess, (ctx) =>
    historyController.list(ctx),
  )

  router.post(
    '/api/organizations/:orgId/alerts/deliveries/:deliveryId/resend',
    managerAccess,
    (ctx) => historyController.resend(ctx),
  )
}
