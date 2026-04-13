import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'
import type { IAlertRecipientResolver } from '../../Domain/Services/IAlertRecipientResolver'
import type { AlertPayload, IAlertNotifier } from '../../Domain/Services/IAlertNotifier'
import { AlertEvent } from '../../Domain/Entities/AlertEvent'
import type { AlertEmailTemplateParams } from '../../Infrastructure/Services/AlertEmailTemplates'

export interface SendAlertParams extends Omit<AlertEmailTemplateParams, 'orgName'> {
  readonly orgId: string
  readonly tier: 'warning' | 'critical'
}

/**
 * Dispatches alert emails and webhooks and records the alert event.
 *
 * Cross-module recipient resolution uses {@link IAlertRecipientResolver}.
 * Channel delivery is delegated to {@link IAlertNotifier} strategies.
 */
export class SendAlertService {
  constructor(
    private readonly deps: {
      readonly recipientResolver: IAlertRecipientResolver
      readonly alertEventRepo: IAlertEventRepository
      readonly notifiers: readonly IAlertNotifier[]
    },
  ) {}

  async send(params: SendAlertParams): Promise<void> {
    const context = await this.deps.recipientResolver.resolveByOrg(params.orgId)
    const { orgName, emails } = context

    const alertEvent = AlertEvent.create({
      orgId: params.orgId,
      tier: params.tier,
      budgetUsd: params.budgetUsd,
      actualCostUsd: params.actualCostUsd,
      percentage: params.percentage,
      month: params.month,
      recipients: [],
    })

    await this.deps.alertEventRepo.save(alertEvent)

    const payload: AlertPayload = {
      orgId: params.orgId,
      orgName,
      alertEventId: alertEvent.id,
      tier: params.tier,
      budgetUsd: params.budgetUsd,
      actualCostUsd: params.actualCostUsd,
      percentage: params.percentage,
      month: params.month,
      keyBreakdown: params.keyBreakdown,
      emails: [...emails],
    }

    const emailNotifiers = this.deps.notifiers.filter((n) => n.channel === 'email')
    await Promise.allSettled(emailNotifiers.map((n) => n.notify(payload)))

    const webhookNotifiers = this.deps.notifiers.filter((n) => n.channel === 'webhook')
    queueMicrotask(() => {
      for (const n of webhookNotifiers) {
        void n.notify(payload).catch((error) =>
          console.error('[SendAlertService] webhook notifier unexpectedly threw', error),
        )
      }
    })
  }
}

export type { AlertKeyBreakdownItem } from '../../Infrastructure/Services/AlertEmailTemplates'
