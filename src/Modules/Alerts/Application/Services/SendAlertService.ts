import type { IMailer } from '@/Foundation/Infrastructure/Ports/IMailer'
import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'
import type { IAlertDeliveryRepository } from '../../Domain/Repositories/IAlertDeliveryRepository'
import type { IAlertRecipientResolver } from '../../Domain/Services/IAlertRecipientResolver'
import { AlertEvent } from '../../Domain/Entities/AlertEvent'
import { AlertDelivery } from '../../Domain/Entities/AlertDelivery'
import {
  criticalAlertTemplate,
  warningAlertTemplate,
  type AlertEmailTemplateParams,
  type AlertKeyBreakdownItem,
} from '../../Infrastructure/Services/AlertEmailTemplates'
import { DispatchAlertWebhooksService } from './DispatchAlertWebhooksService'

export interface SendAlertParams extends Omit<AlertEmailTemplateParams, 'orgName'> {
  readonly orgId: string
  readonly tier: 'warning' | 'critical'
}

/**
 * Dispatches alert emails to organization managers and records the alert event.
 *
 * Cross-module org/member/auth resolution is delegated to IAlertRecipientResolver
 * (Alerts-owned Domain port, per D-05). This service no longer imports any
 * Organization, Auth, or OrgMember repositories directly.
 */
export class SendAlertService {
  constructor(
    private readonly deps: {
      readonly recipientResolver: IAlertRecipientResolver
      readonly alertEventRepo: IAlertEventRepository
      readonly deliveryRepo: IAlertDeliveryRepository
      readonly mailer: IMailer
      /** Kept in Plan 2; Plan 3 replaces with notifiers: readonly IAlertNotifier[] */
      readonly dispatchWebhooksService: DispatchAlertWebhooksService
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

    const html =
      params.tier === 'critical'
        ? criticalAlertTemplate({ ...params, orgName })
        : warningAlertTemplate({ ...params, orgName })

    for (const recipient of emails) {
      const skipped = await this.deps.deliveryRepo.existsSent({
        orgId: params.orgId,
        month: params.month,
        tier: params.tier,
        channel: 'email',
        target: recipient,
      })
      if (skipped) {
        continue
      }

      const dispatchedAt = new Date().toISOString()
      const base = AlertDelivery.create({
        alertEventId: alertEvent.id,
        channel: 'email',
        target: recipient,
        targetUrl: null,
        dispatchedAt,
        orgId: alertEvent.orgId,
        month: alertEvent.month,
        tier: alertEvent.tier,
      })

      try {
        await this.deps.mailer.send({
          to: recipient,
          subject: `[Draupnir] ${params.tier === 'critical' ? 'CRITICAL' : 'Warning'}: Budget alert for ${orgName}`,
          html,
        })

        await this.deps.deliveryRepo.save(base.markSent(null, new Date().toISOString(), 1))
      } catch (error) {
        await this.deps.deliveryRepo.save(
          base.markFailed(
            null,
            error instanceof Error ? error.message : 'Unknown email error',
            1,
          ),
        )
      }
    }

    queueMicrotask(() => {
      void Promise.resolve(this.deps.dispatchWebhooksService.dispatchAll(alertEvent, orgName)).catch((error) =>
        console.error('[SendAlertService] webhook dispatch unexpectedly threw', error),
      )
    })
  }
}

export type { AlertKeyBreakdownItem }
