import type { IMailer } from '@/Foundation/Infrastructure/Ports/IMailer'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'
import type { IAlertDeliveryRepository } from '../../Domain/Repositories/IAlertDeliveryRepository'
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
 */
export class SendAlertService {
  constructor(
    private readonly mailer: IMailer,
    private readonly orgMemberRepo: IOrganizationMemberRepository,
    private readonly orgRepo: IOrganizationRepository,
    private readonly authRepo: IAuthRepository,
    private readonly alertEventRepo: IAlertEventRepository,
    private readonly deliveryRepo: IAlertDeliveryRepository,
    private readonly webhookDispatch: DispatchAlertWebhooksService,
  ) {}

  async send(params: SendAlertParams): Promise<void> {
    const org = await this.orgRepo.findById(params.orgId)
    const orgName = org?.name ?? 'Unknown'
    const members = await this.orgMemberRepo.findByOrgId(params.orgId)
    const managers = members.filter((member) => member.isManager())

    const emailSet = new Set<string>()
    for (const manager of managers) {
      const user = await this.authRepo.findById(manager.userId)
      const email = user?.emailValue?.trim()
      if (email) {
        emailSet.add(email)
      }
    }

    const recipients = [...emailSet]

    const alertEvent = AlertEvent.create({
      orgId: params.orgId,
      tier: params.tier,
      budgetUsd: params.budgetUsd,
      actualCostUsd: params.actualCostUsd,
      percentage: params.percentage,
      month: params.month,
      recipients: [],
    })

    await this.alertEventRepo.save(alertEvent)

    const html =
      params.tier === 'critical'
        ? criticalAlertTemplate({ ...params, orgName })
        : warningAlertTemplate({ ...params, orgName })

    for (const recipient of recipients) {
      const skipped = await this.deliveryRepo.existsSent({
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
        await this.mailer.send({
          to: recipient,
          subject: `[Draupnir] ${params.tier === 'critical' ? 'CRITICAL' : 'Warning'}: Budget alert for ${orgName}`,
          html,
        })

        await this.deliveryRepo.save(base.markSent(null, new Date().toISOString(), 1))
      } catch (error) {
        await this.deliveryRepo.save(
          base.markFailed(
            null,
            error instanceof Error ? error.message : 'Unknown email error',
            1,
          ),
        )
      }
    }

    queueMicrotask(() => {
      void Promise.resolve(this.webhookDispatch.dispatchAll(alertEvent, orgName)).catch((error) =>
        console.error('[SendAlertService] webhook dispatch unexpectedly threw', error),
      )
    })
  }
}

export type { AlertKeyBreakdownItem }
