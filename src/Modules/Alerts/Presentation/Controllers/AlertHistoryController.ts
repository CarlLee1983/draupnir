import type { CurrentOrganizationContext } from '@/Modules/Organization/Presentation/Middleware/OrganizationMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { toDeliveryDTO, toHistoryDTO } from '../../Application/DTOs/AlertHistoryDTO'
import { WebhookEndpointGoneError } from '../../Application/Errors/WebhookEndpointGoneError'
import type { GetAlertHistoryService } from '../../Application/Services/GetAlertHistoryService'
import type { ResendDeliveryService } from '../../Application/Services/ResendDeliveryService'

type AlertHistoryControllerDeps = {
  getAlertHistoryService: GetAlertHistoryService
  resendDeliveryService: ResendDeliveryService
}

function resolveOrgId(ctx: IHttpContext): string | null {
  const currentOrg = ctx.get<CurrentOrganizationContext>('currentOrg')
  return currentOrg?.organizationId ?? ctx.getParam('orgId') ?? null
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

export class AlertHistoryController {
  constructor(private readonly deps: AlertHistoryControllerDeps) {}

  async list(ctx: IHttpContext): Promise<Response> {
    const orgId = resolveOrgId(ctx)
    if (!orgId) {
      return ctx.json({ success: false, message: 'Missing organization ID', data: [] }, 400)
    }

    const limit = Number.parseInt(ctx.getQuery('limit') ?? '50', 10)
    const offset = Number.parseInt(ctx.getQuery('offset') ?? '0', 10)
    const history = await this.deps.getAlertHistoryService.list(orgId, {
      limit: Number.isNaN(limit) ? 50 : limit,
      offset: Number.isNaN(offset) ? 0 : offset,
    })

    return ctx.json(
      {
        success: true,
        data: history.map(({ event, deliveries }) => toHistoryDTO(event, deliveries)),
      },
      200,
    )
  }

  async resend(ctx: IHttpContext): Promise<Response> {
    const orgId = resolveOrgId(ctx)
    const deliveryId = ctx.getParam('deliveryId')
    if (!orgId) {
      return ctx.json({ success: false, message: 'Missing organization ID' }, 400)
    }
    if (!deliveryId) {
      return ctx.json({ success: false, message: 'Missing delivery ID' }, 400)
    }

    try {
      const delivery = await this.deps.resendDeliveryService.resend(orgId, deliveryId)
      return ctx.json({ success: true, data: toDeliveryDTO(delivery) }, 200)
    } catch (error) {
      if (error instanceof WebhookEndpointGoneError) {
        return ctx.json({ success: false, message: error.message }, 410)
      }
      return ctx.json({ success: false, message: toErrorMessage(error) }, 422)
    }
  }
}
