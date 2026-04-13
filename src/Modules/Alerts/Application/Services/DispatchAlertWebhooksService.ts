import type { IWebhookDispatcher } from '@/Foundation/Infrastructure/Ports/IWebhookDispatcher'
import { WebhookSecret } from '@/Foundation/Infrastructure/Services/Webhook/WebhookSecret'
import type { AlertEvent } from '../../Domain/Entities/AlertEvent'
import { AlertDelivery } from '../../Domain/Entities/AlertDelivery'
import type { IAlertDeliveryRepository } from '../../Domain/Repositories/IAlertDeliveryRepository'
import type { IWebhookEndpointRepository } from '../../Domain/Repositories/IWebhookEndpointRepository'
import { WebhookEndpoint } from '../../Domain/Aggregates/WebhookEndpoint'

function buildWebhookPayload(event: AlertEvent, orgName: string): Record<string, unknown> {
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

export class DispatchAlertWebhooksService {
  constructor(
    private readonly deps: {
      endpointRepo: IWebhookEndpointRepository
      deliveryRepo: IAlertDeliveryRepository
      dispatcher: IWebhookDispatcher
      logger?: { error: (...args: any[]) => void }
    },
  ) {}

  async dispatchAll(event: AlertEvent, orgName: string): Promise<void> {
    try {
      const endpoints = await this.deps.endpointRepo.findActiveByOrg(event.orgId)
      await Promise.allSettled(endpoints.map((endpoint) => this.dispatchOne(event, orgName, endpoint)))
    } catch (err) {
      this.deps.logger?.error('[DispatchAlertWebhooksService] unexpected error in dispatchAll', err)
    }
  }

  private async dispatchOne(event: AlertEvent, orgName: string, endpoint: WebhookEndpoint): Promise<void> {
    const deduped = await this.deps.deliveryRepo.existsSent({
      orgId: event.orgId,
      month: event.month,
      tier: event.tier,
      channel: 'webhook',
      target: endpoint.id,
    })
    if (deduped) {
      return
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
    } catch (error) {
      const deliveredAt = new Date().toISOString()
      await this.deps.endpointRepo.save(endpoint.recordFailure(deliveredAt))
      await this.deps.deliveryRepo.save(
        base.markFailed(
          null,
          error instanceof Error ? error.message : 'Unknown webhook error',
          1,
        ),
      )
    }
  }
}
