import type { IWebhookDispatcher } from '@/Foundation/Infrastructure/Ports/IWebhookDispatcher'
import { WebhookSecret } from '@/Foundation/Infrastructure/Services/Webhook/WebhookSecret'
import type { IMailer } from '@/Foundation/Infrastructure/Ports/IMailer'
import { criticalAlertTemplate, warningAlertTemplate } from '../../Infrastructure/Services/AlertEmailTemplates'
import type { IAlertDeliveryRepository } from '../../Domain/Repositories/IAlertDeliveryRepository'
import type { IWebhookEndpointRepository } from '../../Domain/Repositories/IWebhookEndpointRepository'
import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'
import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
import { AlertDelivery } from '../../Domain/Entities/AlertDelivery'
import { WebhookEndpointGoneError } from '../Errors/WebhookEndpointGoneError'

function buildWebhookPayload(event: {
  orgId: string
  tier: 'warning' | 'critical'
  budgetUsd: string
  actualCostUsd: string
  percentage: string
  month: string
  id: string
}, orgName: string): Record<string, unknown> {
  return {
    orgId: event.orgId,
    orgName,
    tier: event.tier,
    budgetUsd: event.budgetUsd,
    actualCostUsd: event.actualCostUsd,
    percentage: event.percentage,
    month: event.month,
    alertEventId: event.id,
  }
}

export class ResendDeliveryService {
  constructor(
    private readonly deps: {
      deliveryRepo: IAlertDeliveryRepository
      eventRepo: IAlertEventRepository
      endpointRepo: IWebhookEndpointRepository
      dispatcher: IWebhookDispatcher
      mailer: IMailer
      orgRepo: IOrganizationRepository
    },
  ) {}

  async resend(orgId: string, deliveryId: string): Promise<AlertDelivery> {
    const delivery = await this.deps.deliveryRepo.findById(deliveryId)
    if (!delivery) {
      throw new Error('Delivery not found')
    }

    if (delivery.status !== 'failed') {
      throw new Error('Only failed deliveries can be resent')
    }

    const event = await this.deps.eventRepo.findById(delivery.alertEventId)
    if (!event) {
      throw new Error('Alert event not found')
    }

    if (event.orgId !== orgId) {
      throw new Error('Delivery not found')
    }

    if (delivery.channel === 'webhook') {
      const endpoint = await this.deps.endpointRepo.findById(delivery.target)
      if (!endpoint) {
        throw new WebhookEndpointGoneError('Webhook endpoint no longer exists')
      }

      const dispatchedAt = new Date().toISOString()
      const base = AlertDelivery.create({
        alertEventId: event.id,
        channel: 'webhook',
        target: endpoint.id,
        targetUrl: endpoint.url,
        dispatchedAt,
        orgId: event.orgId,
        month: event.month,
        tier: event.tier,
      })

      try {
        const org = await this.deps.orgRepo.findById(event.orgId)
        const orgName = org?.name ?? 'Unknown'
        const result = await this.deps.dispatcher.dispatch({
          url: endpoint.url,
          secret: WebhookSecret.fromExisting(endpoint.secret),
          eventType: 'alert.threshold.breached',
          payload: buildWebhookPayload(event, orgName),
        })

        const deliveredAt = new Date().toISOString()
        const nextEndpoint = result.success
          ? endpoint.recordSuccess(deliveredAt)
          : endpoint.recordFailure(deliveredAt)
        await this.deps.endpointRepo.save(nextEndpoint)

        const finalDelivery = result.success
          ? base.markSent(result.statusCode ?? null, deliveredAt, result.attempts)
          : base.markFailed(result.statusCode ?? null, result.error ?? 'Unknown webhook error', result.attempts)
        await this.deps.deliveryRepo.save(finalDelivery)
        return finalDelivery
      } catch (error) {
        const failed = base.markFailed(
          null,
          error instanceof Error ? error.message : 'Unknown webhook error',
          1,
        )
        await this.deps.endpointRepo.save(endpoint.recordFailure(new Date().toISOString()))
        await this.deps.deliveryRepo.save(failed)
        return failed
      }
    }

    const org = await this.deps.orgRepo.findById(event.orgId)
    const orgName = org?.name ?? 'Unknown'
    const html =
      event.tier === 'critical'
        ? criticalAlertTemplate({
            orgName,
            budgetUsd: event.budgetUsd,
            actualCostUsd: event.actualCostUsd,
            percentage: event.percentage,
            month: event.month,
            keyBreakdown: [],
          })
        : warningAlertTemplate({
            orgName,
            budgetUsd: event.budgetUsd,
            actualCostUsd: event.actualCostUsd,
            percentage: event.percentage,
            month: event.month,
            keyBreakdown: [],
          })

    const dispatchedAt = new Date().toISOString()
    const base = AlertDelivery.create({
      alertEventId: event.id,
      channel: 'email',
      target: delivery.target,
      targetUrl: null,
      dispatchedAt,
      orgId: event.orgId,
      month: event.month,
      tier: event.tier,
    })

    try {
      await this.deps.mailer.send({
        to: delivery.target,
        subject: `[Draupnir] ${event.tier === 'critical' ? 'CRITICAL' : 'Warning'}: Budget alert for ${orgName}`,
        html,
      })

      const finalDelivery = base.markSent(null, new Date().toISOString(), 1)
      await this.deps.deliveryRepo.save(finalDelivery)
      return finalDelivery
    } catch (error) {
      const failed = base.markFailed(
        null,
        error instanceof Error ? error.message : 'Unknown email error',
        1,
      )
      await this.deps.deliveryRepo.save(failed)
      return failed
    }
  }
}
