import type { IWebhookDispatcher } from '@/Foundation/Infrastructure/Ports/IWebhookDispatcher'
import { WebhookSecret } from '@/Foundation/Infrastructure/Services/Webhook/WebhookSecret'
import { WebhookEndpointGoneError } from '../../Application/Errors/WebhookEndpointGoneError'
import type { WebhookEndpoint } from '../../Domain/Aggregates/WebhookEndpoint'
import { AlertDelivery } from '../../Domain/Entities/AlertDelivery'
import type { IAlertDeliveryRepository } from '../../Domain/Repositories/IAlertDeliveryRepository'
import type { IWebhookEndpointRepository } from '../../Domain/Repositories/IWebhookEndpointRepository'
import type {
  AlertPayload,
  DeliveryResult,
  IAlertNotifier,
} from '../../Domain/Services/IAlertNotifier'

function buildWebhookPayload(payload: AlertPayload): Record<string, unknown> {
  return {
    orgId: payload.orgId,
    orgName: payload.orgName,
    tier: payload.tier,
    budgetUsd: payload.budgetUsd,
    actualCostUsd: payload.actualCostUsd,
    percentage: payload.percentage,
    month: payload.month,
    alertEventId: payload.alertEventId,
  }
}

export class WebhookAlertNotifier implements IAlertNotifier {
  readonly channel = 'webhook' as const

  constructor(
    private readonly deps: {
      readonly endpointRepo: IWebhookEndpointRepository
      readonly deliveryRepo: IAlertDeliveryRepository
      readonly dispatcher: IWebhookDispatcher
      readonly logger?: { error: (...args: unknown[]) => void }
    },
  ) {}

  async notify(payload: AlertPayload): Promise<DeliveryResult> {
    if (payload.resendWebhookEndpointId) {
      return this.dispatchResend(payload)
    }

    try {
      const endpoints = await this.deps.endpointRepo.findActiveByOrg(payload.orgId)
      const results = await Promise.allSettled(
        endpoints.map((endpoint) => this.dispatchOne(payload, endpoint)),
      )
      let successes = 0
      let failures = 0
      for (const r of results) {
        if (r.status === 'fulfilled') {
          if (r.value === 'sent') {
            successes++
          } else if (r.value === 'failed') {
            failures++
          }
        } else {
          failures++
        }
      }
      return { channel: 'webhook', successes, failures }
    } catch (err) {
      this.deps.logger?.error('[WebhookAlertNotifier] unexpected error in notify', err)
      return { channel: 'webhook', successes: 0, failures: 0 }
    }
  }

  private async dispatchResend(payload: AlertPayload): Promise<DeliveryResult> {
    const id = payload.resendWebhookEndpointId!
    const endpoint = await this.deps.endpointRepo.findById(id)
    if (!endpoint) {
      throw new WebhookEndpointGoneError('Webhook endpoint no longer exists')
    }
    if (endpoint.orgId !== payload.orgId) {
      throw new WebhookEndpointGoneError('Webhook endpoint no longer exists')
    }

    const finalDelivery = await this.runDispatch(payload, endpoint)
    return {
      channel: 'webhook',
      successes: finalDelivery.status === 'sent' ? 1 : 0,
      failures: finalDelivery.status === 'failed' ? 1 : 0,
      primaryDelivery: payload.forResend ? finalDelivery : undefined,
    }
  }

  private async dispatchOne(
    payload: AlertPayload,
    endpoint: WebhookEndpoint,
  ): Promise<'skipped' | 'sent' | 'failed'> {
    const deduped = await this.deps.deliveryRepo.existsSent({
      orgId: payload.orgId,
      month: payload.month,
      tier: payload.tier,
      channel: 'webhook',
      target: endpoint.id,
    })
    if (deduped) {
      return 'skipped'
    }

    const final = await this.runDispatch(payload, endpoint)
    return final.status === 'sent' ? 'sent' : 'failed'
  }

  private async runDispatch(
    payload: AlertPayload,
    endpoint: WebhookEndpoint,
  ): Promise<AlertDelivery> {
    const dispatchedAt = new Date().toISOString()
    const base = AlertDelivery.create({
      alertEventId: payload.alertEventId,
      channel: 'webhook',
      target: endpoint.id,
      targetUrl: endpoint.url,
      dispatchedAt,
      orgId: payload.orgId,
      month: payload.month,
      tier: payload.tier,
    })

    try {
      const result = await this.deps.dispatcher.dispatch({
        url: endpoint.url,
        secret: WebhookSecret.fromExisting(endpoint.secret),
        eventType: 'alert.threshold.breached',
        payload: buildWebhookPayload(payload),
      })

      const deliveredAt = new Date().toISOString()
      const nextEndpoint = result.success
        ? endpoint.recordSuccess(deliveredAt)
        : endpoint.recordFailure(deliveredAt)
      await this.deps.endpointRepo.save(nextEndpoint)

      const finalDelivery = result.success
        ? base.markSent(result.statusCode ?? null, deliveredAt, result.attempts)
        : base.markFailed(
            result.statusCode ?? null,
            result.error ?? 'Unknown webhook error',
            result.attempts,
          )
      await this.deps.deliveryRepo.save(finalDelivery)
      return finalDelivery
    } catch (error) {
      const deliveredAt = new Date().toISOString()
      await this.deps.endpointRepo.save(endpoint.recordFailure(deliveredAt))
      const failed = base.markFailed(
        null,
        error instanceof Error ? error.message : 'Unknown webhook error',
        1,
      )
      await this.deps.deliveryRepo.save(failed)
      return failed
    }
  }
}
