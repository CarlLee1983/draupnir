import type { AlertDelivery } from '../../Domain/Entities/AlertDelivery'
import type { IAlertDeliveryRepository } from '../../Domain/Repositories/IAlertDeliveryRepository'
import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'
import type { AlertPayload, IAlertNotifier } from '../../Domain/Services/IAlertNotifier'
import type { IAlertRecipientResolver } from '../../Domain/Services/IAlertRecipientResolver'
import type { DeliveryChannel } from '../../Domain/ValueObjects/DeliveryStatus'

export class ResendDeliveryService {
  constructor(
    private readonly deps: {
      readonly deliveryRepo: IAlertDeliveryRepository
      readonly eventRepo: IAlertEventRepository
      readonly recipientResolver: IAlertRecipientResolver
      readonly notifierRegistry: Record<DeliveryChannel, IAlertNotifier>
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

    const context = await this.deps.recipientResolver.resolveByOrg(event.orgId)

    const payload: AlertPayload = {
      orgId: event.orgId,
      orgName: context.orgName,
      alertEventId: event.id,
      tier: event.tier,
      budgetUsd: event.budgetUsd,
      actualCostUsd: event.actualCostUsd,
      percentage: event.percentage,
      month: event.month,
      keyBreakdown: [],
      emails: delivery.channel === 'email' ? [delivery.target] : context.emails,
      resendWebhookEndpointId: delivery.channel === 'webhook' ? delivery.target : undefined,
      forResend: true,
    }

    const notifier = this.deps.notifierRegistry[delivery.channel]
    const result = await notifier.notify(payload)
    if (!result.primaryDelivery) {
      throw new Error('Resend did not produce a delivery record')
    }
    return result.primaryDelivery
  }
}
