import type { IMailer } from '@/Foundation/Infrastructure/Ports/IMailer'
import { AlertDelivery } from '../../Domain/Entities/AlertDelivery'
import type { IAlertDeliveryRepository } from '../../Domain/Repositories/IAlertDeliveryRepository'
import type {
  AlertPayload,
  DeliveryResult,
  IAlertNotifier,
} from '../../Domain/Services/IAlertNotifier'
import { criticalAlertTemplate, warningAlertTemplate } from './AlertEmailTemplates'

export class EmailAlertNotifier implements IAlertNotifier {
  readonly channel = 'email' as const

  constructor(
    private readonly deps: {
      readonly mailer: IMailer
      readonly deliveryRepo: IAlertDeliveryRepository
    },
  ) {}

  async notify(payload: AlertPayload): Promise<DeliveryResult> {
    let successes = 0
    let failures = 0
    let primary: AlertDelivery | undefined

    const html =
      payload.tier === 'critical'
        ? criticalAlertTemplate({
            orgName: payload.orgName,
            budgetUsd: payload.budgetUsd,
            actualCostUsd: payload.actualCostUsd,
            percentage: payload.percentage,
            month: payload.month,
            keyBreakdown: payload.keyBreakdown,
          })
        : warningAlertTemplate({
            orgName: payload.orgName,
            budgetUsd: payload.budgetUsd,
            actualCostUsd: payload.actualCostUsd,
            percentage: payload.percentage,
            month: payload.month,
            keyBreakdown: payload.keyBreakdown,
          })

    for (const recipient of payload.emails) {
      const skipped = await this.deps.deliveryRepo.existsSent({
        orgId: payload.orgId,
        month: payload.month,
        tier: payload.tier,
        channel: 'email',
        target: recipient,
      })
      if (skipped) {
        continue
      }

      const dispatchedAt = new Date().toISOString()
      const base = AlertDelivery.create({
        alertEventId: payload.alertEventId,
        channel: 'email',
        target: recipient,
        targetUrl: null,
        dispatchedAt,
        orgId: payload.orgId,
        month: payload.month,
        tier: payload.tier,
      })

      try {
        await this.deps.mailer.send({
          to: recipient,
          subject: `[Draupnir] ${payload.tier === 'critical' ? 'CRITICAL' : 'Warning'}: Budget alert for ${payload.orgName}`,
          html,
        })

        const sent = base.markSent(null, new Date().toISOString(), 1)
        await this.deps.deliveryRepo.save(sent)
        successes++
        if (payload.forResend) {
          primary = sent
        }
      } catch (error) {
        const failed = base.markFailed(
          null,
          error instanceof Error ? error.message : 'Unknown email error',
          1,
        )
        await this.deps.deliveryRepo.save(failed)
        failures++
        if (payload.forResend) {
          primary = failed
        }
      }
    }

    return {
      channel: 'email',
      successes,
      failures,
      primaryDelivery: payload.forResend ? primary : undefined,
    }
  }
}
